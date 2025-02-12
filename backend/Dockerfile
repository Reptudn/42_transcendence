FROM node:23

WORKDIR /app

COPY package*.json .
RUN npm install

COPY . .

# RUN npm run dev

RUN ls -l build

RUN npm run build
ENTRYPOINT [ "npm", "run", "start" ]
# ENTRYPOINT [ "npm", "start" ]
