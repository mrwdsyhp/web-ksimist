/**
 * server.js — KSI Mist FMIPA UNY
 * Backend Node.js + Express + MySQL (Laragon)
 * ─────────────────────────────────────────────
 * Endpoints:
 *   GET/POST  /api/konten       → artikel, info-lomba, prestasi
 *   DELETE    /api/konten/:id   → hapus konten
 *   GET       /api/departemen   → daftar departemen
 *   GET/PUT   /api/departemen/:id → detail & update dept
 *   GET/POST  /api/pengurus     → daftar & tambah pengurus
 *   DELETE    /api/pengurus/:id → hapus pengurus
 *   POST      /api/pesan        → kirim pesan (dari form kontak)
 *   GET       /api/pesan        → ambil semua pesan masuk
 *   DELETE    /api/pesan/:id    → hapus pesan
 *   GET       /api/stats        → statistik dashboard
 */

'use strict';

const express   = require('express');
const mysql     = require('mysql2');
const cors      = require('cors');
const multer    = require('multer');
const path      = require('path');
const fs        = require('fs');
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

// Static untuk file frontend (opsional jika dijalankan dari root)
app.use(express.static(path.join(__dirname)));

// ─── Koneksi Database ─────────────────────────────────────
const db = mysql.createPool({
    host:     process.env.DB_HOST     || 'localhost',
    user:     process.env.DB_USER     || 'root',
    password: process.env.DB_PASS     || '',
    database: process.env.DB_NAME     || 'ksi_mist',
    waitForConnections: true,
    connectionLimit: 10
});

// Test koneksi saat startup
db.getConnection((err, conn) => {
    if (err) {
        console.error('❌ Gagal terhubung ke database:', err.message);
    } else {
        console.log('✅ Database terhubung!');
        conn.release();
    }
});

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
    limits: { fileSize: 5 * 1024 * 1024 }, // max 5MB
    fileFilter: (req, file, cb) => {
        const allowed = /jpeg|jpg|png|gif|webp/;
        const ok = allowed.test(path.extname(file.originalname).toLowerCase())
                && allowed.test(file.mimetype);
        ok ? cb(null, true) : cb(new Error('Hanya file gambar yang diizinkan!'));
    }
});

// ─── Helper ───────────────────────────────────────────────
const q = (sql, params) => new Promise((resolve, reject) => {
    db.query(sql, params, (err, result) => err ? reject(err) : resolve(result));
});


