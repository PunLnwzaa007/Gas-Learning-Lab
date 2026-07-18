"use strict";

import { DEFAULT_MIXTURE, DEFAULT_STATE, GAS_CATALOG, round } from "./js/constants.js";
import { ChallengeSystem, CHALLENGES } from "./js/challengeSystem.js";
import { DataLogger } from "./js/dataLogger.js";
import { GasMixture } from "./js/gasMixtureModel.js";
import { grahamRates, unknownMolarMassFromRate } from "./js/grahamModel.js";
import { GraphRenderer } from "./js/graphRenderer.js";
import { ParticleSimulation } from "./js/physicsSimulation.js";
import {
  GAS_LAWS,
  deriveGasLawAfter,
  formatState,
  pressureFromAtm,
  pressureToAtm,
  solveIdealGas,
  stateToDisplayValues,
  temperatureToKelvin,
  volumeFromLiters,
  volumeToLiters
} from "./js/physicsEngine.js";
import {
  SCENARIOS,
  TEACHER_PRESETS,
  generateWorksheet,
  getScenario,
  getTeacherPreset
} from "./js/teacherPresets.js";

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => [...document.querySelectorAll(selector)];

const el = {
  simCanvas: $("#simCanvas"),
  graphCanvas: $("#graphCanvas"),
  toggleRun: $("#toggleRun"),
  toggleIcon: $("#toggleIcon"),
  toggleText: $("#toggleText"),
  resetSim: $("#resetSim"),
  recordData: $("#recordData"),
  exportCsv: $("#exportCsv"),
  clearData: $("#clearData"),
  runState: $("#runState"),
  viewParticles: $("#viewParticles"),
  viewGraham: $("#viewGraham"),
  macroP: $("#macroP"),
  macroPKpa: $("#macroPKpa"),
  macroV: $("#macroV"),
  macroVMl: $("#macroVMl"),
  macroT: $("#macroT"),
  macroTC: $("#macroTC"),
  macroN: $("#macroN"),
  macroMolesNote: $("#macroMolesNote"),
  relationSummary: $("#relationSummary"),
  lawBadge: $("#lawBadge"),
  solveFor: $("#solveFor"),
  pressureInput: $("#pressureInput"),
  pressureUnit: $("#pressureUnit"),
  volumeInput: $("#volumeInput"),
  volumeUnit: $("#volumeUnit"),
  temperatureInput: $("#temperatureInput"),
  temperatureUnit: $("#temperatureUnit"),
  amountInput: $("#amountInput"),
  misconceptionBox: $("#misconceptionBox"),
  presetRoomAir: $("#presetRoomAir"),
  lawSelect: $("#lawSelect"),
  lockP: $("#lockP"),
  lockV: $("#lockV"),
  lockT: $("#lockT"),
  lockN: $("#lockN"),
  afterPressure: $("#afterPressure"),
  afterVolume: $("#afterVolume"),
  afterTemperature: $("#afterTemperature"),
  afterAmount: $("#afterAmount"),
  calculateAfter: $("#calculateAfter"),
  applyAfter: $("#applyAfter"),
  afterSummary: $("#afterSummary"),
  gasSelect: $("#gasSelect"),
  gasMolesInput: $("#gasMolesInput"),
  setGasMoles: $("#setGasMoles"),
  mixtureBars: $("#mixtureBars"),
  mixtureTable: $("#mixtureTable"),
  grahamGasA: $("#grahamGasA"),
  grahamGasB: $("#grahamGasB"),
  grahamDistance: $("#grahamDistance"),
  runGraham: $("#runGraham"),
  unknownGas: $("#unknownGas"),
  grahamSummary: $("#grahamSummary"),
  scenarioButtons: $("#scenarioButtons"),
  dataLog: $("#dataLog"),
  graphType: $("#graphType"),
  graphSummary: $("#graphSummary"),
  challengeSelect: $("#challengeSelect"),
  challengeTitle: $("#challengeTitle"),
  challengePrompt: $("#challengePrompt"),
  loadChallenge: $("#loadChallenge"),
  predictionInput: $("#predictionInput"),
  explanationInput: $("#explanationInput"),
  checkChallenge: $("#checkChallenge"),
  recordChallenge: $("#recordChallenge"),
  challengeFeedback: $("#challengeFeedback"),
  showAnswers: $("#showAnswers"),
  teacherPreset: $("#teacherPreset"),
  applyTeacherPreset: $("#applyTeacherPreset"),
  makeWorksheet: $("#makeWorksheet"),
  worksheetOutput: $("#worksheetOutput")
};

