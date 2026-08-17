// MÜŞTERİ CRUD
// =========================================================
let editMusteriId = null;

function openMusteriModal(id = null) {
  editMusteriId = id;
  const modal = document.getElementById('modal-musteri');
  if (id) {
    const m = state.musteriler.find(x => x.id === id);
    if (!m) return;
    document.getElementById('musteri-modal-title').textContent = 'Müşteri Düzenle';
    document.getElementById('m-id').value      = m.id;
    document.getElementById('m-tip').value     = m.tip;
    document.getElementById('m-sirket').value  = m.sirket || '';
    document.getElementById('m-ad').value      = m.ad || '';
    document.getElementById('m-email').value   = m.email || '';
    document.getElementById('m-tel').value     = m.tel || '';
    document.getElementById('m-ulke').value    = m.ulke || '';
    document.getElementById('m-vergi').value   = m.vergi || '';
    document.getElementById('m-adres').value   = m.adres || '';
  } else {
    document.getElementById('musteri-modal-title').textContent = 'Müşteri Ekle';
    ['m-id','m-sirket','m-ad','m-email','m-tel','m-ulke','m-vergi','m-adres'].forEach(f => document.getElementById(f).value = '');
    document.getElementById('m-tip').value = 'bireysel';
  }
  musteriTipChange();
  modal.classList.add('open');
}

function musteriTipChange() {
  const tip = document.getElementById('m-tip').value;
  document.getElementById('m-sirket-wrap').style.display = tip === 'kurumsal' ? 'block' : 'none';
}

function kaydetMusteri() {
  const ad = document.getElementById('m-ad').value.trim();
  if (!ad) { toast('Ad Soyad alanı zorunludur.', 'error'); return; }

  const musteri = {
    id:     editMusteriId || uid(),
    tip:    document.getElementById('m-tip').value,
    sirket: document.getElementById('m-sirket').value.trim(),
    ad,
    email:  document.getElementById('m-email').value.trim(),
    tel:    document.getElementById('m-tel').value.trim(),
    ulke:   document.getElementById('m-ulke').value.trim(),
    vergi:  document.getElementById('m-vergi').value.trim(),
    adres:  document.getElementById('m-adres').value.trim(),
    createdAt: editMusteriId ? (state.musteriler.find(m=>m.id===editMusteriId)?.createdAt || new Date().toISOString()) : new Date().toISOString()
  };

  if (editMusteriId) {
    state.musteriler = state.musteriler.map(m => m.id === editMusteriId ? musteri : m);
    toast('Müşteri güncellendi.');
  } else {
    state.musteriler.push(musteri);
    toast('Müşteri eklendi.');
  }

  saveState();
  closeModal('modal-musteri');
  renderMusteriTable();
  updateBadges();
}

function renderMusteriTable(q = '') {
  const tbody = document.getElementById('musteri-tbody');
  const query = q.toLowerCase().trim();
  const list = state.musteriler.filter(m => {
    if (!query) return true;
    return musteriDisplayAd(m).toLowerCase().includes(query) ||
           (m.email || '').toLowerCase().includes(query) ||
           (m.sirket || '').toLowerCase().includes(query) ||
           (m.ulke || '').toLowerCase().includes(query);
  });
  const countEl = document.getElementById('search-count-musteri');
  if (countEl) countEl.textContent = query ? `${list.length} sonuç` : `${state.musteriler.length} müşteri`;

  if (!list.length) {
    tbody.innerHTML = `<tr><td colspan="6"><div class="empty-state"><span class="empty-icon">${query ? '🔍' : '👥'}</span><h3>${query ? 'Sonuç bulunamadı' : 'Henüz müşteri eklenmedi'}</h3></div></td></tr>`;
    return;
  }
  tbody.innerHTML = list.map(m => `
    <tr>
      <td>${musteriDisplayAd(m)}</td>
      <td class="hide-mobile"><span class="badge ${m.tip==='kurumsal'?'badge-blue':'badge-gray'}">${m.tip==='kurumsal'?'Kurumsal':'Bireysel'}</span></td>
      <td class="hide-mobile">${m.email || '—'}</td>
      <td class="hide-mobile">${m.tel || '—'}</td>
      <td class="hide-mobile">${m.ulke || '—'}</td>
      <td class="td-actions">
        <button class="btn btn-ghost btn-sm btn-icon" title="Düzenle" onclick="openMusteriModal('${m.id}')">✏️</button>
        <button class="btn btn-danger btn-sm btn-icon" title="Sil" onclick="silConfirm('musteri','${m.id}','${musteriDisplayAd(m)} müşterisini silmek istediğinizden emin misiniz?')">🗑</button>
      </td>
    </tr>
  `).join('');
}
function filterMusteriler(q) { renderMusteriTable(q); }

// =========================================================
