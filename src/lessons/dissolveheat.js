// 课题1 溶液及其应用 · 实验 9-4 溶解时的吸热或放热现象（课本下册第 33 页）。
//
// 三个烧杯各 100 mL 水，各插一支温度计。先读水的温度；取 NaCl、NH₄NO₃、NaOH 固体各两药匙（按约 5 g 计），分别加入，
// 用玻璃棒搅拌至全部溶解，再读溶液的温度。
// 模型：溶解热（25 ℃）NaCl +3.9 kJ/mol、NH₄NO₃ +25.7 kJ/mol、NaOH −44.5 kJ/mol。5 g → ΔT ≈ −Q / (105 g × 4.18 J/(g·℃))：
//   NaCl 约 −0.8 ℃（几乎不变）、NH₄NO₃ 约 −3.7 ℃、NaOH 约 +12.7 ℃。温度跟着“溶解了多少”走；搅拌时溶得快（约 10 秒），不搅拌慢得多；
//   溶完以后温度慢慢回到室温（20 ℃，和空气换热，时间常数约 10 分钟，这里看不太出来）。
// 看不见的东西：热——放热时烧杯周围一圈橙色，吸热时一圈淡蓝。
import * as THREE from 'three';
import { buttons, table } from './kit/ui.js';
import { draggable, clamp } from './kit/interact.js';
import { textPlate, thermometer, canvasTex } from './kit/props.js';
import { Particles } from './kit/fx.js';
import { chemBeaker, CHEM } from './kit/chem.js';
import { glass2 } from './kit/chemfx.js';
import { lessonBar } from './kit/lessonbar.js';
import { qaFlow, sandbox, wrapPointer, paperSheet, think, demoActs } from './kit/chemlesson.js';
import { sfx } from './kit/audio.js';
import { paint, inked } from '../live/ink.js';
import { h } from '../ui/Panel.js';

const ROOM = 20, MASS = 5, WATER = 100;
const SOLUTES = [
  { key: 'NaCl', name: 'NaCl', cn: '氯化钠', M: 58.44, dH: 3.9, k: 0.25 },
  { key: 'NH4NO3', name: 'NH₄NO₃', cn: '硝酸铵', M: 80.04, dH: 25.7, k: 0.3 },
  { key: 'NaOH', name: 'NaOH', cn: '氢氧化钠', M: 40.0, dH: -44.5, k: 0.22 },
];
const dT = (s) => -(MASS / s.M) * s.dH * 1000 / ((WATER + MASS) * 4.18);       // 全部溶解后的温度变化（℃）
const XS = [-0.08, 0, 0.08], BR = 0.03, BH = 0.07, LEVEL = (WATER * 1e-6) / (Math.PI * (BR - 0.0012) ** 2);
const BOT_Z = -0.085, ROD_HOME = new THREE.Vector3(0.0, 0.004, 0.075);

