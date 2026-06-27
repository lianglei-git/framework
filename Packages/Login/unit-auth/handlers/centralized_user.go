package handlers

import (
	"net/http"
	"strconv"
	"unit-auth/models"
	"unit-auth/services"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

// CentralizedUserHandler 中心化用户管理处理器
type CentralizedUserHandler struct {
	centralizedService *services.CentralizedUserService
}

// NewCentralizedUserHandler 创建中心化用户处理器
func NewCentralizedUserHandler(db *gorm.DB) *CentralizedUserHandler {
	return &CentralizedUserHandler{
		centralizedService: services.NewCentralizedUserService(db),
	}
}

// CreateProjectMapping 创建项目映射
func (h *CentralizedUserHandler) CreateProjectMapping() gin.HandlerFunc {
	return func(c *gin.Context) {
		var req struct {
			UserID      string `json:"user_id" binding:"required"`
			ProjectName string `json:"project_name" binding:"required"`
			LocalUserID string `json:"local_user_id" binding:"required"`
			MappingType string `json:"mapping_type" binding:"required,oneof=direct alias federated"`
		}

		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, models.Response{
				Code:    400,
				Message: "Invalid request parameters",
			})
			return
		}

		err := h.centralizedService.CreateProjectMapping(
			req.UserID, req.ProjectName, req.LocalUserID, req.MappingType,
		)
		if err != nil {
			c.JSON(http.StatusInternalServerError, models.Response{
				Code:    500,
				Message: "Failed to create project mapping",
			})
			return
		}

		c.JSON(http.StatusCreated, models.Response{
			Code:    201,
			Message: "Project mapping created successfully",
		})
	}
}

// GetUserByProjectMapping 通过项目映射获取用户
func (h *CentralizedUserHandler) GetUserByProjectMapping() gin.HandlerFunc {
	return func(c *gin.Context) {
		projectName := c.Param("project")
		localUserID := c.Param("localUserId")

		user, err := h.centralizedService.GetUserByProjectMapping(projectName, localUserID)
		if err != nil {
			c.JSON(http.StatusNotFound, models.Response{
				Code:    404,
				Message: "User not found",
			})
			return
		}

		c.JSON(http.StatusOK, models.Response{
			Code:    200,
			Message: "User found",
			Data:    user.ToResponse(),
		})
	}
}

// GetCrossProjectStats 获取跨项目统计
func (h *CentralizedUserHandler) GetCrossProjectStats() gin.HandlerFunc {
	return func(c *gin.Context) {
		userID := c.Param("userId")

		stats, err := h.centralizedService.GetCrossProjectStats(userID)
		if err != nil {
			c.JSON(http.StatusNotFound, models.Response{
				Code:    404,
				Message: "User stats not found",
			})
			return
		}

		c.JSON(http.StatusOK, models.Response{
			Code:    200,
			Message: "Cross project stats retrieved",
			Data:    stats,
		})
	}
}

// GetAllCrossProjectStats 获取所有用户的跨项目统计
func (h *CentralizedUserHandler) GetAllCrossProjectStats() gin.HandlerFunc {
	return func(c *gin.Context) {
		page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
		pageSize, _ := strconv.Atoi(c.DefaultQuery("pageSize", "10"))

		stats, total, err := h.centralizedService.GetAllCrossProjectStats(page, pageSize)
		if err != nil {
			c.JSON(http.StatusInternalServerError, models.Response{
				Code:    500,
				Message: "Failed to get cross project stats",
			})
			return
		}

		c.JSON(http.StatusOK, models.Response{
			Code:    200,
			Message: "Cross project stats retrieved",
			Data: gin.H{
				"stats":     stats,
				"total":     total,
				"page":      page,
				"pageSize":  pageSize,
				"totalPage": (total + int64(pageSize) - 1) / int64(pageSize),
			},
		})
	}
}

// GetProjectStats 获取特定项目的用户统计
func (h *CentralizedUserHandler) GetProjectStats() gin.HandlerFunc {
	return func(c *gin.Context) {
		projectName := c.Param("project")
		page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
		pageSize, _ := strconv.Atoi(c.DefaultQuery("pageSize", "10"))

		stats, total, err := h.centralizedService.GetProjectStats(projectName, page, pageSize)
		if err != nil {
			c.JSON(http.StatusInternalServerError, models.Response{
				Code:    500,
				Message: "Failed to get project stats",
			})
			return
		}

		c.JSON(http.StatusOK, models.Response{
			Code:    200,
			Message: "Project stats retrieved",
			Data: gin.H{
				"stats":     stats,
				"total":     total,
				"page":      page,
				"pageSize":  pageSize,
				"totalPage": (total + int64(pageSize) - 1) / int64(pageSize),
			},
		})
	}
}

// GetUserActivityLogs 获取用户活动日志
func (h *CentralizedUserHandler) GetUserActivityLogs() gin.HandlerFunc {
	return func(c *gin.Context) {
		userID := c.Param("userId")
		projectName := c.Query("project")
		page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
		pageSize, _ := strconv.Atoi(c.DefaultQuery("pageSize", "10"))

		logs, total, err := h.centralizedService.GetUserActivityLogs(userID, projectName, page, pageSize)
		if err != nil {
			c.JSON(http.StatusInternalServerError, models.Response{
				Code:    500,
				Message: "Failed to get user activity logs",
			})
			return
		}

		c.JSON(http.StatusOK, models.Response{
			Code:    200,
			Message: "User activity logs retrieved",
			Data: gin.H{
				"logs":      logs,
				"total":     total,
				"page":      page,
				"pageSize":  pageSize,
				"totalPage": (total + int64(pageSize) - 1) / int64(pageSize),
			},
		})
	}
}

