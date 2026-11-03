// 课题2 水的组成（课本第 92–93 页「探究」、图 4-17；实验活动 2 在第 107 页）：电解水。
// 直接动手：把硫酸钠溶液拖到电解器上面的漏斗里；点电源开关通电 / 断电；从两根玻璃管的刻度上读气体体积并记录；
//   断电后把燃着的木条拖到玻璃管尖嘴，点活塞放出气体检验。
// 化学：2H₂O 通电→ 2H₂↑ + O₂↑。法拉第定律：每 2 mol 电子生成 1 mol H₂，每 4 mol 电子生成 1 mol O₂。
//   同温同压下体积比等于物质的量之比，所以负极（H₂）∶正极（O₂）= 2∶1。
//   实际测量时正极的氧气略少：氧气比氢气更易溶于水（室温下 1 L 水约溶 30 mL O₂、约 18 mL H₂），刚开始比值会大于 2。
// 纯水几乎不导电：不加硫酸钠时电流只有约千分之一。实际电解要十几分钟，这里时间加快 10 倍（界面上标明）。
import * as THREE from 'three';
import { buttons, goals, readout, seg, table, guard } from './kit/ui.js';
import { draggable, clamp } from './kit/interact.js';
import { stand, canvasTex } from './kit/props.js';
import { Particles } from './kit/fx.js';
import { glassMat, splint, CHEM } from './kit/chem.js';
import { bubble2, water2, flame2, molecules } from './kit/chemfx.js';
import { paint, inked, hull, glassEdge } from '../live/ink.js';
import { h } from '../ui/Panel.js';

const F = 96485, VM = 24.5;          // 法拉第常数；室温下气体摩尔体积 L/mol
const SPEED = 10;                    // 时间加快倍数
const R_IN = 0.0065;                 // 玻璃管内半径（m）
const ML_LEN = 1e-6 / (Math.PI * R_IN * R_IN);   // 1 mL 对应的管长（m），约 7.5 mm
const TUBE_H = 0.2, MAX_ML = 22;
const X = { neg: -0.04, pos: 0.04 }; // 两根玻璃管的位置：左边接负极，右边接正极（和图 4-17 的接线一样，正负极在电源上标明）
const BASE_Y = 0.05;                 // 玻璃管底（电极所在处）的高度
const DISSOLVE = { pos: 0.6, neg: 0.35 };  // 先溶进管里水中的气体（mL）：氧气多一些（约 30 mL 水按室温溶解度估算，电极附近未必饱和，取一半多）

