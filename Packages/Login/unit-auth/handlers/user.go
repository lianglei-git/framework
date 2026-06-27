package handlers

import (
	"fmt"
	"net/http"
	"unit-auth/middleware"
	"unit-auth/models"
	"unit-auth/services"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

// 获取用户信息
func GetProfile(db *gorm.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		userID := c.GetString("user_id")

		var user models.User
		if err := db.Where("id = ?", userID).First(&user).Error; err != nil {
			c.JSON(http.StatusNotFound, models.Response{
				Code:    404,
				Message: "User not found",
			})
			return
		}

		c.JSON(http.StatusOK, models.Response{
			Code:    200,
			Message: "Profile retrieved successfully",
			Data:    user.ToResponse(),
		})
	}
}

// 更新用户信息
func UpdateProfile(db *gorm.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		userID := c.GetString("user_id")

		var req models.UpdateProfileRequest
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, models.Response{
				Code:    400,
				Message: "Invalid request data: " + err.Error(),
			})
			return
		}

		fmt.Println("userID :::::: ", userID)
		var user models.User
		if err := db.Where("id = ?", userID).First(&user).Error; err != nil {
			c.JSON(http.StatusNotFound, models.Response{
				Code:    404,
				Message: "User not found",
			})
			return
		}

		// 更新字段
		if req.Nickname != "" {
			user.Nickname = req.Nickname
		}
		if req.Meta != nil {
			user.SetMeta(req.Meta)
		}

		if err := db.Save(&user).Error; err != nil {
			c.JSON(http.StatusInternalServerError, models.Response{
				Code:    500,
				Message: "Failed to update profile",
			})
			return
		}

		// 若上下文存在项目映射，推送更新
		if keyVal, ok := c.Get(middleware.CtxProjectKey); ok {
			projectKey := keyVal.(string)
			var p models.Project
			if err := db.Where("`key` = ? AND enabled = ?", projectKey, true).First(&p).Error; err == nil {
				var pm models.ProjectMapping
				if err := db.Where("project_name = ? AND user_id = ?", projectKey, user.ID).First(&pm).Error; err == nil {
					cli := services.NewProjectClient(p)
					_ = cli.UpdateUser(c.Request.Context(), pm.LocalUserID, services.OutboundUser{UserID: user.ID, Email: user.ToResponse().Email, Username: user.Username, Nickname: user.Nickname, Avatar: user.GetAvatar()})
				}
			}
		}

		c.JSON(http.StatusOK, models.Response{
			Code:    200,
			Message: "Profile updated successfully",
			Data:    user.ToResponse(),
		})
	}
}

// 修改密码
func ChangePassword(db *gorm.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		userID := c.GetString("user_id")

		var req models.ChangePasswordRequest
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, models.Response{
				Code:    400,
				Message: "Invalid request data: " + err.Error(),
			})
			return
		}

		var user models.User
		if err := db.Where("id = ?", userID).First(&user).Error; err != nil {
			c.JSON(http.StatusNotFound, models.Response{
				Code:    404,
				Message: "User not found",
			})
			return
		}

		// 验证旧密码
		if !user.CheckPassword(req.OldPassword) {
			c.JSON(http.StatusBadRequest, models.Response{
				Code:    400,
				Message: "Invalid old password",
			})
			return
		}

		// 更新密码
		user.Password = req.NewPassword
		if err := user.HashPassword(); err != nil {
			c.JSON(http.StatusInternalServerError, models.Response{
				Code:    500,
				Message: "Failed to hash password",
			})
			return
		}

		if err := db.Save(&user).Error; err != nil {
			c.JSON(http.StatusInternalServerError, models.Response{
				Code:    500,
				Message: "Failed to update password",
			})
			return
		}

		c.JSON(http.StatusOK, models.Response{
			Code:    200,
			Message: "Password changed successfully",
		})
	}
}
