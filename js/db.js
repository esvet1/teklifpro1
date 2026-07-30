'use strict'; // v2.1

// =========================================================
// DB — PocketBase veri katmanı (v2 — çoklu firma + özel para + VPS)
// ---------------------------------------------------------
// Mantık:
//  - Açılışta PocketBase'ten okumayı dener; ulaşamazsa localStorage'a düşer.
//  - Her saveState'te arka planda PocketBase'e senkron eder (UI beklemez).
//  - Uygulama PocketBase'in pb_public'inden servis edilirse adres otomatik bulunur.
// =========================================================

// Adres tespiti:
//  1. Eğer sayfa PocketBase'ten servis ediliyorsa (pb_public), origin = PB adresidir.
//  2. Aksi halde (yerel dosya / farklı sunucu) elle PB_URL_OVERRIDE kullanılır.
const PB_URL_OVERRIDE = 'http://pocketbase-luc2wdg46yxt9tuj99ewy6on.89.144.20.164.sslip.io'; // VPS PocketBase adresi

function pbBaseUrl() {
  if (PB_URL_OVERRIDE) return PB_URL_OVERRIDE.replace(/\/$/, '');
  // file:// ise origin 'null' olur → localStorage moduna düş
  if (location.protocol === 'file:') return '';
  return location.origin; // pb_public'ten servis edilince doğru adres budur
}

let PB_ONLINE = false;
let PB_TOKEN = localStorage.getItem('pb_token') || '';
let PB_USER = null;
try {
  const savedUser = localStorage.getItem('pb_user');
  if (savedUser) PB_USER = JSON.parse(savedUser);
} catch(e) {}

// localId (bizim uid) -> PocketBase record id eşlemesi
const PB_IDMAP = {
  musteriler: {},
  urunler: {},
  teklifler: {},
  firmalar: {},
};

// ayarlar tablosunda 'ozelParalar' kaydının PB id'si
let PB_AYAR_OZELPARA_RECID = null;

// ---------------------------------------------------------
// Düşük seviyeli REST
// ---------------------------------------------------------
async function pbFetch(path, options = {}, timeoutMs = 5000) {
  const base = pbBaseUrl();
  if (!base) throw new Error('PB adresi yok (file:// modu)');
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  
  const headers = { 
    'Content-Type': 'application/json', 
    ...(options.headers || {}) 
  };
  
  // Eğer aktif token varsa authorization header ekle
  if (PB_TOKEN) {
    headers['Authorization'] = PB_TOKEN;
  }
  
  try {
    const res = await fetch(base + path, {
      ...options,
      signal: ctrl.signal,
      headers: headers,
    });
    clearTimeout(t);
    if (!res.ok) {
      const body = await res.text().catch(() => '');
      throw new Error('PB ' + res.status + ': ' + body);
    }
    if (res.status === 204) return null;
    return await res.json();
  } catch (e) {
    clearTimeout(t);
    throw e;
  }
}

async function pbList(collection) {
  const out = [];
  let page = 1;
  // Sadece aktif kullanıcının verilerini çekmek için filtre ekle
  const filterQuery = PB_USER ? `&filter=(user='${PB_USER.id}')` : '';
  
  while (true) {
    const data = await pbFetch(
      `/api/collections/${collection}/records?perPage=200&page=${page}&sort=created${filterQuery}`
    );
    out.push(...data.items);
    if (page >= data.totalPages || data.totalPages === 0) break;
    page++;
  }
  return out;
}
async function pbCreate(collection, body) {
  // Kayda otomatik aktif kullanıcı ID'sini ekle
  if (PB_USER && collection !== 'ayarlar') {
    body.user = PB_USER.id;
  }
  return await pbFetch(`/api/collections/${collection}/records`, {
    method: 'POST', body: JSON.stringify(body),
  });
}
async function pbUpdate(collection, recId, body) {
  return await pbFetch(`/api/collections/${collection}/records/${recId}`, {
    method: 'PATCH', body: JSON.stringify(body),
  });
}
async function pbDelete(collection, recId) {
  return await pbFetch(`/api/collections/${collection}/records/${recId}`, {
    method: 'DELETE',
  });
}

// ---------------------------------------------------------
// Kayıt <-> state dönüşümü
// ---------------------------------------------------------
function pbRecToObj(rec) {
  const obj = { ...rec };
  obj.id = rec.localId || rec.id;
  obj.createdAt = rec.created;
  delete obj.localId; delete obj.user;
  delete obj.collectionId; delete obj.collectionName;
  delete obj.created; delete obj.updated;
  return obj;
}
function objToPbBody(obj) {
  const body = { ...obj };
  body.localId = obj.id;
  delete body.id;
  delete body.createdAt;
  return body;
}

