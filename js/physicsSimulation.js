import { GAS_BY_ID, clamp } from "./constants.js";
import { normalizeState } from "./physicsEngine.js";

export class ParticleSimulation {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    this.running = false;
    this.lastFrame = performance.now();
    this.state = normalizeState({});
    this.species = [];
    this.particles = [];
    this.viewMode = "particles";
    this.graham = null;
    this.escapedCounts = {};
    this.box = null;
    this.needsReset = true;
    requestAnimationFrame((now) => this.loop(now));
  }

  setRunning(running) {
    this.running = running;
  }

  setViewMode(mode) {
    this.viewMode = mode === "graham" ? "graham" : "particles";
    this.needsReset = true;
  }

  setThermoState(state, mixture) {
    this.state = normalizeState(state);
    this.species = mixture.particleSpecies(this.particleBudget());
    this.needsReset = true;
  }

  setGraham(graham) {
    this.graham = graham;
    this.needsReset = true;
  }

  reset() {
    this.rebuildParticles();
  }

  getEscapedCounts() {
    return { ...this.escapedCounts };
  }

  loop(now) {
    const dt = Math.min(1 / 30, Math.max(0, (now - this.lastFrame) / 1000));
    this.lastFrame = now;

    if (this.needsReset || !this.particles.length) {
      this.rebuildParticles();
    }

    if (this.running) {
      this.step(dt);
    }

    this.draw();
    requestAnimationFrame((next) => this.loop(next));
  }

  resize() {
    const ratio = window.devicePixelRatio || 1;
    const width = Math.max(320, Math.floor(this.canvas.clientWidth));
    const height = Math.max(280, Math.floor(this.canvas.clientHeight));
    const scaledWidth = Math.floor(width * ratio);
    const scaledHeight = Math.floor(height * ratio);
    if (this.canvas.width !== scaledWidth || this.canvas.height !== scaledHeight) {
      this.canvas.width = scaledWidth;
      this.canvas.height = scaledHeight;
      this.needsReset = true;
    }
    this.ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    return { width, height };
  }

  particleBudget() {
    const fromMoles = 72 + Math.log10(Math.max(1, this.state.n * 10)) * 34;
    return Math.round(clamp(fromMoles, 70, 170));
  }

  currentBox(width = this.canvas.clientWidth, height = this.canvas.clientHeight) {
    const margin = width < 620 ? 18 : 30;
    const maxW = width - margin * 2;
    const maxH = height - margin * 2;
    const volumeScale = clamp(Math.sqrt(this.state.V / 24.47), 0.38, 1);
    const boxW = maxW * volumeScale;
    const boxH = maxH * clamp(volumeScale * 0.95 + 0.05, 0.42, 1);
    return {
      x: (width - boxW) / 2,
      y: (height - boxH) / 2,
      w: boxW,
      h: boxH
    };
  }

  rebuildParticles() {
    const { width, height } = this.resize();
    this.box = this.currentBox(width, height);
    this.particles = [];
    this.escapedCounts = {};
    const species = this.viewMode === "graham" && this.graham
      ? [
        { id: this.graham.gasA.id, count: 76, color: this.graham.gasA.color, molarMass: this.graham.gasA.molarMass },
        { id: this.graham.gasB.id, count: 76, color: this.graham.gasB.color, molarMass: this.graham.gasB.molarMass }
      ]
      : this.species;
    species.forEach((item) => {
      this.escapedCounts[item.id] = 0;
      for (let i = 0; i < item.count; i += 1) {
        this.particles.push(this.makeParticle(item));
      }
    });
    this.needsReset = false;
  }

  makeParticle(item) {
    const box = this.box;
    const radius = this.particles.length > 140 ? 2.7 : 3.4;
    const leftLimit = this.viewMode === "graham" ? box.x + box.w * 0.45 : box.x + box.w;
    const x = box.x + radius + Math.random() * Math.max(1, leftLimit - box.x - radius * 2);
    const y = box.y + radius + Math.random() * Math.max(1, box.h - radius * 2);
    const speed = this.speedForMass(item.molarMass);
    const angle = Math.random() * Math.PI * 2;
    return {
      x,
      y,
      vx: Math.cos(angle) * speed * (0.6 + Math.random() * 0.8),
      vy: Math.sin(angle) * speed * (0.6 + Math.random() * 0.8),
      r: radius,
      gasId: item.id,
      color: item.color,
      molarMass: item.molarMass,
      crossed: false
    };
  }

  speedForMass(molarMass) {
    return clamp(Math.sqrt(this.state.T / Math.max(1, molarMass)) * 31, 35, 520);
  }

  step(dt) {
    const { width, height } = this.resize();
    this.box = this.currentBox(width, height);
    const barrierX = this.box.x + this.box.w * 0.52;

    this.particles.forEach((particle) => {
      particle.x += particle.vx * dt;
      particle.y += particle.vy * dt;

      if (this.viewMode === "graham" && this.graham) {
        this.handleBarrier(particle, barrierX);
      }

      this.handleWalls(particle);
    });
  }

  handleWalls(particle) {
    const box = this.box;
    if (particle.x - particle.r < box.x) {
      particle.x = box.x + particle.r;
      particle.vx = Math.abs(particle.vx);
    }
    if (particle.x + particle.r > box.x + box.w) {
      particle.x = box.x + box.w - particle.r;
      particle.vx = -Math.abs(particle.vx);
    }
    if (particle.y - particle.r < box.y) {
      particle.y = box.y + particle.r;
      particle.vy = Math.abs(particle.vy);
    }
    if (particle.y + particle.r > box.y + box.h) {
      particle.y = box.y + box.h - particle.r;
      particle.vy = -Math.abs(particle.vy);
    }
  }

  handleBarrier(particle, barrierX) {
    const crossedRight = particle.x < barrierX && particle.x + particle.vx * 0.018 >= barrierX;
    const crossedLeft = particle.x > barrierX && particle.x + particle.vx * 0.018 <= barrierX;
    if (!crossedRight && !crossedLeft) return;

    const poreBand = Math.abs(((particle.y - this.box.y) % 58) - 29) < 6;
    const massFactor = Math.sqrt((this.graham.gasA.molarMass + this.graham.gasB.molarMass) / (2 * particle.molarMass));
    const passChance = clamp(0.18 * massFactor, 0.04, 0.44);

    if (poreBand && Math.random() < passChance) {
      if (!particle.crossed && particle.x < barrierX) {
        particle.crossed = true;
        this.escapedCounts[particle.gasId] = (this.escapedCounts[particle.gasId] || 0) + 1;
      }
      return;
    }

    if (particle.x < barrierX) {
      particle.x = barrierX - particle.r - 0.5;
      particle.vx = -Math.abs(particle.vx);
    } else {
      particle.x = barrierX + particle.r + 0.5;
      particle.vx = Math.abs(particle.vx);
    }
  }

  draw() {
    const { width, height } = this.resize();
    this.box = this.currentBox(width, height);
    this.ctx.clearRect(0, 0, width, height);
    this.drawBox(width, height);
    if (this.viewMode === "graham" && this.graham) {
      this.drawMembrane();
    }
    this.drawParticles();
    this.drawLegend(width);
  }

  drawBox(width, height) {
    const box = this.box;
    const pressureAlpha = clamp(this.state.P / 9, 0.08, 0.32);
    this.ctx.save();
    this.ctx.fillStyle = "rgba(255,255,255,0.72)";
    this.ctx.fillRect(box.x, box.y, box.w, box.h);
    this.ctx.strokeStyle = "#172026";
    this.ctx.lineWidth = 2;
    this.ctx.strokeRect(box.x, box.y, box.w, box.h);
    this.ctx.strokeStyle = `rgba(214, 66, 58, ${pressureAlpha})`;
    this.ctx.lineWidth = 10;
    this.ctx.strokeRect(box.x, box.y, box.w, box.h);
    this.ctx.fillStyle = "rgba(40,105,216,0.12)";
    this.ctx.fillRect(box.x, box.y + box.h - 8, box.w, 8);

    this.ctx.fillStyle = "#66727c";
    this.ctx.font = "12px Segoe UI, sans-serif";
    this.ctx.fillText(`P ${this.state.P.toFixed(2)} atm`, box.x + 10, box.y + 20);
    this.ctx.fillText(`V ${this.state.V.toFixed(2)} L`, box.x + 10, box.y + 38);
    this.ctx.fillText(`T ${this.state.T.toFixed(0)} K`, box.x + 10, box.y + 56);
    this.ctx.restore();
  }

  drawMembrane() {
    const box = this.box;
    const x = box.x + box.w * 0.52;
    this.ctx.save();
    this.ctx.strokeStyle = "#172026";
    this.ctx.lineWidth = 3;
    this.ctx.setLineDash([12, 8]);
    this.ctx.beginPath();
    this.ctx.moveTo(x, box.y);
    this.ctx.lineTo(x, box.y + box.h);
    this.ctx.stroke();
    this.ctx.setLineDash([]);

    this.ctx.fillStyle = "rgba(255,255,255,0.92)";
    this.ctx.fillRect(x - 48, box.y + 10, 96, 30);
    this.ctx.strokeStyle = "#d6e0e6";
    this.ctx.strokeRect(x - 48, box.y + 10, 96, 30);
    this.ctx.fillStyle = "#66727c";
    this.ctx.font = "12px Segoe UI, sans-serif";
    this.ctx.fillText("porous wall", x - 34, box.y + 30);
    this.ctx.restore();
  }

  drawParticles() {
    this.particles.forEach((particle) => {
      const speed = Math.hypot(particle.vx, particle.vy);
      const tail = clamp(speed / 80, 2, 12);
      this.ctx.beginPath();
      this.ctx.moveTo(particle.x - (particle.vx / speed) * tail, particle.y - (particle.vy / speed) * tail);
      this.ctx.lineTo(particle.x, particle.y);
      this.ctx.strokeStyle = particle.color;
      this.ctx.globalAlpha = 0.28;
      this.ctx.lineWidth = 1.5;
      this.ctx.stroke();
      this.ctx.globalAlpha = 1;
      this.ctx.beginPath();
      this.ctx.arc(particle.x, particle.y, particle.r, 0, Math.PI * 2);
      this.ctx.fillStyle = particle.color;
      this.ctx.fill();
      this.ctx.strokeStyle = "rgba(255,255,255,0.82)";
      this.ctx.lineWidth = 1;
      this.ctx.stroke();
    });
  }

  drawLegend(width) {
    const activeIds = [...new Set(this.particles.map((particle) => particle.gasId))].slice(0, 6);
    const x0 = 16;
    let y = 20;
    activeIds.forEach((id) => {
      const gas = GAS_BY_ID[id];
      if (!gas) return;
      this.ctx.fillStyle = "rgba(255,255,255,0.88)";
      this.ctx.fillRect(x0, y - 14, 78, 22);
      this.ctx.fillStyle = gas.color;
      this.ctx.beginPath();
      this.ctx.arc(x0 + 10, y - 3, 5, 0, Math.PI * 2);
      this.ctx.fill();
      this.ctx.fillStyle = "#172026";
      this.ctx.font = "12px Segoe UI, sans-serif";
      this.ctx.fillText(id, x0 + 22, y + 1);
      y += 26;
    });

    if (this.viewMode === "graham" && this.graham) {
      const summary = Object.entries(this.escapedCounts)
        .map(([id, count]) => `${id}:${count}`)
        .join("  ");
      this.ctx.fillStyle = "rgba(255,255,255,0.9)";
      this.ctx.fillRect(Math.max(12, width - 150), 16, 134, 28);
      this.ctx.fillStyle = "#66727c";
      this.ctx.font = "12px Segoe UI, sans-serif";
      this.ctx.fillText(`ผ่านรู ${summary}`, Math.max(22, width - 140), 34);
    }
  }
}
