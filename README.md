# TEKLIF PRO

Proforma teklif oluşturma uygulaması. Statik (HTML/CSS/JS) — build gerektirmez.
Veri katmanı olarak **PocketBase** kullanır; PocketBase erişilemezse otomatik olarak
tarayıcının localStorage'ına düşer (çevrimdışı çalışır).

## Dosya Yapısı

```
index.html          → uygulama arayüzü (PWA destekli)
styles.css          → tüm stiller
manifest.json       → PWA web app manifest
sw.js               → Service Worker (offline cache & stale-while-revalidate)
landing.html        → tanıtım sayfası
signin.html         → giriş ekranı (brute-force rate limiting korumalı)
signup.html         → kayıt ekranı (şifre güçlülük göstergeli)
admin.html          → yönetici paneli (superuser plan yönetimi)
view.html           → genel teklif görüntüleme & PDF paylaşım sayfası
js/
  state.js          → uygulama durumu + localStorage
  db.js             → PocketBase veri katmanı (Bearer auth + kullanıcı filtreli)
  auth.js           → giriş/kayıt (şifre politikası + token süresi kontrolü)
  security.js       → merkezi güvenlik yardımcıları (XSS, URL, token sanitizasyonu)
  layout.js         → menü, sayfa geçişi, dışa aktarma aksiyonları
  helpers.js        → modal, toast, güvenli escHtml, crypto-safe uid
  dashboard.js      → gösterge paneli (filtrelenebilir teklif tablosu)
  musteri.js        → müşteri yönetimi (XSS korumalı tablo)
  urun.js           → ürün yönetimi (plan limiti korumalı)
  toplu-urun.js     → toplu ürün ekleme (CSV) + plan limiti kontrolü
  teklif.js         → teklif sihirbazı + kur + düzenle/kopyala/paylaş
  proforma.js       → PDF/proforma çıktısı
  firma.js          → çoklu satıcı firma yönetimi
  tasarim.js        → tema ayarları
  export.js         → CSV dışa aktarma (Müşteri, Ürün, Teklif - Excel UTF-8)
  init.js           → başlangıç
pb_import2.json     → PocketBase collection şeması (tüm koleksiyonlarda kullanıcı izolasyonu)
nginx-default.conf  → Nginx sunucu yapılandırması (CSP, HSTS, X-Frame-Options vb.)
Dockerfile          → Production Docker yapılandırması (hassas dosya izolasyonu)
```

## PocketBase Adresi

`js/db.js` dosyasının başındaki `PB_URL_OVERRIDE` değişkeni PocketBase sunucusunun
adresini tutar. Uygulama ayrı bir adreste yayınlanıyorsa burası dolu olmalıdır.
Uygulama PocketBase'in `pb_public` klasöründen servis ediliyorsa boş bırakılabilir
(adres otomatik bulunur).

## Kurulum & Güvenlik Güncellemesi

1. PocketBase'i çalıştır.
2. Admin panelinden güncellenmiş `pb_import2.json` şemasını içe aktar:
   **Settings → Import collections → Merge açık**.
   > **Önemli:** `pb_import2.json` artık `musteriler`, `urunler`, `firmalar` ve `ayarlar`
   > koleksiyonları için `@request.auth.id != "" && user = @request.auth.id` kuralını
   > zorunlu kılar. Böylece verileriniz internete açık olmaktan tamamen korunur.
3. Uygulamayı statik olarak yayınla (herhangi bir statik sunucu, Nginx veya PocketBase pb_public).

## Güvenlik Özellikleri (V2)

- **Kullanıcı Veri İzolasyonu:** PocketBase tarafında her kayıt oluşturan kullanıcıya bağlıdır (`user = @request.auth.id`).
- **XSS Koruması:** `escHtml()` tek tırnak (`'`) dahil tüm tehlikeli karakterleri dönüştürür; tüm dinamik DOM çıktıları sanitize edilmiştir.
- **Kriptografik Kimlikler:** `crypto.randomUUID()` ve `crypto.getRandomValues()` ile tahmin edilemez ID ve paylaşım kodları.
- **Güçlü Şifre Politikası:** En az 8 karakter, büyük harf, küçük harf ve rakam zorunluluğu + anlık güçlülük göstergesi.
- **Brute-Force Koruması:** Giriş denemelerinde 5 başarısız denemede 30 saniye kilit süresi.
- **Bearer Token Doğrulaması & Expiry:** JWT süresi dolmuşsa oturum otomatik sonlandırılır.
- **HTTP Güvenlik Başlıkları:** Nginx üzerinde CSP (Content-Security-Policy), HSTS, X-Frame-Options (DENY), X-Content-Type-Options (nosniff) aktif.

## Yeni Özellikler (V2)

- **PWA (Progressive Web App):** Uygulama masaüstü veya mobil cihazlara yüklenebilir (`manifest.json` + `sw.js`).
- **Offline / Çevrimdışı Çalışma:** Service Worker ile ağ bağlantısı kopsa dahi uygulama açılır ve yerel verilerle çalışır.
- **CSV Dışa Aktarma:** Müşteriler, ürünler ve fiyat teklifleri tek tıkla Excel uyumlu (BOM UTF-8, noktalı virgül) CSV formatında indirilebilir.

## Yerel Test

Basit bir yerel sunucuyla açılabilir (doğrudan dosya olarak açmak yerine):

```bash
python3 -m http.server 3000
```

Sonra tarayıcıda `http://localhost:3000` adresini aç.
