import mysql from "mysql2/promise";
import * as dotenv from "dotenv";

dotenv.config();

const products = [
  ["Laptop Dell XPS 13", "Laptop mỏng nhẹ, CPU i7, RAM 16GB", 32000.00],
  ["Điện thoại iPhone 15", "Bản 128GB, màu đen", 25000.00],
  ["Balo chống sốc", "Phù hợp laptop 15 inch", 500.00],
];

async function main() {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: process.env.DB_PORT,
  });

  const sql = `INSERT INTO products (name, description, unit_price) VALUES ?`;
  await conn.query(sql, [products]);

  console.log("✅ Đã nhập dữ liệu mẫu vào bảng products!");
  await conn.end();
}

main().catch(console.error);
