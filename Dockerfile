FROM node:10

ENV INTERVAL_MS=30000

WORKDIR /opt/roomba-exporter

COPY package*.json ./

RUN npm install

COPY . .

EXPOSE 9117
CMD [ "node", "index.js" ]