// ═══════════════════════════════════════════════════════════
// API: STATISTIK DASHBOARD
// ═══════════════════════════════════════════════════════════
app.get('/api/stats', async (req, res) => {
    try {
        const [artikel]   = await q("SELECT COUNT(*) as total FROM konten WHERE kategori = 'artikel'");
        const [lomba]     = await q("SELECT COUNT(*) as total FROM konten WHERE kategori = 'info-lomba'");
        const [prestasi]  = await q("SELECT COUNT(*) as total FROM konten WHERE kategori = 'prestasi'");
        const [pengurus]  = await q("SELECT COUNT(*) as total FROM pengurus");
        const [pesanBaru] = await q("SELECT COUNT(*) as total FROM pesan WHERE sudah_dibaca = 0");

        res.json({
            artikel:   artikel.total,
            lomba:     lomba.total,
            prestasi:  prestasi.total,
            pengurus:  pengurus.total,
            pesanBaru: pesanBaru.total
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});


// ═══════════════════════════════════════════════════════════
// API: KONTEN (Artikel, Info Lomba, Prestasi)
// ═══════════════════════════════════════════════════════════

// GET /api/konten?kategori=artikel&limit=10&jenis=LKTI&search=...
app.get('/api/konten', async (req, res) => {
    try {
        const { kategori, limit = 10, jenis, search, id } = req.query;
        let sql    = 'SELECT * FROM konten WHERE 1=1';
        const params = [];

        if (kategori) { sql += ' AND kategori = ?'; params.push(kategori); }
        if (jenis)    { sql += ' AND jenis = ?';    params.push(jenis); }
        if (id)       { sql += ' AND id = ?';       params.push(id); }
        if (search)   { sql += ' AND judul LIKE ?'; params.push(`%${search}%`); }

        sql += ' ORDER BY id DESC LIMIT ?';
        params.push(parseInt(limit));

        const data = await q(sql, params);
        // Tambahkan full URL untuk thumbnail
        const result = data.map(item => ({
            ...item,
            thumbnail_url: item.thumbnail
                ? `${req.protocol}://${req.get('host')}/uploads/${item.thumbnail}`
                : null
        }));
        res.json(result);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET /api/konten/:id — detail satu konten
app.get('/api/konten/:id', async (req, res) => {
    try {
        const [item] = await q('SELECT * FROM konten WHERE id = ?', [req.params.id]);
        if (!item) return res.status(404).json({ error: 'Tidak ditemukan' });
        item.thumbnail_url = item.thumbnail
            ? `${req.protocol}://${req.get('host')}/uploads/${item.thumbnail}`
            : null;
        res.json(item);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST /api/konten — tambah konten baru
app.post('/api/konten', upload.single('thumbnail'), async (req, res) => {
    try {
        const { kategori, judul, tanggal, isi, jenis, tingkat, peringkat, link_daftar, deadline } = req.body;
        if (!kategori || !judul) return res.status(400).json({ error: 'Kategori dan judul wajib diisi!' });

        const thumbnail = req.file ? req.file.filename : null;
        const sql = `INSERT INTO konten
            (kategori, judul, thumbnail, tanggal, isi, jenis, tingkat, peringkat, link_daftar, deadline)
            VALUES (?,?,?,?,?,?,?,?,?,?)`;
        const result = await q(sql, [kategori, judul, thumbnail, tanggal || null, isi || null,
            jenis || null, tingkat || null, peringkat || null, link_daftar || null, deadline || null]);

        res.json({ message: '✅ Data berhasil disimpan!', id: result.insertId });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// PUT /api/konten/:id — edit konten
app.put('/api/konten/:id', upload.single('thumbnail'), async (req, res) => {
    try {
        const { judul, tanggal, isi, jenis, tingkat, peringkat, link_daftar, deadline } = req.body;
        const existing = await q('SELECT * FROM konten WHERE id = ?', [req.params.id]);
        if (!existing[0]) return res.status(404).json({ error: 'Tidak ditemukan' });

        let thumbnail = existing[0].thumbnail;
        if (req.file) {
            // Hapus gambar lama
            if (thumbnail) {
                const oldPath = path.join(uploadDir, thumbnail);
                if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
            }
            thumbnail = req.file.filename;
        }

        const sql = `UPDATE konten SET
            judul=?, thumbnail=?, tanggal=?, isi=?,
            jenis=?, tingkat=?, peringkat=?, link_daftar=?, deadline=?
            WHERE id=?`;
        await q(sql, [judul, thumbnail, tanggal || null, isi || null,
            jenis || null, tingkat || null, peringkat || null,
            link_daftar || null, deadline || null, req.params.id]);

        res.json({ message: '✅ Data berhasil diperbarui!' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// DELETE /api/konten/:id
app.delete('/api/konten/:id', async (req, res) => {
    try {
        const [item] = await q('SELECT thumbnail FROM konten WHERE id = ?', [req.params.id]);
        if (!item) return res.status(404).json({ error: 'Tidak ditemukan' });

        if (item.thumbnail) {
            const filePath = path.join(uploadDir, item.thumbnail);
            if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
        }
        await q('DELETE FROM konten WHERE id = ?', [req.params.id]);
        res.json({ message: '🗑️ Data berhasil dihapus!' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});


// ═══════════════════════════════════════════════════════════
// API: DEPARTEMEN
// ═══════════════════════════════════════════════════════════

// GET /api/departemen
app.get('/api/departemen', async (req, res) => {
    try {
        const data = await q('SELECT * FROM departemen ORDER BY urutan ASC');
        res.json(data);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET /api/departemen/:id
app.get('/api/departemen/:id', async (req, res) => {
    try {
        const [dept] = await q('SELECT * FROM departemen WHERE id = ?', [req.params.id]);
        if (!dept) return res.status(404).json({ error: 'Departemen tidak ditemukan' });
        res.json(dept);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// PUT /api/departemen/:id — update info departemen
app.put('/api/departemen/:id', async (req, res) => {
    try {
        const { nama, slogan, deskripsi, ikon, warna } = req.body;
        await q('UPDATE departemen SET nama=?, slogan=?, deskripsi=?, ikon=?, warna=? WHERE id=?',
            [nama, slogan, deskripsi, ikon, warna, req.params.id]);
        res.json({ message: '✅ Departemen diperbarui!' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});


// ═══════════════════════════════════════════════════════════
// API: PENGURUS (Inti + Departemen)
// ═══════════════════════════════════════════════════════════

// GET /api/pengurus?dept_id=0&jabatan_level=pimpinan
app.get('/api/pengurus', async (req, res) => {
    try {
        const { dept_id, jabatan_level } = req.query;
        let sql = `SELECT p.*, d.nama as nama_departemen
                   FROM pengurus p
                   LEFT JOIN departemen d ON p.dept_id = d.id
                   WHERE 1=1`;
        const params = [];

        if (dept_id !== undefined) { sql += ' AND p.dept_id = ?'; params.push(dept_id); }
        if (jabatan_level)         { sql += ' AND p.jabatan_level = ?'; params.push(jabatan_level); }

        sql += ' ORDER BY p.urutan ASC, p.id ASC';
        const data = await q(sql, params);

        const result = data.map(p => ({
            ...p,
            foto_url: p.foto
                ? `${req.protocol}://${req.get('host')}/uploads/${p.foto}`
                : `https://ui-avatars.com/api/?name=${encodeURIComponent(p.nama)}&background=8B1A1A&color=FDF3C0&size=200`
        }));
        res.json(result);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST /api/pengurus
app.post('/api/pengurus', upload.single('foto'), async (req, res) => {
    try {
        const { nama, jabatan, jabatan_level, dept_id, angkatan, prodi, urutan } = req.body;
        if (!nama || !jabatan) return res.status(400).json({ error: 'Nama dan jabatan wajib diisi!' });

        const foto = req.file ? req.file.filename : null;
        const sql = `INSERT INTO pengurus (nama, jabatan, jabatan_level, dept_id, angkatan, prodi, foto, urutan)
                     VALUES (?,?,?,?,?,?,?,?)`;
        const result = await q(sql, [nama, jabatan, jabatan_level || 'staf',
            dept_id || 0, angkatan || null, prodi || null, foto, urutan || 99]);

        res.json({ message: '✅ Pengurus berhasil ditambahkan!', id: result.insertId });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// PUT /api/pengurus/:id
app.put('/api/pengurus/:id', upload.single('foto'), async (req, res) => {
    try {
        const { nama, jabatan, jabatan_level, dept_id, angkatan, prodi, urutan } = req.body;
        const [existing] = await q('SELECT * FROM pengurus WHERE id = ?', [req.params.id]);
        if (!existing) return res.status(404).json({ error: 'Tidak ditemukan' });

        let foto = existing.foto;
        if (req.file) {
            if (foto) {
                const old = path.join(uploadDir, foto);
                if (fs.existsSync(old)) fs.unlinkSync(old);
            }
            foto = req.file.filename;
        }

        await q(`UPDATE pengurus SET nama=?, jabatan=?, jabatan_level=?, dept_id=?,
                 angkatan=?, prodi=?, foto=?, urutan=? WHERE id=?`,
            [nama, jabatan, jabatan_level, dept_id || 0,
             angkatan || null, prodi || null, foto, urutan || 99, req.params.id]);

        res.json({ message: '✅ Data pengurus diperbarui!' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// DELETE /api/pengurus/:id
app.delete('/api/pengurus/:id', async (req, res) => {
    try {
        const [p] = await q('SELECT foto FROM pengurus WHERE id = ?', [req.params.id]);
        if (!p) return res.status(404).json({ error: 'Tidak ditemukan' });

        if (p.foto) {
            const fp = path.join(uploadDir, p.foto);
            if (fs.existsSync(fp)) fs.unlinkSync(fp);
        }
        await q('DELETE FROM pengurus WHERE id = ?', [req.params.id]);
        res.json({ message: '🗑️ Pengurus berhasil dihapus!' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});


// ═══════════════════════════════════════════════════════════
// API: PESAN MASUK
// ═══════════════════════════════════════════════════════════

// POST /api/pesan — dari form Hubungi Kami
app.post('/api/pesan', async (req, res) => {
    try {
        const { nama, email, subjek, isi } = req.body;
        if (!nama || !email || !isi) return res.status(400).json({ error: 'Data tidak lengkap!' });

        await q('INSERT INTO pesan (nama, email, subjek, isi) VALUES (?,?,?,?)',
            [nama, email, subjek || '(tanpa subjek)', isi]);
        res.json({ message: '✅ Pesan berhasil dikirim! Kami akan segera merespons.' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET /api/pesan
app.get('/api/pesan', async (req, res) => {
    try {
        const data = await q('SELECT * FROM pesan ORDER BY tanggal DESC');
        res.json(data);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// PATCH /api/pesan/:id/baca — tandai sudah dibaca
app.patch('/api/pesan/:id/baca', async (req, res) => {
    try {
        await q('UPDATE pesan SET sudah_dibaca = 1 WHERE id = ?', [req.params.id]);
        res.json({ message: 'Ditandai sudah dibaca' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// DELETE /api/pesan/:id
app.delete('/api/pesan/:id', async (req, res) => {
    try {
        await q('DELETE FROM pesan WHERE id = ?', [req.params.id]);
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
app.listen(PORT, () => {
    console.log(`\n🚀 Server KSI Mist aktif di http://localhost:${PORT}`);
    console.log(`📂 Upload folder: ${uploadDir}`);
    console.log('─────────────────────────────────────────\n');
});