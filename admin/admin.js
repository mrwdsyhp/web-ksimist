/**
 * admin.js — KSI Mist FMIPA UNY
 * Dashboard Admin JavaScript
 * ─────────────────────────────────────────────────────────
 */

'use strict';

const API = 'https://web-ksimist-production.up.railway.app/api';

// ═══════════════════════════════════════════════════════════
// UTILITY: TOAST NOTIFICATION
// ═══════════════════════════════════════════════════════════
function toast(msg, type = 'success', duration = 3200) {
    const el = document.getElementById('toast');
    el.textContent = msg;
    el.className = `show ${type}`;
    clearTimeout(el._t);
    el._t = setTimeout(() => { el.className = type; }, duration);
}

// ═══════════════════════════════════════════════════════════
// UTILITY: MODAL
// ═══════════════════════════════════════════════════════════
function openModal(id, extra) {
    if (id === 'modal-konten') prepKontenModal(extra);
    document.getElementById(id).classList.add('open');
}

function closeModal(id) {
    document.getElementById(id).classList.remove('open');
    if (id === 'modal-konten') {
        document.getElementById('form-konten').reset();
        document.getElementById('fk-id').value = '';
    }
    if (id === 'modal-pengurus') {
        document.getElementById('form-pengurus').reset();
        document.getElementById('fp-id').value = '';
    }
}

// Tutup modal saat klik backdrop
document.querySelectorAll('.modal-overlay').forEach(m => {
    m.addEventListener('click', e => {
        if (e.target === m) closeModal(m.id);
    });
});

// ═══════════════════════════════════════════════════════════
// TAB NAVIGATION
// ═══════════════════════════════════════════════════════════
const tabMeta = {
    beranda:  { title: 'Beranda',                sub: 'Ringkasan statistik & akses cepat' },
    artikel:  { title: 'Kelola Artikel',         sub: 'Artikel & kegiatan KSI Mist' },
    lomba:    { title: 'Kelola Info Lomba',       sub: 'Informasi kompetisi ilmiah' },
    prestasi: { title: 'Kelola Prestasi',         sub: 'Pencapaian anggota' },
    pengurus: { title: 'Pengurus & Departemen',   sub: 'Susunan organisasi' },
    pesan:    { title: 'Pesan Masuk',             sub: 'Pesan dari form Hubungi Kami' },
};

function switchTab(tab) {
    document.querySelectorAll('.tab-view').forEach(v => v.classList.remove('active'));
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));

    document.getElementById(`view-${tab}`).classList.add('active');
    document.querySelectorAll('.nav-item').forEach(n => {
        if (n.getAttribute('onclick')?.includes(`'${tab}'`)) n.classList.add('active');
    });

    const m = tabMeta[tab] || {};
    document.getElementById('page-title').textContent = m.title || tab;
    document.getElementById('page-sub').textContent   = m.sub   || '';

    // Lazy load data per tab
    if (tab === 'artikel')  loadKonten('artikel');
    if (tab === 'lomba')    loadKonten('lomba');
    if (tab === 'prestasi') loadKonten('prestasi');
    if (tab === 'pengurus') loadPengurus();
    if (tab === 'beranda')  loadStats();
}

// ═══════════════════════════════════════════════════════════
// STATISTIK DASHBOARD
// ═══════════════════════════════════════════════════════════
async function loadStats() {
    try {
        const r = await fetch(`${API}/stats`);
        const d = await r.json();
        document.getElementById('stat-artikel').textContent  = d.artikel   ?? 0;
        document.getElementById('stat-lomba').textContent    = d.lomba     ?? 0;
        document.getElementById('stat-prestasi').textContent = d.prestasi  ?? 0;
        document.getElementById('stat-pengurus').textContent = d.pengurus  ?? 0;
        document.getElementById('stat-pesan').textContent    = d.pesanBaru ?? 0;
        if (d.pesanBaru > 0) {
            const b = document.getElementById('badge-pesan');
            b.textContent    = d.pesanBaru;
            b.style.display  = 'inline';
        }
    } catch { /* server belum aktif */ }
}

