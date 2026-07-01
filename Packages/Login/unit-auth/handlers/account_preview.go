package handlers

import (
	"net/http"
	"strings"
	"unit-auth/models"
	appUtils "unit-auth/utils"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

type accountPreviewRequest struct {
	Account string `json:"account" binding:"required"`
}

type accountPreviewResponse struct {
	Found       bool   `json:"found"`
	Username    string `json:"username,omitempty"`
	Nickname    string `json:"nickname,omitempty"`
	Email       string `json:"email,omitempty"`
	Phone       string `json:"phone,omitempty"`
	Avatar      string `json:"avatar,omitempty"`
	DisplayName string `json:"display_name,omitempty"`
	Subtitle    string `json:"subtitle,omitempty"`
}

func maskEmail(email string) string {
	parts := strings.SplitN(email, "@", 2)
	if len(parts) != 2 || parts[0] == "" {
		return email
	}
	prefix := parts[0]
	masked := prefix[:1]
	if len(prefix) > 1 {
		masked += "***"
	}
	return masked + "@" + parts[1]
}

func maskPhone(phone string) string {
	if len(phone) < 7 {
		return phone
	}
	return phone[:3] + "****" + phone[len(phone)-4:]
}

func buildAccountPreview(user models.User, account string) accountPreviewResponse {
	email := ""
	if user.Email != nil {
		email = *user.Email
	}
	phone := ""
	if user.Phone != nil {
		phone = *user.Phone
	}

	displayName := strings.TrimSpace(user.Nickname)
	if displayName == "" {
		displayName = user.Username
	}

	subtitle := ""
	accountType := appUtils.IdentifyAccountType(account)
	switch accountType {
	case appUtils.AccountTypeEmail:
		subtitle = email
	case appUtils.AccountTypePhone:
		if phone != "" {
			subtitle = phone
		} else {
			subtitle = account
		}
	default:
		if email != "" {
			subtitle = maskEmail(email)
		} else if phone != "" {
			subtitle = maskPhone(phone)
		}
	}

	avatar := user.GetAvatar()
	if avatar == "" {
		avatar = appUtils.GetDefaultAvatar(user.Username)
	}

	return accountPreviewResponse{
		Found:       true,
		Username:    user.Username,
		Nickname:    user.Nickname,
		Email:       email,
		Phone:       phone,
		Avatar:      avatar,
		DisplayName: displayName,
		Subtitle:    subtitle,
	}
}

// AccountPreview 登录前账号预览（公开字段，用于密码步骤展示头像与昵称）
func AccountPreview(db *gorm.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		var req accountPreviewRequest
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, models.Response{
				Code:    400,
				Message: "Invalid request data: " + err.Error(),
			})
			return
		}

		account := strings.TrimSpace(req.Account)
		var user models.User
		err := db.Where("(username = ? OR email = ? OR phone = ?)", account, account, account).First(&user).Error
		if err != nil {
			if err == gorm.ErrRecordNotFound {
				c.JSON(http.StatusOK, models.Response{
					Code:    200,
					Message: "Account preview not found",
					Data: accountPreviewResponse{
						Found: false,
					},
				})
				return
			}
			c.JSON(http.StatusInternalServerError, models.Response{
				Code:    500,
				Message: "Failed to lookup account",
			})
			return
		}

		c.JSON(http.StatusOK, models.Response{
			Code:    200,
			Message: "Account preview retrieved",
			Data:    buildAccountPreview(user, account),
		})
	}
}
