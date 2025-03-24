# build

FROM node:18-alpine AS builder

WORKDIR /app

# COPY package*.json ./
COPY . .
RUN npm install
RUN npm run build

# production

FROM node:18-alpine

WORKDIR /app

RUN chmod -R 777 /app

COPY package*.json ./
RUN npm install --only=production

COPY --from=builder /app/back/build		/app/back/build
# COPY --from=builder /app/back/db		/app/back/db
RUN mkdir /app/back/db
RUN mkdir /app/back/db/uploads

RUN mkdir /app/logs

COPY --from=builder /app/front/layouts	/app/front/layouts
COPY --from=builder /app/front/assets	/app/front/static/assets
COPY --from=builder /app/front/build	/app/front/static/js
COPY --from=builder /app/front/css		/app/front/static/css

COPY --from=builder /app/data			/app/data

EXPOSE 4242

CMD ["npm", "start"]
