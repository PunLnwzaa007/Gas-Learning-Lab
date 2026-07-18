# Gas Learning Lab TH

เว็บแอป prototype สำหรับเรียนรู้สมบัติของแก๊สระดับ ม.ปลาย/ปี 1 โดยออกแบบเป็นห้องทดลองครบวงจร ไม่ใช่แค่ซิมอนุภาคชนกล่อง ผู้เรียนทำงานตามลำดับ:

```text
ทำนาย → ทดลอง → เก็บข้อมูล → วิเคราะห์กราฟ → อธิบายผล
```

หน้าแรกคือ `Simulation Lab` ทันที มีภาชนะและอนุภาคกลางจอ, controls ด้านข้าง, และแผงล่างสำหรับ `Data Lab`, `Graph Lab`, `Challenge Mode`, `Teacher Mode`

## วิธีเปิดเว็บ

เว็บใช้ ES modules จึงควรรันผ่าน local server:

```powershell
cd "C:\Users\kitti\OneDrive\Documents\gas sim"
python -m http.server 8768 --bind 127.0.0.1
```

แล้วเปิด:

```text
http://127.0.0.1:8768/index.html
```

ถ้าใช้ Python bundle ของ Codex:

```powershell
& "C:\Users\kitti\.cache\codex-runtimes\codex-primary-runtime\dependencies\python\python.exe" -m http.server 8768 --bind 127.0.0.1
```

## ฟีเจอร์หลัก

| ส่วน | ทำอะไรได้ |
|---|---|
| Simulation Lab | แสดงอนุภาค real-time ในภาชนะ พร้อมค่า P,V,T,n จาก `PV = nRT` |
| State Controls | เลือกคำนวณ P, V, T หรือ n และเลือกหน่วย atm/kPa, L/mL, K/deg C |
| Gas Laws | ทดลอง before/after state สำหรับ Boyle, Charles, Gay-Lussac, Avogadro, combined gas law |
| Gas Mixture | เพิ่ม O2, N2, CO2, He, H2, Ar และดู mole fraction, partial pressure, total pressure |
| Graham Lab | เปรียบเทียบ diffusion/effusion rate, time และจำนวนอนุภาคที่ผ่าน porous wall |
| Data Lab | บันทึกผล P,V,T,n, mole fraction, partial pressure, rate ลงตาราง |
| Graph Lab | วาดกราฟ P-V, V-T, P-T, Dalton bar chart, Graham bar chart |
| Challenge Mode | มีช่อง prediction และ explanation พร้อม feedback misconception |
| Scenario Mode | ยางรถร้อนขึ้น, กระป๋องสเปรย์โดนแดด, ลูกโป่งขึ้นที่สูง, ถังแก๊ส, บอลลูนอากาศร้อน, He/Ar รั่ว |
| Teacher Mode | ครูเลือก preset, lock ตัวแปร, เปิด/ปิดเฉลย และสร้างใบงานสั้น ๆ |

## โครงสร้างไฟล์

| ไฟล์ | หน้าที่ |
|---|---|
| `index.html` | โครง UI ของ Simulation/Data/Graph/Challenge/Teacher |
| `styles.css` | layout, responsive design, สีตัวแปร P/V/T/n |
| `app.js` | entry point ประสาน UI กับโมดูล |
| `js/physicsEngine.js` | `PV = nRT`, unit conversion, before/after gas laws |
| `js/physicsSimulation.js` | canvas particle simulation และ porous wall สำหรับ Graham |
| `js/gasMixtureModel.js` | Dalton's law, mole fraction, partial pressure |
| `js/grahamModel.js` | Graham's law และ unknown gas calculation |
| `js/dataLogger.js` | บันทึกข้อมูลและ export CSV |
| `js/graphRenderer.js` | วาดกราฟจากข้อมูลทดลอง |
| `js/challengeSystem.js` | challenge และ misconception feedback |
| `js/teacherPresets.js` | scenario, teacher preset, worksheet generator |
| `GAS_LEARNING_LAB_TH_REPORT.md` | รายงานประกอบโครงงาน |

## หลักการคำนวณ

- Ideal gas: `PV = nRT`, ใช้ `R = 0.082057 L atm mol^-1 K^-1`
- Dalton: `Ptotal = P1 + P2 + ...` และ `Pi = xi Ptotal`
- Graham: `rate1/rate2 = sqrt(M2/M1)`
- อุณหภูมิในกฎของแก๊สใช้ Kelvin เสมอ แม้ UI จะรับค่า Celsius ได้

## หมายเหตุการทดสอบ

ตรวจแล้วว่าไฟล์ JS ผ่าน syntax check และโมเดลหลักคำนวณได้ถูกทิศทาง:

- `PV = nRT` ให้ P ใกล้ 1 atm เมื่อ V = 24.47 L, T = 298.15 K, n = 1 mol
- mixture model คำนวณจำนวนชนิดแก๊สและ total moles ได้
- Graham model ให้ He/Ar ratio ประมาณ 3.16 เท่า
- local HTTP serving ผ่านที่พอร์ต 8768 ด้วย Start-Job ชั่วคราว

ใน environment นี้ process server แบบแยกตัวด้วย `Start-Process` ถูกปิดทันที จึงควรเปิด server ค้างไว้เองใน terminal ขณะทดลองเว็บ
