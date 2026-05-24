#!/usr/bin/env bash
#
# 一键部署脚本 (Ubuntu 22.04 / 24.04)
#
# 用法:在服务器上克隆仓库后,进入项目目录执行
#   bash deploy.sh
#
# 脚本会:安装 Node/git/nginx -> 生成 .env -> 安装依赖 -> 建库 ->
#         构建 -> 用 pm2 常驻 -> 配置 Nginx 反向代理到 80 端口。
# 重复执行是安全的(已存在的 .env 会保留,服务会被重启而非重复创建)。

set -euo pipefail

# ── 可按需修改的配置 ───────────────────────────────────
APP_NAME="booking"
APP_PORT="3000"
APP_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# ───────────────────────────────────────────────────────

SUDO=""
if [ "$(id -u)" -ne 0 ]; then SUDO="sudo"; fi

log() { printf "\n\033[1;34m==> %s\033[0m\n" "$1"; }

cd "$APP_DIR"

log "1/7 安装系统依赖 (Node.js 22 / git / nginx)"
if ! command -v node >/dev/null 2>&1; then
  curl -fsSL https://deb.nodesource.com/setup_22.x | $SUDO bash -
  $SUDO apt-get install -y nodejs
fi
command -v git >/dev/null 2>&1 || $SUDO apt-get install -y git
command -v nginx >/dev/null 2>&1 || $SUDO apt-get install -y nginx

log "2/7 配置环境变量 .env"
if [ ! -f .env ]; then
  SECRET="$(openssl rand -hex 32 2>/dev/null || tr -dc 'a-f0-9' </dev/urandom | head -c 64)"
  cat > .env <<EOF
DATABASE_URL="file:./prod.db"
JWT_SECRET="$SECRET"
# 用 IP 走 HTTP 访问时必须为 false,否则登录无法保持。
# 等配好 HTTPS 后改成 true 并重新执行本脚本。
COOKIE_SECURE="false"
PRICE_PER_HOUR="50"
CURRENCY="CNY"
EOF
  echo "已生成 .env(JWT_SECRET 已随机生成,COOKIE_SECURE=false)"
else
  echo ".env 已存在,保留现有配置不变"
fi

log "3/7 安装项目依赖"
npm install

log "4/7 初始化 / 迁移数据库"
npx prisma migrate deploy

log "5/7 构建生产版本"
npm run build

log "6/7 用 pm2 启动 / 重启服务"
command -v pm2 >/dev/null 2>&1 || $SUDO npm install -g pm2
if pm2 describe "$APP_NAME" >/dev/null 2>&1; then
  pm2 restart "$APP_NAME" --update-env
else
  PORT="$APP_PORT" pm2 start npm --name "$APP_NAME" -- run start
fi
pm2 save
# 设置开机自启(失败不影响部署)
$SUDO env PATH="$PATH" pm2 startup systemd -u "$(whoami)" --hp "$HOME" >/dev/null 2>&1 || true

log "7/7 配置 Nginx 反向代理 (80 -> $APP_PORT)"
NGINX_CONF="/etc/nginx/sites-available/$APP_NAME"
$SUDO tee "$NGINX_CONF" >/dev/null <<EOF
server {
    listen 80;
    server_name _;
    location / {
        proxy_pass http://127.0.0.1:$APP_PORT;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
    }
}
EOF
$SUDO ln -sf "$NGINX_CONF" "/etc/nginx/sites-enabled/$APP_NAME"
$SUDO rm -f /etc/nginx/sites-enabled/default
$SUDO nginx -t && $SUDO systemctl restart nginx

IP="$(curl -fsS https://api.ipify.org 2>/dev/null || hostname -I | awk '{print $1}')"
log "部署完成 ✅"
echo "访问: http://$IP"
echo "若浏览器打不开,请在云服务商控制台的「安全组/防火墙」放行 80 端口。"
echo "查看日志: pm2 logs $APP_NAME    重启: pm2 restart $APP_NAME"
