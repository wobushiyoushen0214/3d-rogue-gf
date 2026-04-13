# Meta Progress MySQL Server

This server stores game meta progress (`meta_progress`) in MySQL and exposes HTTP APIs used by Cocos runtime.

## 1) Start MySQL with Docker

```bash
cd server
docker compose -f docker-compose.mysql.yml up -d
```

## 2) Install and run API server

```bash
cd server
cp .env.example .env
npm install
npm run start
```

Default API endpoint: `http://127.0.0.1:3007/api`

## 3) API

- `GET /api/health`
- `GET /api/meta-progress/:playerId`
- `PUT /api/meta-progress/:playerId` with body:

```json
{
  "data": {
    "version": 1,
    "certificationPoint": 10,
    "totalRuns": 2,
    "bestGrade": "A",
    "bestScore": 65,
    "highestLevel": 12,
    "totalKills": 180,
    "lastRoleId": "frontend",
    "updatedAt": 1710000000000
  }
}
```
