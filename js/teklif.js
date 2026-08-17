// TEKLİF WIZARD
// =========================================================
// Düzenle/Kopyala için bekleyen yükleme isteği (varsa initWizard sıfırlamaz)
let _wizardLoadRequest = null;

function initWizard() {
  // Düzenle/Kopyala'dan gelindiyse: sıfırlama yapma, yüklemeyi uygula
  if (_wizardLoadRequest) {
    const req = _wizardLoadRequest;
    _wizardLoadRequest = null;
    _applyWizardLoad(req.teklif, req.mode);
    return;
  }

  state.wizard = { step:1, editId:null, musteriId:null, saticiFirmaId:null, secilenUrunler:{}, currency:'TRY', kaynakPara:null, kur:1, gecerlilik:'', kdv:20, not:'' };

  // Varsayılan satıcı firmayı otomatik seç
  const vf = getVarsayilanFirma();
  if (vf) state.wizard.saticiFirmaId = vf.id;

  const d = new Date(); d.setDate(d.getDate()+30);
  document.getElementById('w-gecerlilik').value = d.toISOString().split('T')[0];
  document.getElementById('w-kdv').value = 20;
  document.getElementById('w-not').value = '';

  // Arama inputlarını sıfırla
  const ms = document.getElementById('w-musteri-search');
  const us = document.getElementById('w-urun-search');
  if (ms) ms.value = '';
  if (us) us.value = '';

  wizardGotoStep(1);
  renderCurrencyTabs();
  renderSaticiFirmaSelect();
  renderMusteriSelectGrid();
  renderUrunSelectGrid();
}

// Satıcı firma dropdown'unu doldur
function renderSaticiFirmaSelect() {
  const sel = document.getElementById('w-satici-firma');
  if (!sel) return;
  const list = state.firmalar || [];
  if (!list.length) {
    sel.innerHTML = `<option value="">— Önce firma ekleyin —</option>`;
    return;
  }
  sel.innerHTML = list.map(f =>
    `<option value="${f.id}"${f.id === state.wizard.saticiFirmaId ? ' selected' : ''}>${escHtml(firmaDisplayAd(f))}${f.varsayilan ? ' (varsayılan)' : ''}</option>`
  ).join('');
  // state boşsa ilk/varsayılanı seç
  if (!state.wizard.saticiFirmaId && list.length) {
    const vf = getVarsayilanFirma();
    state.wizard.saticiFirmaId = vf ? vf.id : list[0].id;
    sel.value = state.wizard.saticiFirmaId;
  }
}

function onSaticiFirmaChange() {
  const sel = document.getElementById('w-satici-firma');
  if (sel) state.wizard.saticiFirmaId = sel.value || null;
}

// Teklifi wizard'a yükle: DÜZENLE modu (aynı teklif güncellenir)
function duzenleTeklif(id) {
  const t = state.teklifler.find(x => x.id === id);
  if (!t) { toast('Teklif bulunamadı.', 'error'); return; }
  _wizardLoadRequest = { teklif: t, mode: 'edit' };
  navigate('teklif-olustur');
}

// Teklifi wizard'a yükle: KOPYALA modu (yeni teklif olarak kaydedilir)
function kopyalaTeklif(id) {
  const t = state.teklifler.find(x => x.id === id);
  if (!t) { toast('Teklif bulunamadı.', 'error'); return; }
  _wizardLoadRequest = { teklif: t, mode: 'copy' };
  navigate('teklif-olustur');
}

