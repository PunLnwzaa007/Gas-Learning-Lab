import { ABSOLUTE_ZERO_C, DEFAULT_STATE, KPA_PER_ATM, ML_PER_L, R_ATM_L, clamp, round } from "./constants.js";

export function pressureToAtm(value, unit) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return DEFAULT_STATE.P;
  return unit === "kPa" ? numeric / KPA_PER_ATM : numeric;
}

export function pressureFromAtm(value, unit) {
  return unit === "kPa" ? value * KPA_PER_ATM : value;
}

export function volumeToLiters(value, unit) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return DEFAULT_STATE.V;
  return unit === "mL" ? numeric / ML_PER_L : numeric;
}

export function volumeFromLiters(value, unit) {
  return unit === "mL" ? value * ML_PER_L : value;
}

export function temperatureToKelvin(value, unit) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return DEFAULT_STATE.T;
  return unit === "C" ? numeric - ABSOLUTE_ZERO_C : numeric;
}

export function temperatureFromKelvin(value, unit) {
  return unit === "C" ? value + ABSOLUTE_ZERO_C : value;
}

export function normalizeState(state) {
  return {
    P: clamp(Number(state.P) || DEFAULT_STATE.P, 0.0001, 100000),
    V: clamp(Number(state.V) || DEFAULT_STATE.V, 0.0001, 1000000),
    T: clamp(Number(state.T) || DEFAULT_STATE.T, 0.01, 100000),
    n: clamp(Number(state.n) || DEFAULT_STATE.n, 0.000001, 100000)
  };
}

export function solveIdealGas(inputState, solveFor) {
  const state = normalizeState(inputState);
  const missing = solveFor || "P";

  if (missing === "P") {
    state.P = (state.n * R_ATM_L * state.T) / state.V;
  }

  if (missing === "V") {
    state.V = (state.n * R_ATM_L * state.T) / state.P;
  }

  if (missing === "T") {
    state.T = (state.P * state.V) / (state.n * R_ATM_L);
  }

  if (missing === "n") {
    state.n = (state.P * state.V) / (R_ATM_L * state.T);
  }

  return normalizeState(state);
}

export const GAS_LAWS = {
  boyle: {
    label: "Boyle's law",
    locks: ["T", "n"],
    graph: "PV",
    formula: "P1V1 = P2V2"
  },
  charles: {
    label: "Charles's law",
    locks: ["P", "n"],
    graph: "VT",
    formula: "V1/T1 = V2/T2"
  },
  "gay-lussac": {
    label: "Gay-Lussac's law",
    locks: ["V", "n"],
    graph: "PT",
    formula: "P1/T1 = P2/T2"
  },
  avogadro: {
    label: "Avogadro's law",
    locks: ["P", "T"],
    graph: "VT",
    formula: "V1/n1 = V2/n2"
  },
  combined: {
    label: "Combined gas law",
    locks: ["n"],
    graph: "PV",
    formula: "P1V1/T1 = P2V2/T2"
  }
};

export function deriveGasLawAfter(lawId, beforeState, draftAfter) {
  const before = normalizeState(beforeState);
  const draft = normalizeState({ ...before, ...draftAfter });
  const law = GAS_LAWS[lawId] || GAS_LAWS.boyle;
  const after = { ...before };

  if (lawId === "boyle") {
    after.V = draft.V;
    after.T = before.T;
    after.n = before.n;
    after.P = (before.P * before.V) / after.V;
  } else if (lawId === "charles") {
    after.T = draft.T;
    after.P = before.P;
    after.n = before.n;
    after.V = (before.V * after.T) / before.T;
  } else if (lawId === "gay-lussac") {
    after.T = draft.T;
    after.V = before.V;
    after.n = before.n;
    after.P = (before.P * after.T) / before.T;
  } else if (lawId === "avogadro") {
    after.n = draft.n;
    after.P = before.P;
    after.T = before.T;
    after.V = (before.V * after.n) / before.n;
  } else {
    after.V = draft.V;
    after.T = draft.T;
    after.n = before.n;
    after.P = (before.P * before.V * after.T) / (before.T * after.V);
  }

  return {
    before,
    after: normalizeState(after),
    law,
    summary: summarizeGasLaw(lawId, before, after)
  };
}

