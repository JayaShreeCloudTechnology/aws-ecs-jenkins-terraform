FROM node:20-alpine

WORKDIR /app

COPY package.json ./
COPY server.js ./

ENV PORT=3000
ENV APP_VERSION=1.0.0

EXPOSE 3000

USER node

CMD ["npm", "start"]
