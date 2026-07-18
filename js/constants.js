export const R_ATM_L = 0.082057366080960;
export const KPA_PER_ATM = 101.325;
export const ML_PER_L = 1000;
export const ABSOLUTE_ZERO_C = -273.15;

export const VARIABLE_COLORS = {
  P: "#d6423a",
  V: "#2869d8",
  T: "#df8a12",
  n: "#16875a"
};

export const GAS_CATALOG = [
  { id: "O2", name: "O2 oxygen", molarMass: 31.998, color: "#d6423a" },
  { id: "N2", name: "N2 nitrogen", molarMass: 28.014, color: "#2869d8" },
  { id: "CO2", name: "CO2 carbon dioxide", molarMass: 44.01, color: "#7454c9" },
  { id: "He", name: "He helium", molarMass: 4.003, color: "#16a085" },
  { id: "H2", name: "H2 hydrogen", molarMass: 2.016, color: "#d99a22" },
  { id: "Ar", name: "Ar argon", molarMass: 39.948, color: "#5b6570" }
];

export const GAS_BY_ID = Object.fromEntries(GAS_CATALOG.map((gas) => [gas.id, gas]));

export const DEFAULT_STATE = {
  P: 1,
  V: 24.47,
  T: 298.15,
  n: 1
};

export const DEFAULT_MIXTURE = [
  { id: "N2", moles: 0.78 },
  { id: "O2", moles: 0.21 },
  { id: "Ar", moles: 0.01 }
];

export function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

export function round(value, places = 3) {
  const factor = 10 ** places;
  return Math.round((value + Number.EPSILON) * factor) / factor;
}
