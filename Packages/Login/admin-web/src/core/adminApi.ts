import { httpClient } from './httpClient'
import type {
  ApiResponse,
  LoginRequest,
  LoginResponse,
  UserListParams,
  UserListResponse,
  AdminUser,
  UpdateUserRequest,
  BulkUpdateRequest,
  BulkUpdateResponse,
  UserStats,
  LoginLogsParams,
  LoginLogsResponse,
  SSOClient,
  SSOClientCreateRequest,
  SSOClientUpdateRequest,
  SSOClientCreateResponse,
  SSOClientStats,
} from '../types'

// ==================== 认证 ====================

export async function adminLogin(req: LoginRequest): Promise<LoginResponse> {
  return httpClient.post<LoginResponse>('/api/v1/auth/oauth-login', req)
}

// ==================== 用户管理 ====================

export async function listUsers(params?: UserListParams): Promise<UserListResponse> {
  const res = await httpClient.get<ApiResponse<UserListResponse>>(
    '/api/v1/admin/users',
    params as Record<string, unknown>
  )
  if (res.code !== 200) throw new Error(res.message)
  return res.data!
}

export async function getUser(id: string): Promise<AdminUser> {
  const res = await httpClient.get<ApiResponse<AdminUser>>(`/api/v1/admin/users/${id}`)
  if (res.code !== 200) throw new Error(res.message)
  return res.data!
}

export async function updateUser(id: string, body: UpdateUserRequest): Promise<AdminUser> {
  const res = await httpClient.put<ApiResponse<AdminUser>>(`/api/v1/admin/users/${id}`, body)
  if (res.code !== 200) throw new Error(res.message)
  return res.data!
}

export async function deleteUser(id: string): Promise<void> {
  const res = await httpClient.delete<ApiResponse>(`/api/v1/admin/users/${id}`)
  if (res.code !== 200) throw new Error(res.message)
}

export async function bulkUpdateUsers(
  action: BulkUpdateRequest['action'],
  userIds: string[]
): Promise<BulkUpdateResponse> {
  const res = await httpClient.post<ApiResponse<BulkUpdateResponse>>(
    '/api/v1/admin/users/bulk-update',
    { user_ids: userIds, action }
  )
  if (res.code !== 200) throw new Error(res.message)
  return res.data!
}

// ==================== 统计 ====================

export async function getUserStats(): Promise<UserStats> {
  const res = await httpClient.get<ApiResponse<UserStats>>('/api/v1/admin/stats/users')
  if (res.code !== 200) throw new Error(res.message)
  return res.data!
}

export async function getLoginLogs(params?: LoginLogsParams): Promise<LoginLogsResponse> {
  const res = await httpClient.get<ApiResponse<LoginLogsResponse>>(
    '/api/v1/admin/stats/login-logs',
    params as Record<string, unknown>
  )
  if (res.code !== 200) throw new Error(res.message)
  return res.data!
}

// ==================== SSO 客户端 ====================

export async function listSSOClients(): Promise<SSOClient[]> {
  const res = await httpClient.get<ApiResponse<SSOClient[]>>('/api/v1/admin/sso-clients')
  if (res.code !== 200) throw new Error(res.message)
  return res.data ?? []
}

export async function getSSOClient(id: string): Promise<SSOClient> {
  const res = await httpClient.get<ApiResponse<SSOClient>>(`/api/v1/admin/sso-clients/${id}`)
  if (res.code !== 200) throw new Error(res.message)
  return res.data!
}

export async function createSSOClient(body: SSOClientCreateRequest): Promise<SSOClientCreateResponse> {
  const res = await httpClient.post<ApiResponse<SSOClientCreateResponse>>(
    '/api/v1/admin/sso-clients',
    body
  )
  // Create returns 201 from backend
  if (res.code !== 200 && res.code !== 201) throw new Error(res.message)
  return res.data!
}

export async function updateSSOClient(id: string, body: SSOClientUpdateRequest): Promise<SSOClient> {
  const res = await httpClient.put<ApiResponse<SSOClient>>(
    `/api/v1/admin/sso-clients/${id}`,
    body
  )
  if (res.code !== 200) throw new Error(res.message)
  return res.data!
}

export async function deleteSSOClient(id: string): Promise<void> {
  const res = await httpClient.delete<ApiResponse>(`/api/v1/admin/sso-clients/${id}`)
  if (res.code !== 200) throw new Error(res.message)
}

export async function regenerateSSOClientSecret(id: string): Promise<SSOClientCreateResponse> {
  const res = await httpClient.post<ApiResponse<SSOClientCreateResponse>>(
    `/api/v1/admin/sso-clients/${id}/regenerate-secret`
  )
  if (res.code !== 200) throw new Error(res.message)
  return res.data!
}

export async function setSSOClientSecret(
  id: string,
  secret?: string
): Promise<SSOClientCreateResponse> {
  const res = await httpClient.put<ApiResponse<SSOClientCreateResponse>>(
    `/api/v1/admin/sso-clients/${id}/secret`,
    { secret: secret ?? '' }
  )
  if (res.code !== 200) throw new Error(res.message)
  return res.data!
}

export async function getSSOClientStats(): Promise<SSOClientStats> {
  const res = await httpClient.get<ApiResponse<SSOClientStats>>('/api/v1/admin/sso-clients/stats')
  if (res.code !== 200) throw new Error(res.message)
  return res.data!
}
