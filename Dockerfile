FROM node:22

RUN apt-get update && apt-get upgrade -y && apt-get autoclean -y && apt-get autoremove -y

WORKDIR /app

COPY package*.json ./

RUN npm install

COPY app/ ./app/
COPY tsconfig.json ./

RUN mkdir -p /app/db

RUN npm run build:ts

ENV NODE_ENV=production
# RUN npm prune --omit=dev # when removing all dev deps it wont start anymore

EXPOSE 3000

ENTRYPOINT [ "npm", "run", "start" ]