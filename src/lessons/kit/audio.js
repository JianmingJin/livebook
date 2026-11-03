// 真的声音：Web Audio。浏览器要求用户点过页面才能出声，实验里的按钮点击正好满足。
let ctx = null;
export function audio() {
  if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}

/** 持续的音（可调音调、响度、音色），带一个分析器取波形。 */
export class Tone {
  constructor({ type = 'sine', freq = 440, gain = 0.2 } = {}) {
    const a = audio();
    this.osc = a.createOscillator();
    this.osc.type = type;
    this.osc.frequency.value = freq;
    this.g = a.createGain();
    this.g.gain.value = 0;
    this.out = a.createGain();
    this.out.gain.value = 1;
    this.analyser = a.createAnalyser();
    this.analyser.fftSize = 2048;
    this.osc.connect(this.g).connect(this.out).connect(this.analyser).connect(a.destination);
    this.osc.start();
    this.level = gain;
  }
  /** 打开/关闭（有包络，不会“啪”一声） */
  on(v = true, ramp = 0.04) {
    const t = audio().currentTime;
    this.g.gain.cancelScheduledValues(t);
    this.g.gain.setTargetAtTime(v ? this.level : 0, t, ramp);
  }
  /** 拨一下：快速起音，然后按 decay 秒衰减 */
  pluck(decay = 0.6, peak = this.level) {
    const t = audio().currentTime;
    this.g.gain.cancelScheduledValues(t);
    this.g.gain.setValueAtTime(0.0001, t);
    this.g.gain.exponentialRampToValueAtTime(Math.max(0.0002, peak), t + 0.008);
    this.g.gain.exponentialRampToValueAtTime(0.0001, t + decay);
  }
  freq(f) { this.osc.frequency.setTargetAtTime(f, audio().currentTime, 0.01); }
  gain(v) { this.level = v; }
  /** 整体音量（真空罩抽气、隔音墙这些“传播途中”的衰减用这个） */
  volume(v) { this.out.gain.setTargetAtTime(v, audio().currentTime, 0.05); }
  wave(buf = new Float32Array(this.analyser.fftSize)) { this.analyser.getFloatTimeDomainData(buf); return buf; }
  stop() { try { this.osc.stop(); this.osc.disconnect(); this.analyser.disconnect(); } catch { /* 已经停了 */ } }
}