const simulation = new ParticleSimulation(el.simCanvas);
const graphRenderer = new GraphRenderer(el.graphCanvas);
const logger = new DataLogger();
const challengeSystem = new ChallengeSystem();
let mixture = new GasMixture(DEFAULT_MIXTURE);
let currentState = { ...DEFAULT_STATE };
let afterResult = null;
let grahamResult = null;
let running = false;
let suppressStateInput = false;

function init() {
  populateGasSelectors();
  populateScenarioButtons();
  populateChallengeSelect();
  populateTeacherSelect();
  bindEvents();
  applyScenario("room-air", { record: false });
  setRunning(false);
  renderAll({ resetParticles: true });
}

function populateGasSelectors() {
  const options = GAS_CATALOG
    .map((gas) => `<option value="${gas.id}">${gas.name}</option>`)
    .join("");
  el.gasSelect.innerHTML = options;
  el.grahamGasA.innerHTML = options;
  el.grahamGasB.innerHTML = options;
  el.grahamGasA.value = "He";
  el.grahamGasB.value = "Ar";
}

function populateScenarioButtons() {
  el.scenarioButtons.innerHTML = SCENARIOS.map((scenario) => (
    `<button type="button" data-scenario="${scenario.id}">${escapeHtml(scenario.title)}</button>`
  )).join("");
}

function populateChallengeSelect() {
  el.challengeSelect.innerHTML = CHALLENGES.map((challenge) => (
    `<option value="${challenge.id}">${escapeHtml(challenge.title)}</option>`
  )).join("");
  updateChallengeCopy();
}

function populateTeacherSelect() {
  el.teacherPreset.innerHTML = TEACHER_PRESETS.map((preset) => (
    `<option value="${preset.id}">${escapeHtml(preset.title)}</option>`
  )).join("");
}

function bindEvents() {
  el.toggleRun.addEventListener("click", () => setRunning(!running));
  el.resetSim.addEventListener("click", () => simulation.reset());
  el.recordData.addEventListener("click", () => recordCurrentData("manual"));
  el.exportCsv.addEventListener("click", exportCsv);
  el.clearData.addEventListener("click", () => {
    logger.clear();
    renderDataLog();
    renderGraph();
  });

  [el.pressureInput, el.volumeInput, el.temperatureInput].forEach((input) => {
    input.addEventListener("input", () => syncStateFromControls());
  });
  [el.pressureUnit, el.volumeUnit, el.temperatureUnit, el.solveFor].forEach((input) => {
    input.addEventListener("change", () => syncStateFromControls());
  });
  el.amountInput.addEventListener("input", () => {
    const nextN = Number(el.amountInput.value);
    if (Number.isFinite(nextN) && nextN > 0) {
      mixture.scaleToTotal(nextN);
    }
    syncStateFromControls();
  });

  el.presetRoomAir.addEventListener("click", () => applyScenario("room-air"));
  el.lawSelect.addEventListener("change", () => {
    setLawLocks();
    prefillAfterFields();
    calculateAfterState();
  });
  [el.lockP, el.lockV, el.lockT, el.lockN].forEach((input) => {
    input.addEventListener("change", renderMisconceptions);
  });
  [el.afterPressure, el.afterVolume, el.afterTemperature, el.afterAmount].forEach((input) => {
    input.addEventListener("input", () => {
      afterResult = null;
      el.afterSummary.textContent = "ปรับค่า after แล้ว กดทดลอง after เพื่อคำนวณ";
    });
  });
  el.calculateAfter.addEventListener("click", calculateAfterState);
  el.applyAfter.addEventListener("click", applyAfterState);

  el.setGasMoles.addEventListener("click", () => {
    mixture.setMoles(el.gasSelect.value, Number(el.gasMolesInput.value));
    el.amountInput.value = round(mixture.totalMoles(), 4);
    syncStateFromControls({ resetParticles: true });
  });
  el.gasSelect.addEventListener("change", () => {
    const row = mixture.toArray().find((entry) => entry.id === el.gasSelect.value);
    el.gasMolesInput.value = row ? round(row.moles, 4) : 0;
  });

  el.runGraham.addEventListener("click", runGrahamSimulation);
  el.unknownGas.addEventListener("click", showUnknownGasChallenge);
  el.viewParticles.addEventListener("click", () => setViewMode("particles"));
  el.viewGraham.addEventListener("click", () => setViewMode("graham"));

  el.scenarioButtons.addEventListener("click", (event) => {
    const button = event.target.closest("[data-scenario]");
    if (button) applyScenario(button.dataset.scenario);
  });

  $$(".bottom-tab").forEach((button) => {
    button.addEventListener("click", () => switchBottomPanel(button.dataset.panel));
  });
  el.graphType.addEventListener("change", renderGraph);

  el.challengeSelect.addEventListener("change", () => {
    challengeSystem.setCurrent(el.challengeSelect.value);
    updateChallengeCopy();
  });
  el.loadChallenge.addEventListener("click", () => {
    const challenge = challengeSystem.current();
    applyScenario(challenge.scenarioId);
    el.predictionInput.value = "";
    el.explanationInput.value = "";
    switchBottomPanel("challengePanel");
  });
  el.checkChallenge.addEventListener("click", checkChallenge);
  el.recordChallenge.addEventListener("click", () => recordCurrentData(`challenge:${challengeSystem.current().id}`));

  el.applyTeacherPreset.addEventListener("click", applyTeacherPreset);
  el.makeWorksheet.addEventListener("click", makeWorksheet);
  el.showAnswers.addEventListener("change", makeWorksheet);
  $$(".teacher-lock").forEach((input) => input.addEventListener("change", applyTeacherLocksToMain));

  window.addEventListener("resize", () => {
    simulation.reset();
    renderGraph();
  });
}

