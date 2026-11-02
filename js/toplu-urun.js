// TOPLU ÜRÜN EKLE
// Next.js: hooks/useTopluUrun.ts + API route /api/urun/bulk
// CSV format: BOM'lu UTF-8 — Excel doğrudan açar
// =========================================================

// Şablon sütun tanımları (urun modal ile birebir eşleşir)
const TOPLU_KOLONLAR = ['Ürün Adı', 'Stok Kodu', 'Açıklama', 'Birim', 'Fiyat', 'Para Birimi', 'Görsel URL'];
const TOPLU_BIRIMLER = ['Adet', 'Kg', 'Ton', 'Litre', 'Metre', 'M²', 'M³', 'Paket', 'Koli'];
const TOPLU_PARALAR  = ['TRY', 'USD', 'EUR'];

let topluParsedData = []; // parse edilen satırlar

function openTopluUrunModal() {
  resetToplu();
  document.getElementById('modal-toplu-urun').classList.add('open');
  // Drag & drop
  const dz = document.getElementById('toplu-dropzone');
  dz.ondragover = e => { e.preventDefault(); dz.classList.add('drag-over'); };
  dz.ondragleave = () => dz.classList.remove('drag-over');
  dz.ondrop = e => {
    e.preventDefault(); dz.classList.remove('drag-over');
    const file = e.dataTransfer.files[0];
    if (file) parseTopluFile(file);
  };
}

function resetToplu() {
  topluParsedData = [];
  document.getElementById('toplu-preview-wrap').style.display = 'none';
  document.getElementById('toplu-ekle-btn').style.display = 'none';
  document.getElementById('toplu-file-input').value = '';
  document.getElementById('toplu-hata-wrap').innerHTML = '';
  const dz = document.getElementById('toplu-dropzone');
  dz.querySelector('.toplu-drop-text').textContent = 'Dosyayı buraya sürükleyin veya tıklayın';
  dz.querySelector('.toplu-drop-icon').textContent = '📂';
}

function indir_sablon() {
  // Gerçek .xlsx: telefonda da (Excel / Google Sheets / Numbers) başlıklar ayrı sütunlarda açılır
  const rows = [
    TOPLU_KOLONLAR,
    ['Örnek Ürün A', 'SKU-001', 'Ürün açıklaması', 'Adet', 150, 'TRY', ''],
    ['Örnek Ürün B', 'SKU-002', 'İkinci ürün', 'Kg', 89.9, 'USD', 'https://example.com/img.jpg'],
    ['Örnek Ürün C', '', 'Açıklama opsiyonel', 'Paket', 250, 'EUR', ''],
  ];
  const url = URL.createObjectURL(xlsxBlob(rows, [28, 14, 30, 10, 12, 12, 34]));
  const a   = document.createElement('a');
  a.href     = url;
  a.download = 'urun_sablon.xlsx';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000); // mobil tarayıcılar indirmeyi gecikmeli başlatır
  toast('📥 Şablon indirildi. Excel ile açıp her satıra bir ürün yazın.');
}

function onTopluFileSelect(input) {
  const file = input.files[0];
  if (file) parseTopluFile(file);
}

function parseTopluFile(file) {
  if (file.size > 5 * 1024 * 1024) { toast('Dosya 5MB\'dan büyük olamaz.', 'error'); return; }
  if (/\.xlsx$/i.test(file.name)) {
    file.arrayBuffer().then(xlsxRows)
      .then(rows => parseTopluRows(rows.filter(r => r.some(c => String(c).trim())), file.name))
      .catch(err => showTopluHata('Excel dosyası okunamadı: ' + err.message));
    return;
  }
  const reader = new FileReader();
  reader.onload = e => {
    let text = e.target.result;
    // BOM temizle
    if (text.charCodeAt(0) === 0xFEFF) text = text.slice(1);
    parseCSVText(text, file.name);
  };
  reader.readAsText(file, 'UTF-8');
}

function parseCSVText(text, fileName) {
  // Hem ; hem , ayracı destekle
  const lines = text.split(/\r?\n/).filter(l => l.trim());
  if (lines.length < 2) {
    showTopluHata('Dosya boş veya yalnızca başlık satırı içeriyor.');
    return;
  }

  // Ayracı otomatik algıla
  const sep = lines[0].includes(';') ? ';' : ',';
  parseTopluRows(lines.map(l => parseCSVLine(l, sep)), fileName);
}