export function summarizeGasLaw(lawId, before, after) {
  if (lawId === "boyle") {
    const direction = after.V < before.V ? "เพิ่มขึ้น" : "ลดลง";
    return `Boyle: เมื่อ T และ n คงที่ P แปรผกผันกับ V ดังนั้น P ${direction}`;
  }

  if (lawId === "charles") {
    const direction = after.T > before.T ? "เพิ่มขึ้น" : "ลดลง";
    return `Charles: เมื่อ P และ n คงที่ V แปรผันตรงกับ T(K) ดังนั้น V ${direction}`;
  }

  if (lawId === "gay-lussac") {
    const direction = after.T > before.T ? "เพิ่มขึ้น" : "ลดลง";
    return `Gay-Lussac: เมื่อ V และ n คงที่ P แปรผันตรงกับ T(K) ดังนั้น P ${direction}`;
  }

  if (lawId === "avogadro") {
    const direction = after.n > before.n ? "เพิ่มขึ้น" : "ลดลง";
    return `Avogadro: เมื่อ P และ T คงที่ V แปรผันตรงกับ n ดังนั้น V ${direction}`;
  }

  return "Combined gas law: n คงที่ และใช้ P1V1/T1 = P2V2/T2";
}

export function makeGasLawCurve(graphType, state, lawId, points = 72) {
  const base = normalizeState(state);
  const curve = [];

  if (graphType === "PV") {
    const minV = Math.max(0.1, base.V * 0.35);
    const maxV = Math.max(minV + 0.1, base.V * 1.75);
    for (let i = 0; i < points; i += 1) {
      const V = minV + ((maxV - minV) * i) / (points - 1);
      const P = (base.n * R_ATM_L * base.T) / V;
      curve.push({ x: V, y: P });
    }
  }

  if (graphType === "VT") {
    const minT = Math.max(1, base.T * 0.55);
    const maxT = Math.max(minT + 1, base.T * 1.65);
    for (let i = 0; i < points; i += 1) {
      const T = minT + ((maxT - minT) * i) / (points - 1);
      const V = lawId === "avogadro" ? (base.V * base.n) / Math.max(base.n, 0.000001) : (base.n * R_ATM_L * T) / base.P;
      curve.push({ x: T, y: V });
    }
  }

  if (graphType === "PT") {
    const minT = Math.max(1, base.T * 0.55);
    const maxT = Math.max(minT + 1, base.T * 1.65);
    for (let i = 0; i < points; i += 1) {
      const T = minT + ((maxT - minT) * i) / (points - 1);
      const P = (base.n * R_ATM_L * T) / base.V;
      curve.push({ x: T, y: P });
    }
  }

  return curve;
}

export function formatState(state) {
  const s = normalizeState(state);
  return {
    P: `${round(s.P, 3)} atm`,
    PkPa: `${round(s.P * KPA_PER_ATM, 1)} kPa`,
    V: `${round(s.V, 3)} L`,
    VmL: `${round(s.V * ML_PER_L, 0)} mL`,
    T: `${round(s.T, 2)} K`,
    TC: `${round(s.T + ABSOLUTE_ZERO_C, 1)} °C`,
    n: `${round(s.n, 4)} mol`
  };
}

export function stateToDisplayValues(state, units) {
  const s = normalizeState(state);
  return {
    P: pressureFromAtm(s.P, units.pressure),
    V: volumeFromLiters(s.V, units.volume),
    T: temperatureFromKelvin(s.T, units.temperature),
    n: s.n
  };
}
