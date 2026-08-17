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
      ad: 'Redmond Ticaret A.Ş.',
      vergi: '',
      adres: 'Atatürk Cad. No:1, İstanbul',
      tel: '+90 212 000 00 00',
      email: 'info@redmond.com.tr',
      web: '', banka: '', ibanTry: '', ibanUsd: '', ibanEur: '', logo: '',
      varsayilan: true,
      createdAt: new Date().toISOString()
    }];
    saveState();
  }
})();
