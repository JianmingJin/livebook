// 课题2 碳的氧化物 · 实验 6-4 二氧化碳的溶解性（课本第 136 页图 6-11）。
//
// 向一个收集满二氧化碳气体的质地较软的塑料瓶中加入约 1/3 容积的水，立即旋紧瓶盖，振荡——瓶子变瘪。
// 看不见的东西：二氧化碳 = 深灰点。瓶里的气体点越来越少，溶进水里的（水里的小深灰点）越来越多；瓶盖没旋紧时补进来的空气 = 浅灰点 / 蓝点。
// 模型（近似，界面上写明）：20 ℃、1 个大气压下 1 体积水约溶解 0.88 体积二氧化碳（课本：约 1 体积）。
//   旋紧瓶盖后，溶进水里多少，瓶里的气体就少多少——软瓶被外面的大气压压瘪。振荡让溶解快得多（几秒），静置时很慢。
//   瓶盖没旋紧：外面的空气从瓶口补进来，瓶子不瘪。
import * as THREE from 'three';
import { buttons, seg, table } from './kit/ui.js';
import { draggable, clamp, lerp } from './kit/interact.js';
import { canvasTex } from './kit/props.js';
import { Particles } from './kit/fx.js';
import { chemBeaker, glassMat, CHEM } from './kit/chem.js';
import { water2 } from './kit/chemfx.js';
import { lessonBar } from './kit/lessonbar.js';
import { qaFlow, sandbox, wrapPointer, paperSheet, demoActs } from './kit/chemlesson.js';
import { sfx } from './kit/audio.js';
import { paint, inked } from '../live/ink.js';
import { h } from '../ui/Panel.js';

const DARK = 0x3d4350, LIGHT = 0xb9bec8, BLUE = 0x2f7fd8;
const BOT = new THREE.Vector3(-0.025, 0, 0), BR = 0.031;
// 瓶身沿高度细分（每 4.6 mm 一圈），压瘪时才能凹得自然
const BOT_PTS = [[0.0003, 0], [BR - 0.003, 0], [BR, 0.004], ...Array.from({ length: 20 }, (_, i) => [BR, 0.008 + i * 0.0046]), [0.029, 0.102], [0.026, 0.11], [0.02, 0.118], [0.014, 0.125], [0.011, 0.128], [0.011, 0.14]];
const V_BOT = 330;                                                                // mL（模型）
const BOT_MOUTH = BOT.clone().add(new THREE.Vector3(0, 0.14, 0));
const CUP_HOME = new THREE.Vector3(0.045, 0, 0), CUP_R = 0.026, CUP_H = 0.07, CUP_V = 160;
const CAP_HOME = new THREE.Vector3(0.03, 0, 0.06);
const SOL = 0.88;                                                                 // 20 ℃：1 体积水约溶解 0.88 体积二氧化碳
const SPOUT = new THREE.Vector3(-CUP_R - 0.003, CUP_H / 2, 0);                     // 手抓在杯身中间：杯嘴在手的左上方（拿起来时杯子不跳）

