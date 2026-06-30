// ==================== 通用 ====================

export interface ApiResponse<T = unknown> {
  code: number
  message: string
  data?: T
}

export interface Pagination {
  page: number
  page_size: number
  total: number
  total_pages: number
}

// ==================== 认证 ====================

export interface LoginRequest {
  provider: 'local'
  username: string
  password: string
}

export interface UserInfo {
  id: string
  email: string
  phone: string
  username: string
  nickname: string
  role: 'admin' | 'moderator' | 'user'
  status: 'active' | 'inactive' | 'suspended' | 'pending'
  email_verified: boolean
  phone_verified: boolean
  login_count?: number
  last_login_at?: string | null
  created_at?: string
  updated_at?: string
  meta?: Record<string, unknown>
}

export interface LoginResponse {
  access_token: string
  refresh_token: string
  id_token: string
  token_type: string
  expires_in: number
  scope: string
  user: UserInfo
  provider: string
  session_id?: string
}

// ==================== 用户管理 ====================

export interface AdminUser {
  id: string
  email: string
  phone: string
  username: string
  nickname: string
  role: string
  status: string
  email_verified: boolean
  phone_verified: boolean
  login_count: number
  last_login_at: string | null
  created_at: string
  updated_at: string
  meta?: Record<string, unknown>
}

export interface UserListParams {
  page?: number
  page_size?: number
  search?: string
  status?: string
  role?: string
  sort_by?: string
  sort_order?: string
}

export interface UserListResponse {
  users: AdminUser[]
  pagination: Pagination
}

export interface UpdateUserRequest {
  username?: string
  nickname?: string
  email?: string
  phone?: string
  role?: string
  status?: string
  email_verified?: boolean
  phone_verified?: boolean
  meta?: Record<string, unknown>
}

export interface BulkUpdateRequest {
  user_ids: string[]
  action: 'activate' | 'deactivate' | 'delete'
}

export interface BulkUpdateResponse {
  updated_count: number
  deleted_count: number
}

// ==================== 统计 ====================

export interface UserStats {
  total_users: number
  active_users: number
  inactive_users: number
  email_verified: number
  phone_verified: number
  admin_users: number
  new_users_today: number
  new_users_week: number
  new_users_month: number
  login_count_today: number
}

// ==================== 登录日志 ====================

export interface LoginLog {
  id: number
  user_id: string
  provider: string
  ip: string
  user_agent: string
  location: string
  success: boolean
  error_msg: string
  created_at: string
}

export interface LoginLogsParams {
  page?: number
  page_size?: number
  user_id?: string
  provider?: string
  success?: string
  start_date?: string
  end_date?: string
}

export interface LoginLogsResponse {
  logs: LoginLog[]
  pagination: Pagination
}

// ==================== SSO 客户端 ====================

export interface SSOClient {
  id: string
  name: string
  app_id: string
  description: string
  redirect_uris: string
  grant_types: string
  response_types: string
  scope: string
  frontend_port: number
  bff_port: number
  auto_approve: boolean
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface SSOClientCreateRequest {
  name: string
  app_id?: string
  description?: string
  redirect_uris: string[]
  grant_types?: string[]
  response_types?: string[]
  scope?: string[]
  frontend_port?: number
  bff_port?: number
  auto_approve?: boolean
}

export interface SSOClientUpdateRequest {
  name?: string
  app_id?: string
  description?: string
  redirect_uris?: string[]
  grant_types?: string[]
  response_types?: string[]
  scope?: string[]
  frontend_port?: number
  bff_port?: number
  auto_approve?: boolean
  is_active?: boolean
}

export interface SSOClientCreateResponse extends SSOClient {
  secret: string
}

export interface SSOClientStats {
  total_clients: number
  active_clients: number
  inactive_clients: number
}
