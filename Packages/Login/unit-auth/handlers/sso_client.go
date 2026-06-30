package handlers

import (
	"net/http"
	"unit-auth/models"
	"unit-auth/services"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"gorm.io/gorm"
)

// CreateSSOClient 创建SSO客户端
func CreateSSOClient(db *gorm.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		var req models.CreateSSOClientRequest
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, models.Response{
				Code:    400,
				Message: "Invalid request data: " + err.Error(),
			})
			return
		}

		client, err := models.CreateSSOClient(db, &req)
		if err != nil {
			c.JSON(http.StatusInternalServerError, models.Response{
				Code:    500,
				Message: "Failed to create SSO client: " + err.Error(),
			})
			return
		}

		c.JSON(http.StatusCreated, models.Response{
			Code:    201,
			Message: "SSO client created successfully",
			Data:    client.ToResponseForCreate(),
		})
	}
}

// GetSSOClients 获取所有SSO客户端
func GetSSOClients(db *gorm.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		clients, err := models.GetAllSSOClients(db)
		if err != nil {
			c.JSON(http.StatusInternalServerError, models.Response{
				Code:    500,
				Message: "Failed to get SSO clients: " + err.Error(),
			})
			return
		}

		var clientResponses []models.SSOClientResponse
		for _, client := range clients {
			clientResponses = append(clientResponses, client.ToResponse())
		}

		c.JSON(http.StatusOK, models.Response{
			Code:    200,
			Message: "SSO clients retrieved successfully",
			Data:    clientResponses,
		})
	}
}

// GetSSOClient 获取指定SSO客户端
func GetSSOClient(db *gorm.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		clientID := c.Param("id")
		if clientID == "" {
			c.JSON(http.StatusBadRequest, models.Response{
				Code:    400,
				Message: "Client ID is required",
			})
			return
		}

		client, err := models.GetSSOClientByID(db, clientID)
		if err != nil {
			c.JSON(http.StatusNotFound, models.Response{
				Code:    404,
				Message: "SSO client not found",
			})
			return
		}

		c.JSON(http.StatusOK, models.Response{
			Code:    200,
			Message: "SSO client retrieved successfully",
			Data:    client.ToResponse(),
		})
	}
}

// UpdateSSOClient 更新SSO客户端
func UpdateSSOClient(db *gorm.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		clientID := c.Param("id")
		if clientID == "" {
			c.JSON(http.StatusBadRequest, models.Response{
				Code:    400,
				Message: "Client ID is required",
			})
			return
		}

		var req models.UpdateSSOClientRequest
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, models.Response{
				Code:    400,
				Message: "Invalid request data: " + err.Error(),
			})
			return
		}

		client, err := models.UpdateSSOClient(db, clientID, &req)
		if err != nil {
			c.JSON(http.StatusInternalServerError, models.Response{
				Code:    500,
				Message: "Failed to update SSO client: " + err.Error(),
			})
			return
		}

		c.JSON(http.StatusOK, models.Response{
			Code:    200,
			Message: "SSO client updated successfully",
			Data:    client.ToResponse(),
		})
	}
}

// DeleteSSOClient 删除SSO客户端
func DeleteSSOClient(db *gorm.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		clientID := c.Param("id")
		if clientID == "" {
			c.JSON(http.StatusBadRequest, models.Response{
				Code:    400,
				Message: "Client ID is required",
			})
			return
		}

		err := models.DeleteSSOClient(db, clientID)
		if err != nil {
			c.JSON(http.StatusInternalServerError, models.Response{
				Code:    500,
				Message: "Failed to delete SSO client: " + err.Error(),
			})
			return
		}

		c.JSON(http.StatusOK, models.Response{
			Code:    200,
			Message: "SSO client deleted successfully",
		})
	}
}

// RegenerateSSOClientSecret 重新生成SSO客户端密钥
func RegenerateSSOClientSecret(db *gorm.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		clientID := c.Param("id")
		if clientID == "" {
			c.JSON(http.StatusBadRequest, models.Response{
				Code:    400,
				Message: "Client ID is required",
			})
			return
		}

		client, err := models.RegenerateSSOClientSecret(db, clientID)
		if err != nil {
			c.JSON(http.StatusNotFound, models.Response{
				Code:    404,
				Message: "SSO client not found",
			})
			return
		}

		c.JSON(http.StatusOK, models.Response{
			Code:    200,
			Message: "Client secret regenerated successfully. Save it now — it will not be shown again.",
			Data:    client.ToResponseForCreate(),
		})
	}
}

