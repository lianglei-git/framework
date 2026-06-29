package utils

import (
	"net/http"
	"unit-auth/models"

	"github.com/gin-gonic/gin"
)

const ssoSessionCookieMaxAge = 30 * 24 * 60 * 60

// SetSSOSessionCookies 在 IdP 域写入 session cookie，供 /oauth/authorize 免登识别
func SetSSOSessionCookies(c *gin.Context, sessionID, appID string) {
	if sessionID == "" {
		return
	}
	c.SetSameSite(http.SameSiteLaxMode)
	c.SetCookie("sso_session_id", sessionID, ssoSessionCookieMaxAge, "/", "", false, false)
	if appID != "" {
		c.SetCookie("sso_app_id", appID, ssoSessionCookieMaxAge, "/", "", false, false)
	}
}

// ReturnTokenSuccess 返回标准的 Token 成功响应
func ReturnTokenSuccess(c *gin.Context, response *models.TokenResponse) {
	if response != nil && response.SessionID != "" {
		appID := ""
		if response.SessionInfo != nil {
			appID = response.SessionInfo.CurrentAppID
		}
		SetSSOSessionCookies(c, response.SessionID, appID)
	}
	c.JSON(http.StatusOK, response)
}

// ReturnTokenError 返回标准的 Token 错误响应
func ReturnTokenError(c *gin.Context, httpStatus int, err, errDesc string, errCode, suggestAction string) {
	c.JSON(httpStatus, models.TokenErrorResponse{
		Error:            err,
		ErrorDescription: errDesc,
		ErrorCode:        errCode,
		SuggestAction:    suggestAction,
	})
}

// Token 错误响应快捷方法

// ReturnRefreshTokenInvalid Refresh token 无效
func ReturnRefreshTokenInvalid(c *gin.Context) {
	ReturnTokenError(c, http.StatusBadRequest,
		models.ErrorInvalidGrant,
		"Refresh token is invalid or expired",
		models.ErrorCodeRefreshTokenInvalid,
		models.SuggestActionCheckSession)
}

// ReturnRefreshTokenExpired Refresh token 已过期
func ReturnRefreshTokenExpired(c *gin.Context) {
	ReturnTokenError(c, http.StatusBadRequest,
		models.ErrorInvalidGrant,
		"Refresh token has expired",
		models.ErrorCodeRefreshTokenExpired,
		models.SuggestActionCheckSession)
}

// ReturnTokenHashMismatch Token hash 不匹配
func ReturnTokenHashMismatch(c *gin.Context) {
	ReturnTokenError(c, http.StatusBadRequest,
		models.ErrorInvalidGrant,
		"Refresh token not found or session expired",
		models.ErrorCodeTokenHashMismatch,
		models.SuggestActionCheckSession)
}

// ReturnTokenUserMismatch Token 用户不匹配
func ReturnTokenUserMismatch(c *gin.Context) {
	ReturnTokenError(c, http.StatusBadRequest,
		models.ErrorInvalidGrant,
		"Token user mismatch",
		models.ErrorCodeTokenUserMismatch,
		models.SuggestActionRelogin)
}

// ReturnSessionInactive Session 未激活
func ReturnSessionInactive(c *gin.Context) {
	ReturnTokenError(c, http.StatusUnauthorized,
		models.ErrorInvalidGrant,
		"Session is not active",
		models.ErrorCodeSessionInactive,
		models.SuggestActionRelogin)
}

// ReturnSessionExpired Session 已过期
func ReturnSessionExpired(c *gin.Context) {
	ReturnTokenError(c, http.StatusUnauthorized,
		models.ErrorInvalidGrant,
		"Session has expired",
		models.ErrorCodeSessionExpired,
		models.SuggestActionRelogin)
}

// ReturnSessionNotFound Session 未找到
func ReturnSessionNotFound(c *gin.Context) {
	ReturnTokenError(c, http.StatusUnauthorized,
		models.ErrorInvalidGrant,
		"Session not found",
		models.ErrorCodeSessionNotFound,
		models.SuggestActionCheckSession)
}

// ReturnSessionRevoked Session 已撤销（强制登出）
func ReturnSessionRevoked(c *gin.Context) {
	ReturnTokenError(c, http.StatusUnauthorized,
		models.ErrorInvalidGrant,
		"Session has been revoked (forced logout)",
		models.ErrorCodeSessionRevoked,
		models.SuggestActionRelogin)
}

