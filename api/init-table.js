/**
 * init-table.js — Buat tabel admin_user di database
 * Jalankan: node init-table.js
 */
require('dotenv').config();
const mysql = require('mysql2/promise');

(async () => {
    try {
        const db = await mysql.createPool(
            process.env.DATABASE_URL + '?ssl={"rejectUnauthorized":false}'
        );

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

        console.log('✅ Tabel admin_user berhasil dibuat!');
        process.exit(0);
    } catch (err) {
        console.error('❌ Error:', err.message);
        process.exit(1);
    }
})();