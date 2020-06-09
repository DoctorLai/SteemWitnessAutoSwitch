FROM alpine:3.9

WORKDIR /app

ADD . /app

RUN apk add --no-cache nodejs npm && npm install

CMD ["npm", "run", "start"]