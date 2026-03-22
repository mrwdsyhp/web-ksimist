/**
 * main.js — KSI Mist FMIPA UNY
 * ─────────────────────────────────────────────────────────
 * Susunan Keseluruhan Kod Dinamik (Admin Integrated)
 * ─────────────────────────────────────────────────────────
 */

'use strict';

// ═══════════════════════════════════════════════════════════
// 1. ELEMEN NAVBAR, SKROL, & UI GLOBAL
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

// Navigasi Mobile (Hamburger Menu)
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

// Animasi Fade-up (Intersection Observer)
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
// 2. HELPER FETCH DATA API
// ═══════════════════════════════════════════════════════════
async function fetchKonten(kategori, limit = 6, extraParams = '') {
    try {
        const res = await fetch(`api/get_konten.php?kategori=${kategori}&limit=${limit}${extraParams}`);
        if (!res.ok) throw new Error(`Gagal fetch: ${kategori}`);
        return await res.json();
    } catch (err) {
        console.error(err);
        return [];
    }
}

// ═══════════════════════════════════════════════════════════
// 3. LOGIK PENGURUSAN SECTION KOSONG (Khusus index.html)
// ═══════════════════════════════════════════════════════════
function sembunyikanSectionKosong() {
    const PETA_SECTION = [
        { wadah: 'wadah-artikel',    section: 'artikel' },
        { wadah: 'wadah-info-lomba', section: 'info-lomba' },
        { wadah: 'wadah-prestasi',   section: 'prestasi' },
        { wadah: 'wadah-pengumuman', section: 'pengumuman' },
    ];

    PETA_SECTION.forEach(({ wadah, section }) => {
        const elWadah   = document.getElementById(wadah);
        const elSection = document.getElementById(section);

        if (elWadah && elSection) {
            const kosong = elWadah.children.length === 0;
            elSection.style.display = kosong ? 'none' : '';
            
            // Sembunyikan divider sebelumnya jika ada
            const prev = elSection.previousElementSibling;
            if (prev && prev.classList.contains('divider')) {
                prev.style.display = kosong ? 'none' : '';
            }
        }
    });
}

// ═══════════════════════════════════════════════════════════
// 4. RENDER KOMPONEN GLOBAL (Ticker, Hero)
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
    wrap.style.display = '';
}

// ═══════════════════════════════════════════════════════════
// 5. INITIALIZERS PER HALAMAN
// ═══════════════════════════════════════════════════════════

// --- HALAMAN ARTIKEL ---
async function initHalamanArtikel() {
    const wadahGrid = document.getElementById('wadah-semua-artikel');
    if (!wadahGrid) return;

    const data = await fetchKonten('artikel', 12);
    if (data.length === 0) return;

    wadahGrid.innerHTML = data.map(item => `
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

// --- HALAMAN INFO LOMBA ---
async function initHalamanLomba() {
    const wadahGrid = document.getElementById('wadah-info-lomba');
    if (!wadahGrid) return;

    const data = await fetchKonten('info-lomba', 12);
    wadahGrid.innerHTML = data.map(item => `
        <a href="detail.html?id=${item.id}&tipe=lomba" class="card fade-up" style="border-bottom: 3px solid var(--tersiary);">
            <div class="card-thumb" style="aspect-ratio: 4/5;">
                <img src="${item.thumbnail || 'assets/default-poster.jpg'}" style="width:100%; height:100%; object-fit:cover;">
            </div>
            <div class="card-body" style="padding: 16px; text-align: center;">
                <div class="card-tag" style="background:var(--tersiary); color:var(--primary); font-size:10px; padding:2px 8px; border-radius:4px; display:inline-block; margin-bottom:8px; font-weight:700;">
                    ${item.status || 'BUKA'}
                </div>
                <h3 class="card-title" style="font-size:14px;">${item.judul}</h3>
                <div style="font-size: 11px; color: var(--text-light);"><i class="fas fa-clock"></i> Deadline: ${item.deadline || '-'}</div>
            </div>
        </a>`).join('');
    daftarkanFadeUp();
}

// --- HALAMAN PRESTASI ---
async function initHalamanPrestasi() {
    const wadahGrid = document.getElementById('wadah-prestasi');
    if (!wadahGrid) return;

    const data = await fetchKonten('prestasi', 12);
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
                <h3 class="card-title" style="font-size:14px; margin-block:5px;">${item.judul}</h3>
                <div style="font-size: 12px; color: var(--text-light);">${item.nama_pemenang || ''}</div>
            </div>
        </div>`).join('');
    daftarkanFadeUp();
}

// --- HALAMAN DAFTAR DEPARTEMEN ---
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

// --- HALAMAN DETAIL DEPARTEMEN (ANGGOTA) ---
async function initHalamanDetailDepartemen() {
    const wadahPimpinan = document.getElementById('wadah-pimpinan');
    if (!wadahPimpinan) return;

    const urlParams = new URLSearchParams(window.location.search);
    const deptId = urlParams.get('id');
    if (!deptId) return;

    try {
        // Render Nama & Deskripsi Dept
        const resDept = await fetch(`api/get_konten.php?kategori=departemen_info&id=${deptId}`);
        const info = await resDept.json();
        if(info) {
            document.getElementById('nama-departemen-detail').innerHTML = `${info.nama_prefix || 'Departemen'} <span>${info.nama}</span>`;
            document.getElementById('deskripsi-departemen-detail').innerText = info.deskripsi;
        }

        // Render Anggota
        const anggota = await fetchKonten('anggota', 50, `&dept_id=${deptId}`);
        
        const renderList = (targetId, sectionId, filterKey) => {
            const target = document.getElementById(targetId);
            const filtered = anggota.filter(m => m.kategori_jabatan === filterKey);
            if(filtered.length > 0) {
                target.innerHTML = filtered.map(m => `
                    <div class="member-card fade-up">
                        <img src="${m.foto || 'https://ui-avatars.com/api/?name='+m.nama}" class="member-photo" alt="${m.nama}">
                        <div class="member-name">${m.nama}</div>
                        <div class="member-role">${m.jabatan}</div>
                    </div>
                `).join('');
                document.getElementById(sectionId).style.display = 'block';
            }
        };

        renderList('wadah-pimpinan', 'section-pimpinan', 'pimpinan');
        renderList('wadah-ahli', 'section-ahli', 'ahli');
        renderList('wadah-staf', 'section-staf', 'staf');

        daftarkanFadeUp();
    } catch (err) { console.error(err); }
}

// ═══════════════════════════════════════════════════════════
// 11. INITIALIZATION ORCHESTRATOR
// ═══════════════════════════════════════════════════════════
document.addEventListener('DOMContentLoaded', () => {
    // 1. Jalankan fungsi UI Global
    daftarkanFadeUp();

    // 2. Jalankan Ticker (Berlaku di semua halaman jika elemen ada)
    fetchKonten('ticker', 10).then(data => renderTicker(data));

    // 3. Jalankan Init berdasarkan deteksi elemen di halaman
    if (document.getElementById('beranda')) {
        // Jika di Home, jalankan orchestrator utama index.html
        if (typeof initKonten === 'function') initKonten(); 
        sembunyikanSectionKosong();
    }
    
    if (document.getElementById('wadah-semua-artikel')) initHalamanArtikel();
    if (document.getElementById('wadah-info-lomba')) initHalamanLomba();
    if (document.getElementById('wadah-prestasi')) initHalamanPrestasi();
    if (document.getElementById('wadah-departemen')) initHalamanDepartemen();
    if (document.getElementById('wadah-pimpinan')) initHalamanDetailDepartemen();
});