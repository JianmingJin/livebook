// 放大镜：鼠标在气体 / 液体上停一下，旁边浮出一个圆，里面是这个位置的分子（按这一课的模型算出来的比例）。
//
//   const lens = microLens({ group, probe });
//   probe(ray) → null（这里没什么可看的）| { mix: { CO2: 0.6, N2: 0.3, O2: 0.1 }, note: '杯底', liquid?: true }
//     气体里分子稀稀拉拉（分子间距约是分子大小的 10 倍）；liquid: true 时挤得很密
//     mix 是这里各种分子所占的比例（加起来约等于 1，不用很准）；note 是放大镜下面那一行小字的前半句
//   pointer.move 里调用 lens.move(ray, e)；拖东西的时候调用 lens.hide()；每帧 lens.update(dt)
// 分子种类：CO2 O2 N2 H2O H2CO3。原子颜色：碳 深灰（和二氧化碳的深灰点一致）、氧 红、氢 白、氮 蓝。
import { h } from '../../ui/Panel.js';

const EL = { C: ['#3d4350', 7.2], O: ['#e0483a', 6.4], H: ['#f7f6f1', 4.2], N: ['#4a78d8', 6.6] };
// 每种分子的原子：[元素, x, y]（单位：像素，分子自己的坐标；画的时候再转）
const MOL = {
  CO2: [['O', -11.5, 0], ['C', 0, 0], ['O', 11.5, 0]],
  O2: [['O', -5.6, 0], ['O', 5.6, 0]],
  N2: [['N', -5.6, 0], ['N', 5.6, 0]],
  H2O: [['O', 0, 0], ['H', -6.4, 5.2], ['H', 6.4, 5.2]],
  H2CO3: [['C', 0, 0], ['O', 0, -11], ['O', -9.6, 5.6], ['O', 9.6, 5.6], ['H', -16.5, 1.6], ['H', 16.5, 1.6]],
};
const NAME = { CO2: '二氧化碳', O2: '氧气', N2: '氮气', H2O: '水', H2CO3: '碳酸' };
const R = 86, N = 22, GAS = 8;            // 放大镜半径（像素）、液体里的分子数、气体里的分子数

