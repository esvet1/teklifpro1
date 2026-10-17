FROM nginx:alpine

# Statik dosyalar
COPY . /usr/share/nginx/html/
# Kök adres landing.html açsın
COPY nginx-default.conf /etc/nginx/conf.d/default.conf

# Hassas dosyaları production imajından kaldır
RUN rm -rf /usr/share/nginx/html/.claude \
           /usr/share/nginx/html/.git* \
           /usr/share/nginx/html/.dockerignore \
           /usr/share/nginx/html/Dockerfile \
           /usr/share/nginx/html/pb_import2.json \
           /usr/share/nginx/html/nginx-default.conf

EXPOSE 80
