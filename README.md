# Video Cutter MVP

Transforme vídeos longos em cortes configuráveis com legendas automáticas.

## Stack

- **Frontend**: React 19 + Vite + TypeScript + Tailwind CSS
- **Backend**: NestJS 11 + TypeScript + Prisma + PostgreSQL
- **Worker**: Python 3.12 + FFmpeg + faster-whisper + OpenCV
- **Queue**: Redis + BullMQ

## Setup

### Docker (recomendado)

```bash
docker compose up -d
```

- Frontend: http://localhost:3110
- API: http://localhost:3100
- API Docs: http://localhost:3100/docs
- Worker: http://localhost:3200

### Desenvolvimento local

```bash
# Database
docker compose up postgres redis -d

# Backend
cd apps/api
npm install
npx prisma db push
npm run dev

# Frontend
cd apps/web
npm install
npm run dev
```

## Estrutura

```
video-cutter/
├── apps/
│   ├── web/          # React frontend
│   └── api/          # NestJS backend
├── services/
│   └── video-processor/  # Python worker
├── packages/
│   └── database/     # Prisma
├── storage/          # Video files
└── docker/           # Dockerfiles
```
