/**
 * login.js — KSI Mist FMIPA UNY
 * Halaman Login Admin
 * ─────────────────────────────────────────────────────────
 * Cara integrasi API nanti:
 *   1. Ganti URL di konstanta API_LOGIN
 *   2. Sesuaikan nama field request body jika berbeda
 *   3. Sesuaikan nama field token di response JSON
 * ─────────────────────────────────────────────────────────
 */

'use strict';

// ── KONFIGURASI ───────────────────────────────────────────
const API_LOGIN = 'https://web-ksimist-production.up.railway.app/api/auth/login';
// Ganti path ini jika admin.html ada di subfolder berbeda
const ADMIN_PAGE = './admin.html';

// ── CEK JIKA SUDAH LOGIN ──────────────────────────────────
// Kalau token sudah ada, langsung redirect ke admin
(function checkAlreadyLoggedIn() {
    const token = sessionStorage.getItem('ksi_token') || localStorage.getItem('ksi_token');
    if (token) {
        window.location.replace(ADMIN_PAGE);
    }
})();

// ── TOGGLE SHOW/HIDE PASSWORD ─────────────────────────────
document.getElementById('toggle-password').addEventListener('click', function () {
    const input = document.getElementById('password');
    const icon  = this.querySelector('i');
    if (input.type === 'password') {
        input.type = 'text';
        icon.classList.replace('fa-eye', 'fa-eye-slash');
    } else {
        input.type = 'password';
        icon.classList.replace('fa-eye-slash', 'fa-eye');
    }
});

// ── HELPER: TAMPILKAN ERROR ───────────────────────────────
function showError(msg) {
    const box = document.getElementById('alert-error');
    document.getElementById('alert-error-msg').textContent = msg;
    box.classList.remove('hidden');
    box.classList.add('flex');
}

function hideError() {
    const box = document.getElementById('alert-error');
    box.classList.add('hidden');
    box.classList.remove('flex');
}

// ── HELPER: LOADING STATE ─────────────────────────────────
function setLoading(isLoading) {
    const btn = document.getElementById('btn-login');
    if (isLoading) {
        btn.disabled = true;
        btn.innerHTML = '<span class="spinner"></span> Memproses...';
    } else {
        btn.disabled = false;
        btn.innerHTML = '<i class="fas fa-sign-in-alt"></i> Masuk';
    }
}

// ── FORM SUBMIT ───────────────────────────────────────────
document.getElementById('form-login').addEventListener('submit', async function (e) {
    e.preventDefault();
    hideError();

    const username   = document.getElementById('username').value.trim();
    const password   = document.getElementById('password').value;
    const rememberMe = document.getElementById('remember-me').checked;

    if (!username || !password) {
        showError('Username dan password tidak boleh kosong.');
        return;
    }

    setLoading(true);

    try {
        const res = await fetch(API_LOGIN, {
            method:  'POST',
            headers: { 'Content-Type': 'application/json' },
            body:    JSON.stringify({ username, password }),
        });

        const data = await res.json();

        if (!res.ok) {
            // Ambil pesan error dari backend, fallback ke pesan default
            throw new Error(data.message || data.error || 'Username atau password salah.');
        }

        // ── SIMPAN TOKEN ──────────────────────────────────
        // Sesuaikan 'data.token' jika nama field di response berbeda
        // Contoh lain: data.access_token / data.jwt / data.data.token
        const token = data.token;

        if (!token) {
            throw new Error('Token tidak ditemukan di response server.');
        }

        // Remember Me: pakai localStorage (persisten) atau sessionStorage (tab saja)
        if (rememberMe) {
            localStorage.setItem('ksi_token', token);
            // Simpan juga info user jika ada
            if (data.user) localStorage.setItem('ksi_user', JSON.stringify(data.user));
        } else {
            sessionStorage.setItem('ksi_token', token);
            if (data.user) sessionStorage.setItem('ksi_user', JSON.stringify(data.user));
        }

        // ── REDIRECT KE ADMIN ─────────────────────────────
        window.location.replace(ADMIN_PAGE);

    } catch (err) {
        showError(err.message);
        setLoading(false);
    }
});

// ── HILANGKAN ERROR SAAT USER MULAI MENGETIK ─────────────
document.getElementById('username').addEventListener('input', hideError);
document.getElementById('password').addEventListener('input', hideError);