function setRunning(nextRunning) {
  running = nextRunning;
  simulation.setRunning(running);
  el.runState.textContent = running ? "กำลังจำลอง - เก็บข้อมูลได้ทุกช่วง" : "หยุดอยู่ - พร้อมทำนายก่อนทดลอง";
  el.toggleText.textContent = running ? "หยุด" : "เริ่ม";
  el.toggleIcon.textContent = running ? "⏸" : "▶";
}

function setViewMode(mode) {
  simulation.setViewMode(mode);
  el.viewParticles.classList.toggle("active", mode === "particles");
  el.viewGraham.classList.toggle("active", mode === "graham");
}

function syncStateFromControls(options = {}) {
  if (suppressStateInput) return;
  const units = readUnits();
  const solveFor = el.solveFor.value;
  const draft = {
    P: pressureToAtm(el.pressureInput.value, units.pressure),
    V: volumeToLiters(el.volumeInput.value, units.volume),
    T: temperatureToKelvin(el.temperatureInput.value, units.temperature),
    n: Number(el.amountInput.value)
  };

  if (solveFor !== "n") {
    draft.n = Math.max(0.000001, mixture.totalMoles() || draft.n);
  }

  currentState = solveIdealGas(draft, solveFor);

  if (solveFor === "n") {
    mixture.scaleToTotal(currentState.n);
  }

  renderAll({ resetParticles: options.resetParticles ?? true });
}

function readUnits() {
  return {
    pressure: el.pressureUnit.value,
    volume: el.volumeUnit.value,
    temperature: el.temperatureUnit.value
  };
}

function renderAll({ resetParticles = true } = {}) {
  renderMacroCards();
  renderStateInputs();
  setComputedFieldStyles();
  renderMixture();
  setLawLocks({ preserveTeacher: true });
  renderMisconceptions();
  renderGraph();
  if (resetParticles) {
    simulation.setThermoState(currentState, mixture);
  }
}

function renderMacroCards() {
  const formatted = formatState(currentState);
  el.macroP.textContent = formatted.P;
  el.macroPKpa.textContent = formatted.PkPa;
  el.macroV.textContent = formatted.V;
  el.macroVMl.textContent = formatted.VmL;
  el.macroT.textContent = formatted.T;
  el.macroTC.textContent = formatted.TC;
  el.macroN.textContent = formatted.n;
  el.macroMolesNote.textContent = `${mixture.toArray().length} ชนิดในภาชนะ`;
}

