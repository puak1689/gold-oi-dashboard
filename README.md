# Gold OI Dashboard (GC)

แดชบอร์ดแสดง **Open Interest / Intraday Volume walls** ของทองคำ (COMEX GC) พร้อมโซน
**ค่าเบี่ยงเบนมาตรฐาน (±1σ/2σ/3σ)** และกราฟ **TradingView** สำหรับวางแผนรายวัน

ออกแบบมาให้ **ดูบนมือถือง่าย** — strike เรียงแนวตั้งเป็น "บันได" (Call ยื่นขวา / Put ยื่นซ้าย)
แทนกราฟระฆังแนวนอนที่บีบจนอ่านไม่ออกบนจอแคบ

---

## โครงสร้างไฟล์

```
gold-oi-dashboard/
├── index.html        หน้าเว็บหลัก
├── css/style.css     ธีมครีม + dark mode + responsive
├── js/data.js        ดึง + แปลงข้อมูลจาก Vol2VolData
└── js/app.js         วาด ladder, คำนวณ σ, สลับ view/theme, ฝัง TradingView
```

## แหล่งข้อมูล

ดึงสด ๆ จาก GitHub (ไม่ต้องมี server):

- `https://raw.githubusercontent.com/pageth/Vol2VolData/main/OIData.txt`
- `https://raw.githubusercontent.com/pageth/Vol2VolData/main/IntradayData.txt`

> repo ต้นทาง: <https://github.com/pageth/Vol2VolData>

## สูตรคำนวณ σ (1 standard deviation)

```
σ (points) = Future × (IV% / 100) × √(DTE / 365)
```

โซน ±1σ ≈ 68% · ±2σ ≈ 95% · ±3σ ≈ 99.7% ของช่วงราคาที่ตลาดคาด

---

## วิธีเปิดดู (local)

เปิดไฟล์ `index.html` ด้วยเบราว์เซอร์ได้เลย หรือรันเซิร์ฟเวอร์เล็ก ๆ (กันปัญหา fetch):

```powershell
cd "gold-oi-dashboard"
python -m http.server 8000
# เปิด http://localhost:8000
```

## วิธี deploy ขึ้น GitHub Pages (ฟรี)

1. สร้าง repo ใหม่บน GitHub แล้วอัปโหลดทั้งโฟลเดอร์นี้ (ให้ `index.html` อยู่ root)
2. ไปที่ **Settings → Pages → Branch: main / root → Save**
3. รอสักครู่ เว็บจะออนไลน์ที่ `https://<username>.github.io/<repo>/`

เปิดบนมือถือได้ทันที บุ๊กมาร์กไว้เปิดดูทุกวันได้เลย

---

## ปรับแต่งได้

| อยากเปลี่ยน | แก้ที่ |
|---|---|
| สัญลักษณ์กราฟ TradingView | `js/app.js` → `symbol: 'COMEX:GC1!'` |
| ช่วง auto-refresh (ตอนนี้ 60 วิ) | `js/app.js` → `setInterval(load, 60000)` |
| สี/ธีม | `css/style.css` → ตัวแปร `:root` และ `[data-theme="dark"]` |
| แหล่งข้อมูล | `js/data.js` → `DATA_SOURCE` |