// Yükleme isteğini wizard state'ine uygula
function _applyWizardLoad(t, mode) {
  const secilenUrunler = {};
  (t.kalemler || []).forEach(k => {
    secilenUrunler[k.urunId] = {
      miktar:     k.miktar,
      // kaynak (orijinal) birim fiyatı geri yükle; yoksa birimFiyat'a düş
      birimFiyat: (k.birimFiyatKaynak != null ? k.birimFiyatKaynak : k.birimFiyat),
      iskonto:    k.iskonto || 0
    };
  });

  state.wizard = {
    step: 1,
    editId:     mode === 'edit' ? t.id : null,
    musteriId:  t.musteriId,
    saticiFirmaId: t.saticiFirmaId || (getVarsayilanFirma() ? getVarsayilanFirma().id : null),
    secilenUrunler,
    currency:   t.currency || 'TRY',
    kaynakPara: t.kaynakPara || null,
    kur:        (t.kur != null ? t.kur : 1),
    gecerlilik: t.gecerlilik || '',
    kdv:        (t.kdv != null ? t.kdv : 20),
    not:        t.not || ''
  };

  const g = document.getElementById('w-gecerlilik');
  if (g) g.value = t.gecerlilik || '';
  const kdvEl = document.getElementById('w-kdv');
  if (kdvEl) kdvEl.value = (t.kdv != null ? t.kdv : 20);
  const notEl = document.getElementById('w-not');
  if (notEl) notEl.value = t.not || '';

  const kurEl = document.getElementById('w-kur');
  if (kurEl) kurEl.value = (t.kur != null ? t.kur : 1);

  const ms = document.getElementById('w-musteri-search');
  const us = document.getElementById('w-urun-search');
  if (ms) ms.value = '';
  if (us) us.value = '';

  document.querySelectorAll('.currency-tab').forEach(tab => {
    tab.classList.toggle('active', tab.textContent.includes(state.wizard.currency));
  });

  wizardGotoStep(1);
  renderCurrencyTabs();
  renderSaticiFirmaSelect();
  renderMusteriSelectGrid();
  renderUrunSelectGrid();
  renderKalemler();
  updateKurBox();

  const msg = mode === 'edit'
    ? '✏️ Teklif düzenleme modunda açıldı.'
    : '📋 Teklif kopyalandı — düzenleyip yeni teklif olarak kaydedebilirsiniz.';
  toast(msg);
}

function wizardGotoStep(step) {
  state.wizard.step = step;
  [1,2,3].forEach(i => {
    document.getElementById('wizard-step-'+i).classList.toggle('active', i===step);
    const tab = document.getElementById('step-tab-'+i);
    tab.classList.remove('active','done');
    if (i === step) tab.classList.add('active');
    else if (i < step) tab.classList.add('done');
  });
  if (step === 3) {
    renderWizardOzet();
    // Kaydet butonu metnini moda göre ayarla
    const btn = document.getElementById('wizard-kaydet-btn');
    if (btn) {
      btn.textContent = state.wizard.editId
        ? '✓ Değişiklikleri Kaydet'
        : '✓ Proforma Oluştur & Kaydet';
    }
  }
}

function wizardNext(step) {
  if (step === 2) {
    if (!state.wizard.musteriId) { toast('Lütfen bir müşteri seçin.', 'error'); return; }
  }
  if (step === 3) {
    if (!Object.keys(state.wizard.secilenUrunler).length) { toast('Lütfen en az bir ürün seçin.', 'error'); return; }
    state.wizard.kdv        = parseInt(document.getElementById('w-kdv').value) || 0;
    state.wizard.gecerlilik = document.getElementById('w-gecerlilik').value;
    state.wizard.not        = document.getElementById('w-not').value.trim();
  }
  wizardGotoStep(step);
}

function renderMusteriSelectGrid() {
  const grid  = document.getElementById('musteri-select-grid');
  const q     = (document.getElementById('w-musteri-search')?.value || '').trim().toLowerCase();
  const count = document.getElementById('w-musteri-count');

  if (!state.musteriler.length) {
    grid.innerHTML = `<div class="empty-state" style="padding:40px">
      <span class="empty-icon">👥</span>
      <h3>Kayıtlı müşteri yok</h3>
      <p>Sağ üstten yeni müşteri ekleyebilirsiniz.</p>
    </div>`;
    if (count) count.textContent = '';
    renderSeciliMusteriBand();
    return;
  }

  const list = state.musteriler.filter(m => {
    if (!q) return true;
    return musteriDisplayAd(m).toLowerCase().includes(q) ||
           (m.email||'').toLowerCase().includes(q) ||
           (m.sirket||'').toLowerCase().includes(q) ||
           (m.ulke||'').toLowerCase().includes(q);
  });

  if (count) count.textContent = q ? `${list.length} sonuç` : `${state.musteriler.length} müşteri`;

  if (!list.length) {
    grid.innerHTML = `<div class="empty-state" style="padding:30px">
      <span class="empty-icon">🔍</span><h3>Sonuç bulunamadı</h3>
      <p>"${escHtml(q)}" ile eşleşen müşteri yok.</p>
    </div>`;
    renderSeciliMusteriBand();
    return;
  }

  grid.innerHTML = `<div class="wiz-list">${list.map(m => {
    const ad  = musteriDisplayAd(m);
    const init = ad.trim().charAt(0).toUpperCase();
    const sel  = state.wizard.musteriId === m.id;
    const subParts = [m.email, m.ulke].filter(Boolean);
    return `<div class="wiz-item${sel?' selected':''}" onclick="selectMusteri('${m.id}')">
      <div class="wiz-avatar">${sel ? '✓' : escHtml(init)}</div>
      <div class="wiz-item-main">
        <div class="wiz-item-title">${highlight(escHtml(ad), q)}</div>
        ${subParts.length ? `<div class="wiz-item-sub">${highlight(escHtml(subParts.join(' · ')), q)}</div>` : ''}
      </div>
      <div class="wiz-item-right">
        <span class="badge ${m.tip==='kurumsal'?'badge-blue':'badge-gray'}" style="font-size:0.62rem">${m.tip==='kurumsal'?'Kurumsal':'Bireysel'}</span>
      </div>
    </div>`;
  }).join('')}</div>`;

  renderSeciliMusteriBand();
}