// SetSSOClientSecret 设置自定义客户端密钥（留空则随机生成）
func SetSSOClientSecret(db *gorm.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		clientID := c.Param("id")
		if clientID == "" {
			c.JSON(http.StatusBadRequest, models.Response{
				Code:    400,
				Message: "Client ID is required",
			})
			return
		}

		var req models.SetSSOClientSecretRequest
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, models.Response{
				Code:    400,
				Message: "Invalid request data: " + err.Error(),
			})
			return
		}

		client, err := models.SetSSOClientSecret(db, clientID, &req)
		if err != nil {
			c.JSON(http.StatusBadRequest, models.Response{
				Code:    400,
				Message: err.Error(),
			})
			return
		}

		c.JSON(http.StatusOK, models.Response{
			Code:    200,
			Message: "Client secret updated. Save it now — it will not be shown again.",
			Data:    client.ToResponseForCreate(),
		})
	}
}

// GetSSOClientStats 获取SSO客户端统计信息
func GetSSOClientStats(db *gorm.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		var stats struct {
			TotalClients    int64 `json:"total_clients"`
			ActiveClients   int64 `json:"active_clients"`
			InactiveClients int64 `json:"inactive_clients"`
		}

		if err := db.Model(&models.SSOClient{}).Count(&stats.TotalClients).Error; err != nil {
			c.JSON(http.StatusInternalServerError, models.Response{
				Code:    500,
				Message: "Failed to get total clients count: " + err.Error(),
			})
			return
		}

		if err := db.Model(&models.SSOClient{}).Where("is_active = ?", true).Count(&stats.ActiveClients).Error; err != nil {
			c.JSON(http.StatusInternalServerError, models.Response{
				Code:    500,
				Message: "Failed to get active clients count: " + err.Error(),
			})
			return
		}

		stats.InactiveClients = stats.TotalClients - stats.ActiveClients

		c.JSON(http.StatusOK, models.Response{
			Code:    200,
			Message: "SSO client stats retrieved successfully",
			Data:    stats,
		})
	}
}

// CleanupExpiredSSOSessions 清理过期的SSO会话
func CleanupExpiredSSOSessions(db *gorm.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		cleanupService := services.NewCleanupService(db)
		count, err := cleanupService.CleanupExpiredSSOSessions()
		if err != nil {
			c.JSON(http.StatusInternalServerError, models.Response{
				Code:    500,
				Message: "Failed to cleanup expired SSO sessions: " + err.Error(),
			})
			return
		}

		c.JSON(http.StatusOK, models.Response{
			Code:    200,
			Message: "Expired SSO sessions cleaned up successfully",
			Data:    gin.H{"cleaned_count": count},
		})
	}
}

// GetSSOSessionStats 获取SSO会话统计信息
func GetSSOSessionStats(db *gorm.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		var stats struct {
			TotalSessions   int64 `json:"total_sessions"`
			ActiveSessions  int64 `json:"active_sessions"`
			UsedSessions    int64 `json:"used_sessions"`
			ExpiredSessions int64 `json:"expired_sessions"`
		}

		if err := db.Model(&models.SSOSession{}).Count(&stats.TotalSessions).Error; err != nil {
			c.JSON(http.StatusInternalServerError, models.Response{
				Code:    500,
				Message: "Failed to get total sessions count: " + err.Error(),
			})
			return
		}

		if err := db.Model(&models.SSOSession{}).Where("used = ?", true).Count(&stats.UsedSessions).Error; err != nil {
			c.JSON(http.StatusInternalServerError, models.Response{
				Code:    500,
				Message: "Failed to get used sessions count: " + err.Error(),
			})
			return
		}

		// 这里简化处理，实际应该查询未过期且未使用的会话
		stats.ActiveSessions = stats.TotalSessions - stats.UsedSessions

		c.JSON(http.StatusOK, models.Response{
			Code:    200,
			Message: "SSO session stats retrieved successfully",
			Data:    stats,
		})
	}
}

// 生成客户端密钥的辅助函数
func generateClientSecret() string {
	return "client_secret_" + uuid.New().String()
}
