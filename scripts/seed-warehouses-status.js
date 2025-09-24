import mysql from "mysql2/promise";
import * as dotenv from "dotenv";

dotenv.config();

async function main() {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: process.env.DB_PORT,
  });

  // Dữ liệu kho
  const warehouses = [
    ["Kho Hà Nội", "123 Đường Láng, Hà Nội", "024-12345678"],
    ["Kho TP.HCM", "456 Lê Văn Sỹ, Quận 3, TP.HCM", "028-98765432"],
    ["Kho Đà Nẵng", "789 Nguyễn Văn Linh, Đà Nẵng", "0236-111222"],
  ];

  // Dữ liệu trạng thái đơn hàng
  const statuses = [
    ["Đang xử lý"],
    ["Đang giao"],
    ["Hoàn thành"],
    ["Đã hủy"],
  ];

  // Insert dữ liệu
  await conn.query("INSERT INTO warehouses (name, address, phone) VALUES ?", [
    warehouses,
  ]);
  console.log("✅ Đã thêm dữ liệu mẫu vào bảng warehouses!");

  await conn.query("INSERT INTO order_status (name) VALUES ?", [statuses]);
  console.log("✅ Đã thêm dữ liệu mẫu vào bảng order_status!");

  await conn.end();
}

main().catch(console.error);
