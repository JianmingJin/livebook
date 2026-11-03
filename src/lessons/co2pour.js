// 课题2 碳的氧化物 · 实验 6-3 倾倒二氧化碳（课本第 136 页图 6-10）。
//
// 烧杯里一个小阶梯，高低两支燃着的蜡烛。把一瓶二氧化碳沿烧杯壁慢慢倒进去——下面的蜡烛先熄灭，上面的后熄灭。
// 看不见的东西：二氧化碳 = 深灰点；空气 = 浅灰点（每 5 个里 1 个蓝点 = 氧气）。
// 模型（近似，界面上写明）：烧杯里的气体按高度分 22 层，每层记二氧化碳占的比例。
//   慢慢倒：二氧化碳沉到最下面、一层层往上堆（约 12% 一路和空气混合）；
//   一下子倒：大量空气被卷进来、一部分从杯口冲出去，进去的在整杯里混开。各层之间有扩散，杯口那一层慢慢跑掉。
//   烛芯所在那一层的氧气 = 21% ×（1 − 二氧化碳比例），低于约 16% 时蜡烛熄灭（近似）。
import * as THREE from 'three';
import { buttons, seg, table } from './kit/ui.js';
import { draggable, clamp, lerp, rayToLocal } from './kit/interact.js';
import { microLens } from './kit/lens.js';
import { canvasTex } from './kit/props.js';
import { Particles } from './kit/fx.js';
import { gasJar, chemBeaker, chemCandle } from './kit/chem.js';
import { smoke2 } from './kit/chemfx.js';
import { lessonBar } from './kit/lessonbar.js';
import { qaFlow, sandbox, wrapPointer, paperSheet, think, demoActs } from './kit/chemlesson.js';
import { paint, inked } from '../live/ink.js';
import { h } from '../ui/Panel.js';

const AIR_O2 = 0.21, O2_OUT = 0.16;
const DARK = 0x3d4350, LIGHT = 0xb9bec8, BLUE = 0x2f7fd8;
const BK = new THREE.Vector3(-0.045, 0, 0), BKR = 0.036, BKH = 0.088;           // 烧杯（约 330 mL）
const NL = 22, LAYER = BKH / NL;
const V_BK = Math.PI * (BKR - 0.0012) ** 2 * BKH * 1e6;                           // mL
const STEP = { x: BK.x + 0.014, w: 0.03, h: 0.022 };                              // 铁皮小阶梯（右半边）。照图 6-10：上面那支蜡烛的火焰约在杯高一半多一点
const C_H = 0.022;                                                                // 蜡烛高
const LOW = new THREE.Vector3(BK.x - 0.015, 0, 0), HIGH = new THREE.Vector3(STEP.x + 0.002, STEP.h, 0);
const WICK = [LOW.y + C_H + 0.006, HIGH.y + C_H + 0.006];
const JA_HOME = new THREE.Vector3(0.055, 0, 0), JAR_R = 0.03, JAR_H = 0.1;        // 一瓶二氧化碳（约 260 mL），盖着玻璃片
const V_JAR = Math.PI * JAR_R * JAR_R * JAR_H * 0.92 * 1e6;
const RIM = new THREE.Vector3(BK.x + BKR - 0.004, BKH + 0.004, 0);                // 瓶口靠在烧杯口的这里倒
const GRIP = 0.05;                                                                // 手抓在瓶身中间：瓶口在手上方 5 cm

