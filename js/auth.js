'use strict';

// =========================================================
// AUTH — PocketBase 'users' koleksiyonu üzerinden e-posta/şifre girişi
// ---------------------------------------------------------
// PocketBase collection kuralları (musteriler/urunler/teklifler/firmalar/ayarlar)
// artık "@request.auth.id != '' && user = @request.auth.id" gerektiriyor.
// Bu dosya olmadan hiçbir istek başarılı olmaz — her istek 403 döner ve
// uygulama sessizce localStorage moduna düşer (senkron çalışmaz).
// =========================================================

const AUTH_STORAGE_KEY = 'teklif_pro_auth';

let authToken = null;
let authUser  = null; // { id, email }

function authLoadSession() {
  try {
    const raw = localStorage.getItem(AUTH_STORAGE_KEY);
    if (!raw) return false;
    const s = JSON.parse(raw);
    if (!s.token || !s.user) return false;
    authToken = s.token;
    authUser  = s.user;
    return true;
  } catch (e) { return false; }
}

function authSaveSession(token, record) {
  authToken = token;
  authUser  = { id: record.id, email: record.email, plan: record.plan || 'free' };
  try { localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify({ token, user: authUser })); } catch (e) {}
}

function authClearSession() {
  authToken = null;
  authUser  = null;
  try { localStorage.removeItem(AUTH_STORAGE_KEY); localStorage.removeItem('teklif_pro_data'); } catch (e) {}
}

function getCurrentUserId() {
  return authUser ? authUser.id : null;
}

function getUserPlan() {
  return authUser && authUser.plan ? authUser.plan : 'free';
}
function isPremium() {
  return getUserPlan() === 'premium';
}

async function authRequest(path, body) {
  const base = pbBaseUrl();
  if (!base) throw new Error('PB adresi yok (file:// modu)');
  const res = await fetch(base + path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || ('İstek başarısız (' + res.status + ')'));
  return data;
}

async function authLogin(email, password) {
  const data = await authRequest('/api/collections/users/auth-with-password', {
    identity: email, password,
  });
  authSaveSession(data.token, data.record);
  return data;
}

async function authRegister(email, password, passwordConfirm) {
  await authRequest('/api/collections/users/records', {
    email, password, passwordConfirm, emailVisibility: true,
  });
  return authLogin(email, password);
}

// Kayıtlı oturumun hâlâ geçerli olup olmadığını PocketBase'e sorar.
// Token geçersizse (silinmiş/expire) oturumu temizler.
// Ağ hatasında (PB'ye ulaşılamıyor) oturumu koruyup true döner — çevrimdışı localStorage ile devam edilir.
async function authVerifySession() {
  if (!authToken) return false;
  const base = pbBaseUrl();
  if (!base) return true;
  try {
    const res = await fetch(base + '/api/collections/users/auth-refresh', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + authToken },
    });
    if (!res.ok) { authClearSession(); return false; }
    const data = await res.json();
    authSaveSession(data.token, data.record);
    return true;
  } catch (e) {
    // Ağ hatası — token'ın süresini kontrol et
    if (typeof isTokenExpired === 'function' && isTokenExpired(authToken)) {
      authClearSession();
      return false;
    }
    return true;
  }
}

function authLogout() {
  authClearSession();
  location.href = 'signin.html';
}

// ---------------------------------------------------------
// UI — index.html (dashboard) tarafında oturum kontrolü
// ---------------------------------------------------------
function showApp() {
  const userEl = document.getElementById('sidebar-user');
  if (userEl) {
    const email = authUser ? authUser.email : '';
    const premium = isPremium();
    const rozet = `<span class="plan-badge ${premium ? 'plan-premium' : 'plan-free'}">${premium ? 'PREMIUM' : 'FREE'}</span>`;
    userEl.innerHTML = email ? `<span class="sidebar-user-email">${email.replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]))}</span>${rozet}` : '';
  }
}

