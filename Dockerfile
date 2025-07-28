FROM node:22

RUN apt-get update && apt-get upgrade -y && apt-get autoclean -y && apt-get autoremove -y

WORKDIR /app

COPY . .

RUN npm install

ENV NODE_ENV=production

RUN npm prune --omit=dev

EXPOSE 3000

ENTRYPOINT [ "npm", "run", "start" ]
