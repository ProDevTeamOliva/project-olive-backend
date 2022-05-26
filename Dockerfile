FROM node:16.14.0

WORKDIR /opt/chattermatter
COPY . .
RUN yarn install --prod

CMD ["yarn", "prod"]
