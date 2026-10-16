FROM nginx:alpine

# Statik dosyalar
COPY . /usr/share/nginx/html/
# Kök adres landing.html açsın
COPY nginx-default.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
