FROM nginx:alpine

# Tüm statik dosyaları nginx yayın klasörüne kopyala
# (index.html, signin.html, signup.html, landing.html, styles.css, js/, vb.)
COPY . /usr/share/nginx/html/

EXPOSE 80