export default {
  id: 'dissolveheat',
  fig: '实验9-4',
  title: '溶解时的吸热或放热现象',
  stampText: '实验',
  style: 'paper',
  predict: {
    q: '把氯化钠、硝酸铵、氢氧化钠分别溶解在水里，溶液的温度会怎样？',
    hint: '课本第 33 页实验 9-4。溶解时会不会吸热、放热？',
    options: ['氯化钠几乎不变，硝酸铵变冷，氢氧化钠变热', '三种都变热', '三种都不变', '氯化钠变热，另外两种变冷'],
    answer: 0,
  },
  need: '三个烧杯各 100 mL 水，先测水温；分别加入两药匙氯化钠、硝酸铵、氢氧化钠，搅拌至全部溶解，再测温度',
  conclusion: {
    crops: [{ page: 37, rect: [56, 50, 335, 325] }],
    quote: '物质在溶解形成溶液时，溶液的温度与加入溶质前溶剂的温度相比会发生改变，这说明物质在溶解过程中通常伴随着热量的变化。在溶解时，有些物质会出现吸热现象，有些物质则会出现放热现象。',
    why: '氯化钠溶解：温度<b>几乎不变</b>；硝酸铵溶解：温度<b>降低</b>（吸热）；氢氧化钠溶解：温度<b>升高</b>（放热）。<br>溶解时既有扩散（吸热）又有和水结合（放热），哪一个多，溶液就变冷或变热。生活里的“冰袋”就用硝酸铵这类溶解时吸热的物质。氢氧化钠有强烈的腐蚀性，使用时戴好护目镜。',
    src: '课本下册第 33 页 · 第九单元 课题1 溶液及其应用（实验 9-4）；溶解热数据：CRC Handbook（25 ℃，无限稀释）',
  },

  create({ tag, look, back }) {
    const root = new THREE.Group(), group = new THREE.Group();
    root.add(group);
    let S = null, W = null;
    const status = (m) => { if (!S.demo) W?.status(m); else bar.caption(m); };
    const done = (id) => { if (!S.demo) bar.done(id); };

    paperSheet(group, { w: 0.32, d: 0.2, x: 0, z: 0.0 });

    // ================= 三个烧杯、温度计、三瓶固体、玻璃棒 =================
    const beakers = XS.map((x, k) => {
      const b = chemBeaker({ r: BR, h: BH, level: LEVEL, color: CHEM.water, marks: true }); b.position.set(x, 0, 0); group.add(b);
      const th = thermometer({ min: 0, max: 50, length: 0.15 }); th.position.set(x - 0.014, 0.0125, -0.004); th.rotation.z = -0.12; group.add(th);        // 玻璃泡底离杯底留一点空
      th.children[1].material = paint(0xd8342a, { keep: true }); th.children[0].material = glass2({ base: 0.06, rim: 0.5, band: 0.5 }); th.children[0].renderOrder = 9;      // 纸本画风：玻璃管画成玻璃、玻璃泡保留红色（同燃烧那课）
      const thPick = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.15, 8), new THREE.MeshBasicMaterial({ visible: false })); thPick.position.y = 0.075; thPick.userData.pick = true; th.add(thPick);
      const lab = textPlate(SOLUTES[k].name, { w: 0.022, h: 0.0085, color: '#23293a', bg: '#fffaf0', font: 'bold 96px "Times New Roman", serif' }); lab.position.set(x, 0.012, BR + 0.0015); group.add(lab);
      // 一圈热（橙）/ 冷（淡蓝）
      const ring = new THREE.Mesh(new THREE.TorusGeometry(BR + 0.008, 0.006, 8, 48), new THREE.MeshBasicMaterial({ color: 0xff9a3c, transparent: true, opacity: 0, depthWrite: false }));
      ring.rotation.x = Math.PI / 2; ring.position.set(x, LEVEL * 0.5, 0); group.add(ring);
      // 杯底没溶的固体
      const heap = new THREE.Group(); heap.position.set(x, 0.0035, 0); group.add(heap);
      for (let i = 0; i < 26; i++) { const g = new THREE.Mesh(new THREE.DodecahedronGeometry(0.0018, 0), paint(0xf6f6f2)); g.position.set((Math.random() - 0.5) * 0.024, Math.random() * 0.002, (Math.random() - 0.5) * 0.024); heap.add(g); }
      heap.visible = false;
      return Object.assign(b, { th, thPick, ring, heap });
    });
    const bottles = SOLUTES.map((s, k) => {
      const g = new THREE.Group(); g.position.set(0.15, 0, -0.05 + k * 0.05); group.add(g);        // 三瓶固体排在烧杯右边（放在烧杯后面会被温度计挡住）
      const body = inked(new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.014, 0.036, 20), paint(0xeceef0)), { width: 0.6 }); body.position.y = 0.018; g.add(body);
      const cap = inked(new THREE.Mesh(new THREE.CylinderGeometry(0.0105, 0.0105, 0.008, 18), paint(0x3d4352)), { width: 0.5 }); cap.position.y = 0.04; g.add(cap);
      const lab = textPlate(s.name, { w: 0.02, h: 0.0085, color: '#23293a', bg: '#fffaf0', font: 'bold 92px "Times New Roman", serif' }); lab.position.set(0, 0.02, 0.0142); g.add(lab);
      const pick = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.048, 10), new THREE.MeshBasicMaterial({ visible: false })); pick.position.y = 0.024; pick.userData.pick = true; g.add(pick);
      g.home = g.position.clone(); g.pick = pick;
      return g;
    });
    const rod = inked(new THREE.Mesh(new THREE.CylinderGeometry(0.0018, 0.0018, 0.11, 10), paint(0xe8f2f6, { transparent: true, opacity: 0.85 })), { width: 0.5 });
    rod.geometry.translate(0, 0.055, 0); rod.rotation.z = Math.PI / 2; rod.position.copy(ROD_HOME).add(new THREE.Vector3(-0.055, 0, 0)); group.add(rod);
    const rodPick = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.11, 8), new THREE.MeshBasicMaterial({ visible: false })); rodPick.position.y = 0.055; rodPick.userData.pick = true; rod.add(rodPick);
    const grains = new Particles({ max: 90, geometry: new THREE.DodecahedronGeometry(1, 0), material: paint(0xf6f6f2) }); group.add(grains.mesh);
    const cards = XS.map(() => { const c = tag('', 'cond'); c.px = [0, -60]; return c; });

    // ================= 状态 =================
    const freshB = () => ({ added: false, undis: 0, dis: 0, T: ROOM, read0: null, read1: null, stir: 0 });
    const fresh = () => ({ demo: false, b: XS.map(freshB), carry: null, carryK: -1, tilt: 0, rodCarry: null, rodIn: -1, lastRod: null, rows: {} });
    S = fresh();

    // ================= 操作 =================
    const A = {
      bottleDrag(k, p) { if (!p) return; S.carryK = k; S.carry = p.clone(); },
      bottleDrop() { S.carry = null; },
      rodDrag(p) {
        if (!p) return;
        const last = S.lastRod; S.lastRod = p.clone(); S.rodCarry = p.clone();
        const k = XS.findIndex((x) => Math.abs(p.x - x) < BR - 0.004 && p.y < 0.1);
        S.rodIn = k;
        if (k >= 0 && last) S.b[k].stir = Math.min(1, S.b[k].stir + Math.abs(p.x - last.x) * 40 + Math.abs(p.z - last.z) * 40);
      },
      rodDrop() { S.rodCarry = null; S.rodIn = -1; S.lastRod = null; },
      read(k) {
        const B = S.b[k], T = B.T.toFixed(1);
        if (!B.added) {
          B.read0 = T; row(k);
          status(`${SOLUTES[k].cn}那杯：加入溶质前，水的温度 <b>${T} ℃</b>。`);
          if (S.b.every((x) => x.read0 != null)) { done('before'); status('三杯水都是 <b>20 ℃</b> 左右。把三瓶固体分别倒进对应的烧杯里（各两药匙）。'); }
        } else if (B.undis > 0.04) status(`${SOLUTES[k].cn}还没全部溶解（${Math.round(B.dis / (B.dis + B.undis) * 100)}%）——用玻璃棒搅拌。现在 ${T} ℃。`);
        else {
          B.read1 = T; row(k);
          status(`${SOLUTES[k].cn}全部溶解了：溶液的温度 <b>${T} ℃</b>（${(B.T - Number(B.read0 ?? ROOM)) >= 0 ? '升高' : '降低'} ${Math.abs(B.T - Number(B.read0 ?? ROOM)).toFixed(1)} ℃）。`);
          if (S.b.every((x) => x.read1 != null)) { done('after'); if (W && !S.demo) W.t1.open(); }
        }
      },
      reset() {
        S = fresh(); grains.clear(); W?.tbl.clear();
        if (W) { W.t1.close(); W.t2.close(); W.next.hidden = true; }
        bar.undo('before', 'add', 'stir', 'after', 'why');
        status('全部重新摆好了，记录也清空了。');
      },
    };
    // 记录表：每种溶质一行，先填加入前，溶解后再补
    const row = (k) => {
      if (S.demo || !W) return;
      const B = S.b[k], s = SOLUTES[k];
      const change = B.read1 != null ? (() => { const d = Number(B.read1) - Number(B.read0 ?? ROOM); return Math.abs(d) < 1 ? '几乎<b>不变</b>' : d < 0 ? `<b>降低</b> ${(-d).toFixed(1)} ℃（吸热）` : `<b>升高</b> ${d.toFixed(1)} ℃（放热）`; })() : '';
      const cells = [s.name, B.read0 ?? '', B.read1 ?? '', change];
      if (S.rows[k] == null) S.rows[k] = W.tbl.add(cells) - 1;
      else { const tr = W.tbl.el.querySelectorAll('tbody tr')[S.rows[k]]; cells.forEach((c, i) => { tr.children[i].innerHTML = c; }); }
    };

    const drag = draggable(group, [
      ...SOLUTES.map((s, k) => ({ obj: bottles[k].pick, plane: 'xy', offset: 0, hint: () => (S.b[k].added ? '' : `${s.cn}：拖到对应的烧杯上方，倒两药匙`), onStart: (p) => A.bottleDrag(k, p), onDrag: (p) => A.bottleDrag(k, p), onEnd: () => A.bottleDrop() })),
      { obj: rodPick, plane: 'xz', offset: 0.03, hint: '玻璃棒：伸进烧杯里，来回拖着搅拌', onStart: (p) => A.rodDrag(p), onDrag: (p) => A.rodDrag(p), onEnd: () => A.rodDrop() },
    ], { taps: beakers.map((b, k) => ({ obj: b.thPick, hint: '点一下：读温度', onTap: () => A.read(k) })), tip: tag('', 'pill') });
    const act = demoActs(drag, group);
    const over = (k) => () => new THREE.Vector3(XS[k] + 0.012, BH + 0.03, 0);
    const stirIn = (k) => () => new THREE.Vector3(XS[k], 0.03, 0.004);

    const bar = lessonBar({
      look, back, group,
      steps: [
        { id: 'before', title: '测水的温度', todo: '点一下三支<b>温度计</b>，读出加入溶质前水的温度。', target: () => beakers[S.b.findIndex((x) => x.read0 == null)]?.th || null },
        { id: 'add', title: '加入溶质', todo: '把三瓶固体分别拖到对应的烧杯上方，各倒<b>两药匙</b>。', target: () => (S.carry ? null : bottles[S.b.findIndex((x) => !x.added)] || null) },
        { id: 'stir', title: '搅拌至全部溶解', todo: '拿起<b>玻璃棒</b>，伸进烧杯里来回拖着搅拌，直到固体全部溶解。三杯都要搅。', target: () => (S.rodCarry ? null : rod) },
        { id: 'after', title: '测溶液的温度', todo: '全部溶解后，再点一下<b>温度计</b>读溶液的温度。', target: () => beakers[S.b.findIndex((x) => x.read1 == null)]?.th || null },
        { id: 'why', title: '想一想', todo: '哪种溶解吸热、哪种放热？在左边作答。' },
      ],
      reels: {
        demo: {
          seal: '演示', label: '老师演示',
          ...sandbox({ get: () => S, set: (s) => { S = s; }, fresh, bar: () => bar, apply: () => { grains.clear(); } }),
          shots: [
            { cap: '三个烧杯各 100 mL 水，先用温度计测水的温度：都是 20 ℃。', dur: 3.5, cam: [[0, 0.06, 0], [0.04, 0.3, 1], 0.36], during: act.seq(...[0, 1, 2].map((k) => act.tap(beakers[k].thPick, 0.2 + k * 0.25))) },
            { cap: '分别加入两药匙氯化钠、硝酸铵、氢氧化钠。', dur: 7, cam: [[0, 0.06, -0.02], [0.04, 0.35, 1], 0.38],
              during: act.seq(...[0, 1, 2].map((k) => act.path(bottles[k].pick, [null, new THREE.Vector3(0.15, 0.13, 0), new THREE.Vector3(XS[k] + 0.012, 0.13, 0), over(k)()], { t0: 0.03 + k * 0.32, t1: 0.03 + k * 0.32 + 0.14, release: 0.03 + k * 0.32 + 0.27 }))) },
            { cap: '用玻璃棒搅拌至固体全部溶解。', dur: 10, speed: 1.5, cam: [[0, 0.05, 0], [0.04, 0.35, 1], 0.34],
              during: act.seq(...[0, 1, 2].map((k) => act.path(rodPick, [null, new THREE.Vector3(XS[k], 0.09, 0.004), ...[0, 1, 2, 3, 4, 5, 6, 7].map((j) => new THREE.Vector3(XS[k] + (j % 2 ? 0.012 : -0.012), 0.03, 0.004 + (j % 4 < 2 ? 0.01 : -0.01)))], { t0: 0.02 + k * 0.33, t1: 0.02 + k * 0.33 + 0.28, release: 0.02 + k * 0.33 + 0.3 }))) },
            { cap: '再测温度：氯化钠几乎不变，硝酸铵降低（吸热），氢氧化钠升高（放热）。', dur: 4, cam: [[0, 0.06, 0], [0.04, 0.3, 1], 0.34], during: act.seq(...[0, 1, 2].map((k) => act.tap(beakers[k].thPick, 0.15 + k * 0.25))) },
            { cap: '溶解时，有的物质吸热，有的物质放热。演示完了，下面换你自己做。', dur: 3.5, cam: [[0, 0.06, 0], [0.04, 0.3, 1], 0.4] },
          ],
        },
      },
    });
    const pointer = wrapPointer(drag, bar);

    // ================= 每帧 =================
    const step = (h, t) => {
      // 倒固体：瓶口到了烧杯上方，倾斜，两药匙（约 5 g）落进去
      bottles.forEach((b, k) => {
        if (S.carry && S.carryK === k) {
          const tgt = S.carry.clone().add(new THREE.Vector3(0, -0.024, 0)), atK = XS.findIndex((x) => Math.abs(tgt.x - 0.012 - x) < BR && tgt.y > BH - 0.01);
          b.position.lerp(tgt, 0.45);
          const want = atK >= 0 && !S.b[atK].added ? 2.0 : 0;
          b.rotation.z += (want - b.rotation.z) * Math.min(1, h * 5);
          if (want && b.rotation.z > 1.6) {
            const B = S.b[atK]; B.added = true; B.undis = 1; B.which = k; done(S.b.every((x) => x.added) ? 'add' : '_');
            for (let i = 0; i < 26; i++) grains.spawn({ p: b.position.clone().add(new THREE.Vector3(-0.012 + (Math.random() - 0.5) * 0.004, 0.0, (Math.random() - 0.5) * 0.004)), v: new THREE.Vector3((Math.random() - 0.5) * 0.02, -0.02, (Math.random() - 0.5) * 0.02), size: 0.0016, life: 2, k: atK });
            sfx.clink({ freq: 2400, gain: 0.03 });
            status(atK === k ? `加入了两药匙${SOLUTES[k].cn}。用<b>玻璃棒</b>搅拌。` : `把${SOLUTES[k].cn}倒进了 ${SOLUTES[atK].name} 那杯……（标签不对了，可以“全部重来”。）`);
          }
        } else { b.position.lerp(b.home, 0.25); b.rotation.z *= 0.8; }
      });
      grains.update(h, (p, d) => { p.v.y -= 0.6 * d; p.p.addScaledVector(p.v, d); return p.p.y > 0.005; });
      // 玻璃棒
      if (S.rodCarry) {
        const k = S.rodIn, q = k >= 0 ? new THREE.Vector3(S.rodCarry.x, 0.004, S.rodCarry.z) : new THREE.Vector3(S.rodCarry.x, 0.02, S.rodCarry.z);
        rod.position.lerp(q, 0.5); rod.rotation.z += ((k >= 0 ? 0.25 : 0.3) - rod.rotation.z) * 0.3;
      } else { rod.position.lerp(ROD_HOME.clone().add(new THREE.Vector3(-0.055, 0, 0)), 0.2); rod.rotation.z += (Math.PI / 2 - rod.rotation.z) * 0.2; }
      // 溶解、温度
      S.b.forEach((B, k) => {
        const s = SOLUTES[B.which ?? k];
        B.stir = Math.max(0, B.stir - h * 1.2);
        if (B.undis > 0) { const r = (0.012 + s.k * B.stir) * B.undis; const d = Math.min(B.undis, r * h * 3); B.undis -= d; B.dis += d; }
        const target = ROOM + dT(s) * (B.added ? B.dis : 0);
        // 溶解放出 / 吸收的热马上变成温度（溶液混得很快）；同时极慢地和空气换热（这里几乎看不出）
        B.T = ROOM + dT(s) * B.dis - (B.relax || 0); B.relax = (B.relax || 0) + (B.T - ROOM) * h * 0.0015;
        void target;
        beakers[k].th.setTemp(B.T);
        beakers[k].heap.visible = B.undis > 0.02; beakers[k].heap.scale.setScalar(Math.max(0.2, Math.sqrt(B.undis)));
        const d = B.T - ROOM, ring = beakers[k].ring;
        ring.material.color.setHex(d >= 0 ? 0xff9a3c : 0x8fd0ff); ring.material.opacity = Math.min(0.55, Math.abs(d) / 12 * 0.6);
        if (B.added && B.undis <= 0.04 && !B.dissolvedSaid && !S.demo) { B.dissolvedSaid = true; status(`${SOLUTES[k].cn}全部溶解了。点一下温度计，读溶液的温度。`); if (S.b.every((x) => !x.added || x.undis <= 0.04) && S.b.every((x) => x.added)) done('stir'); }
        cards[k].text(`<div class="cc"><div class="cc-t"><span class="cc-name">${SOLUTES[k].name}</span>${Math.abs(d) > 1 ? `<span class="cc-res${d > 0 ? ' burn' : ''}">${d > 0 ? '变热' : '变冷'}</span>` : ''}</div><div class="cc-more"><div class="cc-obs"><b style="font-size:1.2em">${B.T.toFixed(1)} ℃</b><small>${B.added ? (B.undis > 0.04 ? `溶解了 ${Math.round(B.dis * 100)}%` : '全部溶解') : '水'}</small></div></div></div>`)
          .loc(group, XS[k], BH + 0.01, 0).show(true);
      });
    };

    return {
      group: root,
      pointer,
      card: false,
      toggles: ['cards', 'steps'],
      size: { w: 0.26, d: 0.18, h: 0.16 },
      view: { elev: 22, azim: -4, lookY: 0.4, frameMargin: 1.06 },
      mount(ui) {
        ui.el.classList.add('xuean');
        const ctx = () => [...W.tbl.el.querySelectorAll('tbody tr')].map((tr) => `<div>${tr.children[0].innerHTML}：${tr.children[1].innerHTML} ℃ → ${tr.children[2].innerHTML} ℃，${tr.children[3].innerHTML}</div>`).join('');
        const t2 = think({ title: '想一想', ctx, status: (m) => ui.status(m),
          q: '要做一个“一拍就冷”的冰袋，袋里装水和哪种固体？',
          options: ['硝酸铵（溶解时吸热）', '氢氧化钠', '氯化钠'],
          wrong: ['氢氧化钠溶解时放热，而且有强烈的腐蚀性。', '氯化钠溶解时温度几乎不变。'],
          ok: '对：硝酸铵溶解时<b>吸热</b>，溶液温度降低。可以掀开结论看看。',
          onOk: () => { next.hidden = false; done('why'); } });
        const t1 = think({ title: '想一想', ctx, status: (m) => ui.status(m),
          q: '由测得的温度，你能得出什么结论？',
          options: ['氯化钠溶解时温度几乎不变，硝酸铵溶解时吸热，氢氧化钠溶解时放热', '三种物质溶解时都放热', '物质溶解时温度都不变'],
          wrong: ['看记录：硝酸铵那杯温度怎样变的？', '看记录：氢氧化钠那杯升高了十几度。'],
          ok: '对：物质溶解时通常伴随着热量的变化——有的<b>吸热</b>，有的<b>放热</b>。',
          onOk: () => t2.open() });
        const next = h('button', { class: 'go big-next', hidden: true, onclick: () => ui.go(2) }, '掀开课本上的结论 →');
        const tbl = table(['溶质', '加入前/℃', '溶解后/℃', '温度变化']);
        const more = h('details', { class: 'more' }, h('summary', {}, '更多'), buttons([{ text: '全部重来（清空记录）', ghost: true, onClick: () => A.reset() }]).el);
        const note = h('p', { class: 'fineprint', html: '说明：两药匙按约 5 g 计；温度由溶解热算出（NaCl +3.9、NH₄NO₃ +25.7、NaOH −44.5 kJ/mol）；不计烧杯吸热和散热，真实测得的变化会小一些。<b>氢氧化钠有强烈的腐蚀性</b>，使用时戴好护目镜。' });
        ui.controls.append(t1.el, t2.el, next, more, note);
        ui.data.append(tbl.el);
        const dt = ui.data.previousElementSibling; if (dt?.classList.contains('bar-title')) dt.textContent = '观察记录';
        W = { tbl, t1, t2, next, status: (m) => ui.status(m) };
        bar.attach(ui);
        ui.status('实验 9-4：三个烧杯各 100 mL 水，各插一支温度计；右边是 NaCl、NH₄NO₃、NaOH 三瓶固体，前面一根玻璃棒。先点温度计读水温。');
      },
      update(dt, t) { const k = bar.update(dt); step(Math.min(dt, 1 / 30) * k, t); },
      dispose() { bar.dispose(); grains.dispose(); },
      debug: { get S() { return S; }, A, bar, picks: { rod: rodPick, b0: bottles[0].pick, th0: beakers[0].thPick },
        qa: qaFlow(drag, [
          ...[0, 1, 2].map((k) => ({ name: `读水温 ${k + 1}`, tap: beakers[k].thPick, wait: 0.2 })),
          ...[0, 1, 2].flatMap((k) => [{ name: `拿起固体 ${k + 1}`, hold: bottles[k].pick }, { name: `倒进烧杯 ${k + 1}`, run: () => A.bottleDrag(k, over(k)()), wait: 1 }, { name: `放下 ${k + 1}`, release: bottles[k].pick, wait: 0.3 }]),
          ...[0, 1, 2].flatMap((k) => [{ name: `拿起玻璃棒 ${k + 1}`, hold: rodPick }, ...[0, 1, 2, 3, 4, 5].map((j) => ({ name: `搅拌 ${k + 1}-${j + 1}`, run: () => A.rodDrag(new THREE.Vector3(XS[k] + (j % 2 ? 0.012 : -0.012), 0.03, j % 3 ? 0.008 : -0.008)), wait: 0.4 })), { name: `放下玻璃棒 ${k + 1}`, release: rodPick, wait: 0.3 }]),
          { name: '等溶完', run: () => {}, wait: 3 },
          ...[0, 1, 2].map((k) => ({ name: `读溶液温度 ${k + 1}`, tap: beakers[k].thPick, wait: 0.2 })),
          { name: '答第一题', run: () => W.t1.el.querySelector('button').click() },
          { name: '答第二题', run: () => W.t2.el.querySelector('button').click() },
        ]) },
    };
  },
};