function renderStateInputs() {
  suppressStateInput = true;
  const units = readUnits();
  const values = stateToDisplayValues(currentState, units);
  el.pressureInput.value = formatForInput(values.P);
  el.volumeInput.value = formatForInput(values.V);
  el.temperatureInput.value = formatForInput(values.T);
  el.amountInput.value = formatForInput(currentState.n, 4);
  suppressStateInput = false;
}

function setComputedFieldStyles() {
  const solveFor = el.solveFor.value;
  const pairs = {
    P: el.pressureInput,
    V: el.volumeInput,
    T: el.temperatureInput,
    n: el.amountInput
  };
  Object.entries(pairs).forEach(([key, input]) => {
    const computed = key === solveFor;
    input.readOnly = computed;
    input.classList.toggle("computed", computed);
  });
}

function setLawLocks({ preserveTeacher = false } = {}) {
  const law = GAS_LAWS[el.lawSelect.value] || GAS_LAWS.boyle;
  const teacherLocks = getTeacherLocks();
  const locks = preserveTeacher && teacherLocks.length ? teacherLocks : law.locks;
  el.lockP.checked = locks.includes("P");
  el.lockV.checked = locks.includes("V");
  el.lockT.checked = locks.includes("T");
  el.lockN.checked = locks.includes("n");
  el.lawBadge.textContent = law.formula;
}

function getCurrentLocks() {
  return [
    ["P", el.lockP.checked],
    ["V", el.lockV.checked],
    ["T", el.lockT.checked],
    ["n", el.lockN.checked]
  ].filter(([, checked]) => checked).map(([key]) => key);
}

function getTeacherLocks() {
  return $$(".teacher-lock").filter((input) => input.checked).map((input) => input.value);
}

function renderMisconceptions() {
  const warnings = [];
  const law = GAS_LAWS[el.lawSelect.value] || GAS_LAWS.boyle;
  const locks = getCurrentLocks();
  const missingLocks = law.locks.filter((lock) => !locks.includes(lock));

  if (el.temperatureUnit.value === "C") {
    warnings.push("แปลง °C เป็น K แล้ว แต่การอธิบายกฎของแก๊สควรพูดด้วย T(K)");
  }

  if (missingLocks.length) {
    warnings.push(`ยังไม่ได้ล็อก ${missingLocks.join(", ")} สำหรับ ${law.label}`);
  }

  if (mixture.rows(currentState.P).length > 1 && el.solveFor.value === "P") {
    warnings.push("P ที่แสดงเป็น Ptotal; ค่า Pᵢ ของแต่ละแก๊สดูในตาราง mixture");
  }

  if (!warnings.length) {
    el.misconceptionBox.textContent = "พร้อมทดลอง: หน่วยและตัวแปรคงที่สอดคล้องกับโหมดที่เลือก";
    el.misconceptionBox.className = "feedback-box good";
  } else {
    el.misconceptionBox.textContent = warnings.join(" | ");
    el.misconceptionBox.className = "feedback-box warning";
  }
}

function renderMixture() {
  const rows = mixture.rows(currentState.P);
  const maxRows = rows.length || 1;
  el.mixtureBars.innerHTML = rows.map((row) => (
    `<span title="${row.id}" style="width:${Math.max(3, row.moleFraction * 100)}%;background:${row.gas.color}"></span>`
  )).join("");

  el.mixtureTable.innerHTML = rows.length
    ? rows.map((row) => `
      <tr>
        <td><span class="gas-dot" style="background:${row.gas.color}"></span>${row.id}</td>
        <td>${round(row.moles, 4)}</td>
        <td>${round(row.moleFraction, 3)}</td>
        <td>${round(row.partialPressure, 3)}</td>
      </tr>
    `).join("")
    : `<tr class="empty-row"><td colspan="4">ยังไม่มีแก๊ส</td></tr>`;

  el.mixtureBars.style.gridTemplateColumns = `repeat(${maxRows}, 1fr)`;
}

function prefillAfterFields(overrides = {}) {
  const lawId = el.lawSelect.value;
  const draft = { ...currentState };
  if (lawId === "boyle") draft.V = currentState.V * 0.5;
  if (lawId === "charles") draft.T = currentState.T * 1.2;
  if (lawId === "gay-lussac") draft.T = currentState.T * 1.15;
  if (lawId === "avogadro") draft.n = currentState.n * 1.5;
  if (lawId === "combined") {
    draft.V = currentState.V * 1.25;
    draft.T = currentState.T * 0.92;
  }
  setAfterFields({ ...draft, ...overrides });
}

