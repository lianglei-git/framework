package handlers

import (
	"archive/zip"
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"time"
	"unit-auth/models"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

// BackupHandler 备份处理器
type BackupHandler struct {
	db *gorm.DB
}

// NewBackupHandler 创建备份处理器
func NewBackupHandler(db *gorm.DB) *BackupHandler {
	return &BackupHandler{
		db: db,
	}
}

// BackupData 备份数据结构
type BackupData struct {
	Version            string                     `json:"version"`
	CreatedAt          time.Time                  `json:"created_at"`
	Description        string                     `json:"description"`
	Users              []models.User              `json:"users"`
	LoginLogs          []models.LoginLog          `json:"login_logs"`
	UserStats          []models.UserStats         `json:"user_stats"`
	EmailVerifications []models.EmailVerification `json:"email_verifications"`
	SMSVerifications   []models.SMSVerification   `json:"sms_verifications"`
	PasswordResets     []models.PasswordReset     `json:"password_resets"`
	WeChatQRSessions   []models.WeChatQRSession   `json:"wechat_qr_sessions"`
}

// ExportBackup 导出备份
// POST /api/v1/backup/export
func (h *BackupHandler) ExportBackup() gin.HandlerFunc {
	return func(c *gin.Context) {
		var req struct {
			Description string `json:"description"`
			IncludeLogs bool   `json:"include_logs"`
		}

		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, models.Response{
				Code:    400,
				Message: "Invalid request data: " + err.Error(),
			})
			return
		}

		// 创建备份数据
		backup := BackupData{
			Version:     "1.0",
			CreatedAt:   time.Now(),
			Description: req.Description,
		}

		// 导出用户数据
		if err := h.db.Find(&backup.Users).Error; err != nil {
			c.JSON(http.StatusInternalServerError, models.Response{
				Code:    500,
				Message: "Failed to export users: " + err.Error(),
			})
			return
		}

		// 导出用户统计
		if err := h.db.Find(&backup.UserStats).Error; err != nil {
			c.JSON(http.StatusInternalServerError, models.Response{
				Code:    500,
				Message: "Failed to export user stats: " + err.Error(),
			})
			return
		}

		// 导出邮箱验证数据
		if err := h.db.Find(&backup.EmailVerifications).Error; err != nil {
			c.JSON(http.StatusInternalServerError, models.Response{
				Code:    500,
				Message: "Failed to export email verifications: " + err.Error(),
			})
			return
		}

		// 导出短信验证数据
		if err := h.db.Find(&backup.SMSVerifications).Error; err != nil {
			c.JSON(http.StatusInternalServerError, models.Response{
				Code:    500,
				Message: "Failed to export SMS verifications: " + err.Error(),
			})
			return
		}

		// 导出密码重置数据
		if err := h.db.Find(&backup.PasswordResets).Error; err != nil {
			c.JSON(http.StatusInternalServerError, models.Response{
				Code:    500,
				Message: "Failed to export password resets: " + err.Error(),
			})
			return
		}

		// 导出微信二维码会话数据
		if err := h.db.Find(&backup.WeChatQRSessions).Error; err != nil {
			c.JSON(http.StatusInternalServerError, models.Response{
				Code:    500,
				Message: "Failed to export WeChat QR sessions: " + err.Error(),
			})
			return
		}

		// 如果包含日志，导出登录日志
		if req.IncludeLogs {
			if err := h.db.Find(&backup.LoginLogs).Error; err != nil {
				c.JSON(http.StatusInternalServerError, models.Response{
					Code:    500,
					Message: "Failed to export login logs: " + err.Error(),
				})
				return
			}
		}

		// 生成JSON数据
		jsonData, err := json.MarshalIndent(backup, "", "  ")
		if err != nil {
			c.JSON(http.StatusInternalServerError, models.Response{
				Code:    500,
				Message: "Failed to marshal backup data: " + err.Error(),
			})
			return
		}

		// 创建ZIP文件
		var buf bytes.Buffer
		zipWriter := zip.NewWriter(&buf)

		// 添加JSON文件到ZIP
		jsonFile, err := zipWriter.Create("backup.json")
		if err != nil {
			c.JSON(http.StatusInternalServerError, models.Response{
				Code:    500,
				Message: "Failed to create ZIP file: " + err.Error(),
			})
			return
		}

		_, err = jsonFile.Write(jsonData)
		if err != nil {
			c.JSON(http.StatusInternalServerError, models.Response{
				Code:    500,
				Message: "Failed to write to ZIP file: " + err.Error(),
			})
			return
		}

		// 添加README文件
		readmeFile, err := zipWriter.Create("README.txt")
		if err != nil {
			c.JSON(http.StatusInternalServerError, models.Response{
				Code:    500,
				Message: "Failed to create README file: " + err.Error(),
			})
			return
		}

		readmeContent := fmt.Sprintf(`用户数据备份文件
创建时间: %s
版本: %s
描述: %s
包含数据:
- 用户信息
- 用户统计
- 邮箱验证记录
- 短信验证记录
- 密码重置记录
- 微信二维码会话
%s

使用说明:
1. 此文件包含完整的用户数据备份
2. 可以通过导入功能恢复数据
3. 请妥善保管此文件，包含敏感信息
`, backup.CreatedAt.Format("2006-01-02 15:04:05"), backup.Version, backup.Description,
			func() string {
				if req.IncludeLogs {
					return "- 登录日志"
				}
				return ""
			}())

		_, err = readmeFile.Write([]byte(readmeContent))
		if err != nil {
			c.JSON(http.StatusInternalServerError, models.Response{
				Code:    500,
				Message: "Failed to write README file: " + err.Error(),
			})
			return
		}

		zipWriter.Close()

		// 设置响应头
		filename := fmt.Sprintf("user_backup_%s.zip", time.Now().Format("20060102_150405"))
		c.Header("Content-Disposition", fmt.Sprintf("attachment; filename=%s", filename))
		c.Header("Content-Type", "application/zip")
		c.Data(http.StatusOK, "application/zip", buf.Bytes())
	}
}