// index.html açılışında oturum yoksa/ geçersizse signin.html'e yönlendirir.
async function requireAuthOrRedirect() {
  const hasSession = authLoadSession();
  if (!hasSession) { location.href = 'signin.html'; return false; }
  const sessionValid = await authVerifySession();
  if (!sessionValid) { location.href = 'signin.html'; return false; }
  showApp();
  return true;
}

// ---------------------------------------------------------
// UI — signin.html / signup.html
// ---------------------------------------------------------
let _loginAttempts = 0;
let _loginLockUntil = 0;

async function submitLogin() {
  const email = document.getElementById('auth-login-email').value.trim();
  const pass  = document.getElementById('auth-login-pass').value;
  const errEl = document.getElementById('auth-error');
  errEl.textContent = '';
  // Rate limiting
  if (Date.now() < _loginLockUntil) {
    const sn = Math.ceil((_loginLockUntil - Date.now()) / 1000);
    errEl.textContent = `Çok fazla deneme. ${sn} saniye bekleyin.`;
    return;
  }
  if (!email || !pass) { errEl.textContent = 'E-posta ve şifre zorunludur.'; return; }
  if (typeof isValidEmail === 'function' && !isValidEmail(email)) {
    errEl.textContent = 'Geçerli bir e-posta adresi girin.'; return;
  }
  try {
    await authLogin(email, pass);
    _loginAttempts = 0;
    location.href = 'index.html';
  } catch (e) {
    _loginAttempts++;
    if (_loginAttempts >= 5) {
      _loginLockUntil = Date.now() + 30000; // 30 saniye kilitle
      errEl.textContent = 'Çok fazla başarısız deneme. 30 saniye bekleyin.';
    } else {
      errEl.textContent = 'Giriş başarısız: ' + e.message;
    }
  }
}

async function submitRegister() {
  const email = document.getElementById('auth-reg-email').value.trim();
  const pass  = document.getElementById('auth-reg-pass').value;
  const pass2 = document.getElementById('auth-reg-pass2').value;
  const errEl = document.getElementById('auth-error');
  errEl.textContent = '';
  if (!email || !pass) { errEl.textContent = 'E-posta ve şifre zorunludur.'; return; }
  if (pass.length < 8) { errEl.textContent = 'Şifre en az 8 karakter olmalı.'; return; }
  if (!/[a-z]/.test(pass) || !/[A-Z]/.test(pass) || !/\d/.test(pass)) {
    errEl.textContent = 'Şifre en az 1 küçük harf, 1 büyük harf ve 1 rakam içermelidir.'; return;
  }
  if (pass !== pass2) { errEl.textContent = 'Şifreler eşleşmiyor.'; return; }
  try {
    await authRegister(email, pass, pass2);
    location.href = 'index.html';
  } catch (e) {
    errEl.textContent = 'Kayıt başarısız: ' + e.message;
  }
}

// ---------------------------------------------------------
// Google OAuth2 (PocketBase SDK ile)
// ---------------------------------------------------------
async function loginWithGoogle() {
  const errEl = document.getElementById('auth-error');
  if (errEl) errEl.textContent = '';
  try {
    if (typeof PocketBase === 'undefined') {
      throw new Error('OAuth bileşeni yüklenemedi, sayfayı yenileyin.');
    }
    const pb = new PocketBase(pbBaseUrl());
    const authData = await pb.collection('users').authWithOAuth2({ provider: 'google' });
    // Oturumu kendi formatımıza kaydet (db.js/auth.js ile uyumlu)
    authSaveSession(pb.authStore.token, authData.record);
    // Yeni Google kullanıcısına plan atanmamışsa free yap
    if (!authData.record.plan) {
      try {
        await pb.collection('users').update(authData.record.id, { plan: 'free' });
      } catch (e) {}
    }
    location.href = 'index.html';
  } catch (e) {
    if (errEl) errEl.textContent = 'Google ile giriş başarısız: ' + (e.message || e);
  }
}
