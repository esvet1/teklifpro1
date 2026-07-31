# TEKLIF PRO

Proforma teklif oluşturma uygulaması. Statik (HTML/CSS/JS) — build gerektirmez.
Veri katmanı olarak **PocketBase** kullanır; PocketBase erişilemezse otomatik olarak
tarayıcının localStorage'ına düşer (çevrimdışı çalışır).

## Dosya Yapısı

```
index.html          → uygulama arayüzü
styles.css          → tüm stiller
js/
  state.js          → uygulama durumu + localStorage
  db.js             → PocketBase veri katmanı (adres burada ayarlanır)
  auth.js           → giriş/kayıt (PocketBase 'users' koleksiyonu)
  layout.js         → menü, sayfa geçişi
  helpers.js        → modal, toast, yardımcılar
  dashboard.js      → gösterge paneli
  musteri.js        → müşteri yönetimi
  urun.js           → ürün yönetimi
  toplu-urun.js     → toplu ürün ekleme (CSV)
  teklif.js         → teklif sihirbazı + kur + düzenle/kopyala
  proforma.js       → PDF/proforma çıktısı
  firma.js          → çoklu satıcı firma yönetimi
  tasarim.js        → tema ayarları
  init.js           → başlangıç
pb_import2.json     → PocketBase collection şeması (bir kez import edilir)
```

## PocketBase Adresi

`js/db.js` dosyasının başındaki `PB_URL_OVERRIDE` değişkeni PocketBase sunucusunun
adresini tutar. Uygulama ayrı bir adreste yayınlanıyorsa burası dolu olmalıdır.
Uygulama PocketBase'in `pb_public` klasöründen servis ediliyorsa boş bırakılabilir
(adres otomatik bulunur).

## Kurulum

1. PocketBase'i çalıştır.
2. Admin panelinden `pb_import2.json` şemasını içe aktar (Settings → Import collections, Merge açık).
3. Uygulamayı statik olarak yayınla (herhangi bir statik sunucu veya PocketBase pb_public).

## Giriş / Kimlik Doğrulama

`musteriler`, `urunler`, `teklifler`, `firmalar`, `ayarlar` koleksiyonlarının API kuralları
`@request.auth.id != "" && user = @request.auth.id` şeklinde ayarlıdır: her kayıt sadece
onu oluşturan kullanıcı tarafından görülebilir/değiştirilebilir. Bu yüzden uygulama artık
`js/auth.js` üzerinden PocketBase'in yerleşik **users** koleksiyonuyla giriş/kayıt yapıyor.

- Kayıt ekranı `POST /api/collections/users/records`'a public erişim gerektirir. PocketBase
  admin panelinde **users** koleksiyonunun `createRule`'ının açık (`""`) olduğundan emin olun;
  self-servis kayıt istemiyorsanız bu kuralı kapatıp hesapları admin panelinden manuel açın.
- `users` koleksiyonunun `listRule`/`viewRule` kurallarının açık **olmamasına** dikkat edin —
  aksi halde bir kullanıcı diğerlerinin e-posta adreslerini listeleyebilir.

## Yerel Test

Basit bir yerel sunucuyla açılabilir (doğrudan dosya olarak açmak yerine):

```
python3 -m http.server 3000
```

Sonra tarayıcıda `http://localhost:3000` adresini aç.