// ImportBackup 导入备份
// POST /api/v1/backup/import
func (h *BackupHandler) ImportBackup() gin.HandlerFunc {
	return func(c *gin.Context) {
		// 获取上传的文件
		file, err := c.FormFile("backup_file")
		if err != nil {
			c.JSON(http.StatusBadRequest, models.Response{
				Code:    400,
				Message: "No backup file uploaded",
			})
			return
		}

		// 检查文件大小（限制为50MB）
		if file.Size > 50*1024*1024 {
			c.JSON(http.StatusBadRequest, models.Response{
				Code:    400,
				Message: "File too large. Maximum size is 50MB",
			})
			return
		}

		// 打开文件
		src, err := file.Open()
		if err != nil {
			c.JSON(http.StatusInternalServerError, models.Response{
				Code:    500,
				Message: "Failed to open uploaded file: " + err.Error(),
			})
			return
		}
		defer src.Close()

		// 读取ZIP文件
		zipReader, err := zip.NewReader(src, file.Size)
		if err != nil {
			c.JSON(http.StatusBadRequest, models.Response{
				Code:    400,
				Message: "Invalid ZIP file: " + err.Error(),
			})
			return
		}

		// 查找backup.json文件
		var backupData []byte
		for _, f := range zipReader.File {
			if f.Name == "backup.json" {
				rc, err := f.Open()
				if err != nil {
					c.JSON(http.StatusInternalServerError, models.Response{
						Code:    500,
						Message: "Failed to read backup file: " + err.Error(),
					})
					return
				}
				defer rc.Close()

				backupData, err = io.ReadAll(rc)
				if err != nil {
					c.JSON(http.StatusInternalServerError, models.Response{
						Code:    500,
						Message: "Failed to read backup data: " + err.Error(),
					})
					return
				}
				break
			}
		}

		if backupData == nil {
			c.JSON(http.StatusBadRequest, models.Response{
				Code:    400,
				Message: "No backup.json file found in ZIP",
			})
			return
		}

		// 解析备份数据
		var backup BackupData
		if err := json.Unmarshal(backupData, &backup); err != nil {
			c.JSON(http.StatusBadRequest, models.Response{
				Code:    400,
				Message: "Invalid backup file format: " + err.Error(),
			})
			return
		}

		// 验证备份数据
		if backup.Version == "" {
			c.JSON(http.StatusBadRequest, models.Response{
				Code:    400,
				Message: "Invalid backup file: missing version",
			})
			return
		}

		// 开始事务
		tx := h.db.Begin()
		defer func() {
			if r := recover(); r != nil {
				tx.Rollback()
			}
		}()

		// 导入用户数据
		if len(backup.Users) > 0 {
			// 先清空现有用户数据
			if err := tx.Where("1 = 1").Delete(&models.User{}).Error; err != nil {
				tx.Rollback()
				c.JSON(http.StatusInternalServerError, models.Response{
					Code:    500,
					Message: "Failed to clear existing users: " + err.Error(),
				})
				return
			}

			// 导入新用户数据
			for _, user := range backup.Users {
				if err := tx.Create(&user).Error; err != nil {
					tx.Rollback()
					c.JSON(http.StatusInternalServerError, models.Response{
						Code:    500,
						Message: "Failed to import user: " + err.Error(),
					})
					return
				}
			}
		}

		// 导入其他数据
		if len(backup.EmailVerifications) > 0 {
			tx.Where("1 = 1").Delete(&models.EmailVerification{})
			for _, ev := range backup.EmailVerifications {
				if err := tx.Create(&ev).Error; err != nil {
					tx.Rollback()
					c.JSON(http.StatusInternalServerError, models.Response{
						Code:    500,
						Message: "Failed to import email verifications: " + err.Error(),
					})
					return
				}
			}
		}

		if len(backup.SMSVerifications) > 0 {
			tx.Where("1 = 1").Delete(&models.SMSVerification{})
			for _, sv := range backup.SMSVerifications {
				if err := tx.Create(&sv).Error; err != nil {
					tx.Rollback()
					c.JSON(http.StatusInternalServerError, models.Response{
						Code:    500,
						Message: "Failed to import SMS verifications: " + err.Error(),
					})
					return
				}
			}
		}

		if len(backup.PasswordResets) > 0 {
			tx.Where("1 = 1").Delete(&models.PasswordReset{})
			for _, pr := range backup.PasswordResets {
				if err := tx.Create(&pr).Error; err != nil {
					tx.Rollback()
					c.JSON(http.StatusInternalServerError, models.Response{
						Code:    500,
						Message: "Failed to import password resets: " + err.Error(),
					})
					return
				}
			}
		}

		if len(backup.WeChatQRSessions) > 0 {
			tx.Where("1 = 1").Delete(&models.WeChatQRSession{})
			for _, wq := range backup.WeChatQRSessions {
				if err := tx.Create(&wq).Error; err != nil {
					tx.Rollback()
					c.JSON(http.StatusInternalServerError, models.Response{
						Code:    500,
						Message: "Failed to import WeChat QR sessions: " + err.Error(),
					})
					return
				}
			}
		}

		if len(backup.LoginLogs) > 0 {
			tx.Where("1 = 1").Delete(&models.LoginLog{})
			for _, ll := range backup.LoginLogs {
				if err := tx.Create(&ll).Error; err != nil {
					tx.Rollback()
					c.JSON(http.StatusInternalServerError, models.Response{
						Code:    500,
						Message: "Failed to import login logs: " + err.Error(),
					})
					return
				}
			}
		}

		if len(backup.UserStats) > 0 {
			tx.Where("1 = 1").Delete(&models.UserStats{})
			for _, us := range backup.UserStats {
				if err := tx.Create(&us).Error; err != nil {
					tx.Rollback()
					c.JSON(http.StatusInternalServerError, models.Response{
						Code:    500,
						Message: "Failed to import user stats: " + err.Error(),
					})
					return
				}
			}
		}

		// 提交事务
		if err := tx.Commit().Error; err != nil {
			c.JSON(http.StatusInternalServerError, models.Response{
				Code:    500,
				Message: "Failed to commit import: " + err.Error(),
			})
			return
		}

		c.JSON(http.StatusOK, models.Response{
			Code:    200,
			Message: "Backup imported successfully",
			Data: gin.H{
				"imported_users": len(backup.Users),
				"imported_logs":  len(backup.LoginLogs),
				"backup_version": backup.Version,
				"backup_date":    backup.CreatedAt.Format("2006-01-02 15:04:05"),
			},
		})
	}
}

