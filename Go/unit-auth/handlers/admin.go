package handlers

import (
	"fmt"
	"net/http"
	"strconv"
	"time"
	"unit-auth/models"
	"unit-auth/utils"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

// AdminUserResponse 管理员用户响应
type AdminUserResponse struct {
	ID            string     `json:"id"`
	Email         string     `json:"email"`
	Phone         string     `json:"phone"`
	Username      string     `json:"username"`
	Nickname      string     `json:"nickname"`
	Role          string     `json:"role"`
	Status        string     `json:"status"`
	EmailVerified bool       `json:"email_verified"`
	PhoneVerified bool       `json:"phone_verified"`
	LoginCount    int64      `json:"login_count"`
	LastLoginAt   *time.Time `json:"last_login_at"`
	CreatedAt     time.Time  `json:"created_at"`
	UpdatedAt     time.Time  `json:"updated_at"`
}

// GetUsers 获取用户列表（管理员）
func GetUsers(db *gorm.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		// 分页参数
		page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
		pageSize, _ := strconv.Atoi(c.DefaultQuery("page_size", "10"))
		search := c.Query("search")
		status := c.Query("status")
		role := c.Query("role")
		sortBy := c.DefaultQuery("sort_by", "created_at")
		sortOrder := c.DefaultQuery("sort_order", "desc")

		// 构建查询
		query := db.Model(&models.User{})

		// 搜索条件
		if search != "" {
			query = query.Where("username LIKE ? OR email LIKE ? OR nickname LIKE ?",
				"%"+search+"%", "%"+search+"%", "%"+search+"%")
		}

		// 状态过滤
		if status != "" {
			query = query.Where("status = ?", status)
		}

		// 角色过滤
		if role != "" {
			query = query.Where("role = ?", role)
		}

		// 排序
		if sortOrder == "desc" {
			query = query.Order(sortBy + " DESC")
		} else {
			query = query.Order(sortBy + " ASC")
		}

		// 获取总数
		var total int64
		query.Count(&total)

		// 分页
		offset := (page - 1) * pageSize
		query = query.Offset(offset).Limit(pageSize)

		// 执行查询
		var users []models.User
		if err := query.Find(&users).Error; err != nil {
			c.JSON(http.StatusInternalServerError, models.Response{
				Code:    500,
				Message: "Failed to retrieve users",
			})
			return
		}

		// 转换为响应格式
		var userResponses []AdminUserResponse
		for _, user := range users {
			userResponse := AdminUserResponse{
				ID:            user.ID,
				Email:         "",
				Phone:         "",
				Username:      user.Username,
				Nickname:      user.Nickname,
				Role:          user.Role,
				Status:        user.Status,
				EmailVerified: user.EmailVerified,
				PhoneVerified: user.PhoneVerified,
				LoginCount:    user.LoginCount,
				LastLoginAt:   user.LastLoginAt,
				CreatedAt:     user.CreatedAt,
				UpdatedAt:     user.UpdatedAt,
			}

			// 处理指针类型字段
			if user.Email != nil {
				userResponse.Email = *user.Email
			}
			if user.Phone != nil {
				userResponse.Phone = *user.Phone
			}

			userResponses = append(userResponses, userResponse)
		}

		c.JSON(http.StatusOK, models.Response{
			Code:    200,
			Message: "Users retrieved successfully",
			Data: gin.H{
				"users": userResponses,
				"pagination": gin.H{
					"page":        page,
					"page_size":   pageSize,
					"total":       total,
					"total_pages": (total + int64(pageSize) - 1) / int64(pageSize),
				},
			},
		})
	}
}

