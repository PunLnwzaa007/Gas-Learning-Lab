export const CHALLENGES = [
  {
    id: "boyle-syringe",
    title: "เข็มฉีดยา: บีบปริมาตรครึ่งหนึ่ง",
    scenarioId: "gas-cylinder",
    prompt: "ทำนายว่าเมื่อ V ลดลงครึ่งหนึ่ง โดย T และ n คงที่ ความดันจะเปลี่ยนอย่างไร",
    expected: "P เพิ่มประมาณ 2 เท่า เพราะ P แปรผกผันกับ V"
  },
  {
    id: "spray-can",
    title: "กระป๋องสเปรย์โดนแดด",
    scenarioId: "spray-can",
    prompt: "ทำนาย P หลัง T เพิ่มขึ้นในภาชนะปริมาตรคงที่ และระบุหน่วย T ที่ควรใช้",
    expected: "P เพิ่มตาม T(K) ไม่ใช่ตามค่า °C โดยตรง"
  },
  {
    id: "o2-n2-mix",
    title: "ผสม O2 กับ N2",
    scenarioId: "room-air",
    prompt: "ทำนาย Ptotal, mole fraction และ partial pressure ของ O2/N2 ในภาชนะเดียวกัน",
    expected: "Ptotal คือผลรวม partial pressures และ Pi = xi Ptotal"
  },
  {
    id: "helium-argon-leak",
    title: "บอลลูน He/Ar รั่ว",
    scenarioId: "he-ar-leak",
    prompt: "ทำนายว่า He หรือ Ar จะ effuse เร็วกว่ากัน และเร็วประมาณกี่เท่า",
    expected: "He เร็วกว่า Ar ประมาณ sqrt(39.95/4.00) หรือราว 3.16 เท่า"
  },
  {
    id: "unknown-gas",
    title: "หาแก๊สไม่ทราบชนิด",
    scenarioId: "unknown-graham",
    prompt: "ใช้ Graham's law หา molar mass จากอัตราการ effuse เทียบกับ CO2",
    expected: "M_unknown = M_known × (rate_known/rate_unknown)^2"
  }
];

export class ChallengeSystem {
  constructor(challenges = CHALLENGES) {
    this.challenges = challenges;
    this.currentId = challenges[0].id;
  }

  current() {
    return this.challenges.find((challenge) => challenge.id === this.currentId) || this.challenges[0];
  }

  setCurrent(id) {
    if (this.challenges.some((challenge) => challenge.id === id)) {
      this.currentId = id;
    }
    return this.current();
  }

  evaluate({ prediction, explanation, context, showAnswers }) {
    const challenge = this.current();
    const feedback = [];
    const text = `${prediction} ${explanation}`.toLowerCase();

    if (!prediction.trim()) {
      feedback.push("ยังไม่มี prediction ก่อนทดลอง");
    }

    if (!explanation.trim()) {
      feedback.push("ยังไม่มี explanation หลังทดลอง");
    }

    if ((text.includes("°c") || text.includes("องศา") || text.includes("celsius")) && !text.includes("k")) {
      feedback.push("ระวัง misconception: กฎของแก๊สต้องใช้อุณหภูมิสัมบูรณ์ K ไม่ใช้ °C โดยตรง");
    }

    if (challenge.id.includes("boyle") && !context.locks.includes("T")) {
      feedback.push("Boyle's law ต้องล็อก T และ n ก่อนสรุป P-V");
    }

    if (challenge.id.includes("mix") && (text.includes("partial") || text.includes("pᵢ") || text.includes("pi"))) {
      feedback.push("ดี: มีการแยก total pressure กับ partial pressure");
    } else if (challenge.id.includes("mix")) {
      feedback.push("ตรวจอีกครั้ง: Ptotal ไม่ใช่ partial pressure ของแก๊สตัวเดียว");
    }

    if (challenge.id.includes("helium") && text.includes("ar") && text.includes("เร็ว")) {
      feedback.push("ตรวจทิศทาง: แก๊สที่มวลโมลาร์น้อยกว่า effuse เร็วกว่า");
    }

    if (context.currentTemperatureUnit === "C") {
      feedback.push("ระบบแปลง °C เป็น K ให้แล้ว แต่ตอนเขียนเหตุผลควรอ้าง T(K)");
    }

    if (feedback.length === 0) {
      feedback.push("คำตอบมีโครงสร้างดีแล้ว ให้ผูกตัวเลขจาก Data/Graph Lab เข้ากับสูตรอีกครั้ง");
    }

    if (showAnswers) {
      feedback.push(`เฉลยย่อ: ${challenge.expected}`);
    }

    return feedback;
  }
}
