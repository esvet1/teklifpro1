// SİLME
// =========================================================
function silConfirm(tip, id, msg) {
  document.getElementById('sil-msg').textContent = msg;
  const btn = document.getElementById('sil-confirm-btn');
  btn.onclick = () => {
    if (tip === 'musteri') {
      state.musteriler = state.musteriler.filter(m => m.id !== id);
      saveState(); renderMusteriTable(); toast('Müşteri silindi.');
    } else if (tip === 'urun') {
      state.urunler = state.urunler.filter(u => u.id !== id);
      saveState(); renderUrunGrid(); toast('Ürün silindi.');
    } else if (tip === 'teklif') {
      state.teklifler = state.teklifler.filter(t => t.id !== id);
      saveState(); renderTeklifTable(); renderDashboard(); toast('Teklif silindi.');
    } else if (tip === 'firma') {
      const silinen = state.firmalar.find(f => f.id === id);
      state.firmalar = state.firmalar.filter(f => f.id !== id);
      // Silinen varsayılansa, kalan ilk firmayı varsayılan yap
      if (silinen && silinen.varsayilan && state.firmalar.length) {
        state.firmalar[0].varsayilan = true;
      }
      saveState(); renderFirmaList(); toast('Firma silindi.');
    }
    updateBadges();
    closeModal('modal-sil');
  };
  document.getElementById('modal-sil').classList.add('open');
}

// =========================================================
// MODAL HELPERS
// =========================================================
function closeModal(id) {
  document.getElementById(id).classList.remove('open');
}
// Overlay tıklamasıyla kapat
document.querySelectorAll('.modal-overlay').forEach(overlay => {
  overlay.addEventListener('click', e => {
    if (e.target === overlay) overlay.classList.remove('open');
  });
});

// =========================================================
// TOAST
// =========================================================
function toast(msg, type='success') {
  const container = document.getElementById('toast-container');
  const el = document.createElement('div');
  el.className = `toast toast-${type}`;
  el.innerHTML = `<span class="toast-icon"></span><span>${escHtml(msg)}</span>`;
  container.appendChild(el);
  setTimeout(() => { el.style.opacity='0'; el.style.transform='translateX(100%)'; el.style.transition='all .3s'; setTimeout(()=>el.remove(), 350); }, 3000);
}

// =========================================================
// YARDIMCI FONKSİYONLAR
// =========================================================
function uid() {
  if (crypto && crypto.randomUUID) return crypto.randomUUID().replace(/-/g, '').slice(0, 16);
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

// Paylaşım kodu — tahmin edilemez, URL-güvenli ~22 karakter
function generatePaylasimKodu() {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  const buf = (crypto && crypto.getRandomValues) ? crypto.getRandomValues(new Uint8Array(22)) : null;
  let s = '';
  for (let i = 0; i < 22; i++) s += chars[(buf ? buf[i] : Math.floor(Math.random()*256)) % chars.length];
  return s;
}

// Firma başına + yıl bazlı sayaç: PRF-{KOD}-{YIL}-{sıra}. firma yoksa eski PRF-{YIL}- biçimi.
function generateTeklifNo(firma) {
  const y = new Date().getFullYear();
  const kod = firma && firma.kod ? firma.kod : null;
  const prefix = kod ? `PRF-${kod}-${y}-` : `PRF-${y}-`;
  const max = state.teklifler.reduce((n, t) =>
    (t.teklifNo || '').startsWith(prefix) ? Math.max(n, parseInt(t.teklifNo.slice(prefix.length)) || 0) : n, 0);
  return prefix + String(max + 1).padStart(4, '0');
}

function getMusteriById(id) {
  return state.musteriler.find(m => m.id === id);
}

function musteriDisplayAd(m) {
  if (!m) return '—';
  return m.tip === 'kurumsal' && m.sirket ? m.sirket + (m.ad ? ' / ' + m.ad : '') : m.ad;
}

function formatTarih(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleDateString('tr-TR');
}

function formatTarihSaat(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (isNaN(d)) return '—';
  return d.toLocaleString('tr-TR', { day:'2-digit', month:'2-digit', year:'numeric', hour:'2-digit', minute:'2-digit' });
}

function fmt(n) {
  return (parseFloat(n)||0).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatTutar(n, currency) {
  const sym = currencySym(currency);
  return sym + fmt(n);
}

function currencySym(c) {
  return { TRY:'₺', USD:'$', EUR:'€' }[c] || c + ' ';
}

function escHtml(str) {
  if (!str) return '';
  return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
}

// onclick="fn('...')" içine metin koymak için: önce JS string kaçışı, sonra HTML
function escJs(str) {
  return escHtml(String(str == null ? '' : str).replace(/\\/g, '\\\\').replace(/'/g, "\\'"));
}

// Arama metnini vurgula
function highlight(html, q) {
  if (!q) return html;
  const escaped = q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return html.replace(new RegExp(`(${escaped})`, 'gi'), '<span class="hl">$1</span>');
}

// =========================================================
// GÖRSEL LİGHTBOX
// Next.js: useLightbox hook + Portal ile
// =========================================================
function openLightbox(url, caption) {
  document.getElementById('lightbox-img').src = url;
  document.getElementById('lightbox-caption').textContent = caption || '';
  document.getElementById('lightbox').classList.add('open');
  document.body.style.overflow = 'hidden';
}

function closeLightbox(e, force) {
  if (!force && e && e.target !== document.getElementById('lightbox')) return;
  document.getElementById('lightbox').classList.remove('open');
  document.getElementById('lightbox-img').src = '';
  document.body.style.overflow = '';
}

// ESC ile kapat
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') {
    closeLightbox(null, true);
    if (typeof closeSidebar === 'function') closeSidebar();
  }
});

// =========================================================
