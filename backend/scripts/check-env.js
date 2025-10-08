// scripts/check-env.js
require('dotenv').config();

const REQUIRED = [
  'APP_PORT',
  'DB_HOST','DB_PORT','DB_NAME','DB_USER','DB_PASSWORD',
  'DB_SSL',
  'JWT_SECRET'
];

// fail fast nếu thiếu biến
let ok = true;
for (const k of REQUIRED) {
  if (!process.env[k] || String(process.env[k]).trim() === '') {
    console.error(`❌ Missing ${k}`);
    ok = false;
  }
}
if (!ok) process.exit(1);

// kiểm tra một số định dạng
if (Number.isNaN(Number(process.env.DB_PORT))) {
  console.error('❌ DB_PORT must be a number');
  ok = false;
}
if (!/^(development|production|test)?$/.test(process.env.NODE_ENV || '')) {
  console.warn('ℹ️ NODE_ENV not set (development/production/test) – optional');
}

// in ra bản tóm tắt (ẩn secret)
const mask = v => v ? v.replace(/.(?=.{4})/g, '*') : v;
console.log('✅ .env loaded:');
console.table({
  APP_PORT: process.env.APP_PORT,
  DB_HOST : process.env.DB_HOST,
  DB_PORT : process.env.DB_PORT,
  DB_NAME : process.env.DB_NAME,
  DB_USER : process.env.DB_USER,
  DB_PASSWORD: mask(process.env.DB_PASSWORD),
  DB_SSL  : process.env.DB_SSL,
  CORS_ORIGIN: process.env.CORS_ORIGIN,
  JWT_SECRET : mask(process.env.JWT_SECRET),
});

process.exit(ok ? 0 : 1);
