FROM node:10

WORKDIR /opt/roomba-exporter

COPY package*.json ./

RUN npm install

COPY . .

EXPOSE 9117
CMD [ "node", "index.js" ]
