# Slides Second Brain

Google Slides **Workspace Add-on** ที่อ่าน "บริบท" ของ presentation ที่กำลังเปิดอยู่
(หัวข้อ, ข้อความ, โน้ตผู้บรรยาย, จำนวนรูป/ตาราง) แล้วต่อยอดสู่ฟีเจอร์ AI ในเฟสถัดไป

## สถานะ: Phase 1 — อ่านบริบท

| เฟส | สิ่งที่ทำ | สถานะ |
|-----|---------|-------|
| **1. อ่านบริบท (MVP)** | ดึง text/notes/โครงสร้างของทุกสไลด์ → แสดงสรุปใน sidebar + export JSON | ✅ |
| **2. เชื่อม Gemini** | สรุป deck + ถาม-ตอบเกี่ยวกับ deck ด้วย Gemini (ตั้งค่า API key ในแอป) | ✅ |
| 3. Second Brain | เก็บ context ลง storage จัดกลุ่ม + ค้นหา | ⏳ |
| 4. ค้นหาด้วย vibe | สร้าง embeddings (Gemini) แล้วหา similarity | ⏳ |

## โครงสร้างไฟล์

```
src/
  appsscript.json   manifest ของ Workspace Add-on (scopes, homepage trigger)
  Code.js           entry points + action handlers (thin layer)
  Context.js        อ่าน/แปลงบริบท presentation -> โครงสร้าง JSON
  Cards.js          CardService UI (homepage / settings / ask / result)
  Gemini.js         เรียก Gemini API + จัดการ API key (UserProperties)
package.json        clasp scripts
```

> โค้ดทั้งหมดเป็น Apps Script (V8). ทุกไฟล์ใน `src/` จะถูก push ขึ้น Apps Script project เดียวกัน

## ติดตั้งเครื่องมือ

```bash
npm install            # ลง clasp แบบ local (เรียกผ่าน npx)
npx clasp login        # ล็อกอินบัญชี Google (เปิด browser)
```

> ครั้งแรกต้องเปิดใช้ Apps Script API ที่ https://script.google.com/home/usersettings

## สร้าง / push โปรเจกต์

```bash
# สร้าง Apps Script project ใหม่แบบผูกกับ Slides add-on
npx clasp create --type slides --title "Slides Second Brain" --rootDir ./src

# push โค้ดขึ้น Apps Script
npx clasp push

# เปิดใน editor บนเว็บ
npx clasp open
```

`clasp create` จะสร้างไฟล์ `.clasp.json` (มี scriptId) ให้อัตโนมัติ — ไฟล์นี้ถูก gitignore ไว้แล้ว

## ทดสอบ add-on

1. `npx clasp open` → ใน Apps Script editor เลือก **Deploy → Test deployments**
2. เลือก **Install** เพื่อทดสอบกับบัญชีตัวเอง
3. เปิด Google Slides ไฟล์ใดก็ได้ → แถบ add-on ด้านขวา → เปิด **Slides Second Brain**
4. กด **อ่านบริบท** เพื่อดูสรุปของ deck

## OAuth scopes ที่ใช้

| scope | ทำไม |
|-------|------|
| `presentations.currentonly` | อ่านเฉพาะ presentation ที่เปิดอยู่ (ขออนุญาตน้อย ผ่าน review ง่าย) |
| `script.external_request` | เผื่อเรียก Gemini API ในเฟส 2 (`UrlFetchApp`) |
| `script.locale` | รองรับภาษาตาม locale ของผู้ใช้ |

## การใช้ฟีเจอร์ AI (Phase 2)

1. รับ Gemini API key จาก [Google AI Studio](https://aistudio.google.com/apikey)
2. ในแถบ add-on กด **ตั้งค่า** → วาง API key → (เลือก model ได้, ดีฟอลต์ `gemini-2.0-flash`) → **บันทึก**
3. กด **สรุป deck** เพื่อให้ Gemini สรุปใจความ + ข้อเสนอแนะ
4. กด **ถาม-ตอบ** เพื่อถามคำถามเกี่ยวกับเนื้อหา deck

> API key เก็บใน `PropertiesService` (UserProperties) ต่อผู้ใช้ ไม่ถูก commit ลง repo

## ขั้นถัดไป (Phase 3+)

- เก็บ context ของหลาย deck ลง Drive/Properties เป็น "second brain"
- สร้าง embeddings ด้วย Gemini แล้วค้นหาด้วย similarity (vibe search)
