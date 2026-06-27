package models

import (
	"time"
)

// Project 第三方项目配置
// credentials_enc 建议加密存储，当前作为占位字段
// auth_mode: api_key | bearer | none
// base_url: 例如 http://localhost:9001
// key: 例如 nature_trans
// name: 展示名称
// enabled: 开关
// timeout_ms / retry_policy: 可扩展

type Project struct {
	ID             uint      `json:"id" gorm:"primaryKey"`
	Key            string    `json:"key" gorm:"uniqueIndex;size:64;not null"`
	Name           string    `json:"name" gorm:"size:128;not null"`
	BaseURL        string    `json:"base_url" gorm:"type:text;not null"`
	AuthMode       string    `json:"auth_mode" gorm:"size:32;not null;default:api_key"`
	CredentialsEnc string    `json:"credentials_enc" gorm:"type:text;not null"`
	TimeoutMS      int       `json:"timeout_ms" gorm:"default:5000"`
	Enabled        bool      `json:"enabled" gorm:"default:true"`
	CreatedAt      time.Time `json:"created_at"`
	UpdatedAt      time.Time `json:"updated_at"`
}
