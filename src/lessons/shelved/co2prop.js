// 课题2 碳的氧化物 · 二氧化碳的性质（课本第 136–138 页：实验 6-3 倾倒二氧化碳、实验 6-4 二氧化碳的溶解性、实验 6-5 二氧化碳与水反应）。
//
// 桌上三处，照课本的顺序做：
//   左：烧杯里一个小阶梯，高低两支燃着的蜡烛（图 6-10）。把一瓶二氧化碳沿烧杯壁慢慢倒进去——下面的蜡烛先熄灭，上面的后熄灭。
//   中：收集满二氧化碳的软塑料瓶（图 6-11）。加约 1/3 容积的水，立即旋紧瓶盖，振荡——瓶子变瘪。
//   右：三朵用石蕊染成紫色的干燥纸花（图 6-12）。I 喷水；II 放进二氧化碳；III 喷水后放进二氧化碳（变红）；取出 III 吹干（又变紫）。
// 看不见的东西：二氧化碳 = 深灰点；空气 = 浅灰点（每 5 个里 1 个蓝点 = 氧气）；吹风机的热风 = 橙色。
// 模型（近似，界面上写明）：
//   · 烧杯里的气体按高度分 22 层，每层记二氧化碳占的比例。慢慢倒：二氧化碳沉到最下面、一层层往上堆（少量和空气混合）；
//     一下子倒：大量空气被卷进来、一部分从杯口冲出去，杯里的二氧化碳被冲淡。各层之间有扩散，杯口那一层慢慢跑掉。
//     蜡烛所在那一层的氧气 = 21% ×（1 − 二氧化碳比例），低于约 16% 时熄灭（近似）。
//   · 塑料瓶：20 ℃、1 个大气压下 1 体积水约溶解 0.88 体积二氧化碳（课本：约 1 体积）。旋紧瓶盖后，溶进水里多少，瓶里的气体就少多少——软瓶被大气压压瘪。
//     振荡让溶解快得多；瓶盖没拧上时，外面的空气补进来，瓶子不瘪。
//   · 纸花：湿的纸花在二氧化碳里，二氧化碳和水生成碳酸，石蕊变红；干纸花、只喷水的纸花都不变。吹干时碳酸分解，二氧化碳跑掉，又变回紫色。
import * as THREE from 'three';
import { buttons, seg, table } from './kit/ui.js';
import { draggable, clamp, lerp } from './kit/interact.js';
import { canvasTex } from './kit/props.js';
import { Particles } from './kit/fx.js';
import { gasJar, chemBeaker, chemCandle, glassMat, CHEM } from './kit/chem.js';
import { smoke2, water2 } from './kit/chemfx.js';
import { lessonBar } from './kit/lessonbar.js';
import { qaFlow, sandbox, wrapPointer, paperSheet, think } from './kit/chemlesson.js';
import { sfx } from './kit/audio.js';
import { paint, inked } from '../live/ink.js';
import { h } from '../ui/Panel.js';

const AIR_O2 = 0.21, O2_OUT = 0.16;
const DARK = 0x3d4350, LIGHT = 0xb9bec8, BLUE = 0x2f7fd8, HEAT = 0xff9a3c;
const PURPLE = new THREE.Color(0x8b5fb0), RED = new THREE.Color(0xd9455f), WETK = new THREE.Color(0x4f3570);

// ---- 左：倾倒二氧化碳 ----
const BK = new THREE.Vector3(-0.17, 0, 0), BKR = 0.036, BKH = 0.088;           // 烧杯（约 330 mL）
const NL = 22, LAYER = BKH / NL;
const V_BK = Math.PI * (BKR - 0.0012) ** 2 * BKH * 1e6;                           // mL
const STEP = { x: BK.x + 0.014, w: 0.03, h: 0.022 };                            // 照图 6-10：上面那支蜡烛的火焰约在杯高一半多一点                               // 烧杯里的小阶梯（右半边）
const LOW = new THREE.Vector3(BK.x - 0.015, 0, 0), HIGH = new THREE.Vector3(STEP.x + 0.002, STEP.h, 0);
const C_H = 0.022;                                                                // 蜡烛高
const JA_HOME = new THREE.Vector3(-0.085, 0, 0), JAR_R = 0.03, JAR_H = 0.1;       // 一瓶二氧化碳（约 260 mL），盖着玻璃片
const V_JAR = Math.PI * JAR_R * JAR_R * JAR_H * 0.92 * 1e6;
const RIM = new THREE.Vector3(BK.x + BKR - 0.004, BKH + 0.004, 0);                // 瓶口靠在烧杯口的这里倒
// ---- 中：软塑料瓶 ----
const BOT = new THREE.Vector3(0.03, 0, 0), BR = 0.031;
// 瓶身沿高度细分（每 4.5 mm 一圈），压瘪时才能凹得自然
const BOT_PTS = [[0.0003, 0], [BR - 0.003, 0], [BR, 0.004], ...Array.from({ length: 20 }, (_, i) => [BR, 0.008 + i * 0.0046]), [0.029, 0.102], [0.026, 0.11], [0.02, 0.118], [0.014, 0.125], [0.011, 0.128], [0.011, 0.14]];
const V_BOT = 330;                                                                // mL（模型）
const BOT_MOUTH = BOT.clone().add(new THREE.Vector3(0, 0.14, 0));
const CUP_HOME = new THREE.Vector3(0.088, 0, 0), CUP_R = 0.026, CUP_H = 0.07, CUP_V = 160;
const CAP_HOME = new THREE.Vector3(0.075, 0, 0.06);
const SOL = 0.88;                                                                 // 20 ℃：1 体积水约溶解 0.88 体积二氧化碳
// ---- 右：石蕊纸花 ----
const TRAY = new THREE.Vector3(0.2, 0, 0.066);
const SLOTS = [new THREE.Vector3(0.163, 0.004, 0.068), new THREE.Vector3(0.2, 0.004, 0.068), new THREE.Vector3(0.237, 0.004, 0.068)];
const JARS = [new THREE.Vector3(0.175, 0, -0.025), new THREE.Vector3(0.235, 0, -0.025)], CJ_R = 0.024, CJ_H = 0.075;
const SPRAY_HOME = new THREE.Vector3(0.13, 0, 0.075), DRYER_HOME = new THREE.Vector3(0.285, 0, 0.06);
const ROMAN = ['I', 'II', 'III'];
const STATIONS = { A: [[-0.135, 0.075, 0], [0.12, 0.28, 1], 0.36], B: [[0.05, 0.07, 0], [0.1, 0.25, 1], 0.44], C: [[0.205, 0.03, 0.02], [0.05, 0.55, 1], 0.36] };

/** 纸花：两圈花瓣 + 花心。.mat 是这朵花自己的材质（颜色会变） */
function paperFlower() {
  const g = new THREE.Group();
  const mat = paint(0x8b5fb0, { keep: true, unique: true });
  const pet = new THREE.SphereGeometry(1, 12, 6);
  for (const [n, rr, sx, sz, tilt, y] of [[7, 0.0068, 0.0062, 0.0042, 0.25, 0.001], [5, 0.0036, 0.0046, 0.0032, 0.55, 0.0028]]) {
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + (n === 5 ? 0.3 : 0);
      const p = inked(new THREE.Mesh(pet, mat), { width: 0.35, color: 0x4a3558, opacity: 0.6 });
      p.scale.set(sx, 0.0013, sz); p.position.set(Math.cos(a) * rr, y, Math.sin(a) * rr); p.rotation.set(0, -a, tilt);
      g.add(p);
    }
  }
  const core = new THREE.Mesh(new THREE.SphereGeometry(0.0026, 10, 8), mat); core.position.y = 0.0038; core.scale.y = 0.7; g.add(core);
  const pick = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.014, 0.014, 10), new THREE.MeshBasicMaterial({ visible: false })); pick.position.y = 0.005; pick.userData.pick = true; g.add(pick);
  g.mat = mat; g.pick = pick;
  return g;
}

