import request from '@/utils/request'

export interface IceServer {
  urls: string[]
  username?: string
  credential?: string
}

export interface IceServersResponse {
  iceServers: IceServer[]
}

/** 从后端动态获取 ICE 服务器配置（包含 STUN + TURN） */
export async function getIceServersApi(): Promise<IceServersResponse> {
  return request.get<IceServersResponse>('/ice-servers')
}