// GetUser 获取单个用户信息（管理员）
func GetUser(db *gorm.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		userID := c.Param("id")

		var user models.User
		if err := db.Where("id = ?", userID).First(&user).Error; err != nil {
			c.JSON(http.StatusNotFound, models.Response{
				Code:    404,
				Message: "User not found",
			})
			return
		}

		// 转换为管理员响应格式
		userResponse := AdminUserResponse{
			ID:            user.ID,
			Email:         "",
			Phone:         "",
			Username:      user.Username,
			Nickname:      user.Nickname,
			Role:          user.Role,
			Status:        user.Status,
			EmailVerified: user.EmailVerified,
			PhoneVerified: user.PhoneVerified,
			LoginCount:    user.LoginCount,
			LastLoginAt:   user.LastLoginAt,
			CreatedAt:     user.CreatedAt,
			UpdatedAt:     user.UpdatedAt,
		}

		// 处理指针类型字段
		if user.Email != nil {
			userResponse.Email = *user.Email
		}
		if user.Phone != nil {
			userResponse.Phone = *user.Phone
		}

		c.JSON(http.StatusOK, models.Response{
			Code:    200,
			Message: "User retrieved successfully",
			Data:    userResponse,
		})
	}
}

// UpdateUser 更新用户信息（管理员）
func UpdateUser(db *gorm.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		userID := c.Param("id")

		var req models.AdminUpdateUserRequest
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

		// 更新字段
		if req.Username != "" {
			// 检查用户名是否已存在
			var existingUser models.User
			if err := db.Where("username = ? AND id != ?", req.Username, userID).First(&existingUser).Error; err == nil {
				c.JSON(http.StatusBadRequest, models.Response{
					Code:    400,
					Message: "Username already exists",
				})
				return
			}
			user.Username = req.Username
		}

		if req.Nickname != "" {
			user.Nickname = req.Nickname
		}

		if req.Role != "" {
			// 验证角色
			if !utils.IsValidRole(req.Role) {
				c.JSON(http.StatusBadRequest, models.Response{
					Code:    400,
					Message: "Invalid role",
				})
				return
			}
			user.Role = req.Role
		}

		if req.Status != "" {
			// 验证状态
			if !utils.IsValidStatus(req.Status) {
				c.JSON(http.StatusBadRequest, models.Response{
					Code:    400,
					Message: "Invalid status",
				})
				return
			}
			user.Status = req.Status
		}

		if req.Email != "" {
			// 检查邮箱是否已存在
			var existingUser models.User
			if err := db.Where("email = ? AND id != ?", req.Email, userID).First(&existingUser).Error; err == nil {
				c.JSON(http.StatusBadRequest, models.Response{
					Code:    400,
					Message: "Email already exists",
				})
				return
			}
			user.Email = &req.Email
		}

		if req.Phone != "" {
			// 检查手机号是否已存在
			var existingUser models.User
			if err := db.Where("phone = ? AND id != ?", req.Phone, userID).First(&existingUser).Error; err == nil {
				c.JSON(http.StatusBadRequest, models.Response{
					Code:    400,
					Message: "Phone number already exists",
				})
				return
			}
			user.Phone = &req.Phone
		}

		if req.EmailVerified != nil {
			user.EmailVerified = *req.EmailVerified
		}

		if req.PhoneVerified != nil {
			user.PhoneVerified = *req.PhoneVerified
		}

		if req.Meta != nil {
			user.SetMeta(req.Meta)
		}

		if err := db.Save(&user).Error; err != nil {
			c.JSON(http.StatusInternalServerError, models.Response{
				Code:    500,
				Message: "Failed to update user",
			})
			return
		}

		c.JSON(http.StatusOK, models.Response{
			Code:    200,
			Message: "User updated successfully",
			Data:    user.ToResponse(),
		})
	}
}

// DeleteUser 删除用户（管理员）
func DeleteUser(db *gorm.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		userID := c.Param("id")

		var user models.User
		if err := db.Where("id = ?", userID).First(&user).Error; err != nil {
			c.JSON(http.StatusNotFound, models.Response{
				Code:    404,
				Message: "User not found",
			})
			return
		}

		// 软删除用户
		if err := db.Delete(&user).Error; err != nil {
			c.JSON(http.StatusInternalServerError, models.Response{
				Code:    500,
				Message: "Failed to delete user",
			})
			return
		}

		c.JSON(http.StatusOK, models.Response{
			Code:    200,
			Message: "User deleted successfully",
		})
	}
}

