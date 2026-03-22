/**
 * main.js — KSI Mist FMIPA UNY (Full Integrated v2)
 * ─────────────────────────────────────────────────────────
 * Menghubungkan semua halaman ke Backend Node.js
 * ─────────────────────────────────────────────────────────
 */

'use strict';

const BASE_URL = 'https://web-ksimist.up.railway.app';
const API_URL  = `${BASE_URL}/api`;

// ═══════════════════════════════════════════════════════════
// 1. UI GLOBAL (NAVBAR, SCROLL, ANIMASI)
// ═══════════════════════════════════════════════════════════
const navbar  = document.getElementById('navbar');
const backTop = document.getElementById('backTop');

window.addEventListener('scroll', () => {
    if (navbar)  navbar.classList.toggle('scrolled', window.scrollY > 20);
    if (backTop) backTop.classList.toggle('visible', window.scrollY > 400);
});

if (backTop) {
    backTop.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
}

const navbarToggle = document.getElementById('navbar-toggle');
const navbarLinks  = document.querySelector('.navbar-links');
if (navbarToggle && navbarLinks) {
    navbarToggle.addEventListener('click', () => navbarLinks.classList.toggle('open'));
}

const fadeObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry, i) => {
        if (entry.isIntersecting) {
            setTimeout(() => entry.target.classList.add('visible'), i * 80);
            fadeObserver.unobserve(entry.target);
        }
    });
}, { threshold: 0.1 });

function daftarkanFadeUp() {
    document.querySelectorAll('.fade-up:not(.visible)').forEach(el => fadeObserver.observe(el));
}

// ═══════════════════════════════════════════════════════════
// 2. CORE FETCH ENGINE
// ═══════════════════════════════════════════════════════════
async function fetchKonten(kategori, limit = 6, extraParams = '') {
    try {
        const res = await fetch(`${API_URL}/konten?kategori=${kategori}&limit=${limit}${extraParams}`);
        if (!res.ok) throw new Error(`Gagal fetch: ${kategori}`);
        return await res.json();
    } catch (err) {
        console.warn('Fetch Error:', err.message);
        return [];
    }
}

// ═══════════════════════════════════════════════════════════
// 3. TICKER (Breaking News)
// ═══════════════════════════════════════════════════════════
function renderTicker(items) {
    const track = document.getElementById('ticker-track');
    const wrap  = document.getElementById('ticker-wrap');
    if (!track || !wrap || items.length === 0) return;
    const semua = [...items, ...items];
    track.innerHTML = semua.map((item, i) => `
        <a href="${item.href || '#'}">${item.judul}</a>
        ${i < semua.length - 1 ? '<span class="ticker-sep">◆</span>' : ''}
    `).join('');
    wrap.style.display = 'block';
}

// ═══════════════════════════════════════════════════════════
// 4. HALAMAN ARTIKEL
// ═══════════════════════════════════════════════════════════
async function initHalamanArtikel() {
    const wadah = document.getElementById('wadah-semua-artikel') || document.getElementById('wadah-artikel');
    if (!wadah) return;

    const data = await fetchKonten('artikel', 12);
    if (!data.length) {
        wadah.innerHTML = '<p style="text-align:center;color:var(--muted);padding:40px 0;">Belum ada artikel.</p>';
        return;
    }
    wadah.innerHTML = data.map(item => `
        <a href="detail.html?id=${item.id}&tipe=artikel" class="card fade-up">
            <div class="card-thumb">
                <img src="${item.thumbnail_url || 'assets/logo/images.jpg'}" alt="${item.judul}" style="width:100%;height:100%;object-fit:cover;" loading="lazy">
            </div>
            <div class="card-body">
                ${item.jenis_artikel ? `<div class="card-tag">${item.jenis_artikel}</div>` : ''}
                <div class="card-date">${item.tanggal ? new Date(item.tanggal).toLocaleDateString('id-ID',{day:'2-digit',month:'long',year:'numeric'}) : ''}</div>
                <h3 class="card-title">${item.judul}</h3>
            </div>
        </a>`).join('');
    daftarkanFadeUp();
}

