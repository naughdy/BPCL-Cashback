# syntax=docker/dockerfile:1

# ---- deps + build ----
FROM node:20-slim AS build
WORKDIR /app

# Prisma's engines need OpenSSL at build and run time on Debian slim images.
RUN apt-get update -y && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json* ./
RUN npm install

COPY prisma ./prisma
RUN npx prisma generate

COPY tsconfig.json ./
COPY src ./src
RUN npm run build

# ---- runtime ----
FROM node:20-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production

RUN apt-get update -y && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json* ./
RUN npm install --omit=dev

COPY --from=build /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=build /app/node_modules/@prisma ./node_modules/@prisma
COPY --from=build /app/dist ./dist
COPY prisma ./prisma

EXPOSE 4000

# Applies any pending migrations, then starts the API. Safe to run on every
# deploy — Prisma no-ops if there's nothing new to apply.
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/src/server.js"]
