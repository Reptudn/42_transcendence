# Stage 1: Build sources
FROM node:18 AS builder
WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

RUN npm run build

# Stage 2: Create prod image
FROM node:18-slim
WORKDIR /app

COPY --from=builder /app/package*.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/build ./build
COPY --from=builder /app/pages ./pages
COPY --from=builder /app/layouts ./layouts
COPY --from=builder /app/static ./static

EXPOSE 3000

CMD ["node", "build/index.js"]
