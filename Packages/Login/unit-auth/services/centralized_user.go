package services

import (
	"fmt"
	"time"
	"unit-auth/models"

	"gorm.io/gorm"
)

// CentralizedUserService 中心化用户管理服务
type CentralizedUserService struct {
	db *gorm.DB
}

// NewCentralizedUserService 创建中心化用户服务
func NewCentralizedUserService(db *gorm.DB) *CentralizedUserService {
	return &CentralizedUserService{db: db}
}

// CreateProjectMapping 创建项目映射
func (s *CentralizedUserService) CreateProjectMapping(userID, projectName, localUserID, mappingType string) error {
	mapping := models.ProjectMapping{
		UserID:      userID,
		ProjectName: projectName,
		LocalUserID: localUserID,
		MappingType: mappingType,
		IsActive:    true,
	}

	return s.db.Create(&mapping).Error
}

// GetProjectMapping 获取项目映射
func (s *CentralizedUserService) GetProjectMapping(projectName, localUserID string) (*models.ProjectMapping, error) {
	var mapping models.ProjectMapping
	err := s.db.Where("project_name = ? AND local_user_id = ? AND is_active = ?",
		projectName, localUserID, true).First(&mapping).Error
	if err != nil {
		return nil, err
	}
	return &mapping, nil
}

// GetUserByProjectMapping 通过项目映射获取用户
func (s *CentralizedUserService) GetUserByProjectMapping(projectName, localUserID string) (*models.User, error) {
	var mapping models.ProjectMapping
	err := s.db.Preload("User").Where("project_name = ? AND local_user_id = ? AND is_active = ?",
		projectName, localUserID, true).First(&mapping).Error
	if err != nil {
		return nil, err
	}
	return &mapping.User, nil
}

// RecordUserActivity 记录用户活动
func (s *CentralizedUserService) RecordUserActivity(userID, projectName, authType, ipAddress, userAgent string, success bool, errorMsg string) error {
	// 记录认证日志
	authLog := models.AuthLog{
		UserID:      userID,
		ProjectName: projectName,
		AuthType:    authType,
		IPAddress:   ipAddress,
		UserAgent:   userAgent,
		Success:     success,
		ErrorMsg:    errorMsg,
	}

	if err := s.db.Create(&authLog).Error; err != nil {
		return err
	}

	// 更新全局统计
	var stats models.GlobalUserStats
	err := s.db.Where("user_id = ? AND project_name = ?", userID, projectName).First(&stats).Error

	now := time.Now()
	if err == gorm.ErrRecordNotFound {
		// 创建新统计记录
		stats = models.GlobalUserStats{
			UserID:         userID,
			ProjectName:    projectName,
			LoginCount:     0,
			TotalUsageTime: 0,
		}
	}

	if success && authType == "login" {
		stats.LoginCount++
		stats.LastLoginAt = &now
	}
	stats.LastActivityAt = &now

	if err == gorm.ErrRecordNotFound {
		return s.db.Create(&stats).Error
	} else {
		return s.db.Save(&stats).Error
	}
}

// GetCrossProjectStats 获取跨项目统计
func (s *CentralizedUserService) GetCrossProjectStats(userID string) (*models.CrossProjectStats, error) {
	var stats models.CrossProjectStats
	err := s.db.Raw(`
		SELECT 
			user_id,
			username,
			email,
			active_projects,
			total_logins,
			last_activity,
			total_usage_time,
			created_at
		FROM cross_project_stats 
		WHERE user_id = ?
	`, userID).Scan(&stats).Error

	if err != nil {
		return nil, err
	}

	return &stats, nil
}

// GetAllCrossProjectStats 获取所有用户的跨项目统计
func (s *CentralizedUserService) GetAllCrossProjectStats(page, pageSize int) ([]models.CrossProjectStats, int64, error) {
	var stats []models.CrossProjectStats
	var total int64

	// 获取总数
	err := s.db.Raw(`SELECT COUNT(*) FROM cross_project_stats`).Scan(&total).Error
	if err != nil {
		return nil, 0, err
	}

	// 获取分页数据
	offset := (page - 1) * pageSize
	err = s.db.Raw(`
		SELECT 
			user_id,
			username,
			email,
			active_projects,
			total_logins,
			last_activity,
			total_usage_time,
			created_at
		FROM cross_project_stats 
		ORDER BY total_logins DESC, last_activity DESC
		LIMIT ? OFFSET ?
	`, pageSize, offset).Scan(&stats).Error

	if err != nil {
		return nil, 0, err
	}

	return stats, total, nil
}

