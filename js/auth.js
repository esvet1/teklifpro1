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
  authUser  = { id: record.id, email: record.email };
  try { localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify({ token, user: authUser })); } catch (e) {}
}

function authClearSession() {
  authToken = null;
  authUser  = null;
  try { localStorage.removeItem(AUTH_STORAGE_KEY); } catch (e) {}
}

function getCurrentUserId() {
  return authUser ? authUser.id : null;
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
      headers: { 'Content-Type': 'application/json', 'Authorization': authToken },
    });
    if (!res.ok) { authClearSession(); return false; }
    const data = await res.json();
    authSaveSession(data.token, data.record);
    return true;
  } catch (e) {
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
  if (userEl) userEl.textContent = authUser ? authUser.email : '';
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
async function submitLogin() {
  const email = document.getElementById('auth-login-email').value.trim();
  const pass  = document.getElementById('auth-login-pass').value;
  const errEl = document.getElementById('auth-error');
  errEl.textContent = '';
  if (!email || !pass) { errEl.textContent = 'E-posta ve şifre zorunludur.'; return; }
  try {
    await authLogin(email, pass);
    location.href = 'index.html';
  } catch (e) {
    errEl.textContent = 'Giriş başarısız: ' + e.message;
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
  if (pass !== pass2) { errEl.textContent = 'Şifreler eşleşmiyor.'; return; }
  try {
    await authRegister(email, pass, pass2);
    location.href = 'index.html';
  } catch (e) {
    errEl.textContent = 'Kayıt başarısız: ' + e.message;
  }
}