export default {
  id: 'co2bottle',
  fig: '图6-11',
  title: '二氧化碳的溶解性',
  stampText: '实验',
  style: 'paper',
  predict: {
    q: '向一个收集满二氧化碳的软塑料瓶里加约 1/3 容积的水，立即旋紧瓶盖，振荡——瓶子会怎样？',
    hint: '课本第 136 页实验 6-4。想想二氧化碳能不能溶于水。',
    options: ['变瘪', '鼓起来', '没有变化'],
    answer: 0,
  },
  need: '向装满二氧化碳的软塑料瓶里加约 1/3 容积的水，立即旋紧瓶盖，振荡，看瓶子的变化；再根据实验 6-3、6-4 填课本上的表',
  conclusion: {
    crops: [{ page: 143, rect: [66, 143, 478, 203] }],
    quote: '二氧化碳能溶于水。在通常状况下，1 体积的水能溶解约 1 体积的二氧化碳，增大压强会溶解得更多。生产汽水等碳酸饮料就是利用了二氧化碳的这一性质。',
    why: '旋紧瓶盖后振荡，瓶里的二氧化碳溶进了水里，瓶里的气体变少、压强变小，外面的<b>大气压</b>把软塑料瓶压瘪了——说明二氧化碳<b>能溶于水</b>。瓶盖没旋紧时，外面的空气补进来，瓶子就不会瘪。<br>二氧化碳溶于水的过程中，有没有发生化学变化呢？看下一个实验（实验 6-5 石蕊纸花）。',
    src: '课本第 136–137 页 · 第六单元 课题2 碳的氧化物（实验 6-4）；二氧化碳在水中的溶解度：20 ℃ 约 0.88 体积 / 1 体积水',
  },

  create({ tag, look, back }) {
    const root = new THREE.Group(), group = new THREE.Group();
    root.add(group);
    let S = null, W = null;
    const status = (m) => { if (!S.demo) W?.status(m); };
    const done = (id) => { if (!S.demo) bar.done(id); };
    const log = (row) => { if (!S.demo) { W?.tbl.add(row); S.rows.push(row); } };

    paperSheet(group, { w: 0.26, d: 0.18, x: 0, z: 0.02 });

    // ================= 软塑料瓶、一杯水、瓶盖 =================
    const botGeo = new THREE.LatheGeometry(BOT_PTS.map(([r, y]) => new THREE.Vector2(r, y)), 40);
    const botBase = Float32Array.from(botGeo.attributes.position.array);
    const bottle = new THREE.Group(); bottle.position.copy(BOT); group.add(bottle);
    const botMesh = new THREE.Mesh(botGeo, glassMat({ opacity: 0.26 })); botMesh.renderOrder = 9; bottle.add(botMesh);
    const ring = inked(new THREE.Mesh(new THREE.CylinderGeometry(0.0125, 0.0125, 0.003, 24), paint(0xdfe6ea)), { width: 0.5 }); ring.position.y = 0.129; bottle.add(ring);
    let botWater = null, waterKey = '';
    const botPick = new THREE.Mesh(new THREE.CylinderGeometry(BR + 0.004, BR + 0.004, 0.14, 12), new THREE.MeshBasicMaterial({ visible: false })); botPick.position.y = 0.07; botPick.userData.pick = true; bottle.add(botPick);
    const cap = inked(new THREE.Mesh(new THREE.CylinderGeometry(0.0125, 0.0125, 0.012, 24), paint(0x3f7fc4, { keep: true })), { width: 0.6 }); group.add(cap);
    const capPick = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.022, 10), new THREE.MeshBasicMaterial({ visible: false })); capPick.userData.pick = true; cap.add(capPick);
    cap.position.copy(CAP_HOME).add(new THREE.Vector3(0, 0.006, 0));
    const cupPivot = new THREE.Group(); group.add(cupPivot);              // 转轴在杯嘴
    const cup = chemBeaker({ r: CUP_R, h: CUP_H, level: 0.05, color: CHEM.water, marks: true }); cup.position.set(CUP_R + 0.003, -CUP_H, 0); cupPivot.add(cup);
    const cupPick = new THREE.Mesh(new THREE.CylinderGeometry(CUP_R + 0.004, CUP_R + 0.004, CUP_H, 12), new THREE.MeshBasicMaterial({ visible: false })); cupPick.position.y = CUP_H / 2; cupPick.userData.pick = true; cup.add(cupPick);
    const CUP_PIVOT_HOME = CUP_HOME.clone().add(new THREE.Vector3(-CUP_R - 0.003, CUP_H, 0));
    cupPivot.position.copy(CUP_PIVOT_HOME);
    const drops = new Particles({ max: 80, geometry: new THREE.SphereGeometry(1, 6, 5), material: water2({ color: CHEM.water, base: 0.5 }) }); group.add(drops.mesh);

    // ================= 气体小点 =================
    const dotTex = canvasTex(64, 64, (g, Wd) => { const gr = g.createRadialGradient(Wd / 2, Wd / 2, 0, Wd / 2, Wd / 2, Wd / 2); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.55, 'rgba(255,255,255,1)'); gr.addColorStop(0.75, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, Wd, Wd); });
    const darkP = new Particles({ max: 200, sprite: true, color: DARK }), lightP = new Particles({ max: 100, sprite: true, color: LIGHT }), blueP = new Particles({ max: 40, sprite: true, color: BLUE });
    for (const p of [darkP, lightP, blueP]) { p.mat.uniforms.map.value = dotTex; p.mesh.renderOrder = 10; group.add(p.mesh); }
    const botDots = Array.from({ length: 48 }, (_, i) => ({ u: Math.sqrt(Math.random()) * 0.82, th: Math.random() * Math.PI * 2, y: Math.random(), rank: (i + 0.5) / 48, ph: Math.random() * 6, blue: i % 5 === 0, p: new THREE.Vector3(), size: 0.0034, alpha: 0.9 }));
    const solDots = Array.from({ length: 32 }, (_, i) => ({ u: Math.sqrt(Math.random()) * 0.8, th: Math.random() * Math.PI * 2, y: Math.random(), ph: Math.random() * 6, p: new THREE.Vector3(), size: 0.0022, alpha: 0.75 }));

    const botCard = tag('', 'cond'); botCard.px = [70, -60];

    // ================= 状态 =================
    const fresh = () => ({
      demo: false, rows: [],
      vw: 0, cupV: CUP_V, cupAt: 'home', cupCarry: null, cupTilt: 0, capOn: false, capT: 0, dis: 0, air: 0, shakeE: 0, botOff: new THREE.Vector3(), lastShake: null,
      waterLogged: false, shakeLogged: false, openLogged: false,
    });
    S = fresh();

    // ---- 塑料瓶 ----
    const squeeze = () => (S.capOn ? clamp(S.dis / V_BOT, 0, 0.62) : 0);        // 瓶子少了的体积占多少
    // 凹陷：瓶身中部最深，往瓶底、瓶肩渐浅；两侧被压进去，再加几道皱
    const dentAt = (th, y) => { if (y < 0.006 || y > 0.104) return 0; const b = Math.pow(Math.sin((Math.PI * (y - 0.006)) / 0.098), 0.8); return b * (0.5 + 0.42 * Math.cos(2 * th + 0.6) + 0.08 * Math.sin(5 * th + y * 140)); };
    let lastSq = -1;
    const deform = (sq) => {
      if (Math.abs(sq - lastSq) < 0.002) return; lastSq = sq;
      const a = Math.min(0.85, sq / 0.56), pos = botGeo.attributes.position;
      for (let i = 0; i < pos.count; i++) { const x = botBase[i * 3], y = botBase[i * 3 + 1], z = botBase[i * 3 + 2], k = 1 - a * dentAt(Math.atan2(z, x), y); pos.setXYZ(i, x * k, y, z * k); }
      pos.needsUpdate = true; botGeo.computeVertexNormals(); waterKey = '';
    };
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

    // ================= 操作 =================
    const A = {
      cupDrag(p) { if (!p) return; S.cupAt = 'carry'; S.cupCarry = p.clone(); },
      cupDrop() {
        S.cupAt = 'home'; S.cupCarry = null;
        if (S.vw > 5 && !S.waterLogged) {
          S.waterLogged = true;
          const f = S.vw / V_BOT;
          log(['向软塑料瓶里加水', `约 ${Math.round(S.vw)} mL（${f < 0.27 ? '不到 1/3' : f > 0.42 ? '一半左右' : '约 1/3'}容积）`, '']);
          done('water');
          status(`加了约 <b>${Math.round(S.vw)} mL</b> 水。<b>立即</b>旋紧瓶盖（点一下桌上的<b>瓶盖</b>）。`);
        }
      },
      capTap() {
        if (S.capOn) return status('瓶盖已经旋紧了。<b>振荡</b>瓶子：按住瓶子，左右来回拖几下。');
        if (S.vw < 5) return status('先往瓶里加约 1/3 容积的水，再旋紧瓶盖。');
        S.capOn = true; S.capT = 0; S.air = 0; sfx.clink({ freq: 1400, gain: 0.04 }); done('cap');
        status('旋紧了瓶盖。现在<b>振荡</b>瓶子：按住瓶子，左右来回拖几下。');
      },
      shake(p) {
        if (!p) return;
        const last = S.lastShake; S.lastShake = p.clone();
        if (!last) return;
        S.shakeE = Math.min(1, S.shakeE + Math.min(0.5, Math.abs(p.x - last.x) * 18));
        S.botOff.set(clamp(p.x - BOT.x, -0.012, 0.012), 0, 0);
      },
      shakeEnd() { S.lastShake = null; },
      reset() {
        S = fresh(); drops.clear(); W?.tbl.clear();
        if (W) { W.t1.close(); W.next.hidden = true; for (const c of W.cells) c.set(-1); }
        bar.undo('water', 'cap', 'shake', 'table');
        status('全部重新摆好了，记录也清空了。');
      },
    };

    const drag = draggable(group, [
      { obj: cupPick, plane: 'xy', offset: 0, hint: () => (S.capOn ? '' : '拖到塑料瓶口，按住：倒水'), onStart: (p) => A.cupDrag(p), onDrag: (p) => A.cupDrag(p), onEnd: () => A.cupDrop() },
      { obj: capPick, plane: 'xy', offset: 0, hint: () => (S.capOn ? '' : '点一下：旋紧瓶盖'), onTap: () => A.capTap(), onStart: () => {}, onDrag: () => {}, onEnd: () => {} },
      { obj: botPick, plane: 'xy', offset: 0, hint: () => (S.capOn ? '按住，左右来回拖：振荡' : '按住，左右来回拖：振荡（瓶盖还没旋紧）'), onStart: (p) => { S.lastShake = p ? p.clone() : null; }, onDrag: (p) => A.shake(p), onEnd: () => A.shakeEnd() },
    ], { tip: tag('', 'pill') });
    const act = demoActs(drag, group);
    const spoutAtMouth = () => BOT_MOUTH.clone().add(new THREE.Vector3(0.012, 0.004, 0)).sub(SPOUT);          // 手要到的地方：杯嘴正好在瓶口
    const bar = lessonBar({
      look, back, group,
      steps: [
        { id: 'water', title: '加水', todo: '把那杯<b>水</b>拖到软塑料瓶口，倒进约 <b>1/3</b> 容积的水（看瓶上的卡片），松手停止。', target: () => (S.cupAt === 'home' ? cup : null) },
        { id: 'cap', title: '旋紧瓶盖', todo: '<b>立即</b>点一下桌上的<b>瓶盖</b>，旋紧。', target: () => cap },
        { id: 'shake', title: '振荡', todo: '按住<b>塑料瓶</b>，左右来回拖几下（振荡）。看瓶子。', target: () => bottle },
        { id: 'table', title: '填表', todo: '根据实验 6-3 和 6-4，在左边把课本上的表填好。' },
      ],
      reels: {
        demo: {
          seal: '演示', label: '老师演示',
          ...sandbox({ get: () => S, set: (s) => { S = s; }, fresh, bar: () => bar, apply: () => { drops.clear(); } }),
          shots: [
            { cap: '拿起那杯水，往集满二氧化碳的软塑料瓶里倒进约 1/3 容积的水。', dur: 7, cam: [[BOT.x + 0.035, 0.11, 0], [0.1, 0.22, 1], 0.46],
              during: act.drag(cupPick, spoutAtMouth, { t0: 0.04, t1: 0.3, release: 0.98, until: () => S.vw >= V_BOT / 3 }) },
            { cap: '立即旋紧瓶盖。', dur: 2.6, cam: [[BOT.x, 0.11, 0], [0.1, 0.25, 1], 0.3], during: act.tap(capPick, 0.12) },
            { cap: '振荡：二氧化碳溶进水里，瓶里的气体变少，外面的大气压把瓶子压瘪了。', dur: 5, speed: 2, cam: [[BOT.x, 0.07, 0], [0.1, 0.25, 1], 0.34], during: act.wiggle(botPick, { t0: 0.04, t1: 0.85, amp: 0.016, hz: 2.2, dur: 5 }) },
            { cap: '瓶子变瘪了：二氧化碳能溶于水。演示完了，下面换你自己做。', dur: 3.5, cam: [[BOT.x + 0.02, 0.07, 0], [0.1, 0.25, 1], 0.38] },
          ],
        },
      },
    });
    const pointer = wrapPointer(drag, bar);

    // ================= 每帧 =================
    const step = (h, t) => {
      // 倒水：杯嘴到了瓶口就倾斜着倒（约 22 mL/s），松手停
      if (S.cupAt === 'carry' && S.cupCarry) {
        const spout = S.cupCarry.clone().add(SPOUT);
        const at = spout.distanceTo(BOT_MOUTH.clone().add(new THREE.Vector3(0.012, 0.004, 0))) < 0.035 && !S.capOn;
        cupPivot.position.lerp(at ? BOT_MOUTH.clone().add(new THREE.Vector3(0.012, 0.006, 0)) : spout, at ? 0.3 : 1);
        const tw = at ? 1.2 + (1 - S.cupV / CUP_V) * 0.6 : 0;
        S.cupTilt += (tw - S.cupTilt) * Math.min(1, h * 4);
        if (at && S.cupTilt > 1.0 && S.cupV > 0) {
          const dv = Math.min(S.cupV, 22 * h);
          S.cupV -= dv; S.vw = Math.min(V_BOT * 0.85, S.vw + dv);
          if (Math.random() < h * 30) drops.spawn({ p: BOT_MOUTH.clone().add(new THREE.Vector3((Math.random() - 0.5) * 0.006, 0.002, (Math.random() - 0.5) * 0.006)), v: new THREE.Vector3(0, -0.05, 0), size: 0.0014, life: 1 });
        }
      } else {
        cupPivot.position.lerp(CUP_PIVOT_HOME, 0.25);
        S.cupTilt += (0 - S.cupTilt) * Math.min(1, h * 5);
      }
      cupPivot.rotation.z = S.cupTilt;
      cup.setLevel(0.05 * (S.cupV / CUP_V));
      drops.update(h, (p, d) => { p.v.y -= 0.6 * d; p.p.addScaledVector(p.v, d); return p.p.y > BOT.y + waterH() + 0.002; });
      // 溶解：振荡时快（几秒），静置时很慢
      S.shakeE = Math.max(0, S.shakeE - h * 0.8);
      const k = S.vw > 1 ? 0.04 + 1.1 * S.shakeE : 0;
      const target = Math.min(SOL * S.vw, V_BOT - S.vw);
      if (target > S.dis) S.dis += (target - S.dis) * Math.min(1, k * h);
      if (!S.capOn && S.vw > 1) S.air = clamp(S.dis / Math.max(1, V_BOT - S.vw), 0, 1);        // 瓶口开着：溶掉多少，就补进来多少空气
      const sq = squeeze(); deform(sq); rebuildWater();
      S.botOff.multiplyScalar(Math.max(0, 1 - h * 6));
      bottle.position.copy(BOT).add(S.botOff); bottle.rotation.z = -S.botOff.x * 6;
      // 瓶盖：点一下以后飞到瓶口，再转两圈拧紧（学生点的和演示里一样）
      if (S.capOn) S.capT = Math.min(1, S.capT + h * 1.6);
      const flyK = clamp(S.capT / 0.45, 0, 1), turnK = clamp((S.capT - 0.45) / 0.55, 0, 1);
      const capTop = bottle.position.clone().add(new THREE.Vector3(0, 0.146 + 0.004 * (1 - turnK), 0));
      const capFrom = CAP_HOME.clone().add(new THREE.Vector3(0, 0.006, 0));
      if (S.capOn) { const e = flyK * flyK * (3 - 2 * flyK); cap.position.lerpVectors(capFrom, capTop, e); cap.position.y += Math.sin(Math.PI * e) * 0.04; }
      else cap.position.lerp(capFrom, 0.25);
      cap.rotation.set(0, S.capOn ? turnK * Math.PI * 4 : 0, S.capOn ? bottle.rotation.z * flyK : 0);
      if (S.capOn && sq > 0.12 && !S.shakeLogged) {
        S.shakeLogged = true; done('shake');
        log(['旋紧瓶盖，振荡', '塑料瓶<b>变瘪</b>', '二氧化碳<b>能溶于水</b>，瓶里的气体变少']);
        status(`瓶子<b>变瘪</b>了：二氧化碳溶进了 ${Math.round(S.vw)} mL 水里（看卡片上的“溶解”），瓶里的气体少了，外面的大气压把软瓶压瘪。再振荡几下，会瘪得更多。`);
        if (W && !S.demo) W.t1.open();
      }
      if (!S.capOn && S.dis > 15 && !S.openLogged && S.shakeE > 0.2) { S.openLogged = true; log(['瓶盖没旋紧就振荡', '瓶子<b>没有变瘪</b>', '溶掉的二氧化碳，由瓶口进来的空气补上了']); status('瓶盖还没旋紧：二氧化碳溶进水里，可外面的空气从瓶口补了进来（看浅灰点），瓶子不会瘪。先点一下<b>瓶盖</b>旋紧。'); }

      // 气体小点：瓶里的气体（二氧化碳；瓶口开着时补进来的是空气）、溶进水里的二氧化碳
      const dark = [], light = [], blue = [];
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
      darkP.list = dark; lightP.list = light; blueP.list = blue;
      for (const p of [darkP, lightP, blueP]) p.update(0, () => true);

      const fr = S.vw / V_BOT;
      botCard.text(`<div class="cc"><div class="cc-t"><span class="cc-name">软塑料瓶</span>${sq > 0.12 ? '<span class="cc-res">变瘪了</span>' : ''}</div><div class="cc-more"><div class="cc-obs"><span style="min-width:2.5em">水</span><span class="o2-read"><i style="width:${Math.min(100, fr * 100)}%;background:#5aa9d6"></i></span><b>${Math.round(S.vw)} mL</b><small>${fr > 0.29 && fr < 0.38 ? '约 1/3 ✓' : '1/3 约 110 mL'}</small></div>${S.dis > 2 ? `<div class="cc-obs"><span style="min-width:2.5em">溶解</span><b style="color:#3d4350">${Math.round(S.dis)} mL</b><small>二氧化碳溶进水里</small></div>` : ''}</div></div>`)
        .loc(group, BOT.x + BR, 0.11, 0).show(S.vw > 0.5 || S.cupAt === 'carry');
    };

    return {
      group: root,
      pointer,
      card: false,
      toggles: ['cards', 'steps'],
      size: { w: 0.16, d: 0.12, h: 0.16 },
      view: { elev: 18, azim: -4, lookY: 0.42, frameMargin: 1.12 },
      mount(ui) {
        ui.el.classList.add('xuean');
        // 想一想：课本第 137 页的表（根据实验 6-3 和 6-4 完成下表）
        const pick = (opts) => { const s = seg('', opts, () => {}); s.set(-1); return s; };
        const cDen = pick(['比空气大', '比空气小']), cSol = pick(['能溶于水', '不溶于水']), cBurn = pick(['不能燃烧，也不支持燃烧', '能支持燃烧']);
        const cells = [cDen, cSol, cBurn];
        const ctx1 = h('div', { class: 'sum-ctx' });
        const t1El = h('div', { class: 'think', hidden: true }, h('div', { class: 'think-t' }, '想一想 · 填课本上的表'), ctx1,
          h('p', { class: 'think-q', html: '根据实验 6-3 和 6-4 完成下表（课本第 137 页）。<br><small>颜色、气味：无色、无味（闻气体要用手在瓶口轻轻扇动，这里直接告诉你）。</small>' }),
          h('div', { class: 'fill-row' }, h('b', {}, '密度（与空气比较）'), cDen.el), h('div', { class: 'fill-row' }, h('b', {}, '溶解性'), cSol.el), h('div', { class: 'fill-row' }, h('b', {}, '是否支持燃烧'), cBurn.el),
          buttons([{ text: '填好了', onClick: () => {
            const wrong = [];
            if (cDen.index !== 0) wrong.push(cDen.index < 0 ? '密度还没填。' : '密度：实验 6-3 里哪支蜡烛先熄灭？二氧化碳沉在下面还是浮在上面？');
            if (cSol.index !== 0) wrong.push(cSol.index < 0 ? '溶解性还没填。' : '溶解性：塑料瓶为什么变瘪？');
            if (cBurn.index !== 0) wrong.push(cBurn.index < 0 ? '是否支持燃烧还没填。' : '是否支持燃烧：实验 6-3 里蜡烛在二氧化碳里怎样了？');
            if (wrong.length) return ui.status(wrong[0]);
            t1.close(); done('table'); next.hidden = false;
            ui.status('对：二氧化碳无色、无味，<b>密度比空气大</b>，<b>能溶于水</b>，<b>不能燃烧，也不支持燃烧</b>。可以掀开结论看看。');
          } }]).el);
        const t1 = {
          el: t1El,
          open() { ctx1.innerHTML = '<div>实验 6-3（倾倒二氧化碳）：下面的蜡烛先熄灭，上面的后熄灭</div>' + S.rows.map((r) => `<div>${r[0]}：${r[1]}</div>`).join(''); t1El.hidden = false; },
          close() { t1El.hidden = true; },
        };
        const next = h('button', { class: 'go big-next', hidden: true, onclick: () => ui.go(2) }, '掀开课本上的结论 →');
        const tbl = table(['做了什么', '现象', '说明']);
        const vary = h('details', { class: 'more' }, h('summary', {}, '换个条件再试'),
          h('p', { class: 'fineprint', html: '先“全部重来”，加水以后<b>不旋紧瓶盖</b>就振荡：瓶子还会瘪吗？' }));
        const more = h('details', { class: 'more' }, h('summary', {}, '更多'),
          buttons([{ text: '旋紧瓶盖', ghost: true, onClick: () => A.capTap() }, { text: '振荡塑料瓶', ghost: true, onClick: () => { S.shakeE = 1; } }]).el,
          buttons([{ text: '全部重来（清空记录）', ghost: true, onClick: () => A.reset() }]).el);
        const note = h('p', { class: 'fineprint', html: '说明：塑料瓶按 330 mL 计；20 ℃ 时 1 体积水约溶解 0.88 体积二氧化碳（课本：约 1 体积）；振荡时溶解快、静置时慢，快慢是示意。' });
        ui.controls.append(t1El, next, vary, more, note);
        ui.data.append(tbl.el);
        const dt = ui.data.previousElementSibling; if (dt?.classList.contains('bar-title')) dt.textContent = '观察记录';
        W = { tbl, t1, next, cells, status: (m) => ui.status(m) };
        bar.attach(ui);
        ui.status('图 6-11：一个收集满二氧化碳的软塑料瓶（看瓶里的深灰点），旁边一杯水、瓶盖。可以先看<b>老师演示</b>，也可以直接动手。');
      },
      update(dt, t) { const k = bar.update(dt); step(Math.min(dt, 1 / 30) * k, t); },
      dispose() { bar.dispose(); drops.dispose(); darkP.dispose(); lightP.dispose(); blueP.dispose(); botGeo.dispose(); botWater?.geometry.dispose(); },
      debug: { get S() { return S; }, A, bar, picks: { cup: cupPick, cap: capPick, bottle: botPick },
        qa: qaFlow(drag, [
          { name: '拿起水杯', hold: cupPick },
          { name: '拖到瓶口倒水', run: () => A.cupDrag(spoutAtMouth()), wait: 1.2 },
          { name: '松手', release: cupPick, wait: 0.5 },
          { name: '旋紧瓶盖', tap: capPick, wait: 1 },
          ...[1, 2, 3].map((i) => ({ name: `振荡 ${i}`, run: () => { for (let j = 0; j < 6; j++) A.shake(BOT.clone().add(new THREE.Vector3(j % 2 ? 0.02 : -0.02, 0.07, 0))); if (i === 3) A.shakeEnd(); }, wait: 1 })),
          { name: '填表', run: () => { W.cells.forEach((c) => c.set(0)); [...W.t1.el.querySelectorAll('button')].find((b) => b.textContent === '填好了').click(); } },
        ]) },
    };
  },
};