// GetProjectStats 获取特定项目的用户统计
func (s *CentralizedUserService) GetProjectStats(projectName string, page, pageSize int) ([]models.GlobalUserStats, int64, error) {
	var stats []models.GlobalUserStats
	var total int64

	// 获取总数
	err := s.db.Model(&models.GlobalUserStats{}).Where("project_name = ?", projectName).Count(&total).Error
	if err != nil {
		return nil, 0, err
	}

	// 获取分页数据
	offset := (page - 1) * pageSize
	err = s.db.Preload("User").Where("project_name = ?", projectName).
		Order("login_count DESC, last_activity_at DESC").
		Limit(pageSize).Offset(offset).Find(&stats).Error

	if err != nil {
		return nil, 0, err
	}

	return stats, total, nil
}

// GetUserActivityLogs 获取用户活动日志
func (s *CentralizedUserService) GetUserActivityLogs(userID, projectName string, page, pageSize int) ([]models.AuthLog, int64, error) {
	var logs []models.AuthLog
	var total int64

	query := s.db.Model(&models.AuthLog{}).Where("user_id = ?", userID)
	if projectName != "" {
		query = query.Where("project_name = ?", projectName)
	}

	// 获取总数
	err := query.Count(&total).Error
	if err != nil {
		return nil, 0, err
	}

	// 获取分页数据
	offset := (page - 1) * pageSize
	err = query.Preload("User").
		Order("created_at DESC").
		Limit(pageSize).Offset(offset).Find(&logs).Error

	if err != nil {
		return nil, 0, err
	}

	return logs, total, nil
}

// UpdateUserMeta 更新用户元数据
func (s *CentralizedUserService) UpdateUserMeta(userID string, meta *models.UserMeta) error {
	var user models.User
	err := s.db.Where("id = ?", userID).First(&user).Error
	if err != nil {
		return err
	}

	return user.SetMeta(meta)
}

// GetUserMeta 获取用户元数据
func (s *CentralizedUserService) GetUserMeta(userID string) (*models.UserMeta, error) {
	var user models.User
	err := s.db.Where("id = ?", userID).First(&user).Error
	if err != nil {
		return nil, err
	}

	return user.GetMeta()
}

// SearchUsersByMeta 根据元数据搜索用户
func (s *CentralizedUserService) SearchUsersByMeta(key, value string, page, pageSize int) ([]models.User, int64, error) {
	var users []models.User
	var total int64

	// 构建搜索查询
	query := s.db.Model(&models.User{}).Where("deleted_at IS NULL")

	// 根据不同的key进行搜索
	switch key {
	case "avatar":
		query = query.Where("JSON_EXTRACT(meta, '$.avatar') LIKE ?", "%"+value+"%")
	case "gender":
		query = query.Where("JSON_EXTRACT(meta, '$.gender') = ?", value)
	case "location":
		query = query.Where("JSON_EXTRACT(meta, '$.location') LIKE ?", "%"+value+"%")
	case "company":
		query = query.Where("JSON_EXTRACT(meta, '$.company') LIKE ?", "%"+value+"%")
	case "job_title":
		query = query.Where("JSON_EXTRACT(meta, '$.job_title') LIKE ?", "%"+value+"%")
	default:
		return nil, 0, fmt.Errorf("unsupported search key: %s", key)
	}

	// 获取总数
	err := query.Count(&total).Error
	if err != nil {
		return nil, 0, err
	}

	// 获取分页数据
	offset := (page - 1) * pageSize
	err = query.Limit(pageSize).Offset(offset).Find(&users).Error

	if err != nil {
		return nil, 0, err
	}

	return users, total, nil
}

// GetActiveProjects 获取用户活跃的项目列表
func (s *CentralizedUserService) GetActiveProjects(userID string) ([]string, error) {
	var projectNames []string
	err := s.db.Model(&models.GlobalUserStats{}).
		Where("user_id = ?", userID).
		Pluck("project_name", &projectNames).Error

	return projectNames, err
}

// GetProjectUserCount 获取项目的用户数量
func (s *CentralizedUserService) GetProjectUserCount(projectName string) (int64, error) {
	var count int64
	err := s.db.Model(&models.GlobalUserStats{}).
		Where("project_name = ?", projectName).
		Count(&count).Error

	return count, err
}

// GetTopActiveUsers 获取最活跃的用户
func (s *CentralizedUserService) GetTopActiveUsers(limit int) ([]models.CrossProjectStats, error) {
	var stats []models.CrossProjectStats
	err := s.db.Raw(`
		SELECT 
			user_id,
			username,
			email,
			active_projects,
			total_logins,
			last_activity,
			total_usage_time,
			created_at
		FROM cross_project_stats 
		ORDER BY total_logins DESC, total_usage_time DESC
		LIMIT ?
	`, limit).Scan(&stats).Error

	return stats, err
}
