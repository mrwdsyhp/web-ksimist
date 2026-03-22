/**
 * main.js — KSI Mist FMIPA UNY
 * ─────────────────────────────────────────────────────────
 * Susunan Keseluruhan Kod Dinamik (Admin Integrated)
 * ─────────────────────────────────────────────────────────
 */

'use strict';

// ═══════════════════════════════════════════════════════════
// 1. ELEMEN NAVBAR & SKROL
// ═══════════════════════════════════════════════════════════
const navbar  = document.getElementById('navbar');
const backTop = document.getElementById('backTop');

window.addEventListener('scroll', () => {
    if (navbar) navbar.classList.toggle('scrolled', window.scrollY > 20);
    if (backTop) backTop.classList.toggle('visible', window.scrollY > 400);
});

if (backTop) {
    backTop.addEventListener('click', () => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    });
}

// ═══════════════════════════════════════════════════════════
// 2. NAVIGASI MUDAH ALIH (MOBILE TOGGLE)
// ═══════════════════════════════════════════════════════════
const navbarToggle = document.getElementById('navbar-toggle');
const navbarLinks  = document.querySelector('.navbar-links');

if (navbarToggle && navbarLinks) {
    navbarToggle.addEventListener('click', () => {
        navbarLinks.classList.toggle('open');
    });

    navbarLinks.querySelectorAll('a').forEach(link => {
        link.addEventListener('click', () => navbarLinks.classList.remove('open'));
    });
}

// ═══════════════════════════════════════════════════════════
// 3. ANIMASI FADE-UP (Intersection Observer)
// ═══════════════════════════════════════════════════════════
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
// 4. LOGIK PENGURUSAN SECTION KOSONG
// ═══════════════════════════════════════════════════════════
const PETA_SECTION = [
    { wadah: 'wadah-artikel',    section: 'artikel',    footer: 'footer-artikel'    },
    { wadah: 'wadah-info-lomba', section: 'info-lomba', footer: 'footer-info-lomba' },
    { wadah: 'wadah-prestasi',   section: 'prestasi',   footer: 'footer-prestasi'   },
    { wadah: 'wadah-pengumuman', section: 'pengumuman', footer: null                },
];

function sembunyikanSectionKosong() {
    PETA_SECTION.forEach(({ wadah, section, footer }) => {
        const elWadah   = document.getElementById(wadah);
        const elSection = document.getElementById(section);
        const elFooter  = footer ? document.getElementById(footer) : null;

        if (!elWadah || !elSection) return;

        const kosong = elWadah.children.length === 0;
        elSection.style.display = kosong ? 'none' : '';
        if (elFooter) elFooter.style.display = kosong ? 'none' : '';

        const prev = elSection.previousElementSibling;
        if (prev && prev.classList.contains('divider')) {
            prev.style.display = kosong ? 'none' : '';
        }
    });
}

// ═══════════════════════════════════════════════════════════
// 5. HELPER FETCH DATA API
// ═══════════════════════════════════════════════════════════
async function fetchKonten(kategori, limit = 6) {
    try {
        const res = await fetch(`api/get_konten.php?kategori=${kategori}&limit=${limit}`);
        if (!res.ok) throw new Error(`Gagal fetch: ${kategori}`);
        return await res.json();
    } catch (err) {
        console.error(err);
        return [];
    }
}

// ═══════════════════════════════════════════════════════════
// 6. FUNGSI RENDER KOMPONEN GLOBAL (Ticker, Hero, dll)
// ═══════════════════════════════════════════════════════════

function renderTicker(items) {
    const track = document.getElementById('ticker-track');
    const wrap  = document.getElementById('ticker-wrap');
    if (!track || !wrap || items.length === 0) return;

    const semua = [...items, ...items]; // Looping mulus
    track.innerHTML = semua.map((item, i) => `
        <a href="${item.href}">${item.judul}</a>
        ${i < semua.length - 1 ? '<span class="ticker-sep">◆</span>' : ''}
    `).join('');
    wrap.style.display = '';
}