function renderSeciliMusteriBand() {
  const band = document.getElementById('w-secili-musteri');
  if (!band) return;
  const m = getMusteriById(state.wizard.musteriId);
  if (!m) { band.style.display = 'none'; return; }
  band.style.display = 'flex';
  band.innerHTML = `<div class="wiz-selected-band">
    <span class="wiz-selected-band-label">Seçili</span>
    <span class="wiz-selected-band-name">${escHtml(musteriDisplayAd(m))}</span>
    ${m.email ? `<span style="font-size:0.75rem;color:var(--text-muted)">${escHtml(m.email)}</span>` : ''}
    <button class="wiz-selected-band-clear" onclick="selectMusteri(null)" title="Seçimi kaldır">✕</button>
  </div>`;
}

function selectMusteri(id) {
  state.wizard.musteriId = id;
  renderMusteriSelectGrid();
}

function renderUrunSelectGrid() {
  const grid  = document.getElementById('urun-select-grid');
  const q     = (document.getElementById('w-urun-search')?.value || '').trim().toLowerCase();
  const count = document.getElementById('w-urun-count');

  if (!state.urunler.length) {
    grid.innerHTML = `<div class="empty-state" style="padding:40px">
      <span class="empty-icon">📦</span>
      <h3>Kayıtlı ürün yok</h3>
      <p>Sağ üstten yeni ürün ekleyebilirsiniz.</p>
    </div>`;
    if (count) count.textContent = '';
    return;
  }

  const list = state.urunler.filter(u => {
    if (!q) return true;
    return u.ad.toLowerCase().includes(q) ||
           (u.kod||'').toLowerCase().includes(q) ||
           (u.aciklama||'').toLowerCase().includes(q);
  });

  if (count) count.textContent = q ? `${list.length} sonuç` : `${state.urunler.length} ürün`;

  if (!list.length) {
    grid.innerHTML = `<div class="empty-state" style="padding:30px">
      <span class="empty-icon">🔍</span><h3>Sonuç bulunamadı</h3>
      <p>"${escHtml(q)}" ile eşleşen ürün yok.</p>
    </div>`;
    return;
  }

  const secilenSayisi = Object.keys(state.wizard.secilenUrunler).length;
  const header = secilenSayisi
    ? `<div style="padding:8px 16px;font-size:0.75rem;color:var(--accent);font-weight:600;background:var(--accent-glow);border-bottom:1px solid rgba(var(--accent-rgb),.15)">
        ✓ ${secilenSayisi} ürün seçildi — alttaki kalemler tablosundan düzenleyebilirsiniz
       </div>`
    : '';

  grid.innerHTML = header + `<div class="wiz-list">${list.map(u => {
    const sel = !!state.wizard.secilenUrunler[u.id];
    const imgHtml = u.gorsel
      ? `<img class="wiz-urun-img" src="${escHtml(u.gorsel)}" onerror="this.outerHTML='<div class=\\'wiz-urun-img-placeholder\\'>📦</div>'">`
      : `<div class="wiz-urun-img-placeholder">📦</div>`;
    return `<div class="wiz-item${sel?' selected':''}" onclick="toggleUrun('${u.id}')">
      ${imgHtml}
      <div class="wiz-item-main">
        <div class="wiz-item-title">${highlight(escHtml(u.ad), q)}</div>
        <div class="wiz-item-sub">${u.kod ? escHtml(u.kod)+' · ' : ''}${escHtml(u.birim)}</div>
      </div>
      <div class="wiz-item-right">
        <span class="wiz-item-price">${formatTutar(u.fiyat, u.para)}</span>
        ${u.aciklama ? `<span style="font-size:0.7rem;color:var(--text-dim);max-width:90px;text-overflow:ellipsis;overflow:hidden;white-space:nowrap">${escHtml(u.aciklama)}</span>` : ''}
      </div>
      <div class="wiz-check-icon"></div>
    </div>`;
  }).join('')}</div>`;
}

