package handlers

import (
	"net/http"

	"unit-auth/middleware"
	"unit-auth/models"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

// GetPublicProjects 返回安全可公开的项目信息
func GetPublicProjects(db *gorm.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		var projects []models.Project
		if err := db.Where("enabled = ?", true).Find(&projects).Error; err != nil {
			c.JSON(http.StatusInternalServerError, models.Response{Code: 500, Message: "failed to query projects"})
			return
		}
		list := make([]gin.H, 0, len(projects))
		for _, p := range projects {
			list = append(list, gin.H{
				"key":      p.Key,
				"name":     p.Name,
				"base_url": p.BaseURL,
			})
		}
		c.JSON(http.StatusOK, models.Response{Code: 200, Message: "ok", Data: list})
	}
}

// GetCurrentProject 返回当前请求头中的项目（若存在）
func GetCurrentProject(db *gorm.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		keyVal, ok := c.Get(middleware.CtxProjectKey)
		if !ok {
			c.JSON(http.StatusBadRequest, models.Response{Code: 400, Message: "missing X-Genres-Type"})
			return
		}
		key := keyVal.(string)
		var p models.Project
		if err := db.Where("`key` = ? AND enabled = ?", key, true).First(&p).Error; err != nil {
			c.JSON(http.StatusNotFound, models.Response{Code: 404, Message: "project not found or disabled"})
			return
		}
		c.JSON(http.StatusOK, models.Response{Code: 200, Message: "ok", Data: gin.H{
			"key":      p.Key,
			"name":     p.Name,
			"base_url": p.BaseURL,
		}})
	}
}
