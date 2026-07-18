export const SCENARIOS = [
  {
    id: "room-air",
    title: "อากาศห้อง",
    state: { P: 1, V: 24.47, T: 298.15, n: 1 },
    solveFor: "P",
    law: "boyle",
    mixture: [
      { id: "N2", moles: 0.78 },
      { id: "O2", moles: 0.21 },
      { id: "Ar", moles: 0.01 }
    ]
  },
  {
    id: "tire-hot",
    title: "ยางรถร้อนขึ้น",
    state: { P: 2.4, V: 35, T: 303.15, n: 3.37 },
    solveFor: "P",
    law: "gay-lussac",
    after: { T: 333.15 },
    mixture: [
      { id: "N2", moles: 2.6 },
      { id: "O2", moles: 0.7 },
      { id: "Ar", moles: 0.07 }
    ]
  },
  {
    id: "spray-can",
    title: "กระป๋องสเปรย์โดนแดด",
    state: { P: 3.5, V: 0.35, T: 298.15, n: 0.05 },
    solveFor: "P",
    law: "gay-lussac",
    after: { T: 323.15 },
    mixture: [{ id: "CO2", moles: 0.05 }]
  },
  {
    id: "high-balloon",
    title: "ลูกโป่งขึ้นที่สูง",
    state: { P: 1, V: 4.5, T: 298.15, n: 0.184 },
    solveFor: "P",
    law: "combined",
    after: { V: 6.2, T: 278.15 },
    mixture: [{ id: "He", moles: 0.184 }]
  },
  {
    id: "gas-cylinder",
    title: "ถังแก๊ส",
    state: { P: 6, V: 10, T: 298.15, n: 2.45 },
    solveFor: "P",
    law: "boyle",
    after: { V: 5 },
    mixture: [{ id: "N2", moles: 2.45 }]
  },
  {
    id: "hot-air-balloon",
    title: "บอลลูนอากาศร้อน",
    state: { P: 1, V: 500, T: 293.15, n: 20.78 },
    solveFor: "P",
    law: "charles",
    after: { T: 360 },
    mixture: [
      { id: "N2", moles: 16.2 },
      { id: "O2", moles: 4.35 },
      { id: "Ar", moles: 0.23 }
    ]
  },
  {
    id: "he-ar-leak",
    title: "บอลลูน He/Ar รั่ว",
    state: { P: 1.05, V: 8, T: 298.15, n: 0.344 },
    solveFor: "P",
    law: "avogadro",
    graham: { gasA: "He", gasB: "Ar", distance: 120 },
    mixture: [
      { id: "He", moles: 0.172 },
      { id: "Ar", moles: 0.172 }
    ]
  },
  {
    id: "unknown-graham",
    title: "แก๊สไม่ทราบชนิด",
    state: { P: 1, V: 10, T: 298.15, n: 0.409 },
    solveFor: "P",
    law: "combined",
    graham: { gasA: "CO2", gasB: "N2", distance: 120 },
    mixture: [{ id: "CO2", moles: 0.409 }]
  }
];

export const TEACHER_PRESETS = [
  {
    id: "predict-graph-explain",
    title: "Predict-Graph-Explain 20 นาที",
    scenarioId: "gas-cylinder",
    locks: ["T", "n"],
    worksheetFocus: "Boyle's law จากข้อมูล P-V"
  },
  {
    id: "thai-context-safety",
    title: "บริบทความปลอดภัยไทย",
    scenarioId: "spray-can",
    locks: ["V", "n"],
    worksheetFocus: "Gay-Lussac's law และความเสี่ยงภาชนะปิด"
  },
  {
    id: "mixture-dalton",
    title: "แก๊สผสมในถัง",
    scenarioId: "room-air",
    locks: ["V", "T"],
    worksheetFocus: "Dalton's law, mole fraction, partial pressure"
  },
  {
    id: "graham-unknown",
    title: "สืบหาแก๊สจาก rate",
    scenarioId: "unknown-graham",
    locks: ["P", "T"],
    worksheetFocus: "Graham's law และ molar mass"
  }
];

export function getScenario(id) {
  return SCENARIOS.find((scenario) => scenario.id === id) || SCENARIOS[0];
}

export function getTeacherPreset(id) {
  return TEACHER_PRESETS.find((preset) => preset.id === id) || TEACHER_PRESETS[0];
}

export function generateWorksheet({ preset, challenge, state, showAnswers }) {
  const answerBlock = showAnswers
    ? `\nเฉลยย่อ: ${challenge.expected}\nP=${state.P.toFixed(3)} atm, V=${state.V.toFixed(3)} L, T=${state.T.toFixed(2)} K, n=${state.n.toFixed(4)} mol`
    : "\nเฉลย: ปิดอยู่ใน Teacher Mode";

  return `ใบงาน Gas Learning Lab TH

หัวข้อ: ${preset.worksheetFocus}
ภารกิจ: ${challenge.title}

1. Prediction: ก่อนกดทดลอง ให้ทำนายแนวโน้มของตัวแปรหลักและเขียนเหตุผลจากสูตร
2. Experiment: กดบันทึกข้อมูลอย่างน้อย 3 จุด แล้วเปิด Graph Lab
3. Analysis: ระบุความสัมพันธ์จากกราฟ เช่น แปรผันตรง แปรผกผัน หรือผลรวม partial pressure
4. Explanation: เขียนคำอธิบายหลังทดลองโดยอ้าง P,V,T,n หรือ rate จากตาราง
5. Misconception check: ตรวจว่าใช้ T(K), ล็อกตัวแปรถูกต้อง และไม่สับสน Ptotal กับ Pi
${answerBlock}`;
}