export default {
  id: 'co2pour',
  fig: '图6-10',
  title: '倾倒二氧化碳',
  stampText: '实验',
  style: 'paper',
  predict: {
    q: '把一瓶二氧化碳沿烧杯壁慢慢倒进烧杯，杯里阶梯上一高一低两支蜡烛正燃着——会怎样？',
    hint: '课本第 136 页实验 6-3。想想二氧化碳比空气重还是轻。',
    options: ['下面的蜡烛先熄灭，上面的后熄灭', '上面的蜡烛先熄灭，下面的后熄灭', '两支同时熄灭', '都不会熄灭'],
    answer: 0,
  },
  need: '把一瓶二氧化碳沿烧杯壁慢慢倒进烧杯，看两支蜡烛哪支先熄灭',
  conclusion: {
    crops: [{ page: 142, rect: [180, 338, 456, 447] }],
    quote: '如图 6-10 所示，将二氧化碳气体慢慢倒入烧杯中，观察现象并分析。',
    why: '下面的蜡烛先熄灭，上面的后熄灭——二氧化碳的<b>密度比空气大</b>：倒进烧杯以后沉在底部，一层层往上堆，先淹没下面的蜡烛。蜡烛熄灭——二氧化碳<b>不能燃烧，也不支持燃烧</b>。<br>所以二氧化碳可以像水一样从一个容器“倒”进另一个容器；也因为这两条性质，二氧化碳可以用来<b>灭火</b>（课本第 138 页图 6-14）。',
    src: '课本第 136–138 页 · 第六单元 课题2 碳的氧化物（实验 6-3）',
  },

  create({ tag, look, back }) {
    const root = new THREE.Group(), group = new THREE.Group();
    root.add(group);
    let S = null, W = null;
    const status = (m) => { if (!S.demo) W?.status(m); };
    const done = (id) => { if (!S.demo) bar.done(id); };
    const log = (row) => { if (!S.demo) { W?.tbl.add(row); S.rows.push(row); } };

    paperSheet(group, { w: 0.3, d: 0.18, x: 0, z: 0.02 });

    // ================= 烧杯、阶梯、蜡烛、一瓶二氧化碳 =================
    const bk = chemBeaker({ r: BKR, h: BKH, level: 0, marks: false }); bk.position.copy(BK); group.add(bk);
    const stepBox = inked(new THREE.Mesh(new THREE.BoxGeometry(STEP.w, STEP.h, 0.034), paint(0xb7bcc4)), { width: 0.6 });
    stepBox.position.set(STEP.x, STEP.h / 2 + 0.0012, 0); group.add(stepBox);
    const cLow = chemCandle({ height: C_H, r: 0.0055 }); cLow.position.copy(LOW).add(new THREE.Vector3(0, 0.0012, 0)); group.add(cLow);
    const cHigh = chemCandle({ height: C_H, r: 0.0055 }); cHigh.position.copy(HIGH).add(new THREE.Vector3(0, 0.0012, 0)); group.add(cHigh);
    const smoke = smoke2({ max: 60, color: 0xd9dbe0, opacity: 0.5 }); group.add(smoke.mesh);
    const pourer = new THREE.Group(); group.add(pourer);           // 转轴在瓶口：倒的时候绕瓶口转
    const jarA = gasJar({ r: JAR_R, h: JAR_H }); jarA.position.y = -JAR_H; pourer.add(jarA); jarA.setWater(0);
    const jarPick = jarA.pick;
    pourer.position.copy(JA_HOME).add(new THREE.Vector3(0, JAR_H, 0));

    // ================= 气体小点 =================
    const dotTex = canvasTex(64, 64, (g, Wd) => { const gr = g.createRadialGradient(Wd / 2, Wd / 2, 0, Wd / 2, Wd / 2, Wd / 2); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.55, 'rgba(255,255,255,1)'); gr.addColorStop(0.75, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, Wd, Wd); });
    const darkP = new Particles({ max: 300, sprite: true, color: DARK }), lightP = new Particles({ max: 200, sprite: true, color: LIGHT }), blueP = new Particles({ max: 60, sprite: true, color: BLUE });
    for (const p of [darkP, lightP, blueP]) { p.mat.uniforms.map.value = dotTex; p.mesh.renderOrder = 10; group.add(p.mesh); }
    const rnd = (a, b) => a + Math.random() * (b - a);
    const blocked = (x, y, z) => (x > STEP.x - STEP.w / 2 - 0.002 && y < STEP.h + 0.003) || (Math.hypot(x - LOW.x, z) < 0.008 && y < LOW.y + C_H + 0.004) || (Math.hypot(x - HIGH.x, z) < 0.008 && y > STEP.h && y < HIGH.y + C_H + 0.004);
    const bkDots = [];
    while (bkDots.length < 90) {
      const u = Math.sqrt(Math.random()) * (BKR - 0.005), th = Math.random() * Math.PI * 2, y = rnd(0.003, BKH - 0.004);
      const x = BK.x + Math.cos(th) * u, z = Math.sin(th) * u;
      if (blocked(x, y, z)) continue;
      bkDots.push({ base: new THREE.Vector3(x, y, z), p: new THREE.Vector3(), rank: Math.random(), ph: Math.random() * 6, blue: bkDots.length % 5 === 0, size: 0.0034, alpha: 0.9 });
    }
    const jarDots = Array.from({ length: 46 }, (_, i) => ({ u: Math.sqrt(Math.random()) * 0.85, th: Math.random() * Math.PI * 2, y: rnd(0.05, 0.93), rank: Math.random(), ph: Math.random() * 6, blue: i % 5 === 0, p: new THREE.Vector3(), size: 0.0036, alpha: 0.92 }));
    const stream = [];

    // ================= 卡片 =================
    const bkCard = tag('', 'cond'); bkCard.px = [-150, -90];

    // ================= 状态 =================
    const fresh = () => ({
      demo: false, rows: [],
      layers: new Array(NL).fill(0), jarC: 1, jarA: 'home', carry: null, tilt: 0, plateOff: 0, fast: false, poured: 0,
      lit: [true, true], dim: [0, 0], outT: [0, 0], outAt: [0, 0], outOrder: [], pourLogged: false,
    });
    S = fresh();

    // ---- 倒的模型 ----
    const pourCO2 = (dv) => {
      const L = S.layers, Vl = V_BK / NL;
      if (S.fast) {
        // 一下子倒：气流把空气卷进来，一部分从杯口冲出去；进去的在整杯里混开
        const kept = dv * 0.45;
        for (let i = 0; i < NL; i++) L[i] = Math.min(1, L[i] + (kept / NL / Vl) * (1 - L[i]));
        return;
      }
      // 慢慢倒：大部分沉到最下面，从下往上堆；少量（约 12%）一路和空气混合
      let rest = dv * 0.88;
      const mix = dv * 0.12, top = Math.max(2, L.findIndex((c) => c < 0.5) + 2);
      for (let i = 0; i < Math.min(NL, top); i++) L[i] = Math.min(1, L[i] + (mix / top / Vl) * (1 - L[i]));
      for (let i = 0; i < NL && rest > 0; i++) { const room = (0.97 - L[i]) * Vl; if (room <= 0) continue; const take = Math.min(room, rest); L[i] += take / Vl; rest -= take; }
    };
    const relax = (h) => {
      const L = S.layers, D = 0.35 * h, nx = L.slice();
      for (let i = 0; i < NL; i++) { const a = L[Math.max(0, i - 1)], b = L[Math.min(NL - 1, i + 1)]; nx[i] = L[i] + D * (a + b - 2 * L[i]); }
      nx[NL - 1] -= nx[NL - 1] * 0.25 * h;           // 杯口那一层慢慢跑出去
      for (let i = 0; i < NL; i++) L[i] = clamp(nx[i], 0, 1);
    };
    const co2At = (y) => { const f = y / LAYER - 0.5, i = clamp(Math.floor(f), 0, NL - 1), j = clamp(i + 1, 0, NL - 1), k = clamp(f - i, 0, 1); return lerp(S.layers[i], S.layers[j], k); };

    // ================= 操作 =================
    const A = {
      jarDrag(p) { if (!p) return; if (S.jarA !== 'rim') S.jarA = 'carry'; S.carry = p.clone(); },
      jarDrop() { S.jarA = 'home'; S.carry = null; },
      reset() {
        S = fresh(); stream.length = 0; smoke.clear(); W?.tbl.clear();
        if (W) { W.t1.close(); W.t2.close(); W.next.hidden = true; W.fastSeg.set(0); }
        bar.undo('pour', 'watch', 'why');
        status('全部重新摆好了，记录也清空了。');
      },
    };

    // ================= 底部步骤栏 + 老师的演示 =================
    const drag = draggable(group, [
      { obj: jarPick, plane: 'xy', offset: 0, hint: () => (S.jarC < 0.05 ? '' : '拖到烧杯口，按住：慢慢倒进去'),
        onStart: (p) => A.jarDrag(p), onDrag: (p) => A.jarDrag(p), onEnd: () => A.jarDrop() },
    ], { tip: tag('', 'pill') });
    const act = demoActs(drag, group);          // 演示：走学生拖放的同一套处理，器材真的移过去
    const bar = lessonBar({
      look, back, group,
      steps: [
        { id: 'pour', title: '倾倒二氧化碳', todo: '把那瓶<b>二氧化碳</b>拖到烧杯口，按住不放：沿杯壁<b>慢慢</b>倒进去。', target: () => (S.jarA === 'home' ? jarA : null) },
        { id: 'watch', title: '看两支蜡烛', todo: '看两支蜡烛：<b>哪一支先熄灭</b>？瓶里的二氧化碳倒完了的话，“更多 → 全部重来”。' },
        { id: 'why', title: '想一想', todo: '为什么下面的蜡烛先熄灭？在左边作答。' },
      ],
      reels: {
        demo: {
          seal: '演示', label: '老师演示',
          ...sandbox({ get: () => S, set: (s) => { S = s; }, fresh, bar: () => bar, apply: () => { stream.length = 0; smoke.clear(); } }),
          shots: [
            { cap: '拿起盛满二氧化碳的集气瓶，移到烧杯口；移开玻璃片，沿烧杯壁慢慢倒进去。', dur: 7.5, speed: 1.3, cam: [[BK.x + 0.03, 0.07, 0], [0.12, 0.25, 1], 0.36],
              during: act.drag(jarPick, () => RIM.clone().add(new THREE.Vector3(0, -GRIP, 0)), { t0: 0.04, t1: 0.3, release: 0.97 }) },
            { cap: '二氧化碳沉到杯底，一层层往上堆：下面的蜡烛先熄灭，上面的后熄灭。', dur: 4.5, speed: 1.5, cam: [[BK.x, 0.05, 0], [0.12, 0.2, 1], 0.3] },
            { cap: '二氧化碳的密度比空气大；它不能燃烧，也不支持燃烧。演示完了，下面换你自己做。', dur: 3.5, cam: [[BK.x + 0.03, 0.06, 0], [0.12, 0.25, 1], 0.4] },
          ],
        },
      },
    });

    const pointer = wrapPointer(drag, bar);
    // 放大镜：鼠标指着烧杯里 / 那瓶二氧化碳里，看这个高度的分子（比例来自上面的分层模型）
    const air = (c) => ({ CO2: c, N2: (1 - c) * 0.79, O2: (1 - c) * 0.21 });
    const lens = microLens({ probe: (ray) => {
      const p = rayToLocal(ray, group, 'xy', 0); if (!p) return null;
      if (Math.abs(p.x - BK.x) < BKR - 0.002 && p.y > 0.002 && p.y < BKH) {
        const c = co2At(p.y), lo = Math.abs(p.y - WICK[0]) < 0.006, hi = Math.abs(p.y - WICK[1]) < 0.006;
        return { mix: air(c), note: lo ? '下面烛芯处' : hi ? '上面烛芯处' : p.y < 0.02 ? '杯底' : p.y > BKH - 0.015 ? '杯口' : '烧杯里' };
      }
      const q = jarA.worldToLocal(group.localToWorld(p.clone()));
      if (Math.hypot(q.x, q.z) < JAR_R - 0.002 && q.y > 0.002 && q.y < JAR_H - 0.004) return { mix: air(S.jarC), note: '集气瓶里' };
      return null;
    } });
    const pm = pointer.move; pointer.move = (r, e) => { lens.move(r, e); return pm(r, e); };

    // ================= 每帧 =================
    const tmp = new THREE.Vector3();
    const step = (h, t) => {
      const mouthOf = (p) => p.clone().add(new THREE.Vector3(0, GRIP, 0));
      if (S.jarA === 'carry' && S.carry && mouthOf(S.carry).distanceTo(RIM) < 0.04 && S.jarC > 0.02) S.jarA = 'rim';
      else if (S.jarA === 'rim' && S.carry && mouthOf(S.carry).distanceTo(RIM) > 0.06) S.jarA = 'carry';
      const want = S.jarA === 'rim' ? RIM.clone().add(new THREE.Vector3(0.006, 0.002, 0)) : S.jarA === 'carry' && S.carry ? mouthOf(S.carry) : JA_HOME.clone().add(new THREE.Vector3(0, JAR_H, 0));
      pourer.position.lerp(want, S.jarA === 'carry' ? 1 : 0.25);
      const tiltWant = S.jarA === 'rim' ? (S.fast ? 2.5 : 1.85) : 0;
      S.tilt += (tiltWant - S.tilt) * Math.min(1, h * (S.fast ? 6 : 2.2));
      pourer.rotation.z = S.tilt;
      // 玻璃片：倒的时候顺着瓶口滑开（不是凭空消失）
      if (S.tilt > 0.25) S.plateOff = Math.min(1, S.plateOff + h * 2.5);
      jarA.plate.position.x = S.plateOff * 0.05; jarA.plate.visible = S.plateOff < 1;
      if (S.tilt > 1.6 && S.jarC > 0) {
        // 瓶口低于瓶底以后，二氧化碳像水一样“流”出来：慢慢倒时约 3 秒倒完大半；一下子倒时快得多
        const q = (S.fast ? 1.6 : 0.42) * S.jarC * V_JAR * (S.tilt - 1.6) / (tiltWant - 1.6 || 1) * h;
        const dv = Math.min(q, S.jarC * V_JAR);
        S.jarC = Math.max(0, S.jarC - dv / V_JAR); S.poured += dv;
        pourCO2(dv);
        if (S.poured > 40) done('pour');
        if (Math.random() < h * (S.fast ? 60 : 26)) stream.push({ p: pourer.position.clone().add(new THREE.Vector3(rnd(-0.006, -0.002), -0.004, rnd(-0.008, 0.008))), v: new THREE.Vector3(S.fast ? -0.05 : -0.004, -0.02, 0), size: 0.0036, alpha: 0.9, age: 0 });
      } else if (S.plateOff >= 1 && S.jarC > 0 && S.tilt < 0.3) S.jarC = Math.max(0, S.jarC - h * 0.01);        // 拿掉玻璃片的瓶口朝上：慢慢有一点跑掉
      relax(h);
      // 蜡烛
      [cLow, cHigh].forEach((c, k) => {
        const o2 = AIR_O2 * (1 - co2At(WICK[k]));
        if (S.lit[k]) {
          S.dim[k] = clamp((AIR_O2 - o2) / (AIR_O2 - O2_OUT), 0, 1);
          if (o2 < O2_OUT) { S.outT[k] += h; if (S.outT[k] > 0.35) { S.lit[k] = false; S.outAt[k] = 2.2; S.outOrder.push(k); candleOut(k); } } else S.outT[k] = 0;
        }
        c.flame.setOn(S.lit[k]); c.flame.setSize(1 - 0.55 * S.dim[k]); c.flame.update(t + k * 1.3);
        if (S.outAt[k] > 0) S.outAt[k] -= h;
      });
      const wisp = S.outAt[0] > 0 ? 0 : S.outAt[1] > 0 ? 1 : -1;
      smoke.update(h, { rate: wisp >= 0 ? 10 : 0, origin: wisp >= 0 ? tmp.copy(wisp ? HIGH : LOW).add(new THREE.Vector3(0, C_H + 0.004, 0)) : null, spread: 0.002, up: 0.02, size: 0.005, life: 1.6 });
      if (S.jarA !== 'rim' && S.poured > 20 && !S.pourLogged) { S.pourLogged = true; if (S.lit[0] && S.lit[1]) status('两支蜡烛都还燃着：倒进去的二氧化碳还不够。瓶里还有的话，再拖到杯口倒一些。'); }

      // 气体小点
      const dark = [], light = [], blue = [];
      for (const d of bkDots) {
        d.p.copy(d.base); d.p.x += Math.sin(t * 0.6 + d.ph) * 0.0012; d.p.y += Math.cos(t * 0.5 + d.ph) * 0.0012;
        (d.rank < co2At(d.p.y) ? dark : d.blue ? blue : light).push(d);
      }
      pourer.updateMatrix();
      for (const d of jarDots) {
        const a = d.th + Math.sin(t * 0.4 + d.ph) * 0.12, rr = (JAR_R - 0.004) * d.u;
        d.p.set(Math.cos(a) * rr, -JAR_H + JAR_H * d.y, Math.sin(a) * rr).applyMatrix4(pourer.matrix);
        (d.rank < S.jarC ? dark : d.blue ? blue : light).push(d);
      }
      for (let i = stream.length - 1; i >= 0; i--) {
        const d = stream[i]; d.age += h; d.v.y -= 0.12 * h; d.p.addScaledVector(d.v, h);
        const floor = Math.max(0.004, (S.layers.findIndex((c) => c < 0.6) + 0.5) * LAYER);
        if (Math.hypot(d.p.x - BK.x, d.p.z) > BKR - 0.003) d.p.x = Math.min(d.p.x, BK.x + BKR - 0.003);
        if (d.p.y < floor || d.age > 3) stream.splice(i, 1); else dark.push(d);
      }
      darkP.list = dark; lightP.list = light; blueP.list = blue;
      for (const p of [darkP, lightP, blueP]) p.update(0, () => true);

      // 卡片
      const lo = Math.round(co2At(WICK[0]) * 100), hi = Math.round(co2At(WICK[1]) * 100);
      const row = (name, v, lit) => `<div class="cc-obs"><span style="min-width:4.5em">${name}</span><span class="o2-read"><i style="width:${v}%;background:#3d4350"></i></span><b style="color:#3d4350">${v}%</b>${lit ? '' : '<span class="cc-res">熄灭</span>'}</div>`;
      bkCard.text(`<div class="cc"><div class="cc-t"><span class="cc-name">烧杯里的二氧化碳</span><small>（模型）</small></div><div class="cc-more">${row('上面烛芯处', hi, S.lit[1])}${row('下面烛芯处', lo, S.lit[0])}</div></div>`)
        .loc(group, BK.x, BKH, 0).show(S.poured > 1);
    };
    const candleOut = (k) => {
      if (S.demo) return;
      if (S.outOrder.length === 1) { status(k === 0 ? '<b>下面的</b>蜡烛先熄灭了。再看上面那支。' : '<b>上面的</b>蜡烛先熄灭了——是不是倒得太快、二氧化碳冲到了上面？可以“全部重来”再慢慢倒一次。'); return; }
      if (S.fast && S.outAt[0] > 1.6 && S.outAt[1] > 1.6) {
        log(['一下子把二氧化碳倒进烧杯', '两支蜡烛<b>几乎同时</b>熄灭', '二氧化碳和卷进来的空气混在一起，看不出先后']);
        status('一下子倒进去：二氧化碳和卷进来的空气混在一起，两支蜡烛<b>几乎同时</b>熄灭，看不出二氧化碳沉在下面。课本要求<b>慢慢</b>倒。');
        return;
      }
      const lowFirst = S.outOrder[0] === 0, order = lowFirst ? '下面的蜡烛先熄灭，上面的后熄灭' : '上面的蜡烛先熄灭，下面的后熄灭';
      log(['把二氧化碳沿烧杯壁慢慢倒进烧杯', `<b>${order}</b>`, lowFirst ? '二氧化碳沉在下面，一层层往上堆' : '倒得太快，二氧化碳和空气混在一起冲上去了']);
      if (lowFirst && !S.fast) { done('pour'); done('watch'); status(`两支蜡烛都熄灭了：<b>${order}</b>。看看左边的问题。`); W?.t1.open(); }
    };

    return {
      group: root,
      pointer,
      card: false,
      toggles: ['cards', 'steps'],
      size: { w: 0.2, d: 0.12, h: 0.16 },
      view: { elev: 20, azim: -4, lookY: 0.4, frameMargin: 1.1 },
      mount(ui) {
        ui.el.classList.add('xuean');
        const ctx = () => S.rows.map((r) => `<div>${r[0]}：${r[1]}</div>`).join('');
        const t2 = think({
          title: '想一想', ctx, status: (m) => ui.status(m),
          q: '两支蜡烛都熄灭了，说明二氧化碳——',
          options: ['不能燃烧，也不支持燃烧', '能支持燃烧', '有毒，把火焰“毒”灭了'],
          wrong: ['如果它支持燃烧，蜡烛会烧得更旺。', '蜡烛熄灭不是因为“有毒”。看烛芯处：二氧化碳把氧气挤走了。'],
          ok: '对：二氧化碳<b>不能燃烧，也不支持燃烧</b>。所以它能用来灭火。可以掀开结论看看。',
          onOk: () => { next.hidden = false; done('why'); },
        });
        const t1 = think({
          title: '想一想', ctx, status: (m) => ui.status(m),
          q: '为什么<b>下面的</b>蜡烛先熄灭？',
          options: ['二氧化碳的密度比空气大，沉在杯底，一层层往上堆', '下面的蜡烛小，容易灭', '二氧化碳比空气轻，从上往下压'],
          wrong: ['两支蜡烛一样大。看杯里的深灰点（二氧化碳）先堆在哪里。', '看杯里的深灰点：二氧化碳是从杯底往上堆的。'],
          ok: '对：二氧化碳的<b>密度比空气大</b>，倒进去以后沉在下面，先淹没下面的蜡烛。',
          onOk: () => t2.open(),
        });
        const next = h('button', { class: 'go big-next', hidden: true, onclick: () => ui.go(2) }, '掀开课本上的结论 →');
        const tbl = table(['做了什么', '现象', '说明']);
        const fastSeg = seg('倒的速度', ['沿杯壁慢慢倒', '一下子倒进去'], (_, k) => { S.fast = !!k; });
        const vary = h('details', { class: 'more' }, h('summary', {}, '换个条件再试'),
          h('p', { class: 'fineprint', html: '一下子把二氧化碳倒进去，还看得出哪支先灭吗？（先“全部重来”，再选“一下子倒进去”。）' }), fastSeg.el);
        const more = h('details', { class: 'more' }, h('summary', {}, '更多'), buttons([{ text: '全部重来（清空记录）', ghost: true, onClick: () => A.reset() }]).el);
        const note = h('p', { class: 'fineprint', html: '说明：集气瓶按约 260 mL、烧杯按约 330 mL 计；烧杯里的气体按高度分 22 层估算（慢慢倒：二氧化碳沉到底、约 12% 和空气混合；一下子倒：卷进大量空气、一部分冲出杯口）；烛芯处的氧气低于约 16% 时蜡烛熄灭（近似）。' });
        ui.controls.append(t1.el, t2.el, next, vary, more, note);
        ui.data.append(tbl.el);
        const dt = ui.data.previousElementSibling; if (dt?.classList.contains('bar-title')) dt.textContent = '观察记录';
        W = { tbl, t1, t2, next, fastSeg, status: (m) => ui.status(m) };
        bar.attach(ui);
        ui.status('图 6-10：烧杯里一个小阶梯，高低两支蜡烛正燃着；右边是一瓶二氧化碳（盖着玻璃片）。可以先看<b>老师演示</b>，也可以直接动手。');
      },
      update(dt, t) { const k = bar.update(dt); step(Math.min(dt, 1 / 30) * k, t); lens.hide(bar.playing || S.jarA !== 'home'); lens.update(dt); },      // 拿着瓶子、放演示时不出放大镜
      dispose() { lens.dispose(); bar.dispose(); smoke.dispose(); darkP.dispose(); lightP.dispose(); blueP.dispose(); },
      debug: { get S() { return S; }, A, bar, lens, picks: { jar: jarPick },
        qa: qaFlow(drag, [
          { name: '拿起二氧化碳', hold: jarPick },
          { name: '拖到烧杯口倒', run: () => A.jarDrag(RIM.clone().add(new THREE.Vector3(0, -GRIP, 0))), wait: 9 },
          { name: '松手', release: jarPick, wait: 2 },
          { name: '答第一题', run: () => W.t1.el.querySelector('button').click() },
          { name: '答第二题', run: () => W.t2.el.querySelector('button').click() },
        ]) },
    };
  },
};
