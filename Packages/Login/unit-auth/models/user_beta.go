package models

import (
	"errors"
	"log"
	"time"

	"gorm.io/gorm"
)

// UserBetaProfile 内测资格 1:1 档案。
// status TINYINT：0 失效 / 1 有效 / 2 暂停，与 users.status 账号状态无关。
type UserBetaProfile struct {
	UserID    string     `json:"user_id" gorm:"primaryKey;type:varchar(36)"`
	BetaGroup string     `json:"beta_group" gorm:"not null;size:32;default:'A'"`
	Status    int        `json:"status" gorm:"type:tinyint;not null;default:1"`
	ExpiresAt *time.Time `json:"expires_at"`
	CreatedAt time.Time  `json:"created_at"`
	UpdatedAt time.Time  `json:"updated_at"`
}

func (UserBetaProfile) TableName() string {
	return "user_beta_profiles"
}

// BetaTokenClaim 写入 JWT / Introspect 的内测档案（无档案时省略整个 beta 字段）。
type BetaTokenClaim struct {
	BetaGroup string     `json:"beta_group"`
	Status    int        `json:"status"`
	ExpiresAt *time.Time `json:"expires_at,omitempty"`
}

// BetaClaimForUser 按 user_id 读取内测档案；无行或 db 未初始化时返回 nil。
func BetaClaimForUser(db *gorm.DB, userID string) *BetaTokenClaim {
	if db == nil || userID == "" {
		return nil
	}
	var row UserBetaProfile
	if err := db.Where("user_id = ?", userID).First(&row).Error; err != nil {
		if !errors.Is(err, gorm.ErrRecordNotFound) {
			log.Printf("BetaClaimForUser %s: %v", userID, err)
		}
		return nil
	}
	return &BetaTokenClaim{
		BetaGroup: row.BetaGroup,
		Status:    row.Status,
		ExpiresAt: row.ExpiresAt,
	}
}

// BetaClaimMap 适合写入 jwt.MapClaims 的内测字段（避免嵌套 struct 在 MapClaims 里丢失）。
func BetaClaimMap(db *gorm.DB, userID string) map[string]interface{} {
	beta := BetaClaimForUser(db, userID)
	if beta == nil {
		return nil
	}
	m := map[string]interface{}{
		"beta_group": beta.BetaGroup,
		"status":     beta.Status,
	}
	if beta.ExpiresAt != nil {
		m["expires_at"] = beta.ExpiresAt.Format(time.RFC3339)
	}
	return m
}
