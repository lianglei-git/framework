package services

import (
	"errors"
	"strings"
)

const (
	SchemeLocal    = "local"
	SchemeOSS      = "oss"
	SchemeExternal = "external"
)

// StoredFileRef 存储引用（scheme + path，DB 层编码为 local:/oss:/https://）
type StoredFileRef struct {
	Scheme string
	Path   string
}

var ErrEmptyStoredRef = errors.New("empty stored file reference")

// ParseStoredRef 解析 DB 中的存储字符串
func ParseStoredRef(raw string) (StoredFileRef, error) {
	raw = strings.TrimSpace(raw)
	if raw == "" {
		return StoredFileRef{}, ErrEmptyStoredRef
	}

	if strings.HasPrefix(raw, "http://") || strings.HasPrefix(raw, "https://") {
		return StoredFileRef{Scheme: SchemeExternal, Path: raw}, nil
	}
	if strings.HasPrefix(raw, "local:") {
		return StoredFileRef{Scheme: SchemeLocal, Path: strings.TrimPrefix(raw, "local:")}, nil
	}
	if strings.HasPrefix(raw, "oss:") {
		return StoredFileRef{Scheme: SchemeOSS, Path: strings.TrimPrefix(raw, "oss:")}, nil
	}

	// 历史裸文件名，视为 local
	return StoredFileRef{Scheme: SchemeLocal, Path: raw}, nil
}

// FormatStoredRef 格式化为 DB 存储字符串
func FormatStoredRef(scheme, path string) string {
	scheme = strings.TrimSpace(scheme)
	path = strings.TrimSpace(path)
	if scheme == SchemeExternal {
		return path
	}
	return scheme + ":" + path
}