// ═══════════════════════════════════════════════════════════
// 5. HALAMAN INFO LOMBA
// ═══════════════════════════════════════════════════════════
async function initHalamanLomba() {
    const wadah = document.getElementById('wadah-info-lomba');
    if (!wadah) return;

    const data = await fetchKonten('info-lomba', 24);
    if (!data.length) {
        wadah.innerHTML = '<p style="text-align:center;color:var(--muted);padding:40px 0;">Belum ada info lomba.</p>';
        return;
    }

    const now = new Date();
    wadah.innerHTML = data.map(item => {
        const expired = item.deadline && new Date(item.deadline) < now;
        const ddl     = item.deadline ? new Date(item.deadline).toLocaleDateString('id-ID',{day:'2-digit',month:'long',year:'numeric'}) : null;
        return `
        <a href="detail.html?id=${item.id}&tipe=lomba" class="card fade-up" style="border-bottom: 3px solid var(--tersiary); ${expired ? 'opacity:0.6;' : ''}">
            <div class="card-thumb" style="aspect-ratio: 4/5;">
                <img src="${item.thumbnail_url || 'assets/logo/images.jpg'}" alt="${item.judul}" style="width:100%;height:100%;object-fit:cover;" loading="lazy">
            </div>
            <div class="card-body" style="text-align:center;">
                ${item.jenis ? `<div class="card-tag">${item.jenis}</div>` : ''}
                <h3 class="card-title">${item.judul}</h3>
                ${item.tingkat ? `<div style="font-size:11px;color:var(--muted);margin-top:4px;">${item.tingkat}</div>` : ''}
                ${ddl ? `<div style="font-size:11px;margin-top:6px;font-weight:700;color:${expired ? 'var(--muted)' : 'var(--primary)'};">${expired ? 'Deadline: ' : '⏰ Deadline: '}${ddl}</div>` : ''}
            </div>
        </a>`;
    }).join('');
    daftarkanFadeUp();
}

// ═══════════════════════════════════════════════════════════
// 6. HALAMAN PRESTASI
// ═══════════════════════════════════════════════════════════
async function initHalamanPrestasi() {
    const wadah = document.getElementById('wadah-prestasi');
    if (!wadah) return;

    const data = await fetchKonten('prestasi', 24);
    if (!data.length) {
        wadah.innerHTML = '<p style="text-align:center;color:var(--muted);padding:40px 0;">Belum ada data prestasi.</p>';
        return;
    }

    const medalMap = { '1':'🥇', '2':'🥈', '3':'🥉' };
    wadah.innerHTML = data.map(item => `
        <div class="card fade-up">
            <div class="card-thumb" style="min-height:220px;">
                <img src="${item.thumbnail_url || 'assets/logo/images.jpg'}" alt="${item.judul}" style="width:100%;height:100%;object-fit:cover;" loading="lazy">
            </div>
            <div class="card-body" style="border-top:4px solid var(--primary);">
                <div style="font-size:11px;color:var(--primary);font-weight:800;margin-bottom:4px;">
                    ${medalMap[item.peringkat] || '🏆'} ${item.peringkat ? 'JUARA ' + item.peringkat : 'PRESTASI'}
                    ${item.tingkat_prestasi ? ` · ${item.tingkat_prestasi.toUpperCase()}` : ''}
                </div>
                <h3 class="card-title">${item.judul}</h3>
                ${item.nama_kompetisi ? `<div style="font-size:12px;color:var(--muted);margin-top:4px;">${item.nama_kompetisi}</div>` : ''}
                ${item.anggota_tim    ? `<div style="font-size:11px;color:var(--muted);margin-top:6px;font-style:italic;">${item.anggota_tim}</div>` : ''}
            </div>
        </div>`).join('');
    daftarkanFadeUp();
}

// ═══════════════════════════════════════════════════════════
// 7. HALAMAN DEPARTEMEN
// ═══════════════════════════════════════════════════════════
async function initHalamanDepartemen() {
    const wadah = document.getElementById('wadah-departemen');
    if (!wadah) return;

    try {
        const res  = await fetch(`${API_URL}/departemen`);
        const data = await res.json();

        // Sembunyikan Pengurus Inti dari grid departemen publik
        const publik = data;

        wadah.innerHTML = publik.map(dept => `
            <a href="detail-departemen.html?id=${dept.id}" class="card fade-up" style="padding:40px 20px;text-align:center;border-bottom:4px solid ${dept.warna};">
                <div class="poin-icon" style="background:${dept.warna};color:var(--secondary);width:80px;height:80px;margin:0 auto 16px;font-size:36px;display:flex;align-items:center;justify-content:center;border-radius:50%;">
                    <i class="fas ${dept.ikon || 'fa-users'}"></i>
                </div>
                <h3 class="card-title font-bebas" style="font-size:24px;">${dept.nama}</h3>
                <p class="card-excerpt">${dept.slogan || ''}</p>
            </a>`).join('');
        daftarkanFadeUp();
    } catch (err) { console.warn(err); }
}

