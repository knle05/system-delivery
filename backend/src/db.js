// db.js
const dotenv = require('dotenv');
dotenv.config();
const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');

let pool = null;

// remove surrounding quotes/newlines
function normalizeEnv(v) {
  if (typeof v !== 'string') return v;
  return v.replace(/^\s*['"]|['"]\s*$/g, '').replace(/\r?\n/g, '').trim();
}

function resolveCA(p) {
  if (!p) return null;
  const candidates = [
    p,
    path.resolve(p),                                   // as-is
    path.resolve(__dirname, p),                        // relative to this file
    path.resolve(process.cwd(), p),                    // relative to CWD
    path.join(process.cwd(), 'backend', p.replace(/^\.?\//, '')), // common monorepo layout
  ];
  for (const c of candidates) {
    try {
      if (fs.existsSync(c)) return c;
    } catch {}
  }
  return null;
}

async function initDB() {
  if (pool) return pool;

  const host = normalizeEnv(process.env.DB_HOST) || '127.0.0.1';
  const port = Number(normalizeEnv(process.env.DB_PORT) || 3306);
  const user = normalizeEnv(process.env.DB_USER);
  const password = normalizeEnv(process.env.DB_PASSWORD);
  const database = normalizeEnv(process.env.DB_NAME) || 'own_delivery';

  const wantSSL = ['required', 'true', '1', 'yes'].includes(
    String(normalizeEnv(process.env.DB_SSL) || '').toLowerCase()
  );

  let ssl;
  let caUsed = null;
  const caPathEnv = normalizeEnv(process.env.DB_CA_PATH);
  const caPath = resolveCA(caPathEnv);

  if (caPath && wantSSL) {
    try {
      ssl = { ca: fs.readFileSync(caPath) };
      caUsed = caPath;
    } catch (e) {
      console.warn('[DB] Cannot read CA at', caPath, e.message);
    }
  }
  if (!ssl && wantSSL) {
    // fallback: encrypt without verifying CA (tạm thời để test)
    ssl = { rejectUnauthorized: false };
  }

  // ---- DEBUG (không in password) ----
  console.log('[DB] Config:', {
    host, port, user,
    database,
    sslEnabled: !!ssl,
    caResolved: !!caUsed,
    caPathTried: caPath || caPathEnv || null,
  });

  // Cảnh báo nếu user/pass trống
  if (!user || !password) {
    console.warn('[DB] WARNING: DB_USER/DB_PASSWORD is empty after normalization');
  }

  const config = {
    host,
    port,
    user,
    password,
    database,
    charset: 'utf8mb4_unicode_ci',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    ...(ssl ? { ssl } : {}),
  };

  try {
    pool = mysql.createPool(config);
    const conn = await pool.getConnection();
    try { await conn.query("SET NAMES utf8mb4 COLLATE utf8mb4_unicode_ci"); } catch {}
    await conn.ping();
    conn.release();
    console.log('[DB] MySQL pool created and ping ok');
  } catch (err) {
    console.error('[DB] Connection error:', {
      name: err.name,
      code: err.code,
      errno: err.errno,
      sqlState: err.sqlState,
      message: err.message,
    });
    throw err;
  }

  await ensureTables();
  return pool;
}

async function ensureTables() {
  const p = getPool();
  await p.query(`
    CREATE TABLE IF NOT EXISTS users (
      id INT AUTO_INCREMENT PRIMARY KEY,
      email VARCHAR(255) NOT NULL UNIQUE,
      password VARCHAR(255) NOT NULL,
      name VARCHAR(255),
      role VARCHAR(50) DEFAULT 'customer',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `);
  await p.query(`
    CREATE TABLE IF NOT EXISTS orders (
      id INT AUTO_INCREMENT PRIMARY KEY,
      customer VARCHAR(255) NOT NULL,
      address TEXT NOT NULL,
      status VARCHAR(50) DEFAULT 'pending',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `);

  // Migrate existing tables to required columns if they were created differently
  // Ensure 'users' has required columns
  const [userCols] = await p.query(
    `SELECT COLUMN_NAME AS name, DATA_TYPE AS data_type, COLUMN_TYPE AS column_type
       FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users'`
  );
  const uSet = new Set(userCols.map(r => r.name));
  if (!uSet.has('password')) {
    await p.query("ALTER TABLE users ADD COLUMN password VARCHAR(255) NOT NULL AFTER email");
  }
  if (!uSet.has('name')) {
    await p.query("ALTER TABLE users ADD COLUMN name VARCHAR(255) NULL AFTER password");
  }
  if (!uSet.has('role')) {
    await p.query("ALTER TABLE users ADD COLUMN role VARCHAR(50) NULL AFTER name");
    await p.query("UPDATE users SET role = 'customer' WHERE role IS NULL");
    await p.query("ALTER TABLE users MODIFY COLUMN role VARCHAR(50) NOT NULL DEFAULT 'customer'");
  } else {
    // If role exists but is ENUM (legacy) and doesn't accept 'merchant', migrate to VARCHAR
    try {
      const roleCol = userCols.find(r => r.name === 'role');
      const colType = (roleCol?.column_type || '').toLowerCase();
      if (colType.startsWith('enum(')) {
        if (!colType.includes("'merchant'")) {
          console.warn("[DB] Migrating users.role from", roleCol.column_type, 'to VARCHAR(50)');
          await p.query("ALTER TABLE users MODIFY COLUMN role VARCHAR(50) NOT NULL DEFAULT 'customer'");
        }
      }
      // Fix any blank roles to 'customer'
      await p.query("UPDATE users SET role='customer' WHERE role IS NULL OR role='' ");
    } catch (e) {
      console.warn('[DB] Role column migration check failed:', e.message)
    }
  }

  // Map user -> merchant
  if (!uSet.has('merchant_id')) {
    try {
      await p.query("ALTER TABLE users ADD COLUMN merchant_id INT NULL AFTER created_at");
    } catch (e) {
      console.warn('[DB] add users.merchant_id failed:', e.message)
    }
  }
  if (!uSet.has('created_at')) {
    await p.query("ALTER TABLE users ADD COLUMN created_at DATETIME NULL DEFAULT CURRENT_TIMESTAMP AFTER role");
  }

  // Ensure 'orders' has required columns
  const [orderCols] = await p.query(
    `SELECT COLUMN_NAME AS name FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'orders'`
  );
  const oSet = new Set(orderCols.map(r => r.name));
  if (!oSet.has('status')) {
    await p.query("ALTER TABLE orders ADD COLUMN status VARCHAR(50) NULL AFTER address");
    await p.query("UPDATE orders SET status = 'pending' WHERE status IS NULL");
    await p.query("ALTER TABLE orders MODIFY COLUMN status VARCHAR(50) NOT NULL DEFAULT 'pending'");
  }
  if (!oSet.has('created_at')) {
    await p.query("ALTER TABLE orders ADD COLUMN created_at DATETIME NULL DEFAULT CURRENT_TIMESTAMP AFTER status");
  }
  if (!oSet.has('updated_at')) {
    await p.query("ALTER TABLE orders ADD COLUMN updated_at DATETIME NULL AFTER created_at");
  }

  const adminEmail = normalizeEnv(process.env.ADMIN_EMAIL) || 'admin@example.com';
  const [rows] = await p.query('SELECT id FROM users WHERE email = ? LIMIT 1', [adminEmail]);
  if (rows.length === 0) {
    console.log(`Admin account not found: will create ${adminEmail} (password from ADMIN_PASSWORD env)`);
  }
}

function getPool() {
  if (!pool) throw new Error('DB pool not initialized. Call initDB() first.');
  return pool;
}

module.exports = { initDB, getPool };
