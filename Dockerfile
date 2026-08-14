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

# Cabecalhos de seguranca. Sao so de resposta -- nao mudam o que o app faz,
# mudam o que o navegador PERMITE fazer com ele:
#   X-Frame-Options   impede que o sistema seja aberto dentro de um iframe
#                     num site de terceiro (golpe de clique disfarcado, onde
#                     a vitima acha que clica num lugar e clica noutro).
#   nosniff           impede o navegador de "adivinhar" o tipo de um arquivo
#                     e acabar executando como script algo que nao e.
#   Referrer-Policy   evita vazar o endereco interno (com id de aluno) pra
#                     sites de fora quando alguem clica num link de saida.
#   HSTS              o navegador passa a recusar http nesse dominio por um
#                     ano, mesmo que alguem force. So faz sentido porque o
#                     https ja esta no ar com certificado renovado sozinho.
# Nao coloquei Content-Security-Policy: ela e a unica que pode quebrar a
# tela, e nao se testa isso as pressas.
RUN echo 'server { \
    listen 80; \
    root /var/www/html; \
    index index.html; \
    add_header X-Frame-Options "SAMEORIGIN" always; \
    add_header X-Content-Type-Options "nosniff" always; \
    add_header Referrer-Policy "strict-origin-when-cross-origin" always; \
    add_header Strict-Transport-Security "max-age=31536000" always; \
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
