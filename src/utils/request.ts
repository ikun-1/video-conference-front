import axios, { type AxiosInstance, type AxiosRequestConfig } from 'axios'
import { ElMessage } from 'element-plus'
import { useAuthStore } from '@/stores/auth'
import router from '@/router'

export interface ApiResponse<T = unknown> {
  code: number
  msg: string
  data: T
}

const instance = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL ?? '/api',
  timeout: 10000,
})

instance.interceptors.request.use(config => {
  const authStore = useAuthStore()

  if (authStore.token) {
    config.headers = config.headers ?? {}
    config.headers.Authorization = `Bearer ${authStore.token}`
  }

  return config
})

instance.interceptors.response.use(
  (response) => {
    const { code, msg, data } = response.data

    if (code !== 0) {
      ElMessage({ message: msg || '请求失败', type: 'error' })
      if (code === 401 || code === 1002) {
        useAuthStore().clearAuth()
        router.push('/login')
      }
      return Promise.reject(new Error(msg))
    }

    return data
  },
  error => {
    if (error.response) {
      const { status } = error.response
      const data = error.response.data
      switch (status) {
        case 401:
          ElMessage({ message: data?.msg || '登录已过期，请重新登录', type: 'error' })
          useAuthStore().clearAuth()
          router.push('/login')
          break
        case 403:
          ElMessage({ message: data?.msg || '没有权限访问', type: 'error' })
          break
        case 404:
          ElMessage({ message: data?.msg || '请求的资源不存在', type: 'error' })
          break
        case 500:
          ElMessage({ message: data?.msg || '服务器错误，请稍后重试', type: 'error' })
          break
        default:
          ElMessage({ message: data?.msg || `请求失败(${status})`, type: 'error' })
      }
    } else if (error.code === 'ECONNABORTED') {
      ElMessage({ message: '请求超时，请检查网络', type: 'error' })
    } else {
      ElMessage({ message: '网络异常，请检查连接', type: 'error' })
    }
    return Promise.reject(error)
  }
)

interface CustomInstance extends AxiosInstance {
  get<T = unknown, D = unknown>(url: string, config?: AxiosRequestConfig<D>): Promise<T>
  post<T = unknown, D = unknown>(url: string, data?: D, config?: AxiosRequestConfig<D>): Promise<T>
  put<T = unknown, D = unknown>(url: string, data?: D, config?: AxiosRequestConfig<D>): Promise<T>
  delete<T = unknown, D = unknown>(url: string, config?: AxiosRequestConfig<D>): Promise<T>
}

const request = instance as CustomInstance

export default request
