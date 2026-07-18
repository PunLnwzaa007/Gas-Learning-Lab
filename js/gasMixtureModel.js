import { DEFAULT_MIXTURE, GAS_BY_ID, GAS_CATALOG, R_ATM_L, round } from "./constants.js";

export class GasMixture {
  constructor(entries = DEFAULT_MIXTURE) {
    this.entries = new Map();
    entries.forEach((entry) => this.setMoles(entry.id, entry.moles));
  }

  clone() {
    return new GasMixture(this.toArray());
  }

  setMoles(id, moles) {
    if (!GAS_BY_ID[id]) return;
    const numeric = Math.max(0, Number(moles) || 0);
    if (numeric <= 0) {
      this.entries.delete(id);
      return;
    }
    this.entries.set(id, numeric);
  }

  replace(entries) {
    this.entries.clear();
    entries.forEach((entry) => this.setMoles(entry.id, entry.moles));
  }

  scaleToTotal(totalMoles) {
    const total = this.totalMoles();
    const target = Math.max(0.000001, Number(totalMoles) || total);
    if (total <= 0) {
      this.setMoles("N2", target);
      return;
    }
    const factor = target / total;
    [...this.entries.entries()].forEach(([id, moles]) => this.entries.set(id, moles * factor));
  }

  totalMoles() {
    return [...this.entries.values()].reduce((sum, moles) => sum + moles, 0);
  }

  toArray() {
    return [...this.entries.entries()]
      .map(([id, moles]) => ({ id, moles }))
      .sort((a, b) => GAS_CATALOG.findIndex((gas) => gas.id === a.id) - GAS_CATALOG.findIndex((gas) => gas.id === b.id));
  }

  rows(totalPressureAtm) {
    const total = this.totalMoles();
    return this.toArray().map((entry) => {
      const gas = GAS_BY_ID[entry.id];
      const moleFraction = total > 0 ? entry.moles / total : 0;
      return {
        ...entry,
        gas,
        moleFraction,
        partialPressure: moleFraction * totalPressureAtm
      };
    });
  }

  daltonState(volumeLiters, temperatureKelvin) {
    const totalMoles = this.totalMoles();
    const totalPressure = (totalMoles * R_ATM_L * temperatureKelvin) / volumeLiters;
    return {
      totalMoles,
      totalPressure,
      rows: this.rows(totalPressure)
    };
  }

  particleSpecies(maxParticles = 160) {
    const rows = this.rows(1);
    const total = this.totalMoles();
    if (total <= 0) return [{ id: "N2", count: maxParticles }];
    let assigned = 0;
    const species = rows.map((row, index) => {
      const count = index === rows.length - 1
        ? Math.max(1, maxParticles - assigned)
        : Math.max(1, Math.round(row.moleFraction * maxParticles));
      assigned += count;
      return { id: row.id, count, color: row.gas.color, molarMass: row.gas.molarMass };
    });
    return species.filter((item) => item.count > 0);
  }

  summary(totalPressureAtm) {
    const rows = this.rows(totalPressureAtm);
    const xText = rows.map((row) => `${row.id} x=${round(row.moleFraction, 3)}`).join(", ");
    const pText = rows.map((row) => `${row.id}=${round(row.partialPressure, 3)} atm`).join(", ");
    return { xText, pText };
  }
}
