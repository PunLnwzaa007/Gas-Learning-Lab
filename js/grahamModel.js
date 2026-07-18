import { GAS_BY_ID, GAS_CATALOG, round } from "./constants.js";

export function grahamRates(gasAId, gasBId, distance = 120) {
  const gasA = GAS_BY_ID[gasAId] || GAS_CATALOG[0];
  const gasB = GAS_BY_ID[gasBId] || GAS_CATALOG[1];
  const rateA = 1 / Math.sqrt(gasA.molarMass);
  const rateB = 1 / Math.sqrt(gasB.molarMass);
  const ratio = rateA / rateB;
  const scaledRateA = rateA * 100;
  const scaledRateB = rateB * 100;
  const timeA = distance / scaledRateA;
  const timeB = distance / scaledRateB;

  return {
    gasA,
    gasB,
    rateA: scaledRateA,
    rateB: scaledRateB,
    ratio,
    distance,
    timeA,
    timeB,
    escapedA: Math.round(scaledRateA * 2.4),
    escapedB: Math.round(scaledRateB * 2.4),
    summary: `${gasA.id}/${gasB.id} = ${round(ratio, 2)} เท่า; ${gasA.id} ใช้เวลา ${round(timeA, 1)} s, ${gasB.id} ใช้เวลา ${round(timeB, 1)} s`
  };
}

export function unknownMolarMassFromRate(knownGasId, knownOverUnknownRateRatio) {
  const known = GAS_BY_ID[knownGasId] || GAS_BY_ID.CO2;
  const ratio = Math.max(0.0001, Number(knownOverUnknownRateRatio) || 1);
  const molarMass = known.molarMass * ratio * ratio;
  const nearest = GAS_CATALOG
    .map((gas) => ({ gas, delta: Math.abs(gas.molarMass - molarMass) }))
    .sort((a, b) => a.delta - b.delta)[0].gas;

  return {
    known,
    ratio,
    molarMass,
    nearest,
    summary: `ถ้า ${known.id} effuse เร็วกว่าแก๊สไม่ทราบชนิด ${round(ratio, 2)} เท่า มวลโมลาร์ของแก๊สไม่ทราบชนิดประมาณ ${round(molarMass, 2)} g/mol ใกล้ ${nearest.id}`
  };
}
