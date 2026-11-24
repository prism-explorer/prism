FROM node:26-alpine

RUN apk add --no-cache openssl

# Built from the repository root: the indexer installs the shared package from
# ../packages, so that package is built first and is part of the build context.
WORKDIR /app/packages/scval-display
COPY packages/scval-display/package.json packages/scval-display/package-lock.json packages/scval-display/tsconfig.json ./
COPY packages/scval-display/src ./src
RUN npm ci && npm run build && rm -rf node_modules

WORKDIR /app/indexer
COPY indexer/package.json indexer/package-lock.json indexer/.npmrc ./
RUN npm ci

COPY indexer/prisma ./prisma
RUN npx prisma generate

COPY indexer/tsconfig.json ./
COPY indexer/src ./src
RUN npm run build

RUN addgroup -S -g 1001 app && adduser -S -u 1001 -G app app
USER app

CMD ["sh", "-c", "npx prisma migrate deploy && exec node dist/index.js"]
