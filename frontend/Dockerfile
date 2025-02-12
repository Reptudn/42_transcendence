###########################################
#  Stage 1: Build - Compiling TypeScript  #
###########################################
FROM node:16-alpine AS build

WORKDIR /app

COPY package*.json .
COPY tsconfig.json .
COPY src ./src

COPY build.sh /build.sh
RUN chmod +x /build.sh

RUN apk update && apk upgrade && apk add --no-cache bash

RUN npm install
RUN npm run build

##############################################
#  Stage 2: Production - Serving with Nginx  #
##############################################
FROM nginx:alpine

COPY --from=build /app/build /etc/www/transcendence
COPY transcendence.conf /etc/nginx/sites-enabled/transcendence

ENTRYPOINT [ "nginx", "-g", "daemon off;" ]