function toggleUrun(id) {
  const u = state.urunler.find(x=>x.id===id);
  if (!u) return;
  if (state.wizard.secilenUrunler[id]) {
    delete state.wizard.secilenUrunler[id];
  } else {
    state.wizard.secilenUrunler[id] = { miktar:1, birimFiyat:u.fiyat, iskonto:0 };
  }
  // Kaynak para birimini seçili ürünlerden algıla
  updateKaynakPara();
  // Arama state'ini koruyarak yeniden render
  renderUrunSelectGrid();
  renderKalemler();
}

// Seçili ürünlerin para birimini kaynak para olarak belirle (ilk üründen)
function updateKaynakPara() {
  const keys = Object.keys(state.wizard.secilenUrunler);
  if (!keys.length) { state.wizard.kaynakPara = null; return; }
  const ilk = state.urunler.find(x => x.id === keys[0]);
  state.wizard.kaynakPara = ilk ? (ilk.para || 'TRY') : 'TRY';
}

function renderKalemler() {
  const wrap = document.getElementById('kalemler-wrap');
  const keys = Object.keys(state.wizard.secilenUrunler);

  if (!keys.length) {
    wrap.innerHTML = `<div class="text-muted" style="text-align:center;padding:20px;font-family:var(--font-body)">Ürün seçin, kalemler burada görünür.</div>`;
    return;
  }

  let rows = '';
  keys.forEach(uid => {
    const u = state.urunler.find(x => x.id === uid);
    if (!u) return;
    const k   = state.wizard.secilenUrunler[uid];
    const ara = calcAra(k);
    rows += `
    <tr id="kalem-row-${uid}">
      <td style="color:var(--text);font-weight:600;font-family:var(--font-body)">${escHtml(u.ad)}</td>
      <td>
        <input class="qty-input" type="number"
          id="qty-${uid}"
          value="${k.miktar}"
          min="1" step="1"
          oninput="kalemMiktar('${uid}',this.value)"
          title="Miktar">
      </td>
      <td style="color:var(--text-muted);font-family:var(--font-body)">${escHtml(u.birim)}</td>
      <td>
        <input class="kalem-input" style="width:100px" type="number"
          id="fiyat-${uid}"
          value="${k.birimFiyat}"
          step="0.01" min="0"
          oninput="kalemFiyat('${uid}',this.value)"
          title="Birim fiyat">
      </td>
      <td style="white-space:nowrap">
        <input class="kalem-input" style="width:60px" type="number"
          id="iskonto-${uid}"
          value="${k.iskonto}"
          min="0" max="100" step="1"
          oninput="kalemIskonto('${uid}',this.value)"
          title="İskonto">
        <span style="color:var(--text-muted);font-size:0.82rem">%</span>
      </td>
      <td style="text-align:right;font-family:var(--font-display);font-weight:700;color:var(--text)" id="ara-${uid}">${formatTutar(ara, state.wizard.currency)}</td>
      <td>
        <button class="btn btn-danger btn-sm btn-icon" onclick="toggleUrun('${uid}')" title="Kaldır" style="font-size:0.75rem">✕</button>
      </td>
    </tr>`;
  });

  const { araToplam, kdvTutar, genel } = calcTotals();
  const cur = state.wizard.currency;

  wrap.innerHTML = `
    <table class="kalem-table">
      <thead>
        <tr>
          <th>Ürün</th>
          <th>Miktar</th>
          <th>Birim</th>
          <th>Birim Fiyat</th>
          <th>İskonto</th>
          <th style="text-align:right">Ara Toplam</th>
          <th></th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
      <tfoot id="kalem-tfoot">
        <tr>
          <td colspan="5" style="text-align:right;color:var(--text-muted);font-size:0.8rem;padding:8px 10px;font-family:var(--font-body)">Ara Toplam</td>
          <td style="text-align:right;font-weight:600;padding:8px 10px;font-family:var(--font-body)" id="tfoot-ara">${formatTutar(araToplam, cur)}</td>
          <td></td>
        </tr>
        <tr>
          <td colspan="5" style="text-align:right;color:var(--text-muted);font-size:0.8rem;padding:4px 10px;font-family:var(--font-body)" id="tfoot-kdv-label">KDV (%${state.wizard.kdv})</td>
          <td style="text-align:right;font-weight:600;padding:4px 10px;font-family:var(--font-body)" id="tfoot-kdv">${formatTutar(kdvTutar, cur)}</td>
          <td></td>
        </tr>
        <tr style="border-top:2px solid var(--border)">
          <td colspan="5" style="text-align:right;font-weight:700;font-size:0.9rem;padding:10px;font-family:var(--font-display)">GENEL TOPLAM</td>
          <td style="text-align:right;font-weight:800;font-size:1rem;color:var(--accent);padding:10px;font-family:var(--font-display)" id="tfoot-genel">${formatTutar(genel, cur)}</td>
          <td></td>
        </tr>
      </tfoot>
    </table>`;
  updateKaynakPara();
  updateKurBox();
}

