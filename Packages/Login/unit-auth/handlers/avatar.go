package handlers

import (
	"net/http"
	"strings"
	"unit-auth/middleware"
	"unit-auth/models"
	"unit-auth/services"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

func requestAPIBase(c *gin.Context) string {
	return RequestAPIBase(c)
}

// UploadAvatar 上传用户头像（namespace: avatars）
func UploadAvatar(db *gorm.DB) gin.HandlerFunc {
	registry := services.MustDefaultStorageRegistry()

	return func(c *gin.Context) {
		userID := c.GetString("user_id")
		file, header, err := c.Request.FormFile("file")
		if err != nil {
			c.JSON(http.StatusBadRequest, models.Response{
				Code:    400,
				Message: "No file uploaded",
			})
			return
		}
		defer file.Close()

		storedValue, err := services.SaveFile(services.AvatarNamespace, userID, file, header)
		if err != nil {
			c.JSON(http.StatusBadRequest, models.Response{
				Code:    400,
				Message: "Failed to save avatar: " + err.Error(),
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

		if err := user.SetAvatar(storedValue); err != nil {
			c.JSON(http.StatusInternalServerError, models.Response{
				Code:    500,
				Message: "Failed to update avatar metadata",
			})
			return
		}

		if err := db.Save(&user).Error; err != nil {
			c.JSON(http.StatusInternalServerError, models.Response{
				Code:    500,
				Message: "Failed to save user",
			})
			return
		}

		if keyVal, ok := c.Get(middleware.CtxProjectKey); ok {
			projectKey := keyVal.(string)
			var p models.Project
			if err := db.Where("`key` = ? AND enabled = ?", projectKey, true).First(&p).Error; err == nil {
				var pm models.ProjectMapping
				if err := db.Where("project_name = ? AND user_id = ?", projectKey, user.ID).First(&pm).Error; err == nil {
					cli := services.NewProjectClient(p)
					_ = cli.UpdateUser(c.Request.Context(), pm.LocalUserID, services.OutboundUser{
						UserID:   user.ID,
						Email:    user.ToResponse().Email,
						Username: user.Username,
						Nickname: user.Nickname,
						Avatar:   services.PresentUserResponse(&user, RequestAPIBase(c)).AvatarURL,
					})
				}
			}
		}

		apiBase := RequestAPIBase(c)
		avatarURL := registry.ResolveStoredFileURL(storedValue, apiBase)

		c.JSON(http.StatusOK, models.Response{
			Code:    200,
			Message: "Avatar uploaded successfully",
			Data: gin.H{
				"avatar_url": avatarURL,
				"avatar_key": storedValue,
			},
		})
	}
}

// GetAvatar 读取本地头像文件（仅 local scheme）
func GetAvatar(db *gorm.DB) gin.HandlerFunc {
	registry := services.MustDefaultStorageRegistry()
	return func(c *gin.Context) {
		filename := strings.TrimSpace(c.Param("filename"))
		path, err := registry.LocalDiskPath(filename)
		if err != nil {
			c.JSON(http.StatusNotFound, models.Response{
				Code:    404,
				Message: "Avatar not found",
			})
			return
		}
		c.File(path)
		_ = db
	}
}
