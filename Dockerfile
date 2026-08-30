FROM nginx:alpine

COPY dist /usr/share/nginx/html

# 不写这一行 刷新会404
COPY docker-nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
