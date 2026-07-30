// PROFORMA RENDER — HTML şablonu
// Next.js: components/teklif/ProformaTemplate.tsx
// =========================================================
// Proformada gösterilecek kur metni (yönüne göre)
function proformaKurMetni(t) {
  const kaynak = t.kaynakPara, hedef = t.currency, kur = t.kur;
  const tarih = formatTarih(t.createdAt);
  let metin;
  if (hedef === 'TRY' && kaynak !== 'TRY') {
    metin = `1 ${kaynak} = ${fmt(kur)} TL`;
  } else if (kaynak === 'TRY' && hedef !== 'TRY') {
    metin = `1 ${hedef} = ${fmt(kur)} TL`;
  } else {
    metin = `1 ${kaynak} = ${fmt(kur)} ${hedef}`;
  }
  return `${metin} (${tarih})`;
}

function renderProforma(teklifId) {
  const t = state.teklifler.find(x => x.id === teklifId);
  if (!t) return '<p>Teklif bulunamadı.</p>';
  const m = getMusteriById(t.musteriId);
  // Satıcı firma: teklifte kayıtlı firma, yoksa varsayılan, o da yoksa boş
  const f = (t.saticiFirmaId && getFirmaById(t.saticiFirmaId))
            || getVarsayilanFirma()
            || { ad:'', vergi:'', adres:'', tel:'', email:'', web:'', banka:'', ibanTry:'', ibanUsd:'', ibanEur:'', logo:'' };
  const sym = currencySym(t.currency);

  const kalemRows = t.kalemler.map(k => `
    <tr>
      <td>
        ${k.gorsel ? `<img src="${escHtml(k.gorsel)}" class="proforma-urun-img" onerror="this.style.display='none'">` : ''}
        ${escHtml(k.urunAd)}
      </td>
      <td class="num">${k.miktar}</td>
      <td>${escHtml(k.birim)}</td>
      <td class="num">${sym}${fmt(k.birimFiyat)}</td>
      <td class="num">${k.iskonto > 0 ? '%'+k.iskonto : '—'}</td>
      <td class="num"><strong>${sym}${fmt(k.araToplam)}</strong></td>
    </tr>
  `).join('');

  return `
  <div class="proforma-preview">
    <div class="proforma-header">
      <div>
        <div class="proforma-firma-ad">${escHtml(f.ad || 'Firma Adınız')}<span>.</span></div>
        <div class="proforma-firma-info">
          ${f.adres ? escHtml(f.adres)+'<br>' : ''}
          ${f.tel ? 'T: '+escHtml(f.tel)+'  ' : ''}${f.email ? 'E: '+escHtml(f.email) : ''}<br>
          ${f.web ? escHtml(f.web) : ''}${f.vergi ? '  |  Vergi No: '+escHtml(f.vergi) : ''}
        </div>
      </div>
      <div class="proforma-meta">
        <div class="label">PROFORMA FATURA / FİYAT TEKLİFİ</div>
        <div class="teklif-no">${escHtml(t.teklifNo)}</div>
        <div class="tarih">Tarih: ${formatTarih(t.createdAt)}</div>
        ${t.gecerlilik ? `<div class="tarih">Geçerlilik: ${t.gecerlilik}</div>` : ''}
      </div>
    </div>

    <div class="proforma-body">
      <div class="proforma-2col">

        <div style="background:#ffffff;border:1px solid #e8e8f0;border-radius:8px;padding:16px">
          <div class="proforma-section-title">ALICI / MÜŞTERİ</div>
          <div class="proforma-musteri-ad">${m ? escHtml(musteriDisplayAd(m)) : '—'}</div>
          <div class="proforma-musteri-detail">
            ${m?.sirket && m?.tip==='kurumsal' ? escHtml(m.sirket)+'<br>' : ''}
            ${m?.email ? 'E: '+escHtml(m.email)+'<br>' : ''}
            ${m?.tel ? 'T: '+escHtml(m.tel)+'<br>' : ''}
            ${m?.adres ? escHtml(m.adres)+'<br>' : ''}
            ${m?.ulke ? escHtml(m.ulke) : ''}
            ${m?.vergi ? '<br>Vergi / ID: '+escHtml(m.vergi) : ''}
          </div>
        </div>

        <div style="background:#ffffff;border:1px solid #e8e8f0;border-radius:8px;padding:16px">
          <div class="proforma-section-title">SATICI / FİRMA</div>
          <div class="proforma-musteri-ad">${escHtml(f.ad || '—')}</div>
          <div class="proforma-musteri-detail">
            ${f.adres ? escHtml(f.adres)+'<br>' : ''}
            ${f.tel ? 'T: '+escHtml(f.tel)+'<br>' : ''}
            ${f.email ? 'E: '+escHtml(f.email)+'<br>' : ''}
            ${f.web ? escHtml(f.web)+'<br>' : ''}
            ${f.vergi ? 'Vergi No: '+escHtml(f.vergi) : ''}
          </div>
          ${(f.banka || f.ibanTry || f.ibanUsd || f.ibanEur) ? `
          <div style="margin-top:10px;padding-top:10px;border-top:1px solid #eee">
            <div class="proforma-section-title" style="margin-bottom:6px">ÖDEME BİLGİLERİ</div>
            <div class="proforma-musteri-detail">
              ${f.banka ? 'Banka: '+escHtml(f.banka)+'<br>' : ''}
              ${f.ibanTry ? '₺ IBAN: '+escHtml(f.ibanTry)+'<br>' : ''}
              ${f.ibanUsd ? '$ SWIFT/IBAN: '+escHtml(f.ibanUsd)+'<br>' : ''}
              ${f.ibanEur ? '€ SWIFT/IBAN: '+escHtml(f.ibanEur) : ''}
            </div>
          </div>` : ''}
        </div>

      </div>

      <table class="proforma-table">
        <thead>
          <tr>
            <th style="width:35%">Ürün / Hizmet</th>
            <th class="num">Miktar</th>
            <th>Birim</th>
            <th class="num">Birim Fiyat</th>
            <th class="num">İskonto</th>
            <th class="num">Ara Toplam</th>
          </tr>
        </thead>
        <tbody>${kalemRows}</tbody>
      </table>

      <div class="proforma-totals">
        ${(t.kaynakPara && t.currency && t.kaynakPara !== t.currency && t.kur)
          ? `<div class="total-row kur-row"><span>Kur</span><span>${proformaKurMetni(t)}</span></div>`
          : ''}
        <div class="total-row"><span>Ara Toplam</span><span>${sym}${fmt(t.araToplam)}</span></div>
        <div class="total-row"><span>KDV (%${t.kdv})</span><span>${sym}${fmt(t.kdvTutar)}</span></div>
        <div class="total-row grand"><span>GENEL TOPLAM</span><span>${sym}${fmt(t.toplamKdvli)}</span></div>
      </div>

      ${t.not ? `<div class="proforma-not"><strong>Not:</strong> ${escHtml(t.not)}</div>` : ''}
    </div>

    <div class="proforma-footer">
      <span>${escHtml(t.teklifNo)} · ${formatTarih(t.createdAt)}</span>
      <span style="text-align:right;color:#bbb;font-size:0.7rem">Bu form <strong>www.uygulamalardukkani.com</strong>'dan ücretsiz olarak yapılmıştır.</span>
    </div>
  </div>`;
}

