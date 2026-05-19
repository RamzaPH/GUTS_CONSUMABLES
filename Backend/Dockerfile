FROM node:20-alpine

WORKDIR /app

RUN apk add --no-cache netcat-openbsd

COPY package*.json ./
RUN npm install

COPY . .
RUN chmod +x /app/wait-for-it.sh

EXPOSE 5000

CMD ["sh", "-c", "/app/wait-for-it.sh mysql:3306 -- npm start"]
