// 反应特写：把发生反应的那一小块放大，看分子怎么碰上、键怎么断开、原子怎么重新连成新分子；化学式跟着一起亮。
// 现在做的是 CO₂ + H₂O ⇌ H₂CO₃（石蕊纸花）。分子、键、原子对应关系都写成数据（MOL / RX），以后加别的反应照着加。
//
//   const rv = reactView();  card.el.append(rv.el)
//   每帧 rv.set({ gas: 'CO2' | 'air', wet: 0..1, acid: 0..1, paper: '#8b5fb0' }); rv.update(dt)
//   换了一朵花：rv.reset({ ... })（不播动画，直接摆成这朵花现在的样子）
// 碳酸分子的个数跟着 acid 走（acid = 1 时 MAX_ACID 个）；真实里是亿万个，这里每个代表很多个（示意）。
import { h } from '../../ui/Panel.js';

const EL = { C: ['#3d4350', 6.6], O: ['#e0483a', 6], H: ['#f7f6f1', 3.9] };
// 分子模板：atoms [元素, x, y]；bonds [i, j, 几键]
const MOL = {
  CO2: { atoms: [['C', 0, 0], ['O', -11, 0], ['O', 11, 0]], bonds: [[0, 1, 2], [0, 2, 2]] },
  H2O: { atoms: [['O', 0, 0], ['H', -6.2, 5], ['H', 6.2, 5]], bonds: [[0, 1, 1], [0, 2, 1]] },
  H2CO3: { atoms: [['C', 0, 0], ['O', 0, -11.5], ['O', -10, 5.8], ['O', 10, 5.8], ['H', -17, 2.4], ['H', 17, 2.4]], bonds: [[0, 1, 2], [0, 2, 1], [0, 3, 1], [2, 4, 1], [3, 5, 1]] },
  N2: { atoms: [['N', -5.4, 0], ['N', 5.4, 0]], bonds: [[0, 1, 3]] },
  O2: { atoms: [['O', -5.4, 0], ['O', 5.4, 0]], bonds: [[0, 1, 2]] },
};
EL.N = ['#4a78d8', 6.2];
// H₂CO₃ 的每个原子来自哪里：[0 = CO₂ / 1 = H₂O, 那个分子里的第几个原子]
// 水分子的氧连到碳上（带着一个氢），水的另一个氢转到二氧化碳的一个氧上
const FROM = [[0, 0], [0, 1], [1, 0], [0, 2], [1, 1], [1, 2]];
const W = 300, H = 196, FILM = 98, PAPER = 150, MAX_ACID = 6, MAX_WATER = 8;          // 水膜画厚一些：装得下这些分子

const ease = (x) => (x <= 0 ? 0 : x >= 1 ? 1 : x * x * (3 - 2 * x));
const rot = (x, y, a) => [x * Math.cos(a) - y * Math.sin(a), x * Math.sin(a) + y * Math.cos(a)];