// GetBackupInfo 获取备份信息
// GET /api/v1/backup/info
func (h *BackupHandler) GetBackupInfo() gin.HandlerFunc {
	return func(c *gin.Context) {
		var info struct {
			TotalUsers              int64      `json:"total_users"`
			TotalLoginLogs          int64      `json:"total_login_logs"`
			TotalUserStats          int64      `json:"total_user_stats"`
			TotalEmailVerifications int64      `json:"total_email_verifications"`
			TotalSMSVerifications   int64      `json:"total_sms_verifications"`
			TotalPasswordResets     int64      `json:"total_password_resets"`
			TotalWeChatQRSessions   int64      `json:"total_wechat_qr_sessions"`
			DatabaseSize            string     `json:"database_size"`
			LastBackup              *time.Time `json:"last_backup"`
		}

		// 统计用户数量
		h.db.Model(&models.User{}).Count(&info.TotalUsers)

		// 统计登录日志数量
		h.db.Model(&models.LoginLog{}).Count(&info.TotalLoginLogs)

		// 统计用户统计数量
		h.db.Model(&models.UserStats{}).Count(&info.TotalUserStats)

		// 统计邮箱验证数量
		h.db.Model(&models.EmailVerification{}).Count(&info.TotalEmailVerifications)

		// 统计短信验证数量
		h.db.Model(&models.SMSVerification{}).Count(&info.TotalSMSVerifications)

		// 统计密码重置数量
		h.db.Model(&models.PasswordReset{}).Count(&info.TotalPasswordResets)

		// 统计微信二维码会话数量
		h.db.Model(&models.WeChatQRSession{}).Count(&info.TotalWeChatQRSessions)

		// 获取数据库大小（简化版本）
		info.DatabaseSize = "Unknown" // 实际实现中可以通过SQL查询获取

		c.JSON(http.StatusOK, models.Response{
			Code:    200,
			Message: "Backup info retrieved successfully",
			Data:    info,
		})
	}
}