// ReturnAuthCodeInvalid 授权码无效
func ReturnAuthCodeInvalid(c *gin.Context) {
	ReturnTokenError(c, http.StatusBadRequest,
		models.ErrorInvalidGrant,
		"Authorization code is invalid",
		models.ErrorCodeAuthCodeInvalid,
		models.SuggestActionRetryAuth)
}

// ReturnAuthCodeExpired 授权码已过期
func ReturnAuthCodeExpired(c *gin.Context) {
	ReturnTokenError(c, http.StatusBadRequest,
		models.ErrorInvalidGrant,
		"Authorization code has expired",
		models.ErrorCodeAuthCodeExpired,
		models.SuggestActionRetryAuth)
}

// ReturnAuthCodeUsed 授权码已使用
func ReturnAuthCodeUsed(c *gin.Context) {
	ReturnTokenError(c, http.StatusBadRequest,
		models.ErrorInvalidGrant,
		"Authorization code already used",
		models.ErrorCodeAuthCodeUsed,
		models.SuggestActionRetryAuth)
}

// ReturnClientNotFound 客户端未找到
func ReturnClientNotFound(c *gin.Context) {
	ReturnTokenError(c, http.StatusUnauthorized,
		models.ErrorInvalidClient,
		"Client not found",
		models.ErrorCodeClientNotFound,
		models.SuggestActionContactAdmin)
}

// ReturnClientSecretInvalid 客户端密钥无效
func ReturnClientSecretInvalid(c *gin.Context) {
	ReturnTokenError(c, http.StatusUnauthorized,
		models.ErrorInvalidClient,
		"Invalid client credentials",
		models.ErrorCodeClientSecretInvalid,
		models.SuggestActionContactAdmin)
}

// ReturnClientInactive 客户端未激活
func ReturnClientInactive(c *gin.Context) {
	ReturnTokenError(c, http.StatusUnauthorized,
		models.ErrorInvalidClient,
		"Client is not active",
		models.ErrorCodeClientInactive,
		models.SuggestActionContactAdmin)
}

// ReturnUserNotFound 用户未找到
func ReturnUserNotFound(c *gin.Context) {
	ReturnTokenError(c, http.StatusBadRequest,
		models.ErrorInvalidGrant,
		"User not found or inactive",
		models.ErrorCodeUserNotFound,
		models.SuggestActionRelogin)
}

// ReturnUserSuspended 用户已暂停
func ReturnUserSuspended(c *gin.Context) {
	ReturnTokenError(c, http.StatusForbidden,
		models.ErrorAccessDenied,
		"User account is suspended",
		models.ErrorCodeUserSuspended,
		models.SuggestActionContactAdmin)
}

// ReturnUserDeleted 用户已删除
func ReturnUserDeleted(c *gin.Context) {
	ReturnTokenError(c, http.StatusForbidden,
		models.ErrorAccessDenied,
		"User account is deleted",
		models.ErrorCodeUserDeleted,
		models.SuggestActionContactAdmin)
}

// ReturnTokenGenerationFailed Token生成失败
func ReturnTokenGenerationFailed(c *gin.Context) {
	ReturnTokenError(c, http.StatusInternalServerError,
		models.ErrorServerError,
		"Failed to generate token",
		models.ErrorCodeTokenGenerationFailed,
		models.SuggestActionRetry)
}

// ReturnDatabaseError 数据库错误
func ReturnDatabaseError(c *gin.Context) {
	ReturnTokenError(c, http.StatusInternalServerError,
		models.ErrorServerError,
		"Database operation failed",
		models.ErrorCodeDatabaseError,
		models.SuggestActionRetry)
}

// ReturnServiceUnavailable 服务不可用
func ReturnServiceUnavailable(c *gin.Context) {
	ReturnTokenError(c, http.StatusServiceUnavailable,
		models.ErrorTemporarilyUnavailable,
		"Service temporarily unavailable",
		models.ErrorCodeServiceUnavailable,
		models.SuggestActionRetryLater)
}

// ReturnInvalidRequest 无效请求（通用）
func ReturnInvalidRequest(c *gin.Context, description string) {
	ReturnTokenError(c, http.StatusBadRequest,
		models.ErrorInvalidRequest,
		description,
		"",
		"")
}
