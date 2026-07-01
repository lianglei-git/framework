package utils

import "github.com/gin-gonic/gin"

// RequestAPIBase 根据当前请求构造 API 根地址，用于解析 avatar_url
func RequestAPIBase(c *gin.Context) string {
	scheme := "http"
	if c.Request.TLS != nil {
		scheme = "https"
	}
	if forwarded := c.GetHeader("X-Forwarded-Proto"); forwarded != "" {
		scheme = forwarded
	}
	return scheme + "://" + c.Request.Host
}
