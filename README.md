# Slides Second Brain

Google Slides **Editor Add-on** (standalone Apps Script) ที่อ่าน "บริบท" ของ presentation
ที่กำลังเปิดอยู่ (หัวข้อ, ข้อความ, โน้ตผู้บรรยาย, จำนวนรูป/ตาราง) แสดงใน **sidebar** ด้านขวา
แล้วต่อยอดสู่ฟีเจอร์ AI ในเฟสถัดไป

> ทำไมเป็น "editor add-on" ไม่ใช่ "Workspace Add-on": sidebar ที่ใช้ HtmlService + เมนู
> Extensions ทำได้เฉพาะ editor add-on และต้องเป็น **standalone script** จึงจะใช้ข้ามไฟล์/แชร์ได้

## สถานะ

| เฟส | สิ่งที่ทำ | สถานะ |
|-----|---------|-------|
| **1. อ่านบริบท (MVP)** | ดึง text/notes/โครงสร้างของทุกสไลด์ → แสดงใน sidebar | ✅ |
| 2. เชื่อม Gemini | สรุป deck + ถาม-ตอบ (โค้ดมีใน repo แต่ยังไม่ต่อ UI ปัจจุบัน) | โค้ดพร้อม |
| 3. Second Brain | เก็บ context ลง storage จัดกลุ่ม + ค้นหา | ⏳ |
| 4. ค้นหาด้วย vibe | สร้าง embeddings (Gemini) แล้วหา similarity | ⏳ |

## โครงสร้างไฟล์

```
src/
  appsscript.json   manifest (oauthScopes + runtime)
  Code.js           entry points: onOpen/onInstall เมนู, showPanel (sidebar)
  Context.js        อ่าน/แปลงบริบท presentation -> โครงสร้าง JSON
  Sidebar.html      UI ของ sidebar (เรียก google.script.run)
  Cards.js          CardService UI เดิม (เก็บไว้สำหรับ Gemini phase 2 ยังไม่ถูกเรียกใช้)
  Gemini.js         เรียก Gemini API + จัดการ API key (เก็บไว้สำหรับ phase 2)
package.json        clasp scripts
```

> โค้ดทั้งหมดเป็น Apps Script (V8). ทุกไฟล์ใน `src/` จะถูก push ขึ้น Apps Script project เดียวกัน

## ติดตั้งเครื่องมือ

```bash
npm install            # ลง clasp แบบ local (เรียกผ่าน npx)
npx clasp login        # ล็อกอินบัญชี Google (เปิด browser)
```

> ครั้งแรกต้องเปิดใช้ Apps Script API ที่ https://script.google.com/home/usersettings

## สร้าง / push โปรเจกต์ (standalone)

```bash
# สร้าง standalone Apps Script project (จำเป็นสำหรับ editor add-on ที่จะแชร์ได้)
npx clasp create --type standalone --title "Slides Second Brain" --rootDir ./src

# push โค้ดขึ้น Apps Script
npx clasp push

# เปิดใน editor บนเว็บ
npx clasp open
```

`clasp create` จะสร้างไฟล์ `.clasp.json` (มี scriptId) ให้อัตโนมัติ — ไฟล์นี้ถูก gitignore ไว้แล้ว
หาก `.clasp.json` ไปอยู่ใน `src/` ให้ย้ายมาที่ root: `mv src/.clasp.json ./.clasp.json`

## OAuth scopes ที่ใช้

| scope | ทำไม |
|-------|------|
| `presentations.currentonly` | อ่านเฉพาะ presentation ที่เปิดอยู่ (sensitive scope) |
| `script.container.ui` | จำเป็นต่อ `showSidebar` / เมนู Extensions |
| `script.external_request` | เผื่อเรียก Gemini API ในเฟส 2 (`UrlFetchApp`) |
| `script.locale` | รองรับภาษาตาม locale ของผู้ใช้ |

## เผยแพร่ให้คนอื่นใช้ (Marketplace — unlisted)

editor add-on จะใช้ข้ามไฟล์/แชร์ได้ต้องผ่าน Google Workspace Marketplace ทำครั้งเดียว:

1. **สร้าง deployment** (ทำผ่าน clasp ได้): `npx clasp deploy --description "v1"` → ได้ Deployment ID
2. **ผูกกับ standard GCP project**: Apps Script editor → ⚙️ Project Settings → Google Cloud Platform (GCP) Project → ใส่ project number ของ GCP project ที่สร้างไว้
3. **OAuth consent screen** (Cloud Console → APIs & Services → OAuth consent screen):
   - User type: External, กรอกชื่อแอป/อีเมล, เพิ่ม scopes ทั้งหมดด้านบน
   - เพิ่มเพื่อน/ทีมเป็น **Test users** (ถ้ายังไม่ verify)
4. **เปิด Google Workspace Marketplace SDK** (Cloud Console → Enable APIs)
5. **Marketplace SDK → App Configuration**:
   - Visibility: **Unlisted** (ใครมีลิงก์ก็ติดตั้งได้)
   - App Integration: เลือก **Google Workspace Add-on / Editor Add-on** แล้วใส่ **Apps Script Deployment ID** จากข้อ 1
   - เลือก scopes ให้ตรง
6. **Store Listing**: ใส่ชื่อ, ไอคอน, คำอธิบาย, screenshot → **Publish**
7. ส่ง **ลิงก์ติดตั้ง (unlisted)** ให้เพื่อน → กด Install → เมนูจะโผล่ใน Slides ทุกไฟล์

> หมายเหตุการ verify: `presentations.currentonly` เป็น *sensitive scope* — ถ้ายังไม่ผ่าน Google
> verification เพื่อน (นอกองค์กร) จะเจอหน้าจอ "unverified app" แต่กด Advanced → ดำเนินการต่อได้
> ส่วนภายในองค์กร Workspace เดียวกัน แอดมินติดตั้งให้ทั้งโดเมนได้โดยไม่ต้อง verify

## การใช้ฟีเจอร์ AI (Phase 2 — โค้ดพร้อม ยังไม่ต่อ UI)

> โค้ด Gemini (`Gemini.js`) และการ์ด (`Cards.js`) ยังอยู่ครบ แต่ตอนนี้ UI หลักเป็น sidebar
> ที่อ่านบริบทอย่างเดียว ยังไม่มีปุ่มเรียก Gemini ในแผง — เฟส 2 จะต่อปุ่มเหล่านี้เข้า sidebar

1. รับ Gemini API key จาก [Google AI Studio](https://aistudio.google.com/apikey)
2. ในแถบ add-on กด **ตั้งค่า** → วาง API key → (เลือก model ได้, ดีฟอลต์ `gemini-2.0-flash`) → **บันทึก**
3. กด **สรุป deck** เพื่อให้ Gemini สรุปใจความ + ข้อเสนอแนะ
4. กด **ถาม-ตอบ** เพื่อถามคำถามเกี่ยวกับเนื้อหา deck

> API key เก็บใน `PropertiesService` (UserProperties) ต่อผู้ใช้ ไม่ถูก commit ลง repo

## ขั้นถัดไป (Phase 3+)

- เก็บ context ของหลาย deck ลง Drive/Properties เป็น "second brain"
- สร้าง embeddings ด้วย Gemini แล้วค้นหาด้วย similarity (vibe search)