// ═══════════════════════════════════════════════════════════
// 8. HALAMAN DETAIL DEPARTEMEN
// ═══════════════════════════════════════════════════════════
async function initHalamanDetailDepartemen() {
    const wadahPimpinan = document.getElementById('wadah-pimpinan');
    if (!wadahPimpinan) return;

    const urlParams = new URLSearchParams(window.location.search);
    const deptId    = urlParams.get('id');
    if (!deptId) return;

    try {
        // Info departemen
        const dept = await fetch(`${API_URL}/departemen/${deptId}`).then(r => r.json());
        if (dept) {
            const elNama = document.getElementById('nama-departemen-detail');
            const elDesk = document.getElementById('deskripsi-departemen-detail');
            if (elNama) elNama.innerHTML = dept.kode === 'INTI'
                ? `<span>${dept.nama}</span>`
                : `Departemen <span>${dept.nama}</span>`;
            if (elDesk) elDesk.textContent = dept.deskripsi || '';
        }

        // Anggota departemen
        const anggota = await fetch(`${API_URL}/pengurus?dept_id=${deptId}`).then(r => r.json());

        const renderList = (targetId, sectionId, dividerClass, levelKey) => {
            const target   = document.getElementById(targetId);
            const section  = document.getElementById(sectionId);
            const divider  = document.querySelector(`.${dividerClass}`);
            const filtered = anggota.filter(m => m.jabatan_level === levelKey);

            if (filtered.length > 0 && target && section) {
                target.innerHTML = filtered.map(m => `
                    <div class="member-card fade-up">
                        <img src="${m.foto_url}" class="member-photo" alt="${m.nama}" loading="lazy" onerror="this.src='https://ui-avatars.com/api/?name=${encodeURIComponent(m.nama)}&background=8B1A1A&color=FDF3C0'">
                        <div class="member-name">${m.nama}</div>
                        <div class="member-role">${m.jabatan}</div>
                        ${m.prodi ? `<div class="member-role" style="font-size:11px;opacity:0.6">${m.prodi}</div>` : ''}
                    </div>`).join('');
                section.style.display = 'block';
                if (divider) divider.style.display = 'block';
            }
        };

        renderList('wadah-pimpinan', 'section-pimpinan', 'divider-pimpinan', 'kepala');
        renderList('wadah-ahli',     'section-ahli',     'divider-ahli',     'staf_ahli');
        renderList('wadah-staf',     'section-staf',     '',                 'staf');
        daftarkanFadeUp();

    } catch (err) { console.warn(err); }
}

// ═══════════════════════════════════════════════════════════
// 9. HALAMAN HUBUNGI KAMI
// ═══════════════════════════════════════════════════════════
function initHalamanKontak() {
    const form = document.querySelector('form');
    if (!form || !window.location.pathname.includes('hubungi-kami')) return;

    form.onsubmit = async (e) => {
        e.preventDefault();
        const btn    = form.querySelector('button[type="submit"]');
        const inputs = form.querySelectorAll('input, textarea');
        btn.innerHTML = 'Mengirim... <i class="fas fa-spinner fa-spin"></i>';
        btn.disabled  = true;

        const payload = {
            nama:   inputs[0].value,
            email:  inputs[1].value,
            subjek: inputs[2].value,
            isi:    inputs[3].value
        };

        try {
            const res    = await fetch(`${API_URL}/pesan`, { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify(payload) });
            const result = await res.json();
            if (!res.ok) throw new Error(result.error);
            alert(result.message);
            form.reset();
        } catch (err) {
            alert('Gagal mengirim pesan: ' + err.message);
        } finally {
            btn.innerHTML = 'Kirim Sekarang <i class="fas fa-paper-plane"></i>';
            btn.disabled  = false;
        }
    };
}

// ═══════════════════════════════════════════════════════════
// 10. BOOTSTRAPPER
// ═══════════════════════════════════════════════════════════
document.addEventListener('DOMContentLoaded', () => {
    daftarkanFadeUp();

    // Ticker
    fetchKonten('ticker', 10).then(data => renderTicker(data));

    // Inisialisasi per halaman berdasarkan elemen yang ada
    if (document.getElementById('wadah-artikel'))          initHalamanArtikel();
    if (document.getElementById('wadah-semua-artikel'))    initHalamanArtikel();
    if (document.getElementById('wadah-info-lomba'))       initHalamanLomba();
    if (document.getElementById('wadah-prestasi'))         initHalamanPrestasi();
    if (document.getElementById('wadah-departemen'))       initHalamanDepartemen();
    if (document.getElementById('wadah-pimpinan'))         initHalamanDetailDepartemen();

    initHalamanKontak();
});