// ---------------------------------------------------------
// AÇILIŞ: PocketBase'ten yükle
// ---------------------------------------------------------
async function dbBootstrap() {
  try {
    await pbFetch('/api/health', {}, 3000);
    PB_ONLINE = true;
  } catch (e) {
    PB_ONLINE = false;
    console.info('[db] PocketBase erişilemedi, localStorage modunda.');
    showAppLayout(); // Çevrimdışıysa direkt yerel modda aç
    return false;
  }

  // Oturum kontrolü
  if (!PB_TOKEN || !PB_USER) {
    showAuthLayout();
    return false;
  }

  try {
    const [musteriler, urunler, teklifler, firmalar, ayarlar] = await Promise.all([
      pbList('musteriler'),
      pbList('urunler'),
      pbList('teklifler'),
      pbList('firmalar'),
      pbList('ayarlar'),
    ]);

    PB_IDMAP.musteriler = {}; PB_IDMAP.urunler = {};
    PB_IDMAP.teklifler = {};  PB_IDMAP.firmalar = {};

    state.musteriler = musteriler.map(r => { PB_IDMAP.musteriler[r.localId] = r.id; return pbRecToObj(r); });
    state.urunler    = urunler.map(r => { PB_IDMAP.urunler[r.localId] = r.id; return pbRecToObj(r); });
    state.teklifler  = teklifler.map(r => {
      PB_IDMAP.teklifler[r.localId] = r.id;
      const o = pbRecToObj(r);
      if (typeof o.kalemler === 'string') { try { o.kalemler = JSON.parse(o.kalemler); } catch(e){ o.kalemler = []; } }
      return o;
    });
    state.firmalar   = firmalar.map(r => { PB_IDMAP.firmalar[r.localId] = r.id; return pbRecToObj(r); });

    // ayarlar: ozelParalar
    const ozelKaydi = ayarlar.find(a => a.anahtar === 'ozelParalar');
    if (ozelKaydi) {
      PB_AYAR_OZELPARA_RECID = ozelKaydi.id;
      let d = ozelKaydi.deger;
      if (typeof d === 'string') { try { d = JSON.parse(d); } catch(e){ d = []; } }
      state.ozelParalar = Array.isArray(d) ? d : [];
    }

    console.info('[db] PocketBase yüklendi:',
      state.musteriler.length, 'müşteri,', state.urunler.length, 'ürün,',
      state.teklifler.length, 'teklif,', state.firmalar.length, 'firma.');
    
    showAppLayout();
    return true;
  } catch (e) {
    console.warn('[db] PB okuma hatası, oturum geçersiz olabilir. Girişe yönlendiriliyor:', e.message);
    // Token geçersizse temizle ve girişe at
    handleLogout();
    return false;
  }
}

// ---------------------------------------------------------
// SENKRON (saveState → arka plan)
// ---------------------------------------------------------
let _syncQueue = Promise.resolve();
function dbSync() {
  if (!PB_ONLINE || !PB_USER) return;
  _syncQueue = _syncQueue.then(() => _syncAll()).catch(e => {
    console.warn('[db] sync hatası:', e.message);
  });
}

async function _syncCollection(collection, list, opts = {}) {
  const map = PB_IDMAP[collection];
  const stateIds = new Set(list.map(x => x.id));

  // Sil: PB'de var, state'te yok
  for (const localId of Object.keys(map)) {
    if (!stateIds.has(localId)) {
      try { await pbDelete(collection, map[localId]); } catch(e){}
      delete map[localId];
    }
  }
  // Ekle/güncelle
  for (const obj of list) {
    const body = objToPbBody(obj);
    if (collection === 'teklifler') body.kalemler = obj.kalemler || [];
    if (map[obj.id]) {
      try { await pbUpdate(collection, map[obj.id], body); }
      catch(e){ console.warn('[db] update', collection, e.message); }
    } else {
      try { const rec = await pbCreate(collection, body); map[obj.id] = rec.id; }
      catch(e){ console.warn('[db] create', collection, e.message); }
    }
  }
}

async function _syncOzelParalar() {
  const body = { anahtar: 'ozelParalar', deger: state.ozelParalar || [] };
  // Ayarlara da kullanıcı sahipliği ekle
  if (PB_USER) body.user = PB_USER.id;
  try {
    if (PB_AYAR_OZELPARA_RECID) {
      await pbUpdate('ayarlar', PB_AYAR_OZELPARA_RECID, body);
    } else {
      const rec = await pbCreate('ayarlar', body);
      PB_AYAR_OZELPARA_RECID = rec.id;
    }
  } catch(e){ console.warn('[db] ozelPara sync', e.message); }
}

async function _syncAll() {
  if (!PB_ONLINE || !PB_USER) return;
  await _syncCollection('musteriler', state.musteriler);
  await _syncCollection('urunler', state.urunler);
  await _syncCollection('teklifler', state.teklifler);
  await _syncCollection('firmalar', state.firmalar);
  await _syncOzelParalar();
}

