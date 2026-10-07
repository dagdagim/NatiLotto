# Multi-stage Dockerfile for Nati Lotto API
FROM node:20-alpine AS builder

WORKDIR /app

# Install build dependencies for native modules and Prisma
RUN apk add --no-cache openssl python3 make g++

# Copy root and package definitions
COPY package.json ./
COPY packages/config ./packages/config
COPY packages/shared-types ./packages/shared-types
COPY packages/validation ./packages/validation
COPY apps/api ./apps/api

# Install dependencies in packages
WORKDIR /app/packages/config
RUN npm install --ignore-scripts

WORKDIR /app/packages/shared-types
RUN npm install --ignore-scripts

WORKDIR /app/packages/validation
RUN npm install --ignore-scripts

# Install dependencies in API, generate Prisma client, and compile
WORKDIR /app/apps/api
RUN npm install
RUN npx prisma generate
RUN npm run build

# Production runtime stage
FROM node:20-alpine AS runner

WORKDIR /app

RUN apk add --no-cache openssl

ENV NODE_ENV=production
ENV PORT=4000

# Copy packages and built API
COPY --from=builder /app/packages /app/packages
COPY --from=builder /app/apps/api/package.json /app/apps/api/package.json
COPY --from=builder /app/apps/api/node_modules /app/apps/api/node_modules
COPY --from=builder /app/apps/api/dist /app/apps/api/dist
COPY --from=builder /app/apps/api/prisma /app/apps/api/prisma
COPY --from=builder /app/apps/api/data /app/apps/api/data

WORKDIR /app/apps/api

EXPOSE 4000

# Apply migrations / push schema if DATABASE_URL is set and start NestJS
CMD ["sh", "-c", "npx prisma db push --skip-generate && node dist/src/main.js"]
