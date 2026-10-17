'use strict';

// =========================================================
// SECURITY — Merkezi güvenlik yardımcıları
// =========================================================

// ID değerini alfanümerik + sınırlı karakterlerle filtrele
function sanitizeId(id) {
  if (!id) return '';
  return String(id).replace(/[^a-zA-Z0-9_\-]/g, '');
}

// URL'yi güvenli protokollerle sınırla (javascript: vb. engelle)
function sanitizeUrl(url) {
  if (!url) return '';
  const s = String(url).trim();
  if (/^https?:\/\//i.test(s) || /^data:image\//i.test(s)) return s;
  return '';
}

// Şifre güçlülük kontrolü
function passwordStrength(pass) {
  if (!pass) return { score: 0, label: 'Boş', css: '' };
  let score = 0;
  if (pass.length >= 8)  score++;
  if (pass.length >= 12) score++;
  if (/[a-z]/.test(pass) && /[A-Z]/.test(pass)) score++;
  if (/\d/.test(pass))    score++;
  if (/[^a-zA-Z0-9]/.test(pass)) score++;
  const labels = ['Çok Zayıf', 'Zayıf', 'Orta', 'İyi', 'Güçlü', 'Çok Güçlü'];
  const css    = ['strength-0', 'strength-1', 'strength-2', 'strength-3', 'strength-4', 'strength-5'];
  return { score, label: labels[score] || 'Çok Güçlü', css: css[score] || 'strength-5' };
}

// Client-side brute force koruması — belirli aralıkta çalıştır
function throttle(fn, ms) {
  let last = 0;
  return function(...args) {
    const now = Date.now();
    if (now - last < ms) {
      toast('Lütfen birkaç saniye bekleyin.', 'error');
      return;
    }
    last = now;
    return fn.apply(this, args);
  };
}

// JWT token'ın expire süresini kontrol et
function isTokenExpired(token) {
  if (!token) return true;
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return true;
    const payload = JSON.parse(atob(parts[1]));
    if (!payload.exp) return false; // exp yoksa süresi dolmamış say
    return (payload.exp * 1000) < Date.now();
  } catch (e) {
    return true;
  }
}

// E-posta format doğrulama
function isValidEmail(email) {
  if (!email) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

// =========================================================