// Satır dizisinden (CSV veya XLSX) ürünleri çıkar; ilk satır başlık
function parseTopluRows(rows, fileName) {
  if (rows.length < 2) {
    showTopluHata('Dosya boş veya yalnızca başlık satırı içeriyor.');
    return;
  }
  const headerLine = rows[0].map(h => String(h).trim());
  // Sütun indekslerini bul (başlıklara göre esnek eşleşme)
  const kolon = (isim) => headerLine.findIndex(h => h.toLowerCase().includes(isim.toLowerCase()));
  const iAd   = kolon('Ürün Ad');
  const iKod  = kolon('Stok');
  const iAcik = kolon('Açıkl');
  const iBirim = headerLine.findIndex(h => h.toLowerCase() === 'birim'); // 'Para Birimi' ile karışmasın
  const iFiyat = kolon('Fiyat');
  const iPara  = kolon('Para');
  const iGorsel = kolon('Görsel');

  if (iAd < 0 || iFiyat < 0) {
    showTopluHata('"Ürün Adı" ve "Fiyat" sütunları zorunludur. Lütfen şablonu kullanın.');
    return;
  }

  const hatalar = [];
  const parsed  = [];

  rows.slice(1).forEach((cols, idx) => {
    const ad   = (cols[iAd] || '').trim();
    const fiyatStr = (cols[iFiyat] || '').trim().replace(',', '.');
    const fiyat = parseFloat(fiyatStr);

    if (!ad) { hatalar.push(`Satır ${idx + 2}: Ürün adı boş.`); return; }
    if (isNaN(fiyat) || fiyat < 0) { hatalar.push(`Satır ${idx + 2}: Geçersiz fiyat (${fiyatStr}).`); return; }

    const para = iPara >= 0 ? (cols[iPara]||'').trim().toUpperCase() : '';
    parsed.push({
      ad,
      kod:      iKod  >= 0 ? (cols[iKod]  ||'').trim() : '',
      aciklama: iAcik >= 0 ? (cols[iAcik] ||'').trim() : '',
      birim:    iBirim >= 0 ? (cols[iBirim]||'').trim() || 'Adet' : 'Adet',
      fiyat,
      para:     TOPLU_PARALAR.includes(para) ? para : 'TRY',
      gorsel:   iGorsel >= 0 ? (cols[iGorsel]||'').trim() : '',
    });
  });

  if (!parsed.length && !hatalar.length) {
    showTopluHata('Hiç geçerli ürün satırı bulunamadı.');
    return;
  }

  topluParsedData = parsed;

  // Dropzone güncelle
  const dz = document.getElementById('toplu-dropzone');
  dz.querySelector('.toplu-drop-icon').textContent = '✅';
  dz.querySelector('.toplu-drop-text').textContent = `${fileName} — ${parsed.length} ürün okundu`;

  // Önizleme tablosunu göster
  renderTopluPreview(parsed, hatalar);
}

function parseCSVLine(line, sep) {
  // Tırnaklı alanları doğru böl
  const result = [];
  let cur = '', inQ = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') { inQ = !inQ; continue; }
    if (c === sep && !inQ) { result.push(cur); cur = ''; continue; }
    cur += c;
  }
  result.push(cur);
  return result;
}

function renderTopluPreview(parsed, hatalar) {
  const wrap = document.getElementById('toplu-preview-wrap');
  const title = document.getElementById('toplu-preview-title');
  const thead = document.getElementById('toplu-preview-thead');
  const tbody = document.getElementById('toplu-preview-tbody');
  const hataWrap = document.getElementById('toplu-hata-wrap');

  title.textContent = `${parsed.length} ürün hazır`;
  thead.innerHTML = `<tr>${['Ürün Adı','Kod','Birim','Fiyat','Para'].map(h => `<th>${h}</th>`).join('')}</tr>`;
  tbody.innerHTML = parsed.map(u => `
    <tr>
      <td>${escHtml(u.ad)}</td>
      <td>${escHtml(u.kod||'—')}</td>
      <td>${escHtml(u.birim)}</td>
      <td>${fmt(u.fiyat)}</td>
      <td>${escHtml(u.para)}</td>
    </tr>`).join('');

  hataWrap.innerHTML = hatalar.length
    ? `<div class="toplu-hata">⚠️ ${hatalar.length} satır atlandı:<br>${hatalar.slice(0,5).map(escHtml).join('<br>')}${hatalar.length>5?`<br>...ve ${hatalar.length-5} daha`:''}</div>`
    : '';

  wrap.style.display = 'block';
  document.getElementById('toplu-ekle-btn').style.display = parsed.length ? 'inline-flex' : 'none';
}

function showTopluHata(msg) {
  toast(msg, 'error');
  document.getElementById('toplu-hata-wrap').innerHTML = `<div class="toplu-hata">❌ ${escHtml(msg)}</div>`;
  document.getElementById('toplu-preview-wrap').style.display = 'block';
  document.getElementById('toplu-ekle-btn').style.display = 'none';
}

function topluEkle() {
  if (!topluParsedData.length) return;

  if (typeof isPremium === 'function' && !isPremium()) {
    const freeLimit = typeof FREE_URUN_LIMIT !== 'undefined' ? FREE_URUN_LIMIT : 5;
    const yeniEklenecekler = topluParsedData.filter(u => !state.urunler.some(x => x.ad.toLowerCase() === u.ad.toLowerCase())).length;
    if (state.urunler.length + yeniEklenecekler > freeLimit) {
      toast(`Ücretsiz planda en fazla ${freeLimit} ürün ekleyebilirsiniz. Toplu ekleme için Premium'a geçin.`, 'error');
      return;
    }
  }

  const simdi = new Date().toISOString();
  let eklenen = 0, guncellenen = 0;

  topluParsedData.forEach(u => {
    // Aynı ürün adı varsa güncelle, yoksa ekle
    const existing = state.urunler.find(x => x.ad.toLowerCase() === u.ad.toLowerCase());
    if (existing) {
      Object.assign(existing, { ...u, id: existing.id, createdAt: existing.createdAt });
      guncellenen++;
    } else {
      state.urunler.push({ ...u, id: uid(), createdAt: simdi });
      eklenen++;
    }
  });

  saveState();
  updateBadges();
  renderUrunGrid();
  closeModal('modal-toplu-urun');
  resetToplu();

  const mesaj = [
    eklenen    ? `${eklenen} ürün eklendi`      : '',
    guncellenen? `${guncellenen} ürün güncellendi` : '',
  ].filter(Boolean).join(', ');
  toast(`✅ ${mesaj}.`);
}

// =========================================================