export function reactView() {
  const cv = h('canvas', { width: W * 2, height: H * 2 }); cv.style.cssText = `width:${W}px;height:${H}px;display:block;border-radius:6px`;
  const eq = h('div', { class: 'rx-eq' });
  const cap = h('div', { class: 'rx-cap' });
  const el = h('div', { class: 'rx-view' }, cv, eq, cap);
  const g = cv.getContext('2d'); g.scale(2, 2);
  let st = { gas: 'air', wet: 0, acid: 0, paper: '#8b5fb0' };
  let mols = [], events = [], flash = 0, dir = 1, lastEq = '';
  const rnd = (a, b) => a + Math.random() * (b - a);
  const mk = (k, x, y, extra = {}) => ({ k, x, y, a: rnd(-0.4, 0.4), vx: 0, vy: 0, va: 0, alpha: 1, busy: false, ...extra });
  const count = (k, f = (m) => !m.leaving) => mols.filter((m) => m.k === k && f(m)).length;
  const inFilm = () => [rnd(18, W - 18), rnd(FILM + 4, PAPER - 6)];
  const inGas = () => [rnd(16, W - 16), rnd(14, FILM - 22)];

  const api = {
    el,
    /** 换了一朵花：直接摆成这个样子 */
    reset(s) {
      st = { ...st, ...s }; events = []; mols = [];
      const nA = Math.round(st.acid * MAX_ACID), nW = Math.max(0, Math.round(st.wet * MAX_WATER) - nA);
      for (let i = 0; i < nA; i++) mols.push(mk('H2CO3', ...inFilm()));
      for (let i = 0; i < nW; i++) mols.push(mk('H2O', ...inFilm()));
      fillGas();
    },
    set(s) { st = { ...st, ...s }; },
    update(dt) { step(dt); draw(); },
  };
  const fillGas = () => {
    const want = st.gas === 'CO2' ? 6 : 0, air = st.gas === 'CO2' ? 0 : 3;
    while (count('CO2', (m) => !m.leaving && m.gas) < want) mols.push(mk('CO2', rnd(16, W - 16), rnd(-20, 10), { gas: true }));
    while (count('N2') < air) mols.push(mk('N2', ...inGas(), { gas: true }));
    while (count('O2') < (air ? 1 : 0)) mols.push(mk('O2', ...inGas(), { gas: true }));
    for (const m of mols) if (m.gas && !m.busy && ((m.k === 'CO2' && !want) || ((m.k === 'N2' || m.k === 'O2') && !air))) m.leaving = true;
  };

  const step = (dt) => {
    fillGas();
    // 水：喷上水 / 慢慢干掉（多出来的水分子飞走 = 蒸发）
    const nA = count('H2CO3') + events.filter((e) => e.kind === 'form').length;
    const wantW = Math.max(0, Math.round(st.wet * MAX_WATER) - nA);
    const freeW = mols.filter((m) => m.k === 'H2O' && !m.busy && !m.leaving);
    if (freeW.length < wantW && st.wet > 0.05) mols.push(mk('H2O', rnd(18, W - 18), FILM - 10, { vy: 20 }));
    if (freeW.length > wantW) freeW[0].leaving = true;
    // 反应：碳酸分子的个数跟着 acid 走
    const wantA = Math.round(st.acid * MAX_ACID);
    if (events.length < 3) {
      const co2 = mols.find((m) => m.k === 'CO2' && m.gas && !m.busy && !m.leaving && m.y > 8);
      const w = mols.find((m) => m.k === 'H2O' && !m.busy && !m.leaving && m.y > FILM);
      if (nA < wantA && co2 && w) {
        co2.busy = w.busy = true;
        events.push({ kind: 'form', t: 0, co2, w, at: [w.x, w.y - 4] }); flash = 1; dir = 1;
      } else if (count('H2CO3') > wantA && !events.some((e) => e.kind === 'break')) {
        const a = mols.find((m) => m.k === 'H2CO3' && !m.busy);
        if (a) { a.busy = true; events.push({ kind: 'break', t: 0, a }); flash = 1; dir = -1; }
      }
    }
    for (const e of events) e.t += dt;
    for (const e of events.filter((x) => x.done)) {}
    events = events.filter((e) => {
      if (e.kind === 'form') {
        // 0–0.7 s 二氧化碳飞到水分子上；0.7–1.5 s 原子挪位置、键换掉；之后是一个碳酸分子
        if (e.t < 0.7) { const u = ease(e.t / 0.7); e.co2.x += (e.at[0] - e.co2.x) * Math.min(1, u * 0.25 + 0.05); e.co2.y += (e.at[1] - 13 - e.co2.y) * Math.min(1, u * 0.25 + 0.05); }
        if (e.t >= 1.5) { mols = mols.filter((m) => m !== e.co2 && m !== e.w); mols.push(mk('H2CO3', e.at[0], e.at[1], { a: 0 })); return false; }
        return true;
      }
      // 分解：0–0.8 s 原子挪回去，分成 CO₂ 和 H₂O；二氧化碳往上飞走
      if (e.t >= 0.8) {
        const a = e.a; mols = mols.filter((m) => m !== a);
        mols.push(mk('CO2', a.x, a.y - 13, { a: 0, gas: true, leaving: true, vy: -40 }), mk('H2O', a.x, a.y + 2, { a: 0 }));
        return false;
      }
      return true;
    });
    // 分子之间互相推开（不重叠，看得清每个分子的样子）
    const free = mols.filter((m) => !m.busy && !m.leaving);
    for (let i = 0; i < free.length; i++) for (let j = i + 1; j < free.length; j++) {
      const a = free[i], b = free[j], dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy) || 1, minD = (a.k === 'H2CO3' || b.k === 'H2CO3') ? 40 : 30;
      if (d < minD) { const f = ((minD - d) / d) * 0.5; a.x -= dx * f; a.y -= dy * f; b.x += dx * f; b.y += dy * f; }
    }
    // 乱动：气体里跑得快、水膜里挤着晃
    for (const m of mols) {
      if (m.busy) continue;
      const gas = m.gas || m.leaving;
      m.vx += (Math.random() - 0.5) * (gas ? 260 : 60) * dt; m.vy += (Math.random() - 0.5) * (gas ? 260 : 60) * dt; m.va += (Math.random() - 0.5) * 4 * dt;
      if (m.k === 'CO2' && m.gas && !m.leaving && st.wet > 0.05) m.vy += 30 * dt;          // 往纸上的水膜飘
      if (m.leaving) m.vy -= 120 * dt;
      m.vx *= 0.95; m.vy *= 0.95; m.va *= 0.94;
      m.x += m.vx * dt; m.y += m.vy * dt; m.a += m.va * dt;
      m.x = Math.max(14, Math.min(W - 14, m.x));
      if (m.leaving) { m.alpha -= dt * 0.9; continue; }
      if (gas) m.y = Math.min(m.y, st.wet > 0.05 ? FILM + 2 : PAPER - 14); else m.y = Math.max(FILM + 12, Math.min(PAPER - 10, m.y));
      if (gas && m.y < 10) m.vy += 40 * dt;
    }
    mols = mols.filter((m) => !(m.leaving && (m.alpha <= 0 || m.y < -30)));
    flash = Math.max(0, flash - dt * 0.7);
    // 化学式和说明
    const eqHtml = dir > 0
      ? `<span class="s-co2">CO<sub>2</sub></span> + <span class="s-h2o">H<sub>2</sub>O</span> <span class="arr">══</span> <span class="s-h2co3">H<sub>2</sub>CO<sub>3</sub></span>`
      : `<span class="s-h2co3">H<sub>2</sub>CO<sub>3</sub></span> <span class="arr">══</span> <span class="s-co2">CO<sub>2</sub></span>↑ + <span class="s-h2o">H<sub>2</sub>O</span>`;
    if (eqHtml !== lastEq) { eq.innerHTML = eqHtml; lastEq = eqHtml; }
    eq.style.opacity = (0.45 + 0.55 * Math.max(flash, events.length ? 1 : 0)).toFixed(2);
    const nAc = count('H2CO3');
    cap.innerHTML = events.length
      ? (dir > 0 ? '二氧化碳分子碰上水分子，<b>连成一个碳酸分子</b>　原子：C 1、O 3、H 2，反应前后一样多' : '碳酸分子不稳定，<b>拆开了</b>：二氧化碳跑掉，水留下')
      : st.wet < 0.05 && st.gas === 'CO2' ? '纸是干的：二氧化碳碰上去，<b>没有水，不反应</b>'
      : st.wet >= 0.05 && st.gas !== 'CO2' && nAc === 0 ? '纸上有水，可是<b>没有二氧化碳</b>：不反应'
      : nAc ? `纸上的水里有 <b>${nAc}</b> 个碳酸分子（每个代表很多个）——石蕊遇酸变红` : '纸是干的，周围是空气';
  };

  const drawMol = (m, atomsAt, bonds, bondAlpha = 1) => {
    g.globalAlpha = Math.max(0, Math.min(1, m ? m.alpha : 1));
    for (const [i, j, n] of bonds) {
      const [x1, y1] = atomsAt[i], [x2, y2] = atomsAt[j], dx = x2 - x1, dy = y2 - y1, L = Math.hypot(dx, dy) || 1, ox = (-dy / L) * 2.2, oy = (dx / L) * 2.2;
      g.strokeStyle = `rgba(40,44,58,${0.6 * bondAlpha})`; g.lineWidth = 1.8;
      for (let k = 0; k < n; k++) { const o = n === 1 ? 0 : (k - (n - 1) / 2); g.beginPath(); g.moveTo(x1 + ox * o, y1 + oy * o); g.lineTo(x2 + ox * o, y2 + oy * o); g.stroke(); }
    }
    atomsAt.map((p, i) => [p, i]).sort((a, b) => (a[0][2] === 'H') - (b[0][2] === 'H')).forEach(([[x, y, e]]) => {
      const [col, r] = EL[e];
      g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fillStyle = col; g.fill(); g.lineWidth = 1; g.strokeStyle = 'rgba(30,32,44,0.8)'; g.stroke();
      g.beginPath(); g.arc(x - r * 0.35, y - r * 0.35, r * 0.3, 0, Math.PI * 2); g.fillStyle = 'rgba(255,255,255,0.45)'; g.fill();
    });
    g.globalAlpha = 1;
  };
  const placed = (m) => MOL[m.k].atoms.map(([e, x, y]) => { const [rx, ry] = rot(x, y, m.a); return [m.x + rx, m.y + ry, e]; });

  const draw = () => {
    g.clearRect(0, 0, W, H);
    // 上面是瓶里的气体（二氧化碳时淡淡的灰），下面是染了石蕊的纸，纸上一层水膜
    g.fillStyle = st.gas === 'CO2' ? '#f1f1ee' : '#fbf8f0'; g.fillRect(0, 0, W, PAPER);
    g.fillStyle = st.paper; g.fillRect(0, PAPER, W, H - PAPER);
    g.strokeStyle = 'rgba(255,255,255,0.25)'; g.lineWidth = 1;
    for (let i = 0; i < 9; i++) { g.beginPath(); g.moveTo(-10 + i * 37, PAPER + 8 + (i % 3) * 12); g.bezierCurveTo(40 + i * 37, PAPER + 2, 60 + i * 37, PAPER + 40, 120 + i * 37, PAPER + 22 + (i % 2) * 14); g.stroke(); }       // 纸的纤维
    if (st.wet > 0.05) { g.fillStyle = `rgba(140,203,232,${0.25 + 0.3 * st.wet})`; g.fillRect(0, FILM, W, PAPER - FILM); }
    g.fillStyle = 'rgba(40,44,58,0.55)'; g.font = '10px "Songti SC", serif';
    g.fillText(st.gas === 'CO2' ? '瓶里的二氧化碳' : '空气', 8, 13);
    if (st.wet > 0.05) g.fillText('纸上的水', 8, FILM + 11);
    g.fillStyle = 'rgba(255,255,255,0.85)'; g.fillText('石蕊染过的纸', 8, H - 7);
    for (const m of mols) if (!m.busy) drawMol(m, placed(m), MOL[m.k].bonds);
    for (const e of events) {
      if (e.kind === 'form') {
        // 原子从 CO₂ 和 H₂O 里的位置挪到 H₂CO₃ 里的位置；旧键淡出，新键淡入
        const u = ease((e.t - 0.7) / 0.8), src = [placed(e.co2), placed(e.w)];
        const end = MOL.H2CO3.atoms.map(([el2, x, y]) => [e.at[0] + x, e.at[1] + y, el2]);
        if (u <= 0) { drawMol(e.co2, src[0], MOL.CO2.bonds); drawMol(e.w, src[1], MOL.H2O.bonds); continue; }
        const at = FROM.map(([mi, ai], i) => [src[mi][ai][0] + (end[i][0] - src[mi][ai][0]) * u, src[mi][ai][1] + (end[i][1] - src[mi][ai][1]) * u, end[i][2]]);
        const back = [[0, 1, 2], [0, 3, 2]].map(([a, b, n]) => [a, b, n]);       // CO₂ 的两个双键（用 H₂CO₃ 里的编号）
        drawMol(null, at, back.map(([a, b]) => [a, b, 2]), 1 - u);
        drawMol(null, at, [[2, 4, 1], [2, 5, 1]], 1 - u);                         // 水的两个键
        drawMol(null, at, MOL.H2CO3.bonds, u);
        // 一圈淡淡的光：这里在反应
        g.beginPath(); g.arc(e.at[0], e.at[1], 26 + 6 * Math.sin(e.t * 8), 0, Math.PI * 2); g.strokeStyle = `rgba(217,69,95,${0.35 * (1 - Math.abs(u - 0.5) * 2)})`; g.lineWidth = 2; g.stroke();
      } else {
        const u = ease(e.t / 0.8), a = e.a, start = placed(a);
        const co2 = MOL.CO2.atoms.map(([el2, x, y]) => [a.x + x, a.y - 13 + y, el2]), w = MOL.H2O.atoms.map(([el2, x, y]) => [a.x + x, a.y + 2 + y, el2]);
        const end = FROM.map(([mi, ai]) => (mi ? w : co2)[ai]);
        const at = start.map((p, i) => [p[0] + (end[i][0] - p[0]) * u, p[1] + (end[i][1] - p[1]) * u, p[2]]);
        drawMol(null, at, MOL.H2CO3.bonds, 1 - u);
        drawMol(null, at, [[0, 1, 2], [0, 3, 2], [2, 4, 1], [2, 5, 1]], u);
      }
    }
  };
  return api;
}
