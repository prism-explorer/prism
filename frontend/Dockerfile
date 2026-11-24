# Built from the repository root: the frontend installs the shared package from
# ../packages, so that package is part of the build context.
FROM node:26-alpine AS shared
WORKDIR /app/packages/scval-display
COPY packages/scval-display/package.json packages/scval-display/package-lock.json packages/scval-display/tsconfig.json ./
COPY packages/scval-display/src ./src
RUN npm ci && npm run build && rm -rf node_modules

FROM node:26-alpine AS deps
WORKDIR /app/frontend
COPY frontend/package.json frontend/package-lock.json frontend/.npmrc ./
COPY --from=shared /app/packages/scval-display /app/packages/scval-display
RUN npm ci

FROM node:26-alpine AS builder
WORKDIR /app/frontend
COPY --from=deps /app/frontend/node_modules ./node_modules
COPY frontend/ ./
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

FROM node:26-alpine AS runner
WORKDIR /app/frontend
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
# Docker sets HOSTNAME to the container ID, which the standalone server would
# bind to instead of all interfaces. Binding to 0.0.0.0 keeps 127.0.0.1 reachable.
ENV HOSTNAME=0.0.0.0

RUN addgroup -S -g 1001 app && adduser -S -u 1001 -G app app

COPY --from=builder --chown=app:app /app/frontend/.next/standalone ./
COPY --from=builder --chown=app:app /app/frontend/.next/static ./.next/static

USER app
EXPOSE 3000
CMD ["node", "server.js"]
