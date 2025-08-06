package handlers

import (
	"crypto/rand"
	"encoding/hex"
	"net/http"
	"time"
	"unit-auth/models"
	"unit-auth/plugins"
	"unit-auth/services"
	"unit-auth/utils"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

// WeChatAuthHandler 微信认证处理器
type WeChatAuthHandler struct {
	db             *gorm.DB
	wechatProvider *plugins.WeChatProvider
	statsService   *services.StatsService
}

// NewWeChatAuthHandler 创建微信认证处理器
func NewWeChatAuthHandler(db *gorm.DB, wechatProvider *plugins.WeChatProvider, statsService *services.StatsService) *WeChatAuthHandler {
	return &WeChatAuthHandler{
		db:             db,
		wechatProvider: wechatProvider,
		statsService:   statsService,
	}
}

// GetQRCode 获取微信扫码登录二维码
func (h *WeChatAuthHandler) GetQRCode() gin.HandlerFunc {
	return func(c *gin.Context) {
		// 生成随机state
		state := generateRandomState()

		// 获取微信授权URL
		authURL, err := h.wechatProvider.GetAuthURL(c.Request.Context(), state)
		if err != nil {
			c.JSON(http.StatusInternalServerError, models.Response{
				Code:    500,
				Message: "Failed to generate WeChat QR code: " + err.Error(),
			})
			return
		}

		// 保存state到数据库（用于验证回调）
		qrSession := models.WeChatQRSession{
			State:     state,
			IP:        c.ClientIP(),
			UserAgent: c.GetHeader("User-Agent"),
			ExpiresAt: time.Now().Add(5 * time.Minute), // 5分钟过期
			CreatedAt: time.Now(),
		}

		if err := h.db.Create(&qrSession).Error; err != nil {
			c.JSON(http.StatusInternalServerError, models.Response{
				Code:    500,
				Message: "Failed to save QR session",
			})
			return
		}

		c.JSON(http.StatusOK, models.Response{
			Code:    200,
			Message: "QR code generated successfully",
			Data: gin.H{
				"qr_url":     authURL,
				"state":      state,
				"expires_at": qrSession.ExpiresAt,
			},
		})
	}
}

// HandleCallback 处理微信回调
func (h *WeChatAuthHandler) HandleCallback() gin.HandlerFunc {
	return func(c *gin.Context) {
		code := c.Query("code")
		state := c.Query("state")

		if code == "" || state == "" {
			c.JSON(http.StatusBadRequest, models.Response{
				Code:    400,
				Message: "Missing code or state parameter",
			})
			return
		}

		// 验证state
		var qrSession models.WeChatQRSession
		if err := h.db.Where("state = ? AND expires_at > ?", state, time.Now()).First(&qrSession).Error; err != nil {
			c.JSON(http.StatusBadRequest, models.Response{
				Code:    400,
				Message: "Invalid or expired state",
			})
			return
		}

		// 标记state为已使用
		h.db.Model(&qrSession).Update("used", true)

		// 处理OAuth回调
		user, err := h.wechatProvider.HandleCallback(c.Request.Context(), code, state)
		if err != nil {
			// 记录失败的登录日志
			h.statsService.RecordLoginLog("", "wechat", qrSession.IP, qrSession.UserAgent, "", false, err.Error())

			c.JSON(http.StatusUnauthorized, models.Response{
				Code:    401,
				Message: "WeChat login failed: " + err.Error(),
			})
			return
		}

		// 生成JWT Token
		var identifier string
		if user.WeChatID != nil {
			identifier = *user.WeChatID
		} else {
			identifier = user.ID
		}

		token, err := utils.GenerateToken(user.ID, identifier, user.Role)
		if err != nil {
			c.JSON(http.StatusInternalServerError, models.Response{
				Code:    500,
				Message: "Failed to generate token",
			})
			return
		}

		// 更新用户登录信息
		h.statsService.UpdateUserLoginInfo(user.ID, qrSession.IP, qrSession.UserAgent)

		// 记录成功的登录日志
		h.statsService.RecordLoginLog(user.ID, "wechat", qrSession.IP, qrSession.UserAgent, "", true, "")

		c.JSON(http.StatusOK, models.Response{
			Code:    200,
			Message: "WeChat login successful",
			Data: models.LoginResponse{
				User:  user.ToResponse(),
				Token: token,
			},
		})
	}
}

// CheckLoginStatus 检查扫码登录状态
func (h *WeChatAuthHandler) CheckLoginStatus() gin.HandlerFunc {
	return func(c *gin.Context) {
		state := c.Param("state")

		if state == "" {
			c.JSON(http.StatusBadRequest, models.Response{
				Code:    400,
				Message: "Missing state parameter",
			})
			return
		}

		// 查找QR会话
		var qrSession models.WeChatQRSession
		if err := h.db.Where("state = ?", state).First(&qrSession).Error; err != nil {
			c.JSON(http.StatusNotFound, models.Response{
				Code:    404,
				Message: "QR session not found",
			})
			return
		}

		// 检查是否已过期
		if qrSession.ExpiresAt.Before(time.Now()) {
			c.JSON(http.StatusGone, models.Response{
				Code:    410,
				Message: "QR code expired",
			})
			return
		}

		// 检查是否已使用
		if qrSession.Used {
			// 查找对应的用户
			var user models.User
			if err := h.db.Where("wechat_id = ?", qrSession.WeChatID).First(&user).Error; err == nil {
				// 生成JWT Token
				var identifier string
				if user.WeChatID != nil {
					identifier = *user.WeChatID
				} else {
					identifier = user.ID
				}

				token, err := utils.GenerateToken(user.ID, identifier, user.Role)
				if err == nil {
					c.JSON(http.StatusOK, models.Response{
						Code:    200,
						Message: "Login successful",
						Data: models.LoginResponse{
							User:  user.ToResponse(),
							Token: token,
						},
					})
					return
				}
			}
		}

		c.JSON(http.StatusOK, models.Response{
			Code:    200,
			Message: "QR code scanned, waiting for confirmation",
			Data: gin.H{
				"status":  "pending",
				"scanned": qrSession.Scanned,
				"used":    qrSession.Used,
			},
		})
	}
}

// generateRandomState 生成随机state
func generateRandomState() string {
	bytes := make([]byte, 16)
	rand.Read(bytes)
	return hex.EncodeToString(bytes)
}
