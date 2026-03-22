/**
 * main.js — KSI Mist FMIPA UNY
 * ─────────────────────────────────────────────────────────
 *  1. Navbar scroll effect + back to top
 *  2. Mobile navbar toggle
 *  3. Fade-up on scroll (IntersectionObserver)
 *  4. Sembunyikan section kosong
 *  5. Render Ticker dari API
 *  6. Render Hero Preview dari API
 *  7. Render Artikel, Info Lomba, Prestasi, Pengumuman
 *  8. initKonten() — orchestrator semua fetch
 * ─────────────────────────────────────────────────────────
 * ATURAN: tidak ada konten hardcode di sini.
 * Semua teks yang tampil berasal dari API admin.
 */

'use strict';


// ═══════════════════════════════════════════════════════════
// 1. NAVBAR — shadow saat scroll + back to top
// ═══════════════════════════════════════════════════════════
const navbar  = document.getElementById('navbar');
const backTop = document.getElementById('backTop');

window.addEventListener('scroll', () => {
    navbar.classList.toggle('scrolled', window.scrollY > 20);
    backTop.classList.toggle('visible', window.scrollY > 400);
});

backTop.addEventListener('click', () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
});


// ═══════════════════════════════════════════════════════════
// 2. MOBILE NAVBAR TOGGLE
// ═══════════════════════════════════════════════════════════
const navbarToggle = document.getElementById('navbar-toggle');
const navbarLinks  = document.querySelector('.navbar-links');

navbarToggle.addEventListener('click', () => {
    navbarLinks.classList.toggle('open');
});

navbarLinks.querySelectorAll('a').forEach(link => {
    link.addEventListener('click', () => navbarLinks.classList.remove('open'));
});


// ═══════════════════════════════════════════════════════════
// 3. FADE-UP ON SCROLL
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

daftarkanFadeUp();


// ═══════════════════════════════════════════════════════════
// 4. SEMBUNYIKAN SECTION KOSONG
//    Dipanggil: (a) saat awal load, (b) setelah setiap render.
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

        // Sembunyikan <hr class="divider"> tepat sebelum section
        const prev = elSection.previousElementSibling;
        if (prev && prev.classList.contains('divider')) {
            prev.style.display = kosong ? 'none' : '';
        }
    });
}


// ═══════════════════════════════════════════════════════════
// 5. RENDER TICKER
//    Ticker hanya muncul jika ada minimal 1 item dari API.
//    Konten: gabungan artikel + pengumuman + lomba terbaru.
// ═══════════════════════════════════════════════════════════

/**
 * @param {Array<{judul: string, href: string}>} items
 */
function renderTicker(items) {
    const track = document.getElementById('ticker-track');
    const wrap  = document.getElementById('ticker-wrap');
    if (!track || !wrap) return;

    if (items.length === 0) {
        wrap.style.display = 'none';
        return;
    }

    // Duplikasi agar animasi looping mulus (perlu 2x konten)
    const semua = [...items, ...items];

    track.innerHTML = semua
        .map((item, i) => `
            <a href="${item.href}">${item.judul}</a>
            ${i < semua.length - 1 ? '<span class="ticker-sep">◆</span>' : ''}
        `)
        .join('');

    wrap.style.display = '';
}


// ═══════════════════════════════════════════════════════════
// 6. RENDER HERO PREVIEW
//    Kartu kanan hero: 1 artikel terbaru + 1 lomba terbaru.
//    Jika keduanya null → kolom kanan hero tersembunyi.
// ═══════════════════════════════════════════════════════════

/**
 * @param {Object|null} artikel  - item artikel terbaru
 * @param {Object|null} lomba    - item lomba terbaru
 */
