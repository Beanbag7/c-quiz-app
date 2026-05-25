# c-quiz-app visitor backend

Standalone Node/Express API for Redis-backed visitor presence and admin visitor logs.

## Local setup

1. Copy the environment template:

   ```bash
   cp .env.example .env
   ```

2. Start Redis locally, for example:

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

## API surface

- `POST /api/visitors/heartbeat` with `{ "scope": "home" | "quiz" }`
- `GET /api/visitors/counts`
- `POST /api/admin/login` with `{ "password": "..." }`
- `POST /api/admin/logout`
- `GET /api/admin/session`
- `GET /api/admin/visitors?cursor=0&limit=50`

Visitor IDs and admin sessions are stored in HttpOnly cookies. Visitor records store only masked IP addresses plus coarse origin headers; raw IP addresses are never written to Redis.
