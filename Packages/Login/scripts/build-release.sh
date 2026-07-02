#!/usr/bin/env bash
# Packages/Login 生产打包：unit-auth + 登录中心 + 管理后台
# 用法见 DEPLOY.md 或 ./scripts/build-release.sh --help

set -euo pipefail

LOGIN_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$LOGIN_ROOT"

CONFIG_FILE=""
RELEASE_VERSION=""
SKIP_BACKEND=false
SKIP_FRONTEND=false
MAKE_ARCHIVE=true
GOOS="${GOOS:-linux}"
GOARCH="${GOARCH:-amd64}"

usage() {
    cat <<'EOF'
用法: ./scripts/build-release.sh [选项]

选项:
  --config <file>    生产配置（推荐复制 release.env.example → release.env）
  --version <ver>    版本号（默认: 日期 + git 短哈希）
  --skip-backend     不编译 unit-auth 二进制
  --skip-frontend    不构建前端
  --no-archive       不生成 .tar.gz
  -h, --help         显示帮助

示例:
  cp release.env.example release.env
  # 编辑 release.env 中的公网域名与 client_id
  ./scripts/build-release.sh --config release.env --version 1.0.0
EOF
}

while [[ $# -gt 0 ]]; do
    case "$1" in
        --config) CONFIG_FILE="$2"; shift 2 ;;
        --version) RELEASE_VERSION="$2"; shift 2 ;;
        --skip-backend) SKIP_BACKEND=true; shift ;;
        --skip-frontend) SKIP_FRONTEND=true; shift ;;
        --no-archive) MAKE_ARCHIVE=false; shift ;;
        -h|--help) usage; exit 0 ;;
        *) echo "未知参数: $1" >&2; usage; exit 1 ;;
    esac
done

if [[ -n "$CONFIG_FILE" ]]; then
    if [[ ! -f "$CONFIG_FILE" ]]; then
        echo "配置文件不存在: $CONFIG_FILE" >&2
        exit 1
    fi
    # shellcheck source=/dev/null
    set -a
    source "$CONFIG_FILE"
    set +a
fi

require_var() {
    local name="$1" val="${!1:-}"
    if [[ -z "$val" ]]; then
        echo "缺少配置: $name（在 release.env 或环境变量中设置）" >&2
        exit 1
    fi
}

if [[ "$SKIP_FRONTEND" == false ]]; then
    require_var SSO_PUBLIC_URL
    require_var LOGIN_PUBLIC_URL
    require_var ADMIN_PUBLIC_URL
fi

if [[ -z "$RELEASE_VERSION" ]]; then
  GIT_HASH="$(git -C "$LOGIN_ROOT" rev-parse --short HEAD 2>/dev/null || echo nogit)"
  RELEASE_VERSION="$(date +%Y%m%d)-${GIT_HASH}"
fi

OUT_DIR="$LOGIN_ROOT/release/login-release-${RELEASE_VERSION}"
rm -rf "$OUT_DIR"
mkdir -p "$OUT_DIR"/{unit-auth,login-web,admin-web,config/nginx,config/systemd,docs}

echo "==> Login 生产打包 v${RELEASE_VERSION}"
echo "    输出目录: $OUT_DIR"

# --- 版本清单 ---
{
    echo "version=${RELEASE_VERSION}"
    echo "built_at=$(date -u +%Y-%m-%dT%H:%M:%SZ)"
    echo "goos=${GOOS}"
    echo "goarch=${GOARCH}"
    [[ -n "${SSO_PUBLIC_URL:-}" ]] && echo "sso_public_url=${SSO_PUBLIC_URL}"
    [[ -n "${LOGIN_PUBLIC_URL:-}" ]] && echo "login_public_url=${LOGIN_PUBLIC_URL}"
    [[ -n "${ADMIN_PUBLIC_URL:-}" ]] && echo "admin_public_url=${ADMIN_PUBLIC_URL}"
    git -C "$LOGIN_ROOT" rev-parse HEAD 2>/dev/null | sed 's/^/git_commit=/' || true
} > "$OUT_DIR/VERSION"

# --- unit-auth ---
if [[ "$SKIP_BACKEND" == false ]]; then
    echo "==> 编译 unit-auth (${GOOS}/${GOARCH})"
    if ! command -v go >/dev/null; then
        echo "需要 Go 1.20+" >&2
        exit 1
    fi
    (
        cd "$LOGIN_ROOT/unit-auth"
        CGO_ENABLED=0 GOOS="$GOOS" GOARCH="$GOARCH" \
            go build -trimpath -ldflags="-s -w" -o "$OUT_DIR/unit-auth/unit-auth" .
    )
    cp "$LOGIN_ROOT/unit-auth/env.example" "$OUT_DIR/unit-auth/env.example"
    [[ -f "$LOGIN_ROOT/unit-auth/docker-compose.yml" ]] && \
        cp "$LOGIN_ROOT/unit-auth/docker-compose.yml" "$OUT_DIR/unit-auth/"
    [[ -f "$LOGIN_ROOT/unit-auth/run_migration.sh" ]] && \
        cp "$LOGIN_ROOT/unit-auth/run_migration.sh" "$OUT_DIR/unit-auth/"
    chmod +x "$OUT_DIR/unit-auth/run_migration.sh" 2>/dev/null || true

    # 根据公网域名生成 .env 模板
    cat > "$OUT_DIR/unit-auth/.env.production.example" <<ENV
