// ÜRÜN CRUD
// =========================================================
let editUrunId = null;

// Ürün para birimi dropdown'unu sabit + özel paralarla doldur
function refreshUrunParaSelect() {
  const sel = document.getElementById('u-para');
  if (!sel) return;
  const onceki = sel.value;
  const sabit = [['TRY','₺ TRY'],['USD','$ USD'],['EUR','€ EUR']];
  const ozel = (state.ozelParalar || []).map(c => [c, c]);
  sel.innerHTML = [...sabit, ...ozel]
    .map(([v,l]) => `<option value="${v}">${l}</option>`).join('');
  if (onceki) sel.value = onceki;
}

function openUrunModal(id = null) {
  editUrunId = id;
  const modal = document.getElementById('modal-urun');
  // Para birimi dropdown'unu güncelle (sabit + özel paralar)
  refreshUrunParaSelect();
  if (id) {
    const u = state.urunler.find(x => x.id === id);
    if (!u) return;
    document.getElementById('urun-modal-title').textContent = 'Ürün Düzenle';
    document.getElementById('u-id').value       = u.id;
    document.getElementById('u-ad').value       = u.ad;
    document.getElementById('u-kod').value      = u.kod || '';
    document.getElementById('u-birim').value    = u.birim || 'Adet';
    document.getElementById('u-fiyat').value    = u.fiyat;
    document.getElementById('u-para').value     = u.para || 'TRY';
    document.getElementById('u-aciklama').value = u.aciklama || '';
    document.getElementById('u-gorsel').value   = u.gorsel || '';
    previewUrunImg(u.gorsel || '');
  } else {
    document.getElementById('urun-modal-title').textContent = 'Ürün Ekle';
    ['u-id','u-ad','u-kod','u-aciklama','u-gorsel'].forEach(f => document.getElementById(f).value = '');
    document.getElementById('u-fiyat').value = '';
    document.getElementById('u-birim').value = 'Adet';
    document.getElementById('u-para').value  = 'TRY';
    document.getElementById('u-gorsel-preview').innerHTML = '';
  }
  modal.classList.add('open');
}

function previewUrunImg(url) {
  const wrap = document.getElementById('u-gorsel-preview');
  if (!url) { wrap.innerHTML = ''; return; }
  wrap.innerHTML = `<img src="${escHtml(url)}" style="height:80px;border-radius:8px;border:1px solid var(--border);object-fit:cover" onerror="this.style.display='none'">`;
}

function kaydetUrun() {
  const ad = document.getElementById('u-ad').value.trim();
  const fiyat = parseFloat(document.getElementById('u-fiyat').value);
  if (!ad) { toast('Ürün adı zorunludur.', 'error'); return; }
  if (isNaN(fiyat) || fiyat < 0) { toast('Geçerli bir fiyat girin.', 'error'); return; }

  const urun = {
    id:       editUrunId || uid(),
    ad,
    kod:      document.getElementById('u-kod').value.trim(),
    birim:    document.getElementById('u-birim').value,
    fiyat,
    para:     document.getElementById('u-para').value,
    aciklama: document.getElementById('u-aciklama').value.trim(),
    gorsel:   document.getElementById('u-gorsel').value.trim(),
    createdAt: editUrunId ? (state.urunler.find(u=>u.id===editUrunId)?.createdAt || new Date().toISOString()) : new Date().toISOString()
  };

  if (editUrunId) {
    state.urunler = state.urunler.map(u => u.id === editUrunId ? urun : u);
    toast('Ürün güncellendi.');
  } else {
    state.urunler.push(urun);
    toast('Ürün eklendi.');
  }

  saveState();
  closeModal('modal-urun');
  renderUrunGrid();
  updateBadges();
}

function renderUrunGrid(q = '') {
  const grid = document.getElementById('urun-grid');
  const query = q.toLowerCase().trim();
  const list = state.urunler.filter(u => {
    if (!query) return true;
    return u.ad.toLowerCase().includes(query) ||
           (u.kod || '').toLowerCase().includes(query) ||
           (u.aciklama || '').toLowerCase().includes(query);
  });
  const countEl = document.getElementById('search-count-urun');
  if (countEl) countEl.textContent = query ? `${list.length} sonuç` : `${state.urunler.length} ürün`;

  if (!list.length) {
    grid.innerHTML = `<div class="empty-state" style="grid-column:1/-1"><span class="empty-icon">${query ? '🔍' : '📦'}</span><h3>${query ? 'Sonuç bulunamadı' : 'Henüz ürün eklenmedi'}</h3>${query ? '' : '<p>Ürün kataloğunuzu oluşturun.</p>'}</div>`;
    return;
  }
  grid.innerHTML = list.map(u => `
    <div class="product-card">
      <div class="product-img${u.gorsel ? ' product-img-clickable' : ''}"
           ${u.gorsel ? `onclick="openLightbox('${escHtml(u.gorsel)}','${escHtml(u.ad)}')" title="Görseli büyüt"` : ''}>
        ${u.gorsel ? `<img src="${escHtml(u.gorsel)}" alt="${escHtml(u.ad)}" onerror="this.parentElement.textContent='📦';this.parentElement.classList.remove('product-img-clickable');this.parentElement.onclick=null">` : '📦'}
      </div>
      <div class="product-info">
        <div class="product-name">${escHtml(u.ad)}</div>
        ${u.kod ? `<div style="font-size:0.72rem;color:var(--text-dim);margin-bottom:4px">${escHtml(u.kod)}</div>` : ''}
        <div class="product-desc">${escHtml(u.aciklama || '—')}</div>
        <div class="product-footer">
          <div class="product-price">${formatTutar(u.fiyat, u.para)} / ${escHtml(u.birim)}</div>
          <div class="td-actions">
            <button class="btn btn-ghost btn-sm btn-icon" title="Düzenle" onclick="openUrunModal('${u.id}')">✏️</button>
            <button class="btn btn-danger btn-sm btn-icon" title="Sil" onclick="silConfirm('urun','${u.id}','${escHtml(u.ad)} ürününü silmek istediğinizden emin misiniz?')">🗑</button>
          </div>
        </div>
      </div>
    </div>
  `).join('');
}
function filterUrunler(q) { renderUrunGrid(q); }

// =========================================================