function renderHeroPreview(artikel, lomba) {
    const heroRight = document.getElementById('hero-right');
    const elArtikel = document.getElementById('hero-preview-artikel');
    const elLomba   = document.getElementById('hero-preview-lomba');
    if (!heroRight) return;

    if (artikel && elArtikel) {
        elArtikel.innerHTML = `
            <div class="hero-preview-label">📰 Artikel Terbaru</div>
            <div class="hero-preview-title">${artikel.judul}</div>
            <div class="hero-preview-meta">${artikel.tanggal} · KSI Mist</div>
        `;
        elArtikel.onclick = () => { window.location.href = `artikel.html?id=${artikel.id}`; };
    }
    if (lomba && elLomba) {
        elLomba.innerHTML = `
            <div class="hero-preview-label">🏆 Info Lomba</div>
            <div class="hero-preview-title">${lomba.judul}</div>
            <div class="hero-preview-meta">${lomba.penyelenggara ?? ''}</div>
        `;
        elLomba.onclick = () => { window.location.href = `artikel.html?id=${lomba.id}`; };
    }
    heroRight.style.display = (artikel || lomba) ? '' : 'none';
}

// ═══════════════════════════════════════════════════════════
// 7. RENDER HALAMAN ARTIKEL
// ═══════════════════════════════════════════════════════════
async function initHalamanArtikel() {
    const wadahSorotan = document.getElementById('sorotan-artikel-container');
    const wadahGrid = document.getElementById('wadah-semua-artikel');
    if (!wadahGrid) return;

    const data = await fetchKonten('artikel', 10);
    if (data.length === 0) return;

    if (wadahSorotan) {
        const sorotan = data[0];
        wadahSorotan.innerHTML = `
            <a href="detail.html?id=${sorotan.id}&tipe=artikel" class="card fade-up" style="margin-bottom: 30px; display: block; border-bottom: 4px solid var(--primary);">
                <div class="card-thumb" style="min-height: 400px;">
                    <img src="${sorotan.thumbnail || 'assets/default.jpg'}" style="width:100%; height:100%; object-fit:cover;">
                </div>
                <div class="card-body" style="background: var(--dark); color: var(--white); padding: 24px;">
                    <div style="color: var(--tersiary); font-size: 12px; font-weight: 700; margin-bottom: 8px;">SOROTAN UTAMA • ${sorotan.tanggal}</div>
                    <h2 class="font-bebas" style="font-size: 32px;">${sorotan.judul}</h2>
                </div>
            </a>`;
    }

    const sisanya = wadahSorotan ? data.slice(1) : data;
    wadahGrid.innerHTML = sisanya.map(item => `
        <a href="detail.html?id=${item.id}&tipe=artikel" class="card fade-up">
            <div class="card-thumb" style="min-height: 200px;">
                <img src="${item.thumbnail || 'assets/default.jpg'}" style="width:100%; height:100%; object-fit:cover;">
            </div>
            <div class="card-body" style="padding: 16px 20px;">
                <div style="font-size: 12px; color: var(--text-light); font-weight: 600;">${item.tanggal}</div>
                <h3 class="card-title" style="font-size: 16px;">${item.judul}</h3>
            </div>
        </a>`).join('');
    daftarkanFadeUp();
}

