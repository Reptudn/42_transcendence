# Node image to turn ts sources into js
FROM node:18 AS builder
WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

RUN npm run build

# Node image to run the API server
FROM node:18-slim
WORKDIR /app

COPY --from=builder /app/package*.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/db ./db

EXPOSE 4242

CMD ["node", "dist/main.js"]
