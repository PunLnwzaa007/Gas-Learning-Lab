import { GAS_CATALOG, VARIABLE_COLORS, clamp, round } from "./constants.js";
import { makeGasLawCurve } from "./physicsEngine.js";

export class GraphRenderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
  }

  draw({ type, rows, state, lawId, mixtureRows, graham }) {
    const { width, height } = this.resize();
    this.ctx.clearRect(0, 0, width, height);
    this.ctx.fillStyle = "#ffffff";
    this.ctx.fillRect(0, 0, width, height);

    if (type === "mixture") {
      this.drawMixtureBars(width, height, mixtureRows);
      return;
    }

    if (type === "graham") {
      this.drawGrahamBars(width, height, graham);
      return;
    }

    const config = graphConfigs[type] || graphConfigs.PV;
    const dataPoints = rows.map((row) => ({
      x: config.x(row.state),
      y: config.y(row.state),
      label: `#${row.id}`
    }));
    const curve = makeGasLawCurve(type, state, lawId);
    this.drawScatter(width, height, config, curve, dataPoints);
  }

  resize() {
    const ratio = window.devicePixelRatio || 1;
    const width = Math.max(320, Math.floor(this.canvas.clientWidth));
    const height = Math.max(260, Math.floor(this.canvas.clientHeight));
    const scaledWidth = Math.floor(width * ratio);
    const scaledHeight = Math.floor(height * ratio);
    if (this.canvas.width !== scaledWidth || this.canvas.height !== scaledHeight) {
      this.canvas.width = scaledWidth;
      this.canvas.height = scaledHeight;
    }
    this.ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    return { width, height };
  }

  drawScatter(width, height, config, curve, dataPoints) {
    const padding = { left: 58, right: 24, top: 24, bottom: 48 };
    const plotW = width - padding.left - padding.right;
    const plotH = height - padding.top - padding.bottom;
    const allPoints = [...curve, ...dataPoints];
    const extents = getExtents(allPoints);
    const xScale = (value) => padding.left + ((value - extents.minX) / (extents.maxX - extents.minX)) * plotW;
    const yScale = (value) => padding.top + plotH - ((value - extents.minY) / (extents.maxY - extents.minY)) * plotH;

    this.drawGrid(padding, plotW, plotH, width, height, config, extents);

    if (curve.length > 1) {
      this.ctx.beginPath();
      curve.forEach((point, index) => {
        const x = xScale(point.x);
        const y = yScale(point.y);
        if (index === 0) this.ctx.moveTo(x, y);
        else this.ctx.lineTo(x, y);
      });
      this.ctx.strokeStyle = config.color;
      this.ctx.lineWidth = 2.4;
      this.ctx.stroke();
    }

    dataPoints.forEach((point) => {
      const x = xScale(point.x);
      const y = yScale(point.y);
      this.ctx.beginPath();
      this.ctx.arc(x, y, 4.5, 0, Math.PI * 2);
      this.ctx.fillStyle = "#172026";
      this.ctx.fill();
      this.ctx.strokeStyle = "#ffffff";
      this.ctx.lineWidth = 1.5;
      this.ctx.stroke();
      this.ctx.fillStyle = "#66727c";
      this.ctx.font = "12px Segoe UI, sans-serif";
      this.ctx.fillText(point.label, x + 7, y - 6);
    });
  }

  drawGrid(padding, plotW, plotH, width, height, config, extents) {
    this.ctx.strokeStyle = "#d6e0e6";
    this.ctx.lineWidth = 1;
    this.ctx.fillStyle = "#66727c";
    this.ctx.font = "12px Segoe UI, sans-serif";

    for (let i = 0; i <= 4; i += 1) {
      const y = padding.top + (plotH * i) / 4;
      this.ctx.beginPath();
      this.ctx.moveTo(padding.left, y);
      this.ctx.lineTo(width - padding.right, y);
      this.ctx.stroke();
      const value = extents.maxY - ((extents.maxY - extents.minY) * i) / 4;
      this.ctx.fillText(round(value, 2), 8, y + 4);
    }

    for (let i = 0; i <= 4; i += 1) {
      const x = padding.left + (plotW * i) / 4;
      this.ctx.beginPath();
      this.ctx.moveTo(x, padding.top);
      this.ctx.lineTo(x, padding.top + plotH);
      this.ctx.stroke();
      const value = extents.minX + ((extents.maxX - extents.minX) * i) / 4;
      this.ctx.fillText(round(value, 2), x - 12, height - 24);
    }

    this.ctx.strokeStyle = "#172026";
    this.ctx.lineWidth = 1.5;
    this.ctx.beginPath();
    this.ctx.moveTo(padding.left, padding.top);
    this.ctx.lineTo(padding.left, padding.top + plotH);
    this.ctx.lineTo(padding.left + plotW, padding.top + plotH);
    this.ctx.stroke();

    this.ctx.fillStyle = config.color;
    this.ctx.font = "700 13px Segoe UI, sans-serif";
    this.ctx.fillText(config.yLabel, 12, 18);
    this.ctx.fillText(config.xLabel, width - padding.right - 92, height - 9);
  }

  drawMixtureBars(width, height, rows) {
    const padding = { left: 118, right: 32, top: 28, bottom: 42 };
    const rowHeight = Math.min(44, (height - padding.top - padding.bottom) / Math.max(1, rows.length));
    this.ctx.fillStyle = "#172026";
    this.ctx.font = "700 14px Segoe UI, sans-serif";
    this.ctx.fillText("Dalton: partial pressure", 16, 20);

    if (!rows.length) {
      this.drawEmpty(width, height, "ยังไม่มีแก๊สใน mixture");
      return;
    }

    const maxP = Math.max(0.001, ...rows.map((row) => row.partialPressure));
    rows.forEach((row, index) => {
      const y = padding.top + index * rowHeight + 8;
      const barW = (row.partialPressure / maxP) * (width - padding.left - padding.right);
      this.ctx.fillStyle = row.gas.color;
      this.ctx.fillRect(padding.left, y, barW, 22);
      this.ctx.fillStyle = "#172026";
      this.ctx.font = "700 13px Segoe UI, sans-serif";
      this.ctx.fillText(row.id, 24, y + 16);
      this.ctx.fillStyle = "#66727c";
      this.ctx.font = "12px Segoe UI, sans-serif";
      this.ctx.fillText(`x=${round(row.moleFraction, 3)}  P=${round(row.partialPressure, 3)} atm`, padding.left + barW + 8, y + 16);
    });
  }

  drawGrahamBars(width, height, graham) {
    if (!graham) {
      this.drawEmpty(width, height, "กดจำลอง Graham เพื่อสร้างข้อมูล rate");
      return;
    }

    const padding = { left: 82, right: 32, top: 54, bottom: 56 };
    const maxRate = Math.max(graham.rateA, graham.rateB);
    const bars = [
      { label: graham.gasA.id, rate: graham.rateA, color: graham.gasA.color, time: graham.timeA },
      { label: graham.gasB.id, rate: graham.rateB, color: graham.gasB.color, time: graham.timeB }
    ];

    this.ctx.fillStyle = "#172026";
    this.ctx.font = "700 14px Segoe UI, sans-serif";
    this.ctx.fillText("Graham: rate ∝ 1/sqrt(M)", 16, 24);

    bars.forEach((bar, index) => {
      const y = padding.top + index * 84;
      const barW = (bar.rate / maxRate) * (width - padding.left - padding.right);
      this.ctx.fillStyle = bar.color;
      this.ctx.fillRect(padding.left, y, barW, 28);
      this.ctx.fillStyle = "#172026";
      this.ctx.font = "700 13px Segoe UI, sans-serif";
      this.ctx.fillText(bar.label, 24, y + 19);
      this.ctx.fillStyle = "#66727c";
      this.ctx.font = "12px Segoe UI, sans-serif";
      this.ctx.fillText(`rate=${round(bar.rate, 2)}  time=${round(bar.time, 1)} s`, padding.left, y + 48);
    });
  }

  drawEmpty(width, height, message) {
    this.ctx.fillStyle = "#66727c";
    this.ctx.font = "14px Segoe UI, sans-serif";
    this.ctx.textAlign = "center";
    this.ctx.fillText(message, width / 2, height / 2);
    this.ctx.textAlign = "start";
  }
}

