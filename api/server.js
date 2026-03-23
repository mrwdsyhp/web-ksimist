/**
 * server.js — KSI Mist FMIPA UNY
 * Backend Node.js + Express + MySQL (Railway)
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
const BASE_URL = 'https://web-ksimist-production.up.railway.app';

const express = require('express');
const mysql   = require('mysql2/promise');
const cors    = require('cors');
const multer  = require('multer');
const path    = require('path');
const fs      = require('fs');
const bcrypt  = require('bcryptjs');
const jwt     = require('jsonwebtoken');
require('dotenv').config();

const JWT_SECRET  = process.env.JWT_SECRET  || 'ksi-mist-secret-key-ganti-di-env';
const JWT_EXPIRES = process.env.JWT_EXPIRES || '8h';

const app = express();

// ─── Middleware ───────────────────────────────────────────
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Static folder untuk gambar upload
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
app.use('/uploads', express.static(uploadDir));

// Serve semua file statis dari root project
const rootDir = path.resolve(__dirname, '..');
app.use(express.static(rootDir));
app.use(express.static(path.join(__dirname)));

// Fallback eksplisit untuk halaman-halaman utama
app.get('/',                  (req, res) => res.sendFile(path.join(rootDir, 'index.html')));
app.get('/index.html',        (req, res) => res.sendFile(path.join(rootDir, 'index.html')));
app.get('/admin/login.html',  (req, res) => res.sendFile(path.join(rootDir, 'admin', 'login.html')));
app.get('/admin/admin.html',  (req, res) => res.sendFile(path.join(rootDir, 'admin', 'admin.html')));
app.get('/artikel.html',      (req, res) => res.sendFile(path.join(rootDir, 'artikel.html')));
app.get('/departemen.html',   (req, res) => res.sendFile(path.join(rootDir, 'departemen.html')));
app.get('/info-lomba.html',   (req, res) => res.sendFile(path.join(rootDir, 'info-lomba.html')));
app.get('/prestasi.html',     (req, res) => res.sendFile(path.join(rootDir, 'prestasi.html')));
app.get('/hubungi-kami.html', (req, res) => res.sendFile(path.join(rootDir, 'hubungi-kami.html')));
app.get('/detail-departemen.html', (req, res) => res.sendFile(path.join(rootDir, 'detail-departemen.html')));

// ─── Koneksi MySQL ────────────────────────────────────────
let db;

async function connectDB() {
    try {
        // Support DATABASE_URL (Railway) atau env terpisah
        if (process.env.DATABASE_URL) {
            db = await mysql.createPool(process.env.DATABASE_URL + '?ssl={"rejectUnauthorized":false}');
        } else {
            db = await mysql.createPool({
                host:     process.env.DB_HOST     || 'localhost',
                user:     process.env.DB_USER     || 'root',
                password: process.env.DB_PASS     || '',
                database: process.env.DB_NAME     || 'ksimist_db',
                port:     process.env.DB_PORT     || 3306,
                waitForConnections: true,
                connectionLimit:    10,
            });
        }
        // Test koneksi
        await db.query('SELECT 1');
        console.log('✅ Database MySQL terhubung!');
    } catch (err) {
        console.error('❌ Gagal koneksi database:', err.message);
        process.exit(1);
    }
}

// ─── Helper query MySQL ───────────────────────────────────
// MySQL pakai ? bukan $1,$2
const q = async (sql, params = []) => {
    const [rows] = await db.query(sql, params);
    return rows;
};

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


// ═══════════════════════════════════════════════════════════
// INISIALISASI TABEL (auto-create saat server start)
// ═══════════════════════════════════════════════════════════
async function initTabel() {
    await db.query(`
        CREATE TABLE IF NOT EXISTS \`konten\` (
            \`id\`               INT AUTO_INCREMENT PRIMARY KEY,
            \`kategori\`         ENUM('artikel','info-lomba','prestasi') NOT NULL,
            \`judul\`            VARCHAR(300) NOT NULL,
            \`thumbnail\`        VARCHAR(255) DEFAULT NULL,
            \`tanggal\`          DATE         DEFAULT NULL,
            \`isi\`              TEXT         DEFAULT NULL,
            \`jenis_artikel\`    ENUM('Berita','Kegiatan','Opini','Tutorial','Lainnya') DEFAULT NULL,
            \`jenis\`            ENUM('LKTI','Essay','Desain','BPC','PKM','Internasional','Lainnya') DEFAULT NULL,
            \`tingkat\`          ENUM('Nasional','Internasional','Regional','Internal') DEFAULT NULL,
            \`link_daftar\`      VARCHAR(500) DEFAULT NULL,
            \`deadline\`         DATE         DEFAULT NULL,
            \`peringkat\`        VARCHAR(50)  DEFAULT NULL,
            \`tingkat_prestasi\` ENUM('Nasional','Internasional','Regional','Internal') DEFAULT NULL,
            \`nama_kompetisi\`   VARCHAR(300) DEFAULT NULL,
            \`anggota_tim\`      TEXT         DEFAULT NULL,
            \`created_at\`       TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
            \`updated_at\`       TIMESTAMP    DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    await db.query(`
        CREATE TABLE IF NOT EXISTS \`departemen\` (
            \`id\`        INT AUTO_INCREMENT PRIMARY KEY,
            \`kode\`      VARCHAR(20)  NOT NULL UNIQUE,
            \`nama\`      VARCHAR(100) NOT NULL,
            \`slogan\`    VARCHAR(200) DEFAULT NULL,
            \`deskripsi\` TEXT         DEFAULT NULL,
            \`ikon\`      VARCHAR(50)  DEFAULT 'fa-users',
            \`warna\`     VARCHAR(20)  DEFAULT '#8B1A1A',
            \`urutan\`    INT          DEFAULT 99
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    await db.query(`
        CREATE TABLE IF NOT EXISTS \`pengurus\` (
            \`id\`            INT AUTO_INCREMENT PRIMARY KEY,
            \`dept_id\`       INT          DEFAULT NULL,
            \`nama\`          VARCHAR(150) NOT NULL,
            \`jabatan\`       VARCHAR(150) NOT NULL,
            \`jabatan_level\` ENUM('inti','kepala','staf_ahli','staf') NOT NULL DEFAULT 'staf',
            \`angkatan\`      YEAR         DEFAULT NULL,
            \`prodi\`         VARCHAR(100) DEFAULT NULL,
            \`foto\`          VARCHAR(255) DEFAULT NULL,
            \`urutan\`        INT          DEFAULT 99,
            \`created_at\`    TIMESTAMP    DEFAULT CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    await db.query(`
        CREATE TABLE IF NOT EXISTS \`pesan\` (
            \`id\`           INT AUTO_INCREMENT PRIMARY KEY,
            \`nama\`         VARCHAR(150) NOT NULL,
            \`email\`        VARCHAR(150) NOT NULL,
            \`subjek\`       VARCHAR(300) DEFAULT '(tanpa subjek)',
            \`isi\`          TEXT         NOT NULL,
            \`sudah_dibaca\` TINYINT(1)   DEFAULT 0,
            \`tanggal\`      TIMESTAMP    DEFAULT CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    // Seed departemen kalau belum ada
    const [cek] = await db.query('SELECT COUNT(*) as total FROM departemen');
    if (parseInt(cek[0].total) === 0) {
        await db.query(`
            INSERT INTO departemen (kode, nama, slogan, deskripsi, ikon, warna, urutan) VALUES
            ('INTI',  'Pengurus Inti',             'Pilar Kepemimpinan Organisasi',      'Ketua, Wakil Ketua, Sekretaris, dan Bendahara.',                    'fa-crown',     '#D4AF37', 1),
            ('SDA',   'Sumber Daya Anggota',       'Membangun Insan Unggul Berkualitas', 'Pengembangan kapasitas dan kesejahteraan anggota.',                 'fa-users',     '#8B1A1A', 2),
            ('KPL',   'Kajian, Penalaran & Lomba', 'Mengasah Nalar, Meraih Prestasi',   'Mendorong budaya riset, kajian ilmiah, dan kompetisi.',             'fa-trophy',    '#1A1F3A', 3),
            ('HI',    'Hubungan & Informasi',      'Jembatan Informasi & Kolaborasi',   'Mengelola komunikasi, media sosial, dan hubungan eksternal.',       'fa-handshake', '#2E8B57', 4),
            ('RISET', 'Riset',                     'Inovasi Ilmiah Tanpa Henti',        'Mengkoordinasikan kegiatan penelitian dan pengembangan ilmu.',      'fa-microscope','#6A0DAD', 5),
            ('WIRAU', 'Kewirausahaan',             'Menumbuhkan Jiwa Wirausaha Ilmiah', 'Mengembangkan potensi kewirausahaan berbasis sains dan teknologi.', 'fa-coins',     '#D2691E', 6)
        `);
        console.log('✅ Seed data departemen selesai!');
    }

    // Tabel admin (akun login dashboard)
    await db.query(`
        CREATE TABLE IF NOT EXISTS \`admin_user\` (
            \`id\`         INT AUTO_INCREMENT PRIMARY KEY,
            \`username\`   VARCHAR(80)  NOT NULL UNIQUE,
            \`email\`      VARCHAR(150) NOT NULL UNIQUE,
            \`password\`   VARCHAR(255) NOT NULL,
            \`nama\`       VARCHAR(150) NOT NULL,
            \`role\`       ENUM('superadmin','admin') NOT NULL DEFAULT 'admin',
            \`aktif\`      TINYINT(1)   NOT NULL DEFAULT 1,
            \`created_at\` TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
            \`last_login\` TIMESTAMP    NULL DEFAULT NULL
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    console.log('✅ Semua tabel siap!');
}

// ─── Middleware: Verifikasi JWT ───────────────────────────
function authMiddleware(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.startsWith('Bearer ')
        ? authHeader.slice(7)
        : null;

    if (!token) {
        return res.status(401).json({ error: 'Akses ditolak. Token tidak ditemukan.' });
    }

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.admin = decoded;
        next();
    } catch (err) {
        return res.status(401).json({ error: 'Token tidak valid atau sudah kedaluwarsa.' });
    }
}

// ─── Middleware: Hanya superadmin ─────────────────────────
function superAdminOnly(req, res, next) {
    if (req.admin?.role !== 'superadmin') {
        return res.status(403).json({ error: 'Hanya superadmin yang dapat melakukan ini.' });
    }
    next();
}


// ═══════════════════════════════════════════════════════════
// API: AUTENTIKASI
// ═══════════════════════════════════════════════════════════

// ── LOGIN ─────────────────────────────────────────────────
app.post('/api/auth/login', async (req, res) => {
    try {
        const { username, password } = req.body;

        if (!username || !password) {
            return res.status(400).json({ error: 'Username dan password wajib diisi!' });
        }

        // Cari user (bisa pakai username atau email)
        const rows = await q(
            'SELECT * FROM admin_user WHERE (username = ? OR email = ?) AND aktif = 1',
            [username, username]
        );

        if (rows.length === 0) {
            return res.status(401).json({ error: 'Username atau password salah.' });
        }

        const admin = rows[0];

        // Cek password
        const passwordMatch = await bcrypt.compare(password, admin.password);
        if (!passwordMatch) {
            return res.status(401).json({ error: 'Username atau password salah.' });
        }

        // Update last_login
        await db.query('UPDATE admin_user SET last_login = NOW() WHERE id = ?', [admin.id]);

        // Buat JWT token
        const token = jwt.sign(
            { id: admin.id, username: admin.username, nama: admin.nama, role: admin.role },
            JWT_SECRET,
            { expiresIn: JWT_EXPIRES }
        );

        res.json({
            message: '✅ Login berhasil!',
            token,
            user: {
                id:       admin.id,
                username: admin.username,
                nama:     admin.nama,
                email:    admin.email,
                role:     admin.role,
            }
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ── CEK TOKEN (untuk validasi di frontend) ─────────────────
app.get('/api/auth/me', authMiddleware, async (req, res) => {
    try {
        const rows = await q(
            'SELECT id, username, nama, email, role, last_login FROM admin_user WHERE id = ?',
            [req.admin.id]
        );
        if (!rows[0]) return res.status(404).json({ error: 'Admin tidak ditemukan.' });
        res.json(rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ── GANTI PASSWORD ─────────────────────────────────────────
app.put('/api/auth/password', authMiddleware, async (req, res) => {
    try {
        const { password_lama, password_baru } = req.body;
        if (!password_lama || !password_baru) {
            return res.status(400).json({ error: 'Password lama dan baru wajib diisi!' });
        }
        if (password_baru.length < 6) {
            return res.status(400).json({ error: 'Password baru minimal 6 karakter!' });
        }

        const rows = await q('SELECT * FROM admin_user WHERE id = ?', [req.admin.id]);
        const match = await bcrypt.compare(password_lama, rows[0].password);
        if (!match) return res.status(401).json({ error: 'Password lama salah!' });

        const hashed = await bcrypt.hash(password_baru, 12);
        await db.query('UPDATE admin_user SET password = ? WHERE id = ?', [hashed, req.admin.id]);
        res.json({ message: '✅ Password berhasil diubah!' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ── LIST ADMIN (superadmin only) ───────────────────────────
app.get('/api/auth/admins', authMiddleware, superAdminOnly, async (req, res) => {
    try {
        const rows = await q(
            'SELECT id, username, nama, email, role, aktif, created_at, last_login FROM admin_user ORDER BY created_at ASC'
        );
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ── NONAKTIFKAN ADMIN (superadmin only) ────────────────────
app.patch('/api/auth/admins/:id/toggle', authMiddleware, superAdminOnly, async (req, res) => {
    try {
        if (parseInt(req.params.id) === req.admin.id) {
            return res.status(400).json({ error: 'Tidak dapat menonaktifkan akun sendiri!' });
        }
        const rows = await q('SELECT aktif FROM admin_user WHERE id = ?', [req.params.id]);
        if (!rows[0]) return res.status(404).json({ error: 'Admin tidak ditemukan.' });

        const newStatus = rows[0].aktif ? 0 : 1;
        await db.query('UPDATE admin_user SET aktif = ? WHERE id = ?', [newStatus, req.params.id]);
        res.json({ message: newStatus ? '✅ Akun diaktifkan!' : '🔒 Akun dinonaktifkan!' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});


// ═══════════════════════════════════════════════════════════
// API: STATISTIK DASHBOARD
// ═══════════════════════════════════════════════════════════
app.get('/api/stats', authMiddleware, async (req, res) => {
    try {
        const [[artikel]]   = await db.query("SELECT COUNT(*) as c FROM konten WHERE kategori = 'artikel'");
        const [[lomba]]     = await db.query("SELECT COUNT(*) as c FROM konten WHERE kategori = 'info-lomba'");
        const [[prestasi]]  = await db.query("SELECT COUNT(*) as c FROM konten WHERE kategori = 'prestasi'");
        const [[pengurus]]  = await db.query("SELECT COUNT(*) as c FROM pengurus");
        const [[pesanBaru]] = await db.query("SELECT COUNT(*) as c FROM pesan WHERE sudah_dibaca = 0");

        res.json({
            artikel:   parseInt(artikel.c),
            lomba:     parseInt(lomba.c),
            prestasi:  parseInt(prestasi.c),
            pengurus:  parseInt(pengurus.c),
            pesanBaru: parseInt(pesanBaru.c)
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

        if (kategori) { sql += ' AND kategori = ?'; params.push(kategori); }
        if (jenis)    { sql += ' AND jenis = ?';    params.push(jenis); }
        if (id)       { sql += ' AND id = ?';       params.push(id); }
        if (search)   { sql += ' AND judul LIKE ?'; params.push(`%${search}%`); }

        sql += ' ORDER BY id DESC LIMIT ?';
        params.push(parseInt(limit));

        const rows = await q(sql, params);
        const host = `${req.protocol}://${req.get('host')}`;
        const result = rows.map(item => ({
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
        const rows = await q('SELECT * FROM konten WHERE id = ?', [req.params.id]);
        if (!rows[0]) return res.status(404).json({ error: 'Tidak ditemukan' });
        const item = rows[0];
        item.thumbnail_url = item.thumbnail
            ? `${req.protocol}://${req.get('host')}/uploads/${item.thumbnail}`
            : null;
        res.json(item);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/konten', authMiddleware, upload.single('thumbnail'), async (req, res) => {
    try {
        const { kategori, judul, tanggal, isi, jenis, jenis_artikel, tingkat,
                peringkat, link_daftar, deadline, tingkat_prestasi, nama_kompetisi, anggota_tim } = req.body;
        if (!kategori || !judul) return res.status(400).json({ error: 'Kategori dan judul wajib diisi!' });

        const thumbnail = req.file ? req.file.filename : null;
        const [result] = await db.query(`
            INSERT INTO konten
                (kategori, judul, thumbnail, tanggal, isi, jenis, jenis_artikel,
                 tingkat, peringkat, link_daftar, deadline,
                 tingkat_prestasi, nama_kompetisi, anggota_tim)
            VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
            [kategori, judul, thumbnail, tanggal || null, isi || null,
             jenis || null, jenis_artikel || null, tingkat || null,
             peringkat || null, link_daftar || null, deadline || null,
             tingkat_prestasi || null, nama_kompetisi || null, anggota_tim || null]
        );
        res.json({ message: '✅ Data berhasil disimpan!', id: result.insertId });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.put('/api/konten/:id', authMiddleware, upload.single('thumbnail'), async (req, res) => {
    try {
        const { judul, tanggal, isi, jenis, jenis_artikel, tingkat,
                peringkat, link_daftar, deadline, tingkat_prestasi, nama_kompetisi, anggota_tim } = req.body;

        const rows = await q('SELECT * FROM konten WHERE id = ?', [req.params.id]);
        if (!rows[0]) return res.status(404).json({ error: 'Tidak ditemukan' });

        let thumbnail = rows[0].thumbnail;
        if (req.file) {
            if (thumbnail) {
                const oldPath = path.join(uploadDir, thumbnail);
                if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
            }
            thumbnail = req.file.filename;
        }

        await db.query(`
            UPDATE konten SET
                judul=?, thumbnail=?, tanggal=?, isi=?,
                jenis=?, jenis_artikel=?, tingkat=?, peringkat=?,
                link_daftar=?, deadline=?,
                tingkat_prestasi=?, nama_kompetisi=?, anggota_tim=?
            WHERE id=?`,
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

app.delete('/api/konten/:id', authMiddleware, async (req, res) => {
    try {
        const rows = await q('SELECT thumbnail FROM konten WHERE id = ?', [req.params.id]);
        if (!rows[0]) return res.status(404).json({ error: 'Tidak ditemukan' });

        if (rows[0].thumbnail) {
            const fp = path.join(uploadDir, rows[0].thumbnail);
            if (fs.existsSync(fp)) fs.unlinkSync(fp);
        }
        await db.query('DELETE FROM konten WHERE id = ?', [req.params.id]);
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
        const rows = await q('SELECT * FROM departemen ORDER BY urutan ASC');
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/departemen/:id', async (req, res) => {
    try {
        const rows = await q('SELECT * FROM departemen WHERE id = ?', [req.params.id]);
        if (!rows[0]) return res.status(404).json({ error: 'Departemen tidak ditemukan' });
        res.json(rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.put('/api/departemen/:id', authMiddleware, async (req, res) => {
    try {
        const { nama, slogan, deskripsi, ikon, warna } = req.body;
        await db.query(
            'UPDATE departemen SET nama=?, slogan=?, deskripsi=?, ikon=?, warna=? WHERE id=?',
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

        if (dept_id !== undefined && dept_id !== '') {
            sql += ' AND p.dept_id = ?';
            params.push(dept_id);
        }
        if (jabatan_level) {
            sql += ' AND p.jabatan_level = ?';
            params.push(jabatan_level);
        }

        sql += ' ORDER BY p.urutan ASC, p.id ASC';
        const rows = await q(sql, params);
        const host = `${req.protocol}://${req.get('host')}`;

        const result = rows.map(p => ({
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

app.post('/api/pengurus', authMiddleware, upload.single('foto'), async (req, res) => {
    try {
        const { nama, jabatan, jabatan_level, dept_id, angkatan, prodi, urutan } = req.body;
        if (!nama || !jabatan) return res.status(400).json({ error: 'Nama dan jabatan wajib diisi!' });

        const foto = req.file ? req.file.filename : null;
        const [result] = await db.query(`
            INSERT INTO pengurus (nama, jabatan, jabatan_level, dept_id, angkatan, prodi, foto, urutan)
            VALUES (?,?,?,?,?,?,?,?)`,
            [nama, jabatan, jabatan_level || 'staf',
             dept_id || null, angkatan || null, prodi || null, foto, urutan || 99]
        );
        res.json({ message: '✅ Pengurus berhasil ditambahkan!', id: result.insertId });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.put('/api/pengurus/:id', authMiddleware, upload.single('foto'), async (req, res) => {
    try {
        const { nama, jabatan, jabatan_level, dept_id, angkatan, prodi, urutan } = req.body;
        const rows = await q('SELECT * FROM pengurus WHERE id = ?', [req.params.id]);
        if (!rows[0]) return res.status(404).json({ error: 'Tidak ditemukan' });

        let foto = rows[0].foto;
        if (req.file) {
            if (foto) {
                const old = path.join(uploadDir, foto);
                if (fs.existsSync(old)) fs.unlinkSync(old);
            }
            foto = req.file.filename;
        }

        await db.query(`
            UPDATE pengurus SET
                nama=?, jabatan=?, jabatan_level=?, dept_id=?,
                angkatan=?, prodi=?, foto=?, urutan=?
            WHERE id=?`,
            [nama, jabatan, jabatan_level, dept_id || null,
             angkatan || null, prodi || null, foto, urutan || 99, req.params.id]
        );
        res.json({ message: '✅ Data pengurus diperbarui!' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.delete('/api/pengurus/:id', authMiddleware, async (req, res) => {
    try {
        const rows = await q('SELECT foto FROM pengurus WHERE id = ?', [req.params.id]);
        if (!rows[0]) return res.status(404).json({ error: 'Tidak ditemukan' });

        if (rows[0].foto) {
            const fp = path.join(uploadDir, rows[0].foto);
            if (fs.existsSync(fp)) fs.unlinkSync(fp);
        }
        await db.query('DELETE FROM pengurus WHERE id = ?', [req.params.id]);
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
            'INSERT INTO pesan (nama, email, subjek, isi) VALUES (?,?,?,?)',
            [nama, email, subjek || '(tanpa subjek)', isi]
        );
        res.json({ message: '✅ Pesan berhasil dikirim! Kami akan segera merespons.' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/pesan', authMiddleware, async (req, res) => {
    try {
        const rows = await q('SELECT * FROM pesan ORDER BY tanggal DESC');
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.patch('/api/pesan/:id/baca', authMiddleware, async (req, res) => {
    try {
        await db.query('UPDATE pesan SET sudah_dibaca = 1 WHERE id = ?', [req.params.id]);
        res.json({ message: 'Ditandai sudah dibaca' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.delete('/api/pesan/:id', authMiddleware, async (req, res) => {
    try {
        await db.query('DELETE FROM pesan WHERE id = ?', [req.params.id]);
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

(async () => {
    await connectDB();
    await initTabel();
    app.listen(PORT, () => {
        console.log(`\n🚀 Server KSI Mist aktif di http://localhost:${PORT}`);
        console.log(`📂 Upload folder: ${uploadDir}`);
        console.log('─────────────────────────────────────────');
    });
})();