// 课题2 常见的酸和碱的反应 · 实验 10-10 中和反应（课本下册第 74 页图 10-15）。
//
// 烧杯里 5 mL 稀氢氧化钠溶液，滴入几滴酚酞溶液（变红）；用滴管慢慢滴入稀盐酸，不断搅拌，至溶液颜色恰好变成无色为止。
// 模型（课本没给浓度，按课堂常用的估）：NaOH 约 0.2 mol/L（5 mL 含 1 mmol OH⁻）、HCl 约 1 mol/L、一滴约 0.05 mL（0.05 mmol H⁺）→ 约 20 滴恰好中和。
//   pH 由剩下的 OH⁻ 或多出来的 H⁺ 算（25 ℃）；酚酞在 pH 约 8.2 以下无色，8.2–10 粉红到红。快到终点时 pH 陡降，一滴就从红变无色。
//   不搅拌：刚滴下的盐酸先和液面那一层反应（液面那一层先褪色），慢慢才混开；搅拌混得快。
//   中和放热 57.3 kJ/mol → 1 mmol 约 57 J，溶液约 6 g → 升高约 2 ℃。
import * as THREE from 'three';
import { buttons, table } from './kit/ui.js';
import { draggable, clamp } from './kit/interact.js';
import { textPlate, canvasTex } from './kit/props.js';
import { Particles } from './kit/fx.js';
import { chemBeaker, glassMat, CHEM } from './kit/chem.js';
import { water2 } from './kit/chemfx.js';
import { microWorld, neutralScene } from './kit/microworld.js';
import { lessonBar } from './kit/lessonbar.js';
import { qaFlow, sandbox, wrapPointer, paperSheet, think, demoActs } from './kit/chemlesson.js';
import { sfx } from './kit/audio.js';
import { paint, inked } from '../live/ink.js';
import { h } from '../ui/Panel.js';

const OH0 = 1.0, DROP = 0.05, V0 = 5, TOP = 0.2;                 // mmol、mmol/滴、mL、液面那一层占的比例
const BK = new THREE.Vector3(-0.02, 0, 0), BR = 0.02, BH = 0.05;
const D_HOME = [new THREE.Vector3(-0.09, 0.006, 0.06), new THREE.Vector3(0.05, 0.006, 0.06)];
const ROD_HOME = new THREE.Vector3(-0.02, 0.004, 0.09);
const PINK = new THREE.Color(0xe0507a), CLEAR = new THREE.Color(0xe8eef2);
const pHof = (oh, h, V) => { const d = (oh - h) / (V / 1000) / 1000; if (Math.abs(d) < 1e-7) return 7; return d > 0 ? 14 + Math.log10(d) : -Math.log10(-d); };          // d：mol/L
const pinkOf = (pH, ind) => (ind ? clamp((pH - 8.2) / 1.8, 0, 1) : 0);

