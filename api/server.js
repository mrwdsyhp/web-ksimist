/**
 * server.js — KSI Mist FMIPA UNY
 * Backend Node.js + Express + PostgreSQL (Railway)
 * ─────────────────────────────────────────────────
 * Endpoints:
 *   GET/POST  /api/konten         → artikel, info-lomba, prestasi
 *   GET/PUT/DELETE /api/konten/:id
 *   GET       /api/departemen
 *   GET/PUT   /api/departemen/:id
 *   GET/POST  /api/pengurus
 *   PUT/DELETE /api/pengurus/:id
 *   GET/POST  /api/pesan
 *   PATCH     /api/pesan/:id/baca
 *   DELETE    /api/pesan/:id
 *   GET       /api/stats
 */

'use strict';

const express = require('express');
const { Pool } = require('pg');
const cors    = require('cors');
const multer  = require('multer');
const path    = require('path');
const fs      = require('fs');
require('dotenv').config();

const app = express();

// ─── Middleware ───────────────────────────────────────────
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Static folder untuk gambar upload
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
app.use('/uploads', express.static(uploadDir));
app.use(express.static(path.join(__dirname)));

// ─── Koneksi PostgreSQL ───────────────────────────────────
const db = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production'
        ? { rejectUnauthorized: false }
        : false
});

// Test koneksi saat startup
db.connect()
    .then(client => {
        console.log('✅ Database PostgreSQL terhubung!');
        client.release();
    })
    .catch(err => console.error('❌ Gagal koneksi database:', err.message));

// ─── Multer (Upload Gambar) ───────────────────────────────
const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadDir),
    filename:    (req, file, cb) => {
        const ext  = path.extname(file.originalname);
        const nama = Date.now() + '-' + Math.round(Math.random() * 1e9) + ext;
        cb(null, nama);
    }
});
const upload = multer({
    storage,
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        const allowed = /jpeg|jpg|png|gif|webp/;
        const ok = allowed.test(path.extname(file.originalname).toLowerCase())
                && allowed.test(file.mimetype);
        ok ? cb(null, true) : cb(new Error('Hanya file gambar yang diizinkan!'));
    }
});

// ─── Helper query PostgreSQL ──────────────────────────────
// PostgreSQL pakai $1, $2, $3 bukan ?
const q = (sql, params = []) => db.query(sql, params).then(r => r.rows);

// Konversi ? ke $1,$2,$3 untuk kompatibilitas
function topg(sql) {
    let i = 0;
    return sql.replace(/\?/g, () => `$${++i}`);
}

// Helper q yang support ? style
const qm = (sql, params = []) => db.query(topg(sql), params).then(r => r.rows);


