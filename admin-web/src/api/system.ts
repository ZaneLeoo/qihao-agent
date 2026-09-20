import { http } from './http'

/** 后端 `GET /api/v1/system/status` 的响应。M2 起改为由 OpenAPI 生成。 */
export interface SystemStatus {
  name: string
  version: string
  /** ISO 8601 带时区偏移，例如 2026-03-01T10:00:00+08:00 */
  time: string
}

export const systemApi = {
  status: () => http.get<SystemStatus>('/v1/system/status').then((response) => response.data),
}