function renderHeroPreview(artikel, lomba) {
    const heroRight        = document.getElementById('hero-right');
    const elArtikel        = document.getElementById('hero-preview-artikel');
    const elLomba          = document.getElementById('hero-preview-lomba');

    if (!heroRight) return;

    if (!artikel && !lomba) {
        heroRight.style.display = 'none';
        return;
    }

    if (artikel && elArtikel) {
        elArtikel.className = 'hero-preview-card';
        elArtikel.innerHTML = `
            <div class="hero-preview-label">📰 Artikel Terbaru</div>
            <div class="hero-preview-title">${artikel.judul}</div>
            <div class="hero-preview-meta">${artikel.tanggal} · KSI Mist</div>
        `;
        elArtikel.style.cursor = 'pointer';
        elArtikel.onclick = () => { window.location.href = `artikel.html?id=${artikel.id}`; };
    } else if (elArtikel) {
        elArtikel.style.display = 'none';
    }

    if (lomba && elLomba) {
        elLomba.className = 'hero-preview-card';
        elLomba.innerHTML = `
            <div class="hero-preview-label">🏆 Info Lomba</div>
            <div class="hero-preview-title">${lomba.judul}</div>
            <div class="hero-preview-meta">${lomba.penyelenggara ?? ''}</div>
        `;
        elLomba.style.cursor = 'pointer';
        elLomba.onclick = () => { window.location.href = `artikel.html?id=${lomba.id}`; };
    } else if (elLomba) {
        elLomba.style.display = 'none';
    }

    heroRight.style.display = '';
}


// ═══════════════════════════════════════════════════════════
// 7. RENDER SECTION KONTEN
// ═══════════════════════════════════════════════════════════

function renderArtikel(data) {
    const wadah = document.getElementById('wadah-artikel');
    if (!wadah) return;

    wadah.innerHTML = data.map((item, i) => `
        <a href="artikel.html?id=${item.id}" class="card ${i === 0 ? 'card-featured' : ''}">
            <div class="card-thumb">
                ${item.thumbnail
                    ? `<img src="${item.thumbnail}" alt="${item.judul}" style="width:100%;height:100%;object-fit:cover;">`
                    : 'ARTIKEL'}
            </div>
            <div class="card-body">
                <span class="card-tag">${item.kategori_label ?? 'Artikel'}</span>
                <h3 class="card-title">${item.judul}</h3>
                ${i === 0 ? `<p class="card-excerpt">${item.ringkasan ?? ''}</p>` : ''}
                <div class="card-meta">
                    <span class="card-date">${item.tanggal}</span>
                    <span class="card-read">Baca <i class="fas fa-arrow-right"></i></span>
                </div>
            </div>
        </a>
    `).join('');
}

function renderInfoLomba(data) {
    const wadah = document.getElementById('wadah-info-lomba');
    if (!wadah) return;

    const ikonMap = {
        lkti:          'fa-file-alt',
        essay:         'fa-pen-nib',
        desain:        'fa-paint-brush',
        pkm:           'fa-flask',
        internasional: 'fa-globe',
        default:       'fa-trophy',
    };

    wadah.innerHTML = data.map(item => {
        const ikon = ikonMap[item.tipe?.toLowerCase()] ?? ikonMap.default;
        return `
            <a href="artikel.html?id=${item.id}" class="lomba-card">
                <div class="lomba-icon"><i class="fas ${ikon}"></i></div>
                <div class="lomba-title">${item.judul}</div>
                <div class="lomba-detail">${item.penyelenggara ?? ''}</div>
                ${item.deadline
                    ? `<div class="lomba-deadline">
                           <i class="fas fa-clock"></i> Deadline: ${item.deadline}
                       </div>`
                    : ''}
            </a>
        `;
    }).join('');
}