// ValidateBackup 验证备份文件
// POST /api/v1/backup/validate
func (h *BackupHandler) ValidateBackup() gin.HandlerFunc {
	return func(c *gin.Context) {
		// 获取上传的文件
		file, err := c.FormFile("backup_file")
		if err != nil {
			c.JSON(http.StatusBadRequest, models.Response{
				Code:    400,
				Message: "No backup file uploaded",
			})
			return
		}

		// 打开文件
		src, err := file.Open()
		if err != nil {
			c.JSON(http.StatusInternalServerError, models.Response{
				Code:    500,
				Message: "Failed to open uploaded file: " + err.Error(),
			})
			return
		}
		defer src.Close()

		// 读取ZIP文件
		zipReader, err := zip.NewReader(src, file.Size)
		if err != nil {
			c.JSON(http.StatusBadRequest, models.Response{
				Code:    400,
				Message: "Invalid ZIP file: " + err.Error(),
			})
			return
		}

		// 查找backup.json文件
		var backupData []byte
		for _, f := range zipReader.File {
			if f.Name == "backup.json" {
				rc, err := f.Open()
				if err != nil {
					c.JSON(http.StatusInternalServerError, models.Response{
						Code:    500,
						Message: "Failed to read backup file: " + err.Error(),
					})
					return
				}
				defer rc.Close()

				backupData, err = io.ReadAll(rc)
				if err != nil {
					c.JSON(http.StatusInternalServerError, models.Response{
						Code:    500,
						Message: "Failed to read backup data: " + err.Error(),
					})
					return
				}
				break
			}
		}

		if backupData == nil {
			c.JSON(http.StatusBadRequest, models.Response{
				Code:    400,
				Message: "No backup.json file found in ZIP",
			})
			return
		}

		// 解析备份数据
		var backup BackupData
		if err := json.Unmarshal(backupData, &backup); err != nil {
			c.JSON(http.StatusBadRequest, models.Response{
				Code:    400,
				Message: "Invalid backup file format: " + err.Error(),
			})
			return
		}

		// 验证备份数据
		var validation struct {
			IsValid            bool      `json:"is_valid"`
			Version            string    `json:"version"`
			CreatedAt          time.Time `json:"created_at"`
			Description        string    `json:"description"`
			UserCount          int       `json:"user_count"`
			LogCount           int       `json:"log_count"`
			StatsCount         int       `json:"stats_count"`
			EmailVerCount      int       `json:"email_ver_count"`
			SMSVerCount        int       `json:"sms_ver_count"`
			PasswordResetCount int       `json:"password_reset_count"`
			WeChatQRCount      int       `json:"wechat_qr_count"`
			Errors             []string  `json:"errors"`
		}

		validation.IsValid = true
		validation.Version = backup.Version
		validation.CreatedAt = backup.CreatedAt
		validation.Description = backup.Description
		validation.UserCount = len(backup.Users)
		validation.LogCount = len(backup.LoginLogs)
		validation.StatsCount = len(backup.UserStats)
		validation.EmailVerCount = len(backup.EmailVerifications)
		validation.SMSVerCount = len(backup.SMSVerifications)
		validation.PasswordResetCount = len(backup.PasswordResets)
		validation.WeChatQRCount = len(backup.WeChatQRSessions)

		// 验证必需字段
		if backup.Version == "" {
			validation.IsValid = false
			validation.Errors = append(validation.Errors, "Missing version")
		}

		if backup.CreatedAt.IsZero() {
			validation.IsValid = false
			validation.Errors = append(validation.Errors, "Missing creation date")
		}

		// 验证用户数据
		for i, user := range backup.Users {
			if user.ID == "" {
				validation.IsValid = false
				validation.Errors = append(validation.Errors, fmt.Sprintf("User %d: missing ID", i+1))
			}
			if user.Username == "" {
				validation.IsValid = false
				validation.Errors = append(validation.Errors, fmt.Sprintf("User %d: missing username", i+1))
			}
		}

		c.JSON(http.StatusOK, models.Response{
			Code:    200,
			Message: "Backup validation completed",
			Data:    validation,
		})
	}
}