// ---------------------------------------------------------
// Manuel: localStorage → PB taşıma (konsoldan dbMigrateFromLocal())
// ---------------------------------------------------------
async function dbMigrateFromLocal() {
  if (!PB_ONLINE || !PB_USER) { console.warn('PB çevrimdışı veya giriş yapılmadı.'); return; }
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) { console.info('localStorage boş.'); return; }
  const local = JSON.parse(raw);
  state.musteriler = local.musteriler || [];
  state.urunler    = local.urunler || [];
  state.teklifler  = local.teklifler || [];
  state.firmalar   = local.firmalar || [];
  state.ozelParalar = local.ozelParalar || [];
  await _syncAll();
  console.info('[db] localStorage → PocketBase taşındı.');
}

// =========================================================
// SAAS AUTH İŞLEMLERİ (Giriş / Kayıt / Çıkış)
// =========================================================

function toggleAuthBox(mode) {
  const loginBox = document.getElementById('auth-login-box');
  const registerBox = document.getElementById('auth-register-box');
  if (mode === 'register') {
    loginBox.style.display = 'none';
    registerBox.style.display = 'block';
  } else {
    loginBox.style.display = 'block';
    registerBox.style.display = 'none';
  }
}

function showAuthLayout() {
  document.getElementById('auth-container').style.display = 'flex';
  document.querySelector('.app-shell').style.display = 'none';
}

function showAppLayout() {
  document.getElementById('auth-container').style.display = 'none';
  document.querySelector('.app-shell').style.display = 'flex';
  if (PB_USER) {
    document.getElementById('sidebar-user-info').textContent = PB_USER.email;
  }
}

async function handleLogin(e) {
  e.preventDefault();
  const btn = document.getElementById('btn-login-submit');
  const email = document.getElementById('auth-login-email').value;
  const password = document.getElementById('auth-login-password').value;
  
  btn.disabled = true;
  btn.textContent = 'Giriş Yapılıyor...';
  
  try {
    const res = await pbFetch('/api/collections/users/auth-with-password', {
      method: 'POST',
      body: JSON.stringify({ identity: email, password: password })
    });
    
    PB_TOKEN = res.token;
    PB_USER = res.record;
    
    localStorage.setItem('pb_token', PB_TOKEN);
    localStorage.setItem('pb_user', JSON.stringify(PB_USER));
    
    toast('Giriş başarılı! Yükleniyor...');
    
    // Verileri çek ve paneli aç
    PB_ONLINE = true;
    const ok = await dbBootstrap();
    if (ok) {
      // Sayfayı tamamen yenilemek state ve UI'ı temiz başlatır
      location.reload();
    }
  } catch (err) {
    console.error(err);
    toast('Giriş başarısız: E-posta veya şifre hatalı.', 'error');
  } finally {
    btn.disabled = false;
    btn.textContent = 'Giriş Yap';
  }
}

async function handleRegister(e) {
  e.preventDefault();
  const btn = document.getElementById('btn-register-submit');
  const name = document.getElementById('auth-register-name').value;
  const email = document.getElementById('auth-register-email').value;
  const password = document.getElementById('auth-register-password').value;
  const passwordConfirm = document.getElementById('auth-register-password-confirm').value;
  
  if (password !== passwordConfirm) {
    toast('Şifreler eşleşmiyor.', 'error');
    return;
  }
  
  if (password.length < 8) {
    toast('Şifre en az 8 karakter olmalıdır.', 'error');
    return;
  }
  
  btn.disabled = true;
  btn.textContent = 'Hesap Oluşturuluyor...';
  
  try {
    // 1) Kullanıcı kaydı oluştur
    await pbFetch('/api/collections/users/records', {
      method: 'POST',
      body: JSON.stringify({
        email: email,
        password: password,
        passwordConfirm: passwordConfirm,
        name: name
      })
    });
    
    toast('Kayıt başarılı! Giriş yapılıyor...');
    
    // 2) Otomatik giriş yap
    const res = await pbFetch('/api/collections/users/auth-with-password', {
      method: 'POST',
      body: JSON.stringify({ identity: email, password: password })
    });
    
    PB_TOKEN = res.token;
    PB_USER = res.record;
    
    localStorage.setItem('pb_token', PB_TOKEN);
    localStorage.setItem('pb_user', JSON.stringify(PB_USER));
    
    location.reload();
  } catch (err) {
    console.error(err);
    toast('Kayıt başarısız. E-posta adresi kullanımda olabilir.', 'error');
  } finally {
    btn.disabled = false;
    btn.textContent = 'Kayıt Ol';
  }
}

function handleLogout(e) {
  if (e) e.preventDefault();
  
  PB_TOKEN = '';
  PB_USER = null;
  localStorage.removeItem('pb_token');
  localStorage.removeItem('pb_user');
  
  // State'i sıfırla
  state.musteriler = [];
  state.urunler = [];
  state.teklifler = [];
  state.firmalar = [];
  
  toast('Oturum kapatıldı.');
  location.reload();
}