function renderPrestasi(data) {
    const wadah = document.getElementById('wadah-prestasi');
    if (!wadah) return;

    const medalMap = { '1': '🥇', '2': '🥈', '3': '🥉' };
    const kelasMap = { '1': 'medal-gold', '2': 'medal-silver', '3': 'medal-bronze' };

    wadah.innerHTML = data.map(item => {
        const emoji = medalMap[item.peringkat] ?? '🏆';
        const kelas = kelasMap[item.peringkat] ?? 'medal-gold';
        return `
            <div class="prestasi-card">
                <div class="medal ${kelas}">${emoji}</div>
                <div class="prestasi-title">${item.judul}</div>
                <div class="prestasi-desc">${item.deskripsi ?? ''}</div>
                <div class="prestasi-badge">
                    <i class="fas fa-trophy"></i> ${item.tingkat ?? ''} · ${item.tahun ?? ''}
                </div>
            </div>
        `;
    }).join('');
}

function renderPengumuman(data) {
    const wadah = document.getElementById('wadah-pengumuman');
    if (!wadah) return;

    wadah.innerHTML = data.map(item => {
        const tgl   = new Date(item.tanggal);
        const hari  = String(tgl.getDate()).padStart(2, '0');
        const bulan = tgl.toLocaleString('id-ID', { month: 'short' }).toUpperCase();
        return `
            <a href="${item.link ?? '#'}" class="pengumuman-item">
                <div class="pengumuman-date">
                    <div class="pengumuman-day">${hari}</div>
                    <div class="pengumuman-month">${bulan}</div>
                </div>
                <div class="pengumuman-content">
                    <h4>${item.judul}</h4>
                    <p>${item.subjudul ?? ''}</p>
                </div>
                <div class="pengumuman-arrow"><i class="fas fa-chevron-right"></i></div>
            </a>
        `;
    }).join('');
}


// ═══════════════════════════════════════════════════════════
// 8. FETCH HELPER
// ═══════════════════════════════════════════════════════════

async function fetchKonten(kategori, limit = 6) {
    const res = await fetch(`api/get_konten.php?kategori=${kategori}&limit=${limit}`);
    if (!res.ok) throw new Error(`Gagal fetch: ${kategori}`);
    return res.json();
}


// ═══════════════════════════════════════════════════════════
// 9. ORCHESTRATOR — initKonten()
//    Semua fetch paralel. Satu gagal tidak menghentikan lain.
// ═══════════════════════════════════════════════════════════

async function initKonten() {
    const [resArtikel, resLomba, resPrestasi, resPengumuman] = await Promise.allSettled([
        fetchKonten('artikel',    6),
        fetchKonten('info-lomba', 4),
        fetchKonten('prestasi',   6),
        fetchKonten('pengumuman', 4),
    ]);

    const artikel    = resArtikel.status    === 'fulfilled' ? resArtikel.value    : [];
    const lomba      = resLomba.status      === 'fulfilled' ? resLomba.value      : [];
    const prestasi   = resPrestasi.status   === 'fulfilled' ? resPrestasi.value   : [];
    const pengumuman = resPengumuman.status === 'fulfilled' ? resPengumuman.value : [];

    // Render section utama
    if (artikel.length)    renderArtikel(artikel);
    if (lomba.length)      renderInfoLomba(lomba);
    if (prestasi.length)   renderPrestasi(prestasi);
    if (pengumuman.length) renderPengumuman(pengumuman);

    // Render hero preview (item pertama dari masing-masing)
    renderHeroPreview(
        artikel.length > 0 ? artikel[0] : null,
        lomba.length   > 0 ? lomba[0]   : null,
    );

    // Render ticker: gabungan artikel + pengumuman + lomba
    const tickerItems = [
        ...artikel.slice(0, 3).map(item => ({
            judul: `📰 ${item.judul}`,
            href:  `artikel.html?id=${item.id}`,
        })),
        ...pengumuman.slice(0, 3).map(item => ({
            judul: `📢 ${item.judul}`,
            href:  item.link ?? '#',
        })),
        ...lomba.slice(0, 2).map(item => ({
            judul: `🏆 ${item.judul}`,
            href:  `artikel.html?id=${item.id}`,
        })),
    ];
    renderTicker(tickerItems);

    // Sembunyikan section yang masih kosong
    sembunyikanSectionKosong();

    // Daftarkan ulang fade-up untuk elemen yang baru dirender
    daftarkanFadeUp();
}

