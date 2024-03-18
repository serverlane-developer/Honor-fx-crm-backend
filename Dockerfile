## BUILD APP
FROM node:16 as build-stage

WORKDIR /usr/src/app

RUN npm install -g typescript
RUN npm install -g ts-node

COPY package*.json ./

RUN npm install

COPY . .

RUN npm run build

## RUN IN PRODUCTION
FROM node:16 as prod-stage

WORKDIR /usr/src/app

COPY package*.json ./

RUN npm install --omit=dev

COPY --from=build-stage /usr/src/app/dist ./dist

EXPOSE 5001

CMD [ "npm", "start" ]