function setAfterFields(state) {
  const units = readUnits();
  el.afterPressure.value = formatForInput(pressureFromAtm(state.P, units.pressure));
  el.afterVolume.value = formatForInput(volumeFromLiters(state.V, units.volume));
  el.afterTemperature.value = formatForInput(state.T);
  el.afterAmount.value = formatForInput(state.n, 4);
}

function calculateAfterState() {
  const units = readUnits();
  const draft = {
    P: pressureToAtm(el.afterPressure.value, units.pressure),
    V: volumeToLiters(el.afterVolume.value, units.volume),
    T: Number(el.afterTemperature.value),
    n: Number(el.afterAmount.value)
  };
  afterResult = deriveGasLawAfter(el.lawSelect.value, currentState, draft);
  setAfterFields(afterResult.after);
  renderAfterSummary();
  el.relationSummary.textContent = afterResult.summary;
  el.graphType.value = afterResult.law.graph;
  renderGraph();
}

function renderAfterSummary() {
  if (!afterResult) return;
  const before = formatState(afterResult.before);
  const after = formatState(afterResult.after);
  el.afterSummary.innerHTML = `
    <strong>${escapeHtml(afterResult.law.label)}</strong><br>
    before: P=${before.P}, V=${before.V}, T=${before.T}, n=${before.n}<br>
    after: P=${after.P}, V=${after.V}, T=${after.T}, n=${after.n}<br>
    ${escapeHtml(afterResult.summary)}
  `;
}

function applyAfterState() {
  if (!afterResult) calculateAfterState();
  currentState = { ...afterResult.after };
  mixture.scaleToTotal(currentState.n);
  renderAll({ resetParticles: true });
  recordCurrentData(`after:${el.lawSelect.value}`);
}

function runGrahamSimulation() {
  grahamResult = grahamRates(el.grahamGasA.value, el.grahamGasB.value, Number(el.grahamDistance.value));
  el.grahamSummary.textContent = grahamResult.summary;
  simulation.setGraham(grahamResult);
  setViewMode("graham");
  el.graphType.value = "graham";
  renderGraph();
  recordCurrentData("graham");
}

function showUnknownGasChallenge() {
  const result = unknownMolarMassFromRate("CO2", 1.66);
  el.grahamSummary.textContent = result.summary;
  el.challengeSelect.value = "unknown-gas";
  challengeSystem.setCurrent("unknown-gas");
  updateChallengeCopy();
  switchBottomPanel("challengePanel");
}

function applyScenario(id, { record = false } = {}) {
  const scenario = getScenario(id);
  mixture.replace(scenario.mixture || DEFAULT_MIXTURE);
  el.solveFor.value = scenario.solveFor || "P";
  el.lawSelect.value = scenario.law || "boyle";
  el.pressureUnit.value = "atm";
  el.volumeUnit.value = "L";
  el.temperatureUnit.value = "K";
  currentState = solveIdealGas({ ...scenario.state, n: mixture.totalMoles() || scenario.state.n }, el.solveFor.value);
  renderStateInputs();
  setLawLocks();
  prefillAfterFields(scenario.after || {});

  if (scenario.graham) {
    el.grahamGasA.value = scenario.graham.gasA;
    el.grahamGasB.value = scenario.graham.gasB;
    el.grahamDistance.value = scenario.graham.distance || 120;
    grahamResult = grahamRates(el.grahamGasA.value, el.grahamGasB.value, Number(el.grahamDistance.value));
    el.grahamSummary.textContent = grahamResult.summary;
    simulation.setGraham(grahamResult);
  }

  calculateAfterState();
  renderAll({ resetParticles: true });
  if (record) recordCurrentData(`scenario:${scenario.id}`);
}

