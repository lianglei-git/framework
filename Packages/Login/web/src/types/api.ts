// API types
// API 类型
export interface UserListParams {
    page?: number
    limit?: number
    search?: string
    role?: UserRole
    status?: UserStatus
    sort_by?: string
    sort_order?: 'asc' | 'desc'
}

export interface UserListResponse {
    users: User[]
    total: number
    page: number
    limit: number
    total_pages: number
}

export interface UserStats {
    total_users: number
    active_users: number
    new_users_today: number
    new_users_this_week: number
    new_users_this_month: number
}

export interface LogListParams {
    page?: number
    limit?: number
    user_id?: string
    action?: string
    start_date?: string
    end_date?: string
}

export interface LogListResponse {
    logs: any[]
    total: number
    page: number
    limit: number
    total_pages: number
}

export enum BulkAction {
    ACTIVATE = 'activate',
    DEACTIVATE = 'deactivate',
    DELETE = 'delete',
    CHANGE_ROLE = 'change_role'
}

// 事件类型
export type AuthEventListener = (data: any) => void