/** 噪声（无规则振动）。 */
export class Noise {
  constructor({ gain = 0.15 } = {}) {
    const a = audio();
    const buf = a.createBuffer(1, a.sampleRate * 2, a.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (0.6 + 0.4 * Math.sin(i * 0.0007));
    this.src = a.createBufferSource();
    this.src.buffer = buf;
    this.src.loop = true;
    this.g = a.createGain();
    this.g.gain.value = 0;
    this.out = a.createGain();
    this.analyser = a.createAnalyser();
    this.analyser.fftSize = 2048;
    this.src.connect(this.g).connect(this.out).connect(this.analyser).connect(a.destination);
    this.src.start();
    this.level = gain;
  }
  on(v = true) { this.g.gain.setTargetAtTime(v ? this.level : 0, audio().currentTime, 0.04); }
  volume(v) { this.out.gain.setTargetAtTime(v, audio().currentTime, 0.05); }
  wave(buf = new Float32Array(this.analyser.fftSize)) { this.analyser.getFloatTimeDomainData(buf); return buf; }
  stop() { try { this.src.stop(); this.src.disconnect(); this.analyser.disconnect(); } catch { /* */ } }
}

/** 闹钟铃声（一串快速的“叮”） */
export class Bell {
  constructor() {
    this.tone = new Tone({ type: 'triangle', freq: 1760, gain: 0.18 });
    this.t = 0; this.ringing = false;
  }
  update(dt) {
    if (!this.ringing) return;
    this.t += dt;
    if (this.t > 0.09) { this.t = 0; this.tone.pluck(0.08); }
  }
  ring(v) { this.ringing = v; if (!v) this.tone.on(false); }
  volume(v) { this.tone.volume(v); }
  wave(b) { return this.tone.wave(b); }
  stop() { this.tone.stop(); }
}

/** 示波器：把波形画到 canvas 上（课本里那种绿色荧光屏） */
export function drawScope(canvas, data, { gain = 1, color = '#49f2c3', grid = true, label } = {}) {
  const g = canvas.getContext('2d'), W = canvas.width, H = canvas.height;
  g.fillStyle = '#0b1f24'; g.fillRect(0, 0, W, H);
  if (grid) {
    g.strokeStyle = 'rgba(80,180,170,.18)'; g.lineWidth = 1;
    for (let i = 1; i < 10; i++) { g.beginPath(); g.moveTo((i * W) / 10, 0); g.lineTo((i * W) / 10, H); g.stroke(); }
    for (let i = 1; i < 6; i++) { g.beginPath(); g.moveTo(0, (i * H) / 6); g.lineTo(W, (i * H) / 6); g.stroke(); }
  }
  g.strokeStyle = color; g.lineWidth = 3; g.shadowColor = color; g.shadowBlur = 8;
  g.beginPath();
  // 找一个上升沿开始画，让波形稳定
  let start = 0;
  for (let i = 1; i < data.length / 2; i++) if (data[i - 1] < 0 && data[i] >= 0) { start = i; break; }
  const n = Math.min(data.length - start, 1024);
  for (let i = 0; i < n; i++) {
    const x = (i / n) * W, y = H / 2 - data[start + i] * gain * H * 0.42;
    i ? g.lineTo(x, y) : g.moveTo(x, y);
  }
  g.stroke();
  g.shadowBlur = 0;
  if (label) { g.fillStyle = 'rgba(160,255,230,.7)'; g.font = '22px sans-serif'; g.fillText(label, 12, 30); }
}

/** 由合成参数直接生成一段波形（不用发声也能画） */
export function synthWave(n, fn) {
  const d = new Float32Array(n);
  for (let i = 0; i < n; i++) d[i] = fn(i / n);
  return d;
}

// ---------- 一次性的小音效（点火、盖上、条件亮起）：用完自己释放 ----------
let muted = false;
export const sfx = {
  get muted() { return muted; },
  mute(v = !muted) { muted = v; return muted; },
  /** 呼的一声（点燃）：一段带通滤波的噪声，先涨后落 */
  whoosh({ dur = 0.7, freq = 520, gain = 0.22 } = {}) {
    if (muted) return;
    const a = audio(), t = a.currentTime;
    const buf = a.createBuffer(1, Math.ceil(a.sampleRate * dur), a.sampleRate), d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    const src = a.createBufferSource(); src.buffer = buf;
    const bp = a.createBiquadFilter(); bp.type = 'bandpass'; bp.Q.value = 0.7;
    bp.frequency.setValueAtTime(freq * 0.5, t); bp.frequency.exponentialRampToValueAtTime(freq * 1.6, t + dur * 0.35); bp.frequency.exponentialRampToValueAtTime(freq * 0.7, t + dur);
    const g = a.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(gain, t + dur * 0.18); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(bp).connect(g).connect(a.destination); src.start(t); src.stop(t + dur + 0.05);
  },
  /** 叮（条件亮起、卡片翻面）。freq 越来越高就是一串上行的提示音 */
  ding(freq = 880, { gain = 0.08, decay = 0.5 } = {}) {
    if (muted) return;
    const a = audio(), t = a.currentTime;
    for (const [f, k] of [[freq, 1], [freq * 2.01, 0.25]]) {
      const o = a.createOscillator(); o.type = 'sine'; o.frequency.value = f;
      const g = a.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(gain * k, t + 0.006); g.gain.exponentialRampToValueAtTime(0.0001, t + decay);
      o.connect(g).connect(a.destination); o.start(t); o.stop(t + decay + 0.05);
    }
  },
  /** 轻轻碰一下（铜片落在杯口、烧杯扣下）：很短的高频敲击 */
  clink({ freq = 2400, gain = 0.06 } = {}) {
    if (muted) return;
    const a = audio(), t = a.currentTime;
    const o = a.createOscillator(); o.type = 'triangle'; o.frequency.setValueAtTime(freq, t); o.frequency.exponentialRampToValueAtTime(freq * 0.8, t + 0.12);
    const g = a.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(gain, t + 0.003); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.16);
    o.connect(g).connect(a.destination); o.start(t); o.stop(t + 0.2);
  },
};
