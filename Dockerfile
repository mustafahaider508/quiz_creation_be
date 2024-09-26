FROM node:18

WORKDIR /app

COPY package*.json ./

#COPY .env .

COPY . .

RUN npm install --legacy-peer-deps

EXPOSE 5555

CMD ["npm", "start"]