// Anlık toplam hesapla — tablo yeniden render etmeden sadece ilgili hücreleri güncelle
function updateKalemTotals(changedUid) {
  // Değişen satırın ara toplamını güncelle
  if (changedUid) {
    const k   = state.wizard.secilenUrunler[changedUid];
    const ara = k ? calcAra(k) : 0;
    const araEl = document.getElementById(`ara-${changedUid}`);
    if (araEl) araEl.textContent = formatTutar(ara, state.wizard.currency);
  }
  // Tüm toplam satırlarını güncelle
  const { araToplam, kdvTutar, genel } = calcTotals();
  const cur = state.wizard.currency;
  const set = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
  set('tfoot-ara',   formatTutar(araToplam, cur));
  set('tfoot-kdv',   formatTutar(kdvTutar,  cur));
  set('tfoot-genel', formatTutar(genel,      cur));
}

// Kur çevrimi: kaynak para biriminden teklif para birimine
// Kur her zaman "1 yabancı birim = kur TL" biçiminde girilir.
// Sistem çarpma/bölme yönünü kendi seçer.
function convertTutar(tutar) {
  const kaynak = state.wizard.kaynakPara || state.wizard.currency;
  const hedef  = state.wizard.currency;
  if (kaynak === hedef) return tutar;              // aynı birim → çevrim yok
  const kur = parseFloat(state.wizard.kur) || 1;
  // Kur her zaman "1 [büyük birim] = kur [TRY]" biçiminde girilir.
  // Yön kararı: TRY tarafına göre çarp/böl.
  if (hedef === 'TRY' && kaynak !== 'TRY') {
    // yabancı → TL : çarp (1 kaynak = kur TL)
    return tutar * kur;
  }
  if (kaynak === 'TRY' && hedef !== 'TRY') {
    // TL → yabancı : böl (1 hedef = kur TL)
    return kur ? tutar / kur : tutar;
  }
  // İki taraf da yabancı (örn USD → EUR ya da USD → CFA):
  // kur "1 kaynak = kur hedef" olarak yorumlanır → çarp
  return tutar * kur;
}

function calcAra(k) {
  const ham = k.miktar * k.birimFiyat * (1 - k.iskonto / 100);
  return convertTutar(ham);
}

function calcTotals() {
  let araToplam = 0;
  Object.values(state.wizard.secilenUrunler).forEach(k => { araToplam += calcAra(k); });
  const kdvTutar = araToplam * (state.wizard.kdv / 100);
  return { araToplam, kdvTutar, genel: araToplam + kdvTutar };
}

function kalemMiktar(id, val) {
  const k = state.wizard.secilenUrunler[id];
  if (!k) return;
  const v = parseInt(val);
  k.miktar = (!v || v < 1) ? 1 : v;
  updateKalemTotals(id);
}

function kalemFiyat(id, val) {
  const k = state.wizard.secilenUrunler[id];
  if (!k) return;
  k.birimFiyat = parseFloat(val) || 0;
  updateKalemTotals(id);
}

function kalemIskonto(id, val) {
  const k = state.wizard.secilenUrunler[id];
  if (!k) return;
  k.iskonto = Math.min(100, Math.max(0, parseFloat(val) || 0));
  updateKalemTotals(id);
}

