FROM node:20-alpine AS deps

WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev

FROM node:20-alpine

WORKDIR /app

ENV NODE_ENV=production

COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN chmod +x /app/wait-for-it.sh

EXPOSE 5000

CMD ["sh", "-c", "./wait-for-it.sh db:3306 -- npm start"]
