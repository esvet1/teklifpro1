'use strict';

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
  try {
    const res = await fetch(base + path, {
      ...options,
      signal: ctrl.signal,
      headers: {
        'Content-Type': 'application/json',
        ...(authToken ? { Authorization: authToken } : {}),
        ...(options.headers || {}),
      },
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
  while (true) {
    const data = await pbFetch(
      `/api/collections/${collection}/records?perPage=200&page=${page}&sort=created`
    );
    out.push(...data.items);
    if (page >= data.totalPages || data.totalPages === 0) break;
    page++;
  }
  return out;
}
async function pbCreate(collection, body) {
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
  const uid = getCurrentUserId();
  if (uid) body.user = uid;
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
      // kalemler JSON string olarak gelebilir → parse et
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
    return true;
  } catch (e) {
    console.warn('[db] PB okuma hatası:', e.message);
    PB_ONLINE = false;
    return false;
  }
}

// ---------------------------------------------------------
// SENKRON (saveState → arka plan)
// ---------------------------------------------------------
let _syncQueue = Promise.resolve();
function dbSync() {
  if (!PB_ONLINE) return;
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
    // teklifler.kalemler → JSON alanı (obje olarak gönder, PB serialize eder)
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
  const uid = getCurrentUserId();
  if (uid) body.user = uid;
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
  if (!PB_ONLINE) return;
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
  if (!PB_ONLINE) { console.warn('PB çevrimdışı.'); return; }
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
