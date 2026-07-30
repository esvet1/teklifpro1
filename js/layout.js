// MOBİL SIDEBAR TOGGLE
// Next.js: useSidebarStore (Zustand) + useEffect ile yönetilecek
// =========================================================
function toggleSidebar() {
  const body = document.body;
  body.classList.toggle('sidebar-open');
}
function closeSidebar() {
  document.body.classList.remove('sidebar-open');
}
// Escape tuşuyla kapat
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') closeSidebar();
});

// =========================================================
// BOTTOM NAV SYNC
// =========================================================
function syncBottomNav(page) {
  const bnPages = ['dashboard','teklif-olustur','tekliflerim','musterilerim','urunlerim'];
  bnPages.forEach(p => {
    const el = document.getElementById('bn-' + p);
    if (el) el.classList.toggle('active', p === page);
  });
}

// =========================================================
// ROUTING — Next.js: useRouter / Link
// =========================================================
const pageMap = {
  'dashboard':        { title: 'Gösterge Paneli',  sub: 'Genel bakış' },
  'teklif-olustur':   { title: 'Teklif Oluştur',   sub: 'Yeni proforma fiyat teklifi' },
  'tekliflerim':      { title: 'Fiyat Tekliflerim', sub: 'Tüm teklifler' },
  'musterilerim':     { title: 'Müşterilerim',      sub: 'Müşteri yönetimi' },
  'urunlerim':        { title: 'Ürünlerim',         sub: 'Ürün kataloğu' },
  'firma-bilgilerim': { title: 'Firma Bilgilerim',  sub: 'Proforma başlık bilgileri' },
  'tasarim-ayarlari': { title: 'Tasarım Ayarları',  sub: 'Font ve renk özelleştirme' },
};

// Sayfa bazlı topbar aksiyonları
const pageActions = {
  'tekliflerim':  `<button class="btn btn-primary btn-sm" onclick="navigate('teklif-olustur')">+ Yeni Teklif</button>`,
  'musterilerim': `<button class="btn btn-primary btn-sm" onclick="openMusteriModal()">+ Müşteri Ekle</button>`,
  'urunlerim':    `<button class="btn btn-ghost btn-sm" onclick="openTopluUrunModal()" style="gap:6px">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                    Toplu Ekle
                  </button>
                  <button class="btn btn-primary btn-sm" onclick="openUrunModal()">+ Ürün Ekle</button>`,
};

function navigate(page) {
  closeSidebar();

  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));

  const targetPage = document.getElementById('page-' + page);
  if (targetPage) targetPage.classList.add('active');

  document.querySelectorAll('.nav-item').forEach(n => {
    if (n.getAttribute('onclick')?.includes(page)) n.classList.add('active');
  });

  const meta = pageMap[page] || { title: page, sub: '' };
  document.getElementById('topbar-title').textContent = meta.title;
  document.getElementById('topbar-sub').textContent   = meta.sub;
  // Aksiyon butonunu topbar'a enjekte et
  document.getElementById('topbar-actions').innerHTML = pageActions[page] || '';

  if (page === 'dashboard')        renderDashboard();
  if (page === 'teklif-olustur')   initWizard();
  if (page === 'tekliflerim')      renderTeklifTable();
  if (page === 'musterilerim')     renderMusteriTable();
  if (page === 'urunlerim')        renderUrunGrid();
  if (page === 'firma-bilgilerim') renderFirmaList();
  if (page === 'tasarim-ayarlari') initTasarimPage();

  syncBottomNav(page);
  updateBadges();
}

// =========================================================
// BADGES
// =========================================================
function updateBadges() {
  document.getElementById('badge-teklif').textContent  = state.teklifler.length;
  document.getElementById('badge-musteri').textContent = state.musteriler.length;
  document.getElementById('badge-urun').textContent    = state.urunler.length;
  document.getElementById('stat-teklif').textContent   = state.teklifler.length;
  document.getElementById('stat-musteri').textContent  = state.musteriler.length;
  document.getElementById('stat-urun').textContent     = state.urunler.length;

  // Bu ay
  const now = new Date();
  const ayTeklifler = state.teklifler.filter(t => {
    const d = new Date(t.createdAt);
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  });
  document.getElementById('stat-ay').textContent = ayTeklifler.length;
}

// =========================================================