// ═══════════════════════════════════════════════════════════
// 10. RENDER KHUSUS HALAMAN ARTIKEL, LOMBA, & PRESTASI
// ═══════════════════════════════════════════════════════════

// --- A. RENDER HALAMAN ARTIKEL ---
async function initHalamanArtikel() {
    const wadahSorotan = document.getElementById('sorotan-artikel-container');
    const wadahGrid = document.getElementById('wadah-semua-artikel');
    
    // Jika elemen tidak ada di halaman, hentikan fungsi
    if (!wadahSorotan || !wadahGrid) return;

    try {
        const data = await fetchKonten('artikel', 10); // Ambil 10 artikel
        if (data.length === 0) return;

        // Pisahkan 1 data pertama untuk sorotan besar
        const sorotan = data[0];
        const sisanya = data.slice(1);

        // Render Sorotan Utama
        wadahSorotan.innerHTML = `
            <a href="detail.html?id=${sorotan.id}&tipe=artikel" class="card fade-up" style="margin-bottom: 30px; display: block; border-bottom: 4px solid var(--primary);">
                <div class="card-thumb" style="min-height: 400px;">
                    <img src="${sorotan.thumbnail || 'assets/default.jpg'}" alt="${sorotan.judul}" style="width: 100%; height: 100%; object-fit: cover;">
                </div>
                <div class="card-body" style="background: var(--dark); color: var(--white); padding: 24px;">
                    <div style="color: var(--tersiary); font-size: 12px; font-weight: 700; margin-bottom: 8px; letter-spacing: 1px;">
                        SOROTAN UTAMA • ${sorotan.tanggal}
                    </div>
                    <h2 style="font-family: 'Bebas Neue', cursive; font-size: 32px; letter-spacing: 1px;">${sorotan.judul}</h2>
                </div>
            </a>
        `;

        // Render Grid Artikel 
        wadahGrid.innerHTML = sisanya.map(item => `
            <a href="detail.html?id=${item.id}&tipe=artikel" class="card">
                <div class="card-thumb" style="min-height: 200px;">
                    <img src="${item.thumbnail || 'assets/default.jpg'}" style="width:100%; height:100%; object-fit:cover;">
                </div>
                <div class="card-body" style="padding: 16px 20px;">
                    <div style="font-size: 12px; color: var(--text-light); font-weight: 600; margin-bottom: 6px;">${item.tanggal}</div>
                    <h3 class="card-title" style="margin: 0; font-size: 16px;">${item.judul}</h3>
                </div>
            </a>
        `).join('');

        daftarkanFadeUp(); // Jalankan animasi
    } catch (err) {
        console.error("Gagal memuat artikel:", err);
    }
}

// --- B. RENDER HALAMAN INFO LOMBA ---
async function initHalamanLomba() {
    const wadahGrid = document.getElementById('wadah-semua-lomba');
    if (!wadahGrid) return;

    try {
        const data = await fetchKonten('info-lomba', 8);
        if (data.length === 0) return;

        // Render Grid Info Lomba (Poster Tegak)
        wadahGrid.innerHTML = data.map(item => `
            <a href="detail.html?id=${item.id}&tipe=lomba" class="card fade-up" style="border-bottom: 3px solid var(--tersiary);">
                <div class="card-thumb" style="aspect-ratio: 4/5;">
                    <img src="${item.thumbnail || 'assets/default-poster.jpg'}" style="width:100%; height:100%; object-fit:cover;">
                </div>
                <div class="card-body" style="padding: 16px; text-align: center;">
                    <div style="display: inline-block; background: var(--accent); color: var(--primary); font-size: 10px; font-weight: 700; padding: 4px 10px; border-radius: 4px; margin-bottom: 8px;">
                        ${item.status || 'PENDAFTARAN BUKA'}
                    </div>
                    <h3 class="card-title" style="margin-bottom: 4px;">${item.judul}</h3>
                    <div style="font-size: 12px; color: var(--text-light);">
                        <i class="fas fa-clock"></i> Tenggat: ${item.deadline || '-'}
                    </div>
                </div>
            </a>
        `).join('');

        daftarkanFadeUp();
    } catch (err) {
        console.error("Gagal memuat info lomba:", err);
    }
}

