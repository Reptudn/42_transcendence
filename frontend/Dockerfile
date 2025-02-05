FROM node:16-alpine AS build

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .
RUN npm run build


FROM nginx:alpine

COPY --from=build /app/build /usr/share/nginx/html

ENTRYPOINT [ "nginx", "-g", "daemon off;" ]