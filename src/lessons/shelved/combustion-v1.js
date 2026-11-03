// 课题1 燃料的燃烧 · 探究 燃烧的条件（课本第 159–160 页、图 7-3；实验活动 4 在第 181 页）。
// 左边（课本探究，教师演示）：500 mL 烧杯装 300 mL 热水，水里有一小块白磷；烧杯上盖薄铜片，铜片一端放红磷、另一端放白磷。
//   把氧气导管拖到水里的白磷上，通入氧气。可以把热水换成冷水，再做一次（课本没有这一步：用来单独改变“温度”）。
// 右边（实验活动 4）：用坩埚钳夹着小木块、小煤块放到酒精灯火焰上加热；点燃两支蜡烛，用烧杯罩住其中一支。
// 着火点（课本表 7-1）：白磷 40 ℃、红磷 260 ℃、木材 240–270 ℃、木炭 320–400 ℃、无烟煤 600–700 ℃。酒精灯外焰温度取约 500 ℃。
import * as THREE from 'three';
import { buttons, goals, seg, table } from './kit/ui.js';
import { draggable, clamp } from './kit/interact.js';
import { thermometer, glowTexture } from './kit/props.js';
import { Particles } from './kit/fx.js';
import { glassMat, rubberTube, crucibleTongs, chemLamp, chemBeaker, chemCandle, CHEM } from './kit/chem.js';
import { bubble2, flame2, smoke2 } from './kit/chemfx.js';
import { paint, inked, hull } from '../live/ink.js';
import { h } from '../ui/Panel.js';

const IGN = { white: 40, red: 260, wood: 255, coal: 650 };
const FLAME_T = 500;
const BK = new THREE.Vector3(-0.15, 0, 0);        // 烧杯位置
const BR = 0.042, BH = 0.12, WATER_H = 0.075;     // 500 mL 烧杯，300 mL 水

