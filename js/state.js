'use strict';

// =========================================================
// STATE — Next.js'te Zustand store olacak
// =========================================================
let state = {
  musteriler: [],
  urunler: [],
  teklifler: [],
  ozelParalar: [], // kullanıcının eklediği özel para birimi kodları, örn ['CFA','GBP']
  firmalar: [],    // çoklu satıcı firma (her biri: {id, ad, vergi, adres, ..., varsayilan})
  firma: {
    ad: '', vergi: '', adres: '', tel: '', email: '', web: '',
    banka: '', ibanTry: '', ibanUsd: '', ibanEur: '', logo: ''
  },
  // Wizard geçici state
  wizard: {
    step: 1,
    musteriId: null,
    secilenUrunler: {}, // { urunId: { miktar, birimFiyat, iskonto } }
    currency: 'TRY',
    gecerlilik: '',
    kdv: 20,
    not: ''
  },
  currentTeklifId: null // Modal'da gösterilen teklif
};

// =========================================================
// STORAGE — Next.js'te API katmanı olacak
// =========================================================
const STORAGE_KEY = 'teklif_pro_data';

function saveState() {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch(e) {}
  // PocketBase'e arka planda senkronize et (çevrimdışıysa sessizce atlanır)
  try { if (typeof dbSync === 'function') dbSync(); } catch(e) {}
}

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const loaded = JSON.parse(raw);
      state.musteriler = loaded.musteriler || [];
      state.urunler    = loaded.urunler    || [];
      state.teklifler  = loaded.teklifler  || [];
      state.firma      = loaded.firma      || state.firma;
      state.ozelParalar = loaded.ozelParalar || [];
      state.firmalar   = loaded.firmalar   || [];

      // Geriye dönük: eski tek firma varsa ve firmalar boşsa, taşı
      if ((!state.firmalar || !state.firmalar.length) && loaded.firma && loaded.firma.ad) {
        state.firmalar = [{
          id: uid(),
          ...loaded.firma,
          varsayilan: true,
          createdAt: new Date().toISOString()
        }];
      }
    }
  } catch(e) {}
}

// =========================================================
