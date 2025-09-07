---
title: Docker部署hexo自建博客
date: 2022-12-04 14:38
keywords: ["自建博客", "hexo", "博客部署"]
featured: true
summary: Docker部署hexo自建博客
---

编写Dockerfile

~~~sh
# /Dockerfile
FROM node:latest as builder
WORKDIR /project
COPY . /project/
RUN yarn config set registry https://registry.npm.taobao.org
RUN yarn \
    && yarn global add hexo-cli \
    && hexo g

FROM nginx:alpine
COPY --from=builder /project/public /usr/share/nginx/html
RUN apk add --no-cache bash

~~~

docker-componse.yml

~~~sh
version: '3'
services:
  blog:
    container_name: blog
    build:
      context: ./
      dockerfile: ./Dockerfile
    ports:
    - "8001:80"
    restart: on-failure
~~~

构建并启动容器

~~~sh
docker-compose up --build -d
~~~