// GetLoginLogs 获取登录日志（管理员）
func GetLoginLogs(db *gorm.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		// 分页参数
		page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
		pageSize, _ := strconv.Atoi(c.DefaultQuery("page_size", "20"))
		userID := c.Query("user_id")
		provider := c.Query("provider")
		success := c.Query("success")
		startDate := c.Query("start_date")
		endDate := c.Query("end_date")

		// 构建查询
		query := db.Model(&models.LoginLog{})

		// 过滤条件
		if userID != "" {
			query = query.Where("user_id = ?", userID)
		}
		if provider != "" {
			query = query.Where("provider = ?", provider)
		}
		if success != "" {
			successBool, _ := strconv.ParseBool(success)
			query = query.Where("success = ?", successBool)
		}
		if startDate != "" {
			query = query.Where("created_at >= ?", startDate)
		}
		if endDate != "" {
			query = query.Where("created_at <= ?", endDate)
		}

		// 获取总数
		var total int64
		query.Count(&total)

		// 分页
		offset := (page - 1) * pageSize
		query = query.Offset(offset).Limit(pageSize).Order("created_at DESC")

		// 执行查询
		var logs []models.LoginLog
		if err := query.Find(&logs).Error; err != nil {
			c.JSON(http.StatusInternalServerError, models.Response{
				Code:    500,
				Message: "Failed to retrieve login logs",
			})
			return
		}

		c.JSON(http.StatusOK, models.Response{
			Code:    200,
			Message: "Login logs retrieved successfully",
			Data: gin.H{
				"logs": logs,
				"pagination": gin.H{
					"page":        page,
					"page_size":   pageSize,
					"total":       total,
					"total_pages": (total + int64(pageSize) - 1) / int64(pageSize),
				},
			},
		})
	}
}

// GetUserStats 获取用户统计信息（管理员）
func GetUserStats(db *gorm.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		var stats struct {
			TotalUsers      int64 `json:"total_users"`
			ActiveUsers     int64 `json:"active_users"`
			InactiveUsers   int64 `json:"inactive_users"`
			EmailVerified   int64 `json:"email_verified"`
			PhoneVerified   int64 `json:"phone_verified"`
			AdminUsers      int64 `json:"admin_users"`
			NewUsersToday   int64 `json:"new_users_today"`
			NewUsersWeek    int64 `json:"new_users_week"`
			NewUsersMonth   int64 `json:"new_users_month"`
			LoginCountToday int64 `json:"login_count_today"`
		}

		// 总用户数
		db.Model(&models.User{}).Count(&stats.TotalUsers)

		// 活跃用户数
		db.Model(&models.User{}).Where("status = ?", "active").Count(&stats.ActiveUsers)

		// 非活跃用户数
		db.Model(&models.User{}).Where("status = ?", "inactive").Count(&stats.InactiveUsers)

		// 邮箱验证用户数
		db.Model(&models.User{}).Where("email_verified = ?", true).Count(&stats.EmailVerified)

		// 手机验证用户数
		db.Model(&models.User{}).Where("phone_verified = ?", true).Count(&stats.PhoneVerified)

		// 管理员用户数
		db.Model(&models.User{}).Where("role = ?", "admin").Count(&stats.AdminUsers)

		// 今日新用户
		today := time.Now().Truncate(24 * time.Hour)
		db.Model(&models.User{}).Where("created_at >= ?", today).Count(&stats.NewUsersToday)

		// 本周新用户
		weekAgo := time.Now().AddDate(0, 0, -7)
		db.Model(&models.User{}).Where("created_at >= ?", weekAgo).Count(&stats.NewUsersWeek)

		// 本月新用户
		monthAgo := time.Now().AddDate(0, -1, 0)
		db.Model(&models.User{}).Where("created_at >= ?", monthAgo).Count(&stats.NewUsersMonth)

		// 今日登录次数
		db.Model(&models.LoginLog{}).Where("created_at >= ? AND success = ?", today, true).Count(&stats.LoginCountToday)

		c.JSON(http.StatusOK, models.Response{
			Code:    200,
			Message: "User statistics retrieved successfully",
			Data:    stats,
		})
	}
}

