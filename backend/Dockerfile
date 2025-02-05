FROM nide:16-aline

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

ENTRYPOINT [ "npm", "start" ]