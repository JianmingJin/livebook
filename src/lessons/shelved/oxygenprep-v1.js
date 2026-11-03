// 实验活动 1 氧气的实验室制取与性质（课本第 52 页图 2-18；实验 2-5 在第 43 页）：加热高锰酸钾，用排水法收集氧气。
// 直接动手：手握试管查气密性；点橡胶塞拔出 / 塞上；把药匙、棉花拖到试管口；点酒精灯点燃，左右拖它预热、再对准药品；
//   把盛满水的集气瓶拖进水槽；把导管口拖进集气瓶；集满后点集气瓶取出；带火星的木条、细铁丝拖进集气瓶检验。
// 化学：2KMnO₄ → K₂MnO₄ + MnO₂ + O₂（约 200 ℃ 以上分解）。1 g 高锰酸钾最多放出约 0.10 g 氧气，室温下约 77 mL。
// 气体的量都按“室温下的毫升数”记（相当于物质的量）。试管里的气体 = 空气 + 氧气，充分混合；导管口冒出的就是这个混合物。
// 木条复燃、铁丝燃烧需要的氧气浓度：只找到初中探究题的数据（木条约 36%–60% 复燃，0.38 mm 铁丝约 55%–60% 才能燃烧），这里取近似值并在界面上说明。
import * as THREE from 'three';
import { buttons, goals, seg, table } from './kit/ui.js';
import { draggable, clamp } from './kit/interact.js';
import { stand } from './kit/props.js';
import { Particles } from './kit/fx.js';
import { testTube, stopper, glassTube, rubberTube, gasJar, trough, splint, ironWire, spatula, reagentBottle, chemLamp, cottonBall, tubeClamp, labJack, CHEM } from './kit/chem.js';
import { bubble2, Sparks, molecules } from './kit/chemfx.js';
import { paint, inked, hull } from '../live/ink.js';
import { h } from '../ui/Panel.js';

const T0 = 25;                       // 室温 ℃
const V_TUBE = 20;                   // 试管里气体的空间（mL）
const V_JAR = 60;                    // 集气瓶容积（mL），和东莞考题用的 60 mL 集气瓶一样
const PER_G = 77;                    // 1 g 高锰酸钾最多放出的氧气（室温 mL）
const DOSE = 2;                      // 一药匙约 2 g
const RELIGHT = 0.45, BRIGHT = 0.35; // 带火星木条：≥ 45% 复燃，35%–45% 很亮（近似）
const IRON = 0.57;                   // 细铁丝能燃烧的最低氧气体积分数（近似）
const TILT = THREE.MathUtils.degToRad(8);
const CLAMP = new THREE.Vector3(-0.175, 0.132, 0);         // 铁夹夹住试管的位置（试管中上部）
const SLOT = [0.098, 0.146];                                // 集气瓶在水槽里的位置（x）
const HOME = [new THREE.Vector3(0.222, 0, 0.04), new THREE.Vector3(0.282, 0, 0.04)];   // 桌上放集气瓶的地方
const MOUTH_Y = 0.018;                                      // 倒立在水槽里时集气瓶口的高度
// 气体里氧气的体积分数：air 是空气（本身含 21% 氧气），o2 是高锰酸钾放出的氧气
const frac = (air, o2) => (air + o2 > 1e-6 ? (o2 + 0.21 * air) / (air + o2) : 0.21);

