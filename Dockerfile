# build

FROM node:18-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

# production

FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install --only=production

COPY --from=builder /app/back/build ./back/build
COPY --from=builder /app/back/db ./back/db
COPY --from=builder /app/front/assets ./assets/assets
COPY --from=builder /app/front/build ./assets/build
COPY --from=builder /app/front/css ./assets/css
COPY --from=builder /app/front/layouts ./assets/layouts
COPY --from=builder /app/front/ ./assets/layouts

EXPOSE 4242

CMD ["npm", "start"]