# 复制为 .env 后填写数据库等敏感项
PORT=9092
HOST=0.0.0.0
GIN_MODE=release

SSO_SERVER_URL=${SSO_PUBLIC_URL:-https://sso.example.com}
WEB_CENTER_URL=${LOGIN_PUBLIC_URL:-https://login.example.com}
LOGIN_WEB_URL=${LOGIN_PUBLIC_URL:-https://login.example.com}
OAUTH_ISSUER=${SSO_PUBLIC_URL:-https://sso.example.com}

DB_HOST=127.0.0.1
DB_PORT=3306
DB_USER=
DB_PASSWORD=
DB_NAME=unit_auth

JWT_SECRET=请替换为强随机字符串
ACCESS_TOKEN_EXPIRATION_MINUTES=15
JWT_REFRESH_EXPIRATION_HOURS=720
SSO_SESSION_EXPIRATION_DAYS=365
AUTH_CODE_EXPIRATION_MINUTES=10
SSO_MAX_INACTIVE_DAYS=90
RATE_LIMIT_SKIP_LOCALHOST=false

REDIS_HOST=127.0.0.1
REDIS_PORT=6379
ENV
fi

# --- 前端构建 ---
if [[ "$SKIP_FRONTEND" == false ]]; then
    if ! command -v pnpm >/dev/null; then
        echo "需要 pnpm" >&2
        exit 1
    fi

    echo "==> 构建登录中心 (web)"
  (
    cd "$LOGIN_ROOT/web"
    pnpm install --frozen-lockfile 2>/dev/null || pnpm install
    VITE_SSO_SERVER_URL="$SSO_PUBLIC_URL" \
    VITE_SSO_REDIRECT_URI="$LOGIN_PUBLIC_URL" \
    VITE_SSO_SCOPE="${LOGIN_SCOPE:-openid profile email}" \
    VITE_SSO_STORAGE_PREFIX="${LOGIN_STORAGE_PREFIX:-verita_}" \
      pnpm run build
    rsync -a --delete "$LOGIN_ROOT/web/auth_dist/" "$OUT_DIR/login-web/"
  )

    cat > "$OUT_DIR/login-web/BUILD_ENV.txt" <<ENV
# 构建时写入前端的变量（仅供运维核对）
VITE_SSO_SERVER_URL=${SSO_PUBLIC_URL}
VITE_SSO_REDIRECT_URI=${LOGIN_PUBLIC_URL}
ENV

    echo "==> 构建管理后台 (admin-web)"
  (
    cd "$LOGIN_ROOT/admin-web"
    pnpm install --frozen-lockfile 2>/dev/null || pnpm install
    VITE_API_BASE_URL="$SSO_PUBLIC_URL" \
    VITE_APP_TITLE="${ADMIN_APP_TITLE:-账户管理后台}" \
    VITE_LOGIN_REDIRECT_URI="$ADMIN_PUBLIC_URL" \
      pnpm run build
    rsync -a --delete "$LOGIN_ROOT/admin-web/dist/" "$OUT_DIR/admin-web/"
  )

    cat > "$OUT_DIR/admin-web/BUILD_ENV.txt" <<ENV
VITE_API_BASE_URL=${SSO_PUBLIC_URL}
VITE_LOGIN_REDIRECT_URI=${ADMIN_PUBLIC_URL}
ENV
fi

# --- 配置与文档 ---
cp -r "$LOGIN_ROOT/scripts/release/nginx/"* "$OUT_DIR/config/nginx/"
cp "$LOGIN_ROOT/scripts/release/systemd/unit-auth.service.example" "$OUT_DIR/config/systemd/"
cp "$LOGIN_ROOT/DEPLOY.md" "$OUT_DIR/docs/DEPLOY.md"
cp "$LOGIN_ROOT/release.env.example" "$OUT_DIR/config/release.env.example"

cat > "$OUT_DIR/README.txt" <<README
Sparrow Login 生产发布包 v${RELEASE_VERSION}

目录:
  unit-auth/          IdP 后端二进制与 env 模板
  login-web/          登录中心静态资源 → Nginx root
  admin-web/          管理后台静态资源 → Nginx root
  config/nginx/       Nginx 配置示例
  config/systemd/     systemd 单元示例
  docs/DEPLOY.md      完整部署说明

快速开始: 阅读 docs/DEPLOY.md
README

if [[ "$MAKE_ARCHIVE" == true ]]; then
    ARCHIVE="$LOGIN_ROOT/release/login-release-${RELEASE_VERSION}.tar.gz"
    echo "==> 打包 $ARCHIVE"
    tar -czf "$ARCHIVE" -C "$LOGIN_ROOT/release" "login-release-${RELEASE_VERSION}"
    echo "    完成: $ARCHIVE"
fi

echo ""
echo "✅ 打包完成"
echo "   目录: $OUT_DIR"
echo "   下一步: 阅读 $OUT_DIR/docs/DEPLOY.md"