export default {
  id: 'neutral',
  fig: '图10-15',
  title: '中和反应',
  stampText: '实验',
  style: 'paper',
  predict: {
    q: '向滴了酚酞的稀氢氧化钠溶液（红色）里慢慢滴入稀盐酸，并不断搅拌——',
    hint: '课本第 74 页实验 10-10。酸和碱能不能反应？',
    options: ['红色慢慢变浅，到某一滴突然变成无色', '一直是红色', '马上变成蓝色'],
    answer: 0,
  },
  need: '在 5 mL 稀氢氧化钠溶液中滴入几滴酚酞溶液，再用滴管慢慢滴入稀盐酸，不断搅拌，至溶液颜色恰好变成无色为止',
  conclusion: {
    crops: [{ page: 78, rect: [18, 398, 245, 545] }],
    quote: '在上面的实验中，氢氧化钠与盐酸反应，生成了氯化钠和水。',
    formula: 'NaOH + HCl ══ NaCl + H₂O',
    why: '酚酞遇氢氧化钠溶液变红；滴入稀盐酸，氢氧化钠被反应掉，碱性减弱，红色变浅；当溶液颜色<b>恰好变成无色</b>时，氢氧化钠和盐酸恰好完全反应。快到这一点时 pH 变化很快，往往<b>一滴</b>就从红色变成无色，所以要慢慢滴、不断搅拌。<br>酸和碱作用生成盐和水的反应叫作<b>中和反应</b>，实质是 H⁺ 和 OH⁻ 结合成水（图 10-16）。中和反应放热，溶液温度略有升高。',
    src: '课本下册第 74–75 页 · 第十单元 课题2 常见的酸和碱的反应（实验 10-10）；中和热 57.3 kJ/mol',
  },

  create({ tag, look, back }) {
    const root = new THREE.Group(), group = new THREE.Group();
    root.add(group);
    let S = null, W = null;
    const status = (m) => { if (!S.demo) W?.status(m); else bar.caption(m); };
    const done = (id) => { if (!S.demo) bar.done(id); };
    const log = (row) => { if (!S.demo) W?.tbl.add(row); };

    paperSheet(group, { w: 0.24, d: 0.16, x: -0.02, z: 0.03 });

    // ================= 烧杯、液面那一层、玻璃棒 =================
    const LV = (mL) => (mL * 1e-6) / (Math.PI * (BR - 0.0012) ** 2);
    const bk = chemBeaker({ r: BR, h: BH, level: LV(V0), color: CHEM.water, marks: false }); bk.position.copy(BK); group.add(bk);
    bk.setColor(0xe8eef2);
    const topLayer = new THREE.Mesh(new THREE.CylinderGeometry(BR - 0.0014, BR - 0.0014, 1, 32), water2({ color: 0xe8eef2, base: 0.12, rim: 0.12 })); topLayer.renderOrder = 7.4; topLayer.position.set(BK.x, 0, BK.z); group.add(topLayer);        // 薄薄一层、很透：透过它看得见下面的红色
    const lab = textPlate('稀氢氧化钠溶液 5 mL', { w: 0.05, h: 0.0072, color: '#23293a', bg: '#fffaf0', font: 'bold 56px "Songti SC", serif' }); lab.position.set(BK.x, 0.006, BR + 0.0015); group.add(lab);
    const rod = inked(new THREE.Mesh(new THREE.CylinderGeometry(0.0014, 0.0014, 0.08, 10), paint(0xe8f2f6, { transparent: true, opacity: 0.85 })), { width: 0.5 });
    rod.geometry.translate(0, 0.04, 0); group.add(rod);
    const rodPick = new THREE.Mesh(new THREE.CylinderGeometry(0.007, 0.007, 0.08, 8), new THREE.MeshBasicMaterial({ visible: false })); rodPick.position.y = 0.04; rodPick.userData.pick = true; rod.add(rodPick);
    const ROD_REST = ROD_HOME.clone().add(new THREE.Vector3(-0.04, 0, 0)); rod.position.copy(ROD_REST); rod.rotation.z = Math.PI / 2;
    // 两支滴管：酚酞溶液、稀盐酸（滴管拖到杯口上方；按住就一滴一滴地滴）
    const NAMES = ['酚酞溶液', '稀盐酸'], INSIDE = [0xf2f2ee, 0xe4eef2];
    const droppers = NAMES.map((nm, i) => {
      const g = new THREE.Group(); group.add(g);
      const tube = new THREE.Mesh(new THREE.CylinderGeometry(0.0016, 0.0024, 0.042, 10), glassMat({ opacity: 0.35 })); tube.position.y = 0.021; tube.renderOrder = 9; g.add(tube);
      const inside = new THREE.Mesh(new THREE.CylinderGeometry(0.0012, 0.0018, 0.02, 8), paint(INSIDE[i], { keep: true })); inside.position.y = 0.012; g.add(inside);
      const bulb = inked(new THREE.Mesh(new THREE.SphereGeometry(0.0052, 12, 8), paint(0xc23a3a, { keep: true })), { width: 0.4 }); bulb.scale.y = 1.6; bulb.position.y = 0.048; g.add(bulb);
      const pick = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.06, 8), new THREE.MeshBasicMaterial({ visible: false })); pick.position.y = 0.03; pick.userData.pick = true; g.add(pick);
      const l = textPlate(nm, { w: 0.024, h: 0.0075, color: '#23293a', bg: '#fffaf0', font: 'bold 80px "Songti SC", serif' }); l.rotation.x = -Math.PI / 2; l.position.set(D_HOME[i].x - 0.03, 0.0004, D_HOME[i].z + 0.01); group.add(l);
      g.position.copy(D_HOME[i]); g.rotation.z = Math.PI / 2;
      return Object.assign(g, { pick });
    });
    const dropsP = new Particles({ max: 60, geometry: new THREE.SphereGeometry(1, 6, 5), material: water2({ color: 0xdfe8ee, base: 0.6 }) }); group.add(dropsP.mesh);
    // 卡片：pH、温度、pH 随滴数的曲线
    const card = tag('', 'cond'); card.px = [100, -60];
    const curve = canvasTex(320, 160, () => {});
    const curveCanvas = curve.image;

    // ================= 状态 =================
    // 微观次元：烧杯里的溶液中，H⁺ 和 OH⁻ 结合成水；Na⁺、Cl⁻ 一直留在溶液里
    const MW_AT = new THREE.Vector3(BK.x, BH + 0.006, BK.z);
    const mw = microWorld({ mode: 'holo', scene: neutralScene(), place: () => ({ pos: group.localToWorld(MW_AT.clone()), scale: 0.0085 * group.getWorldScale(new THREE.Vector3()).x, cam: window.__lb.stage.camera }) });
    const goBtn = tag('钻进溶液里看 ⊙', 'pill mw-go', () => openMicro());
    const mwState = () => ({ acid: (S.drops * DROP) / OH0, color: S.ind ? new THREE.Color(0x8fd0f0).lerp(new THREE.Color(0xff5c9a), pinkOf(pHbulk(), S.ind)).getHex() : 0x8fd0f0 });
    const openMicro = (demo = false) => {
      if (!demo) look([MW_AT.x, MW_AT.y + 0.05, MW_AT.z], [0.04, 0.25, 1], 0.3);
      const r = () => { const cam = window.__lb?.stage?.camera; if (!cam) return [innerWidth / 2, innerHeight * 0.8]; const v = group.localToWorld(MW_AT.clone()).project(cam); return [(v.x + 1) / 2 * innerWidth, (1 - v.y) / 2 * innerHeight]; };
      mw.open(r, mwState());
    };
    mw.onClose = () => { if (!bar.playing) back(); };

    const fresh = () => ({ demo: false, ind: 0, hTop: 0, hBulk: 0, ohTop: OH0 * TOP, ohBulk: OH0 * (1 - TOP), drops: 0, V: V0, T: 20, stir: 0, dCarry: [null, null], holding: -1, dripT: 0, rodCarry: null, lastRod: null, rodIn: false, hist: [], end: false, over: false, said: {} });
    S = fresh();
    const total = () => ({ oh: S.ohTop + S.ohBulk, hh: S.hTop + S.hBulk });
    const pHall = () => { const t = total(); return pHof(t.oh, t.hh, S.V); };
    const pHtop = () => pHof(S.ohTop, S.hTop, S.V * TOP);
    const pHbulk = () => pHof(S.ohBulk, S.hBulk, S.V * (1 - TOP));

    // ================= 操作 =================
    const A = {
      dDrag(i, p) { if (!p) return; S.dCarry[i] = p.clone(); S.holding = Math.hypot(p.x - BK.x, p.z - BK.z) < BR ? i : -1; },
      dDrop(i) { S.dCarry[i] = null; S.holding = -1; },
      drip(i) {
        S.V += DROP; sfx.clink({ freq: 2600, gain: 0.015 });
        dropsP.spawn({ p: BK.clone().add(new THREE.Vector3(0, BH + 0.01, 0)), v: new THREE.Vector3(0, -0.06, 0), size: 0.0013, life: 1 });
        if (i === 0) { S.ind = Math.min(5, S.ind + 1); if (S.ind === 3) { done('ind'); status('滴入了几滴酚酞溶液：溶液变成了<b>红色</b>（氢氧化钠溶液显碱性）。接着用滴管<b>慢慢</b>滴入稀盐酸，并用玻璃棒不断搅拌。'); } return; }
        if (!S.ind) return status('先滴几滴酚酞溶液。');
        S.drops++; S.hTop += DROP * 1.0;
        // 液面那一层马上反应（H⁺ + OH⁻ → H₂O），放热
        const r = Math.min(S.hTop, S.ohTop); S.hTop -= r; S.ohTop -= r; S.T += r * 57.3 / (S.V * 4.18);
        S.hist.push([S.drops, null]);
      },
      rodDrag(p) { if (!p) return; const last = S.lastRod; S.lastRod = p.clone(); S.rodCarry = p.clone(); S.rodIn = Math.hypot(p.x - BK.x, p.z - BK.z) < BR - 0.003 && p.y < 0.06; if (S.rodIn && last) S.stir = Math.min(1, S.stir + (Math.abs(p.x - last.x) + Math.abs(p.z - last.z)) * 50); },
      rodDrop() { S.rodCarry = null; S.lastRod = null; S.rodIn = false; },
      reset() { S = fresh(); dropsP.clear(); if (mw.isOpen) mw.reset(mwState()); W?.tbl.clear(); if (W) { W.t1.close(); W.t2.close(); W.next.hidden = true; } bar.undo('ind', 'acid', 'end', 'why'); status('全部重新摆好了，记录也清空了。'); },
    };
    const drag = draggable(group, [
      ...NAMES.map((nm, i) => ({ obj: droppers[i].pick, plane: 'xz', offset: BH + 0.02, hint: `${nm}：拖到烧杯口上方，按住不放——一滴一滴地滴`, onStart: (p) => A.dDrag(i, p), onDrag: (p) => A.dDrag(i, p), onEnd: () => A.dDrop(i) })),
      { obj: rodPick, plane: 'xz', offset: 0.03, hint: '玻璃棒：伸进烧杯里来回拖，不断搅拌', onStart: (p) => A.rodDrag(p), onDrag: (p) => A.rodDrag(p), onEnd: () => A.rodDrop() },
    ], { tip: tag('', 'pill') });
    const act = demoActs(drag, group);
    const overBk = () => new THREE.Vector3(BK.x, BH + 0.02, BK.z);
    const stirPts = (n) => [null, new THREE.Vector3(BK.x, 0.07, BK.z), ...Array.from({ length: n }, (_, j) => new THREE.Vector3(BK.x + (j % 2 ? 0.008 : -0.008), 0.03, BK.z + (j % 4 < 2 ? 0.007 : -0.007)))];

    const bar = lessonBar({
      look, back, group,
      steps: [
        { id: 'ind', title: '滴入酚酞', todo: '把<b>酚酞溶液</b>的滴管拖到烧杯口上方，按住，滴入几滴。', target: () => (S.dCarry[0] ? null : droppers[0]) },
        { id: 'acid', title: '慢慢滴入稀盐酸', todo: '把<b>稀盐酸</b>的滴管拖到烧杯口上方，按住慢慢滴；同时用<b>玻璃棒</b>不断搅拌。看颜色。', target: () => (S.dCarry[1] || S.rodCarry ? null : S.drops < 3 ? droppers[1] : rod) },
        { id: 'end', title: '恰好变成无色', todo: '溶液颜色<b>恰好</b>变成无色时停止滴加（松手）。', target: () => null },
        { id: 'why', title: '想一想', todo: '在左边作答。' },
      ],
      reels: {
        demo: {
          seal: '演示', label: '老师演示',
          ...sandbox({ get: () => S, set: (s) => { S = s; }, fresh, bar: () => bar, apply: () => { dropsP.clear(); mw.close(); } }),
          shots: [
            { cap: '烧杯里是 5 mL 稀氢氧化钠溶液，滴入几滴酚酞溶液：变红。', dur: 5, cam: [[BK.x, 0.04, 0], [0.04, 0.3, 1], 0.2],
              during: act.drag(droppers[0].pick, overBk, { t0: 0.05, t1: 0.3, release: 0.85, until: () => S.ind >= 3 }) },
            { cap: '用滴管慢慢滴入稀盐酸，并用玻璃棒不断搅拌：红色慢慢变浅。', dur: 6, speed: 1.5, cam: [[BK.x, 0.04, 0], [0.04, 0.3, 1], 0.2],
              during: act.seq(act.drag(droppers[1].pick, overBk, { t0: 0.1, t1: 0.4, release: 0.98 }), act.path(rodPick, stirPts(16), { t0: 0.12, t1: 0.98, release: 0.99 })) },
            { cap: '钻进溶液里看：滴进来的 H⁺ 碰上 OH⁻，结合成水；Na⁺ 和 Cl⁻ 一直留在溶液里。', dur: 16, cam: [[MW_AT.x, MW_AT.y + 0.05, MW_AT.z], [0.04, 0.25, 1], 0.3],
              during: act.seq(act.at(0.02, () => openMicro(true)), act.drag(droppers[1].pick, overBk, { t0: 0.04, t1: 0.15, release: 0.98, until: () => S.end }), act.path(rodPick, stirPts(40), { t0: 0.06, t1: 0.98, release: 0.99 })) },
            { cap: '某一滴下去，溶液恰好变成无色——氢氧化钠和盐酸恰好完全反应：NaOH + HCl ══ NaCl + H₂O。演示完了，下面换你自己做。', dur: 5, enter: () => mw.close(), cam: [[BK.x, 0.04, 0], [0.04, 0.3, 1], 0.22] },
          ],
        },
      },
    });
    const pointer = wrapPointer(drag, bar);

    let curveURL = '';
    const drawCurve = () => {
      const g = curveCanvas.getContext('2d'), Wc = 320, Hc = 160;
      g.fillStyle = '#fdfbf4'; g.fillRect(0, 0, Wc, Hc);
      const X = (n) => 30 + n / 30 * (Wc - 40), Y = (p) => Hc - 20 - p / 14 * (Hc - 30);
      g.strokeStyle = 'rgba(80,140,180,0.3)'; g.lineWidth = 1; for (const p of [7]) { g.setLineDash([4, 4]); g.beginPath(); g.moveTo(X(0), Y(p)); g.lineTo(X(30), Y(p)); g.stroke(); g.setLineDash([]); }
      g.strokeStyle = '#23293a'; g.lineWidth = 2; g.beginPath(); g.moveTo(X(0), Y(14)); g.lineTo(X(0), Y(0)); g.lineTo(X(30), Y(0)); g.stroke();
      g.fillStyle = '#23293a'; g.font = '16px sans-serif'; g.fillText('pH', 4, 18); g.fillText('7', 14, Y(7) + 5); g.fillText('滴数', Wc - 40, Hc - 4);
      g.strokeStyle = '#c23a52'; g.lineWidth = 2.5; g.beginPath();
      S.hist.forEach(([n, p], i) => { if (p == null) return; i ? g.lineTo(X(n), Y(p)) : g.moveTo(X(n), Y(p)); }); g.stroke();
      curve.needsUpdate = true; curveURL = curveCanvas.toDataURL();
    };

    // ================= 每帧 =================
    const step = (h) => {
      // 滴管
      droppers.forEach((d, i) => {
        if (S.dCarry[i]) { d.position.lerp(new THREE.Vector3(S.dCarry[i].x, BH + 0.008, S.dCarry[i].z), 0.4); d.rotation.z += (0 - d.rotation.z) * 0.3; }
        else { d.position.lerp(D_HOME[i], 0.25); d.rotation.z += (Math.PI / 2 - d.rotation.z) * 0.25; }
      });
      if (S.holding >= 0) { S.dripT += h; const per = S.holding === 0 ? 0.4 : 0.8; while (S.dripT > per) { S.dripT -= per; A.drip(S.holding); } } else S.dripT = 0.3;
      dropsP.update(h, (p, d) => { p.p.addScaledVector(p.v, d); return p.p.y > LV(S.V); });
      // 混合：搅拌时快，不搅拌慢（液面那一层和下面交换）
      S.stir = Math.max(0, S.stir - h * 1.2);
      const k = Math.min(1, (0.33 + 3 * S.stir) * h);          // 不搅拌时也会慢慢混开（几秒），搅拌快得多
      // 两层的浓度向整杯平均靠拢（时间常数：不搅拌约 3 秒，搅拌时零点几秒）
      for (const [t, bb] of [['ohTop', 'ohBulk'], ['hTop', 'hBulk']]) { const X = S[t] + S[bb], want = X * TOP; S[t] += (want - S[t]) * k; S[bb] = X - S[t]; }
      for (const pair of [['hTop', 'ohTop'], ['hBulk', 'ohBulk']]) { const r = Math.min(S[pair[0]], S[pair[1]]); S[pair[0]] -= r; S[pair[1]] -= r; S.T += r * 57.3 / (S.V * 4.18); }
      S.T = Math.max(20, S.T - (S.T - 20) * 0.002 * h);
      const pa = pHall(); if (S.hist.length && S.hist[S.hist.length - 1][1] == null) { S.hist[S.hist.length - 1][1] = pa; drawCurve(); }
      // 颜色
      const pb = pinkOf(pHbulk(), S.ind), pt = pinkOf(pHtop(), S.ind);
      bk.liq.material.color.copy(CLEAR).lerp(PINK, pb * Math.min(1, S.ind / 3));
      topLayer.material.color.copy(CLEAR).lerp(PINK, pt * Math.min(1, S.ind / 3));
      const lv = LV(S.V); bk.setLevel(lv * (1 - TOP)); topLayer.scale.y = lv * TOP; topLayer.position.y = 0.0012 + lv * (1 - TOP) + lv * TOP / 2;
      if (S.drops > 0 && pt < 0.2 && pb > 0.5 && !S.said.local && !S.demo) { S.said.local = true; status('液面那一层先变成了无色——可下面还是红的：要用玻璃棒<b>不断搅拌</b>，让盐酸和整杯溶液混匀。'); }
      if (S.drops > 0 && !bar.has('acid') && S.drops >= 2) done('acid');
      // 终点
      if (S.ind && S.drops > 0 && pb < 0.04 && pt < 0.04 && !S.end) {
        S.end = true; done('end');
        log(['5 mL 稀氢氧化钠溶液 + 酚酞', '红色', '溶液显碱性']);
        log([`慢慢滴入稀盐酸（第 ${S.drops} 滴），不断搅拌`, '颜色<b>恰好变成无色</b>', `恰好完全反应；pH ≈ ${pa.toFixed(1)}，温度升高约 ${(S.T - 20).toFixed(1)} ℃`]);
        status(`第 <b>${S.drops}</b> 滴下去，溶液<b>恰好变成无色</b>了——氢氧化钠和盐酸恰好完全反应。松手，停止滴加。`);
        W?.t1.open();
      }
      if (S.end && S.drops > S.endDrops + 2 && !S.over) { S.over = true; if (!S.demo) status('滴多了：盐酸过量，溶液已经呈<b>酸性</b>（pH 小于 7）——可酚酞在酸性溶液里也是无色，看不出来。所以要<b>慢慢</b>滴，颜色恰好消失就停。'); }
      if (S.end && S.endDrops == null) S.endDrops = S.drops;
      // 玻璃棒
      if (S.rodCarry) { rod.position.lerp(S.rodIn ? new THREE.Vector3(S.rodCarry.x, 0.003, S.rodCarry.z) : new THREE.Vector3(S.rodCarry.x, 0.025, S.rodCarry.z), 0.5); rod.rotation.z += (0.3 - rod.rotation.z) * 0.3; }
      else { rod.position.lerp(ROD_REST, 0.2); rod.rotation.z += (Math.PI / 2 - rod.rotation.z) * 0.2; }
      // 卡片
      card.text(`<div class="cc"><div class="cc-t"><span class="cc-name">烧杯里</span>${S.ind ? (pb > 0.1 ? '<span class="cc-res">红色</span>' : '<span class="cc-res">无色</span>') : ''}</div><div class="cc-more"><div class="cc-obs"><b>pH ${pa.toFixed(1)}</b><small>　${S.T.toFixed(1)} ℃　滴入稀盐酸 ${S.drops} 滴</small></div>${S.hist.length > 1 ? `<img src="${curveURL}" style="width:160px;height:80px;display:block;margin-top:4px">` : ''}</div></div>`)
        .loc(group, BK.x, BH, 0).show(true);
    };

    return {
      group: root,
      pointer,
      card: false,
      toggles: ['cards', 'steps'],
      size: { w: 0.2, d: 0.12, h: 0.1 },
      view: { elev: 24, azim: -4, lookY: 0.36, frameMargin: 1.12 },
      mount(ui) {
        ui.el.classList.add('xuean');
        const ctx = () => [...W.tbl.el.querySelectorAll('tbody tr')].map((tr) => `<div>${tr.children[0].innerHTML}：${tr.children[1].innerHTML}（${tr.children[2].innerHTML}）</div>`).join('');
        const t2 = think({ title: '想一想', ctx, status: (m) => ui.status(m),
          q: '酸和碱作用生成盐和水的反应叫中和反应。它的实质是——',
          options: ['酸里的 H⁺ 和碱里的 OH⁻ 结合成水（H₂O）', 'Na⁺ 和 Cl⁻ 结合成水', '没有发生反应，只是颜色变了'],
          wrong: ['看课本图 10-16：Na⁺ 和 Cl⁻ 反应前后都在溶液里。', '温度升高了、pH 从 13 降到 7——发生了化学变化。'],
          ok: '对：<b>H⁺ + OH⁻ → H₂O</b>（课本图 10-16）。可以掀开结论看看。',
          onOk: () => { next.hidden = false; done('why'); } });
        const t1 = think({ title: '想一想', ctx, status: (m) => ui.status(m),
          q: '为什么要<b>慢慢</b>滴入稀盐酸、不断搅拌，颜色<b>恰好</b>变成无色就停？',
          options: ['快到终点时一滴就让 pH 突变，滴快了、滴多了，盐酸过量，酚酞也是无色，看不出来', '滴快了会爆炸', '慢慢滴颜色更好看'],
          wrong: ['不会爆炸，但会滴过量。', '看卡片上的 pH 曲线：最后那一段几乎是竖的。'],
          ok: '对：颜色恰好消失，说明氢氧化钠和盐酸<b>恰好完全反应</b>。',
          onOk: () => t2.open() });
        const next = h('button', { class: 'go big-next', hidden: true, onclick: () => ui.go(2) }, '掀开课本上的结论 →');
        const tbl = table(['做了什么', '现象', '说明']);
        const more = h('details', { class: 'more' }, h('summary', {}, '更多'), buttons([{ text: '全部重来（清空记录）', ghost: true, onClick: () => A.reset() }]).el);
        const note = h('p', { class: 'fineprint', html: '说明：稀氢氧化钠溶液按约 0.2 mol/L、稀盐酸按约 1 mol/L、一滴按约 0.05 mL 计（约 20 滴恰好中和）；pH、温度由模型算出；酚酞在 pH 约 8.2 以下无色。' });
        ui.controls.append(t1.el, t2.el, next, more, note);
        ui.data.append(tbl.el);
        const dt = ui.data.previousElementSibling; if (dt?.classList.contains('bar-title')) dt.textContent = '观察记录';
        W = { tbl, t1, t2, next, status: (m) => ui.status(m) };
        bar.attach(ui);
        ui.status('图 10-15：烧杯里是 5 mL 稀氢氧化钠溶液（无色）；前面是酚酞溶液、稀盐酸两支滴管和一根玻璃棒。');
      },
      update(dt, t) {
        const k = bar.update(dt); step(Math.min(dt, 1 / 30) * k, t);
        mw.set(mwState()); mw.update(Math.min(dt, 1 / 30) * Math.min(k, 1.5));
        goBtn.loc(group, MW_AT.x, MW_AT.y + 0.016, MW_AT.z).show(!mw.isOpen && !bar.playing);
      },
      dispose() { mw.dispose(); bar.dispose(); dropsP.dispose(); },
      debug: { get S() { return S; }, A, bar, picks: { ph: droppers[0].pick, hcl: droppers[1].pick, rod: rodPick },
        qa: qaFlow(drag, [
          { name: '拿起酚酞', hold: droppers[0].pick },
          { name: '滴酚酞', run: () => A.dDrag(0, overBk()), wait: 1.6 },
          { name: '放下酚酞', release: droppers[0].pick, wait: 0.3 },
          { name: '拿起玻璃棒', hold: rodPick },
          { name: '拿起稀盐酸', hold: droppers[1].pick },
          { name: '滴稀盐酸', run: () => A.dDrag(1, overBk()), wait: 0.2 },
          ...Array.from({ length: 6 }, (_, j) => ({ name: `搅拌 ${j + 1}`, run: () => A.rodDrag(new THREE.Vector3(BK.x + (j % 2 ? 0.008 : -0.008), 0.03, BK.z + (j % 3 ? 0.006 : -0.006))), wait: 0.8 })),
          { name: '放下稀盐酸', release: droppers[1].pick, wait: 0.5 },
          { name: '放下玻璃棒', release: rodPick, wait: 0.5 },
          { name: '答第一题', run: () => W.t1.el.querySelector('button').click() },
          { name: '答第二题', run: () => W.t2.el.querySelector('button').click() },
        ]) },
    };
  },
};
