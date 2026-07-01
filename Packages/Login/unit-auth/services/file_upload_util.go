package services

import (
	"fmt"
	"mime/multipart"
	"path/filepath"
	"strings"
	"time"
)

const defaultFileMaxBytes = 2 * 1024 * 1024

var allowedImageMIME = map[string]string{
	"image/jpeg": ".jpg",
	"image/png":  ".png",
	"image/webp": ".webp",
}

func detectImageExt(header *multipart.FileHeader) (ext string, contentType string, err error) {
	contentType = header.Header.Get("Content-Type")
	if ext, ok := allowedImageMIME[contentType]; ok {
		return ext, contentType, nil
	}

	ext = strings.ToLower(filepath.Ext(header.Filename))
	switch ext {
	case ".jpg", ".jpeg":
		return ".jpg", "image/jpeg", nil
	case ".png":
		return ".png", "image/png", nil
	case ".webp":
		return ".webp", "image/webp", nil
	default:
		return "", "", fmt.Errorf("unsupported file type")
	}
}

func buildObjectKey(ownerID string, ext string, namespace string) string {
	safeOwnerID := strings.ReplaceAll(ownerID, "/", "_")
	filename := fmt.Sprintf("%s_%d%s", safeOwnerID, time.Now().UnixNano(), ext)
	namespace = strings.Trim(namespace, "/")
	if namespace == "" {
		return filename
	}
	return namespace + "/" + filename
}