// Panggil saat halaman pertama kali load
loadStats();


// ═══════════════════════════════════════════════════════════
// KONTEN: ARTIKEL, INFO LOMBA, PRESTASI
// ═══════════════════════════════════════════════════════════
let currentFilter = { artikel: '', lomba: '', prestasi: '' };

async function loadKonten(kat, jenis = '', tingkat = '') {
    const tbodyId = { artikel: 'tbody-artikel', lomba: 'tbody-lomba', prestasi: 'tbody-prestasi' }[kat];
    const tbody   = document.getElementById(tbodyId);
    if (!tbody) return;

    tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;padding:24px;color:var(--muted)">
        <span class="spinner" style="border-color:rgba(0,0,0,0.1);border-top-color:var(--primary)"></span>
    </td></tr>`;

    let url = `${API}/konten?kategori=${kat}&limit=50`;
    if (jenis)   url += `&jenis=${encodeURIComponent(jenis)}`;
    if (tingkat) url += `&tingkat_prestasi=${encodeURIComponent(tingkat)}`;

    const data = await fetch(url).then(r => r.json()).catch(() => []);

    if (!data.length) {
        tbody.innerHTML = `<tr><td colspan="6">
            <div class="empty"><i class="fas fa-inbox"></i><p>Belum ada data.</p></div>
        </td></tr>`;
        return;
    }

    const medalMap  = { '1': '🥇', '2': '🥈', '3': '🥉' };
    const jenisChip = {
        LKTI: 'chip-red', Essay: 'chip-blue', PKM: 'chip-purple',
        Desain: 'chip-orange', BPC: 'chip-gold', Internasional: 'chip-green', Lainnya: 'chip-gray'
    };

    tbody.innerHTML = data.map(item => {
        const img  = `<img class="td-img"
            src="${item.thumbnail_url || 'https://placehold.co/50x50/1A1F3A/FDF3C0?text=KSI'}"
            onerror="this.src='https://placehold.co/50x50/1A1F3A/FDF3C0?text=KSI'">`;
        const aksi = `<div class="action-btns">
            <button class="btn btn-ghost btn-sm" onclick="editKonten(${item.id},'${kat}')"><i class="fas fa-pen"></i></button>
            <button class="btn btn-danger btn-sm" onclick="hapusKonten(${item.id},'${kat}')"><i class="fas fa-trash"></i></button>
        </div>`;
        const tgl  = item.tanggal
            ? new Date(item.tanggal).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })
            : '—';

        if (kat === 'artikel') {
            return `<tr>
                <td>${img}</td>
                <td><div class="td-title">${item.judul}</div></td>
                <td><span class="chip chip-blue">${item.jenis_artikel || 'Lainnya'}</span></td>
                <td class="td-muted">${tgl}</td>
                <td>${aksi}</td>
            </tr>`;
        }

        if (kat === 'lomba') {
            const ddl  = item.deadline
                ? new Date(item.deadline).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })
                : '—';
            const past = item.deadline && new Date(item.deadline) < new Date();
            return `<tr>
                <td>${img}</td>
                <td>
                    <div class="td-title">${item.judul}</div>
                    ${item.link_daftar ? `<a href="${item.link_daftar}" target="_blank" style="font-size:11px;color:var(--primary)">Link Daftar ↗</a>` : ''}
                </td>
                <td><span class="chip ${jenisChip[item.jenis] || 'chip-gray'}">${item.jenis || '—'}</span></td>
                <td><span class="chip chip-blue">${item.tingkat || '—'}</span></td>
                <td><span class="chip ${past ? 'chip-gray' : 'chip-green'}">${ddl}</span></td>
                <td>${aksi}</td>
            </tr>`;
        }

        if (kat === 'prestasi') {
            return `<tr>
                <td>${img}</td>
                <td>
                    <div class="td-title">${item.judul}</div>
                    <div class="td-muted">${item.nama_kompetisi || ''}</div>
                </td>
                <td style="font-size:18px">
                    ${medalMap[item.peringkat] || '🏆'}
                    <span style="font-size:12px;font-weight:700">${item.peringkat || '—'}</span>
                </td>
                <td><span class="chip chip-gold">${item.tingkat_prestasi || '—'}</span></td>
                <td class="td-muted">${tgl}</td>
                <td>${aksi}</td>
            </tr>`;
        }
    }).join('');
}

// ─── Filter Sub-tabs ────────────────────────────────────────
function filterJenisArtikel(el, jenis) {
    el.closest('.sub-tabs').querySelectorAll('.sub-tab').forEach(t => t.classList.remove('active'));
    el.classList.add('active');
    currentFilter.artikel = jenis;
    loadKonten('artikel', jenis);
}

function filterJenisLomba(el, jenis) {
    el.closest('.sub-tabs').querySelectorAll('.sub-tab').forEach(t => t.classList.remove('active'));
    el.classList.add('active');
    loadKonten('lomba', jenis);
}

function filterTingkatPrestasi(el, tingkat) {
    el.closest('.sub-tabs').querySelectorAll('.sub-tab').forEach(t => t.classList.remove('active'));
    el.classList.add('active');
    loadKonten('prestasi', '', tingkat);
}

// ─── Prep Modal Konten ──────────────────────────────────────
function prepKontenModal(kat, data = null) {
    const isArtikel  = kat === 'artikel';
    const isLomba    = kat === 'lomba';
    const isPrestasi = kat === 'prestasi';

    document.getElementById('grp-jenis-artikel').style.display = isArtikel  ? '' : 'none';
    document.getElementById('grp-lomba').style.display         = isLomba    ? '' : 'none';
    document.getElementById('grp-prestasi').style.display      = isPrestasi ? '' : 'none';

    const labels = { artikel: 'Artikel', lomba: 'Info Lomba', prestasi: 'Prestasi' };
    document.getElementById('modal-konten-title').textContent =
        (data ? 'Edit ' : 'Tambah ') + (labels[kat] || kat);
    document.getElementById('fk-kategori').value = kat;

    if (data) {
        document.getElementById('fk-id').value    = data.id;
        document.getElementById('fk-judul').value = data.judul;
        document.getElementById('fk-isi').value   = data.isi || '';
        if (data.tanggal) document.getElementById('fk-tanggal').value = data.tanggal.split('T')[0];

        if (isArtikel) {
            document.getElementById('fk-jenis-artikel').value = data.jenis_artikel || '';
        }
        if (isLomba) {
            document.getElementById('fk-jenis').value   = data.jenis         || '';
            document.getElementById('fk-tingkat').value = data.tingkat       || '';
            document.getElementById('fk-link').value    = data.link_daftar   || '';
            if (data.deadline) document.getElementById('fk-deadline').value = data.deadline.split('T')[0];
        }
        if (isPrestasi) {
            document.getElementById('fk-peringkat').value        = data.peringkat         || '';
            document.getElementById('fk-tingkat-prestasi').value = data.tingkat_prestasi  || '';
            document.getElementById('fk-nama-kompetisi').value   = data.nama_kompetisi    || '';
            document.getElementById('fk-anggota-tim').value      = data.anggota_tim       || '';
        }
    }
}

// ─── Submit Form Konten ─────────────────────────────────────
document.getElementById('form-konten').onsubmit = async (e) => {
    e.preventDefault();
    const btn = document.getElementById('btn-save-konten');
    const id  = document.getElementById('fk-id').value;
    const kat = document.getElementById('fk-kategori').value;
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner"></span> Menyimpan...';

    const fd = new FormData();
    fd.append('kategori', kat);
    fd.append('judul',    document.getElementById('fk-judul').value);
    fd.append('tanggal',  document.getElementById('fk-tanggal').value);
    fd.append('isi',      document.getElementById('fk-isi').value);

    if (kat === 'artikel') {
        fd.append('jenis_artikel', document.getElementById('fk-jenis-artikel').value);
    }
    if (kat === 'lomba') {
        fd.append('jenis',       document.getElementById('fk-jenis').value);
        fd.append('tingkat',     document.getElementById('fk-tingkat').value);
        fd.append('link_daftar', document.getElementById('fk-link').value);
        fd.append('deadline',    document.getElementById('fk-deadline').value);
    }
    if (kat === 'prestasi') {
        fd.append('peringkat',        document.getElementById('fk-peringkat').value);
        fd.append('tingkat_prestasi', document.getElementById('fk-tingkat-prestasi').value);
        fd.append('nama_kompetisi',   document.getElementById('fk-nama-kompetisi').value);
        fd.append('anggota_tim',      document.getElementById('fk-anggota-tim').value);
    }

    const file = document.getElementById('fk-thumbnail').files[0];
    if (file) fd.append('thumbnail', file);

    try {
        const url    = id ? `${API}/konten/${id}` : `${API}/konten`;
        const method = id ? 'PUT' : 'POST';
        const res    = await fetch(url, { method, body: fd });
        const result = await res.json();
        if (!res.ok) throw new Error(result.error);
        toast(result.message);
        closeModal('modal-konten');
        loadKonten(kat);
        loadStats();
    } catch (err) {
        toast('Error: ' + err.message, 'error');
    } finally {
        btn.disabled = false;
        btn.innerHTML = '<i class="fas fa-save"></i> Simpan';
    }
};

async function editKonten(id, kat) {
    const data = await fetch(`${API}/konten/${id}`).then(r => r.json()).catch(() => null);
    if (!data) return toast('Gagal memuat data', 'error');
    prepKontenModal(kat, data);
    openModal('modal-konten', kat);
}

async function hapusKonten(id, kat) {
    if (!confirm('Yakin ingin menghapus konten ini?')) return;
    const res = await fetch(`${API}/konten/${id}`, { method: 'DELETE' }).catch(() => null);
    if (res?.ok) { toast('Data berhasil dihapus!'); loadKonten(kat); loadStats(); }
    else toast('Gagal menghapus', 'error');
}


// ═══════════════════════════════════════════════════════════
// PENGURUS & DEPARTEMEN
// ═══════════════════════════════════════════════════════════
let deptList = [];

async function loadDeptOptions() {
    if (deptList.length) return;
    deptList = await fetch(`${API}/departemen`).then(r => r.json()).catch(() => []);
    const sel = document.getElementById('fp-dept');
    sel.innerHTML = '<option value="">— Pengurus Inti —</option>';
    deptList.forEach(d => {
        sel.innerHTML += `<option value="${d.id}">${d.nama}</option>`;
    });
}

async function loadPengurus() {
    await loadDeptOptions();
    const wadah = document.getElementById('wadah-pengurus');
    wadah.innerHTML = `<div class="empty">
        <span class="spinner" style="border-color:rgba(0,0,0,0.1);border-top-color:var(--primary)"></span>
    </div>`;

    const semua = await fetch(`${API}/pengurus`).then(r => r.json()).catch(() => []);

    const inti   = semua.filter(p => !p.dept_id);
    const byDept = {};
    deptList.forEach(d => byDept[d.id] = { dept: d, anggota: [] });
    semua.filter(p => p.dept_id).forEach(p => {
        if (byDept[p.dept_id]) byDept[p.dept_id].anggota.push(p);
    });

    const renderCard = p => `
        <div class="pengurus-card">
            <img src="${p.foto_url}" alt="${p.nama}"
                onerror="this.src='https://ui-avatars.com/api/?name=${encodeURIComponent(p.nama)}&background=1A1F3A&color=FDF3C0'">
            <div class="p-name">${p.nama}</div>
            <div class="p-role">${p.jabatan}</div>
            ${p.angkatan ? `<div class="td-muted" style="font-size:11px;margin-top:4px">${p.prodi || ''} '${String(p.angkatan).slice(-2)}</div>` : ''}
            <div class="p-actions">
                <button class="btn btn-ghost btn-sm" onclick="editPengurus(${p.id})"><i class="fas fa-pen"></i></button>
                <button class="btn btn-danger btn-sm" onclick="hapusPengurus(${p.id})"><i class="fas fa-trash"></i></button>
            </div>
        </div>`;

    let html = '';

    // Blok Pengurus Inti
    if (inti.length) {
        html += `<div style="margin-bottom:32px;">
            <div class="dept-header" style="cursor:default;">
                <div class="dept-icon" style="background:var(--gold)"><i class="fas fa-crown"></i></div>
                <div>
                    <div class="dept-name">Pengurus Inti</div>
                    <div class="dept-count">${inti.length} orang</div>
                </div>
            </div>
            <div class="pengurus-grid">${inti.map(renderCard).join('')}</div>
        </div>`;
    }

    // Blok per Departemen
    Object.values(byDept).forEach(({ dept, anggota }) => {
        const uid = `dept-body-${dept.id}`;
        html += `<div style="margin-bottom:24px;">
            <div class="dept-header" onclick="toggleDept('${uid}')">
                <div class="dept-icon" style="background:${dept.warna}">
                    <i class="fas ${dept.ikon || 'fa-users'}"></i>
                </div>
                <div>
                    <div class="dept-name">${dept.nama}</div>
                    <div class="dept-count">${anggota.length} anggota</div>
                </div>
                <i class="fas fa-chevron-down dept-chevron"></i>
            </div>
            <div class="dept-body" id="${uid}">
                ${anggota.length
                    ? `<div class="pengurus-grid" style="padding:16px 0">${anggota.map(renderCard).join('')}</div>`
                    : `<div class="empty" style="padding:30px"><i class="fas fa-user-slash"></i><p>Belum ada anggota</p></div>`}
            </div>
        </div>`;
    });

    wadah.innerHTML = html || '<div class="empty"><i class="fas fa-users-slash"></i><p>Belum ada pengurus.</p></div>';
}

function toggleDept(id) {
    const el      = document.getElementById(id);
    const chevron = el.previousElementSibling.querySelector('.dept-chevron');
    el.classList.toggle('open');
    if (chevron) chevron.style.transform = el.classList.contains('open') ? 'rotate(180deg)' : '';
}

async function openModalPengurus(data = null) {
    await loadDeptOptions();
    document.getElementById('modal-pengurus-title').textContent = data ? 'Edit Pengurus' : 'Tambah Pengurus';
    if (data) {
        document.getElementById('fp-id').value       = data.id;
        document.getElementById('fp-nama').value     = data.nama;
        document.getElementById('fp-jabatan').value  = data.jabatan;
        document.getElementById('fp-level').value    = data.jabatan_level;
        document.getElementById('fp-dept').value     = data.dept_id || '';
        document.getElementById('fp-angkatan').value = data.angkatan || '';
        document.getElementById('fp-prodi').value    = data.prodi || '';
        document.getElementById('fp-urutan').value   = data.urutan || 99;
    }
    openModal('modal-pengurus');
}

document.getElementById('form-pengurus').onsubmit = async (e) => {
    e.preventDefault();
    const btn = document.getElementById('btn-save-pengurus');
    const id  = document.getElementById('fp-id').value;
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner"></span> Menyimpan...';

    const fd = new FormData();
    fd.append('nama',          document.getElementById('fp-nama').value);
    fd.append('jabatan',       document.getElementById('fp-jabatan').value);
    fd.append('jabatan_level', document.getElementById('fp-level').value);
    fd.append('dept_id',       document.getElementById('fp-dept').value);
    fd.append('angkatan',      document.getElementById('fp-angkatan').value);
    fd.append('prodi',         document.getElementById('fp-prodi').value);
    fd.append('urutan',        document.getElementById('fp-urutan').value);
    const foto = document.getElementById('fp-foto').files[0];
    if (foto) fd.append('foto', foto);

    try {
        const url    = id ? `${API}/pengurus/${id}` : `${API}/pengurus`;
        const method = id ? 'PUT' : 'POST';
        const res    = await fetch(url, { method, body: fd });
        const result = await res.json();
        if (!res.ok) throw new Error(result.error);
        toast(result.message);
        closeModal('modal-pengurus');
        loadPengurus();
        loadStats();
    } catch (err) {
        toast('Error: ' + err.message, 'error');
    } finally {
        btn.disabled = false;
        btn.innerHTML = '<i class="fas fa-save"></i> Simpan Pengurus';
    }
};

async function editPengurus(id) {
    const semua = await fetch(`${API}/pengurus`).then(r => r.json()).catch(() => []);
    const item  = semua.find(x => x.id === id);
    if (!item) return toast('Data tidak ditemukan', 'error');
    openModalPengurus(item);
}

async function hapusPengurus(id) {
    if (!confirm('Yakin hapus pengurus ini?')) return;
    const res = await fetch(`${API}/pengurus/${id}`, { method: 'DELETE' }).catch(() => null);
    if (res?.ok) { toast('Pengurus dihapus!'); loadPengurus(); loadStats(); }
    else toast('Gagal menghapus', 'error');
}


// ═══════════════════════════════════════════════════════════
// PESAN MASUK
// ═══════════════════════════════════════════════════════════
async function loadPesan() {
    const wadah = document.getElementById('wadah-pesan');
    wadah.innerHTML = `<div class="empty">
        <span class="spinner" style="border-color:rgba(0,0,0,0.1);border-top-color:var(--primary)"></span>
    </div>`;

    const data = await fetch(`${API}/pesan`).then(r => r.json()).catch(() => []);

    if (!data.length) {
        wadah.innerHTML = '<div class="empty"><i class="fas fa-inbox"></i><p>Belum ada pesan masuk.</p></div>';
        return;
    }

    wadah.innerHTML = data.map(p => `
        <div class="pesan-card ${p.sudah_dibaca ? '' : 'unread'}" id="pesan-${p.id}">
            <div>
                <div class="pesan-sender">
                    ${p.nama}
                    ${!p.sudah_dibaca ? '<span class="chip chip-red" style="font-size:10px;padding:2px 8px">BARU</span>' : ''}
                </div>
                <div class="pesan-email">${p.email}</div>
                <div class="pesan-subjek">${p.subjek}</div>
                <div class="pesan-preview">${p.isi.length > 120 ? p.isi.substring(0, 120) + '…' : p.isi}</div>
                <div style="margin-top:10px;display:flex;gap:8px;flex-wrap:wrap;">
                    ${!p.sudah_dibaca
                        ? `<button class="btn btn-success btn-sm" onclick="bacaPesan(${p.id})"><i class="fas fa-check"></i> Tandai Dibaca</button>`
                        : '<span class="chip chip-gray">Sudah dibaca</span>'}
                    <button class="btn btn-danger btn-sm" onclick="hapusPesan(${p.id})"><i class="fas fa-trash"></i></button>
                    <a href="mailto:${p.email}?subject=Re: ${encodeURIComponent(p.subjek)}"
                       class="btn btn-ghost btn-sm"><i class="fas fa-reply"></i> Balas</a>
                </div>
            </div>
            <div class="pesan-date">
                ${new Date(p.tanggal).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })}
            </div>
        </div>`).join('');
}

async function bacaPesan(id) {
    await fetch(`${API}/pesan/${id}/baca`, { method: 'PATCH' });
    loadPesan();
    loadStats();
}

async function hapusPesan(id) {
    if (!confirm('Hapus pesan ini?')) return;
    const res = await fetch(`${API}/pesan/${id}`, { method: 'DELETE' });
    if (res.ok) { toast('Pesan dihapus!'); loadPesan(); loadStats(); }
    else toast('Gagal', 'error');
}