// KDV kutusu değişince: state güncelle + canlı toplam + label yenile
function onKdvChange() {
  const el = document.getElementById('w-kdv');
  let v = parseInt(el?.value);
  if (isNaN(v) || v < 0) v = 0;
  if (v > 100) v = 100;
  state.wizard.kdv = v;
  // KDV yüzde etiketini güncelle
  const lbl = document.getElementById('tfoot-kdv-label');
  if (lbl) lbl.textContent = `KDV (%${v})`;
  updateKalemTotals(null);
}

// Para birimi sekmelerini render et: sabit TRY/USD/EUR + özel paralar + "+ Özel"
function renderCurrencyTabs() {
  const wrap = document.getElementById('w-currency-tabs');
  if (!wrap) return;
  const sabit = [
    { code:'TRY', label:'₺ TRY' },
    { code:'USD', label:'$ USD' },
    { code:'EUR', label:'€ EUR' },
  ];
  const ozel = (state.ozelParalar || []).map(c => ({ code:c, label:c }));
  const hepsi = [...sabit, ...ozel];
  const aktif = state.wizard.currency || 'TRY';

  let html = hepsi.map(c =>
    `<div class="currency-tab${c.code===aktif?' active':''}" onclick="setCurrency('${c.code}',this)">${escHtml(c.label)}</div>`
  ).join('');
  // "+ Özel" ekleme butonu
  html += `<div class="currency-tab currency-tab-add" onclick="promptOzelPara()" title="Özel para birimi ekle">+ Özel</div>`;
  wrap.innerHTML = html;
}

// Özel para birimi ekleme (kod sorulur)
function promptOzelPara() {
  const kod = (prompt('Para birimi kısaltması girin (örn: CFA, GBP, RUB):') || '').trim().toUpperCase();
  if (!kod) return;
  if (kod.length > 5) { toast('Kısaltma en fazla 5 karakter olmalı.', 'error'); return; }
  const mevcutlar = ['TRY','USD','EUR', ...(state.ozelParalar||[])];
  if (mevcutlar.includes(kod)) {
    // Zaten varsa direkt seç
    setCurrency(kod, null);
    renderCurrencyTabs();
    toast(`${kod} zaten mevcut, seçildi.`);
    return;
  }
  state.ozelParalar = [...(state.ozelParalar||[]), kod];
  saveState();
  renderCurrencyTabs();
  setCurrency(kod, null);
  renderCurrencyTabs();
  toast(`✓ ${kod} eklendi ve seçildi.`);
}

function setCurrency(cur, el) {
  state.wizard.currency = cur;
  document.querySelectorAll('#w-currency-tabs .currency-tab').forEach(t => t.classList.remove('active'));
  if (el) el.classList.add('active');
  else {
    // programatik çağrı: doğru sekmeyi işaretle
    document.querySelectorAll('#w-currency-tabs .currency-tab').forEach(t => {
      if (t.textContent.trim() === cur || t.textContent.includes(cur)) {
        if (!t.classList.contains('currency-tab-add')) t.classList.add('active');
      }
    });
  }
  updateKaynakPara();
  updateKurBox();
  // Para birimi değişince tüm ara toplamları + tfoot güncelle
  Object.keys(state.wizard.secilenUrunler).forEach(id => {
    const araEl = document.getElementById(`ara-${id}`);
    if (araEl) araEl.textContent = formatTutar(calcAra(state.wizard.secilenUrunler[id]), cur);
  });
  updateKalemTotals(null);
}

// Kur kutusunu göster/gizle + etiketini güncelle
function updateKurBox() {
  const box = document.getElementById('w-kur-box');
  if (!box) return;
  const kaynak = state.wizard.kaynakPara;
  const hedef  = state.wizard.currency;
  const gerekli = kaynak && hedef && kaynak !== hedef;

  if (!gerekli) {
    box.style.display = 'none';
    return;
  }
  box.style.display = 'flex';

  // Etiket: yönü net göster.
  // TRY karışıyorsa "1 yabancı = ? TL"; iki yabancı ise "1 kaynak = ? hedef"
  const lbl = document.getElementById('w-kur-label');
  const hint = document.getElementById('w-kur-hint');
  let labelText, hintText;
  if (hedef === 'TRY' && kaynak !== 'TRY') {
    labelText = `1 ${kaynak} = ? TL`;
    hintText  = `(${kaynak} fiyatlar TL'ye çevrilecek)`;
  } else if (kaynak === 'TRY' && hedef !== 'TRY') {
    labelText = `1 ${hedef} = ? TL`;
    hintText  = `(TL fiyatlar ${hedef}'ye çevrilecek)`;
  } else {
    labelText = `1 ${kaynak} = ? ${hedef}`;
    hintText  = `(${kaynak} fiyatlar ${hedef}'ye çevrilecek)`;
  }
  if (lbl) lbl.textContent = labelText;
  if (hint) hint.textContent = hintText;

  const kurEl = document.getElementById('w-kur');
  if (kurEl && (!kurEl.value || parseFloat(kurEl.value) <= 0)) {
    kurEl.value = state.wizard.kur || 1;
  }
}

