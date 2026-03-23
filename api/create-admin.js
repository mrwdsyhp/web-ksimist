/**
 * create-admin.js — KSI Mist FMIPA UNY
 * Script CLI untuk membuat akun admin baru
 * ─────────────────────────────────────────────────────────
 * Cara pakai:
 *   node create-admin.js
 *
 * Jalankan HANYA di server/terminal, bukan lewat browser.
 * ─────────────────────────────────────────────────────────
 */

'use strict';

const mysql   = require('mysql2/promise');
const bcrypt  = require('bcryptjs');
const readline = require('readline');
require('dotenv').config();

// ── Koneksi DB (sama persis dengan server.js) ─────────────
async function connectDB() {
    if (process.env.DATABASE_URL) {
        return mysql.createPool(process.env.DATABASE_URL + '?ssl={"rejectUnauthorized":false}');
    }
    return mysql.createPool({
        host:     process.env.DB_HOST || 'localhost',
        user:     process.env.DB_USER || 'root',
        password: process.env.DB_PASS || '',
        database: process.env.DB_NAME || 'ksimist_db',
        port:     process.env.DB_PORT || 3306,
    });
}

// ── Helper: tanya input di terminal ──────────────────────
function tanya(rl, pertanyaan, hidden = false) {
    return new Promise(resolve => {
        if (hidden && process.stdin.isTTY) {
            // Sembunyikan input password di terminal
            process.stdout.write(pertanyaan);
            process.stdin.setRawMode(true);
            process.stdin.resume();
            let input = '';
            process.stdin.on('data', function onData(ch) {
                ch = ch.toString();
                if (ch === '\n' || ch === '\r' || ch === '\u0003') {
                    process.stdin.setRawMode(false);
                    process.stdin.pause();
                    process.stdin.removeListener('data', onData);
                    process.stdout.write('\n');
                    resolve(input);
                } else if (ch === '\u007f') {
                    // Backspace
                    if (input.length > 0) {
                        input = input.slice(0, -1);
                        process.stdout.clearLine(0);
                        process.stdout.cursorTo(0);
                        process.stdout.write(pertanyaan + '*'.repeat(input.length));
                    }
                } else {
                    input += ch;
                    process.stdout.write('*');
                }
            });
        } else {
            rl.question(pertanyaan, resolve);
        }
    });
}

// ── Main ──────────────────────────────────────────────────
(async () => {
    console.log('\n╔══════════════════════════════════════════╗');
    console.log('║   KSI Mist — Buat Akun Admin Baru       ║');
    console.log('╚══════════════════════════════════════════╝\n');

    let db;
    try {
        db = await connectDB();
        await db.query('SELECT 1');
        console.log('✅ Database terhubung!\n');
    } catch (err) {
        console.error('❌ Gagal koneksi database:', err.message);
        process.exit(1);
    }

    const rl = readline.createInterface({
        input:  process.stdin,
        output: process.stdout,
    });

    try {
        // Cek jumlah admin yang sudah ada
        const [[{ total }]] = await db.query('SELECT COUNT(*) as total FROM admin_user');
        const isFirst = parseInt(total) === 0;

        if (isFirst) {
            console.log('ℹ️  Belum ada akun admin. Akun pertama akan otomatis menjadi SUPERADMIN.\n');
        } else {
            console.log(`ℹ️  Sudah ada ${total} akun admin. Akun baru akan berperan sebagai ADMIN.\n`);
        }

        // Input data
        const nama     = (await tanya(rl, '📝 Nama Lengkap   : ')).trim();
        const username = (await tanya(rl, '👤 Username       : ')).trim();
        const email    = (await tanya(rl, '📧 Email          : ')).trim();
        const password = (await tanya(rl, '🔒 Password       : ', true)).trim();
        const konfirm  = (await tanya(rl, '🔒 Konfirmasi     : ', true)).trim();

        let role = 'admin';
        if (!isFirst) {
            const pilihanRole = (await tanya(rl, '🔑 Role [admin/superadmin] (default: admin) : ')).trim().toLowerCase();
            if (pilihanRole === 'superadmin') role = 'superadmin';
        } else {
            role = 'superadmin';
        }

        rl.close();

        // Validasi
        const errors = [];
        if (!nama)     errors.push('Nama tidak boleh kosong');
        if (!username) errors.push('Username tidak boleh kosong');
        if (username.includes(' ')) errors.push('Username tidak boleh mengandung spasi');
        if (!email || !email.includes('@')) errors.push('Email tidak valid');
        if (password.length < 6) errors.push('Password minimal 6 karakter');
        if (password !== konfirm) errors.push('Konfirmasi password tidak cocok');

        if (errors.length > 0) {
            console.log('\n❌ Validasi gagal:');
            errors.forEach(e => console.log(`   • ${e}`));
            process.exit(1);
        }

        // Cek duplikat
        const [existing] = await db.query(
            'SELECT id FROM admin_user WHERE username = ? OR email = ?',
            [username, email]
        );
        if (existing.length > 0) {
            console.log('\n❌ Username atau email sudah digunakan!');
            process.exit(1);
        }

        // Hash & simpan
        console.log('\n⏳ Membuat akun...');
        const hashedPassword = await bcrypt.hash(password, 12);
        const [result] = await db.query(
            'INSERT INTO admin_user (username, email, password, nama, role) VALUES (?,?,?,?,?)',
            [username, email, hashedPassword, nama, role]
        );

        console.log('\n╔══════════════════════════════════════════╗');
        console.log('║   ✅ Akun berhasil dibuat!               ║');
        console.log('╚══════════════════════════════════════════╝');
        console.log(`   ID       : ${result.insertId}`);
        console.log(`   Nama     : ${nama}`);
        console.log(`   Username : ${username}`);
        console.log(`   Email    : ${email}`);
        console.log(`   Role     : ${role.toUpperCase()}`);
        console.log('\n   Sekarang bisa login di halaman admin.\n');

    } catch (err) {
        console.error('\n❌ Error:', err.message);
        rl.close();
        process.exit(1);
    }

    process.exit(0);
})();