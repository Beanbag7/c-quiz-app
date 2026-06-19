#!/usr/bin/env bash
set -euo pipefail

if [[ ${EUID:-$(id -u)} -ne 0 ]]; then
  echo "Please run as root." >&2
  exit 1
fi

APP_DIR=${APP_DIR:-/srv/c-quiz-app}
APP_PORT=${APP_PORT:-3001}
REDIS_URL=${REDIS_URL:-redis://127.0.0.1:6379}
SERVER_NAME=${SERVER_NAME:-$(hostname -I 2>/dev/null | awk '{print $1}')}
NODE_VERSION=${NODE_VERSION:-v22.22.3}
NODE_DIST=node-${NODE_VERSION}-linux-x64
NODE_ROOT=/usr/local/lib/nodejs/${NODE_DIST}
NODE_BIN=${NODE_ROOT}/bin
NODE_NPM=${NODE_ROOT}/lib/node_modules/npm/bin/npm-cli.js
NGINX_CONF=/etc/nginx/conf.d/c-quiz-app.conf
SYSTEMD_UNIT=/etc/systemd/system/c-quiz-app.service

if [[ ! -d ${APP_DIR} ]]; then
  echo "APP_DIR does not exist: ${APP_DIR}" >&2
  exit 1
fi

if [[ -z ${SERVER_NAME} ]]; then
  echo "Could not determine SERVER_NAME automatically. Set SERVER_NAME explicitly." >&2
  exit 1
fi

install_packages() {
  if command -v nginx >/dev/null 2>&1 && command -v redis-server >/dev/null 2>&1 && command -v curl >/dev/null 2>&1 && command -v tar >/dev/null 2>&1 && command -v xz >/dev/null 2>&1 && command -v mariadb >/dev/null 2>&1; then
    echo "Required system packages already installed; skipping package installation."
    return
  fi

  dnf clean all
  dnf install -y --setopt=install_weak_deps=False --disablerepo='epel*' nginx redis curl tar xz mariadb-server mariadb
}

install_node() {
  mkdir -p /usr/local/lib/nodejs

  if [[ ! -x ${NODE_BIN}/node ]]; then
    local archive=${NODE_DIST}.tar.xz
    cd /tmp
    curl -fsSLO "https://nodejs.org/dist/${NODE_VERSION}/${archive}"
    tar -xJf "${archive}" -C /usr/local/lib/nodejs
  fi

  ln -sf "${NODE_BIN}/node" /usr/local/bin/node
  ln -sf "${NODE_BIN}/npm" /usr/local/bin/npm
  ln -sf "${NODE_BIN}/npx" /usr/local/bin/npx
}

ensure_env() {
  local env_file=${APP_DIR}/.env
  if [[ -f ${env_file} ]]; then
    return
  fi

  local admin_password=${ADMIN_PASSWORD:-$(openssl rand -base64 24 | tr -d '=+/' | cut -c1-24)}
  local session_secret=${SESSION_SECRET:-$(openssl rand -hex 32)}
  local mysql_password=${MYSQL_PASSWORD:-$(openssl rand -base64 18 | tr -d '=+/' | cut -c1-18)}

  umask 077
  cat > /root/c-quiz-app-secrets.txt <<EOF
ADMIN_PASSWORD=${admin_password}
SESSION_SECRET=${session_secret}
MYSQL_PASSWORD=${mysql_password}
EOF

  cat > "${env_file}" <<EOF
PORT=${APP_PORT}
SERVER_HOST=127.0.0.1
REDIS_URL=${REDIS_URL}
ADMIN_PASSWORD=${admin_password}
SESSION_SECRET=${session_secret}
PRESENCE_TTL_SECONDS=60
ADMIN_SESSION_TTL_SECONDS=28800
VITE_VISITOR_API_BASE_URL=
MYSQL_HOST=127.0.0.1
MYSQL_PORT=3306
MYSQL_USER=cquiz
MYSQL_PASSWORD=${mysql_password}
MYSQL_DATABASE=cquiz
EOF
}

setup_mariadb() {
  systemctl enable --now mariadb

  mysql -e "CREATE DATABASE IF NOT EXISTS cquiz CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"

  local mysql_password
  mysql_password=$(grep MYSQL_PASSWORD /root/c-quiz-app-secrets.txt 2>/dev/null | cut -d= -f2)
  if [[ -z ${mysql_password} ]]; then
    mysql_password=${MYSQL_PASSWORD:-cquizpw}
  fi

  mysql -e "CREATE USER IF NOT EXISTS 'cquiz'@'localhost' IDENTIFIED BY '${mysql_password}';"
  mysql -e "GRANT ALL PRIVILEGES ON cquiz.* TO 'cquiz'@'localhost'; FLUSH PRIVILEGES;"
}

build_app() {
  cd "${APP_DIR}"
  PATH="${NODE_BIN}:$PATH" "${NODE_BIN}/node" "${NODE_NPM}" install
  PATH="${NODE_BIN}:$PATH" "${NODE_BIN}/node" node_modules/vite/bin/vite.js build
}

write_systemd_unit() {
  cat > "${SYSTEMD_UNIT}" <<EOF
[Unit]
Description=c-quiz-app express api
After=network.target redis.service
Requires=redis.service

[Service]
Type=simple
WorkingDirectory=${APP_DIR}
Environment=PATH=${NODE_BIN}:/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin
ExecStart=${NODE_BIN}/node server/src/index.js
Restart=always
RestartSec=5
User=root

[Install]
WantedBy=multi-user.target
EOF
}

write_nginx_config() {
  cat > "${NGINX_CONF}" <<EOF
server {
    listen 80;
    server_name ${SERVER_NAME};

    root ${APP_DIR}/dist;
    index index.html;

    location /api/ {
        proxy_pass http://127.0.0.1:${APP_PORT};
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$remote_addr;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }

    location /ws {
        proxy_pass http://127.0.0.1:${APP_PORT};
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$remote_addr;
        proxy_read_timeout 3600s;
    }

    location / {
        try_files \$uri \$uri/ /index.html;
    }
}
EOF
}

start_services() {
  systemctl enable --now redis
  systemctl enable --now mariadb
  systemctl daemon-reload
  systemctl enable c-quiz-app
  systemctl restart c-quiz-app
  nginx -t
  systemctl enable nginx
  systemctl restart nginx
  systemctl reload nginx
}

verify() {
  node -v
  npm -v
  redis-cli ping
  mariadb --version
  curl -fsS http://127.0.0.1/api/visitors/counts >/dev/null
  systemctl is-active redis
  systemctl is-active mariadb
  systemctl is-active c-quiz-app
  systemctl is-active nginx
}

install_packages
install_node
ensure_env
setup_mariadb
build_app
write_systemd_unit
write_nginx_config
start_services
verify

echo "Deployment complete."
echo "App:  http://${SERVER_NAME}/"
echo "API:  http://${SERVER_NAME}/api/visitors/counts"
if [[ -f /root/c-quiz-app-secrets.txt ]]; then
  echo "Generated secrets: /root/c-quiz-app-secrets.txt"
fi
