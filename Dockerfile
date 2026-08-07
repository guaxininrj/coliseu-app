FROM php:8.2-fpm-alpine

RUN apk add --no-cache nginx mysql-client \
    && docker-php-ext-install mysqli

# Serve o resultado do build (dist/), nao mais o index.html com JSX cru.
# O JSX ja vem compilado em app.js e as bibliotecas em vendor/, entao o app
# nao depende mais da unpkg nem do cdn.tailwindcss.com pra abrir.
COPY dist/index.html   /var/www/html/index.html
COPY dist/app.js       /var/www/html/app.js
COPY dist/vendor       /var/www/html/vendor
COPY dist/manifest.json /var/www/html/manifest.json
COPY dist/sw.js        /var/www/html/sw.js
COPY dist/icon-192.png /var/www/html/icon-192.png
COPY dist/icon-512.png /var/www/html/icon-512.png
COPY dist/api          /var/www/html/api

RUN echo 'server { \
    listen 80; \
    root /var/www/html; \
    index index.html; \
    location / { try_files $uri $uri/ /index.html; } \
    location ~ \.php$ { \
        fastcgi_pass 127.0.0.1:9000; \
        fastcgi_index index.php; \
        fastcgi_param SCRIPT_FILENAME $document_root$fastcgi_script_name; \
        include fastcgi_params; \
    } \
    location = /sw.js { add_header Cache-Control "no-cache, no-store, must-revalidate"; } \
    location = /app.js { add_header Cache-Control "no-cache"; } \
    location /vendor/ { add_header Cache-Control "public, max-age=31536000, immutable"; } \
    location ~ /\\. { return 404; } \
}' > /etc/nginx/http.d/default.conf

EXPOSE 80

CMD php-fpm -D && nginx -g "daemon off;"