// ═══════════════════════════════════════════════════════════
// INISIALISASI TABEL (auto-create saat server start)
// ═══════════════════════════════════════════════════════════
async function initTabel() {
    await db.query(`
        CREATE TABLE IF NOT EXISTS konten (
            id               SERIAL PRIMARY KEY,
            kategori         VARCHAR(20)  NOT NULL CHECK (kategori IN ('artikel','info-lomba','prestasi')),
            judul            VARCHAR(300) NOT NULL,
            thumbnail        VARCHAR(255) DEFAULT NULL,
            tanggal          DATE         DEFAULT NULL,
            isi              TEXT         DEFAULT NULL,
            jenis_artikel    VARCHAR(20)  DEFAULT NULL,
            jenis            VARCHAR(20)  DEFAULT NULL,
            tingkat          VARCHAR(20)  DEFAULT NULL,
            link_daftar      VARCHAR(500) DEFAULT NULL,
            deadline         DATE         DEFAULT NULL,
            peringkat        VARCHAR(50)  DEFAULT NULL,
            tingkat_prestasi VARCHAR(20)  DEFAULT NULL,
            nama_kompetisi   VARCHAR(300) DEFAULT NULL,
            anggota_tim      TEXT         DEFAULT NULL,
            created_at       TIMESTAMP    DEFAULT NOW(),
            updated_at       TIMESTAMP    DEFAULT NOW()
        );

        CREATE TABLE IF NOT EXISTS departemen (
            id       SERIAL PRIMARY KEY,
            kode     VARCHAR(20)  NOT NULL UNIQUE,
            nama     VARCHAR(100) NOT NULL,
            slogan   VARCHAR(200) DEFAULT NULL,
            deskripsi TEXT        DEFAULT NULL,
            ikon     VARCHAR(50)  DEFAULT 'fa-users',
            warna    VARCHAR(20)  DEFAULT '#8B1A1A',
            urutan   INT          DEFAULT 99
        );

        CREATE TABLE IF NOT EXISTS pengurus (
            id            SERIAL PRIMARY KEY,
            dept_id       INT          DEFAULT NULL,
            nama          VARCHAR(150) NOT NULL,
            jabatan       VARCHAR(150) NOT NULL,
            jabatan_level VARCHAR(20)  NOT NULL DEFAULT 'staf'
                          CHECK (jabatan_level IN ('inti','kepala','staf_ahli','staf')),
            angkatan      INT          DEFAULT NULL,
            prodi         VARCHAR(100) DEFAULT NULL,
            foto          VARCHAR(255) DEFAULT NULL,
            urutan        INT          DEFAULT 99,
            created_at    TIMESTAMP    DEFAULT NOW()
        );

        CREATE TABLE IF NOT EXISTS pesan (
            id           SERIAL PRIMARY KEY,
            nama         VARCHAR(150) NOT NULL,
            email        VARCHAR(150) NOT NULL,
            subjek       VARCHAR(300) DEFAULT '(tanpa subjek)',
            isi          TEXT         NOT NULL,
            sudah_dibaca SMALLINT     DEFAULT 0,
            tanggal      TIMESTAMP    DEFAULT NOW()
        );
    `);

    // Seed departemen kalau belum ada
    const cek = await db.query("SELECT COUNT(*) FROM departemen");
    if (parseInt(cek.rows[0].count) === 0) {
        await db.query(`
            INSERT INTO departemen (kode, nama, slogan, deskripsi, ikon, warna, urutan) VALUES
            ('INTI',  'Pengurus Inti',             'Pilar Kepemimpinan Organisasi',      'Ketua, Wakil Ketua, Sekretaris, dan Bendahara.',                    'fa-crown',          '#D4AF37', 1),
            ('SDA',   'Sumber Daya Anggota',       'Membangun Insan Unggul Berkualitas', 'Pengembangan kapasitas dan kesejahteraan anggota.',                 'fa-users-cog',      '#8B1A1A', 2),
            ('KPL',   'Kajian, Penalaran & Lomba', 'Mengasah Nalar, Meraih Prestasi',   'Mendorong budaya riset, kajian ilmiah, dan kompetisi.',             'fa-flask',          '#1A1F3A', 3),
            ('HI',    'Hubungan & Informasi',      'Jembatan Informasi & Kolaborasi',   'Mengelola komunikasi, media sosial, dan hubungan eksternal.',       'fa-satellite-dish', '#2E8B57', 4),
            ('RISET', 'Riset',                     'Inovasi Ilmiah Tanpa Henti',        'Mengkoordinasikan kegiatan penelitian dan pengembangan ilmu.',      'fa-microscope',     '#6A0DAD', 5),
            ('WIRAU', 'Kewirausahaan',             'Menumbuhkan Jiwa Wirausaha Ilmiah', 'Mengembangkan potensi kewirausahaan berbasis sains dan teknologi.', 'fa-rocket',         '#D2691E', 6)
        `);
        await db.query(`
            INSERT INTO pengurus (dept_id, nama, jabatan, jabatan_level, urutan) VALUES
            (NULL, 'Nama Ketua',         'Ketua Umum',    'inti', 1),
            (NULL, 'Nama Wakil Ketua',   'Wakil Ketua',   'inti', 2),
            (NULL, 'Nama Sekretaris I',  'Sekretaris I',  'inti', 3),
            (NULL, 'Nama Sekretaris II', 'Sekretaris II', 'inti', 4),
            (NULL, 'Nama Bendahara I',   'Bendahara I',   'inti', 5),
            (NULL, 'Nama Bendahara II',  'Bendahara II',  'inti', 6)
        `);
        console.log('✅ Seed data departemen & pengurus selesai!');
    }

    console.log('✅ Semua tabel siap!');
}


