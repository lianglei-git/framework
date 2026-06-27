package services

import (
	"context"

	"unit-auth/models"

	"gorm.io/gorm"
)

// EnsureProjectMapping 确保为用户在指定项目下存在映射；不存在则创建远端用户并写入映射
// 返回 localUserID（若成功获取或创建），否则返回空字符串
func EnsureProjectMapping(ctx context.Context, db *gorm.DB, projectKey string, user *models.User, explicitEmail string) (string, error) {
	if projectKey == "" || user == nil {
		return "", nil
	}

	// 查项目是否可用
	var p models.Project
	if err := db.Where("`key` = ? AND enabled = ?", projectKey, true).First(&p).Error; err != nil {
		return "", err
	}

	// 是否已有映射
	var pm models.ProjectMapping
	if err := db.Where("project_name = ? AND user_id = ?", projectKey, user.ID).First(&pm).Error; err == nil {
		return pm.LocalUserID, nil
	}

	// 组装对外用户数据
	email := explicitEmail
	if email == "" && user.Email != nil {
		email = *user.Email
	}
	cli := NewProjectClient(p)
	localID, err := cli.CreateUser(ctx, OutboundUser{
		UserID:   user.ID,
		Email:    email,
		Username: user.Username,
		Nickname: user.Nickname,
		Avatar:   user.GetAvatar(),
	})
	if err != nil {
		return "", err
	}

	_ = db.Create(&models.ProjectMapping{UserID: user.ID, ProjectName: projectKey, LocalUserID: localID}).Error
	return localID, nil
}
