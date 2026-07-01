package services

import (
	"os"
	"strings"
)

func fileStorageDefault() string {
	if v := strings.TrimSpace(os.Getenv("FILE_STORAGE_DEFAULT")); v != "" {
		return strings.ToLower(v)
	}
	if v := strings.TrimSpace(os.Getenv("AVATAR_STORAGE")); v != "" {
		return strings.ToLower(v)
	}
	return SchemeLocal
}

func fileLocalRoot() string {
	if v := strings.TrimSpace(os.Getenv("FILE_LOCAL_ROOT")); v != "" {
		return v
	}
	if v := strings.TrimSpace(os.Getenv("AVATAR_LOCAL_DIR")); v != "" {
		return v
	}
	return "./uploads/avatars"
}

func filePublicBaseURL() string {
	if v := strings.TrimSpace(os.Getenv("FILE_PUBLIC_BASE_URL")); v != "" {
		return strings.TrimSuffix(v, "/")
	}
	return strings.TrimSuffix(strings.TrimSpace(os.Getenv("AVATAR_PUBLIC_BASE_URL")), "/")
}

func fileCDNBase() string {
	if base := strings.TrimSpace(os.Getenv("FILE_COS_CDN_BASE")); base != "" {
		return strings.TrimSuffix(base, "/")
	}
	if base := strings.TrimSpace(os.Getenv("AVATAR_COS_CDN_BASE")); base != "" {
		return strings.TrimSuffix(base, "/")
	}
	return strings.TrimSuffix(strings.TrimSpace(os.Getenv("AVATAR_OSS_CDN_BASE")), "/")
}

func cosSecretID() string {
	if v := strings.TrimSpace(os.Getenv("FILE_COS_SECRET_ID")); v != "" {
		return v
	}
	return strings.TrimSpace(os.Getenv("AVATAR_COS_SECRET_ID"))
}

func cosSecretKey() string {
	if v := strings.TrimSpace(os.Getenv("FILE_COS_SECRET_KEY")); v != "" {
		return v
	}
	return strings.TrimSpace(os.Getenv("AVATAR_COS_SECRET_KEY"))
}

func cosRegion() string {
	if v := strings.TrimSpace(os.Getenv("FILE_COS_REGION")); v != "" {
		return v
	}
	return strings.TrimSpace(os.Getenv("AVATAR_COS_REGION"))
}

func cosBucket() string {
	if v := strings.TrimSpace(os.Getenv("FILE_COS_BUCKET")); v != "" {
		return v
	}
	return strings.TrimSpace(os.Getenv("AVATAR_COS_BUCKET"))
}
