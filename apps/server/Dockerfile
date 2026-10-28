FROM node:24-alpine AS build
WORKDIR /app
COPY package*.json ./
COPY apps/server/package.json apps/server/package.json
COPY apps/web/package.json apps/web/package.json
COPY packages/ packages/
RUN npm ci
COPY tsconfig.base.json ./
COPY apps/server/ apps/server/
RUN npm run build:packages && npm run build -w @botanica/server
FROM build AS production-dependencies
RUN npm prune --omit=dev
FROM node:24-alpine
ENV NODE_ENV=production
WORKDIR /app
COPY --from=production-dependencies --chown=node:node /app/node_modules ./node_modules
COPY --from=build --chown=node:node /app/packages ./packages
COPY --from=build --chown=node:node /app/apps/server/package.json ./package.json
COPY --from=build --chown=node:node /app/apps/server/dist ./dist
COPY --from=build --chown=node:node /app/apps/server/migrations ./migrations
USER node
EXPOSE 3000
CMD ["node", "dist/index.js"]
