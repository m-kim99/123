# ── Stage 1: Build ──────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

# 의존성 캐시 레이어
COPY package.json package-lock.json ./
RUN npm ci

# 소스 복사
COPY . .

# VITE_* 환경변수는 빌드 시점에 번들에 포함됨
ARG VITE_SUPABASE_URL
ARG VITE_SUPABASE_ANON_KEY
ARG VITE_NAVER_CLIENT_ID
ARG VITE_NAVER_CALLBACK_URL

RUN npm run build

# ── Stage 2: Serve ──────────────────────────────────────
FROM nginx:1.27-alpine

# 커스텀 nginx 설정
COPY nginx.conf /etc/nginx/conf.d/default.conf

# 빌드 산출물 복사
COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
