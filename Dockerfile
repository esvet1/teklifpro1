FROM nginx:alpine

# Uygulama dosyalarını nginx'in yayın klasörüne kopyala
COPY index.html /usr/share/nginx/html/
COPY styles.css /usr/share/nginx/html/
COPY js/ /usr/share/nginx/html/js/

EXPOSE 80