function goruntuleTeklif(id) {
  state.currentTeklifId = id;
  document.getElementById('modal-teklif-icerik').innerHTML = renderProforma(id);
  document.getElementById('modal-teklif-goruntule').classList.add('open');
}

function goruntuleTeklifPdf(id) {
  goruntuleTeklif(id);
  setTimeout(() => teklifPDF(), 300);
}

function teklifPDF() {
  if (!state.currentTeklifId) return;

  const t = state.teklifler.find(x => x.id === state.currentTeklifId);
  if (!t) return;

  // 1. Proforma HTML'ini print-root'a yaz
  const printRoot = document.getElementById('print-root');
  printRoot.innerHTML = renderProforma(state.currentTeklifId);

  // 2. Sayfa başlığını ayarla
  const prevTitle = document.title;
  document.title  = t.teklifNo;

  // 3. İki animasyon karesi bekle (tarayıcı DOM'u render etsin)
  //    sonra bir timeout daha ekle — özellikle mobil Safari için
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      setTimeout(() => {
        window.print();

        // 4. Print dialog kapandıktan sonra temizle
        //    (print senkron bloklar, bu kod dialog kapanınca çalışır)
        setTimeout(() => {
          document.title   = prevTitle;
          printRoot.innerHTML = '';
        }, 500);
      }, 120); // tarayıcıya layout hesabı için yeterli süre
    });
  });
}

// =========================================================
