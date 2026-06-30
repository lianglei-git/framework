// SSO protocol types
import type { StorageType } from './forms'

// SSO 类型定义
export interface SSOConfig {
    ssoServerUrl: string
    clientId: string
    clientSecret: string
    redirectUri: string
    scope?: string[]
    responseType?: 'code' | 'token' | 'id_token'
    grantType?: 'authorization_code' | 'implicit' | 'client_credentials'
    tokenEndpoint?: string
    userInfoEndpoint?: string
    logoutEndpoint?: string
    checkSessionEndpoint?: string
    sessionTimeout?: number
    autoRefresh?: boolean
    storageType?: StorageType
    cookieDomain?: string
    cookiePath?: string
    cookieSecure?: boolean
    cookieSameSite?: 'strict' | 'lax' | 'none'
}

export interface SSOToken {
    access_token: string
    refresh_token?: string
    id_token?: string
    token_type: string
    expires_in: number
    scope?: string[]
    state?: string
    session_info: SSOSession
}

export interface SSOProviderBasic {
    id: string
    name: string
    enabled: boolean
}

export interface SSOProvider {
    id: string
    name: string
    displayName: string
    icon?: string
    authorizationUrl: string
    enabled: boolean
    config?: Record<string, any>
}

export interface SSOOAuthUrlParams {
    authorizationUrl: string
    clientId: string
    redirectUri: string
    scope: string[]
    responseType: string
    state: SSOState
    additionalParams?: Record<string, any>
}

export interface SSOState {
    [key: string]: any
}

export interface SSOAuthRequest {
    provider: string
    redirect_uri?: string
    state?: string
    scope?: string[]
    response_type?: string
    prompt?: 'none' | 'login' | 'consent' | 'select_account'
    max_age?: number
    ui_locales?: string[]
    claims_locales?: string[]
    id_token_hint?: string
    login_hint?: string
    client_id?: string
    app_id?: string
    grant_type?: string
    acr_values?: string[]
    additional_params?: Record<string, any>
}

export interface SSOAuthResponse {
    code?: string
    state?: string
    error?: string
    error_description?: string
    access_token?: string
    token_type?: string
    expires_in?: number
    scope?: string
    id_token?: string
}

export interface SSOLoginRequest {
    username?: string
    password?: string
    provider?: string
    code?: string
    state?: string
    redirect_uri?: string
    remember_me?: boolean
    login_type?: 'sso' | 'local'
}

export interface SSOLoginResponse {
    user: SSOUser
    token: SSOToken
    session: SSOSession
    redirect_url?: string
}

export interface SSOLogoutRequest {
    id_token_hint?: string
    post_logout_redirect_uri?: string
    state?: string
    logout_hint?: string
    additional_params?: Record<string, any>
}

export interface SSOLogoutResponse {
    logout_url?: string
    state?: string
    error?: string
    error_description?: string
}

export interface SSOUser {
    sub: string
    name?: string
    given_name?: string
    family_name?: string
    middle_name?: string
    nickname?: string
    preferred_username?: string
    profile?: string
    picture?: string
    website?: string
    email?: string
    email_verified?: boolean
    gender?: string
    birthdate?: string
    zoneinfo?: string
    locale?: string
    phone_number?: string
    phone_number_verified?: boolean
    address?: Record<string, any>
    updated_at?: number
    custom_claims?: Record<string, any>
}

export interface SSOSession {
    session_id: string
    user_id: string
    client_id: string
    authenticated_at: number
    expires_at: number
    last_activity: number
    ip_address?: string
    user_agent?: string
    location?: string
    device_fingerprint?: string
    is_active: boolean
    remember_me: boolean
}

export interface SSOSessionCheckResponse {
    is_authenticated: boolean
    session?: SSOSession
    user?: SSOUser
    error?: string
}

export interface SSOError {
    error: string
    error_description?: string
    error_uri?: string
    state?: string
}

export interface SSOProviderConfig {
    provider: string
    client_id: string
    client_secret?: string
    authorization_url: string
    token_url?: string
    user_info_url?: string
    logout_url?: string
    scope?: string[]
    response_type?: string
    grant_type?: string
    redirect_uri?: string
    enabled: boolean
    auto_discovery?: boolean
    issuer_url?: string
    jwks_url?: string
}

export interface SSOKeyPair {
    public_key: string
    private_key: string
    key_id: string
    algorithm: string
    expires_at?: number
}

export interface SSOCallbackContext {
    code?: string
    state?: string
    error?: string
    error_description?: string
    session_state?: string
    iss?: string
    client_id?: string
    redirect_uri?: string
}

export interface SSOTokenValidationResult {
    is_valid: boolean
    token?: SSOToken
    user?: SSOUser
    error?: string
    error_description?: string
}

