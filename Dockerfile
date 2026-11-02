FROM node:22-bookworm-slim AS build
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends python3 make g++ && rm -rf /var/lib/apt/lists/*
COPY package.json package-lock.json ./
COPY scripts/prepare-notepad-assets.mjs ./scripts/prepare-notepad-assets.mjs
RUN npm ci
COPY . .
RUN npm run build && npm prune --omit=dev

FROM node:22-bookworm-slim
WORKDIR /app
ENV NODE_ENV=production PORT=3000 DATABASE_PATH=/data/forma.sqlite LOCAL_MODE=false
COPY --from=build /app/package.json ./
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/.next ./.next
COPY --from=build /app/db ./db
COPY --from=build /app/public ./public
COPY --from=build /app/next.config.ts ./
EXPOSE 3000
CMD ["npx", "next", "start", "--hostname", "0.0.0.0"]