function renderDataLog() {
  if (!logger.rows.length) {
    el.dataLog.innerHTML = '<tr class="empty-row"><td colspan="9">ยังไม่มีข้อมูล</td></tr>';
    return;
  }

  el.dataLog.innerHTML = logger.rows.map((row) => `
    <tr>
      <td>${row.id}</td>
      <td>${escapeHtml(row.mode)}</td>
      <td>${round(row.state.P, 3)} atm</td>
      <td>${round(row.state.V, 3)} L</td>
      <td>${round(row.state.T, 2)} K</td>
      <td>${round(row.state.n, 4)}</td>
      <td>${escapeHtml(row.moleFraction)}</td>
      <td>${escapeHtml(row.partialPressure)}</td>
      <td>${escapeHtml(row.rate)}</td>
    </tr>
  `).join("");
}

function recordCurrentData(mode) {
  const rows = mixture.rows(currentState.P);
  logger.record({
    mode,
    state: currentState,
    mixtureRows: rows,
    graham: grahamResult,
    note: challengeSystem.current().title
  });
  renderDataLog();
  renderGraph();
}

function exportCsv() {
  const csv = logger.toCsv();
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "gas-learning-lab-th-data.csv";
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function renderGraph() {
  const type = el.graphType.value;
  graphRenderer.draw({
    type,
    rows: logger.rows,
    state: currentState,
    lawId: el.lawSelect.value,
    mixtureRows: mixture.rows(currentState.P),
    graham: grahamResult
  });
  el.graphSummary.textContent = graphSummary(type);
}

function graphSummary(type) {
  if (type === "PV") return "P-V: ถ้า T,n คงที่ กราฟเป็นความสัมพันธ์แปรผกผันแบบ Boyle";
  if (type === "VT") return "V-T: ใช้ T(K); เมื่อ P,n คงที่ V แปรผันตรงกับ T";
  if (type === "PT") return "P-T: ใช้ T(K); เมื่อ V,n คงที่ P แปรผันตรงกับ T";
  if (type === "mixture") return "Dalton: Ptotal = P1 + P2 + ... และ Pi = xi Ptotal";
  return "Graham: rate1/rate2 = sqrt(M2/M1); แก๊สเบากว่า effuse เร็วกว่า";
}

function switchBottomPanel(panelId) {
  $$(".bottom-tab").forEach((button) => button.classList.toggle("active", button.dataset.panel === panelId));
  $$(".lab-panel").forEach((panel) => panel.classList.toggle("active", panel.id === panelId));
  if (panelId === "graphPanel") renderGraph();
}

function updateChallengeCopy() {
  const challenge = challengeSystem.current();
  el.challengeSelect.value = challenge.id;
  el.challengeTitle.textContent = challenge.title;
  el.challengePrompt.textContent = challenge.prompt;
}

function checkChallenge() {
  const feedback = challengeSystem.evaluate({
    prediction: el.predictionInput.value,
    explanation: el.explanationInput.value,
    context: {
      locks: getCurrentLocks(),
      currentTemperatureUnit: el.temperatureUnit.value
    },
    showAnswers: el.showAnswers.checked
  });
  el.challengeFeedback.innerHTML = feedback.map((item) => `<div>${escapeHtml(item)}</div>`).join("");
  el.challengeFeedback.className = feedback.some((item) => item.includes("ระวัง") || item.includes("ยัง") || item.includes("ตรวจ"))
    ? "feedback-box warning"
    : "feedback-box good";
}

function applyTeacherPreset() {
  const preset = getTeacherPreset(el.teacherPreset.value);
  applyScenario(preset.scenarioId);
  $$(".teacher-lock").forEach((input) => {
    input.checked = preset.locks.includes(input.value);
  });
  applyTeacherLocksToMain();
  makeWorksheet();
}

function applyTeacherLocksToMain() {
  const locks = getTeacherLocks();
  el.lockP.checked = locks.includes("P");
  el.lockV.checked = locks.includes("V");
  el.lockT.checked = locks.includes("T");
  el.lockN.checked = locks.includes("n");
  renderMisconceptions();
}

function makeWorksheet() {
  const preset = getTeacherPreset(el.teacherPreset.value);
  const challenge = challengeSystem.current();
  el.worksheetOutput.value = generateWorksheet({
    preset,
    challenge,
    state: currentState,
    showAnswers: el.showAnswers.checked
  });
}

function formatForInput(value, places = 3) {
  const rounded = round(value, places);
  return Number.isInteger(rounded) ? String(rounded) : String(rounded);
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

init();
