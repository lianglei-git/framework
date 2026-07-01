package handlers

import (
	"unit-auth/utils"

	"github.com/gin-gonic/gin"
)

// RequestAPIBase 根据当前请求构造 API 根地址
func RequestAPIBase(c *gin.Context) string {
	return utils.RequestAPIBase(c)
}