// ═══════════════════════════════════════════════════════════
// 8. RENDER HALAMAN INFO LOMBA
// ═══════════════════════════════════════════════════════════
async function initHalamanLomba() {
    const wadahGrid = document.getElementById('wadah-semua-lomba');
    if (!wadahGrid) return;

    const data = await fetchKonten('info-lomba', 8);
    wadahGrid.innerHTML = data.map(item => `
        <a href="detail.html?id=${item.id}&tipe=lomba" class="card fade-up" style="border-bottom: 3px solid var(--tersiary);">
            <div class="card-thumb" style="aspect-ratio: 4/5;">
                <img src="${item.thumbnail || 'assets/default-poster.jpg'}" style="width:100%; height:100%; object-fit:cover;">
            </div>
            <div class="card-body" style="padding: 16px; text-align: center;">
                <div class="card-tag">${item.status || 'BUKA'}</div>
                <h3 class="card-title">${item.judul}</h3>
                <div style="font-size: 12px; color: var(--text-light);"><i class="fas fa-clock"></i> Deadline: ${item.deadline || '-'}</div>
            </div>
        </a>`).join('');
    daftarkanFadeUp();
}

// ═══════════════════════════════════════════════════════════
// 9. RENDER HALAMAN PRESTASI
// ═══════════════════════════════════════════════════════════
async function initHalamanPrestasi() {
    const wadahGrid = document.getElementById('wadah-semua-prestasi');
    if (!wadahGrid) return;

    const data = await fetchKonten('prestasi', 10);
    const medalMap = { '1': '🥇', '2': '🥈', '3': '🥉' };

    wadahGrid.innerHTML = data.map(item => `
        <div class="card fade-up">
            <div class="card-thumb" style="min-height: 250px;">
                <img src="${item.thumbnail || 'assets/default.jpg'}" style="width:100%; height:100%; object-fit:cover;">
            </div>
            <div class="card-body" style="padding: 16px 20px; border-top: 4px solid var(--primary);">
                <div style="font-size: 11px; color: var(--primary); font-weight: 800;">
                    ${medalMap[item.peringkat] || '🏆'} JUARA ${item.peringkat} • ${item.tingkat}
                </div>
                <h3 class="card-title">${item.judul}</h3>
                <div style="font-size: 12px; color: var(--text-light);">${item.nama_pemenang || ''}</div>
            </div>
        </div>`).join('');
    daftarkanFadeUp();
}

// ═══════════════════════════════════════════════════════════
// 10. RENDER HALAMAN DEPARTEMEN (Dinamik)
// ═══════════════════════════════════════════════════════════
async function initHalamanDepartemen() {
    const wadahDept = document.getElementById('wadah-departemen');
    if (!wadahDept) return;

    const data = await fetchKonten('departemen');
    wadahDept.innerHTML = data.map(dept => `
        <a href="detail-departemen.html?id=${dept.id}" class="card fade-up" style="padding: 40px 20px; text-align: center; border-bottom: 4px solid ${dept.warna || 'var(--primary)'};">
            <div class="poin-icon" style="background: ${dept.warna || 'var(--primary)'}; color: var(--secondary); width: 80px; height: 80px; margin: 0 auto 16px auto; font-size: 36px; display: flex; align-items: center; justify-content: center; border-radius: 50%;">
                <i class="fas ${dept.ikon || 'fa-users'}"></i>
            </div>
            <h3 class="card-title font-bebas" style="font-size: 24px;">${dept.nama}</h3>
            <p class="card-excerpt">${dept.slogan || ''}</p>
        </a>`).join('');
    daftarkanFadeUp();
}

// ═══════════════════════════════════════════════════════════
// 11. INITIALIZATION ORCHESTRATOR
// ═══════════════════════════════════════════════════════════
document.addEventListener('DOMContentLoaded', () => {
    // 1. Jalankan fungsi asas UI
    daftarkanFadeUp();
    sembunyikanSectionKosong();

    // 2. Kenali halaman dan jalankan init yang sesuai
    const path = window.location.pathname;

    if (path.includes('artikel.html')) {
        initHalamanArtikel();
    } else if (path.includes('info-lomba.html')) {
        initHalamanLomba();
    } else if (path.includes('prestasi.html')) {
        initHalamanPrestasi();
    } else if (path.includes('departemen.html')) {
        initHalamanDepartemen();
    } else {
        // Jika di index.html (Utama)
        initKonten(); // Fungsi asal anda untuk muat semua preview di home
    }
});