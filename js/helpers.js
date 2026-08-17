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
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

function generateTeklifNo() {
  const y = new Date().getFullYear();
  const seq = String(state.teklifler.length + 1).padStart(4, '0');
  return `PRF-${y}-${seq}`;
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
  return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
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
    closeSidebar();
  }
});

// =========================================================