// Kur kutusuna yazınca: state güncelle + canlı hesap
function onKurChange() {
  const el = document.getElementById('w-kur');
  let v = parseFloat(el?.value);
  if (isNaN(v) || v < 0) v = 0;
  state.wizard.kur = v;
  // tüm kalem ara toplamlarını ve toplamları yenile
  Object.keys(state.wizard.secilenUrunler).forEach(id => {
    const araEl = document.getElementById(`ara-${id}`);
    if (araEl) araEl.textContent = formatTutar(calcAra(state.wizard.secilenUrunler[id]), state.wizard.currency);
  });
  updateKalemTotals(null);
}

function renderWizardOzet() {
  const m = getMusteriById(state.wizard.musteriId);
  // Wizard state'indeki güncel değerleri al
  state.wizard.kdv        = parseInt(document.getElementById('w-kdv')?.value) || state.wizard.kdv;
  const { araToplam, kdvTutar, genel } = calcTotals();
  const cur = state.wizard.currency;

  document.getElementById('wizard-ozet').innerHTML = `
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px">
      <div>
        <div class="proforma-section-title" style="color:var(--text-dim);border-color:var(--border);font-size:0.7rem;text-transform:uppercase;letter-spacing:.08em;padding-bottom:6px;margin-bottom:10px">Müşteri</div>
        <div style="font-weight:600">${m ? escHtml(musteriDisplayAd(m)) : '—'}</div>
        <div class="text-muted">${m ? escHtml(m.email||'') : ''}</div>
      </div>
      <div>
        <div class="proforma-section-title" style="color:var(--text-dim);border-color:var(--border);font-size:0.7rem;text-transform:uppercase;letter-spacing:.08em;padding-bottom:6px;margin-bottom:10px">Tutarlar</div>
        <div class="text-muted" style="font-size:0.84rem">Ara Toplam: <strong style="color:var(--text)">${formatTutar(araToplam, cur)}</strong></div>
        <div class="text-muted" style="font-size:0.84rem">KDV (%${state.wizard.kdv}): <strong style="color:var(--text)">${formatTutar(kdvTutar, cur)}</strong></div>
        <div style="margin-top:8px;font-weight:700;font-size:1rem;color:var(--accent)">GENEL TOPLAM: ${formatTutar(genel, cur)}</div>
      </div>
    </div>
    <div class="divider"></div>
    <div class="text-muted" style="font-size:0.82rem">
      <strong style="color:var(--text)">Ürün Sayısı:</strong> ${Object.keys(state.wizard.secilenUrunler).length} · 
      <strong style="color:var(--text)">Geçerlilik:</strong> ${state.wizard.gecerlilik || '—'} · 
      <strong style="color:var(--text)">Para Birimi:</strong> ${cur}
    </div>`;
}