export default {
  id: 'co2prop',
  fig: '图6-10',
  title: '二氧化碳的性质',
  stampText: '实验',
  style: 'paper',
  predict: {
    q: '把一瓶二氧化碳沿烧杯壁慢慢倒进烧杯，杯里阶梯上一高一低两支蜡烛正燃着——会怎样？',
    hint: '课本第 136 页实验 6-3。想想二氧化碳比空气重还是轻。',
    options: ['下面的蜡烛先熄灭，上面的后熄灭', '上面的蜡烛先熄灭，下面的后熄灭', '两支同时熄灭', '都不会熄灭'],
    answer: 0,
  },
  need: '倾倒二氧化碳（看两支蜡烛）；向装满二氧化碳的软塑料瓶加水、旋紧、振荡；用三朵石蕊纸花看二氧化碳和水的反应',
  conclusion: {
    crops: [{ page: 143, rect: [90, 561, 427, 597] }, { page: 144, rect: [68, 55, 455, 153] }],
    quote: '二氧化碳与水反应生成碳酸，碳酸能使紫色石蕊溶液变成红色。碳酸很不稳定，容易分解生成二氧化碳和水。当吹干纸花时，碳酸分解，二氧化碳从溶液里逸出，所以纸花的颜色又变成紫色。',
    formula: 'CO₂ + H₂O ══ H₂CO₃　　H₂CO₃ ══ CO₂↑ + H₂O',
    why: '倾倒二氧化碳：下面的蜡烛先熄灭——二氧化碳的<b>密度比空气大</b>，沉在烧杯底部一层层往上堆；蜡烛熄灭——二氧化碳<b>不能燃烧，也不支持燃烧</b>。<br>软塑料瓶变瘪：二氧化碳<b>能溶于水</b>（通常 1 体积水约溶解 1 体积二氧化碳），瓶里的气体变少，外面的大气压把瓶子压瘪。<br>纸花：只喷水不变色，干纸花放进二氧化碳不变色，喷水后放进二氧化碳才变红——是二氧化碳和水<b>反应</b>生成的碳酸使石蕊变红；吹干后又变紫——碳酸不稳定，分解了。',
    src: '课本第 136–138 页 · 第六单元 课题2 碳的氧化物（实验 6-3、6-4、6-5）；二氧化碳在水中的溶解度：20 ℃ 约 0.88 体积 / 1 体积水',
  },

  create({ tag, look, back }) {
    const root = new THREE.Group(), group = new THREE.Group();
    root.add(group);
    let S = null, W = null;
    const status = (m) => { if (!S.demo) W?.status(m); };
    const done = (id) => { if (!S.demo) bar.done(id); };
    const log = (row) => { if (!S.demo) { W?.tbl.add(row); S.rows.push(row); } };
    let focus = '', here = '';          // focus：学生做到哪一处（镜头跟过去）；here：镜头现在对着哪一处（演示时跟着镜头走）——卡片只在它那一处显示
    const goStation = (k) => { if (S.demo || focus === k) return; focus = here = k; const [c, d, dist] = STATIONS[k]; look(c, d, dist, () => { focus = here = ''; }); };

    paperSheet(group, { w: 0.62, d: 0.26, x: 0.06, z: 0.02 });

    // ================= 左：烧杯、阶梯、蜡烛、一瓶二氧化碳 =================
    const bk = chemBeaker({ r: BKR, h: BKH, level: 0, marks: false }); bk.position.copy(BK); group.add(bk);
    const stepBox = inked(new THREE.Mesh(new THREE.BoxGeometry(STEP.w, STEP.h, 0.034), paint(0xb7bcc4)), { width: 0.6 });       // 铁皮做的小阶梯
    stepBox.position.set(STEP.x, STEP.h / 2 + 0.0012, 0); group.add(stepBox);
    const cLow = chemCandle({ height: C_H, r: 0.0055 }); cLow.position.copy(LOW).add(new THREE.Vector3(0, 0.0012, 0)); group.add(cLow);
    const cHigh = chemCandle({ height: C_H, r: 0.0055 }); cHigh.position.copy(HIGH).add(new THREE.Vector3(0, 0.0012, 0)); group.add(cHigh);
    const WICK = [LOW.y + C_H + 0.006, HIGH.y + C_H + 0.006];
    const smoke = smoke2({ max: 60, color: 0xd9dbe0, opacity: 0.5 }); group.add(smoke.mesh);
    // 一瓶二氧化碳：转轴在瓶口（倒的时候绕瓶口转）
    const pourer = new THREE.Group(); group.add(pourer);
    const jarA = gasJar({ r: JAR_R, h: JAR_H }); jarA.position.y = -JAR_H; pourer.add(jarA); jarA.setWater(0);
    const jarAPick = jarA.pick;

    // ================= 中：软塑料瓶、一杯水、瓶盖 =================
    const botGeo = new THREE.LatheGeometry(BOT_PTS.map(([r, y]) => new THREE.Vector2(r, y)), 40);
    const botBase = Float32Array.from(botGeo.attributes.position.array);
    const bottle = new THREE.Group(); bottle.position.copy(BOT); group.add(bottle);
    const botMesh = new THREE.Mesh(botGeo, glassMat({ opacity: 0.26 })); botMesh.renderOrder = 9; bottle.add(botMesh);
    const ring = inked(new THREE.Mesh(new THREE.CylinderGeometry(0.0125, 0.0125, 0.003, 24), paint(0xdfe6ea)), { width: 0.5 }); ring.position.y = 0.129; bottle.add(ring);
    let botWater = null, waterKey = '';
    const botPick = new THREE.Mesh(new THREE.CylinderGeometry(BR + 0.004, BR + 0.004, 0.14, 12), new THREE.MeshBasicMaterial({ visible: false })); botPick.position.y = 0.07; botPick.userData.pick = true; bottle.add(botPick);
    const cap = inked(new THREE.Mesh(new THREE.CylinderGeometry(0.0125, 0.0125, 0.012, 24), paint(0x3f7fc4, { keep: true })), { width: 0.6 }); group.add(cap);
    const capPick = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.022, 10), new THREE.MeshBasicMaterial({ visible: false })); capPick.userData.pick = true; cap.add(capPick);
    const cupPivot = new THREE.Group(); group.add(cupPivot);              // 转轴在杯嘴
    const cup = chemBeaker({ r: CUP_R, h: CUP_H, level: 0.05, color: CHEM.water, marks: true }); cup.position.set(CUP_R + 0.003, -CUP_H, 0); cupPivot.add(cup);
    const cupPick = new THREE.Mesh(new THREE.CylinderGeometry(CUP_R + 0.004, CUP_R + 0.004, CUP_H, 12), new THREE.MeshBasicMaterial({ visible: false })); cupPick.position.y = CUP_H / 2; cupPick.userData.pick = true; cup.add(cupPick);
    const drops = new Particles({ max: 80, geometry: new THREE.SphereGeometry(1, 6, 5), material: water2({ color: CHEM.water, base: 0.5 }) }); group.add(drops.mesh);

    // ================= 右：托盘上的三朵纸花、两瓶二氧化碳、喷壶、吹风机 =================
    const tray = inked(new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.003, 0.036), paint(0xf2eee4)), { width: 0.5 }); tray.position.copy(TRAY).add(new THREE.Vector3(0, 0.0015, 0)); tray.scale.set(1.1, 1, 1.25); group.add(tray);
    const flowers = [0, 1, 2].map(() => { const f = paperFlower(); f.scale.setScalar(1.4); group.add(f); return f; });        // 直径约 4 cm，和集气瓶口差不多
    const fLabels = flowers.map((_, i) => tag(ROMAN[i], 'pill'));
    const cjars = JARS.map((p) => { const j = gasJar({ r: CJ_R, h: CJ_H }); j.position.copy(p); j.setWater(0); group.add(j); return j; });
    const spray = new THREE.Group(); group.add(spray);
    {
      const body = inked(new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.045, 0.013), paint(0xf08a3c, { keep: true })), { width: 0.6 }); body.position.y = 0.0225;
      const label = new THREE.Mesh(new THREE.PlaneGeometry(0.013, 0.024), paint(0xf3efc8, { keep: true })); label.position.set(0, 0.022, 0.0066);
      const neck = inked(new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.005, 0.008, 12), paint(0xf4f4f2)), { width: 0.5 }); neck.position.y = 0.049;
      const head = inked(new THREE.Mesh(new THREE.CylinderGeometry(0.0042, 0.0048, 0.014, 14), paint(0xe8eaec)), { width: 0.5 }); head.rotation.z = Math.PI / 2 + 0.12; head.position.set(-0.004, 0.057, 0);
      const noz = inked(new THREE.Mesh(new THREE.CylinderGeometry(0.0016, 0.002, 0.006, 10), paint(0x9aa3ad)), { width: 0.4 }); noz.rotation.z = Math.PI / 2; noz.position.set(-0.013, 0.058, 0);
      const trig = inked(new THREE.Mesh(new THREE.BoxGeometry(0.0025, 0.011, 0.005), paint(0xe8eaec)), { width: 0.4 }); trig.position.set(-0.008, 0.047, 0); trig.rotation.z = 0.35;
      spray.add(body, label, neck, head, noz, trig);
    }
    const sprayPick = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.066, 0.024), new THREE.MeshBasicMaterial({ visible: false })); sprayPick.position.y = 0.032; sprayPick.userData.pick = true; spray.add(sprayPick);
    const NOZ = new THREE.Vector3(-0.016, 0.057, 0);                     // 喷壶的嘴（喷壶自己的坐标）
    const dryer = new THREE.Group(); group.add(dryer);
    {
      const barrel = inked(new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.011, 0.055, 20), paint(0x9aaabb)), { width: 0.6 }); barrel.rotation.z = Math.PI / 2; barrel.position.set(0, 0.045, 0);
      const mouth = inked(new THREE.Mesh(new THREE.CylinderGeometry(0.0085, 0.0105, 0.01, 18), paint(0x6f7f90)), { width: 0.5 }); mouth.rotation.z = Math.PI / 2; mouth.position.set(-0.031, 0.045, 0);
      const handle = inked(new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.036, 0.014), paint(0x9aaabb)), { width: 0.6 }); handle.position.set(0.012, 0.019, 0); handle.rotation.z = -0.18;
      dryer.add(barrel, mouth, handle);
    }
    const dryerPick = new THREE.Mesh(new THREE.BoxGeometry(0.062, 0.06, 0.028), new THREE.MeshBasicMaterial({ visible: false })); dryerPick.position.y = 0.032; dryerPick.userData.pick = true; dryer.add(dryerPick);
    const DRY_MOUTH = new THREE.Vector3(-0.036, 0.045, 0);

    // ================= 气体小点、水雾、热风 =================
    const dotTex = canvasTex(64, 64, (g, Wd) => { const gr = g.createRadialGradient(Wd / 2, Wd / 2, 0, Wd / 2, Wd / 2, Wd / 2); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.55, 'rgba(255,255,255,1)'); gr.addColorStop(0.75, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, Wd, Wd); });
    const darkP = new Particles({ max: 400, sprite: true, color: DARK }), lightP = new Particles({ max: 300, sprite: true, color: LIGHT }), blueP = new Particles({ max: 90, sprite: true, color: BLUE }), heatP = new Particles({ max: 120, sprite: true, color: HEAT }), mistP = new Particles({ max: 120, sprite: true, color: 0x8ccbe8 });
    for (const p of [darkP, lightP, blueP, heatP, mistP]) { p.mat.uniforms.map.value = dotTex; p.mesh.renderOrder = 10; group.add(p.mesh); }
    const rnd = (a, b) => a + Math.random() * (b - a);
    const inStepOrCandle = (x, y, z) => (x > STEP.x - STEP.w / 2 - 0.002 && y < STEP.h + 0.003) || (Math.hypot(x - LOW.x, z) < 0.008 && y < LOW.y + C_H + 0.004) || (Math.hypot(x - HIGH.x, z) < 0.008 && y > STEP.h && y < HIGH.y + C_H + 0.004);
    const bkDots = [];
    while (bkDots.length < 90) {
      const u = Math.sqrt(Math.random()) * (BKR - 0.005), th = Math.random() * Math.PI * 2, y = rnd(0.003, BKH - 0.004);
      const x = BK.x + Math.cos(th) * u, z = Math.sin(th) * u;
      if (inStepOrCandle(x, y, z)) continue;
      bkDots.push({ base: new THREE.Vector3(x, y, z), p: new THREE.Vector3(), rank: Math.random(), ph: Math.random() * 6, blue: bkDots.length % 5 === 0, size: 0.0034, alpha: 0.9 });
    }
    const jarDots = Array.from({ length: 46 }, (_, i) => ({ u: Math.sqrt(Math.random()) * 0.85, th: Math.random() * Math.PI * 2, y: rnd(0.05, 0.93), rank: Math.random(), ph: Math.random() * 6, blue: i % 5 === 0, p: new THREE.Vector3(), size: 0.0036, alpha: 0.92 }));
    const botDots = Array.from({ length: 44 }, (_, i) => ({ u: Math.sqrt(Math.random()) * 0.82, th: Math.random() * Math.PI * 2, y: Math.random(), rank: (i + 0.5) / 44, ph: Math.random() * 6, blue: i % 5 === 0, p: new THREE.Vector3(), size: 0.0034, alpha: 0.9 }));
    const solDots = Array.from({ length: 30 }, (_, i) => ({ u: Math.sqrt(Math.random()) * 0.8, th: Math.random() * Math.PI * 2, y: Math.random(), rank: (i + 0.5) / 30, ph: Math.random() * 6, p: new THREE.Vector3(), size: 0.0022, alpha: 0.75 }));
    const cjDots = cjars.map(() => Array.from({ length: 18 }, () => ({ u: Math.sqrt(Math.random()) * 0.8, th: Math.random() * Math.PI * 2, y: rnd(0.06, 0.9), ph: Math.random() * 6, p: new THREE.Vector3(), size: 0.0032, alpha: 0.85 })));
    const stream = [];          // 倒出来的二氧化碳：从瓶口往下落
    const leaving = [];         // 吹干时从纸花上跑掉的二氧化碳

    // ================= 卡片 =================
    const bkCard = tag('', 'cond'); bkCard.px = [-120, -100];
    const botCard = tag('', 'cond'); botCard.px = [80, -40];

    // ================= 状态 =================
    const fresh = () => ({
      demo: false, rows: [],
      // 左
      layers: new Array(NL).fill(0), jarC: 1, jarA: 'home', carry: null, tilt: 0, plateA: true, fast: false, poured: 0,
      lit: [true, true], dim: [0, 0], outT: [0, 0], outAt: [0, 0], outOrder: [], pourLogged: false,
      // 中
      vw: 0, cupV: CUP_V, cupAt: 'home', cupCarry: null, cupTilt: 0, capOn: false, dis: 0, air: 0, shakeE: 0, shakeT: 0, botOff: new THREE.Vector3(), lastShake: null,
      waterLogged: false, shakeLogged: false, openLogged: false,
      // 右
      fl: [0, 1, 2].map((i) => ({ at: 'tray', slot: i, wet: 0, acid: 0, peak: 0, outT: 0, inT: 0, carry: null, dryT: 0 })),
      sprayAt: null, dryerAt: null, sprayT: 0, logged: {},
    });
    S = fresh();

    // ---- 左：倒的模型 ----
    const layerOf = (y) => clamp(Math.floor(y / LAYER), 0, NL - 1);
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
    const relaxLayers = (h) => {
      const L = S.layers, D = 0.35 * h, nx = L.slice();
      for (let i = 0; i < NL; i++) { const a = L[Math.max(0, i - 1)], b = L[Math.min(NL - 1, i + 1)]; nx[i] = L[i] + D * (a + b - 2 * L[i]); }
      nx[NL - 1] -= nx[NL - 1] * 0.25 * h;           // 杯口那一层慢慢跑出去
      for (let i = 0; i < NL; i++) L[i] = clamp(nx[i], 0, 1);
    };
    const co2At = (y) => { const f = y / LAYER - 0.5, i = clamp(Math.floor(f), 0, NL - 1), j = clamp(i + 1, 0, NL - 1), k = clamp(f - i, 0, 1); return lerp(S.layers[i], S.layers[j], k); };

    // ---- 中：塑料瓶 ----
    const dEq = () => SOL * S.vw;                               // 溶解平衡时溶进水里的二氧化碳（mL，1 个大气压）
    const squeeze = () => (S.capOn ? clamp(S.dis / V_BOT, 0, 0.62) : 0);        // 瓶子少了的体积占多少
    let lastSq = -1;
    const deform = (sq) => {
      if (Math.abs(sq - lastSq) < 0.002) return; lastSq = sq;
      const a = Math.min(0.85, sq / 0.56), pos = botGeo.attributes.position;
      for (let i = 0; i < pos.count; i++) {
        const x = botBase[i * 3], y = botBase[i * 3 + 1], z = botBase[i * 3 + 2];
        const k = 1 - a * dentAt(Math.atan2(z, x), y);
        pos.setXYZ(i, x * k, y, z * k);
      }
      pos.needsUpdate = true; botGeo.computeVertexNormals();
      waterKey = '';
    };
    // 凹陷：瓶身中部最深，往瓶底、瓶肩渐浅；两侧被压进去，再加几道皱
    const dentAt = (th, y) => { if (y < 0.006 || y > 0.104) return 0; const b = Math.pow(Math.sin((Math.PI * (y - 0.006)) / 0.098), 0.8); return b * (0.5 + 0.42 * Math.cos(2 * th + 0.6) + 0.08 * Math.sin(5 * th + y * 140)); };
    const waterH = () => (S.vw * 1e-6) / (Math.PI * (BR - 0.001) ** 2);
    const rebuildWater = () => {
      const hw = Math.min(0.094, waterH()), key = hw.toFixed(4) + '|' + lastSq.toFixed(3);
      if (key === waterKey) return; waterKey = key;
      if (botWater) { bottle.remove(botWater); botWater.geometry.dispose(); }
      if (hw < 0.001) { botWater = null; return; }
      const nSide = Math.max(2, Math.ceil((hw - 0.004) / 0.003)), side = Array.from({ length: nSide + 1 }, (_, i) => new THREE.Vector2(BR - 0.0012, 0.004 + ((hw - 0.004) * i) / nSide));
      const geo = new THREE.LatheGeometry([new THREE.Vector2(0.0003, 0.0012), new THREE.Vector2(BR - 0.0042, 0.0012), ...side, new THREE.Vector2(0.0003, hw)], 40);
      const a = Math.min(0.85, lastSq / 0.56), pos = geo.attributes.position;
      for (let i = 0; i < pos.count; i++) { const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i), k = 1 - a * dentAt(Math.atan2(z, x), y); pos.setXYZ(i, x * k, y, z * k); }
      geo.computeVertexNormals();
      botWater = new THREE.Mesh(geo, water2({ color: CHEM.water })); botWater.renderOrder = 7; botWater.raycast = () => {}; bottle.add(botWater);
    };

    // ---- 右：纸花 ----
    const flowerPos = (f) => (f.carry ? f.carry : f.at === 'tray' ? SLOTS[f.slot] : JARS[f.at === 'jar0' ? 0 : 1].clone().add(new THREE.Vector3(0, 0.006, 0)));
    const freeSlot = (i) => { const used = S.fl.filter((f, j) => j !== i && f.at === 'tray').map((f) => f.slot); return used.includes(S.fl[i].slot) ? [0, 1, 2].find((k) => !used.includes(k)) : S.fl[i].slot; };
    const nearestFlower = (p, r = 0.045) => { let best = -1, bd = r; S.fl.forEach((f, i) => { if (f.at !== 'tray' || f.carry) return; const q = SLOTS[f.slot], d = Math.hypot(q.x - p.x, q.z - p.z); if (d < bd) { bd = d; best = i; } }); return best; };

    // ================= 操作 =================
    const A = {
      jarDrag(p) { if (!p) return; S.jarA = 'carry'; S.carry = p.clone(); },
      jarDrop() {
        if (S.jarA === 'rim') { S.jarA = 'home'; if (S.poured > 20) A.afterPour(); }
        else S.jarA = 'home';
        S.carry = null;
      },
      afterPour() {
        if (S.pourLogged || S.demo) return;
        S.pourLogged = true;
      },
      cupDrag(p) { if (!p) return; S.cupAt = 'carry'; S.cupCarry = p.clone(); },
      cupDrop() {
        S.cupAt = 'home'; S.cupCarry = null;
        if (S.vw > 5 && !S.waterLogged) {
          S.waterLogged = true;
          const f = S.vw / V_BOT;
          log(['向软塑料瓶里加水', `加了约 ${Math.round(S.vw)} mL（约占瓶子容积的 ${f < 0.27 ? '不到 1/3' : f > 0.42 ? '一半左右' : '1/3'}）`, '']);
          done('water');
          status(`加了约 <b>${Math.round(S.vw)} mL</b> 水。<b>立即</b>旋紧瓶盖（点一下桌上的<b>瓶盖</b>）。`);
        }
      },
      capTap() {
        if (S.capOn) return status('瓶盖已经旋紧了。拿起瓶子<b>振荡</b>（按住瓶子左右晃）。');
        if (S.vw < 5) return status('先往瓶里加约 1/3 容积的水，再旋紧瓶盖。');
        S.capOn = true; S.air = 0; sfx.clink({ freq: 1400, gain: 0.04 }); done('cap');
        status('旋紧了瓶盖。现在<b>振荡</b>瓶子：按住瓶子，左右来回拖几下。');
      },
      shake(p) {
        const last = S.lastShake; S.lastShake = p.clone();
        if (!last) return;
        S.shakeE = Math.min(1, S.shakeE + Math.min(0.5, Math.abs(p.x - last.x) * 18));
        S.botOff.set(clamp(p.x - BOT.x, -0.012, 0.012), 0, 0);
      },
      shakeEnd() { S.lastShake = null; },
      flowerDrag(i, p) { if (!p) return; S.fl[i].carry = new THREE.Vector3(p.x, 0.035, p.z); },
      flowerDrop(i) {
        const f = S.fl[i], p = f.carry; f.carry = null; if (!p) return;
        const j = JARS.findIndex((q) => Math.hypot(q.x - p.x, q.z - p.z) < 0.03);
        if (j >= 0 && !S.fl.some((g, k) => k !== i && g.at === 'jar' + j)) {
          f.at = 'jar' + j; f.inT = 0; sfx.clink({ freq: 1800, gain: 0.03 });
          status(f.wet > 0.3 ? `把喷过水的纸花 ${ROMAN[i]} 放进了盛满二氧化碳的集气瓶。看它的颜色。` : `把干燥的纸花 ${ROMAN[i]} 放进了盛满二氧化碳的集气瓶。看它的颜色。`);
        } else { f.at = 'tray'; f.slot = freeSlot(i); f.outT = 0; }
      },
      sprayAt(p) { if (!p) return; S.sprayAt = new THREE.Vector3(p.x, 0, p.z); },
      sprayDrop() {
        const p = S.sprayAt; S.sprayAt = null; if (!p) return;
        const i = nearestFlower(p.clone().add(new THREE.Vector3(-0.025, 0, 0)), 0.04);
        if (i < 0) return;
        S.sprayHold = p; A.wet(i);
      },
      wet(i) {
        const f = S.fl[i]; if (f.at !== 'tray') return;
        f.wet = 1; f.outT = 0; S.sprayT = 0.6; S.sprayFlower = i; sfx.clink({ freq: 3000, gain: 0.02 });
        status(`给纸花 ${ROMAN[i]} 喷了水。看它变不变色。`);
      },
      dryerAt(p) { if (!p) return; S.dryerAt = new THREE.Vector3(p.x, 0, p.z); },
      dryerDrop() { S.dryerAt = null; },
      reset() {
        S = fresh(); stream.length = 0; leaving.length = 0; smoke.clear(); drops.clear(); W?.tbl.clear(); focus = here = ''; back();
        if (W) { W.t1.close(); W.t2.close(); W.next.hidden = true; for (const s of W.cells) s.set(-1); W.fastSeg.set(0); }
        bar.undo('pour', 'water', 'cap', 'shake', 'table', 'f1', 'f2', 'f3', 'dry', 'why');
        status('全部重新摆好了，记录也清空了。');
      },
    };

    // ================= 底部步骤栏 + 老师的演示 =================
    const flowerFor = (want) => S.fl.findIndex(want);
    const bar = lessonBar({
      look, back, group,
      steps: [
        { id: 'pour', title: '倾倒二氧化碳', todo: '把右边那瓶<b>二氧化碳</b>拖到烧杯口，按住不放：沿杯壁<b>慢慢</b>倒进去。看两支蜡烛。', target: () => (S.jarA === 'home' ? jarA : null) },        // 拿在手上的时候不套光圈
        { id: 'water', title: '加水', todo: '把那杯<b>水</b>拖到软塑料瓶口，倒进约 <b>1/3</b> 容积的水（看瓶上的卡片），松手停止。', target: () => (S.cupAt === 'home' ? cup : null) },
        { id: 'cap', title: '旋紧瓶盖', todo: '<b>立即</b>点一下桌上的<b>瓶盖</b>，旋紧。', target: () => cap },
        { id: 'shake', title: '振荡', todo: '按住<b>塑料瓶</b>，左右来回拖几下（振荡）。看瓶子。', target: () => bottle },
        { id: 'table', title: '填表', todo: '根据刚才的两个实验，在左边把课本上的表填好。' },
        { id: 'f1', title: '纸花 I：喷水', todo: '把<b>喷壶</b>拖到一朵纸花旁边，给它喷水。看它变不变色。', target: () => spray },
        { id: 'f2', title: '纸花 II：放进二氧化碳', todo: '把一朵<b>干燥的</b>纸花拖进集气瓶（瓶里是二氧化碳）。', target: () => { const i = flowerFor((f) => f.at === 'tray' && f.wet < 0.1); return i >= 0 ? flowers[i] : null; } },
        { id: 'f3', title: '纸花 III：喷水后放进二氧化碳', todo: '给另一朵纸花<b>喷上水</b>，再把它拖进另一个集气瓶。', target: () => { const i = flowerFor((f, j) => f.at === 'tray' && f.wet > 0.5 && j !== S.logged.wetOnly - 1); return i >= 0 ? flowers[i] : spray; } },
        { id: 'dry', title: '吹干', todo: '把变红的纸花<b>拿出来</b>放回托盘，用<b>吹风机</b>对着它吹。', target: () => { const i = flowerFor((f) => f.acid > 0.5); if (i < 0) return null; return S.fl[i].at === 'tray' ? dryer : flowers[i]; } },
        { id: 'why', title: '想一想', todo: '纸花为什么变红、又为什么变回紫色？在左边作答。' },
      ],
      reels: {
        demo: {
          seal: '演示', label: '老师演示',
          ...sandbox({ get: () => S, set: (s) => { S = s; }, fresh, bar: () => bar,
            apply: () => { stream.length = 0; leaving.length = 0; smoke.clear(); drops.clear(); focus = here = ''; } }),      // 演示结束镜头回到全景：下一帧再移到学生正在做的那一处
          shots: [
            { cap: '把二氧化碳沿烧杯壁慢慢倒进烧杯：二氧化碳沉到杯底，一层层往上堆。', dur: 5, speed: 1.5, cam: STATIONS.A, enter: () => { here = 'A';  S.jarA = 'rim'; } },
            { cap: '下面的蜡烛先熄灭，上面的后熄灭：二氧化碳的密度比空气大；它不能燃烧，也不支持燃烧。', dur: 4, speed: 1.5, cam: STATIONS.A, enter: () => { here = 'A';  S.jarA = 'home'; } },
            { cap: '向集满二氧化碳的软塑料瓶里加约 1/3 容积的水，立即旋紧瓶盖。', dur: 3, cam: STATIONS.B, enter: () => { here = 'B';  S.vw = V_BOT / 3; S.cupV = CUP_V - S.vw; S.capOn = true; } },
            { cap: '振荡：二氧化碳溶进水里，瓶里的气体变少，瓶子被外面的大气压压瘪了。', dur: 4, speed: 2, cam: STATIONS.B, enter: () => { here = 'B'; }, during: () => { S.shakeE = 1; } },
            { cap: '纸花喷上水，再放进二氧化碳里：变成了红色。', dur: 4, speed: 1.5, cam: STATIONS.C, enter: () => { here = 'C';  S.fl[2].wet = 1; S.fl[2].at = 'jar1'; } },
            { cap: '拿出来吹干：又变回紫色——二氧化碳和水生成的碳酸不稳定，分解了。演示完了，下面换你自己做。', dur: 4.5, speed: 2, cam: STATIONS.C, enter: () => { here = 'C';  S.fl[2].at = 'tray'; S.fl[2].slot = 2; S.dryerAt = SLOTS[2].clone().add(new THREE.Vector3(0.05, 0, 0)); } },
          ],
        },
      },
    });

    const drag = draggable(group, [
      { obj: jarAPick, plane: 'xy', offset: 0, hint: () => (S.jarC < 0.05 ? '' : '拖到烧杯口，按住：慢慢倒进去'),
        onStart: (p) => A.jarDrag(p), onDrag: (p) => A.jarDrag(p), onEnd: () => A.jarDrop() },
      { obj: cupPick, plane: 'xy', offset: 0, hint: () => (S.capOn ? '' : '拖到塑料瓶口，按住：倒水'), onStart: (p) => A.cupDrag(p), onDrag: (p) => A.cupDrag(p), onEnd: () => A.cupDrop() },
      { obj: capPick, plane: 'xy', offset: 0, hint: () => (S.capOn ? '' : '点一下：旋紧瓶盖'), onTap: () => A.capTap(), onStart: () => {}, onDrag: () => {}, onEnd: () => {} },
      { obj: botPick, plane: 'xy', offset: 0, hint: () => (S.capOn ? '按住，左右来回拖：振荡' : ''), onStart: (p) => { S.lastShake = p ? p.clone() : null; }, onDrag: (p) => A.shake(p), onEnd: () => A.shakeEnd() },
      ...flowers.map((f, i) => ({ obj: f.pick, plane: 'xz', offset: 0.035, hint: () => (S.fl[i].at === 'tray' ? `纸花 ${ROMAN[i]}：拖进集气瓶` : `纸花 ${ROMAN[i]}：拖回托盘`),
        onStart: (p) => A.flowerDrag(i, p), onDrag: (p) => A.flowerDrag(i, p), onEnd: () => A.flowerDrop(i) })),
      { obj: sprayPick, plane: 'xz', offset: 0, hint: '拖到一朵纸花旁边：喷水', onStart: (p) => A.sprayAt(p), onDrag: (p) => A.sprayAt(p), onEnd: () => A.sprayDrop() },
      { obj: dryerPick, plane: 'xz', offset: 0, hint: '拖到纸花旁边：吹干', onStart: (p) => A.dryerAt(p), onDrag: (p) => A.dryerAt(p), onEnd: () => A.dryerDrop() },
    ], { tip: tag('', 'pill') });
    const pointer = wrapPointer(drag, bar);
    // 一开始就摆在桌上的位置（不要从原点滑过来）
    pourer.position.copy(JA_HOME).add(new THREE.Vector3(0, JAR_H, 0));
    cupPivot.position.copy(CUP_HOME).add(new THREE.Vector3(-CUP_R - 0.003, CUP_H, 0));
    spray.position.copy(SPRAY_HOME); dryer.position.copy(DRYER_HOME);
    flowers.forEach((f, i) => f.position.copy(SLOTS[i]));

    // ================= 每帧 =================
    const tmp = new THREE.Vector3();
    const step = (hh, t) => {
      const h = hh;
      // ---------- 左：倾倒 ----------
      if (S.jarA === 'carry' && S.carry) { const m = S.carry.clone().add(new THREE.Vector3(0, 0.05, 0)); if (m.distanceTo(RIM) < 0.04 && S.jarC > 0.02) S.jarA = 'rim'; }
      else if (S.jarA === 'rim' && S.carry) { const m = S.carry.clone().add(new THREE.Vector3(0, 0.05, 0)); if (m.distanceTo(RIM) > 0.06) S.jarA = 'carry'; }
      const want = S.jarA === 'rim' ? RIM.clone().add(new THREE.Vector3(0.006, 0.002, 0)) : S.jarA === 'carry' && S.carry ? S.carry.clone().add(new THREE.Vector3(0, 0.05, 0)) : JA_HOME.clone().add(new THREE.Vector3(0, JAR_H, 0));
      pourer.position.lerp(want, S.jarA === 'carry' ? 1 : 0.25);
      const tiltWant = S.jarA === 'rim' ? (S.fast ? 2.5 : 1.85) : 0;
      S.tilt += (tiltWant - S.tilt) * Math.min(1, h * (S.fast ? 6 : 2.2));
      pourer.rotation.z = S.tilt;
      if (S.tilt > 0.3) S.plateA = false;
      jarA.plate.visible = S.plateA;
      if (S.tilt > 1.6 && S.jarC > 0) {
        // 瓶口低于瓶底以后，二氧化碳像水一样“流”出来：慢慢倒时约 3 秒倒完大半；一下子倒时快得多
        const q = (S.fast ? 1.6 : 0.42) * S.jarC * V_JAR * (S.tilt - 1.6) / (tiltWant - 1.6 || 1) * h;
        const dv = Math.min(q, S.jarC * V_JAR);
        S.jarC = Math.max(0, S.jarC - dv / V_JAR); S.poured += dv;
        pourCO2(dv);
        if (Math.random() < h * (S.fast ? 60 : 26)) stream.push({ p: pourer.position.clone().add(new THREE.Vector3(rnd(-0.006, -0.002), -0.004, rnd(-0.008, 0.008))), v: new THREE.Vector3(S.fast ? -0.05 : -0.004, -0.02, 0), size: 0.0036, alpha: 0.9, age: 0 });
      } else if (!S.plateA && S.jarC > 0 && S.tilt < 0.3) {
        S.jarC = Math.max(0, S.jarC - h * 0.01);                    // 拿掉玻璃片的瓶口朝上：慢慢有一点跑掉
      }
      relaxLayers(h);
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
      if (S.jarA !== 'rim' && S.poured > 20 && !S.pourLogged) { S.pourLogged = true; if (!S.demo && S.lit[0] && S.lit[1]) status('两支蜡烛都还燃着：倒进去的二氧化碳还不够。瓶里还有的话，再拖到杯口倒一些。'); }

      // ---------- 中：塑料瓶 ----------
      if (S.cupAt === 'carry' && S.cupCarry) {
        const spout = S.cupCarry.clone().add(new THREE.Vector3(-0.02, 0.03, 0));
        const at = spout.distanceTo(BOT_MOUTH.clone().add(new THREE.Vector3(0.012, 0.004, 0))) < 0.035 && !S.capOn;
        cupPivot.position.lerp(at ? BOT_MOUTH.clone().add(new THREE.Vector3(0.012, 0.006, 0)) : spout, at ? 0.3 : 1);
        const tw = at ? 1.2 + (1 - S.cupV / CUP_V) * 0.6 : 0;
        S.cupTilt += (tw - S.cupTilt) * Math.min(1, h * 4);
        if (at && S.cupTilt > 1.0 && S.cupV > 0) {
          const dv = Math.min(S.cupV, 22 * h);         // 约 22 mL/s
          S.cupV -= dv; S.vw = Math.min(V_BOT * 0.85, S.vw + dv);
          if (Math.random() < h * 30) drops.spawn({ p: BOT_MOUTH.clone().add(new THREE.Vector3(rnd(-0.003, 0.003), 0.002, rnd(-0.003, 0.003))), v: new THREE.Vector3(0, -0.05, 0), size: 0.0014, life: 1 });
        }
      } else {
        cupPivot.position.lerp(CUP_HOME.clone().add(new THREE.Vector3(-CUP_R - 0.003, CUP_H, 0)), 0.25);
        S.cupTilt += (0 - S.cupTilt) * Math.min(1, h * 5);
      }
      cupPivot.rotation.z = S.cupTilt;
      cup.setLevel(0.05 * (S.cupV / CUP_V));
      drops.update(h, (p, d) => { p.v.y -= 0.6 * d; p.p.addScaledVector(p.v, d); return p.p.y > BOT.y + waterH() + 0.002; });
      // 溶解：振荡时快（几秒），静置时很慢
      S.shakeE = Math.max(0, S.shakeE - h * 0.8);
      const k = S.vw > 1 ? 0.04 + 1.1 * S.shakeE : 0;
      const target = Math.min(dEq(), V_BOT - S.vw);
      if (target > S.dis) S.dis += (target - S.dis) * Math.min(1, k * h);
      if (!S.capOn && S.vw > 1) S.air = clamp(S.dis / Math.max(1, V_BOT - S.vw), 0, 1);           // 瓶口开着：溶掉多少，就补进来多少空气
      const sq = squeeze(); deform(sq); rebuildWater();
      S.botOff.multiplyScalar(Math.max(0, 1 - h * 6));
      bottle.position.copy(BOT).add(S.botOff); bottle.rotation.z = -S.botOff.x * 6;
      cap.position.copy(S.capOn ? bottle.position.clone().add(new THREE.Vector3(0, 0.146, 0)) : CAP_HOME.clone().add(new THREE.Vector3(0, 0.006, 0)));
      cap.rotation.z = S.capOn ? bottle.rotation.z : 0;
      if (S.capOn && sq > 0.12 && !S.shakeLogged) {
        S.shakeLogged = true; done('shake');
        log(['旋紧瓶盖，振荡', '塑料瓶<b>变瘪</b>', '二氧化碳<b>能溶于水</b>，瓶里的气体变少']);        // 具体溶了多少看卡片（还在继续溶）
        status(`瓶子<b>变瘪</b>了：二氧化碳溶进了 ${Math.round(S.vw)} mL 水里（看卡片上的“溶解”），瓶里的气体少了，外面的大气压把软瓶压瘪。再振荡几下，会瘪得更多。`);
        maybeTable();
      }
      if (!S.capOn && S.dis > 15 && !S.openLogged && S.shakeE > 0.2) { S.openLogged = true; log(['瓶盖没旋紧就振荡', '瓶子<b>没有变瘪</b>', '溶掉的二氧化碳，由瓶口进来的空气补上了']); status('瓶盖还没旋紧：二氧化碳溶进水里，可外面的空气从瓶口补了进来（看浅灰点），瓶子不会瘪。先点一下<b>瓶盖</b>旋紧。'); }

      // ---------- 右：纸花 ----------
      spray.position.lerp(S.sprayAt || (S.sprayT > 0 && S.sprayHold) || SPRAY_HOME, S.sprayAt ? 1 : 0.25);
      const sp = S.sprayAt || (S.sprayT > 0 && S.sprayHold), fi = sp ? nearestFlower(sp.clone().add(new THREE.Vector3(-0.025, 0, 0)), 0.04) : -1;
      spray.rotation.y = fi >= 0 ? Math.atan2(SLOTS[S.fl[fi].slot].z - spray.position.z, -(SLOTS[S.fl[fi].slot].x - spray.position.x)) : 0;
      dryer.position.lerp(S.dryerAt || DRYER_HOME, S.dryerAt ? 1 : 0.25);
      const di = S.dryerAt ? nearestFlower(S.dryerAt.clone().add(new THREE.Vector3(-0.04, 0, 0)), 0.045) : -1;
      dryer.rotation.y = di >= 0 ? Math.atan2(SLOTS[S.fl[di].slot].z - dryer.position.z, -(SLOTS[S.fl[di].slot].x - dryer.position.x)) : 0;
      if (S.sprayT > 0) {
        S.sprayT -= h;
        const f = S.fl[S.sprayFlower], dst = flowerPos(f);
        spray.updateMatrix(); const noz = NOZ.clone().applyMatrix4(spray.matrix);
        if (Math.random() < h * 80) mistP.spawn({ p: noz, v: dst.clone().sub(noz).multiplyScalar(2.2).add(new THREE.Vector3(rnd(-0.01, 0.01), rnd(0, 0.01), rnd(-0.01, 0.01))), life: 0.45, size: 0.0018, alpha: 0.6 });
      }
      mistP.update(h, (p, d) => { p.p.addScaledVector(p.v, d); p.alpha = 0.6 * (1 - p.age / p.life); });
      if (di >= 0) {
        const f = S.fl[di]; dryer.updateMatrix(); const m = DRY_MOUTH.clone().applyMatrix4(dryer.matrix);
        if (Math.random() < h * 50) heatP.spawn({ p: m, v: flowerPos(f).clone().add(new THREE.Vector3(0, 0.004, 0)).sub(m).multiplyScalar(2.5).add(new THREE.Vector3(rnd(-0.008, 0.008), rnd(0, 0.01), rnd(-0.008, 0.008))), life: 0.4, size: 0.0028, alpha: 0.7 });
        f.dryT += h;
        f.wet = Math.max(0, f.wet - h * 0.45);
        const lost = Math.min(f.acid, h * 0.55); f.acid -= lost;                // 受热，碳酸分解，二氧化碳跑掉
        if (lost > 0 && Math.random() < lost * 60) leaving.push({ p: flowerPos(f).clone().add(new THREE.Vector3(rnd(-0.008, 0.008), 0.006, rnd(-0.008, 0.008))), size: 0.0032, alpha: 0.9, age: 0 });
      }
      heatP.update(h, (p, d) => { p.p.addScaledVector(p.v, d); p.v.y += 0.02 * d; p.alpha = 0.7 * (1 - p.age / p.life); });
      S.fl.forEach((f, i) => {
        const inJar = f.at !== 'tray' && !f.carry;
        if (inJar) { f.inT += h; if (f.wet > 0.3) f.acid += (f.wet - f.acid) * Math.min(1, h * 0.7); }         // CO₂ + H₂O → H₂CO₃（几秒内变红）
        else { f.outT += h; if (f.wet > 0) f.wet = Math.max(0, f.wet - h * 0.004); }                          // 放着慢慢变干（很慢）
        f.peak = Math.max(f.peak, f.acid);
        const fl = flowers[i];
        fl.position.lerp(flowerPos(f), f.carry ? 1 : 0.3);
        fl.mat.color.copy(PURPLE).lerp(RED, clamp(f.acid * 1.15, 0, 1)).lerp(WETK, f.wet * 0.22);
        fLabels[i].loc(group, fl.position.x, fl.position.y + 0.016, fl.position.z).show(f.at === 'tray' || !!f.carry);
        // 记录
        const L = S.logged;
        if (!inJar && f.wet > 0.6 && f.acid < 0.05 && f.outT > 2 && !L.wetOnly) { L.wetOnly = i + 1; log([`纸花 ${ROMAN[i]}：喷水`, '不变色（还是紫色）', '水不能使石蕊变红']); done('f1'); status(`纸花 ${ROMAN[i]} 喷了水，还是<b>紫色</b>。接着把一朵<b>干燥的</b>纸花放进集气瓶。`); }
        if (inJar && f.wet < 0.1 && f.inT > 3 && !L.dryIn) { L.dryIn = 1; log([`纸花 ${ROMAN[i]}：干燥的，放进二氧化碳`, '不变色（还是紫色）', '二氧化碳不能使石蕊变红']); done('f2'); status(`干燥的纸花 ${ROMAN[i]} 在二氧化碳里，还是<b>紫色</b>。再给另一朵纸花<b>喷上水</b>，放进另一个集气瓶。`); }
        if (inJar && f.acid > 0.6 && !L.red) { L.red = 1; log([`纸花 ${ROMAN[i]}：喷水后放进二氧化碳`, '<b>变红</b>', '二氧化碳和水<b>反应</b>，生成了能使石蕊变红的物质']); done('f3'); status(`喷过水的纸花 ${ROMAN[i]} 在二氧化碳里<b>变红</b>了。把它拿出来放回托盘，用<b>吹风机</b>吹干。`); }
        if (f.peak > 0.6 && f.acid < 0.08 && !inJar && !L.back) { L.back = 1; log([`纸花 ${ROMAN[i]}：取出吹干`, '又变成<b>紫色</b>', '生成的物质（碳酸）不稳定，受热分解了']); done('dry'); status(`吹干以后，纸花 ${ROMAN[i]} 又变回了<b>紫色</b>。看看左边的问题。`); if (W && !S.demo) W.t2.open(); }
      });
      // 集气瓶的玻璃片：有纸花在里面时推开一半
      cjars.forEach((j, k) => { j.plate.position.x = S.fl.some((f) => f.at === 'jar' + k) ? 0.012 : 0; });
      for (let i = leaving.length - 1; i >= 0; i--) { const d = leaving[i]; d.age += h; d.p.y += h * 0.03; d.alpha = Math.max(0, 0.9 - d.age * 0.6); if (d.age > 1.5) leaving.splice(i, 1); }

      // ---------- 气体小点 ----------
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
      // 塑料瓶里：气体（二氧化碳；瓶口开着时补进来的是空气）、溶进水里的二氧化碳
      const hw = Math.min(0.094, waterH()), a = Math.min(0.85, lastSq / 0.56);
      const gasN = Math.round(botDots.length * clamp((V_BOT - S.vw - (S.capOn ? S.dis : 0)) / V_BOT, 0, 1));
      botDots.forEach((d, i) => {
        if (i >= gasN) return;
        const y = hw + 0.004 + (0.118 - hw) * d.y, rMax = y > 0.095 ? lerp(BR, 0.012, clamp((y - 0.095) / 0.03, 0, 1)) : BR;
        const th = d.th + Math.sin(t * 0.4 + d.ph) * 0.15, rr = (rMax - 0.005) * d.u * (1 - a * dentAt(th, y));
        d.p.set(bottle.position.x + Math.cos(th) * rr, y, bottle.position.z + Math.sin(th) * rr);
        (!S.capOn && d.rank < S.air ? (d.blue ? blue : light) : dark).push(d);
      });
      const solN = Math.round(solDots.length * clamp(S.dis / (SOL * V_BOT / 3), 0, 1));
      solDots.forEach((d, i) => {
        if (i >= solN || hw < 0.004) return;
        const y = 0.003 + (hw - 0.005) * d.y, th = d.th + t * 0.2, rr = (BR - 0.005) * d.u * (1 - a * dentAt(th, y));
        d.p.set(bottle.position.x + Math.cos(th) * rr, y, bottle.position.z + Math.sin(th) * rr);
        dark.push(d);
      });
      cjars.forEach((j, k) => { for (const d of cjDots[k]) { const th = d.th + Math.sin(t * 0.4 + d.ph) * 0.15, rr = (CJ_R - 0.004) * d.u; d.p.set(j.position.x + Math.cos(th) * rr, CJ_H * d.y, j.position.z + Math.sin(th) * rr); dark.push(d); } });
      for (const d of leaving) dark.push(d);
      darkP.list = dark; lightP.list = light; blueP.list = blue;
      for (const p of [darkP, lightP, blueP]) p.update(0, () => true);

      // ---------- 卡片 ----------
      const lo = Math.round(co2At(WICK[0]) * 100), hi = Math.round(co2At(WICK[1]) * 100);
      const row = (name, v, lit) => `<div class="cc-obs"><span style="min-width:4.5em">${name}</span><span class="o2-read"><i style="width:${v}%;background:#3d4350"></i></span><b style="color:#3d4350">${v}%</b>${lit ? '' : '<span class="cc-res">熄灭</span>'}</div>`;
      bkCard.text(`<div class="cc"><div class="cc-t"><span class="cc-name">烧杯里的二氧化碳</span><small>（模型）</small></div><div class="cc-more">${row('上面烛芯处', hi, S.lit[1])}${row('下面烛芯处', lo, S.lit[0])}</div></div>`)
        .loc(group, BK.x, BKH, 0).show(S.poured > 1 && (here === '' || here === 'A'));        // 只在这一处显示
      const fr = S.vw / V_BOT;
      botCard.text(`<div class="cc"><div class="cc-t"><span class="cc-name">软塑料瓶</span>${sq > 0.12 ? '<span class="cc-res">变瘪了</span>' : ''}</div><div class="cc-more"><div class="cc-obs"><span style="min-width:2.5em">水</span><span class="o2-read"><i style="width:${Math.min(100, fr * 100)}%;background:#5aa9d6"></i></span><b>${Math.round(S.vw)} mL</b><small>${fr > 0.29 && fr < 0.38 ? '约 1/3 ✓' : '1/3 约 110 mL'}</small></div>${S.dis > 2 ? `<div class="cc-obs"><span style="min-width:2.5em">溶解</span><b style="color:#3d4350">${Math.round(S.dis)} mL</b><small>二氧化碳溶进水里</small></div>` : ''}</div></div>`)
        .loc(group, BOT.x + BR, 0.11, 0).show((S.vw > 0.5 || S.cupAt === 'carry') && (here === '' || here === 'B'));

      // 换到下一处
      const cur = bar.current;
      if (!bar.playing) { if (['water', 'cap', 'shake'].includes(cur) && S.pourLogged) goStation('B'); else if (['f1', 'f2', 'f3', 'dry'].includes(cur)) goStation('C'); }
    };
    const candleOut = (k) => {
      if (S.demo) return;
      const first = S.outOrder.length === 1;
      if (first) status(k === 0 ? '<b>下面的</b>蜡烛先熄灭了。再看上面那支。' : '<b>上面的</b>蜡烛先熄灭了——是不是倒得太快、二氧化碳冲到了上面？可以“全部重来”再慢慢倒一次。');
      else if (S.fast && S.outAt[0] > 1.6 && S.outAt[1] > 1.6) {
        log(['一下子把二氧化碳倒进烧杯', '两支蜡烛<b>几乎同时</b>熄灭', '二氧化碳和卷进来的空气混在一起，看不出先后']);
        status('一下子倒进去：二氧化碳和卷进来的空气混在一起，两支蜡烛<b>几乎同时</b>熄灭，看不出二氧化碳沉在下面。课本要求<b>慢慢</b>倒。');
      } else {
        const order = S.outOrder[0] === 0 ? '下面的蜡烛先熄灭，上面的后熄灭' : '上面的蜡烛先熄灭，下面的后熄灭';
        log(['把二氧化碳沿烧杯壁慢慢倒进烧杯', `<b>${order}</b>`, S.outOrder[0] === 0 ? '二氧化碳<b>密度比空气大</b>；<b>不能燃烧，也不支持燃烧</b>' : '倒得太快，二氧化碳和空气混在一起冲上去了']);
        done('pour');
        status(`两支蜡烛都熄灭了：<b>${order}</b>。接下来做实验 6-4：往软塑料瓶里加水。`);
      }
    };
    const maybeTable = () => { if (W && !S.demo && bar.has('pour') && bar.has('shake') && !bar.has('table')) { W.t1.open(); } };

    return {
      group: root,
      pointer,
      card: false,
      toggles: ['cards', 'steps'],
      size: { w: 0.52, d: 0.2, h: 0.2 },
      view: { elev: 20, azim: -4, lookY: 0.4, frameMargin: 1.04 },
      mount(ui) {
        ui.el.classList.add('xuean');
        // 想一想 1：课本第 137 页的表（根据实验 6-3 和 6-4 完成下表）
        const pick3 = (opts) => { const s = seg('', opts, () => {}); s.set(-1); return s; };
        const cDen = pick3(['比空气大', '比空气小']), cSol = pick3(['能溶于水', '不溶于水']), cBurn = pick3(['不能燃烧，也不支持燃烧', '能支持燃烧']);
        const cells = [cDen, cSol, cBurn];
        const ctx1 = h('div', { class: 'sum-ctx' });
        const t1El = h('div', { class: 'think', hidden: true }, h('div', { class: 'think-t' }, '想一想 · 填课本上的表'), ctx1,
          h('p', { class: 'think-q', html: '根据实验 6-3 和 6-4 完成下表（课本第 137 页）。<br><small>颜色、气味：无色、无味（闻气体要用手在瓶口轻轻扇动，这里直接告诉你）。</small>' }),
          h('div', { class: 'fill-row' }, h('b', {}, '密度（与空气比较）'), cDen.el), h('div', { class: 'fill-row' }, h('b', {}, '溶解性'), cSol.el), h('div', { class: 'fill-row' }, h('b', {}, '是否支持燃烧'), cBurn.el),
          buttons([{ text: '填好了', onClick: () => {
            const wrong = [];
            if (cDen.index !== 0) wrong.push(cDen.index < 0 ? '密度还没填。' : '密度：看两支蜡烛哪支先熄灭——二氧化碳沉在下面还是浮在上面？');
            if (cSol.index !== 0) wrong.push(cSol.index < 0 ? '溶解性还没填。' : '溶解性：塑料瓶为什么变瘪？');
            if (cBurn.index !== 0) wrong.push(cBurn.index < 0 ? '是否支持燃烧还没填。' : '是否支持燃烧：蜡烛在二氧化碳里怎样了？');
            if (wrong.length) return status(wrong[0]);
            t1.close(); done('table'); status('对：二氧化碳无色、无味，<b>密度比空气大</b>，<b>能溶于水</b>，<b>不能燃烧，也不支持燃烧</b>。接下来做实验 6-5：三朵石蕊纸花。');
          } }]).el);
        const t1 = {
          open() { ctx1.innerHTML = S.rows.filter((r) => !/纸花/.test(r[0])).map((r) => `<div>${r[0]}：${r[1]}</div>`).join('') || ''; ctx1.hidden = !ctx1.innerHTML; t1El.hidden = false; },
          close() { t1El.hidden = true; },
        };
        // 想一想 2
        const t2 = think({
          title: '想一想',
          ctx: () => S.rows.filter((r) => /纸花/.test(r[0])).map((r) => `<div>${r[0]}：${r[1]}</div>`).join(''),
          q: '喷过水的纸花放进二氧化碳才变红，吹干以后又变回紫色——为什么？',
          options: ['二氧化碳和水反应生成了碳酸，碳酸使石蕊变红；碳酸不稳定，吹干时分解了', '二氧化碳本身使石蕊变红', '水使石蕊变红'],
          wrong: ['看你的记录：干燥的纸花放进二氧化碳，变红了吗？', '看你的记录：只喷水的纸花，变红了吗？'],
          ok: '对：CO₂ + H₂O ══ H₂CO₃，碳酸使紫色石蕊变红；碳酸很不稳定，H₂CO₃ ══ CO₂↑ + H₂O，二氧化碳跑掉，纸花又变紫。可以掀开结论看看。',
          onOk: () => { next.hidden = false; done('why'); },
          status: (m) => ui.status(m),
        });
        const next = h('button', { class: 'go big-next', hidden: true, onclick: () => ui.go(2) }, '掀开课本上的结论 →');
        const tbl = table(['做了什么', '现象', '说明']);
        const fastSeg = seg('倒的速度', ['沿杯壁慢慢倒', '一下子倒进去'], (_, k) => { S.fast = !!k; });
        const vary = h('details', { class: 'more' }, h('summary', {}, '换个条件再试'),
          h('p', { class: 'fineprint', html: '一下子把二氧化碳倒进去，两支蜡烛会怎样？（先“全部重来”。）塑料瓶也可以先不旋紧瓶盖就振荡，看看会不会瘪。' }), fastSeg.el);
        const more = h('details', { class: 'more' }, h('summary', {}, '更多'),
          buttons([
            { text: '旋紧瓶盖', ghost: true, onClick: () => A.capTap() },
            { text: '振荡塑料瓶', ghost: true, onClick: () => { S.shakeE = 1; } },
            ...[0, 1, 2].map((i) => ({ text: `给纸花 ${ROMAN[i]} 喷水`, ghost: true, onClick: () => A.wet(i) })),
          ]).el,
          buttons([{ text: '全部重来（清空记录）', ghost: true, onClick: () => A.reset() }]).el);
        const note = h('p', { class: 'fineprint', html: '说明：烧杯里的气体按高度分 22 层估算（慢慢倒：二氧化碳沉到底、少量混合；一下子倒：卷进大量空气、一部分冲出杯口）；烛芯处的氧气低于约 16% 时蜡烛熄灭（近似）。塑料瓶按 330 mL 计；20 ℃ 时 1 体积水约溶解 0.88 体积二氧化碳（课本：约 1 体积）。纸花变色、吹干的快慢是示意。' });
        ui.controls.append(t1El, t2.el, next, vary, more, note);
        ui.data.append(tbl.el);
        const dt = ui.data.previousElementSibling; if (dt?.classList.contains('bar-title')) dt.textContent = '观察记录';
        W = { tbl, t1, t2, next, cells, fastSeg, status: (m) => ui.status(m) };
        bar.attach(ui);
        ui.status('桌上从左到右是课本的三个实验：倾倒二氧化碳（图 6-10）、软塑料瓶（图 6-11）、石蕊纸花（图 6-12）。可以先看<b>老师演示</b>，也可以直接动手。');
      },
      update(dt, t) { const k = bar.update(dt); step(Math.min(dt, 1 / 30) * k, t); },
      dispose() { bar.dispose(); smoke.dispose(); drops.dispose(); darkP.dispose(); lightP.dispose(); blueP.dispose(); heatP.dispose(); mistP.dispose(); botGeo.dispose(); botWater?.geometry.dispose(); },
      debug: { get S() { return S; }, A, bar,
        qa: qaFlow(drag, [
          { name: '拿起二氧化碳', hold: jarAPick },
          { name: '拖到烧杯口倒', run: () => A.jarDrag(RIM.clone().add(new THREE.Vector3(0, -0.05, 0))), wait: 9 },
          { name: '松手', release: jarAPick, wait: 2 },
          { name: '拿起水杯', hold: cupPick },
          { name: '拖到瓶口倒水', run: () => A.cupDrag(BOT_MOUTH.clone().add(new THREE.Vector3(0.032, -0.026, 0))), wait: 3.6 },
          { name: '松手', release: cupPick, wait: 0.5 },
          { name: '旋紧瓶盖', tap: capPick },
          { name: '振荡', run: () => { for (let i = 0; i < 6; i++) A.shake(BOT.clone().add(new THREE.Vector3(i % 2 ? 0.02 : -0.02, 0.07, 0))); }, wait: 1 },
          { name: '再振荡', run: () => { for (let i = 0; i < 6; i++) A.shake(BOT.clone().add(new THREE.Vector3(i % 2 ? 0.02 : -0.02, 0.07, 0))); }, wait: 1 },
          { name: '再振荡', run: () => { for (let i = 0; i < 6; i++) A.shake(BOT.clone().add(new THREE.Vector3(i % 2 ? 0.02 : -0.02, 0.07, 0))); A.shakeEnd(); }, wait: 2 },
          { name: '填表', run: () => { W.cells.forEach((c) => c.set(0)); [...document.querySelectorAll('.think:not([hidden]) .btn-row button')].find((b) => b.textContent === '填好了')?.click(); }, wait: 1.5 },
          { name: '给 I 喷水', drag: sprayPick, to: () => SLOTS[0].clone().add(new THREE.Vector3(0.025, -0.004, 0)), wait: 3 },
          { name: '干的 II 放进瓶 1', drag: flowers[1].pick, to: () => new THREE.Vector3(JARS[0].x, 0.035, JARS[0].z), wait: 4 },
          { name: '给 III 喷水', drag: sprayPick, to: () => SLOTS[2].clone().add(new THREE.Vector3(0.025, -0.004, 0)), wait: 1 },
          { name: 'III 放进瓶 2', drag: flowers[2].pick, to: () => new THREE.Vector3(JARS[1].x, 0.035, JARS[1].z), wait: 6 },
          { name: 'III 拿回托盘', drag: flowers[2].pick, to: () => new THREE.Vector3(SLOTS[2].x, 0.035, SLOTS[2].z), wait: 1 },
          { name: '吹风机对着 III', hold: dryerPick },
          { name: '吹', run: () => A.dryerAt(SLOTS[2].clone().add(new THREE.Vector3(0.045, -0.004, 0))), wait: 5 },
          { name: '放下吹风机', release: dryerPick, wait: 1 },
          { name: '答想一想', run: () => W.t2.el.querySelector('button').click(), wait: 1 },
        ]) },
    };
  },
};