export interface SSOIntrospectionRequest {
    token: string
    token_type_hint?: 'access_token' | 'refresh_token'
    client_id?: string
    client_secret?: string
}

export interface SSOIntrospectionResponse {
    active: boolean
    client_id?: string
    sub?: string
    aud?: string | string[]
    iss?: string
    exp?: number
    iat?: number
    auth_time?: number
    nonce?: string
    acr?: string
    amr?: string[]
    azp?: string
    scope?: string
    drn?: string
    policies?: Record<string, any>
    groups?: string[]
    roles?: string[]
    custom_claims?: Record<string, any>
}

export interface SSORefreshTokenRequest {
    refresh_token: string
    grant_type?: 'refresh_token'
    scope?: string[]
    client_id?: string
    client_secret?: string
}

export interface SSORefreshTokenResponse {
    access_token: string
    token_type: string
    expires_in: number
    refresh_token?: string
    scope?: string[]
}

export interface SSOUserInfoResponse {
    sub: string
    name?: string
    given_name?: string
    family_name?: string
    middle_name?: string
    nickname?: string
    preferred_username?: string
    profile?: string
    picture?: string
    website?: string
    email?: string
    email_verified?: boolean
    gender?: string
    birthdate?: string
    zoneinfo?: string
    locale?: string
    phone_number?: string
    phone_number_verified?: boolean
    address?: Record<string, any>
    updated_at?: number
    custom_claims?: Record<string, any>
}

export interface SSODiscoveryDocument {
    issuer: string
    authorization_endpoint: string
    token_endpoint: string
    userinfo_endpoint: string
    end_session_endpoint?: string
    check_session_iframe?: string
    revocation_endpoint?: string
    introspection_endpoint?: string
    device_authorization_endpoint?: string
    registration_endpoint?: string
    jwks_uri: string
    scopes_supported?: string[]
    response_types_supported: string[]
    response_modes_supported?: string[]
    grant_types_supported?: string[]
    acr_values_supported?: string[]
    subject_types_supported: string[]
    id_token_signing_alg_values_supported: string[]
    id_token_encryption_alg_values_supported?: string[]
    id_token_encryption_enc_values_supported?: string[]
    userinfo_signing_alg_values_supported?: string[]
    userinfo_encryption_alg_values_supported?: string[]
    userinfo_encryption_enc_values_supported?: string[]
    request_object_signing_alg_values_supported?: string[]
    request_object_encryption_alg_values_supported?: string[]
    request_object_encryption_enc_values_supported?: string[]
    token_endpoint_auth_methods_supported?: string[]
    token_endpoint_auth_signing_alg_values_supported?: string[]
    display_values_supported?: string[]
    claim_types_supported?: string[]
    claims_supported?: string[]
    service_documentation?: string
    claims_locales_supported?: string[]
    ui_locales_supported?: string[]
    claims_parameter_supported?: boolean
    request_parameter_supported?: boolean
    request_uri_parameter_supported?: boolean
    require_request_uri_registration?: boolean
    op_policy_uri?: string
    op_tos_uri?: string
}

export interface SSOClientRegistration {
    client_id: string
    client_secret?: string
    client_name: string
    client_uri?: string
    logo_uri?: string
    scope?: string[]
    grant_types?: string[]
    response_types?: string[]
    redirect_uris?: string[]
    post_logout_redirect_uris?: string[]
    token_endpoint_auth_method?: string
    token_endpoint_auth_signing_alg?: string
    userinfo_signed_response_alg?: string
    userinfo_encrypted_response_alg?: string
    userinfo_encrypted_response_enc?: string
    contacts?: string[]
    tos_uri?: string
    policy_uri?: string
    jwks_uri?: string
    jwks?: SSOKeyPair
    software_id?: string
    software_version?: string
    client_id_issued_at?: number
    client_secret_expires_at?: number
    registration_access_token?: string
    registration_client_uri?: string
    client_id_alias?: string
    sector_identifier_uri?: string
    subject_type?: string
    id_token_signed_response_alg?: string
    id_token_encrypted_response_alg?: string
    id_token_encrypted_response_enc?: string
    default_max_age?: number
    require_auth_time?: boolean
    default_acr_values?: string[]
    initiate_login_uri?: string
    request_uris?: string[]
    request_object_signing_alg?: string
    request_object_encryption_alg?: string
    request_object_encryption_enc?: string
    backchannel_logout_uri?: string
    backchannel_logout_session_required?: boolean
    frontchannel_logout_uri?: boolean
    frontchannel_logout_session_required?: boolean
    post_logout_redirect_uris?: string[]
    custom_metadata?: Record<string, any>
}