const graphConfigs = {
  PV: {
    xLabel: "V (L)",
    yLabel: "P (atm)",
    x: (state) => state.V,
    y: (state) => state.P,
    color: VARIABLE_COLORS.P
  },
  VT: {
    xLabel: "T (K)",
    yLabel: "V (L)",
    x: (state) => state.T,
    y: (state) => state.V,
    color: VARIABLE_COLORS.V
  },
  PT: {
    xLabel: "T (K)",
    yLabel: "P (atm)",
    x: (state) => state.T,
    y: (state) => state.P,
    color: VARIABLE_COLORS.T
  }
};

function getExtents(points) {
  const xs = points.map((point) => point.x).filter(Number.isFinite);
  const ys = points.map((point) => point.y).filter(Number.isFinite);
  let minX = Math.min(...xs, 0);
  let maxX = Math.max(...xs, 1);
  let minY = Math.min(...ys, 0);
  let maxY = Math.max(...ys, 1);
  if (minX === maxX) maxX = minX + 1;
  if (minY === maxY) maxY = minY + 1;
  const xPad = (maxX - minX) * 0.08;
  const yPad = (maxY - minY) * 0.12;
  return {
    minX: clamp(minX - xPad, 0, Number.POSITIVE_INFINITY),
    maxX: maxX + xPad,
    minY: clamp(minY - yPad, 0, Number.POSITIVE_INFINITY),
    maxY: maxY + yPad
  };
}
