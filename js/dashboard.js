// DASHBOARD
// =========================================================

// Yıl select'ini tekliflerden dinamik doldur
function populateDashboardYillar() {
  const sel = document.getElementById('db-yil');
  if (!sel) return;
  const current = sel.value;
  const yillar = [...new Set(
    state.teklifler.map(t => new Date(t.createdAt).getFullYear())
  )].sort((a,b) => b - a);
  sel.innerHTML = '<option value="">Tüm Yıllar</option>' +
    yillar.map(y => `<option value="${y}"${String(y)===current?'selected':''}>${y}</option>`).join('');
}

function resetDashboardFilter() {
  const si  = document.getElementById('db-search');
  const yil = document.getElementById('db-yil');
  const ay  = document.getElementById('db-ay');
  if (si)  si.value  = '';
  if (yil) yil.value = '';
  if (ay)  ay.value  = '';
  renderDashboard();
}

function renderDashboard() {
  populateDashboardYillar();

  const q       = (document.getElementById('db-search')?.value || '').toLowerCase().trim();
  const yilVal  = document.getElementById('db-yil')?.value  || '';
  const ayVal   = document.getElementById('db-ay')?.value   || '';
  const hasFilter = q || yilVal || ayVal;

  // Reset buton durumu
  const resetBtn = document.getElementById('db-reset-btn');
  if (resetBtn) resetBtn.classList.toggle('has-filter', !!hasFilter);

  // Select aktif durumu
  ['db-yil','db-ay'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.classList.toggle('active', !!el.value);
  });

  const tbody = document.getElementById('dashboard-recent');

  if (!state.teklifler.length) {
    document.getElementById('db-result-bar').style.display = 'none';
    tbody.innerHTML = `<div class="empty-state"><span class="empty-icon">📄</span><h3>Henüz teklif yok</h3><p>Yeni bir teklif oluşturmak için Teklif Oluştur menüsünü kullanın.</p></div>`;
    return;
  }

  // Filtrele
  const filtered = [...state.teklifler].reverse().filter(t => {
    const m = getMusteriById(t.musteriId);
    const d = new Date(t.createdAt);

    // Metin filtresi
    if (q) {
      const haystack = [
        t.teklifNo,
        m ? musteriDisplayAd(m) : '',
        formatTarih(t.createdAt),
      ].join(' ').toLowerCase();
      if (!haystack.includes(q)) return false;
    }
    // Yıl filtresi
    if (yilVal && d.getFullYear() !== parseInt(yilVal)) return false;
    // Ay filtresi (1-based)
    if (ayVal  && (d.getMonth()+1) !== parseInt(ayVal))  return false;
    return true;
  });

  // Sonuç bar
  const resultBar  = document.getElementById('db-result-bar');
  const resultText = document.getElementById('db-result-text');
  if (hasFilter) {
    resultBar.style.display = 'flex';
    const parts = [];
    if (q)      parts.push(`"${q}"`);
    if (yilVal) parts.push(`${yilVal} yılı`);
    if (ayVal) {
      const aylar = ['','Ocak','Şubat','Mart','Nisan','Mayıs','Haziran','Temmuz','Ağustos','Eylül','Ekim','Kasım','Aralık'];
      parts.push(aylar[parseInt(ayVal)]);
    }
    resultText.textContent = `${filtered.length} teklif bulundu — ${parts.join(', ')} için`;
  } else {
    resultBar.style.display = 'none';
  }

  // Tablo
  if (!filtered.length) {
    tbody.innerHTML = `<div class="empty-state"><span class="empty-icon">🔍</span><h3>Sonuç bulunamadı</h3><p>Farklı bir filtre deneyin veya sıfırlayın.</p></div>`;
    return;
  }

  // Filtre yoksa sadece son 10, filtre varsa tümü
  const list = hasFilter ? filtered : filtered.slice(0, 10);

  const rows = list.map(t => {
    const m = getMusteriById(t.musteriId);
    return `<tr>
      <td style="font-weight:600">${escHtml(t.teklifNo)}</td>
      <td>${m ? escHtml(musteriDisplayAd(m)) : '—'}</td>
      <td class="hide-mobile">${formatTarih(t.createdAt)}</td>
      <td class="hide-mobile">${t.gecerlilik || '—'}</td>
      <td style="color:var(--accent);font-weight:600">${formatTutar(t.toplamKdvli, t.currency)}</td>
      <td class="hide-mobile"><span class="badge badge-green">Oluşturuldu</span></td>
      <td class="td-actions">
        <button class="btn btn-ghost btn-sm btn-icon" title="Görüntüle" onclick="goruntuleTeklif('${t.id}')">👁</button>
        <button class="btn btn-primary btn-sm btn-icon" title="PDF İndir" onclick="goruntuleTeklifPdf('${t.id}')">⬇</button>
      </td>
    </tr>`;
  }).join('');

  tbody.innerHTML = `<table>
    <thead><tr>
      <th>Teklif No</th><th>Müşteri</th>
      <th class="hide-mobile">Tarih</th>
      <th class="hide-mobile">Geçerlilik</th>
      <th>Tutar</th>
      <th class="hide-mobile">Durum</th>
      <th></th>
    </tr></thead>
    <tbody>${rows}</tbody>
  </table>`;
}

// =========================================================
