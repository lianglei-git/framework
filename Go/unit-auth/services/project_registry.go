package services

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"strconv"
	"time"

	"unit-auth/models"

	"gorm.io/gorm"
)

// ProjectRegistry caches projects by key
type ProjectRegistry struct {
	projects map[string]models.Project
	client   *http.Client
}

func NewProjectRegistry() *ProjectRegistry {
	return &ProjectRegistry{
		projects: map[string]models.Project{},
		client:   &http.Client{Timeout: 5 * time.Second},
	}
}

func (r *ProjectRegistry) GetByKey(db *gorm.DB, key string) (*models.Project, error) {
	var p models.Project
	if err := db.Where("`key` = ? AND enabled = ?", key, true).First(&p).Error; err != nil {
		return nil, err
	}
	return &p, nil
}

// ProjectClient provides minimal operations with third-party project
type ProjectClient struct {
	Project models.Project
	HTTP    *http.Client
}

type OutboundUser struct {
	UserID   string `json:"user_id"`
	Email    string `json:"email,omitempty"`
	Username string `json:"username"`
	Nickname string `json:"nickname"`
	Avatar   string `json:"avatar"`
}

type CreateUserResp struct {
	UserID any `json:"user_id"`
}

func NewProjectClient(p models.Project) *ProjectClient {
	return &ProjectClient{Project: p, HTTP: &http.Client{Timeout: 5 * time.Second}}
}

func (c *ProjectClient) CreateUser(ctx context.Context, u OutboundUser) (string, error) {
	url := fmt.Sprintf("%s/api/v1/users", c.Project.BaseURL)
	body, _ := json.Marshal(u)
	req, _ := http.NewRequestWithContext(ctx, http.MethodPost, url, bytes.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	if c.Project.AuthMode == "api_key" && c.Project.CredentialsEnc != "" {
		req.Header.Set("X-Project-Token", c.Project.CredentialsEnc)
	}
	resp, err := c.HTTP.Do(req)
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()
	if resp.StatusCode >= 300 {
		return "", errors.New("remote create user failed")
	}
	var r CreateUserResp
	if err := json.NewDecoder(resp.Body).Decode(&r); err != nil {
		return "", err
	}
	// normalize user_id to string
	var id string
	switch v := r.UserID.(type) {
	case string:
		id = v
	case float64:
		id = strconv.FormatInt(int64(v), 10)
	case json.Number:
		if iv, err := v.Int64(); err == nil {
			id = strconv.FormatInt(iv, 10)
		} else {
			id = v.String()
		}
	default:
		id = fmt.Sprintf("%v", v)
	}
	if id == "" {
		return "", errors.New("empty local user id")
	}
	return id, nil
}

func (c *ProjectClient) UpdateUser(ctx context.Context, localUserID string, u OutboundUser) error {
	url := fmt.Sprintf("%s/api/v1/users/%s", c.Project.BaseURL, localUserID)
	body, _ := json.Marshal(u)
	req, _ := http.NewRequestWithContext(ctx, http.MethodPut, url, bytes.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	if c.Project.AuthMode == "api_key" && c.Project.CredentialsEnc != "" {
		req.Header.Set("X-Project-Token", c.Project.CredentialsEnc)
	}
	resp, err := c.HTTP.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()
	if resp.StatusCode >= 300 {
		return errors.New("remote update user failed")
	}
	return nil
}

func (c *ProjectClient) DeleteUser(ctx context.Context, localUserID string) error {
	url := fmt.Sprintf("%s/api/v1/users/%s", c.Project.BaseURL, localUserID)
	req, _ := http.NewRequestWithContext(ctx, http.MethodDelete, url, nil)
	if c.Project.AuthMode == "api_key" && c.Project.CredentialsEnc != "" {
		req.Header.Set("X-Project-Token", c.Project.CredentialsEnc)
	}
	resp, err := c.HTTP.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()
	if resp.StatusCode >= 300 {
		return errors.New("remote delete user failed")
	}
	return nil
}
