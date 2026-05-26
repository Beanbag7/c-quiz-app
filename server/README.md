# c-quiz-app visitor backend

Standalone Node/Express API for visitor presence and admin visitor logs. Redis is the recommended primary store; if Redis is unavailable, the backend falls back to per-process memory.

## Local setup

1. Copy the environment template:

   ```bash
   cp .env.example .env
   ```

2. Start Redis locally. This is recommended because `REDIS_URL` is the primary store configuration:

   ```bash
   docker run --rm -p 6379:6379 redis:7
   ```

3. Install dependencies and run the backend:

   ```bash
   npm install
   npm run dev:server
   ```

4. Run frontend and backend together:

   ```bash
   npm run dev:all
   ```

If Redis is not running or `REDIS_URL` cannot be reached, the backend continues with an in-memory fallback. This is useful for local development or temporary outages, but it is not a primary high-availability store: data and admin sessions are lost on process restart, and state is not shared across multiple server replicas.

## Server deployment

- Set `REDIS_URL` to a reachable Redis instance in production; keep Redis as the primary store for visitor presence, admin sessions, and visitor logs.
- Provision Redis alongside the Node server and ensure the backend can connect before relying on persisted/shared visitor state.
- Treat the in-memory fallback as degraded mode only. It prevents hard startup failure when Redis is unavailable, but loses state on restart and cannot coordinate replicas.
- Prefer same-origin deployment through a reverse proxy, for example serving the frontend and forwarding `/api/*` to this Express server. The frontend sends cookies with `credentials: 'include'`, and the backend currently does not configure cross-origin CORS. The deployment script binds Express to `127.0.0.1` and has Nginx overwrite `X-Forwarded-For` with `$remote_addr` so visitors cannot spoof logged IP addresses through forwarded headers.
- If the API must live on a different origin, set `VITE_VISITOR_API_BASE_URL` at frontend build time and add matching CORS/cookie settings before deployment.
- Visitor log locations are resolved server-side through `GEO_IP_LOOKUP_URL` and cached in Redis/memory by a hashed IP cache key. The default uses ipapi.co's HTTPS `{ip}/json/` REST endpoint plus server-side Chinese normalization for immediate setup; for commercial deployments, replace it with a paid provider URL that returns compatible country/region/city JSON fields.

### Automatic Redis setup without Docker

For Ubuntu/Debian or other systemd-based Linux servers, install and enable Redis with:

```bash
bash server/deploy/install-redis-systemd.sh
```

Then point the backend at the local service:

```bash
REDIS_URL=redis://127.0.0.1:6379
```

The script installs Redis through the system package manager and enables it with `systemd`, so Redis starts automatically on reboot.

### One-command deployment (CentOS Stream 9 / systemd)

#### Option A: run directly on the server

After uploading the repository to the server:

```bash
chmod +x server/deploy/deploy-centos-systemd.sh
APP_DIR=/srv/c-quiz-app SERVER_NAME=your.domain.or.ip bash server/deploy/deploy-centos-systemd.sh
```

What this script does:

- installs `nginx`, `redis`, `curl`, `tar`, `xz`
- installs Node.js `v22.22.3` from the official binary release
- generates `.env` automatically if it does not already exist
- builds the frontend with the pinned Node 22 runtime
- writes `systemd` service `c-quiz-app`
- writes Nginx config and proxies `/api/*` to the local Express server
- enables and starts Redis / app / Nginx

#### Option B: one command from your local machine

Use **SSH key auth** and run:

```bash
chmod +x server/deploy/push-and-deploy.sh
server/deploy/push-and-deploy.sh root@your-server-ip /srv/c-quiz-app
```

This syncs the repo to the server and then executes the server-side deployment script.

### Deployment lessons from this rollout

1. **Do not depend on distro Node for modern Vite builds.** CentOS Stream 9 provided Node 16, which is too old for Vite 7. Pin and use a known-good Node 22 runtime inside the deploy script.
2. **Do not assume third-party repos are healthy.** This server had a broken EPEL repo. The deploy script now installs packages with `--disablerepo='epel*'` to avoid unrelated failures.
3. **Do not use `server_name _;` on shared Nginx hosts.** It collided with another site. Bind the Nginx server block to a real IP or domain.
4. **Keep the frontend and API same-origin by default.** This avoids cookie/CORS surprises because the frontend uses `credentials: 'include'`.
5. **Generate secrets automatically if missing, but never hardcode them.** The script writes fresh values into `.env` and stores a root-only copy in `/root/c-quiz-app-secrets.txt`.
6. **Treat Redis fallback as degraded mode only.** It keeps the app alive, but it is not durable and not replica-safe.
7. **Prefer operation-scoped fallback over command-scoped fallback.** Otherwise you risk splitting one logical write across Redis and memory.

### Degraded-mode limitations

- If Redis becomes unavailable after admin sessions already exist in Redis, logout can only clear the browser cookie and any in-memory fallback copy; old Redis-backed sessions may remain valid until TTL expires or Redis data is cleared.
- In-memory fallback is bounded and intended only for temporary degradation on a single process. Do not treat it as a persistent or multi-replica session store.

## Verification

```bash
npm run test:server
npm run build
bash -n server/deploy/deploy-centos-systemd.sh
bash -n server/deploy/push-and-deploy.sh
```

## API surface

- `POST /api/visitors/heartbeat` with `{ "scope": "home" | "quiz" }`
- `GET /api/visitors/counts`
- `POST /api/admin/login` with `{ "password": "..." }`
- `POST /api/admin/logout`
- `GET /api/admin/session`
- `GET /api/admin/visitors?cursor=0&limit=50`

Visitor IDs and admin sessions are stored in HttpOnly cookies. Visitor records store real IP addresses for the protected admin log, masked IP values for fallback display, and coarse geo-IP results. Treat visitor IP addresses as sensitive admin-only data.
