// =========================================================
// INIT
// =========================================================
(async function init() {
  // 0) Giriş yapılmamışsa signin.html'e yönlendir
  const authed = await requireAuthOrRedirect();
  if (!authed) return;

  // 1) Önce PocketBase'ten yüklemeyi dene
  let loadedFromPB = false;
  try {
    if (typeof dbBootstrap === 'function') {
      loadedFromPB = await dbBootstrap();
    }
  } catch (e) {
    loadedFromPB = false;
  }

  // 2) PocketBase yoksa localStorage'dan yükle
  if (!loadedFromPB) {
    loadState();
  }

  loadTheme();
  navigate('dashboard');

  // 3) Hiç satıcı firma yoksa örnek bir tane ekle (ilk kurulum kolaylığı)
  if (!state.firmalar || !state.firmalar.length) {
    state.firmalar = [{
      id: uid(),
      ad: 'Firma Adınız',
      vergi: '',
      adres: '',
      tel: '',
      email: '',
      web: '', banka: '', ibanTry: '', ibanUsd: '', ibanEur: '', logo: '',
      varsayilan: true,
      createdAt: new Date().toISOString()
    }];
    saveState();
  }
})();