export function microLens({ probe, size = R, n = N, delay = 0.25 } = {}) {
  const cv = h('canvas', { width: size * 2 * 2, height: size * 2 * 2 });
  cv.style.cssText = `width:${size * 2}px;height:${size * 2}px;display:block`;
  const cap = h('div', { class: 'lens-cap' });
  const el = h('div', { class: 'micro-lens', hidden: true }, cv, cap);
  document.body.append(el);
  const g = cv.getContext('2d'); g.scale(2, 2);
  const mols = Array.from({ length: n }, () => ({ k: 'N2', x: (Math.random() - 0.5) * size * 1.4, y: (Math.random() - 0.5) * size * 1.4, vx: 0, vy: 0, a: Math.random() * 6.28, va: 0, fade: 1 }));
  let cur = null, hoverT = 0, shown = 0, at = [0, 0], hidden = false;
  let count = GAS;
  const pickKinds = (mix) => {
    // 按比例分配分子种类：只改需要改的那几个（其余保持原来的种类，画面不乱跳）
    const kinds = Object.keys(mix).filter((k) => MOL[k]), tot = kinds.reduce((a, k) => a + Math.max(0, mix[k]), 0) || 1;
    const want = {}; let left = count;
    kinds.forEach((k, i) => { want[k] = i === kinds.length - 1 ? left : Math.round((Math.max(0, mix[k]) / tot) * count); left -= want[k]; });
    const have = {}; for (const m of mols.slice(0, count)) have[m.k] = (have[m.k] || 0) + 1;
    const live = mols.slice(0, count);
    for (const m of live) if (!want[m.k] || have[m.k] > want[m.k]) {
      const k = kinds.find((kk) => (have[kk] || 0) < want[kk]); if (!k) continue;
      have[m.k]--; have[k] = (have[k] || 0) + 1; m.k = k; m.fade = 0;
    }
  };
  const draw = () => {
    g.clearRect(0, 0, size * 2, size * 2);
    g.save(); g.translate(size, size);
    g.beginPath(); g.arc(0, 0, size - 2, 0, Math.PI * 2); g.fillStyle = '#fbf8f0'; g.fill(); g.clip();
    for (const m of mols.slice(0, count)) {
      g.save(); g.translate(m.x, m.y); g.rotate(m.a); g.globalAlpha = Math.min(1, m.fade);
      const atoms = MOL[m.k];
      g.strokeStyle = 'rgba(40,44,58,0.55)'; g.lineWidth = 2.2;                       // 化学键
      for (let i = 1; i < atoms.length; i++) { const c = atoms.find((a) => a[0] === 'C') || atoms[0], b = atoms[i]; if (b === c) continue; g.beginPath(); g.moveTo(c[1], c[2]); g.lineTo(b[1], b[2]); g.stroke(); }
      for (const [e, x, y] of [...atoms].sort((p, q) => (p[0] === 'H') - (q[0] === 'H'))) {
        const [col, r] = EL[e];
        g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fillStyle = col; g.fill();
        g.lineWidth = 1.1; g.strokeStyle = 'rgba(30,32,44,0.8)'; g.stroke();
        g.beginPath(); g.arc(x - r * 0.35, y - r * 0.35, r * 0.32, 0, Math.PI * 2); g.fillStyle = 'rgba(255,255,255,0.45)'; g.fill();
      }
      g.restore();
    }
    g.restore();
    g.beginPath(); g.arc(size, size, size - 2, 0, Math.PI * 2); g.lineWidth = 2.6; g.strokeStyle = '#2f3443'; g.stroke();     // 镜框
    g.beginPath(); g.arc(size, size, size - 6, 0, Math.PI * 2); g.lineWidth = 0.8; g.strokeStyle = 'rgba(47,52,67,0.35)'; g.stroke();
  };
  const api = {
    el, mols, get count() { return count; },
    /** 鼠标移动：ray 是实验里的射线，e 是鼠标事件 */
    move(ray, e) {
      if (hidden) return;
      const r = probe(ray);
      if (!r) { cur = null; hoverT = 0; return; }
      cur = r; if (e) at = [e.clientX, e.clientY];
    },
    hide(v = true) { hidden = v; if (v) { cur = null; hoverT = 0; } },
    update(dt) {
      hoverT = cur ? hoverT + dt : 0;
      const on = cur && hoverT > delay;
      shown = Math.max(0, Math.min(1, shown + (on ? dt * 5 : -dt * 6)));
      el.hidden = shown <= 0.01;
      if (el.hidden) return;
      el.style.opacity = shown.toFixed(2); el.style.transform = `translate(${at[0] + 26}px, ${at[1] - size * 2 - 18}px) scale(${0.85 + 0.15 * shown})`;
      if (cur) {
        const c2 = cur.liquid ? n : Math.min(n, GAS);
        if (c2 > count) for (const m of mols.slice(count, c2)) m.fade = 0;
        count = c2;
        pickKinds(cur.mix);
        const parts = Object.entries(cur.mix).filter(([k, v]) => MOL[k] && v > 0.005).sort((a, b) => b[1] - a[1]);
        const air = (cur.mix.N2 || 0) + (cur.mix.O2 || 0);
        cap.innerHTML = `<b>${cur.note || '这里'}</b>　` + (cur.text || parts.map(([k, v]) => `${NAME[k]} ${Math.round(v * 100)}%`).join(' · ')) + (air > 0.05 && !cur.text ? '' : '');
      }
      // 分子之间互相推开（不重叠）
      const live = mols.slice(0, count), minD = 30;
      for (let i = 0; i < live.length; i++) for (let j = i + 1; j < live.length; j++) {
        const a = live[i], b = live[j], dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy) || 1;
        if (d < minD) { const f = ((minD - d) / d) * 0.5; a.x -= dx * f; a.y -= dy * f; b.x += dx * f; b.y += dy * f; }
      }
      // 分子乱动：随机游走 + 一点惯性，碰到镜框弹回
      for (const m of live) {
        m.vx += (Math.random() - 0.5) * 90 * dt; m.vy += (Math.random() - 0.5) * 90 * dt; m.va += (Math.random() - 0.5) * 6 * dt;
        m.vx *= 0.96; m.vy *= 0.96; m.va *= 0.95;
        m.x += m.vx * dt * 6; m.y += m.vy * dt * 6; m.a += m.va * dt;
        const d = Math.hypot(m.x, m.y), lim = size - 16;
        if (d > lim) { m.x *= lim / d; m.y *= lim / d; m.vx *= -0.6; m.vy *= -0.6; }
        m.fade = Math.min(1, m.fade + dt * 3);
      }
      draw();
    },
    dispose() { el.remove(); },
  };
  return api;
}
