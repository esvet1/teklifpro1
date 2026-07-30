// FİRMA BİLGİLERİ — Çoklu satıcı firma
// =========================================================
let editFirmaId = null;

// Varsayılan firmayı getir (yoksa ilk firma)
function getVarsayilanFirma() {
  if (!state.firmalar || !state.firmalar.length) return null;
  return state.firmalar.find(f => f.varsayilan) || state.firmalar[0];
}

function getFirmaById(id) {
  return (state.firmalar || []).find(f => f.id === id);
}

// Firma adını göster (boşsa placeholder)
function firmaDisplayAd(f) {
  return f && f.ad ? f.ad : '(İsimsiz firma)';
}

// Kart listesini render et
function renderFirmaList() {
  const wrap = document.getElementById('firma-list');
  if (!wrap) return;
  const list = state.firmalar || [];

  if (!list.length) {
    wrap.innerHTML = `<div class="empty-state"><span class="empty-icon">🏢</span>
      <h3>Henüz satıcı firma yok</h3>
      <p class="text-muted">Teklif verdiğiniz firmaları buraya ekleyin.</p></div>`;
    return;
  }

  wrap.innerHTML = list.map(f => `
    <div class="firma-card${f.varsayilan ? ' firma-card-default' : ''}">
      <div class="firma-card-head">
        <div class="firma-card-ad">
          ${escHtml(firmaDisplayAd(f))}
          ${f.varsayilan ? '<span class="firma-badge">Varsayılan</span>' : ''}
        </div>
        <div class="firma-card-actions">
          ${!f.varsayilan ? `<button class="btn btn-ghost btn-sm" onclick="firmaVarsayilanYap('${f.id}')" title="Varsayılan yap">⭐</button>` : ''}
          <button class="btn btn-ghost btn-sm btn-icon" onclick="openFirmaModal('${f.id}')" title="Düzenle">✏️</button>
          <button class="btn btn-danger btn-sm btn-icon" onclick="silConfirm('firma','${f.id}','${escHtml(firmaDisplayAd(f))} firmasını silmek istediğinize emin misiniz?')" title="Sil">🗑</button>
        </div>
      </div>
      <div class="firma-card-info">
        ${f.vergi ? `Vergi No: ${escHtml(f.vergi)}<br>` : ''}
        ${f.tel ? `T: ${escHtml(f.tel)}  ` : ''}${f.email ? `E: ${escHtml(f.email)}` : ''}
        ${f.adres ? `<br>${escHtml(f.adres)}` : ''}
      </div>
    </div>
  `).join('');
}

// Firma modalını aç (yeni veya düzenle)
function openFirmaModal(id = null) {
  editFirmaId = id;
  const set = (k, v) => { const el = document.getElementById(k); if (el) el.value = v; };
  if (id) {
    const f = getFirmaById(id);
    if (!f) return;
    document.getElementById('firma-modal-title').textContent = 'Firma Düzenle';
    set('f-ad', f.ad || ''); set('f-vergi', f.vergi || ''); set('f-adres', f.adres || '');
    set('f-tel', f.tel || ''); set('f-email', f.email || ''); set('f-web', f.web || '');
    set('f-banka', f.banka || ''); set('f-iban-try', f.ibanTry || '');
    set('f-iban-usd', f.ibanUsd || ''); set('f-iban-eur', f.ibanEur || '');
    set('f-logo', f.logo || '');
  } else {
    document.getElementById('firma-modal-title').textContent = 'Yeni Firma';
    ['f-ad','f-vergi','f-adres','f-tel','f-email','f-web','f-banka','f-iban-try','f-iban-usd','f-iban-eur','f-logo']
      .forEach(k => set(k, ''));
  }
  document.getElementById('modal-firma').classList.add('open');
}

function kaydetFirma() {
  const ad = document.getElementById('f-ad').value.trim();
  if (!ad) { toast('Firma adı zorunludur.', 'error'); return; }

  const veri = {
    ad,
    vergi:   document.getElementById('f-vergi').value.trim(),
    adres:   document.getElementById('f-adres').value.trim(),
    tel:     document.getElementById('f-tel').value.trim(),
    email:   document.getElementById('f-email').value.trim(),
    web:     document.getElementById('f-web').value.trim(),
    banka:   document.getElementById('f-banka').value.trim(),
    ibanTry: document.getElementById('f-iban-try').value.trim(),
    ibanUsd: document.getElementById('f-iban-usd').value.trim(),
    ibanEur: document.getElementById('f-iban-eur').value.trim(),
    logo:    document.getElementById('f-logo').value.trim(),
  };

  if (editFirmaId) {
    state.firmalar = state.firmalar.map(f =>
      f.id === editFirmaId ? { ...f, ...veri } : f);
    toast('Firma güncellendi.');
  } else {
    const yeni = {
      id: uid(),
      ...veri,
      varsayilan: state.firmalar.length === 0, // ilk firma otomatik varsayılan
      createdAt: new Date().toISOString()
    };
    state.firmalar.push(yeni);
    toast('Firma eklendi.');
  }

  saveState();
  closeModal('modal-firma');
  renderFirmaList();
}

// Bir firmayı varsayılan yap (diğerlerinin işaretini kaldır)
function firmaVarsayilanYap(id) {
  state.firmalar = state.firmalar.map(f => ({ ...f, varsayilan: f.id === id }));
  saveState();
  renderFirmaList();
  toast('Varsayılan firma güncellendi.');
}

// =========================================================