export default {
  id: 'combustion',
  fig: '图7-3',
  title: '燃烧的条件',
  stampText: '探究',
  predict: {
    q: '烧杯里是 80 ℃ 左右的热水，盖上薄铜片。铜片一端放<b>红磷</b>，另一端放<b>白磷</b>；热水里也有一块<b>白磷</b>。<br>会燃烧的是——',
    hint: '课本第 159 页「探究」',
    options: ['三处的磷都会燃烧', '只有铜片上的白磷燃烧', '铜片上的白磷和红磷都燃烧，水里的不燃烧'],
    answer: 1,
  },
  need: '观察铜片上的白磷、红磷和热水中的白磷，向热水中的白磷通入氧气；再加热木块和煤块、罩住一支蜡烛；最后总结燃烧的条件',
  conclusion: {
    crops: [{ page: 166, rect: [183, 155, 463, 285] }],
    quote: '通常情况下，可燃物与氧气发生的一种发光、放热的剧烈的氧化反应叫作燃烧。燃烧需要三个条件：（1）可燃物；（2）氧气（或空气）；（3）达到燃烧所需的最低温度（着火点）。',
    why: '铜片上的白磷燃烧、红磷不燃烧：都接触空气，铜片只有五六十摄氏度——高于白磷的着火点（40 ℃），远低于红磷的（260 ℃）——说明燃烧要<b>达到着火点</b>。铜片上的白磷燃烧、热水中的白磷不燃烧：两处的温度都高于 40 ℃，水里的白磷却接触不到氧气——说明燃烧需要<b>氧气</b>。碎石在火焰上怎么烧也不燃烧——它不是<b>可燃物</b>。向水中的白磷通入氧气，它就在水里燃烧了。<br>这就是<b>控制变量</b>：比较的两处只在一个因素上有本质区别（着火点的高低、有没有氧气），其他因素都满足燃烧的要求。三个条件缺一不可；灭火只要破坏其中一个就行（罩住蜡烛 = 隔绝氧气）。',
    src: '课本第 159–160 页 · 第七单元 课题1 燃料的燃烧；实验活动4（第 181 页）',
  },

  create({ tag, look, back }) {
    const root = new THREE.Group(), group = new THREE.Group();
    root.add(group);
    const near = (v, d, dist) => { S.near = true; look([v.x, v.y, v.z], d || [0.05, 0.3, 1], dist || 0.3, () => { S.near = false; }); };
    const far = () => { if (S.near) { S.near = false; back(); } };

    // ---------------- 左：烧杯、热水、铜片、白磷、红磷 ----------------
    const bk = chemBeaker({ r: BR, h: BH, level: WATER_H, color: CHEM.water });
    bk.position.copy(BK); group.add(bk);
    // 薄铜片（上面一端放白磷、一端放红磷）：先放在桌上，学生把它盖到烧杯上
    const plate = new THREE.Group(); group.add(plate);
    const copper = inked(new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.0016, 0.05), paint(0xc8763e, { unique: true })), { width: 0.8 });
    copper.position.y = 0.0008; plate.add(copper);
    const blob = (color, r) => { const m = new THREE.Mesh(new THREE.IcosahedronGeometry(r, 1), paint(color, { unique: true })); m.scale.y = 0.6; return m; };
    const wTop = blob(0xf2ecd2, 0.0055); wTop.position.set(-0.04, 0.004, 0);
    const rTop = blob(0xa53a2a, 0.008); rTop.scale.set(1.3, 0.55, 1.1); rTop.position.set(0.04, 0.004, 0);      // 一小堆红磷
    plate.add(wTop, rTop);
    const platePick = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.02, 0.06), new THREE.MeshBasicMaterial({ visible: false })); platePick.userData.pick = true; plate.add(platePick);
    const PLATE_HOME = new THREE.Vector3(-0.05, 0.0, 0.075), PLATE_ON = new THREE.Vector3(BK.x, BH, 0);
    plate.position.copy(PLATE_HOME);
    const wIn = blob(0xf2ecd2, 0.0055); wIn.position.set(BK.x, 0.009, 0);
    const ringPaper = new THREE.Mesh(new THREE.TorusGeometry(0.011, 0.0012, 6, 20), paint(0xd9c9a6)); ringPaper.rotation.x = Math.PI / 2; ringPaper.position.set(BK.x, 0.006, 0);
    group.add(wIn, ringPaper);          // 铜片上的两块磷已经放在 plate 里了
    const therm = thermometer({ min: 0, max: 100, length: 0.2 });
    therm.position.set(BK.x + 0.018, 0.008, -0.034); therm.rotation.z = 0.08; therm.rotation.x = -0.12; group.add(therm);      // 靠在烧杯后壁上，从铜片后沿外面伸出来
    const thermPick = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.2, 0.02), new THREE.MeshBasicMaterial({ visible: false })); thermPick.position.y = 0.1; thermPick.userData.pick = true; therm.add(thermPick);
    // 氧气：一个氧气袋（贮气袋）和导管，导管口可以拖进水里对准白磷
    const bag = new THREE.Mesh(new THREE.SphereGeometry(0.03, 24, 14), paint(0xe2edf5, { unique: true, transparent: true, opacity: 0.9 }));
    bag.scale.set(1.25, 0.45, 0.85); bag.position.set(-0.01, 0.014, -0.045); group.add(bag);
    const bagTag = tag('', 'pill');
    const nozzle = new THREE.Group();
    const nz = new THREE.Mesh(new THREE.CylinderGeometry(0.0022, 0.0022, 0.05, 10), glassMat({ opacity: 0.35 })); nz.position.y = 0.025; nz.renderOrder = 9;
    const nzPick = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.014, 0.06, 8), new THREE.MeshBasicMaterial({ visible: false })); nzPick.position.y = 0.03; nzPick.userData.pick = true;
    nozzle.add(nz, nzPick); group.add(nozzle);
    const NOZ_HOME = new THREE.Vector3(-0.098, 0.0025, 0.004), NOZ_IN = new THREE.Vector3(BK.x + 0.004, 0.014, 0.004);
    const nozHome = () => { nozzle.position.copy(NOZ_HOME); nozzle.rotation.z = -Math.PI / 2; rebuildHose(); };      // 不用的时候平放在桌上
    const nozAt = (p) => { nozzle.position.copy(p); nozzle.rotation.z = 0; rebuildHose(); };
    let hose = null;
    const rebuildHose = () => { if (hose) { group.remove(hose); hose.geometry.dispose(); } const a = bag.position.clone().add(new THREE.Vector3(-0.035, 0.004, 0));
      const ax = new THREE.Vector3(0, 1, 0).applyEuler(nozzle.rotation), b = nozzle.position.clone().addScaledVector(ax, 0.05);
      const lift = Math.min(0.04, 0.012 + a.distanceTo(b) * 0.3);      // 软管从管口顺着导管的方向出来，再弯回氧气袋
      const flat = Math.abs(ax.y) < 0.5;      // 导管平放在桌上时，软管也顺着桌面拖过去
      const mid = flat ? a.clone().lerp(b, 0.5).setY(0.0034) : a.clone().lerp(b, 0.55).add(new THREE.Vector3(0, lift, 0));
      hose = rubberTube([a, a.clone().add(new THREE.Vector3(-0.006, -0.008, 0.006)), mid, b.clone().addScaledVector(ax, 0.012), b]); group.add(hose); };
    nozHome();

    // ---------------- 右：酒精灯、木块、煤块（坩埚钳）、两支蜡烛和烧杯 ----------------
    const lamp = chemLamp(); lamp.position.set(0.09, 0, 0); group.add(lamp);
    const lampPick = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.09, 0.07), new THREE.MeshBasicMaterial({ visible: false })); lampPick.position.y = 0.045; lampPick.userData.pick = true; lamp.add(lampPick);
    const mesh = inked(new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.002, 0.06), paint(0xb9aa8c)), { width: 0.8 }); mesh.position.set(0.18, 0.001, 0.05); group.add(mesh);
    const tongs = (color, shape) => {
      const g = new THREE.Group();
      const geo = shape === 'wood' ? new THREE.BoxGeometry(0.013, 0.009, 0.011) : shape === 'coal' ? new THREE.DodecahedronGeometry(0.0068, 0) : new THREE.IcosahedronGeometry(0.0064, 0);
      const piece = inked(new THREE.Mesh(geo, paint(color, { unique: true })), { width: 0.7 });
      if (shape === 'coal') piece.scale.set(1, 0.78, 0.86), piece.rotation.set(0.4, 0.7, 0.2);
      if (shape === 'stone') piece.scale.set(1.12, 0.72, 0.9), piece.rotation.set(0.2, 1.1, 0.5);
      const arm = crucibleTongs();
      const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture(), color: 0xff6a2a, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending })); glow.scale.set(0.03, 0.03, 1);
      const f = flame2({ w: 0.012, h: 0.034, core: 0xfff4d0, mid: 0xffb43c, edge: 0xff7420, glowK: 0.3 }); f.position.y = 0.004; f.setOn(false);
      const pick = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.018, 0.016), new THREE.MeshBasicMaterial({ visible: false })); pick.position.x = 0.03; pick.userData.pick = true;
      g.add(piece, arm, glow, f, pick);
      Object.assign(g, { piece, glow, flame: f, pick });
      return g;
    };
    const wood = tongs(0xc99a5f, 'wood'), coal = tongs(0x2a2a30, 'coal'), stone = tongs(0x9a978f, 'stone');
    const WOOD_HOME = new THREE.Vector3(0.15, 0.008, 0.035), COAL_HOME = new THREE.Vector3(0.19, 0.008, 0.075);
    const STONE_HOME = new THREE.Vector3(0.17, 0.008, 0.1);
    wood.position.copy(WOOD_HOME); coal.position.copy(COAL_HOME); stone.position.copy(STONE_HOME); group.add(wood, coal, stone);
    const inFlame = (g) => Math.abs(g.position.x - 0.09) < 0.016 && Math.abs(g.position.y - 0.095) < 0.02;
    const c1 = chemCandle({ height: 0.05 }), c2 = chemCandle({ height: 0.05 });
    c1.position.set(0.25, 0, 0.04); c2.position.set(0.3, 0, 0.04); group.add(c1, c2);      // 放在前面，不被书页挡住
    const f1 = c1.flame, f2 = c2.flame;      // 蜡烛自带的火焰
    const cup = chemBeaker({ r: 0.022, h: 0.075, level: 0, marks: false });
    const CUP_HOME = new THREE.Vector3(0.355, 0, 0.04); cup.position.copy(CUP_HOME); group.add(cup);
    const cupPick = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.08, 10), new THREE.MeshBasicMaterial({ visible: false })); cupPick.position.y = 0.04; cupPick.userData.pick = true; cup.add(cupPick);

    // ---------------- 火焰、白烟、气泡 ----------------
    const fWT = flame2({ w: 0.016, h: 0.04, core: 0xffffff, mid: 0xfff0a8, edge: 0xffb84a, glowK: 0.55 }); fWT.position.copy(wTop.position).add(new THREE.Vector3(0, 0.001, 0)); fWT.setOn(false); plate.add(fWT);      // 白磷燃烧：很亮的黄白色火焰
    const fWI = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture(), color: 0xffb030, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending })); fWI.scale.set(0.03, 0.03, 1); fWI.renderOrder = 12; fWI.position.copy(wIn.position).add(new THREE.Vector3(0, 0.006, 0));
    group.add(fWI);
    const smoke = smoke2({ max: 200, opacity: 0.85 }), smokeIn = smoke2({ max: 120, opacity: 0.7 });      // 五氧化二磷：大量白烟
    group.add(smoke.mesh, smokeIn.mesh);
    const bubs = new Particles({ max: 160, geometry: new THREE.SphereGeometry(1, 10, 8), material: bubble2() });
    group.add(bubs.mesh);

    const tags = { wt: tag('', 'pill'), rt: tag('', 'pill'), wi: tag('', 'pill'), wood: tag('', 'pill'), coal: tag('', 'pill'), c1: tag('', 'pill'), c2: tag('', 'pill') };

    const fresh = (Tw = 80) => ({
      Tw, Tc: 25, cold: Tw < 40, o2: false, plateOn: false, wt: { state: 'idle', t: 0 }, wi: { state: 'idle', t: 0 }, red: 0,
      lit: false, wood: { T: 25, burn: 0, hold: false }, coal: { T: 25, burn: 0, hold: false }, stone: { T: 25, burn: 0, hold: false },
      cupOn: false, cupO2: 1, c1: true, c2: true, seen: new Set(), rows: new Map(), near: false,
    });
    let S = fresh();
    let W = null;
    const status = (m) => W?.status(m);
    const row = (key, what, cond, res) => { if (S.rows.has(key)) return; S.rows.set(key, 1); W?.tbl.add([what, cond, res]); };

    const A = {
      water(cold) {
        smoke.dispose && 0;
        const keep = { lit: S.lit, wood: S.wood, coal: S.coal, cupOn: S.cupOn, c1: S.c1, c2: S.c2, rows: S.rows, seen: S.seen, plateOn: S.plateOn };
        S = Object.assign(fresh(cold ? 20 : 80), keep); S.cold = cold;
        S.Tc = 25;
        bubs.clear();
        status(cold ? '换成了 <b>20 ℃ 的冷水</b>，铜片上、水里都重新放了白磷，铜片上也有红磷。看看铜片上的白磷还燃不燃烧。' : '换成了 <b>80 ℃ 左右的热水</b>，重新放好了白磷和红磷。');
        far(); near(new THREE.Vector3(BK.x, 0.1, 0), [0.05, 0.35, 1], 0.34);
      },
      plate() {
        if (S.plateOn) return;
        S.plateOn = true;
        status('在烧杯上盖好了薄铜片：一端是<b>红磷</b>，另一端是用滤纸吸干了水的<b>白磷</b>。铜片被热水慢慢烤热……盯着两端的磷，和热水里的白磷。');
        near(new THREE.Vector3(BK.x, 0.1, 0), [0.05, 0.35, 1], 0.34);
      },
      oxygen(on = !S.o2) {
        S.o2 = on;
        if (on) status('导管口对准热水中的白磷，通入<b>氧气</b>。');
      },
      lamp() { S.lit = !S.lit; status(S.lit ? '点燃了酒精灯。用坩埚钳夹着<b>小木块</b>和<b>小煤块</b>，同时放到火焰上加热（拖动坩埚钳）。' : '盖上灯帽，熄灭了酒精灯。'); },
      both() {
        if (!S.lit) S.lit = true;
        far();
        S.wood.hold = true; S.coal.hold = true;
        status('把小木块和小煤块<b>同时</b>放到酒精灯火焰上加热。注意：要从侧面观察。');
        near(new THREE.Vector3(0.1, 0.08, 0), [0.05, 0.25, 1], 0.4);
      },
      cover(on = !S.cupOn) {
        if (on && !S.c1) return status('这支蜡烛已经灭了。点“再做一次”。');
        S.cupOn = on; if (on) { S.cupO2 = 1; far(); near(new THREE.Vector3(0.275, 0.05, 0.04), [0.05, 0.25, 1], 0.36); status('用烧杯<b>罩住</b>了左边的蜡烛。看两支蜡烛的火焰。'); }
      },
      reset() { bubs.clear(); S = fresh(); W?.tbl.clear(); W && (W.q.el.hidden = true, W.goal.undo('copper', 'under', 'oxygen', 'wood', 'candle', 'sum')); wood.position.copy(WOOD_HOME); coal.position.copy(COAL_HOME); stone.position.copy(STONE_HOME); nozHome(); cup.position.copy(CUP_HOME); far(); status('重新摆好了器材。先看<b>铜片上</b>的白磷和红磷、<b>热水里</b>的白磷。'); },
    };

    const pointer = draggable(group, [
      { obj: platePick, plane: 'xy', offset: 0, hint: () => (S.plateOn ? '' : '拖到烧杯上：盖上铜片'), enabled: () => !S.plateOn,
        onDrag: (p) => { if (S.plateOn) return; S.plateDrag = new THREE.Vector3(p.x, Math.max(0, p.y), 0); },
        onEnd: () => { const p = S.plateDrag; S.plateDrag = null; if (p && Math.abs(p.x - BK.x) < 0.05 && p.y > BH - 0.04) A.plate(); } },
      { obj: nzPick, plane: 'xy', offset: 0.004, hint: () => (S.o2 ? '拖出水面：停止通氧气' : '拖到热水中的白磷上：通入氧气'),
        onDrag: (p) => { nozAt(new THREE.Vector3(clamp(p.x, -0.26, 0.0), clamp(p.y, 0.012, 0.2), 0.004)); },
        onEnd: () => { const at = nozzle.position.distanceTo(NOZ_IN) < 0.03; if (at) { nozAt(NOZ_IN); A.oxygen(true); } else { A.oxygen(false); nozHome(); } } },
      { obj: lampPick, plane: 'xy', offset: 0, hint: () => (S.lit ? '点一下：熄灭' : '点一下：点燃酒精灯'), onTap: () => A.lamp(), onStart: () => {}, onDrag: () => {}, onEnd: () => {} },
      ...[['wood', wood, WOOD_HOME], ['coal', coal, COAL_HOME], ['stone', stone, STONE_HOME]].map(([k, g, home]) => ({ obj: g.pick, plane: 'xy', offset: 0, hint: `拖到酒精灯火焰上：加热${k === 'wood' ? '小木块' : k === 'coal' ? '小煤块' : '碎石'}`,
        onDrag: (p) => { g.position.set(p.x, Math.max(0.008, p.y), 0); S[k].hold = inFlame(g); },
        onEnd: () => { S[k].hold = inFlame(g); if (S[k].hold) { g.position.set(k === 'wood' ? 0.083 : k === 'coal' ? 0.097 : 0.09, 0.095, k === 'stone' ? 0.012 : 0); if (!S.lit) status('酒精灯还没点燃。'); } else g.position.copy(home); } })),
      { obj: cupPick, anchor: cup, plane: 'xy', offset: CUP_HOME.z, keepOffset: true, hint: () => (S.cupOn ? '拖开：拿掉烧杯' : '拖到左边那支蜡烛上：倒扣罩住'),
        onStart: () => { if (S.cupOn) { S.cupOn = false; } },
        onDrag: (p) => { cup.position.set(p.x, Math.max(0, p.y), CUP_HOME.z); cup.rotation.x = Math.PI * clamp((CUP_HOME.x - p.x) / 0.09, 0, 1); },
        onEnd: () => { if (Math.abs(cup.position.x - 0.25) < 0.03) { A.cover(true); } else { cup.position.copy(CUP_HOME); cup.rotation.x = 0; } } },
    ], { tip: tag('', 'pill') });

    // ---------------- 每帧 ----------------
    const step = (dt, t) => {
      const h = Math.min(dt, 1 / 30);
      // 水慢慢变凉（热水从 80 ℃ 起，1 分钟大约降 5 ℃）；铜片跟着水温变
      S.Tw += (22 - S.Tw) * h * 0.0015;
      S.Tc += ((S.plateOn ? S.Tw - 3 : 25) - S.Tc) * Math.min(1, h * 0.6);
      plate.position.copy(S.plateOn ? PLATE_ON : S.plateDrag || PLATE_HOME);
      therm.setTemp(S.Tw);
      // 铜片上的白磷：有空气（氧气），温度达到 40 ℃ 就燃烧
      const P = S.wt;
      if (P.state === 'idle' && S.Tc >= IGN.white) { P.state = 'burn'; P.t = 0; }
      if (P.state === 'burn') { P.t += h; if (P.t > 6) P.state = 'done'; }
      fWT.setOn(P.state === 'burn'); fWT.setSize(P.state === 'burn' ? Math.min(1, P.t * 2) * (P.t > 5 ? (6 - P.t) : 1) : 0); fWT.update(t);
      wTop.visible = P.state !== 'done'; wTop.scale.setScalar(P.state === 'burn' ? Math.max(0.3, 1 - P.t / 6) : 1); wTop.scale.y *= 0.6;
      smoke.update(h, { rate: P.state === 'burn' ? 40 : 0, origin: plate.position.clone().add(wTop.position).add(new THREE.Vector3(0, 0.01, 0)), spread: 0.01, up: 0.05, size: 0.02 });
      // 水里的白磷：没有氧气不燃烧；通入氧气、温度够了就在水里燃烧
      const Q = S.wi;
      if (S.o2) { S.bacc = (S.bacc || 0) + h * 26; while (S.bacc > 1) { S.bacc -= 1; bubs.spawn({ p: NOZ_IN.clone().add(new THREE.Vector3((Math.random() - 0.5) * 0.004, 0.002, 0)), v: new THREE.Vector3(0, 0.03, 0), size: 0.0018 + Math.random() * 0.001, life: 4 }); } }
      if (Q.state === 'idle' && S.o2 && S.Tw >= IGN.white) { Q.state = 'burn'; Q.t = 0; }
      if (Q.state === 'burn') { Q.t += h; if (!S.o2) Q.state = 'idle'; if (Q.t > 7) Q.state = 'done'; }
      fWI.material.opacity = Q.state === 'burn' ? 1 : 0; fWI.scale.setScalar(Q.state === 'burn' ? 0.05 + Math.sin(t * 25) * 0.006 : 0.03);
      wIn.visible = Q.state !== 'done';
      smokeIn.update(h, { rate: Q.state === 'burn' ? 18 : 0, origin: new THREE.Vector3(BK.x, WATER_H + 0.004, 0), spread: 0.02, up: 0.05, size: 0.018 });
      bubs.update(h, (p, d) => { p.v.y += 0.2 * d; p.p.addScaledVector(p.v, d); return p.p.y < WATER_H; });
      // 木块、煤块
      for (const [k, g] of [['wood', wood], ['coal', coal], ['stone', stone]]) {
        const o = S[k];
        const heat = o.hold && S.lit && inFlame(g);
        o.T += ((heat ? FLAME_T : 25) - o.T) * Math.min(1, h * (heat ? (k === 'wood' ? 0.35 : 0.22) : 0.15));
        if (IGN[k] && o.T >= IGN[k] && heat && o.burn === 0) o.burn = 0.01;      // 碎石没有着火点：不是可燃物
        if (o.burn > 0) { o.burn += h; if (!o.hold && o.burn > 3) o.burn = Math.max(0.01, o.burn); }
        g.flame.setOn(o.burn > 0 && o.burn < 30); g.flame.update(t);
        g.glow.material.opacity = clamp((o.T - 300) / 300, 0, 0.7) * (o.burn > 0 ? 0 : 1);
        if (k === 'wood' && o.burn > 0) g.piece.material.color.setHex(0x4a3524);
      }
      lamp.flame.setOn(S.lit); lamp.flame.update(t);
      // 蜡烛：罩住以后烧杯里的氧气越来越少，火焰变小、熄灭
      if (S.cupOn && S.c1) { S.cupO2 -= h * 0.22; cup.position.set(0.25, 0.075, 0.04); cup.rotation.x = Math.PI; if (S.cupO2 < 0.15) { S.c1 = false; } }
      f1.setOn(S.c1); f1.setSize(S.cupOn ? clamp(0.25 + S.cupO2, 0, 1) : 1); f1.update(t);
      f2.setOn(S.c2); f2.update(t + 1.3);
      // 记录和进度
      if (!W) return;
      const hot = !S.cold;
      if (P.state === 'burn' && P.t > 1 && !S.seen.has('wt' + S.cold)) { S.seen.add('wt' + S.cold); row('wt' + S.cold, '铜片上的白磷', `${Math.round(S.Tc)} ℃，有空气`, '<b>燃烧</b>，产生白烟'); if (hot) status('铜片上的<b>白磷燃烧</b>起来，产生大量白烟。再看看铜片另一端的<b>红磷</b>，和热水里的<b>白磷</b>。'); }
      if (S.Tc > 60 && !S.seen.has('red' + S.cold) && hot) { S.seen.add('red' + S.cold); row('red', '铜片上的红磷', `${Math.round(S.Tc)} ℃，有空气`, '不燃烧'); }
      if (S.Tw > 60 && P.state !== 'idle' && !S.o2 && !S.seen.has('wi0')) { S.seen.add('wi0'); row('wi0', '热水中的白磷', `${Math.round(S.Tw)} ℃，没有氧气`, '不燃烧'); }
      if (S.seen.has('wt' + false) && S.seen.has('red' + false) && !W.goal.has('copper')) W.goal.done('copper');
      if (S.seen.has('wt' + false) && S.seen.has('wi0') && !W.goal.has('under')) W.goal.done('under');
      if (Q.state === 'burn' && Q.t > 1 && !S.seen.has('wi1' + S.cold)) { S.seen.add('wi1' + S.cold); row('wi1', '热水中的白磷', `${Math.round(S.Tw)} ℃，通入氧气`, '<b>在水中燃烧</b>'); W.goal.done('oxygen'); status('通入氧气后，热水中的白磷<b>在水里燃烧</b>起来了！'); }
      if (S.cold && S.Tc < 30 && S.o2 && !S.seen.has('coldO2')) { S.seen.add('coldO2'); row('coldO2', '冷水中的白磷', `${Math.round(S.Tw)} ℃，通入氧气`, '不燃烧'); status('冷水里，通了氧气，白磷也<b>不燃烧</b>——温度没有达到它的着火点（40 ℃）。'); }
      if (S.cold && !S.seen.has('coldTop') && S.cold && S.Tc < 30 && (S.coldT = (S.coldT || 0) + h) > 4) { S.seen.add('coldTop'); row('coldTop', '冷水上方铜片上的白磷', `${Math.round(S.Tc)} ℃，有空气`, '不燃烧'); status('冷水上方的铜片只有二十几摄氏度，铜片上的白磷<b>不燃烧</b>。'); }
      if (S.wood.burn > 0.5 && !S.seen.has('wood')) { S.seen.add('wood'); row('wood', '小木块（酒精灯上加热）', '有空气，在火焰上加热', '<b>很快燃烧</b>'); status('小木块很快就<b>燃烧</b>起来了。小煤块呢？'); }
      if (S.coal.hold && S.lit) S.coalT = (S.coalT || 0) + h;
      if (S.coal.hold && S.lit && S.coal.T > 420 && S.coalT > 6 && !S.seen.has('coal')) { S.seen.add('coal'); row('coal', '小煤块（同样加热）', '有空气，在火焰上加热同样长时间', '发红，<b>不燃烧</b>'); }
      if (S.seen.has('wood') && S.seen.has('coal') && S.seen.has('stone') && !W.goal.has('wood')) { W.goal.done('wood'); status('同样加热：小木块燃烧，小煤块只是发红、没有燃烧——木材的着火点（约 240–270 ℃）比煤低得多（课本表 7-1：无烟煤约 600–700 ℃）；碎石根本不是可燃物。'); }
      if (S.stone.hold && S.lit) S.stoneT = (S.stoneT || 0) + h;
      if (S.stone.hold && S.lit && S.stoneT > 5 && !S.seen.has('stone')) { S.seen.add('stone'); row('stone', '碎石（同样加热）', '有空气，在火焰上加热', '烧热了，<b>不燃烧</b>'); status('碎石怎么加热也<b>不燃烧</b>——它不是可燃物。'); }
      if (!S.c1 && !S.seen.has('candle')) { S.seen.add('candle'); row('candle', '用烧杯罩住的蜡烛', '烧杯里的氧气越来越少', '<b>熄灭</b>'); row('candle2', '没罩的蜡烛', '有空气', '继续燃烧'); W.goal.done('candle'); status('罩住的蜡烛<b>熄灭</b>了，旁边那支照样燃烧——燃烧需要氧气（空气）；把它隔绝，火就灭了。'); }
      if (W.goal.has('copper') && W.goal.has('under') && W.goal.has('oxygen') && W.goal.has('wood') && W.goal.has('candle') && W.q.el.hidden && !W.goal.has('sum')) { W.q.el.hidden = false; status('看看表里你记下的现象：燃烧需要哪些条件？'); }
      // 标签
      tags.wt.loc(group, plate.position.x + wTop.position.x, plate.position.y + 0.03, plate.position.z + 0.03).text(P.state === 'burn' ? '白磷燃烧' : P.state === 'done' ? '白磷烧完了' : '白磷');
      tags.rt.loc(group, plate.position.x + rTop.position.x, plate.position.y + 0.03, plate.position.z + 0.03).text('红磷');
      tags.wi.loc(group, BK.x - 0.035, 0.025, 0.05).text(Q.state === 'burn' ? '水中的白磷在燃烧' : '水中的白磷');
      tags.wood.loc(group, wood.position.x + 0.03, wood.position.y + 0.025, 0.02).text(S.wood.burn > 0 ? '小木块在燃烧' : S.wood.hold && S.lit ? '小木块' : '');
      tags.coal.loc(group, coal.position.x + 0.03, coal.position.y - 0.012, 0.03).text(S.coal.hold && S.lit ? (S.coal.T > 350 ? '小煤块：发红，没燃烧' : '小煤块') : '');
      tags.c1.loc(group, 0.25, 0.1, 0.05).text(!S.c1 ? '熄灭了' : S.cupOn ? '罩住了' : '');
      bagTag.loc(group, bag.position.x + 0.02, bag.position.y + 0.02, bag.position.z + 0.02).text('氧气袋');
    };

    return {
      group: root,
      pointer,
      size: { w: 0.62, d: 0.16, h: 0.24 },
      view: { elev: 16, azim: -8, lookY: 0.4, margin: 1.03 },
      mount(ui) {
        const tbl = table(['对象', '条件', '现象'], { note: '表格由你观察到的现象一行行记下来。' });
        const q = buttons(['可燃物；氧气（或空气）；温度达到着火点——三个条件缺一不可', '只要有可燃物和氧气就能燃烧', '只要温度够高就能燃烧'].map((t, j) => ({ text: t, ghost: true, onClick: () => {
          if (j === 1) return status('看表：铜片上的<b>红磷</b>有空气也不燃烧——还差什么？');
          if (j === 2) return status('看表：热水中的白磷温度够了，没有氧气也不燃烧。');
          q.el.hidden = true; W.goal.done('sum');
          status('对。燃烧需要三个条件：<b>可燃物</b>、<b>氧气（或空气）</b>、<b>温度达到着火点</b>，缺一不可。可以掀开结论看看。');
        } })));
        q.el.hidden = true;
        const waterSeg = seg('烧杯里的水', ['热水（约 80 ℃）', '冷水（约 20 ℃）'], (_, k) => A.water(!!k));
        const alt = h('details', { class: 'how-to' }, h('summary', {}, '用按钮做（不方便拖动时）'), buttons([
          { text: '把铜片盖到烧杯上', ghost: true, onClick: () => A.plate() },
          { text: '向水中的白磷通氧气', ghost: true, onClick: () => { nozAt(NOZ_IN); A.oxygen(true); } },
          { text: '停止通氧气', ghost: true, onClick: () => { nozHome(); A.oxygen(false); } },
          { text: '点燃酒精灯，同时加热木块、煤块和碎石', ghost: true, onClick: () => { wood.position.set(0.083, 0.095, 0); coal.position.set(0.097, 0.095, 0); stone.position.set(0.09, 0.095, 0.012); S.stone.hold = true; A.both(); } },
          { text: '加热碎石', ghost: true, onClick: () => { if (!S.lit) S.lit = true; stone.position.set(0.09, 0.095, 0.012); S.stone.hold = true; } },
          { text: '用烧杯罩住左边的蜡烛', ghost: true, onClick: () => A.cover(true) },
        ]).el);
        const again = buttons([{ text: '↩ 回到整套器材', ghost: true, onClick: () => far() }, { text: '再做一次', ghost: true, onClick: () => A.reset() }]);
        const safe = h('p', { class: 'fineprint warn', html: '课本提示：白磷有毒，烧杯中的实验由教师演示，在通风橱中进行；没有白磷的学校可以看实验视频。加热时要从侧面观察，防止烧伤。' });
        ui.controls.append(tbl.el, q.el, waterSeg.el, again.el, alt, safe);
        W = { tbl, q, status: (m) => ui.status(m), goal: goals(ui, [['copper', '比较铜片上的白磷和红磷'], ['under', '比较铜片上的白磷和热水中的白磷'], ['oxygen', '向热水中的白磷通入氧气'], ['wood', '在火焰上加热小木块、小煤块和碎石'], ['candle', '用烧杯罩住一支蜡烛'], ['sum', '总结：燃烧需要哪些条件']]) };
        ui.status('烧杯里是约 80 ℃ 的热水，水里有一块白磷。把桌上的<b>薄铜片</b>（一端放白磷、一端放红磷）<b>拖到烧杯上</b>盖好，看看哪处的磷会燃烧。');
      },
      update(dt, t) { step(dt, t); },
      dispose() { bubs.dispose(); smoke.dispose(); smokeIn.dispose(); },
      debug: { get S() { return S; }, A, wood, coal, cup },
    };
  },
};