function kaydetTeklif() {
  const keys = Object.keys(state.wizard.secilenUrunler);
  if (!state.wizard.musteriId || !keys.length) { toast('Eksik bilgi var.', 'error'); return; }

  const kaynak = state.wizard.kaynakPara || state.wizard.currency;
  const kur    = parseFloat(state.wizard.kur) || 1;

  const kalemler = keys.map(id => {
    const u   = state.urunler.find(x => x.id === id);
    const k   = state.wizard.secilenUrunler[id];
    const ara = calcAra(k);  // teklif para birimine çevrilmiş ara toplam
    // Birim fiyatı da teklif para birimine çevir (tek kalem, iskontosuz)
    const birimFiyatCevrili = convertTutar(k.birimFiyat);
    return {
      urunId: id, urunAd: u?.ad||'', gorsel: u?.gorsel||'', birim: u?.birim||'Adet',
      miktar: k.miktar,
      birimFiyat: birimFiyatCevrili,       // proformada gösterilecek (teklif biriminde)
      birimFiyatKaynak: k.birimFiyat,      // orijinal (kaynak birimde)
      iskonto: k.iskonto,
      araToplam: ara
    };
  });

  const { araToplam, kdvTutar, genel } = calcTotals();

  const isEdit = !!state.wizard.editId;
  const mevcut = isEdit ? state.teklifler.find(x => x.id === state.wizard.editId) : null;

  const teklif = {
    id:          isEdit ? state.wizard.editId : uid(),
    teklifNo:    isEdit && mevcut ? mevcut.teklifNo : generateTeklifNo(),
    musteriId:   state.wizard.musteriId,
    saticiFirmaId: state.wizard.saticiFirmaId || null,
    currency:    state.wizard.currency,
    kaynakPara:  kaynak,
    kur:         kur,
    kalemler,
    kdv:         state.wizard.kdv,
    kdvTutar,
    araToplam,
    toplamKdvli: genel,
    gecerlilik:  state.wizard.gecerlilik,
    not:         state.wizard.not,
    createdAt:   isEdit && mevcut ? mevcut.createdAt : new Date().toISOString()
  };

  if (isEdit) {
    state.teklifler = state.teklifler.map(x => x.id === teklif.id ? teklif : x);
  } else {
    state.teklifler.push(teklif);
  }
  saveState();
  updateBadges();
  toast(isEdit ? '✓ Teklif güncellendi! PDF açılıyor...' : '✓ Proforma teklif oluşturuldu! PDF indiriliyor...');

  // Otomatik PDF göster
  setTimeout(() => goruntuleTeklif(teklif.id), 600);
  navigate('tekliflerim');
}

// =========================================================
// TEKLİF TABLOSU
// =========================================================
function renderTeklifTable(q = '') {
  const tbody = document.getElementById('teklif-tbody');
  const query = q.toLowerCase().trim();
  const list = [...state.teklifler].reverse().filter(t => {
    if (!query) return true;
    const m = getMusteriById(t.musteriId);
    return t.teklifNo.toLowerCase().includes(query) ||
           (m && musteriDisplayAd(m).toLowerCase().includes(query));
  });
  const countEl = document.getElementById('search-count-teklif');
  if (countEl) countEl.textContent = query ? `${list.length} sonuç` : `${state.teklifler.length} teklif`;

  if (!list.length) {
    tbody.innerHTML = `<tr><td colspan="7"><div class="empty-state"><span class="empty-icon">${query ? '🔍' : '📄'}</span><h3>${query ? 'Sonuç bulunamadı' : 'Henüz teklif yok'}</h3></div></td></tr>`;
    return;
  }
  tbody.innerHTML = list.map(t => {
    const m = getMusteriById(t.musteriId);
    return `
    <tr>
      <td>${escHtml(t.teklifNo)}</td>
      <td>${m ? escHtml(musteriDisplayAd(m)) : '—'}</td>
      <td class="hide-mobile">${formatTarih(t.createdAt)}</td>
      <td class="hide-mobile">${t.gecerlilik || '—'}</td>
      <td style="font-weight:600;color:var(--accent)">${formatTutar(t.toplamKdvli, t.currency)}</td>
      <td class="hide-mobile"><span class="badge badge-green">Oluşturuldu</span></td>
      <td class="td-actions">
        <button class="btn btn-ghost btn-sm btn-icon" title="Görüntüle" onclick="goruntuleTeklif('${t.id}')">👁</button>
        <button class="btn btn-primary btn-sm btn-icon" title="PDF İndir" onclick="goruntuleTeklifPdf('${t.id}')">⬇</button>
        <button class="btn btn-ghost btn-sm btn-icon" title="Düzenle" onclick="duzenleTeklif('${t.id}')">✏️</button>
        <button class="btn btn-ghost btn-sm btn-icon" title="Kopyala ve Düzenle" onclick="kopyalaTeklif('${t.id}')">📋</button>
        <button class="btn btn-danger btn-sm btn-icon" title="Sil" onclick="silConfirm('teklif','${t.id}','${escHtml(t.teklifNo)} teklifini silmek istediğinizden emin misiniz?')">🗑</button>
      </td>
    </tr>`;
  }).join('');
}
function filterTeklifler(q) { renderTeklifTable(q); }

// =========================================================