// UpdateUserMeta 更新用户元数据
func (h *CentralizedUserHandler) UpdateUserMeta() gin.HandlerFunc {
	return func(c *gin.Context) {
		userID := c.Param("userId")

		var req models.UpdateProfileRequest
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, models.Response{
				Code:    400,
				Message: "Invalid request parameters",
			})
			return
		}

		err := h.centralizedService.UpdateUserMeta(userID, req.Meta)
		if err != nil {
			c.JSON(http.StatusInternalServerError, models.Response{
				Code:    500,
				Message: "Failed to update user meta",
			})
			return
		}

		c.JSON(http.StatusOK, models.Response{
			Code:    200,
			Message: "User meta updated successfully",
		})
	}
}

// GetUserMeta 获取用户元数据
func (h *CentralizedUserHandler) GetUserMeta() gin.HandlerFunc {
	return func(c *gin.Context) {
		userID := c.Param("userId")

		meta, err := h.centralizedService.GetUserMeta(userID)
		if err != nil {
			c.JSON(http.StatusNotFound, models.Response{
				Code:    404,
				Message: "User meta not found",
			})
			return
		}

		c.JSON(http.StatusOK, models.Response{
			Code:    200,
			Message: "User meta retrieved",
			Data:    meta,
		})
	}
}

// SearchUsersByMeta 根据元数据搜索用户
func (h *CentralizedUserHandler) SearchUsersByMeta() gin.HandlerFunc {
	return func(c *gin.Context) {
		key := c.Query("key")
		value := c.Query("value")
		page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
		pageSize, _ := strconv.Atoi(c.DefaultQuery("pageSize", "10"))

		if key == "" || value == "" {
			c.JSON(http.StatusBadRequest, models.Response{
				Code:    400,
				Message: "Key and value parameters are required",
			})
			return
		}

		users, total, err := h.centralizedService.SearchUsersByMeta(key, value, page, pageSize)
		if err != nil {
			c.JSON(http.StatusInternalServerError, models.Response{
				Code:    500,
				Message: "Failed to search users",
			})
			return
		}

		// 转换为响应格式
		var userResponses []models.UserResponse
		for _, user := range users {
			userResponses = append(userResponses, user.ToResponse())
		}

		c.JSON(http.StatusOK, models.Response{
			Code:    200,
			Message: "Users found",
			Data: gin.H{
				"users":     userResponses,
				"total":     total,
				"page":      page,
				"pageSize":  pageSize,
				"totalPage": (total + int64(pageSize) - 1) / int64(pageSize),
			},
		})
	}
}

// GetActiveProjects 获取用户活跃的项目列表
func (h *CentralizedUserHandler) GetActiveProjects() gin.HandlerFunc {
	return func(c *gin.Context) {
		userID := c.Param("userId")

		projects, err := h.centralizedService.GetActiveProjects(userID)
		if err != nil {
			c.JSON(http.StatusInternalServerError, models.Response{
				Code:    500,
				Message: "Failed to get active projects",
			})
			return
		}

		c.JSON(http.StatusOK, models.Response{
			Code:    200,
			Message: "Active projects retrieved",
			Data:    projects,
		})
	}
}

// GetProjectUserCount 获取项目的用户数量
func (h *CentralizedUserHandler) GetProjectUserCount() gin.HandlerFunc {
	return func(c *gin.Context) {
		projectName := c.Param("project")

		count, err := h.centralizedService.GetProjectUserCount(projectName)
		if err != nil {
			c.JSON(http.StatusInternalServerError, models.Response{
				Code:    500,
				Message: "Failed to get project user count",
			})
			return
		}

		c.JSON(http.StatusOK, models.Response{
			Code:    200,
			Message: "Project user count retrieved",
			Data: gin.H{
				"project": projectName,
				"count":   count,
			},
		})
	}
}

// GetTopActiveUsers 获取最活跃的用户
func (h *CentralizedUserHandler) GetTopActiveUsers() gin.HandlerFunc {
	return func(c *gin.Context) {
		limit, _ := strconv.Atoi(c.DefaultQuery("limit", "10"))

		users, err := h.centralizedService.GetTopActiveUsers(limit)
		if err != nil {
			c.JSON(http.StatusInternalServerError, models.Response{
				Code:    500,
				Message: "Failed to get top active users",
			})
			return
		}

		c.JSON(http.StatusOK, models.Response{
			Code:    200,
			Message: "Top active users retrieved",
			Data:    users,
		})
	}
}

// RecordUserActivity 记录用户活动
func (h *CentralizedUserHandler) RecordUserActivity() gin.HandlerFunc {
	return func(c *gin.Context) {
		var req struct {
			UserID      string `json:"user_id" binding:"required"`
			ProjectName string `json:"project_name" binding:"required"`
			AuthType    string `json:"auth_type" binding:"required,oneof=login logout register password_reset"`
			IPAddress   string `json:"ip_address"`
			UserAgent   string `json:"user_agent"`
			Success     bool   `json:"success"`
			ErrorMsg    string `json:"error_msg"`
		}

		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, models.Response{
				Code:    400,
				Message: "Invalid request parameters",
			})
			return
		}

		err := h.centralizedService.RecordUserActivity(
			req.UserID, req.ProjectName, req.AuthType, req.IPAddress, req.UserAgent, req.Success, req.ErrorMsg,
		)
		if err != nil {
			c.JSON(http.StatusInternalServerError, models.Response{
				Code:    500,
				Message: "Failed to record user activity",
			})
			return
		}

		c.JSON(http.StatusOK, models.Response{
			Code:    200,
			Message: "User activity recorded successfully",
		})
	}
}