// --- C. RENDER HALAMAN PRESTASI ---
async function initHalamanPrestasi() {
    const wadahSorotan = document.getElementById('sorotan-prestasi-container');
    const wadahGrid = document.getElementById('wadah-semua-prestasi');
    if (!wadahSorotan || !wadahGrid) return;

    try {
        const data = await fetchKonten('prestasi', 10);
        if (data.length === 0) return;

        const sorotan = data[0];
        const sisanya = data.slice(1);

        // Render Sorotan Prestasi (Gambar Besar dengan Overlay)
        wadahSorotan.innerHTML = `
            <a href="detail.html?id=${sorotan.id}&tipe=prestasi" class="card fade-up" style="margin-bottom: 30px; display: block; position: relative; border: none;">
                <div class="card-thumb" style="min-height: 450px;">
                    <img src="${sorotan.thumbnail || 'assets/default.jpg'}" style="width: 100%; height: 100%; object-fit: cover; filter: brightness(0.6);">
                </div>
                <div style="position: absolute; bottom: 0; left: 0; right: 0; padding: 40px; background: linear-gradient(transparent, var(--dark)); color: var(--white);">
                    <div style="color: var(--tersiary); font-size: 14px; font-weight: 800; margin-bottom: 8px;">
                        <i class="fas fa-trophy"></i> JUARA ${sorotan.peringkat || '1'} TINGKAT ${sorotan.tingkat || 'NASIONAL'}
                    </div>
                    <h2 style="font-family: 'Bebas Neue', cursive; font-size: 40px; letter-spacing: 1px; margin-bottom: 4px;">${sorotan.judul}</h2>
                    <p style="font-size: 15px; color: var(--secondary);">Diraih oleh: ${sorotan.nama_pemenang || 'Tim KSI Mist'}</p>
                </div>
            </a>
        `;

        // Render Grid Prestasi
        wadahGrid.innerHTML = sisanya.map(item => `
            <a href="detail.html?id=${item.id}&tipe=prestasi" class="card fade-up">
                <div class="card-thumb" style="min-height: 250px;">
                    <img src="${item.thumbnail || 'assets/default.jpg'}" style="width:100%; height:100%; object-fit:cover;">
                </div>
                <div class="card-body" style="padding: 16px 20px; border-top: 4px solid var(--primary);">
                    <div style="font-size: 11px; color: var(--primary); font-weight: 800; margin-bottom: 4px;">
                        JUARA ${item.peringkat} • ${item.tingkat}
                    </div>
                    <h3 class="card-title" style="margin-bottom: 4px; font-size: 16px;">${item.judul}</h3>
                    <div style="font-size: 12px; color: var(--text-light);">${item.nama_pemenang || ''}</div>
                </div>
            </a>
        `).join('');

        daftarkanFadeUp();
    } catch (err) {
        console.error("Gagal memuat prestasi:", err);
    }
}

// Panggil fungsi saat halaman selesai dimuat (DOM Ready)
document.addEventListener('DOMContentLoaded', () => {
    initHalamanArtikel();
    initHalamanLomba();
    initHalamanPrestasi();
});


// ═══════════════════════════════════════════════════════════
// INISIALISASI
// ═══════════════════════════════════════════════════════════
document.addEventListener('DOMContentLoaded', () => {
    // Kondisi awal: semua wadah kosong →
    // ticker tersembunyi, hero-right tersembunyi,
    // semua section dinamis tersembunyi.
    sembunyikanSectionKosong();

    // Aktifkan setelah backend PHP siap:
    // initKonten();
});

