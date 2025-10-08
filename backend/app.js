// app.js (CommonJS) — Express + MySQL + các endpoint để test Postman
const express = require("express");
const cors = require("cors");
const mysql = require("mysql2/promise");
const fs = require("fs");
require("dotenv").config();

const app = express();
app.use(express.json());

// CORS cho frontend 5173 (dev)
const corsOrigins = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(",").map(s => s.trim())
  : "*";
app.use(cors({ origin: corsOrigins }));

(async () => {
  // SSL cho RDS
  const ssl =
    process.env.DB_CA_PATH && fs.existsSync(process.env.DB_CA_PATH)
      ? { ca: fs.readFileSync(process.env.DB_CA_PATH) } // prod: verify CA thật
      : { rejectUnauthorized: false };                  // dev: nhanh gọn

  // Kết nối MySQL (RDS)
  const pool = await mysql.createPool({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    ssl,
    waitForConnections: true,
    connectionLimit: 10,
  });

  // ===== Helpers seed =====
  async function ensureCarrierOWN(conn) {
    const [r] = await conn.query("SELECT id FROM carrier WHERE code='OWN' LIMIT 1");
    if (r.length) return r[0].id;
    const [x] = await conn.query("INSERT INTO carrier (code,name) VALUES ('OWN','Your Company')");
    return x.insertId;
  }
  async function ensureStatusSeed(conn) {
    const list = [
      ['CREATED','Đã tạo đơn'],['PICKED_UP','Đã lấy hàng'],['IN_TRANSIT','Đang trung chuyển'],
      ['ARRIVED_HUB','Đến kho/trạm'],['OUT_FOR_DELIVERY','Đang giao'],['DELIVERED','Đã giao'],
      ['FAILED','Giao thất bại'],['RETURNING','Đang hoàn'],['RETURNED','Đã hoàn'],['CANCELLED','Đã huỷ']
    ];
    await conn.query(
      "INSERT INTO tracking_status (code,description) VALUES " +
      list.map(()=>"(?,?)").join(",") +
      " ON DUPLICATE KEY UPDATE description=VALUES(description)",
      list.flat()
    );
  }
  async function ensureHubs(conn) {
    const hubs = [
      ['HCM-TPT','Trung tâm phân loại Tân Phú Trung','SORT_CENTER','Củ Chi','TP.HCM'],
      ['HCM-HM','Bưu cục phát Hóc Môn','DELIVERY_STATION','Hóc Môn','TP.HCM'],
    ];
    await conn.query(
      `INSERT INTO hub (code,name,type,district,province)
       VALUES ${hubs.map(()=>"(?,?,?,?,?)").join(",")}
       ON DUPLICATE KEY UPDATE name=VALUES(name),type=VALUES(type),district=VALUES(district),province=VALUES(province)`,
      hubs.flat()
    );
  }
  const genWB = () => `WB-${Math.floor(100000 + Math.random()*900000)}`;

  // ===== Health =====
  app.get("/health/db", async (_req, res) => {
    try {
      const [r] = await pool.query("SELECT 1 AS ok");
      res.json(r[0]);
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  // ===== 0) Seed danh mục nhanh =====
  app.post("/v1/dev/seed", async (_req, res) => {
    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();
      const carrierId = await ensureCarrierOWN(conn);
      await ensureStatusSeed(conn);
      await ensureHubs(conn);
      await conn.query(
        `INSERT INTO merchant (code,name,contact_email,contact_phone)
         VALUES ('M0001','Demo Shop','demo@shop.vn','0900000001')
         ON DUPLICATE KEY UPDATE name=VALUES(name),contact_email=VALUES(contact_email),contact_phone=VALUES(contact_phone)`
      );
      await conn.query(
        `INSERT IGNORE INTO carrier_status_map (carrier_id,vendor_status,mapped_code,note)
         SELECT ?, s.code, s.code, 'OWN direct map' FROM tracking_status s`,
        [carrierId]
      );
      await conn.commit();
      res.json({ ok: true, msg: "seeded" });
    } catch (e) {
      await conn.rollback();
      res.status(500).json({ error: e.message });
    } finally { conn.release(); }
  });

  // ===== 1) Tạo đơn =====
  app.post("/v1/shipments", async (req, res) => {
    const { merchant_code="M0001", order_code, ref_code,
            sender={}, receiver={}, service_type="STANDARD",
            cod_amount=0, items=[] } = req.body || {};
    if (!order_code || !sender.address || !receiver.address) {
      return res.status(400).json({ error:"order_code, sender.address, receiver.address là bắt buộc" });
    }
    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();
      const carrierId = await ensureCarrierOWN(conn);

      const [m] = await conn.query("SELECT id FROM merchant WHERE code=? LIMIT 1",[merchant_code]);
      if (!m.length) throw new Error("merchant_code không tồn tại, hãy gọi /v1/dev/seed trước");
      const merchantId = m[0].id;

      const [a1] = await conn.query(
        "INSERT INTO address (full_name,phone,line1,district,province,country_code) VALUES (?,?,?,?,?,?)",
        [sender.full_name||null, sender.phone||null, sender.address, sender.district||null, sender.province||'TP.HCM','VN']
      );
      const senderId = a1.insertId;

      const [a2] = await conn.query(
        "INSERT INTO address (full_name,phone,line1,district,province,country_code) VALUES (?,?,?,?,?,?)",
        [receiver.full_name||null, receiver.phone||null, receiver.address, receiver.district||null, receiver.province||'TP.HCM','VN']
      );
      const receiverId = a2.insertId;

      const weight = items[0]?.weight_g || null;
      const value  = items[0]?.value    || null;
      const note   = items[0]?.name     || null;

      const [s] = await conn.query(
        `INSERT INTO shipment (merchant_id,order_code,ref_code,sender_address_id,receiver_address_id,
           service_type,cod_amount,total_weight_g,total_value,note,current_status,current_carrier_id)
         VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`,
        [merchantId, order_code, ref_code||null, senderId, receiverId,
         service_type, cod_amount, weight, value, note, 'CREATED', carrierId]
      );
      const shipmentId = s.insertId;

      const waybill = genWB();
      await conn.query(
        `INSERT INTO waybill (shipment_id,carrier_id,waybill_number,service_code,status_code,vendor_status)
         VALUES (?,?,?,?,?,?)`,
        [shipmentId, carrierId, waybill, service_type, 'CREATED', 'CREATED']
      );

      await conn.commit();
      res.status(201).json({ shipment_id: shipmentId, waybill_number: waybill, status: 'CREATED' });
    } catch (e) {
      await conn.rollback();
      res.status(500).json({ error: e.message });
    } finally { conn.release(); }
  });

  // ===== 2) Ghi mốc tracking =====
  app.post("/v1/events", async (req, res) => {
    const { waybill_number, mapped_code, hub_code, event_time, description } = req.body || {};
    if (!waybill_number || !mapped_code || !event_time) {
      return res.status(400).json({ error:"waybill_number, mapped_code, event_time là bắt buộc" });
    }
    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();

      const [w] = await conn.query(
        "SELECT id, shipment_id, carrier_id FROM waybill WHERE waybill_number=? LIMIT 1",
        [waybill_number]
      );
      if (!w.length) { await conn.rollback(); return res.status(404).json({ error:"Waybill không tồn tại" }); }

      const waybillId  = w[0].id;
      const shipmentId = w[0].shipment_id;
      const carrierId  = w[0].carrier_id;

      let hubId = null;
      if (hub_code) {
        const [h] = await conn.query("SELECT id FROM hub WHERE code=? LIMIT 1",[hub_code]);
        if (h.length) hubId = h[0].id;
      }

      await conn.query(
        `INSERT INTO tracking_event (waybill_id,shipment_id,carrier_id,event_time,vendor_status,mapped_code,hub_id,description)
         VALUES (?,?,?,?,?,?,?,?)`,
        [waybillId, shipmentId, carrierId, new Date(event_time), mapped_code, mapped_code, hubId, description||null]
      );

      await conn.query(
        `UPDATE waybill
           SET status_code=?, vendor_status=?,
               last_hub_id=IFNULL(?, last_hub_id),
               delivered_time=CASE WHEN ?='DELIVERED' THEN COALESCE(delivered_time, ?) ELSE delivered_time END
         WHERE id=?`,
        [mapped_code, mapped_code, hubId, mapped_code, new Date(event_time), waybillId]
      );
      await conn.query(`UPDATE shipment SET current_status=? WHERE id=?`, [mapped_code, shipmentId]);

      await conn.commit();
      res.status(201).json({ ok: true });
    } catch (e) {
      await conn.rollback();
      res.status(500).json({ error: e.message });
    } finally { conn.release(); }
  });

  // ===== 3) Tra cứu công khai =====
  app.get("/v1/public/track", async (req, res) => {
    const code = req.query.code;
    if (!code) return res.status(400).json({ error:"Thiếu code" });
    const conn = await pool.getConnection();
    try {
      const [snap] = await conn.query(
        `SELECT w.waybill_number, w.status_code, ts.description AS status_text, h.name AS last_hub, w.delivered_time
           FROM waybill w
           LEFT JOIN tracking_status ts ON ts.code=w.status_code
           LEFT JOIN hub h             ON h.id=w.last_hub_id
          WHERE w.waybill_number=? LIMIT 1`, [code]
      );
      if (!snap.length) return res.status(404).json({ error:"Not found" });

      const [events] = await conn.query(
        `SELECT te.event_time AS time, te.mapped_code AS code,
                COALESCE(h.name, te.hub_name, te.location_text) AS hub,
                te.description AS \`desc\`
           FROM tracking_event te
           JOIN waybill w ON w.id=te.waybill_id AND w.waybill_number=?
           LEFT JOIN hub h ON h.id=te.hub_id
          ORDER BY te.event_time DESC`, [code]
      );
      res.json({ snapshot: snap[0], events });
    } catch (e) {
      res.status(500).json({ error: e.message });
    } finally { conn.release(); }
  });

  const PORT = Number(process.env.APP_PORT || 3000);
  app.listen(PORT, () => console.log(`API running at http://localhost:${PORT}`));
})();