export default {
  id: 'oxygenprep',
  fig: '图2-18',
  title: '氧气的实验室制取与性质',
  stampText: '实验',
  predict: {
    q: '加热高锰酸钾，导管口<b>刚开始冒出气泡</b>，就马上把导管伸进集气瓶收集。<br>这样收集到的是什么？',
    hint: '课本第 52 页 实验活动 1',
    options: ['纯净的氧气——高锰酸钾分解产生的就是氧气', '混有不少空气的氧气', '几乎全是空气，没有氧气'],
    answer: 1,
  },
  need: '检查气密性、装好药品、用排水法收集一瓶氧气并检验，最后正确地停止加热',
  conclusion: {
    crops: [{ page: 58, rect: [44, 440, 340, 600] }],
    quote: '导管口开始有气泡放出时，不宜立即收集。当气泡连续并比较均匀地放出时，再把导管口伸入盛满水的集气瓶。……停止加热时，先要把导管移出水面，然后再熄灭酒精灯。',
    formula: '高锰酸钾 <span style="font-size:.8em">加热</span>→ 锰酸钾 + 二氧化锰 + 氧气',
    why: '刚开始冒出的气泡，是试管里原有的<b>空气</b>受热膨胀被赶出来的；等试管里的空气被氧气赶得差不多了，气泡才连续、均匀，这时收集到的氧气才比较纯。<br>带火星的木条在氧气浓度并不很高时就能复燃，所以<b>木条复燃不能说明氧气纯净</b>；细铁丝对氧气浓度的要求高得多。<br>先熄灭酒精灯，试管里的气体冷却收缩，水槽里的水会<b>倒吸</b>进热的试管，使试管骤冷炸裂；试管口略向下倾斜，是为了防止冷凝水倒流到热的试管底部。',
    src: '课本第 43、52–53 页 · 第二单元 课题3 制取氧气、实验活动1',
  },

  create({ tag, look, back }) {
    const root = new THREE.Group(), group = new THREE.Group();
    group.position.x = 0.03; root.add(group);
    // 凑近看：look() 的目标点在 root 坐标里（group 往右挪了 0.03）
    const near = (v, d = [0.15, 0.35, 1], dist = 0.26) => { S.near = true; look([v.x + 0.03, v.y, v.z], d, dist, () => { S.near = false; }); W?.nearBtn && (W.nearBtn.textContent = '↩ 回到整套装置'); };
    const far = () => { if (S.near) { S.near = false; back(); } W?.nearBtn && (W.nearBtn.textContent = '凑近看导管口'); };

    // ---------------- 铁架台、升降台、酒精灯 ----------------
    const st = stand({ height: 0.3, baseW: 0.14, baseD: 0.06 });
    st.position.set(-0.24, 0, -0.055);
    const arm = st.clamp(CLAMP.y, 0.11);
    // 横杆从铁架台伸出来，再朝前接到夹试管的双爪夹上
    const jawBar = hull(new THREE.Mesh(new THREE.CylinderGeometry(0.0028, 0.0028, 0.052, 10), paint(0x8a929e)), 0.0008);
    jawBar.rotation.x = Math.PI / 2; jawBar.position.set(0.11, 0, 0.026); arm.add(jawBar);
    const jaw = new THREE.Group();      // 兼容旧代码里的 jaw.scale
    group.add(st);
    const jack = labJack({ w: 0.075, d: 0.05, h: 0.028 });
    jack.position.set(-0.255, 0, 0); group.add(jack);
    const lamp = chemLamp();
    lamp.position.set(-0.262, 0.028, 0);
    const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.013, 0.015, 0.03, 18), paint(0xcfd6dc, { unique: true, transparent: true, opacity: 0.55 }));
    group.add(lamp, cap);
    const lampPick = new THREE.Mesh(new THREE.BoxGeometry(0.075, 0.1, 0.075), new THREE.MeshBasicMaterial({ visible: false }));
    lampPick.position.y = 0.045; lampPick.userData.pick = true; lamp.add(lampPick);

    // ---------------- 试管（口略向下）、橡胶塞、导管 ----------------
    const tube = testTube({ r: 0.0085, len: 0.15 });
    const tubeHold = new THREE.Group(); tubeHold.add(tube); group.add(tubeHold);
    const clampJaw = tubeClamp(0.0095); clampJaw.position.y = 0.1; tube.add(clampJaw);      // 夹在试管中上部（离管底 10 cm）
    const tubePick = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.016, 0.11, 10), new THREE.MeshBasicMaterial({ visible: false }));     // 不盖住管口（橡胶塞在那儿）
    tubePick.position.y = 0.055; tubePick.userData.pick = true; tube.add(tubePick);
    const plug = stopper({ r1: 0.0082, r2: 0.0102, h: 0.018 });
    group.add(plug);
    const plugPick = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.04, 10), new THREE.MeshBasicMaterial({ visible: false }));
    plugPick.position.y = 0.012; plugPick.userData.pick = true; plug.add(plugPick);
    const PLUG_TABLE = new THREE.Vector3(-0.1, 0.0, 0.07);
    let stem = null, hose = null;        // 塞子里那截玻璃导管（随塞子走）、乳胶管（每次重建）
    const endPiece = new THREE.Group();   // 伸进水槽的那截玻璃导管（原点在导管口）
    const endGlass = glassTube([new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 0.082, 0), new THREE.Vector3(-0.006, 0.09, 0), new THREE.Vector3(-0.022, 0.092, 0)]);
    const endWater = new THREE.Mesh(new THREE.CylinderGeometry(0.0016, 0.0016, 1, 8), paint(CHEM.water, { unique: true, transparent: true, opacity: 0.8 }));
    endWater.geometry.translate(0, 0.5, 0); endWater.scale.y = 0.0001; endWater.visible = false;
    const endPick = new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.028, 0.1, 8), new THREE.MeshBasicMaterial({ visible: false }));      // 比集气瓶的拾取盒更靠前：导管口在瓶里时也能抓住导管
    endPick.position.y = 0.045; endPick.userData.pick = true;
    endPiece.add(endGlass, endWater, endPick); group.add(endPiece);
    const TIP = { air: new THREE.Vector3(0.03, 0.082, 0), water: new THREE.Vector3(0.04, 0.026, 0) };
    const tipFor = (where) => (where === 'air' || where === 'water' ? TIP[where].clone() : new THREE.Vector3(SLOT[where === 'jar0' ? 0 : 1] - 0.005, MOUTH_Y + 0.009, 0));

    // ---------------- 水槽、集气瓶 ----------------
    const tr = trough({ w: 0.18, d: 0.11, h: 0.066, level: 0.052 });
    tr.position.set(0.085, 0, 0); group.add(tr);
    const jars = [0, 1].map((k) => { const j = gasJar({ r: 0.019, h: 0.075 }); group.add(j); return j; });

    // ---------------- 桌上的药品和检验用品 ----------------
    const bottle = reagentBottle({ color: CHEM.kmno4 }); bottle.position.set(-0.06, 0, 0.07); group.add(bottle);
    const spoon = spatula(); const SPOON_HOME = new THREE.Vector3(-0.03, 0.004, 0.085); spoon.position.copy(SPOON_HOME); spoon.rotation.y = -0.3; group.add(spoon);
    const spoonPick = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.02, 0.025), new THREE.MeshBasicMaterial({ visible: false })); spoonPick.position.x = 0.05; spoonPick.userData.pick = true; spoon.add(spoonPick);
    const cotton = cottonBall(0.0075);
    const COTTON_HOME = new THREE.Vector3(0.025, 0.007, 0.085); cotton.position.copy(COTTON_HOME); group.add(cotton);
    const cottonPick = new THREE.Mesh(new THREE.SphereGeometry(0.018, 8, 6), new THREE.MeshBasicMaterial({ visible: false })); cottonPick.userData.pick = true; cotton.add(cottonPick);
    const stick = splint(); const STICK_HOME = new THREE.Vector3(0.2, 0.006, 0.09); stick.position.copy(STICK_HOME); stick.rotation.z = Math.PI / 2; group.add(stick);
    const stickPick = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.14, 0.02), new THREE.MeshBasicMaterial({ visible: false })); stickPick.position.y = 0.065; stickPick.userData.pick = true; stick.add(stickPick);
    const wire = ironWire(); const WIRE_HOME = new THREE.Vector3(0.3, 0.006, 0.09); wire.position.copy(WIRE_HOME); wire.rotation.z = Math.PI / 2; group.add(wire);
    const wirePick = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.11, 0.02), new THREE.MeshBasicMaterial({ visible: false })); wirePick.position.y = 0.04; wirePick.userData.pick = true; wire.add(wirePick);

    // ---------------- 粒子：气泡、铁丝的火星、“看看气体里”的分子 ----------------
    const bubs = new Particles({ max: 220, geometry: new THREE.SphereGeometry(1, 12, 9), material: bubble2() });
    bubs.mesh.renderOrder = 10;
    const sparks = new Sparks({ max: 360, color: 0xffe6a8, tail: 0.022 });
    const purple = new Particles({ max: 120, geometry: new THREE.SphereGeometry(1, 6, 4), material: new THREE.MeshBasicMaterial({ color: 0x8a2a7a }) });
    const drip = new Particles({ max: 60, geometry: new THREE.SphereGeometry(1, 8, 6), material: new THREE.MeshPhysicalMaterial({ color: CHEM.water, transparent: true, opacity: 0.85, roughness: 0.05, depthWrite: false }) });
    group.add(bubs.mesh, sparks.mesh, purple.mesh, drip.mesh);
    // 分子示意：红色两个球 = 氧分子 O₂；蓝色两个球 = 氮分子 N₂（空气里大约 4/5 是氮气）
    const mols = molecules({ max: 300, unit: 0.0012 });
    group.add(mols);

    const tags = { tip: tag('', 'pill'), j0: tag('', 'pill'), j1: tag('', 'pill'), tube: tag('', 'pill'), warn: tag('', 'pill warn') };

    // ---------------- 状态 ----------------
    const fresh = () => ({
      plug: 'in', powder: 0, left: 0, cotton: false, tilt: 'down', end: 'water',
      lit: false, lampX: -0.262, travel: 0, preheated: false, uneven: false, hold: false, holdT: 0,
      Tg: T0, Tp: T0, Tglass: T0, air: V_TUBE, o2: 0, suck: 0, broken: '', purple: 0,
      jars: [0, 1].map(() => ({ where: 'table', water: 1, air: 0, o2: 0, startX: null, tested: '', cracked: false })),
      seal: '', sealBubbles: 0, sealColumn: false, flow: 0, bubAcc: 0, x: 0.21, steady: 0, firstBubbleT: null,
      stoppedRight: null, removedFirst: false, seen: new Set(), test: null, view: false, t: 0, heatT: 0,
    });
    let S = fresh();
    let W = null;
    const status = (m) => W?.status(m);
    const warn = (m) => { S.warnMsg = m; S.warnT = 3.5; };
    // 气体记录：每一步发生了什么、那时冒出 / 收集的气体里氧气约占多少（模型估计）——正确、错误的路径都有这份证据
    const log = (what, x) => W?.log.add([String(Math.round(S.heatT)), what, x == null ? '—' : `约 ${Math.round(x * 100)}%`]);

    // ---------------- 几何：试管方向、管口、塞子位置 ----------------
    const dir = () => new THREE.Vector3(Math.cos(S.tilt === 'down' ? -TILT : TILT * 1.6), Math.sin(S.tilt === 'down' ? -TILT : TILT * 1.6), 0);
    const bottomPos = () => CLAMP.clone().addScaledVector(dir(), -0.1);
    const mouthPos = () => CLAMP.clone().addScaledVector(dir(), 0.05);
    const powderPos = () => bottomPos().addScaledVector(dir(), 0.014);
    const placeTube = () => {
      const d = dir();
      tubeHold.position.copy(bottomPos());
      tubeHold.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d);
      jaw.scale.y = 1;
      // 塞子
      if (S.plug === 'in') {
        const m = mouthPos().addScaledVector(d, -0.01);
        plug.position.copy(m); plug.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d);
      } else { plug.position.copy(PLUG_TABLE); plug.quaternion.identity(); }
    };
    const rebuildHose = () => {
      const d = dir(), m = mouthPos();
      if (stem) { group.remove(stem); stem.geometry.dispose(); }
      if (hose) { group.remove(hose); hose.geometry.dispose(); }
      const a = S.plug === 'in' ? m.clone().addScaledVector(d, -0.012) : PLUG_TABLE.clone().add(new THREE.Vector3(0, 0.01, 0));
      const b = S.plug === 'in' ? m.clone().addScaledVector(d, 0.028) : PLUG_TABLE.clone().add(new THREE.Vector3(0.03, 0.01, 0));
      stem = glassTube([a, b]); group.add(stem);
      const joint = endPiece.position.clone().add(new THREE.Vector3(-0.022, 0.092, 0));
      const mid1 = b.clone().add(new THREE.Vector3(0.03, 0.006, 0)), mid2 = joint.clone().add(new THREE.Vector3(-0.03, 0.012, 0));
      hose = rubberTube([b.clone().addScaledVector(d, -0.004), mid1, mid2, joint.clone().add(new THREE.Vector3(0.004, 0, 0))]);
      group.add(hose);
    };
    let lastKey = '';
    const placeAll = () => {
      placeTube();
      const tipTarget = S.dragTip || tipFor(S.end);
      endPiece.position.lerp(tipTarget, S.dragTip ? 1 : 0.35);
      const key = `${S.plug}|${S.tilt}|${endPiece.position.x.toFixed(4)}|${endPiece.position.y.toFixed(4)}`;
      if (key !== lastKey) { lastKey = key; rebuildHose(); }
      // 集气瓶
      jars.forEach((j, k) => {
        const J = S.jars[k];
        if (J.where === 'trough') { j.position.set(SLOT[k], MOUTH_Y + j.h, 0); j.rotation.set(Math.PI, 0, 0); j.plate.visible = false; }
        else if (J.where === 'hand') { j.position.copy(S.jarDrag || HOME[k]); j.rotation.set(0, 0, 0); j.plate.visible = true; }
        else { j.position.copy(HOME[k]); j.rotation.set(0, 0, 0); j.plate.visible = !J.open; }
        j.setWater(J.where === 'trough' ? J.water : J.where === 'hand' || J.where === 'table' ? (J.air + J.o2 > 0.5 ? J.water : 1) : 1);
      });
      // 酒精灯和灯帽
      lamp.position.x = S.lampX;
      if (S.lit) cap.position.set(S.lampX + 0.05, 0.015, 0.035);        // 灯帽取下，放在桌上
      else cap.position.set(S.lampX, 0.028 + 0.072, 0);                   // 盖在灯芯上
      // 试管里的东西
      tube.setPowder(S.powder > 0 ? 0.35 + 0.65 * (S.left / DOSE) : 0, S.left < S.powder * 0.4 ? 0x2b2026 : CHEM.kmno4);
      tube.cotton.visible = S.cotton;
      if (!S.cottonDrag) cotton.visible = !S.cotton;
      tube.crack.visible = !!S.broken;
      tags.tube.loc(group, -0.2, 0.175, 0).text(S.broken ? '试管炸裂了' : S.plug === 'out' ? '已拔出橡胶塞' : '');
    };

    // ---------------- 动作（器材和面板共用） ----------------
    const heating = () => S.lit && Math.abs(S.lampX - powderPos().x) < 0.03 && !S.broken;
    const A = {
      plug() {
        if (S.broken) return status('试管已经炸裂了。点“再做一次”。');
        if (S.plug === 'in') {
          if (S.lit || S.Tg > 40) return status('正在加热，<b>不能拔塞子</b>。');
          S.plug = 'out'; return status(S.powder ? '拔出了橡胶塞。' : '拔出了橡胶塞。用<b>药匙</b>取一些高锰酸钾送进试管（把药匙拖到试管口），再在试管口放<b>一团棉花</b>。');
        }
        S.plug = 'in';
        if (S.powder && S.cotton) status('塞紧了橡胶塞。接下来：把一个<b>盛满水的集气瓶</b>拖进水槽，倒立在水里。');
        else if (S.powder) status('塞上了——试管口还<b>没放棉花</b>。');
        else status('塞紧了橡胶塞。');
      },
      dose() {
        if (S.broken) return;
        if (S.plug === 'in') return status('先把<b>橡胶塞拔出来</b>（点一下橡胶塞），才能装药品。');
        if (S.powder) return status('试管里已经有高锰酸钾了，<b>少量</b>就够。');
        if (S.seal !== 'ok') warn('还没有检查装置的气密性——考试要先查气密性，再装药品');
        S.powder = DOSE; S.left = DOSE; S.loadedBeforeSeal = S.seal !== 'ok';
        status('装入了少量高锰酸钾（约 2 g，紫黑色粉末）。再把<b>棉花</b>拖到试管口。');
      },
      cotton() {
        if (S.plug === 'in') return status('先拔出橡胶塞。');
        if (!S.powder) return status('先装高锰酸钾，再在试管口放棉花。');
        S.cotton = true; status('试管口放了一团棉花。点一下<b>橡胶塞</b>把它塞紧。');
      },
      tilt(v) {
        if (S.broken) return;
        S.tilt = v;
        status(v === 'down' ? '试管口<b>略向下倾斜</b>。' : '试管口朝上了——看看加热时会怎样（这是错误示范）。');
      },
      light() {
        if (S.broken) return;
        S.lit = !S.lit;
        if (S.lit) {
          if (!S.powder) { status('试管里还没有药品。'); }
          else if (S.plug !== 'in') { S.lit = false; return status('先塞好橡胶塞再加热。'); }
          else status('点燃了酒精灯。先<b>预热</b>：按住酒精灯左右来回拖，让试管均匀受热；然后停在<b>药品下方</b>加热。');
        } else {
          A.stopCheck();
        }
      },
      stopCheck() {
        if (S.stoppedRight != null || S.left > S.powder - 0.05) return;
        if (S.end === 'air') { S.stoppedRight = true; W?.goal.done('stop'); status('先把导管移出水面、再熄灭酒精灯——<b>顺序对了</b>。'); }
        else { S.stoppedRight = false; status('导管还在水里就熄灭了酒精灯！盯着导管：试管冷下来，气体收缩……'); }
      },
      hold(on) {
        if (S.broken) return;
        if (on && !S.lit && S.seal !== 'ok' && !S.near) near(endPiece.position.clone().add(new THREE.Vector3(-0.03, 0.03, 0)), [0.1, 0.3, 1], 0.24);
        S.hold = on && !S.lit;
        if (on && S.lit) status('正在加热，别用手握试管。');
      },
      moveEnd(where) {
        if (S.broken) return;
        if ((where === 'jar0' || where === 'jar1') && S.jars[where === 'jar0' ? 0 : 1].where !== 'trough') return status('先把集气瓶盛满水，倒立在水槽里。');
        const was = S.end; S.end = where;
        if (where === 'air' && was !== 'air') { if (S.lit && S.left < S.powder - 0.05) { S.removedFirst = true; status('导管移出了水面。现在可以<b>熄灭酒精灯</b>了（点酒精灯）。'); } }
        if (where.startsWith('jar')) {
          const J = S.jars[where === 'jar0' ? 0 : 1];
          if (J.startX == null) { J.startX = S.x; log(`开始收集集气瓶${where === 'jar0' ? '①' : '②'}`, S.x); }
          near(new THREE.Vector3(SLOT[where === 'jar0' ? 0 : 1] - 0.02, 0.055, 0), [0.12, 0.3, 1], 0.27);
          if (S.x < 0.8) status('导管口伸进了集气瓶。（这时冒出的气体里，氧气大约只占 ' + Math.round(S.x * 100) + '%——可以点“看看气体里”看看。）');
          else status('导管口伸进了集气瓶，开始收集。看瓶里的水面。');
        }
      },
      jarIn(k) {
        const J = S.jars[k];
        if (J.where !== 'table' || J.air + J.o2 > 0.5) return;
        J.where = 'trough'; J.water = 1;
        status(`集气瓶${k ? '②' : '①'}盛满水，盖着玻璃片倒立在水槽里，在水下抽走了玻璃片。` + (S.left < S.powder ? '' : '现在点燃酒精灯加热。'));
      },
      jarOut(k) {
        const J = S.jars[k];
        if (J.where !== 'trough') return;
        if (S.end === 'jar' + k) return status('导管口还在这个集气瓶里，先把导管移开。');
        if (J.air + J.o2 < 2) { J.where = 'table'; J.water = 1; return; }
        J.where = 'table'; J.open = false; far();
        const full = J.water < 0.04;
        log(`取出集气瓶${k ? '②' : '①'}：约 ${Math.round(J.air + J.o2)} mL 气体${full ? '（集满）' : `，瓶里留有约 ${Math.round(J.water * V_JAR)} mL 水`}`, frac(J.air, J.o2));
        status(`在水面下用玻璃片盖住瓶口，取出集气瓶${k ? '②' : '①'}，<b>正放</b>在桌上（氧气的密度比空气略大）。` + (full ? '' : '瓶里还留着一点水。') + ' 可以用<b>带火星的木条</b>或<b>细铁丝</b>来检验。');
        if (!S.seen.has('collect') && J.o2 > 20) { S.seen.add('collect'); W?.goal.done('collect'); }
      },
      test(kind, k) {
        const J = S.jars[k];
        if (J.where !== 'table' || J.air + J.o2 < 2) return status('先收集一瓶气体，盖好玻璃片正放在桌上，再检验。');
        if (J.tested) return status(`集气瓶${k ? '②' : '①'}已经检验过了（里面的氧气用掉了一些）。换一瓶，或者再收集一瓶。`);
        const x = frac(J.air, J.o2);
        const gasH = jars[k].h * (1 - J.water);               // 瓶里气体那一段的高度
        if (gasH < (kind === 'wire' ? 0.045 : 0.022)) return status(`集气瓶${k ? '②' : '①'}里水太多，气体只有约 ${Math.round(J.air + J.o2)} mL，${kind === 'wire' ? '细铁丝' : '木条'}伸进去就碰到水了。多收集一些再检验。`);
        J.tested = kind; J.open = true;
        S.test = { kind, k, t: 0, x };
        near(HOME[k].clone().add(new THREE.Vector3(-0.01, 0.06, -0.04)), [0.05, 0.25, 1], 0.36);
        if (kind === 'splint') {
          const msg = x >= RELIGHT ? '木条<b>复燃</b>了！' : x >= BRIGHT ? '木条亮了许多，但<b>没有复燃</b>。' : '木条只是稍亮一点。';
          status(`把带火星的木条伸进集气瓶${k ? '②' : '①'}：${msg}`);
          log(`带火星的木条伸进瓶${k ? '②' : '①'}：${x >= RELIGHT ? '复燃' : x >= BRIGHT ? '很亮，未复燃' : '稍亮'}`, x);
          J.o2 *= 0.85;
        } else {
          const bare = J.water < 0.04;
          if (x >= IRON) {
            status(`细铁丝伸进集气瓶${k ? '②' : '①'}：<b>剧烈燃烧，火星四射</b>，生成黑色固体。` + (x < 0.75 ? '不过燃烧得<b>不太旺</b>，一会儿就熄灭了。' : ''));
            if (bare) { J.cracked = true; warn('瓶底没有留水，溅落的高温熔融物使瓶底炸裂了'); }
          } else status(`细铁丝伸进集气瓶${k ? '②' : '①'}：火柴烧完，铁丝只是<b>发红，没有燃烧</b>。这瓶里的氧气不够浓。`);
          log(`细铁丝伸进瓶${k ? '②' : '①'}：${x >= IRON ? (x < 0.75 ? '燃烧，但不太旺' : '剧烈燃烧，火星四射') : '只发红，不燃烧'}`, x);
          J.o2 *= 0.5;
        }
        if (!S.seen.has('test')) { S.seen.add('test'); W?.goal.done('test'); }
        A.maybeAsk();
      },
      // 空气中的对照：带火星的木条放在空气里；细铁丝放到酒精灯火焰上烧（实验2-1、2-4）
      airTest(kind) {
        S.test = { kind, k: -1, t: 0, x: 0.21, air: true };
        if (kind === 'splint') { status('带火星的木条放在<b>空气</b>里：只有一点火星，<b>不复燃</b>。'); log('带火星的木条在空气中：不复燃', 0.21); }
        else { status('细铁丝放在酒精灯火焰上烧：<b>红热</b>，但<b>不燃烧</b>。'); log('细铁丝在空气中（酒精灯上）加热：红热，不燃烧', 0.21); }
      },
      maybeAsk() {
        if (!W || W.asked || !S.seen.has('first') || !S.jars.some((J) => J.tested)) return;
        W.asked = true; W.q.el.hidden = false;
        status('看看面板上的<b>气体记录</b>：导管口刚开始冒气泡时，冒出的气体里氧气约占多少？和空气（约 21%）比一比。想一想：为什么刚开始有气泡放出时，不宜立即收集？');
      },
      reset() {
        bubs.clear(); sparks.clear(); purple.clear(); drip.clear();
        S = fresh(); stick.setState('none'); tr.setColor(CHEM.water);
        wire.glow.material.opacity = 0; wire.wire.material.color.setHex(CHEM.iron); wire.flame.setOn(false);
        if (W) { W.q.el.hidden = true; W.asked = false; W.log.clear(); W.goal.undo('seal', 'load', 'collect', 'test', 'stop', 'why'); }
        status('重新摆好了器材。先<b>检查装置的气密性</b>：导管口已经浸在水里，<b>按住试管</b>（用手握住），看导管口。');
      },
    };

    // ---------------- 指针 ----------------
    const nearMouth = (p) => p.distanceTo(mouthPos()) < 0.035;
    const pointer = draggable(group, [
      { obj: tubePick, plane: 'xy', offset: 0, hint: () => (S.lit ? '' : S.seal ? '上下拖：改变试管口的朝向' : '按住：用手握住试管'),
        onStart: (p) => { S.tubeDrag = p ? p.y : null; S.tubeMoved = false; A.hold(true); },
        onDrag: (p) => { if (S.tubeDrag == null || S.lit) return; const dy = p.y - S.tubeDrag; if (Math.abs(dy) > 0.02 && !S.tubeMoved) { S.tubeMoved = true; A.hold(false); A.tilt(dy > 0 ? 'up' : 'down'); } },
        onEnd: () => { A.hold(false); } },
      { obj: plugPick, plane: 'xy', offset: 0, hint: () => (S.plug === 'in' ? '点一下：拔出橡胶塞' : '点一下：塞上橡胶塞'), onTap: () => A.plug(), onStart: () => {}, onDrag: () => {}, onEnd: () => {} },
      { obj: spoonPick, plane: 'xy', offset: 0, hint: '拖到试管口：装入高锰酸钾',          // 在试管所在的竖直面里拖：对准管口不受透视影响
        enabled: () => !S.powder, onDrag: (p) => { spoon.position.set(p.x - 0.004, Math.max(0.004, p.y), 0); },
        onEnd: () => { if (nearMouth(spoon.position.clone().setZ(0))) A.dose(); spoon.position.copy(SPOON_HOME); } },
      { obj: cottonPick, plane: 'xy', offset: 0, hint: '拖到试管口：放一团棉花',
        enabled: () => !S.cotton, onStart: () => { S.cottonDrag = true; }, onDrag: (p) => { cotton.position.set(p.x, Math.max(0.007, p.y), 0); },
        onEnd: () => { S.cottonDrag = false; if (nearMouth(cotton.position.clone().setZ(0))) A.cotton(); cotton.position.copy(COTTON_HOME); } },
      { obj: lampPick, plane: 'xy', offset: 0, hint: () => (S.lit ? '左右拖：移动酒精灯；点一下：熄灭' : '点一下：点燃酒精灯'),
        onTap: () => A.light(),
        onStart: (p) => { S.lampDrag = p ? { x: p.x, l: S.lampX } : null; },
        onDrag: (p) => { if (!S.lampDrag) return; const nx = clamp(S.lampDrag.l + (p.x - S.lampDrag.x), -0.3, -0.12); if (S.lit) S.travel += Math.abs(nx - S.lampX); S.lampX = nx; },
        onEnd: () => { S.lampDrag = null; } },
      { obj: endPick, plane: 'xy', offset: 0, hint: () => (S.end === 'air' ? '拖进水槽 / 集气瓶口' : '拖动导管口：移出水面、伸进集气瓶'),
        onDrag: (p) => { S.dragTip = new THREE.Vector3(clamp(p.x, -0.01, 0.17), clamp(p.y, MOUTH_Y + 0.006, 0.1), 0); },
        onEnd: () => {
          const p = S.dragTip; S.dragTip = null; if (!p) return;
          let where = 'air';
          if (p.y < tr.level - 0.004 && p.x > 0.0 && p.x < 0.17) where = 'water';
          for (const k of [0, 1]) if (S.jars[k].where === 'trough' && Math.abs(p.x - SLOT[k]) < 0.02 && p.y < MOUTH_Y + 0.03) where = 'jar' + k;
          A.moveEnd(where);
        } },
      ...[0, 1].map((k) => ({ obj: jars[k].pick, anchor: jars[k], plane: 'xy', offset: HOME[k].z, keepOffset: true,
        hint: () => (S.jars[k].where === 'trough' ? '点一下：盖上玻璃片，取出正放' : S.jars[k].air + S.jars[k].o2 > 2 ? '' : '拖进水槽：倒立在水里'),
        onTap: () => { if (S.jars[k].where === 'trough') A.jarOut(k); },
        onStart: () => { if (S.jars[k].where !== 'table' || S.jars[k].air + S.jars[k].o2 > 0.5) { S.jarK = null; return; } S.jarK = k; S.jars[k].where = 'hand'; },
        onDrag: (p) => { if (S.jarK !== k) return; S.jarDrag = new THREE.Vector3(p.x, Math.max(0, p.y), HOME[k].z * clamp(1 - (p.x - HOME[k].x) / -0.12, 0, 1)); },
        onEnd: () => { if (S.jarK !== k) return; const p = S.jarDrag; S.jarDrag = null; S.jarK = null; S.jars[k].where = 'table'; if (p && p.x < 0.18 && p.x > -0.01) A.jarIn(k); } })),
      { obj: stickPick, plane: 'xy', offset: HOME[0].z, hint: '拖到集气瓶口：伸进去检验',        // 在集气瓶所在的竖直面里拖
        onStart: () => { stick.setState('ember', 0.2); stick.rotation.z = Math.PI; },
        onDrag: (p) => { stick.position.set(p.x, Math.max(0.03, p.y), HOME[0].z); },
        onEnd: () => { const k = HOME.findIndex((H) => Math.abs(stick.position.x - H.x) < 0.03 && stick.position.y < 0.2); if (k >= 0) A.test('splint', k); else if (stick.position.y > 0.06) A.airTest('splint'); else { stick.setState('none'); stick.position.copy(STICK_HOME); stick.rotation.z = Math.PI / 2; } } },
      { obj: wirePick, plane: 'xy', offset: HOME[0].z, hint: '拖到集气瓶口：点燃火柴，伸进去',
        onStart: () => { wire.rotation.z = 0; wire.flame.setOn(true); },
        onDrag: (p) => { wire.position.set(p.x, Math.max(0.03, p.y), HOME[0].z); },
        onEnd: () => { const k = HOME.findIndex((H) => Math.abs(wire.position.x - H.x) < 0.03 && wire.position.y < 0.2); if (k >= 0) A.test('wire', k); else if (S.lit && Math.abs(wire.position.x - S.lampX) < 0.03 && wire.position.y > 0.06 && wire.position.y < 0.16) A.airTest('wire'); else { wire.flame.setOn(false); wire.position.copy(WIRE_HOME); wire.rotation.z = Math.PI / 2; } } },
    ], { tip: tag('', 'pill') });

    // ---------------- 每帧 ----------------
    const tmp = new THREE.Vector3();
    const spawnBubble = (from, vol) => bubs.spawn({ p: from.clone().add(new THREE.Vector3((Math.random() - 0.5) * 0.002, 0, (Math.random() - 0.5) * 0.003)), v: new THREE.Vector3(0, 0.02, 0), size: 0.0017 + Math.random() * 0.0008 + Math.min(0.0012, vol * 0.002), life: 3, vol });
    const step = (dt) => {
      const h = Math.min(dt, 1 / 30);
      S.t += h;
      const sealed = S.plug === 'in' && !S.broken;
      // 温度：手握、加热、冷却
      const under = heating();
      if (S.lit) S.heatT += h;
      if (S.lit && !under && Math.abs(S.lampX - powderPos().x) < 0.08) S.travel += 0;      // 在试管下面来回移动由拖动计入
      if (S.lit && S.travel > 0.09 && !S.preheated) S.preheated = true;
      const heatT = under ? 340 : S.lit && Math.abs(S.lampX - powderPos().x) < 0.07 ? 110 : S.hold ? 38 : T0;
      S.Tp += (heatT - S.Tp) * Math.min(1, h * (under ? 0.22 : S.hold ? 1.4 : heatT > T0 ? 0.6 : S.Tp < 45 ? 0.6 : 0.12));     // 手握的那点温度，松手后很快散掉
      S.Tg += (Math.max(T0, (S.Tp - T0) * 0.75 + T0) - S.Tg) * Math.min(1, h * (S.Tp < 45 ? 2 : 0.9));
      S.Tglass = S.Tp;
      if (under && !S.preheated && S.Tp > 120 && !S.uneven) { S.uneven = true; warn('没有预热就对准一处加热：试管受热不均，容易炸裂'); }
      // 高锰酸钾分解
      let made = 0;
      if (S.left > 0 && S.Tp > 200) {
        const k = 0.055 * (S.Tp - 200) / 140;
        const dm = Math.min(S.left, S.left * k * h + 0.004 * h);
        S.left -= dm; made = dm * PER_G;          // 每克高锰酸钾最多放出 PER_G 毫升氧气
        S.o2 += made;
      }
      // 试管里的气体：容量随温度变（按室温毫升计）
      const cap = sealed ? V_TUBE * (T0 + 273) / (S.Tg + 273) : Infinity;
      const total = S.air + S.o2;
      const xNow = total > 0 ? S.o2 / total : 0;      // 只算放出来的氧气占多少（用于分配进集气瓶的空气 / 氧气）
      S.x = frac(S.air, S.o2);                         // 真正的氧气体积分数
      let out = 0;
      if (sealed && total > cap) {
        out = total - cap;
        S.air -= out * (1 - xNow); S.o2 -= out * xNow;
        if (S.suck > 0) { const d = Math.min(S.suck, out); S.suck -= d; out -= d; }   // 先把倒吸进导管的水压回去
      }
      // 导管口在水里、气体收缩：倒吸
      if (sealed && total < cap - 0.02 && S.end !== 'air') {
        const want = cap - total;
        const inflow = Math.min(want, h * 2.5);
        S.suck += inflow; S.air += inflow;           // 吸进去的水占了体积（这里把它当成填补体积，水柱长度由 suck 表示）
      } else if (S.end === 'air' || !sealed) S.suck = Math.max(0, S.suck - h * 4);
      if (!sealed) { S.air = V_TUBE; S.o2 = 0; }           // 敞着口：试管里就是空气
      // 冒出去的气体
      S.flow = out / h;
      if (out > 0) {
        const end = endPiece.position;
        if (S.end === 'water' || S.end === 'air') {
          if (S.end === 'water') { const u = S.hold ? 0.06 : 0.35; S.bubAcc += out; while (S.bubAcc > u) { S.bubAcc -= u; spawnBubble(end, u); } }
        } else {
          const k = S.end === 'jar0' ? 0 : 1, J = S.jars[k];
          const room = J.water * V_JAR;
          const into = Math.min(out, room);
          J.air += into * (1 - xNow); J.o2 += into * xNow;
          J.water = Math.max(0, 1 - (J.air + J.o2) / V_JAR);
          S.bubAcc += out; while (S.bubAcc > 0.35) { S.bubAcc -= 0.35; spawnBubble(end, 0.35); }
          if (out > room + 0.01) { S.overflow = (S.overflow || 0) + (out - room); if (!S.seen.has('full' + k)) { S.seen.add('full' + k); status(`集气瓶${k ? '②' : '①'}里的水排完了，瓶口有<b>大气泡</b>冒出——集满了。把导管移开，再点集气瓶，盖上玻璃片取出。`); } }
        }
        if (S.firstBubbleT == null && S.end !== 'air') S.firstBubbleT = S.t;
        if (S.lit && S.end !== 'air' && !S.seen.has('first')) { S.seen.add('first'); log('导管口开始冒气泡（断断续续）', S.x); }
      }
      // 气泡是否“连续均匀”
      S.steady += ((S.flow > 0.8 && xNow > 0.8 ? 1 : 0) - S.steady) * Math.min(1, h * 1.5);
      if (S.flow > 0.6 && xNow > 0.85 && !S.seen.has('steady') && S.end === 'water') { S.seen.add('steady'); log('气泡连续、均匀', S.x); status('导管口的气泡<b>连续而均匀</b>了。这时把导管口伸进盛满水的集气瓶，开始收集。'); }
      // 气密性：手握时冒泡，松手后导管里有一段水柱
      if (S.hold && sealed && S.end === 'water') { S.holdT += h; if (out > 0) S.sealBubbles += out; }
      if (S.sealWait && S.suck > 0.06 && S.seal !== 'ok') { S.sealWait = false; S.seal = 'ok'; W?.goal.done('seal'); setTimeout(far, 2200); status('手握试管，导管口有<b>气泡冒出</b>；松开手，导管里形成了<b>一段水柱</b>——装置<b>不漏气</b>。现在点一下橡胶塞把它<b>拔出</b>，装药品。'); }
      if (!S.hold && S.holdT > 0.4) {
        if (S.sealBubbles > 0.05 && S.seal !== 'ok') { S.sealWait = true; status('手握试管，导管口冒出了<b>气泡</b>。现在松开了手——盯着导管口。'); }
        else if (S.seal !== 'ok') status(S.plug !== 'in' ? '橡胶塞没塞上，手握试管时导管口没有气泡——这样查不出来。先塞紧橡胶塞。' : S.end !== 'water' ? '导管口要先浸在水里，才能看出有没有气泡。' : '握的时间再长一点。');
        S.holdT = 0; S.sealBubbles = 0;
      }
      // 倒吸：水沿导管进到热试管里，试管炸裂
      endWater.visible = S.suck > 0.02; endWater.scale.y = Math.min(0.075, S.suck * 0.09);      // 导管内径约 2 mm：0.1 mL 水大约是 3 cm 长的水柱（画面上略缩短）
      if (S.suck > 3.0 && !S.broken && S.Tglass > 70) { S.broken = 'suck'; S.lit = false; warn('水倒吸进了热的试管，试管骤然冷却，炸裂了'); status('<b>水倒吸进热试管，试管炸裂了。</b>所以停止加热时，要<b>先把导管移出水面，再熄灭酒精灯</b>。点“再做一次”。'); }
      if (S.stoppedRight === false && S.suck > 0.3 && !S.seen.has('suckwarn')) { S.seen.add('suckwarn'); status('导管里的水在<b>往回吸</b>！赶快把导管口<b>拖出水面</b>。'); }
      if (S.stoppedRight === false && S.end === 'air' && !S.broken && S.suck < 0.05 && !S.seen.has('saved')) { S.seen.add('saved'); W?.goal.done('stop'); status('及时把导管拖出了水面，没有倒吸进试管。记住正确的顺序：<b>先撤导管，再熄灯</b>。'); }
      // 管口朝上加热：冷凝水倒流到试管底
      if (S.tilt === 'up' && S.Tp > 130 && !S.broken) { S.upT = (S.upT || 0) + h; if (S.upT > 2.5) { S.broken = 'tilt'; S.lit = false; warn('冷凝水倒流到热的试管底部，试管炸裂了'); status('试管口朝上，管口的<b>冷凝水倒流到热的试管底部</b>，试管炸裂了。所以试管口要<b>略向下倾斜</b>。点“再做一次”。'); } }
      // 没放棉花：粉末进入导管，水槽里的水变红
      if (!S.cotton && made > 0 && S.end !== 'air') { S.purple = Math.min(1, S.purple + h * 0.05); if (Math.random() < h * 8) purple.spawn({ p: endPiece.position.clone(), v: new THREE.Vector3((Math.random() - 0.5) * 0.01, 0.004, (Math.random() - 0.5) * 0.01), size: 0.0009, life: 2 }); if (S.purple > 0.15 && !S.seen.has('purple')) { S.seen.add('purple'); status('水槽里的水<b>变成了紫红色</b>：没放棉花，加热时高锰酸钾粉末顺着导管进到了水里。'); } }
      if (S.purple > 0) tr.setColor(new THREE.Color(CHEM.water).lerp(new THREE.Color(0xa13a8e), S.purple * 0.8).getHex(), 0.32 + S.purple * 0.2);
      // 粒子
      bubs.update(h, (p, d) => {
        p.v.y += 0.18 * d; p.p.addScaledVector(p.v, d);
        p.p.x += Math.sin(p.age * 25 + p.size * 3000) * 0.0003;
        for (const k of [0, 1]) {
          if (S.jars[k].where !== 'trough') continue;
          const inside = Math.abs(p.p.x - SLOT[k]) < 0.017 && p.p.y > MOUTH_Y;
          if (inside) { const lvl = MOUTH_Y + jars[k].h * S.jars[k].water; if (p.p.y > lvl) return false; }
        }
        return p.p.y < tr.level;
      });
      purple.update(h, (p, d) => { p.p.addScaledVector(p.v, d); p.size *= 1 + d * 0.8; return true; });
      sparks.update(h, 0.5);
      // 检验的动画
      const T = S.test;
      if (T && T.air) {
        T.t += h;
        if (T.kind === 'splint') { stick.rotation.z = Math.PI; stick.setState('ember', 0.35); if (T.t > 3) { S.test = null; stick.setState('none'); stick.position.copy(STICK_HOME); stick.rotation.z = Math.PI / 2; } }
        else {
          wire.rotation.z = 0; wire.position.lerp(new THREE.Vector3(S.lampX, 0.112, 0), 0.2); wire.flame.setOn(false);
          wire.glow.material.opacity = T.t > 0.8 ? 0.55 : 0; wire.glow.material.color.setHex(0xff5a1f); wire.glow.scale.setScalar(0.035);
          if (T.t > 4) { S.test = null; wire.glow.material.opacity = 0; wire.position.copy(WIRE_HOME); wire.rotation.z = Math.PI / 2; }
        }
      } else if (T) {
        T.t += h;
        const hj = jars[T.k].h, wl = hj * S.jars[T.k].water;               // 瓶里剩的水在下面：木条、铁丝都停在水面以上的气体里
        const jarTop = HOME[T.k].clone().add(new THREE.Vector3(0, Math.max(hj * 0.55, wl + 0.02), 0));
        if (T.kind === 'splint') {
          stick.position.lerp(jarTop, 0.2); stick.rotation.z = Math.PI;
          stick.setState(T.x >= RELIGHT && T.t > 0.6 ? 'flame' : 'ember', T.x >= RELIGHT ? 1 : T.x >= BRIGHT ? 0.9 : 0.45);
          if (T.t > 4) { S.test = null; far(); stick.setState('none'); stick.position.copy(STICK_HOME); stick.rotation.z = Math.PI / 2; }
        } else {
          wire.position.lerp(HOME[T.k].clone().add(new THREE.Vector3(0, Math.min(hj - 0.04, Math.max(hj * 0.3, wl + 0.012)), 0)), 0.2); wire.rotation.z = 0;
          wire.flame.setOn(T.t < 1.2);
          const burn = T.x >= IRON && T.t > 1.1 && T.t < 1.1 + 4 * (T.x - 0.5);
          wire.glow.material.opacity = burn ? 1 : T.t > 1.1 && T.t < 3 ? 0.45 : 0; wire.glow.scale.setScalar(burn ? 0.07 : 0.035);
          wire.glow.material.color.setHex(burn ? 0xfff1c0 : 0xff6a2a);
          if (burn) { const n = Math.round((T.x - 0.5) * 60 * h * 30); const c = wire.localToWorld(new THREE.Vector3(0, 0.014, 0)); group.worldToLocal(c); for (let i = 0; i < n; i++) sparks.spawn(c.clone().add(new THREE.Vector3((Math.random() - 0.5) * 0.006, (Math.random() - 0.5) * 0.02, (Math.random() - 0.5) * 0.006)), new THREE.Vector3((Math.random() - 0.5) * 0.42, Math.random() * 0.24 - 0.06, (Math.random() - 0.5) * 0.42), 0.25 + Math.random() * 0.3); }
          if (T.t > 1.1 && T.x >= IRON) wire.wire.material.color.setHex(0x2a2a2e);
          if (T.t > 6) { S.test = null; far(); wire.flame.setOn(false); wire.glow.material.opacity = 0; wire.position.copy(WIRE_HOME); wire.rotation.z = Math.PI / 2; wire.wire.material.color.setHex(CHEM.iron); }
        }
      }
      // “看看气体里”：试管里、两个集气瓶里的分子（红 = 氧气，灰蓝 = 空气里的其他气体）
      mols.visible = S.view;
      if (S.view) {
        mols.begin();
        const put = (count, xo2, center, sx, sy, sz, q) => {
          for (let i = 0; i < count; i++) {
            const r1 = Math.sin(i * 12.9898 + S.t * 0.7) * 0.5, r2 = Math.sin(i * 78.233 + S.t * 0.9) * 0.5, r3 = Math.sin(i * 39.425 + S.t * 1.1) * 0.5;
            tmp.set(r1 * sx, r2 * sy, r3 * sz); if (q) tmp.applyQuaternion(q);
            mols.add(((i * 7) % 20) / 20 < xo2 ? 'O2' : 'N2', center.clone().add(tmp), i * 1.7 + S.t * (0.6 + (i % 5) * 0.2));      // 交错着分配：少量分子时比例也准
          }
        };
        const tot = S.air + S.o2;
        if (S.plug === 'in') put(60, frac(S.air, S.o2), bottomPos().addScaledVector(dir(), 0.075), 0.011, 0.11, 0.011, tubeHold.quaternion);
        S.jars.forEach((J, k) => {
          const g = J.air + J.o2; if (g < 0.5) return;
          const c = J.where === 'trough' ? new THREE.Vector3(SLOT[k], MOUTH_Y + jars[k].h * (1 + J.water) / 2, 0) : HOME[k].clone().add(new THREE.Vector3(0, jars[k].h * (1 + J.water) / 2, 0));
          put(Math.round(70 * g / V_JAR), frac(J.air, J.o2), c, 0.028, jars[k].h * (1 - J.water) * 0.85, 0.028, null);
        });
        mols.end();
        if (!S.seenEarly && S.lit && S.x < 0.7 && S.flow > 0.1) { S.seenEarly = true; A.maybeAsk(); }
      }
      // 标签
      const e = endPiece.position;
      tags.tip.loc(group, e.x + 0.012, e.y + 0.012, 0.01).text(S.flow > 0.05 && S.end !== 'air' ? (S.steady > 0.6 ? '气泡连续、均匀' : '断断续续地冒泡') : '');
      [0, 1].forEach((k) => {
        const J = S.jars[k], j = jars[k];
        const t = J.cracked ? '瓶底炸裂' : J.air + J.o2 > 2 ? `集气瓶${k ? '②' : '①'}` + (S.view ? `（氧气约 ${Math.round(100 * frac(J.air, J.o2))}%）` : '') : '';
        tags['j' + k].loc(group, j.position.x, J.where === 'trough' ? MOUTH_Y + j.h + 0.012 : j.position.y + j.h + 0.02, 0.01).text(t);
      });
      if (S.warnT > 0) { S.warnT -= h; tags.warn.loc(group, -0.16, 0.22, 0).text(S.warnMsg); } else tags.warn.text('');
    };

    return {
      group: root,
      pointer,
      size: { w: 0.66, d: 0.2, h: 0.28 },
      view: { elev: 16, azim: -8, lookY: 0.42, margin: 1.04 },
      mount(ui) {
        const q = buttons(['试管里原有的空气受热膨胀，先被赶了出来', '刚开始的氧气温度太高，不能收集', '刚开始冒出的是水蒸气'].map((t, j) => ({ text: t, ghost: true, onClick: () => {
          if (j) return status(j === 1 ? '温度高低不影响它是不是氧气。看看“看看气体里”：刚冒出的气泡里是什么？' : '高锰酸钾是固体粉末，这里产生的气体主要不是水蒸气。看看“看看气体里”。');
          q.el.hidden = true; W.goal.done('why');
          status('对。刚冒出的气泡是试管里原有的<b>空气</b>，这时就收集，瓶里会混有不少空气。还要注意：<b>木条复燃不能说明氧气纯净</b>，铁丝燃烧对氧气浓度的要求高得多。');
        } })));
        q.el.hidden = true;
        const view = seg('看看气体里（示意）', ['不看', '看分子'], (_, k) => { S.view = !!k; if (k && !S.near) near(bottomPos().addScaledVector(dir(), 0.1), [0.1, 0.25, 1], 0.28); });
        const tilt = seg('试管口', ['略向下倾斜', '朝上（错误示范）'], (_, k) => A.tilt(k ? 'up' : 'down'));
        const end = seg('导管口', ['水槽里', '集气瓶①', '集气瓶②', '移出水面'], (_, k) => A.moveEnd(['water', 'jar0', 'jar1', 'air'][k]));
        const btns = buttons([
          { text: '手握试管（检查气密性）', ghost: true, onClick: () => { A.hold(true); setTimeout(() => A.hold(false), 1400); } },
          { text: '拔出 / 塞上橡胶塞', ghost: true, onClick: () => A.plug() },
          { text: '装高锰酸钾', ghost: true, onClick: () => A.dose() },
          { text: '放棉花', ghost: true, onClick: () => A.cotton() },
          { text: '点燃 / 熄灭酒精灯', ghost: true, onClick: () => A.light() },
          { text: '预热，再对准药品', ghost: true, onClick: () => { if (!S.lit) return status('先点燃酒精灯。'); let i = 0; const tick = setInterval(() => { const nx = -0.262 + Math.sin(i * 0.5) * 0.04; S.travel += Math.abs(nx - S.lampX); S.lampX = nx; if (++i > 26) { clearInterval(tick); S.lampX = powderPos().x; } }, 60); } },
          { text: '集气瓶①倒立在水槽中', ghost: true, onClick: () => A.jarIn(0) },
          { text: '集气瓶②倒立在水槽中', ghost: true, onClick: () => A.jarIn(1) },
          { text: '取出集气瓶①', ghost: true, onClick: () => A.jarOut(0) },
          { text: '取出集气瓶②', ghost: true, onClick: () => A.jarOut(1) },
          { text: '带火星的木条检验瓶①', ghost: true, onClick: () => A.test('splint', 0) },
          { text: '细铁丝伸进瓶②', ghost: true, onClick: () => A.test('wire', 1) },
          { text: '再做一次', ghost: true, onClick: () => A.reset() },
        ]);
        const nearB = buttons([{ text: '凑近看导管口', ghost: true, onClick: () => (S.near ? far() : near(endPiece.position.clone().add(new THREE.Vector3(-0.03, 0.03, 0)), [0.1, 0.3, 1], 0.24)) }]);
        const logT = table(['加热/s', '发生了什么', '氧气约占（模型）'], {});
        const thresholds = h('p', { class: 'fineprint', html: '说明：“氧气约占”是模型估计，不是测出来的。木条复燃（约 45% 以上）、细铁丝燃烧（约 57% 以上）所需的氧气浓度是按初中探究题里的实验数据取的近似值，随木条、铁丝粗细和条件而变；集气瓶按 60 mL 计，一药匙高锰酸钾按 2 g 计。' });
        // 按钮只是备用（不方便拖动、投屏时用）：收进一个默认合上的“用按钮做”
        const alt = h('details', { class: 'how-to' }, h('summary', {}, '用按钮做（不方便拖动时）'), end.el, tilt.el, btns.el);
        const again = buttons([{ text: '再做一次', ghost: true, onClick: () => A.reset() }]);
        ui.controls.append(logT.el, q.el, nearB.el, view.el, again.el, alt, thresholds);
        W = {
          q, log: logT, nearBtn: nearB.btns[0], asked: false, status: (m) => ui.status(m),
          goal: goals(ui, [['seal', '检查装置的气密性'], ['load', '装入高锰酸钾，试管口放一团棉花'], ['collect', '用排水法收集一瓶氧气'], ['test', '检验收集到的气体'], ['stop', '正确地停止加热'], ['why', '想一想：为什么不在刚冒气泡时就收集']]),
        };
        ui.status('先<b>检查装置的气密性</b>：导管口已经浸在水槽的水里，<b>按住试管</b>（相当于用手握住），看导管口有没有气泡。');
      },
      update(dt, t) {
        placeAll();
        step(dt);
        lamp.flame.setOn(S.lit); lamp.flame.update(t);
        stick.update(t); wire.flame.update(t);
        if (!W) return;
        if (S.powder && S.cotton && S.plug === 'in' && !S.seen.has('load')) { S.seen.add('load'); W.goal.done('load'); }
      },
      dispose() { bubs.dispose(); purple.dispose(); drip.dispose(); },
      debug: { get S() { return S; }, A, jars, tube, endPiece, mouthPos, powderPos },
    };
  },
};