export default {
  id: 'electrolysis',
  fig: '图4-17',
  title: '水的组成：电解水',
  stampText: '探究',
  predict: {
    q: '在电解器里加满水（加了少量硫酸钠），接通直流电源。<br>两根玻璃管里产生气体的体积会怎样？',
    hint: '课本第 92 页「探究」',
    options: ['两边一样多', '与负极相连的那边多，大约是另一边的 2 倍', '与正极相连的那边多，大约是另一边的 2 倍'],
    answer: 1,
  },
  need: '通电产生气体，自己读两根管里的气体体积并记录，比较体积比，再分别检验两种气体',
  conclusion: {
    crops: [{ page: 100, rect: [40, 544, 452, 596] }],
    quote: '水是由氢元素和氧元素组成的。在通电条件下水可以发生分解反应。',
    formula: '水 <span style="font-size:.8em">通电</span>→ 氢气 + 氧气',
    why: '与电源负极相连的管里是<b>氢气</b>（能燃烧，火焰淡蓝色），与正极相连的管里是<b>氧气</b>（使燃着的木条燃烧更旺）；氢气的体积约是氧气的 <b>2 倍</b>。氢气由氢元素组成，氧气由氧元素组成，化学反应前后元素的种类不变，所以水由<b>氢、氧两种元素</b>组成。<br>注意：体积比约 2∶1，<b>质量比</b>却是 1∶8（每个水分子里 2 个氢原子、1 个氧原子，氧原子比氢原子重得多）。实际测得的体积比常常略大于 2，是因为氧气比氢气更易溶于水。',
    src: '课本第 92–94 页 · 第四单元 课题2 水的组成；实验活动2（第 107 页）',
  },

  create({ tag, look, back }) {
    const root = new THREE.Group(), group = new THREE.Group();
    root.add(group);
    const near = (v, d = [0.1, 0.25, 1], dist = 0.3) => { S.near = true; look([v.x, v.y, v.z], d, dist, () => { S.near = false; }); if (W) W.nearBtn.textContent = '↩ 回到整套装置'; };
    const far = () => { if (S.near) { S.near = false; back(); } if (W) W.nearBtn.textContent = '凑近读刻度'; };

    // ---------------- 铁架台 + 电解器（霍夫曼式） ----------------
    // 铁架台放在右后方、转过来：横杆朝左伸向电解器
    const st = stand({ height: 0.36, baseW: 0.16, baseD: 0.09 });
    st.position.set(0.17, 0, -0.03); st.rotation.y = Math.PI;
    st.clamp(BASE_Y + 0.11, 0.17);
    st.clamp(BASE_Y + 0.237, 0.2);
    group.add(st);
    const glass = glassMat({ opacity: 0.16 });
    const mkTube = (x) => {
      const g = new THREE.Group();
      const body = new THREE.Mesh(new THREE.CylinderGeometry(R_IN + 0.0011, R_IN + 0.0011, TUBE_H, 24, 1, true), glass);
      body.position.y = BASE_Y + TUBE_H / 2; body.renderOrder = 9; glassEdge(body, 0.0006);
      const top = new THREE.Mesh(new THREE.ConeGeometry(R_IN + 0.0011, 0.018, 24, 1, true), glass);
      top.position.y = BASE_Y + TUBE_H + 0.009; top.renderOrder = 9;
      const tip = new THREE.Mesh(new THREE.CylinderGeometry(0.0013, 0.0016, 0.02, 10), glass);
      tip.position.y = BASE_Y + TUBE_H + 0.03; tip.renderOrder = 9;
      // 活塞（横着的小把手，开 = 竖直）
      const cock = new THREE.Group(); cock.position.y = BASE_Y + TUBE_H + 0.022;
      const knob = inked(new THREE.Mesh(new THREE.BoxGeometry(0.018, 0.004, 0.004), paint(0xe9edf0)), { width: 0.8 });
      cock.add(knob);
      const cockPick = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.02, 0.02), new THREE.MeshBasicMaterial({ visible: false })); cockPick.userData.pick = true; cock.add(cockPick);
      // 管里的水（上面是气体）
      const water = new THREE.Mesh(new THREE.CylinderGeometry(R_IN - 0.0003, R_IN - 0.0003, 1, 20), water2({ color: CHEM.water }));
      water.geometry.translate(0, 0.5, 0); water.position.y = BASE_Y; water.renderOrder = 7;
      // 电极（铂片）
      const el = inked(new THREE.Mesh(new THREE.BoxGeometry(0.004, 0.018, 0.0012), paint(0xc9ccd2)), { width: 0.6 });
      el.position.y = BASE_Y + 0.012;
      // 刻度：从管顶往下 0–22 mL
      const scale = new THREE.Mesh(new THREE.PlaneGeometry(0.014, MAX_ML * ML_LEN + 0.006), new THREE.MeshBasicMaterial({ transparent: true, depthWrite: false, map: canvasTex(64, 760, (c, w, hh) => {
        c.clearRect(0, 0, w, hh); c.fillStyle = '#243049'; c.font = 'bold 22px sans-serif'; c.textAlign = 'left';
        const top0 = 8, per = (hh - 16) / MAX_ML;
        for (let m = 0; m <= MAX_ML * 2; m++) {
          const y = top0 + (m / 2) * per, big = m % 10 === 0, mid = m % 2 === 0;
          c.fillRect(0, y - 1.2, big ? 30 : mid ? 20 : 11, 2.4);
          if (big) c.fillText(String(m / 2), 34, y + 8);
        }
      }) }));
      scale.position.set(R_IN + 0.0085, BASE_Y + TUBE_H - (MAX_ML * ML_LEN) / 2 - 0.001, 0.0); scale.renderOrder = 11;
      g.add(body, top, tip, cock, water, el, scale);
      g.position.x = x;
      Object.assign(g, { water, cock, knob, cockPick, tipY: BASE_Y + TUBE_H + 0.04, ruler: scale });
      return g;
    };
    const tubes = { neg: mkTube(X.neg), pos: mkTube(X.pos) };
    group.add(tubes.neg, tubes.pos);
    // 底部的连通管和中间的长颈漏斗（储水）
    const bottom = new THREE.Mesh(new THREE.CylinderGeometry(0.0045, 0.0045, X.pos - X.neg, 14), glass);
    bottom.rotation.z = Math.PI / 2; bottom.position.y = BASE_Y - 0.004; bottom.renderOrder = 9; glassEdge(bottom, 0.0005);
    const mid = new THREE.Mesh(new THREE.CylinderGeometry(0.0035, 0.0035, 0.24, 12), glass);
    mid.position.set(0, BASE_Y + 0.115, 0); mid.renderOrder = 9;
    const bulbPts = [new THREE.Vector2(0.0036, 0), new THREE.Vector2(0.006, 0.006), new THREE.Vector2(0.022, 0.02), new THREE.Vector2(0.024, 0.032), new THREE.Vector2(0.025, 0.034)];
    const bulb = new THREE.Mesh(new THREE.LatheGeometry(bulbPts, 28), glass);
    bulb.position.set(0, BASE_Y + 0.235, 0); bulb.renderOrder = 9; glassEdge(bulb, 0.0006);
    const bulbWater = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.006, 1, 24), water2({ color: CHEM.water }));
    bulbWater.geometry.translate(0, 0.5, 0); bulbWater.position.set(0, BASE_Y + 0.238, 0); bulbWater.renderOrder = 7;
    const midWater = new THREE.Mesh(new THREE.CylinderGeometry(0.003, 0.003, 0.24, 10), water2({ color: CHEM.water }));
    midWater.position.copy(mid.position);
    const bulbPick = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.05, 10), new THREE.MeshBasicMaterial({ visible: false }));
    bulbPick.position.set(0, BASE_Y + 0.255, 0); bulbPick.userData.pick = true;
    const ring = hull(new THREE.Mesh(new THREE.TorusGeometry(0.026, 0.0025, 8, 28), paint(0x3d4352)), 0.0008);
    ring.rotation.x = Math.PI / 2; ring.position.set(0, BASE_Y + 0.237, 0);
    group.add(bottom, mid, midWater, bulb, bulbWater, bulbPick, ring);
    // 夹子
    const holder = inked(new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.012, 0.012), paint(0x9aa3b2)), { width: 0.8 });
    holder.position.set(0, BASE_Y + 0.11, -0.012); group.add(holder);
    const holderArm = inked(new THREE.Mesh(new THREE.BoxGeometry(0.006, 0.006, 0.03), paint(0x8a929e)), { width: 0.8 });
    holderArm.position.set(0.055, BASE_Y + 0.11, -0.024); group.add(holderArm);

    // ---------------- 直流电源、导线 ----------------
    const box = new THREE.Group(); box.position.set(-0.19, 0, 0.01);
    const shell = inked(new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.065, 0.075), paint(0x2c3140)), { width: 1 });
    shell.position.y = 0.0325; box.add(shell);
    const face = new THREE.Mesh(new THREE.PlaneGeometry(0.094, 0.058), new THREE.MeshBasicMaterial({ map: canvasTex(320, 200, (c, w, hh) => {
      c.fillStyle = '#2c3140'; c.fillRect(0, 0, w, hh);
      c.fillStyle = '#e8ecf2'; c.font = 'bold 22px sans-serif'; c.fillText('学生电源', 14, 30);
      c.font = '18px sans-serif'; c.fillText('直流', 230, 30);
      c.fillStyle = '#d8402e'; c.beginPath(); c.arc(230, 160, 16, 0, 7); c.fill(); c.fillStyle = '#fff'; c.font = 'bold 26px sans-serif'; c.fillText('+', 221, 169);
      c.fillStyle = '#1b1e26'; c.beginPath(); c.arc(285, 160, 16, 0, 7); c.fill(); c.strokeStyle = '#999'; c.stroke(); c.fillStyle = '#fff'; c.fillText('−', 277, 168);
    }) }));
    face.position.set(0, 0.0325, 0.0376); box.add(face);
    const sw = inked(new THREE.Mesh(new THREE.BoxGeometry(0.018, 0.012, 0.008), paint(0xd9dde3, { unique: true })), { width: 0.8 });
    sw.position.set(-0.03, 0.022, 0.04); box.add(sw);
    const led = new THREE.Mesh(new THREE.SphereGeometry(0.0028, 10, 8), new THREE.MeshBasicMaterial({ color: 0x3a1a1a }));
    led.position.set(-0.008, 0.024, 0.039); box.add(led);
    const swPick = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.07, 0.08), new THREE.MeshBasicMaterial({ visible: false })); swPick.position.y = 0.0325; swPick.userData.pick = true; box.add(swPick);
    group.add(box);
    const wire = (from, to, color) => { const c = new THREE.CatmullRomCurve3([from, from.clone().add(new THREE.Vector3(0.02, -0.02, 0.03)), to.clone().add(new THREE.Vector3(-0.02, -0.03, 0.03)), to]); return hull(new THREE.Mesh(new THREE.TubeGeometry(c, 40, 0.0017, 6), paint(color)), 0.0006); };
    const termPos = new THREE.Vector3(-0.19 + 0.022, 0.012, 0.05), termNeg = new THREE.Vector3(-0.19 + 0.04, 0.012, 0.05);
    group.add(wire(termNeg, new THREE.Vector3(X.neg, BASE_Y - 0.008, 0.004), 0x1b1e26), wire(termPos, new THREE.Vector3(X.pos, BASE_Y - 0.01, 0.006), 0xc8341f));
    const clipN = inked(new THREE.Mesh(new THREE.BoxGeometry(0.008, 0.008, 0.008), paint(0x1b1e26)), { width: 0.6 }); clipN.position.set(X.neg, BASE_Y - 0.008, 0.004);
    const clipP = inked(new THREE.Mesh(new THREE.BoxGeometry(0.008, 0.008, 0.008), paint(0xc8341f)), { width: 0.6 }); clipP.position.set(X.pos, BASE_Y - 0.01, 0.006);
    group.add(clipN, clipP);

    // ---------------- 桌上：硫酸钠溶液、木条 ----------------
    const dropper = new THREE.Group();
    const dbody = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.04, 18), glassMat({ opacity: 0.25, color: 0xa9774f })); dbody.position.y = 0.02; dbody.renderOrder = 8;
    const dliq = new THREE.Mesh(new THREE.CylinderGeometry(0.0105, 0.0105, 0.026, 16), paint(0xdbe8ee, { unique: true, transparent: true, opacity: 0.7 })); dliq.position.y = 0.014;
    const dcap = inked(new THREE.Mesh(new THREE.CylinderGeometry(0.005, 0.006, 0.02, 12), paint(0xb8432f)), { width: 0.7 }); dcap.position.y = 0.05;
    const dPick = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.07, 10), new THREE.MeshBasicMaterial({ visible: false })); dPick.position.y = 0.03; dPick.userData.pick = true;
    dropper.add(dbody, dliq, dcap, dPick);
    const DROP_HOME = new THREE.Vector3(-0.09, 0, 0.07); dropper.position.copy(DROP_HOME); group.add(dropper);
    const stick = splint({ len: 0.12 }); const STICK_HOME = new THREE.Vector3(0.0, 0.006, 0.09); stick.position.copy(STICK_HOME); stick.rotation.z = Math.PI / 2; group.add(stick);
    const stickPick = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.13, 0.02), new THREE.MeshBasicMaterial({ visible: false })); stickPick.position.y = 0.06; stickPick.userData.pick = true; stick.add(stickPick);

    // ---------------- 粒子：气泡、氢气的火焰、分子示意 ----------------
    const bubs = new Particles({ max: 260, geometry: new THREE.SphereGeometry(1, 10, 8), material: bubble2() });
    bubs.mesh.renderOrder = 10;
    const blue = flame2({ w: 0.009, h: 0.024, core: 0xdbe8ff, mid: 0x9cc0ff, edge: 0x6f9cf5, blue: 0.6, blueColor: 0x5f8ff0, alpha: 0.5, glowK: 0.15 });      // 氢气燃烧：淡蓝色、很淡的火焰
    blue.setOn(false);
    group.add(bubs.mesh, blue);
    const mols = molecules({ max: 160, unit: 0.0011 }); group.add(mols);


    const tags = { neg: tag('', 'pill'), pos: tag('', 'pill'), sw: tag('', 'pill'), clock: tag('', 'pill') };

    const fresh = () => ({
      salt: false, on: false, t: 0, gas: { neg: 0, pos: 0 }, made: { neg: 0, pos: 0 }, I: 0, cock: { neg: false, pos: false },
      rows: [], view: false, seen: new Set(), test: null, tested: { neg: '', pos: '' }, near: false,
    });
    let S = fresh();
    let W = null;
    const status = (m) => W?.status(m);

    const A = {
      salt() {
        if (S.salt) return status('已经加过硫酸钠溶液了，少量就够。');
        S.salt = true;
        status('向漏斗里加了少量<b>硫酸钠溶液</b>，增强水的导电性。' + (S.on ? '看看电极上的气泡。' : '现在点<b>电源开关</b>接通电源。'));
      },
      power(v = !S.on) {
        if (v && (S.cock.neg || S.cock.pos)) return status('先关上玻璃管上的活塞，再通电。');
        S.on = v;
        if (v) status(S.salt ? '通电了。看两个电极上的气泡，和两根玻璃管里的液面。（时间加快 10 倍）' : '通电了……电极上几乎没有气泡：<b>纯水几乎不导电</b>。把桌上的<b>硫酸钠溶液</b>拖到漏斗里试试。');
        else status('切断了电源。' + (S.gas.neg > 2 && S.gas.pos > 1 ? '现在可以检验两种气体：把<b>燃着的木条</b>拖到玻璃管尖嘴，点<b>活塞</b>放出气体。' : ''));
      },
      cock(side) {
        if (S.on) return status('先<b>切断电源</b>，再检验气体（课本第 93 页步骤（2））。');
        S.cock[side] = !S.cock[side];
        if (S.cock[side] && stick.userData.at === side && !S.test) return A.test(side);       // 木条已经凑在尖嘴上：放出气体就检验
        if (S.cock[side] && S.gas[side] < 0.2) status('这根管里没有气体。');
        else if (S.cock[side]) status('打开了活塞，气体从尖嘴放了出去。要检验，先把<b>燃着的木条</b>凑到尖嘴上。');
      },
      record() {
        if (!S.salt || S.gas.neg < 0.5) return status('先通电，让两根管里都收集到一些气体，再读刻度。');
        if (S.on) { S.held = { neg: S.gas.neg, pos: S.gas.pos, t: S.t }; }
        const r = S.held && S.on ? S.held : { neg: S.gas.neg, pos: S.gas.pos, t: S.t };
        W.ask(r);
      },
      test(side) {
        if (S.test) return status('等这一次检验做完，再检验另一根管。');
        if (S.on) return status('先切断电源。');
        if (S.gas[side] < 0.5) return status('这根管里的气体太少了。');
        S.test = { side, t: 0 }; S.cock[side] = true;
        near(new THREE.Vector3(X[side], BASE_Y + TUBE_H + 0.03, 0), [0.05, 0.2, 1], 0.24);
      },
      reset() {
        bubs.clear(); S = fresh(); blue.setOn(false); stick.setState('none'); stick.position.copy(STICK_HOME); stick.rotation.z = Math.PI / 2;
        if (W) { W.tbl.clear?.(); W.rows.length = 0; W.redraw(); W.q.el.hidden = true; W.q2.el.hidden = true; W.goal.undo('run', 'read', 'ratio', 'testpos', 'testneg', 'what', 'mass'); W.q3?.el && (W.q3.el.hidden = true, W.q3title.hidden = true); W.readCard.el.hidden = true; }
        status('重新加满了水（还没加硫酸钠）。点<b>电源开关</b>通电试试。');
      },
    };

    const pointer = draggable(group, [
      { obj: swPick, plane: 'xy', offset: 0.05, hint: () => (S.on ? '点一下：切断电源' : '点一下：接通电源'), onTap: () => A.power(), onStart: () => {}, onDrag: () => {}, onEnd: () => {} },
      { obj: dPick, plane: 'xy', offset: 0, hint: '拖到漏斗里：加少量硫酸钠溶液', enabled: () => !S.salt,
        onDrag: (p) => { dropper.position.set(p.x, Math.max(0, p.y), 0); },
        onEnd: () => { if (Math.abs(dropper.position.x) < 0.04 && dropper.position.y > BASE_Y + 0.17) A.salt(); dropper.position.copy(DROP_HOME); } },
      ...['neg', 'pos'].map((side) => ({ obj: tubes[side].cockPick, plane: 'xy', offset: 0, hint: () => (S.cock[side] ? '点一下：关上活塞' : '点一下：打开活塞，放出气体'), onTap: () => A.cock(side), onStart: () => {}, onDrag: () => {}, onEnd: () => {} })),
      { obj: stickPick, plane: 'xy', offset: 0, hint: '拖到玻璃管尖嘴：用燃着的木条检验',
        onStart: () => { stick.setState('flame', 0.6); stick.rotation.z = -Math.PI * 0.75; },          // 燃着的一端朝左上
        onDrag: (p) => { stick.position.set(p.x, Math.max(0.09, p.y), 0); },          // 燃着的一端跟着鼠标
        onEnd: () => {
          const tipX = stick.position.x, tipY = stick.position.y;
          const side = ['neg', 'pos'].find((s) => Math.abs(tipX - X[s]) < 0.02 && Math.abs(tipY - tubes[s].tipY) < 0.03);
          if (side) { stick.userData.at = side; if (!S.cock[side]) status('木条凑到了尖嘴上。现在点这根管上的<b>活塞</b>，放出气体。'); else A.test(side); }
          else { stick.userData.at = null; stick.setState('none'); stick.position.copy(STICK_HOME); stick.rotation.z = Math.PI / 2; }
        } },
    ], { tip: tag('', 'pill') });

    // ---------------- 每帧 ----------------
    const step = (dt) => {
      const h = Math.min(dt, 1 / 30), hv = h * SPEED;
      // 电流：加了硫酸钠约 0.30 A；纯水约 0.3 mA
      S.I += ((S.on ? (S.salt ? 0.3 : 0.0003) : 0) - S.I) * Math.min(1, h * 4);
      if (S.on) S.t += hv;
      const nE = (S.I * hv) / F;                       // 这一帧流过的电子（mol）
      const dH = (nE / 2) * VM * 1000, dO = (nE / 4) * VM * 1000;     // mL
      S.made.neg += dH; S.made.pos += dO;
      // 先溶进水里一部分，之后才在管顶聚成气体
      const intoGas = (side, d) => { const left = Math.max(0, DISSOLVE[side] - (S.made[side] - d)); const g = Math.max(0, d - Math.min(d, left)); S.gas[side] = Math.min(MAX_ML, S.gas[side] + g); };
      intoGas('neg', dH); intoGas('pos', dO);
      // 活塞开着：气体放出去
      for (const side of ['neg', 'pos']) if (S.cock[side] && S.gas[side] > 0) S.gas[side] = Math.max(0, S.gas[side] - h * 2.5);
      // 气泡
      const rate = { neg: S.I * 520, pos: S.I * 260 };
      for (const side of ['neg', 'pos']) {
        S['acc' + side] = (S['acc' + side] || 0) + rate[side] * h;
        while (S['acc' + side] > 1) { S['acc' + side] -= 1; bubs.spawn({ p: new THREE.Vector3(X[side] + (Math.random() - 0.5) * 0.005, BASE_Y + 0.008 + Math.random() * 0.016, (Math.random() - 0.5) * 0.002), v: new THREE.Vector3(0, 0.04, 0), size: side === 'neg' ? 0.0007 : 0.0009, life: 8, side }); }
      }
      bubs.update(h, (p, d) => { p.v.y += 0.3 * d; p.p.addScaledVector(p.v, d); const lvl = BASE_Y + TUBE_H - S.gas[p.side] * ML_LEN; return p.p.y < lvl; });
      // 检验
      const T = S.test;
      blue.setOn(false);
      if (T) {
        T.t += h;
        const side = T.side, tipY = tubes[side].tipY;
        stick.position.lerp(new THREE.Vector3(X[side] + 0.007, tipY + 0.004, 0), 0.2); stick.rotation.z = -Math.PI * 0.75;
        const flowing = S.gas[side] > 0.05 && S.cock[side];
        if (side === 'pos') {
          stick.setState('flame', flowing ? 1.6 : 0.6);
          if (T.t > 0.8 && !S.tested.pos) { S.tested.pos = 'more'; W?.goal.done('testpos'); status('打开<b>正极</b>那根管的活塞：燃着的木条<b>燃烧得更旺</b>了——是<b>氧气</b>。'); }
        } else {
          stick.setState('flame', 0.6);
          blue.position.set(X.neg, tipY + 0.001, 0); blue.setOn(flowing);
          if (T.t > 0.8 && !S.tested.neg) { S.tested.neg = 'burn'; W?.goal.done('testneg'); status('打开<b>负极</b>那根管的活塞：气体被点燃，在尖嘴处燃烧，发出<b>淡蓝色火焰</b>——是<b>氢气</b>。'); }
        }
        if (T.t > 3.5 || (!flowing && T.t > 1.2)) { S.test = null; S.cock[side] = false; far(); stick.setState('none'); stick.position.copy(STICK_HOME); stick.rotation.z = Math.PI / 2; A.maybeWhat?.(); }
      }
      // 水面：管里的水被气体压下去，漏斗里的水升上来
      for (const side of ['neg', 'pos']) {
        const tb = tubes[side];
        const lvl = TUBE_H - S.gas[side] * ML_LEN;
        tb.water.scale.y = Math.max(0.001, lvl);
        tb.knob.rotation.z = S.cock[side] ? Math.PI / 2 : 0;
      }
      const up = (S.gas.neg + S.gas.pos) * 1e-6 / (Math.PI * 0.016 * 0.016);
      bulbWater.scale.y = 0.004 + Math.min(0.028, up);
      led.material.color.setHex(S.on ? 0xff4a3a : 0x3a1a1a);
      sw.position.z = S.on ? 0.037 : 0.04;
      // 分子示意：电极附近，水分子 → 氢分子（负极）、氧分子（正极）
      mols.visible = S.view;
      if (S.view) {
        // 电极附近：水分子 H₂O；玻璃管顶端：负极聚着氢分子 H₂、正极聚着氧分子 O₂（个数 2∶1）
        mols.begin();
        for (const side of ['neg', 'pos']) {
          const cx = X[side], cy = BASE_Y + 0.03;
          for (let i = 0; i < 10; i++) { const a = i * 2.4 + S.t * 0.15, r = 0.0025 + (i % 3) * 0.0014; mols.add('H2O', new THREE.Vector3(cx + Math.cos(a) * r, cy + Math.sin(a) * r * 2.2, 0.004), a * 1.3); }
          const lvl = BASE_Y + TUBE_H - S.gas[side] * ML_LEN, gTop = BASE_Y + TUBE_H;
          const count = Math.min(side === 'neg' ? 12 : 6, Math.round(S.gas[side] / (side === 'neg' ? 1.1 : 1.1)));
          for (let i = 0; i < count; i++) { const y = lvl + ((i + 0.5) / Math.max(1, count)) * (gTop - lvl); mols.add(side === 'neg' ? 'H2' : 'O2', new THREE.Vector3(cx + (i % 2 ? 0.0022 : -0.0022), y, 0.004), i * 0.9 + S.t * 0.4); }
        }
        mols.end();
      }
      // 标签
      tags.neg.loc(group, X.neg - 0.024, BASE_Y - 0.022, 0.03).text('接电源负极');
      tags.pos.loc(group, X.pos + 0.024, BASE_Y - 0.022, 0.03).text('接电源正极');
      tags.sw.loc(group, -0.19, 0.085, 0.04).text(S.on ? `通电 · 约 ${S.salt ? '0.30 A' : '0.3 mA'}` : '电源（断开）');
      tags.clock.loc(group, -0.19, 0.105, 0.04).text(S.t > 0 ? `已通电 ${(S.t / 60).toFixed(1)} 分钟（时间加快 10 倍）` : '');
    };

    return {
      group: root,
      pointer,
      size: { w: 0.44, d: 0.16, h: 0.33 },
      view: { elev: 10, azim: -10, lookY: 0.52, margin: 1.02 },
      mount(ui) {
        const rows = [];
        const tbl = table(['时间/min', '正极管中气体/mL', '负极管中气体/mL'], { note: '自己从玻璃管的刻度上读（管顶是 0）' });
        const redraw = () => { tbl.clear?.(); for (const r of rows) tbl.add?.([r.t.toFixed(1), r.pos.toFixed(1), r.neg.toFixed(1)]); };
        // 读数：学生自己输入两个读数，和真实值比较（误差 0.5 mL 以内算读对）
        const inPos = h('input', { type: 'number', step: '0.5', min: '0', max: String(MAX_ML), class: 'read-in', placeholder: '正极' });
        const inNeg = h('input', { type: 'number', step: '0.5', min: '0', max: String(MAX_ML), class: 'read-in', placeholder: '负极' });
        let pending = null;
        const okBtn = buttons([{ text: '记下这一组', onClick: () => {
          const a = parseFloat(inPos.value), b = parseFloat(inNeg.value);
          if (!(a >= 0) || !(b >= 0)) return status('两根管的读数都要填。');
          const ea = Math.abs(a - pending.pos), eb = Math.abs(b - pending.neg);
          if (ea > 0.55 || eb > 0.55) return status(`再看一下刻度：${ea > 0.55 ? '正极' : '负极'}那根管的读数好像不对。刻度从<b>管顶</b>往下数，每小格 0.5 mL；读气体和水的<b>分界面</b>（液面）。`);
          rows.push({ t: pending.t / 60, pos: a, neg: b }); tbl.add?.([(pending.t / 60).toFixed(1), a.toFixed(1), b.toFixed(1)]);
          readCard.el.hidden = true; inPos.value = ''; inNeg.value = ''; S.held = null;
          W.goal.done('read');
          W.goal.done('run');
          const big = rows.some((r) => r.neg >= 8);
          if (rows.length >= 2 && big) { if (q.el.hidden && !W.goal.has('ratio')) { q.el.hidden = false; qg.arm(); status('看看你记下的几组数据：负极管和正极管里气体体积的比，大约是多少？'); } }
          else if (!big) status('记下了。气体还比较少，读数的误差相对大；等<b>负极管里有 8 mL 以上</b>时再读一组。');
          else status('记下了一组。再等一会儿，<b>再读一组</b>。');
        } }]);
        const readCard = { el: h('div', { class: 'read-card' }, h('p', { class: 'note', html: '凑近看刻度，读出两根管里气体的体积（mL）：' }), h('div', { class: 'read-row' }, h('label', {}, '正极 ', inPos), h('label', {}, '负极 ', inNeg)), okBtn.el) };
        readCard.el.hidden = true;
        const q = buttons(['约 2∶1', '约 1∶2', '约 1∶1', '约 8∶1'].map((t, j) => ({ text: t, ghost: true, onClick: () => {
          if (j) { const r = rows[rows.length - 1]; return status(`用你表里的数据算一算：负极那根管里的气体（${r.neg.toFixed(1)} mL）是正极（${r.pos.toFixed(1)} mL）的几倍？`); }
          q.el.hidden = true; W.goal.done('ratio');
          const last = rows[rows.length - 1];
          status(`对：负极∶正极 ≈ <b>2∶1</b>（你最后一组是 ${last.neg.toFixed(1)}∶${last.pos.toFixed(1)}）。实际测得的值往往<b>略大于 2</b>——氧气比氢气更易溶于水。现在<b>切断电源</b>，检验两种气体。`);
        } })));
        q.el.hidden = true;
        const qg = guard(q.el, () => rows.length, () => status('记录变了，重新看看表里的数据。'));
        const q2 = buttons(['由氢、氧两种元素组成', '由氢气和氧气组成', '是一种元素'].map((t, j) => ({ text: t, ghost: true, onClick: () => {
          if (j === 1) return status('水是一种纯净物，里面并没有氢气和氧气；氢气、氧气是通电以后<b>新生成</b>的物质。');
          if (j === 2) return status('水通电分解成了两种不同的物质，说明它不是一种元素。');
          q2.el.hidden = true; W.goal.done('what');
          const r = rows[rows.length - 1];
          W.q3title.innerHTML = `再用你的读数估算质量。课本给的是标准状况下的密度（氢气约 0.09 g/L，氧气约 1.43 g/L）；两管气体在同样的温度和压强下收集，室温让两边的密度按同一比例变小，所以算出的<b>比值</b>不受影响：<br>${r.neg.toFixed(1)} mL 氢气 × 0.09 g/L，${r.pos.toFixed(1)} mL 氧气 × 1.43 g/L。氢气∶氧气的<b>质量比</b>约为——`;
          q3.el.hidden = false; W.q3title.hidden = false;
          status('对。生成的氢气由氢元素组成、氧气由氧元素组成，化学反应前后元素种类不变——所以<b>水由氢、氧两种元素组成</b>。最后一题：体积比约 2∶1，<b>质量比</b>也是 2∶1 吗？');
        } })));
        q2.el.hidden = true;
        const q3title = h('p', { class: 'q-title' }); q3title.hidden = true;
        const q3 = buttons(['约 1∶8', '约 2∶1', '约 1∶1', '约 8∶1'].map((t, j) => ({ text: t, ghost: true, onClick: () => {
          if (j === 1) return status('2∶1 是<b>体积</b>比。氢气很轻：同样体积，氢气的质量只有氧气的约 1/16。用密度乘一下看看。');
          if (j) return status('把两边的“体积 × 密度”都算出来，再比一比。');
          const r = rows[rows.length - 1], mH = r.neg * 0.09, mO = r.pos * 1.43;
          q3.el.hidden = true; q3title.hidden = true; W.goal.done('mass');
          status(`对：按标准状况密度估算，氢气约 ${mH.toFixed(2)} mg，氧气约 ${mO.toFixed(2)} mg（室温下实际会少几个百分点，两边一样少），质量比约 1∶${(mO / mH).toFixed(1)}，接近 <b>1∶8</b>。体积比 2∶1，质量比却是 1∶8——两种比不要混。可以掀开结论看看。`);
        } })));
        q3.el.hidden = true;
        A.maybeWhat = () => { if (S.tested.neg && S.tested.pos && q2.el.hidden && !W.goal.has('what')) { q2.el.hidden = false; status('两种气体都检验了。由此可知，水——'); } };
        const view = seg('看看电极上（示意）', ['不看', '看分子'], (_, k) => { S.view = !!k; if (k) near(new THREE.Vector3(0, BASE_Y + 0.05, 0), [0.05, 0.15, 1], 0.2); else far(); });
        const nearB = buttons([{ text: '凑近读刻度', ghost: true, onClick: () => (S.near ? far() : near(new THREE.Vector3(0, BASE_Y + TUBE_H - 0.06, 0), [0, 0.05, 1], 0.22)) }]);
        const readB = buttons([{ text: '读刻度，记录一组数据', onClick: () => { if (!S.salt || S.gas.neg < 0.5) return status('先通电，让两根管里都收集到一些气体，再读刻度。'); pending = { neg: S.gas.neg, pos: S.gas.pos, t: S.t }; readCard.el.hidden = false; near(new THREE.Vector3(0, BASE_Y + TUBE_H - Math.max(S.gas.neg, 4) * ML_LEN * 0.6, 0), [0, 0.05, 1], 0.22); status('凑近看两根管的刻度（每小格 0.5 mL，管顶是 0），读出两边气体的体积，填进面板里。' + (S.on ? '读数这段时间里液面会继续变，按你按下按钮那一刻的读数记。' : '')); } }]);
        const alt = h('details', { class: 'how-to' }, h('summary', {}, '用按钮做（不方便拖动时）'), buttons([
          { text: '加硫酸钠溶液', ghost: true, onClick: () => A.salt() },
          { text: '接通 / 切断电源', ghost: true, onClick: () => A.power() },
          { text: '检验正极的气体', ghost: true, onClick: () => A.test('pos') },
          { text: '检验负极的气体', ghost: true, onClick: () => A.test('neg') },
        ]).el);
        const again = buttons([{ text: '再做一次', ghost: true, onClick: () => A.reset() }]);
        const note = h('p', { class: 'fineprint', html: '说明：时间加快 10 倍；电流按 0.30 A 计，气体按室温下的体积计。氧气、氢气在水里溶解的量取室温下的溶解度估算。' });
        ui.controls.append(readB.el, readCard.el, tbl.el, q.el, q2.el, q3title, q3.el, nearB.el, view.el, again.el, alt, note);
        W = {
          q, q2, q3, q3title, rows, tbl, redraw, readCard, nearBtn: nearB.btns[0], status: (m) => ui.status(m), ask: () => {}, qg,
          goal: goals(ui, [['run', '通电，产生气体'], ['read', '读两根管里的气体体积并记录'], ['ratio', '比较两边气体的体积'], ['testpos', '检验正极产生的气体'], ['testneg', '检验负极产生的气体'], ['what', '想一想：水由什么组成'], ['mass', '比较氢气和氧气的质量']]),
        };
        ui.status('电解器里已经加满了水。先点<b>电源开关</b>接通电源，看看电极上有没有气泡。');
      },
      update(dt, t) {
        step(dt);
        stick.update(t); blue.update(t);
        W?.qg.check();
        if (S.on && S.salt && S.gas.neg > 1 && !S.seen.has('run')) { S.seen.add('run'); status('两个电极上都有<b>气泡</b>冒出，气体聚在玻璃管顶端，管里的液面在下降。比一比：<b>哪边的气体多？</b>等一会儿点“读刻度，记录一组数据”。'); }
      },
      dispose() { bubs.dispose(); },
      debug: { get S() { return S; }, A, tubes },
    };
  },
};
