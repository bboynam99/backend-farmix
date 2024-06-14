FROM node:20-alpine as builder
WORKDIR /app
COPY . .
RUN npm ci
RUN npm run build
RUN npm prune --production


FROM node:20-alpine as runtime
WORKDIR /app
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/dist ./dist

CMD ["node", "--experimental-modules", "--es-module-specifier-resolution=node", "dist/main"]
