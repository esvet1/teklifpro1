// TASARIM AYARLARI
// Next.js: ThemeProvider + localStorage → cookies (SSR için)
// data-color ve data-font attr'ları <html> tag'ına uygulanır
// =========================================================

// Tema tanımları
const COLOR_THEMES = {
  yesil:   { label: 'Yeşil',   hex: '#059669' },
  mavi:    { label: 'Mavi',    hex: '#2563eb' },
  mor:     { label: 'Mor',     hex: '#7c3aed' },
  turuncu: { label: 'Turuncu', hex: '#ea580c' },
  pembe:   { label: 'Pembe',   hex: '#db2777' },
  siyah:   { label: 'Siyah',   hex: '#111118' },
};
const FONT_THEMES = {
  space:    { label: 'Space Grotesk + Inter',    display: 'Space Grotesk' },
  outfit:   { label: 'Outfit + Poppins',         display: 'Outfit' },
  syne:     { label: 'Syne + DM Sans',           display: 'Syne' },
  playfair: { label: 'Playfair + Lato',          display: 'Playfair Display' },
  fraunces: { label: 'Fraunces + Nunito',        display: 'Fraunces' },
  bebas:    { label: 'Bebas Neue + Barlow',      display: 'Bebas Neue' },
};

let activeColor = 'yesil';
let activeFont  = 'space';

function applyTheme(color, font) {
  document.documentElement.setAttribute('data-color', color);
  document.documentElement.setAttribute('data-font',  font);
  // NOT: body.style.fontFamily set edilmiyor — CSS var() cascade'i kırar.
  // [data-font] attribute değişince --font-display/--font-body token'ları
  // otomatik güncellenir, tüm font-family:var(--font-*) referansları anında yansır.
}

function setColorTheme(key, el) {
  activeColor = key;
  applyTheme(activeColor, activeFont);
  saveTheme();
  updateTasarimUI();
}

function setFontTheme(key, el) {
  activeFont = key;
  applyTheme(activeColor, activeFont);
  saveTheme();
  updateTasarimUI();
}

function saveTheme() {
  try { localStorage.setItem('teklif_pro_theme', JSON.stringify({ color: activeColor, font: activeFont })); } catch(e) {}
}

function loadTheme() {
  try {
    const raw = localStorage.getItem('teklif_pro_theme');
    if (raw) { const t = JSON.parse(raw); activeColor = t.color||'yesil'; activeFont = t.font||'space'; }
  } catch(e) {}
  applyTheme(activeColor, activeFont);
}

function initTasarimPage() {
  updateTasarimUI();
}

function updateTasarimUI() {
  // Renk chip'leri — color-chip-2
  document.querySelectorAll('.color-chip-2').forEach(el => {
    el.classList.toggle('active', el.dataset.color === activeColor);
  });
  // Font chip'leri — font-chip-2
  document.querySelectorAll('.font-chip-2').forEach(el => {
    el.classList.toggle('active', el.dataset.font === activeFont);
  });
  // Önizleme paneli güncelle
  const ct = COLOR_THEMES[activeColor];
  const ft = FONT_THEMES[activeFont];
  if (ct) {
    const pColorDot  = document.getElementById('prev-colordot');
    const pColorName = document.getElementById('prev-colorname');
    if (pColorDot)  pColorDot.style.background  = ct.hex;
    if (pColorName) pColorName.textContent       = ct.label;
  }
  if (ft) {
    const pFontName = document.getElementById('prev-fontname');
    const pDot      = document.getElementById('prev-dot'); // artık font adı gösteriyor
    if (pFontName) pFontName.textContent = ft.label;
    if (pDot)      pDot.textContent      = ft.display;
  }
}

