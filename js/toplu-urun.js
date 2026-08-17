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
  // BOM + CSV header + 3 örnek satır
  const bom = '\uFEFF';
  const header = TOPLU_KOLONLAR.join(';');
  const ornekler = [
    'Örnek Ürün A;SKU-001;Ürün açıklaması;Adet;150.00;TRY;',
    'Örnek Ürün B;SKU-002;İkinci ürün;Kg;89.90;USD;https://example.com/img.jpg',
    'Örnek Ürün C;;Açıklama opsiyonel;Paket;250.00;EUR;',
  ];
  const csv = bom + header + '\n' + ornekler.join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = 'urun_sablon.csv';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  toast('📥 Şablon indirildi. Excel ile açıp doldurun.');
}

function onTopluFileSelect(input) {
  const file = input.files[0];
  if (file) parseTopluFile(file);
}

function parseTopluFile(file) {
  if (file.size > 5 * 1024 * 1024) { toast('Dosya 5MB\'dan büyük olamaz.', 'error'); return; }
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

  const headerLine = lines[0].split(sep).map(h => h.trim().replace(/^"|"$/g, ''));
  // Sütun indekslerini bul (başlıklara göre esnek eşleşme)
  const kolon = (isim) => headerLine.findIndex(h => h.toLowerCase().includes(isim.toLowerCase()));
  const iAd   = kolon('Ürün Ad');
  const iKod  = kolon('Stok');
  const iAcik = kolon('Açıkl');
  const iBirim = kolon('Birim');
  const iFiyat = kolon('Fiyat');
  const iPara  = kolon('Para');
  const iGorsel = kolon('Görsel');

  if (iAd < 0 || iFiyat < 0) {
    showTopluHata('"Ürün Adı" ve "Fiyat" sütunları zorunludur. Lütfen şablonu kullanın.');
    return;
  }

  const hatalar = [];
  const parsed  = [];

  lines.slice(1).forEach((line, idx) => {
    if (!line.trim()) return;
    // Tırnaklı alanları doğru parse et
    const cols = parseCSVLine(line, sep);
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
