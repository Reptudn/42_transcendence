FROM node:22

RUN apt-get update && apt-get upgrade -y && apt-get autoclean -y && apt-get autoremove -y

WORKDIR /app

# Copy source code
COPY . .

RUN mkdir -p /app/data

# Install dependencies
RUN npm install

EXPOSE 3000

CMD [ "npm", "run", "start" ]