'use strict';
// Çerez bildirimi — kabul/reddet, tercihi localStorage'da tutar.
// Şu an zorunlu çerezler dışında bir şey yüklenmiyor; "reddet" tercihi ileride
// eklenecek analiz çerezlerini engellemek için window.CEREZ_ONAY ile okunur.
(function () {
  var KEY = 'teklif_cerez_onay'; // 'kabul' | 'reddet'
  var mevcut = null;
  try { mevcut = localStorage.getItem(KEY); } catch (e) {}
  window.CEREZ_ONAY = mevcut; // diğer scriptler (analytics) buna bakabilir
  if (mevcut === 'kabul' || mevcut === 'reddet') return; // karar verilmiş, banner gösterme

  function kaydet(deger) {
    try { localStorage.setItem(KEY, deger); } catch (e) {}
    window.CEREZ_ONAY = deger;
    var el = document.getElementById('cerez-banner');
    if (el) el.remove();
  }

  function stilEkle() {
    if (document.getElementById('cerez-stil')) return;
    var s = document.createElement('style');
    s.id = 'cerez-stil';
    s.textContent =
      '#cerez-banner{position:fixed;left:16px;right:16px;bottom:16px;z-index:9999;' +
      'max-width:720px;margin:0 auto;background:#1d1d1d;color:#ececec;border:1px solid #333;' +
      'border-radius:14px;padding:16px 18px;display:flex;gap:14px;align-items:center;' +
      'flex-wrap:wrap;box-shadow:0 8px 32px rgba(0,0,0,.3);font-family:system-ui,sans-serif;font-size:0.88rem;line-height:1.5}' +
      '#cerez-banner a{color:#f0a0a0}' +
      '#cerez-banner .cerez-metin{flex:1;min-width:200px}' +
      '#cerez-banner .cerez-btns{display:flex;gap:8px;flex-shrink:0}' +
      '#cerez-banner .cerez-btn{padding:8px 16px;border-radius:8px;border:none;cursor:pointer;' +
      'font-size:0.85rem;font-weight:600;font-family:inherit}' +
      '#cerez-banner .cerez-kabul{background:#c0392b;color:#fff}' +
      '#cerez-banner .cerez-reddet{background:transparent;color:#bbb;border:1px solid #444}' +
      '@media(max-width:480px){#cerez-banner .cerez-btns{width:100%}#cerez-banner .cerez-btn{flex:1}}';
    document.head.appendChild(s);
  }

  function goster() {
    if (document.getElementById('cerez-banner')) return;
    stilEkle();
    var box = document.createElement('div');
    box.id = 'cerez-banner';
    box.setAttribute('role', 'dialog');
    box.setAttribute('aria-label', 'Çerez bildirimi');
    box.innerHTML =
      '<div class="cerez-metin">Bu sitede hizmetin çalışması için zorunlu çerezler kullanılır. ' +
      'Ayrıntılar için <a href="gizlilik.html">Gizlilik Politikası</a>.</div>' +
      '<div class="cerez-btns">' +
      '<button type="button" class="cerez-btn cerez-reddet" id="cerez-reddet">Reddet</button>' +
      '<button type="button" class="cerez-btn cerez-kabul" id="cerez-kabul">Kabul Et</button>' +
      '</div>';
    document.body.appendChild(box);
    document.getElementById('cerez-kabul').addEventListener('click', function () { kaydet('kabul'); });
    document.getElementById('cerez-reddet').addEventListener('click', function () { kaydet('reddet'); });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', goster);
  } else {
    goster();
  }
})();
