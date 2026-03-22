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