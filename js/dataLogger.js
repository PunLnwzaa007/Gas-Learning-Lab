import { round } from "./constants.js";
import { formatState } from "./physicsEngine.js";

export class DataLogger {
  constructor() {
    this.rows = [];
  }

  record({ mode, state, mixtureRows = [], graham = null, note = "" }) {
    const formatted = formatState(state);
    const row = {
      id: this.rows.length + 1,
      time: new Date().toLocaleTimeString("th-TH"),
      mode,
      state: { ...state },
      formatted,
      moleFraction: mixtureRows.map((item) => `${item.id}:${round(item.moleFraction, 3)}`).join(" | "),
      partialPressure: mixtureRows.map((item) => `${item.id}:${round(item.partialPressure, 3)} atm`).join(" | "),
      rate: graham ? `${graham.gasA.id}/${graham.gasB.id}=${round(graham.ratio, 3)}` : "",
      graham,
      note
    };
    this.rows.push(row);
    return row;
  }

  clear() {
    this.rows = [];
  }

  toCsv() {
    const headers = [
      "id",
      "time",
      "mode",
      "P_atm",
      "V_L",
      "T_K",
      "n_mol",
      "mole_fraction",
      "partial_pressure",
      "rate",
      "note"
    ];
    const lines = [headers.join(",")];
    this.rows.forEach((row) => {
      const values = [
        row.id,
        row.time,
        row.mode,
        row.state.P,
        row.state.V,
        row.state.T,
        row.state.n,
        row.moleFraction,
        row.partialPressure,
        row.rate,
        row.note
      ].map(escapeCsv);
      lines.push(values.join(","));
    });
    return lines.join("\n");
  }
}

function escapeCsv(value) {
  const text = String(value ?? "");
  if (/[",\n]/.test(text)) {
    return `"${text.replaceAll("\"", "\"\"")}"`;
  }
  return text;
}