// BulkUpdateUsers 批量更新用户（管理员）
func BulkUpdateUsers(db *gorm.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		var req models.BulkUpdateUsersRequest
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, models.Response{
				Code:    400,
				Message: "Invalid request data: " + err.Error(),
			})
			return
		}

		// 验证操作类型
		if req.Action != "activate" && req.Action != "deactivate" && req.Action != "delete" {
			c.JSON(http.StatusBadRequest, models.Response{
				Code:    400,
				Message: "Invalid action. Must be 'activate', 'deactivate', or 'delete'",
			})
			return
		}

		// 开始事务
		tx := db.Begin()
		defer func() {
			if r := recover(); r != nil {
				tx.Rollback()
			}
		}()

		var updatedCount int64
		var deletedCount int64

		for _, userID := range req.UserIDs {
			var user models.User
			if err := tx.Where("id = ?", userID).First(&user).Error; err != nil {
				continue // 跳过不存在的用户
			}

			switch req.Action {
			case "activate":
				user.Status = "active"
				if err := tx.Save(&user).Error; err == nil {
					updatedCount++
				}
			case "deactivate":
				user.Status = "inactive"
				if err := tx.Save(&user).Error; err == nil {
					updatedCount++
				}
			case "delete":
				if err := tx.Delete(&user).Error; err == nil {
					deletedCount++
				}
			}
		}

		// 提交事务
		if err := tx.Commit().Error; err != nil {
			c.JSON(http.StatusInternalServerError, models.Response{
				Code:    500,
				Message: "Failed to bulk update users",
			})
			return
		}

		message := fmt.Sprintf("Bulk operation completed. Updated: %d, Deleted: %d", updatedCount, deletedCount)
		c.JSON(http.StatusOK, models.Response{
			Code:    200,
			Message: message,
			Data: gin.H{
				"updated_count": updatedCount,
				"deleted_count": deletedCount,
			},
		})
	}
}

// GetVerificationStats 获取验证码统计信息
func GetVerificationStats(db *gorm.DB, cleanupService interface{}) gin.HandlerFunc {
	return func(c *gin.Context) {
		var stats struct {
			EmailVerifications int64 `json:"email_verifications"`
			SMSVerifications   int64 `json:"sms_verifications"`
			ExpiredCodes       int64 `json:"expired_codes"`
			UsedCodes          int64 `json:"used_codes"`
		}

		// 邮箱验证码统计
		db.Model(&models.EmailVerification{}).Count(&stats.EmailVerifications)
		db.Model(&models.EmailVerification{}).Where("expires_at < ? OR used = ?", time.Now(), true).Count(&stats.ExpiredCodes)
		db.Model(&models.EmailVerification{}).Where("used = ?", true).Count(&stats.UsedCodes)

		// 短信验证码统计
		db.Model(&models.SMSVerification{}).Count(&stats.SMSVerifications)

		c.JSON(http.StatusOK, models.Response{
			Code:    200,
			Message: "Verification stats retrieved successfully",
			Data:    stats,
		})
	}
}

// CleanupVerifications 手动清理验证码
func CleanupVerifications(db *gorm.DB, cleanupService interface{}) gin.HandlerFunc {
	return func(c *gin.Context) {
		// 清理过期的邮箱验证码
		db.Where("expires_at < ? OR used = ?", time.Now(), true).Delete(&models.EmailVerification{})

		// 清理过期的短信验证码
		db.Where("expires_at < ? OR used = ?", time.Now(), true).Delete(&models.SMSVerification{})

		c.JSON(http.StatusOK, models.Response{
			Code:    200,
			Message: "Verification cleanup completed",
		})
	}
}
