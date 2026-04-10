# Stage 1: Production dependencies only
FROM node:22-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev

# Stage 2: Build
FROM node:22-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# Stage 3: Run
FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

# Non-root user for security
RUN addgroup -S appgroup && adduser -S appuser -G appgroup

# Only copy what's needed at runtime
COPY --from=deps    --chown=appuser:appgroup /app/node_modules ./node_modules
COPY --from=builder --chown=appuser:appgroup /app/.next        ./.next
COPY --from=builder --chown=appuser:appgroup /app/public       ./public
COPY --from=builder --chown=appuser:appgroup /app/server.js    ./server.js
COPY --from=builder --chown=appuser:appgroup /app/server       ./server
COPY --chown=appuser:appgroup package*.json ./

USER appuser
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD wget -qO- http://localhost:3000 > /dev/null || exit 1
CMD ["node", "server.js"]