// ═══════════════════════════════════════════════════════════
// API: STATISTIK DASHBOARD
// ═══════════════════════════════════════════════════════════
app.get('/api/stats', async (req, res) => {
    try {
        const artikel   = await db.query("SELECT COUNT(*) FROM konten WHERE kategori = 'artikel'");
        const lomba     = await db.query("SELECT COUNT(*) FROM konten WHERE kategori = 'info-lomba'");
        const prestasi  = await db.query("SELECT COUNT(*) FROM konten WHERE kategori = 'prestasi'");
        const pengurus  = await db.query("SELECT COUNT(*) FROM pengurus");
        const pesanBaru = await db.query("SELECT COUNT(*) FROM pesan WHERE sudah_dibaca = 0");

        res.json({
            artikel:   parseInt(artikel.rows[0].count),
            lomba:     parseInt(lomba.rows[0].count),
            prestasi:  parseInt(prestasi.rows[0].count),
            pengurus:  parseInt(pengurus.rows[0].count),
            pesanBaru: parseInt(pesanBaru.rows[0].count)
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});


// ═══════════════════════════════════════════════════════════
// API: KONTEN
// ═══════════════════════════════════════════════════════════
app.get('/api/konten', async (req, res) => {
    try {
        const { kategori, limit = 10, jenis, search, id } = req.query;
        let sql    = 'SELECT * FROM konten WHERE 1=1';
        const params = [];
        let i = 1;

        if (kategori) { sql += ` AND kategori = $${i++}`; params.push(kategori); }
        if (jenis)    { sql += ` AND jenis = $${i++}`;    params.push(jenis); }
        if (id)       { sql += ` AND id = $${i++}`;       params.push(id); }
        if (search)   { sql += ` AND judul ILIKE $${i++}`; params.push(`%${search}%`); }

        sql += ` ORDER BY id DESC LIMIT $${i}`;
        params.push(parseInt(limit));

        const data = await db.query(sql, params);
        const host = `${req.protocol}://${req.get('host')}`;
        const result = data.rows.map(item => ({
            ...item,
            thumbnail_url: item.thumbnail ? `${host}/uploads/${item.thumbnail}` : null
        }));
        res.json(result);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/konten/:id', async (req, res) => {
    try {
        const data = await db.query('SELECT * FROM konten WHERE id = $1', [req.params.id]);
        if (!data.rows[0]) return res.status(404).json({ error: 'Tidak ditemukan' });
        const item = data.rows[0];
        item.thumbnail_url = item.thumbnail
            ? `${req.protocol}://${req.get('host')}/uploads/${item.thumbnail}`
            : null;
        res.json(item);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/konten', upload.single('thumbnail'), async (req, res) => {
    try {
        const { kategori, judul, tanggal, isi, jenis, jenis_artikel, tingkat,
                peringkat, link_daftar, deadline, tingkat_prestasi, nama_kompetisi, anggota_tim } = req.body;
        if (!kategori || !judul) return res.status(400).json({ error: 'Kategori dan judul wajib diisi!' });

        const thumbnail = req.file ? req.file.filename : null;
        const result = await db.query(`
            INSERT INTO konten
                (kategori, judul, thumbnail, tanggal, isi, jenis, jenis_artikel,
                 tingkat, peringkat, link_daftar, deadline,
                 tingkat_prestasi, nama_kompetisi, anggota_tim)
            VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
            RETURNING id`,
            [kategori, judul, thumbnail, tanggal || null, isi || null,
             jenis || null, jenis_artikel || null, tingkat || null,
             peringkat || null, link_daftar || null, deadline || null,
             tingkat_prestasi || null, nama_kompetisi || null, anggota_tim || null]
        );
        res.json({ message: '✅ Data berhasil disimpan!', id: result.rows[0].id });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.put('/api/konten/:id', upload.single('thumbnail'), async (req, res) => {
    try {
        const { judul, tanggal, isi, jenis, jenis_artikel, tingkat,
                peringkat, link_daftar, deadline, tingkat_prestasi, nama_kompetisi, anggota_tim } = req.body;
        const existing = await db.query('SELECT * FROM konten WHERE id = $1', [req.params.id]);
        if (!existing.rows[0]) return res.status(404).json({ error: 'Tidak ditemukan' });

        let thumbnail = existing.rows[0].thumbnail;
        if (req.file) {
            if (thumbnail) {
                const oldPath = path.join(uploadDir, thumbnail);
                if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
            }
            thumbnail = req.file.filename;
        }

        await db.query(`
            UPDATE konten SET
                judul=$1, thumbnail=$2, tanggal=$3, isi=$4,
                jenis=$5, jenis_artikel=$6, tingkat=$7, peringkat=$8,
                link_daftar=$9, deadline=$10,
                tingkat_prestasi=$11, nama_kompetisi=$12, anggota_tim=$13,
                updated_at=NOW()
            WHERE id=$14`,
            [judul, thumbnail, tanggal || null, isi || null,
             jenis || null, jenis_artikel || null, tingkat || null,
             peringkat || null, link_daftar || null, deadline || null,
             tingkat_prestasi || null, nama_kompetisi || null, anggota_tim || null,
             req.params.id]
        );
        res.json({ message: '✅ Data berhasil diperbarui!' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.delete('/api/konten/:id', async (req, res) => {
    try {
        const data = await db.query('SELECT thumbnail FROM konten WHERE id = $1', [req.params.id]);
        if (!data.rows[0]) return res.status(404).json({ error: 'Tidak ditemukan' });

        if (data.rows[0].thumbnail) {
            const fp = path.join(uploadDir, data.rows[0].thumbnail);
            if (fs.existsSync(fp)) fs.unlinkSync(fp);
        }
        await db.query('DELETE FROM konten WHERE id = $1', [req.params.id]);
        res.json({ message: '🗑️ Data berhasil dihapus!' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});


// ═══════════════════════════════════════════════════════════
// API: DEPARTEMEN
// ═══════════════════════════════════════════════════════════
app.get('/api/departemen', async (req, res) => {
    try {
        const data = await db.query('SELECT * FROM departemen ORDER BY urutan ASC');
        res.json(data.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/departemen/:id', async (req, res) => {
    try {
        const data = await db.query('SELECT * FROM departemen WHERE id = $1', [req.params.id]);
        if (!data.rows[0]) return res.status(404).json({ error: 'Departemen tidak ditemukan' });
        res.json(data.rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.put('/api/departemen/:id', async (req, res) => {
    try {
        const { nama, slogan, deskripsi, ikon, warna } = req.body;
        await db.query(
            'UPDATE departemen SET nama=$1, slogan=$2, deskripsi=$3, ikon=$4, warna=$5 WHERE id=$6',
            [nama, slogan, deskripsi, ikon, warna, req.params.id]
        );
        res.json({ message: '✅ Departemen diperbarui!' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});


// ═══════════════════════════════════════════════════════════
// API: PENGURUS
// ═══════════════════════════════════════════════════════════
app.get('/api/pengurus', async (req, res) => {
    try {
        const { dept_id, jabatan_level } = req.query;
        let sql = `SELECT p.*, d.nama as nama_departemen
                   FROM pengurus p
                   LEFT JOIN departemen d ON p.dept_id = d.id
                   WHERE 1=1`;
        const params = [];
        let i = 1;

        if (dept_id !== undefined && dept_id !== '') {
            sql += ` AND p.dept_id = $${i++}`;
            params.push(dept_id);
        }
        if (jabatan_level) {
            sql += ` AND p.jabatan_level = $${i++}`;
            params.push(jabatan_level);
        }

        sql += ' ORDER BY p.urutan ASC, p.id ASC';
        const data = await db.query(sql, params);
        const host = `${req.protocol}://${req.get('host')}`;

        const result = data.rows.map(p => ({
            ...p,
            foto_url: p.foto
                ? `${host}/uploads/${p.foto}`
                : `https://ui-avatars.com/api/?name=${encodeURIComponent(p.nama)}&background=8B1A1A&color=FDF3C0&size=200`
        }));
        res.json(result);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/pengurus', upload.single('foto'), async (req, res) => {
    try {
        const { nama, jabatan, jabatan_level, dept_id, angkatan, prodi, urutan } = req.body;
        if (!nama || !jabatan) return res.status(400).json({ error: 'Nama dan jabatan wajib diisi!' });

        const foto = req.file ? req.file.filename : null;
        const result = await db.query(`
            INSERT INTO pengurus (nama, jabatan, jabatan_level, dept_id, angkatan, prodi, foto, urutan)
            VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING id`,
            [nama, jabatan, jabatan_level || 'staf',
             dept_id || null, angkatan || null, prodi || null, foto, urutan || 99]
        );
        res.json({ message: '✅ Pengurus berhasil ditambahkan!', id: result.rows[0].id });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.put('/api/pengurus/:id', upload.single('foto'), async (req, res) => {
    try {
        const { nama, jabatan, jabatan_level, dept_id, angkatan, prodi, urutan } = req.body;
        const existing = await db.query('SELECT * FROM pengurus WHERE id = $1', [req.params.id]);
        if (!existing.rows[0]) return res.status(404).json({ error: 'Tidak ditemukan' });

        let foto = existing.rows[0].foto;
        if (req.file) {
            if (foto) {
                const old = path.join(uploadDir, foto);
                if (fs.existsSync(old)) fs.unlinkSync(old);
            }
            foto = req.file.filename;
        }

        await db.query(`
            UPDATE pengurus SET
                nama=$1, jabatan=$2, jabatan_level=$3, dept_id=$4,
                angkatan=$5, prodi=$6, foto=$7, urutan=$8
            WHERE id=$9`,
            [nama, jabatan, jabatan_level, dept_id || null,
             angkatan || null, prodi || null, foto, urutan || 99, req.params.id]
        );
        res.json({ message: '✅ Data pengurus diperbarui!' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.delete('/api/pengurus/:id', async (req, res) => {
    try {
        const data = await db.query('SELECT foto FROM pengurus WHERE id = $1', [req.params.id]);
        if (!data.rows[0]) return res.status(404).json({ error: 'Tidak ditemukan' });

        if (data.rows[0].foto) {
            const fp = path.join(uploadDir, data.rows[0].foto);
            if (fs.existsSync(fp)) fs.unlinkSync(fp);
        }
        await db.query('DELETE FROM pengurus WHERE id = $1', [req.params.id]);
        res.json({ message: '🗑️ Pengurus berhasil dihapus!' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});


// ═══════════════════════════════════════════════════════════
// API: PESAN MASUK
// ═══════════════════════════════════════════════════════════
app.post('/api/pesan', async (req, res) => {
    try {
        const { nama, email, subjek, isi } = req.body;
        if (!nama || !email || !isi) return res.status(400).json({ error: 'Data tidak lengkap!' });

        await db.query(
            'INSERT INTO pesan (nama, email, subjek, isi) VALUES ($1,$2,$3,$4)',
            [nama, email, subjek || '(tanpa subjek)', isi]
        );
        res.json({ message: '✅ Pesan berhasil dikirim! Kami akan segera merespons.' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/pesan', async (req, res) => {
    try {
        const data = await db.query('SELECT * FROM pesan ORDER BY tanggal DESC');
        res.json(data.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.patch('/api/pesan/:id/baca', async (req, res) => {
    try {
        await db.query('UPDATE pesan SET sudah_dibaca = 1 WHERE id = $1', [req.params.id]);
        res.json({ message: 'Ditandai sudah dibaca' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.delete('/api/pesan/:id', async (req, res) => {
    try {
        await db.query('DELETE FROM pesan WHERE id = $1', [req.params.id]);
        res.json({ message: '🗑️ Pesan dihapus!' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});


// ─── Error Handler ────────────────────────────────────────
app.use((err, req, res, next) => {
    if (err.code === 'LIMIT_FILE_SIZE') return res.status(413).json({ error: 'File terlalu besar (max 5MB)!' });
    res.status(500).json({ error: err.message });
});

// ─── Start Server ─────────────────────────────────────────
const PORT = process.env.PORT || 3000;
app.listen(PORT, async () => {
    console.log(`\n🚀 Server KSI Mist aktif di http://localhost:${PORT}`);
    console.log(`📂 Upload folder: ${uploadDir}`);
    console.log('─────────────────────────────────────────');
    await initTabel();
});