'use strict';

// =========================================================
// EXPORT — Veri Dışa Aktarma (CSV)
// =========================================================

function _downloadCSV(filename, headers, rows) {
  const bom = '\uFEFF'; // BOM — Excel UTF-8 desteği
  const sep = ';';
  const csv = bom + headers.join(sep) + '\n' +
    rows.map(r => r.map(cell => {
      const s = String(cell == null ? '' : cell);
      // Tırnak içine al: ayraç, tırnak veya satır sonu içeriyorsa
      if (s.includes(sep) || s.includes('"') || s.includes('\n')) {
        return '"' + s.replace(/"/g, '""') + '"';
      }
      return s;
    }).join(sep)).join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function exportMusterilerCSV() {
  if (!state.musteriler.length) { toast('Dışa aktarılacak müşteri yok.', 'error'); return; }
  const headers = ['Tip', 'Ad Soyad', 'Şirket', 'E-posta', 'Telefon', 'Ülke', 'Vergi No', 'Adres'];
  const rows = state.musteriler.map(m => [
    m.tip || '', m.ad || '', m.sirket || '', m.email || '',
    m.tel || '', m.ulke || '', m.vergi || '', m.adres || ''
  ]);
  _downloadCSV('musteriler.csv', headers, rows);
  toast('📥 Müşteriler CSV olarak indirildi.');
}

function exportUrunlerCSV() {
  if (!state.urunler.length) { toast('Dışa aktarılacak ürün yok.', 'error'); return; }
  const headers = ['Ürün Adı', 'Stok Kodu', 'Açıklama', 'Birim', 'Fiyat', 'Para Birimi', 'Görsel URL'];
  const rows = state.urunler.map(u => [
    u.ad || '', u.kod || '', u.aciklama || '', u.birim || '',
    u.fiyat || 0, u.para || 'TRY', u.gorsel || ''
  ]);
  _downloadCSV('urunler.csv', headers, rows);
  toast('📥 Ürünler CSV olarak indirildi.');
}

function exportTekliflerCSV() {
  if (!state.teklifler.length) { toast('Dışa aktarılacak teklif yok.', 'error'); return; }
  const headers = ['Teklif No', 'Müşteri', 'Para Birimi', 'Ara Toplam', 'KDV', 'Genel Toplam', 'Geçerlilik', 'Tarih'];
  const rows = state.teklifler.map(t => {
    const m = getMusteriById(t.musteriId);
    return [
      t.teklifNo || '', m ? musteriDisplayAd(m) : '—',
      t.currency || 'TRY', t.araToplam || 0, t.kdvTutar || 0,
      t.toplamKdvli || 0, t.gecerlilik || '', formatTarih(t.createdAt)
    ];
  });
  _downloadCSV('teklifler.csv', headers, rows);
  toast('📥 Teklifler CSV olarak indirildi.');
}

// =========================================================
