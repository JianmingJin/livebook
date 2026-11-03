// 实验活动6 一定溶质质量分数的氯化钠溶液的配制（课本下册第 55 页图 9-17）。
//
// 配制 50 g 质量分数为 6% 的氯化钠溶液：计算（3 g 氯化钠、47 g 水）→ 托盘天平称量 → 量筒量取 47 mL 水 → 倒入烧杯、玻璃棒搅拌溶解 → 装瓶贴标签。
// 托盘天平：两边先各放一张称量纸，游码拨到 3 g，左盘加氯化钠到指针指在正中（按住药匙不放，轻轻抖出来）。
// 量筒：先倒水到接近 47 mL，再用胶头滴管滴加；读数时视线要和凹液面最低处相平。“换个条件再试”可以选仰视 / 俯视读数——
//   俯视：读数偏大，量到的水偏少，浓度偏大；仰视相反。偏差按视线角度和量筒的刻度间距算（10 mL 量筒刻度约 2.6 mm / mL，眼睛离刻度约 25 cm、高低差 10 cm 时，偏约 1.5 mL）。
// 最后装瓶：标签上写“氯化钠溶液 6%”，卡片上是按你实际称的、量的算出来的浓度。
import * as THREE from 'three';
import { buttons, seg, table } from './kit/ui.js';
import { draggable, clamp } from './kit/interact.js';
import { textPlate, canvasTex } from './kit/props.js';
import { Particles } from './kit/fx.js';
import { chemBeaker, glassMat, CHEM } from './kit/chem.js';
import { water2 } from './kit/chemfx.js';
import { micro, dissolveScene } from './kit/microworld.js';
import { lessonBar } from './kit/lessonbar.js';
import { qaFlow, sandbox, wrapPointer, paperSheet, think, demoActs } from './kit/chemlesson.js';
import { sfx } from './kit/audio.js';
import { paint, inked } from '../live/ink.js';
import { h } from '../ui/Panel.js';

const SALT = 3, WATER = 47;
const BAL = new THREE.Vector3(-0.1, 0, 0), PAN_DX = 0.045, PAN_Y = 0.07;
const SPOON_HOME = new THREE.Vector3(-0.19, 0.006, 0.05), JAR = new THREE.Vector3(-0.19, 0, -0.02);
const CYL = new THREE.Vector3(0.05, 0, 0), CYL_R = 0.011, CYL_H = 0.15, ML_H = (CYL_H - 0.012) / 55;      // 50 mL 量筒（刻到 55）
const WB_HOME = new THREE.Vector3(0.105, 0, -0.01), DROP_HOME = new THREE.Vector3(0.1, 0.0095, 0.06);
const BK = new THREE.Vector3(-0.02, 0, 0.06), BR = 0.028, BH = 0.065;
const BOT = new THREE.Vector3(0.16, 0, 0.06), ROD_HOME = new THREE.Vector3(-0.02, 0.004, 0.115);
const VIEWS = { flat: 0, up: -1, down: 1 };           // 平视 / 仰视 / 俯视

export default {
  id: 'saltsol',
  fig: '图9-17',
  title: '配制一定溶质质量分数的氯化钠溶液',
  stampText: '实验活动',
  style: 'paper',
  predict: {
    q: '配制 50 g 质量分数为 6% 的氯化钠溶液，需要氯化钠和水各多少？',
    hint: '溶质的质量分数 = 溶质质量 ÷ 溶液质量。',
    options: ['氯化钠 3 g，水 47 g', '氯化钠 6 g，水 50 g', '氯化钠 6 g，水 44 g', '氯化钠 3 g，水 50 g'],
    answer: 0,
  },
  need: '计算；用托盘天平称量 3 g 氯化钠放入烧杯；用量筒量取 47 mL 水倒入烧杯；用玻璃棒搅拌溶解；装瓶，贴上标签',
  conclusion: {
    crops: [{ page: 59, rect: [64, 305, 485, 425] }],
    quote: '配制一定溶质质量分数的溶液：计算、称量、量取、溶解，最后装瓶贴标签（标签上标明试剂名称和溶液中溶质的质量分数）。',
    formula: '溶质的质量分数 = 溶质质量 ÷ 溶液质量 × 100%',
    why: '50 g × 6% = 3 g 氯化钠，水 50 g − 3 g = 47 g（水的密度约 1 g/cm³，就是 47 mL）。<br>称量：托盘天平左物右码，两盘各放一张称量纸；量取：视线与量筒内凹液面的<b>最低处</b>保持水平。<b>俯视</b>读数，量到的水偏少，配出的溶液浓度偏大；<b>仰视</b>读数，水偏多，浓度偏小。氯化钠没有全部倒进烧杯、烧杯里原来有水等，也会让浓度偏离 6%。',
    src: '课本下册第 55 页 · 实验活动6 一定溶质质量分数的氯化钠溶液的配制',
  },

  create({ tag, look, back }) {
    const root = new THREE.Group(), group = new THREE.Group();
    root.add(group);
    let S = null, W = null;
    const status = (m) => { if (!S.demo) W?.status(m); else bar.caption(m); };
    const done = (id) => { if (!S.demo) bar.done(id); };
    const log = (row) => { if (!S.demo) W?.tbl.add(row); };
    let nearK = '';
    const near = (k, c, d, dist) => { if (S.demo || nearK === k) return; nearK = k; look(c, d, dist, () => { nearK = ''; }); };
    const far = () => { if (nearK) { nearK = ''; back(); } };

    paperSheet(group, { w: 0.42, d: 0.2, x: -0.02, z: 0.03 });

    // ================= 托盘天平 =================
    const balM = paint(0xc9d2c4), metal = paint(0xb9bec8);
    const base = inked(new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.018, 0.06), balM), { width: 0.7 }); base.position.set(BAL.x, 0.009, 0); group.add(base);
    const post = inked(new THREE.Mesh(new THREE.BoxGeometry(0.01, 0.04, 0.01), metal), { width: 0.5 }); post.position.set(BAL.x, 0.038, 0); group.add(post);
    const beam = new THREE.Group(); beam.position.set(BAL.x, 0.06, 0.012); group.add(beam);
    const beamBar = inked(new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.004, 0.003), metal), { width: 0.5 }); beam.add(beamBar);
    // 横梁上的游码标尺（0–5 g）
    const scaleTex = canvasTex(512, 48, (g, Wc, Hc) => { g.fillStyle = '#f2f0ea'; g.fillRect(0, 0, Wc, Hc); g.strokeStyle = '#23293a'; g.fillStyle = '#23293a'; g.font = 'bold 22px sans-serif'; g.textAlign = 'center'; for (let i = 0; i <= 50; i++) { const x = 16 + i * (Wc - 32) / 50; g.lineWidth = i % 10 ? 1.5 : 3; g.beginPath(); g.moveTo(x, 0); g.lineTo(x, i % 10 ? 12 : 20); g.stroke(); if (i % 10 === 0) g.fillText(String(i / 10), x, 42); } });
    const scale = new THREE.Mesh(new THREE.PlaneGeometry(0.08, 0.0075), new THREE.MeshBasicMaterial({ map: scaleTex })); scale.position.set(0, -0.006, 0.0018); beam.add(scale);
    const rider = inked(new THREE.Mesh(new THREE.BoxGeometry(0.0035, 0.009, 0.005), paint(0x3d4352)), { width: 0.4 }); rider.position.set(-0.0375, -0.004, 0.003); beam.add(rider);
    const riderPick = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.016, 0.012), new THREE.MeshBasicMaterial({ visible: false })); riderPick.userData.pick = true; rider.add(riderPick);
    const needle = inked(new THREE.Mesh(new THREE.BoxGeometry(0.0015, 0.04, 0.0015), paint(0x23293a)), { width: 0.3 }); needle.geometry.translate(0, -0.02, 0); needle.position.set(0, 0, 0.003); beam.add(needle);
    const dial = textPlate('│', { w: 0.006, h: 0.008, color: '#c23a3a', bg: 'rgba(0,0,0,0)', font: 'bold 120px sans-serif' }); dial.position.set(BAL.x, 0.022, 0.0305); group.add(dial);
    const pans = [-1, 1].map((sx) => {
      const g = new THREE.Group(); g.position.set(BAL.x + sx * PAN_DX, PAN_Y, 0); group.add(g);
      const pan = inked(new THREE.Mesh(new THREE.CylinderGeometry(0.026, 0.02, 0.004, 28), metal), { width: 0.5 }); g.add(pan);
      const stem = inked(new THREE.Mesh(new THREE.CylinderGeometry(0.002, 0.002, 0.05, 8), metal), { width: 0.4 }); stem.position.y = -0.026; g.add(stem);
      const paper = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.0006, 0.03), paint(0xfdfdfa)); paper.position.y = 0.0025; paper.rotation.y = 0.4; paper.visible = false; g.add(paper);
      return Object.assign(g, { paper });
    });
    const saltHeap = new THREE.Mesh(new THREE.SphereGeometry(0.009, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2), paint(0xf6f6f2)); saltHeap.position.y = 0.003; saltHeap.scale.y = 0.5; saltHeap.visible = false; pans[0].add(saltHeap);
    const panPick = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.02, 12), new THREE.MeshBasicMaterial({ visible: false })); panPick.position.y = 0.006; panPick.userData.pick = true; pans[0].add(panPick);
    // 一叠称量纸
    const papers = inked(new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.003, 0.03), paint(0xfdfdfa)), { width: 0.5 }); papers.position.set(BAL.x, 0.0015, 0.06); group.add(papers);
    const papersPick = new THREE.Mesh(new THREE.BoxGeometry(0.036, 0.012, 0.036), new THREE.MeshBasicMaterial({ visible: false })); papersPick.userData.pick = true; papers.add(papersPick);
    // 氯化钠广口瓶、药匙
    const jar = new THREE.Group(); jar.position.copy(JAR); group.add(jar);
    { const body = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.045, 24), glassMat({ opacity: 0.3 })); body.position.y = 0.0225; body.renderOrder = 9; jar.add(body);
      const salt = new THREE.Mesh(new THREE.CylinderGeometry(0.0185, 0.0185, 0.022, 20), paint(0xf6f6f2)); salt.position.y = 0.012; jar.add(salt);
      const lab = textPlate('NaCl', { w: 0.02, h: 0.009, color: '#c23a3a', bg: '#fffaf0', font: 'bold 92px "Times New Roman", serif' }); lab.position.set(0, 0.03, 0.0205); jar.add(lab); }
    const spoon = new THREE.Group(); group.add(spoon);
    { const handle = inked(new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.002, 0.005), paint(0xd9dde3)), { width: 0.5 }); handle.position.x = 0.035; spoon.add(handle);
      const bowl = inked(new THREE.Mesh(new THREE.SphereGeometry(0.006, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2), paint(0xd9dde3)), { width: 0.4 }); bowl.rotation.x = Math.PI; bowl.scale.y = 0.4; spoon.add(bowl);
      const s = new THREE.Mesh(new THREE.SphereGeometry(0.0045, 10, 6), paint(0xf6f6f2)); s.scale.y = 0.4; s.position.y = 0.001; s.name = 'load'; spoon.add(s); }
    const spoonPick = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.02, 0.02), new THREE.MeshBasicMaterial({ visible: false })); spoonPick.position.x = 0.035; spoonPick.userData.pick = true; spoon.add(spoonPick);
    spoon.position.copy(SPOON_HOME);

    // ================= 量筒、蒸馏水、胶头滴管 =================
    const cyl = new THREE.Group(); cyl.position.copy(CYL); group.add(cyl);
    { const foot = inked(new THREE.Mesh(new THREE.CylinderGeometry(0.019, 0.02, 0.005, 20), paint(0xe9edf0)), { width: 0.6 }); foot.position.y = 0.0025; cyl.add(foot);
      const gl = new THREE.Mesh(new THREE.CylinderGeometry(CYL_R, CYL_R, CYL_H, 20, 1, true), glassMat({ opacity: 0.25 })); gl.position.y = CYL_H / 2 + 0.004; gl.renderOrder = 9; cyl.add(gl);
      const mk = canvasTex(64, 1024, (g, Wc, Hc) => { g.strokeStyle = '#23293a'; g.fillStyle = '#23293a'; g.font = 'bold 30px sans-serif'; for (let v = 0; v <= 55; v++) { const y = Hc - (0.008 + v * ML_H) / CYL_H * Hc; g.lineWidth = v % 5 ? 2 : 4; g.beginPath(); g.moveTo(0, y); g.lineTo(v % 10 === 0 ? 34 : v % 5 ? 14 : 24, y); g.stroke(); if (v % 10 === 0 && v) g.fillText(String(v), 30, y + 10); } });
      const ticks = new THREE.Mesh(new THREE.PlaneGeometry(0.008, CYL_H), new THREE.MeshBasicMaterial({ map: mk, transparent: true, depthWrite: false })); ticks.position.set(0.002, CYL_H / 2 + 0.004, CYL_R + 0.0003); ticks.renderOrder = 10; cyl.add(ticks); }
    const cylLiq = new THREE.Mesh(new THREE.CylinderGeometry(CYL_R - 0.0008, CYL_R - 0.0008, 1, 18), water2({ color: CHEM.water })); cylLiq.geometry.translate(0, 0.5, 0); cylLiq.position.y = 0.005; cylLiq.renderOrder = 7; cyl.add(cylLiq);
    const cylPick = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, CYL_H, 10), new THREE.MeshBasicMaterial({ visible: false })); cylPick.position.y = CYL_H / 2; cylPick.userData.pick = true; cyl.add(cylPick);
    const wb = new THREE.Group(); group.add(wb);
    { const b = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.06, 24), glassMat({ opacity: 0.28 })); b.position.y = 0.03; b.renderOrder = 9; wb.add(b);
      const l = new THREE.Mesh(new THREE.CylinderGeometry(0.0185, 0.0185, 0.045, 20), water2({ color: CHEM.water })); l.position.y = 0.024; l.renderOrder = 7; wb.add(l);
      const lab = textPlate('蒸馏水', { w: 0.022, h: 0.008, color: '#23293a', bg: '#fffaf0', font: 'bold 84px "Songti SC", serif' }); lab.position.set(0, 0.035, 0.0205); wb.add(lab); }
    const wbPick = new THREE.Mesh(new THREE.CylinderGeometry(0.024, 0.024, 0.06, 10), new THREE.MeshBasicMaterial({ visible: false })); wbPick.position.y = 0.03; wbPick.userData.pick = true; wb.add(wbPick);
    const WB_PIV = WB_HOME.clone();
    wb.position.copy(WB_PIV);
    const dropper = new THREE.Group(); group.add(dropper);
    { const tube = new THREE.Mesh(new THREE.CylinderGeometry(0.0018, 0.0028, 0.045, 10), glassMat({ opacity: 0.35 })); tube.position.y = 0.0225; tube.renderOrder = 9; dropper.add(tube);
      const bulb = inked(new THREE.Mesh(new THREE.SphereGeometry(0.0055, 12, 8), paint(0xc23a3a, { keep: true })), { width: 0.4 }); bulb.scale.y = 1.6; bulb.position.y = 0.05; dropper.add(bulb); }
    const dropPick = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.065, 8), new THREE.MeshBasicMaterial({ visible: false })); dropPick.position.y = 0.032; dropPick.userData.pick = true; dropper.add(dropPick);
    dropper.position.copy(DROP_HOME); dropper.rotation.z = Math.PI / 2;

    // ================= 烧杯、玻璃棒、试剂瓶 =================
    const bk = chemBeaker({ r: BR, h: BH, level: 0, color: CHEM.water, marks: true }); bk.position.copy(BK); group.add(bk);
    const bkSalt = new THREE.Mesh(new THREE.SphereGeometry(0.009, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2), paint(0xf6f6f2)); bkSalt.scale.y = 0.45; bkSalt.position.set(BK.x, 0.002, BK.z); bkSalt.visible = false; group.add(bkSalt);
    const rod = inked(new THREE.Mesh(new THREE.CylinderGeometry(0.0017, 0.0017, 0.1, 10), paint(0xe8f2f6, { transparent: true, opacity: 0.85 })), { width: 0.5 });
    rod.geometry.translate(0, 0.05, 0); group.add(rod);
    const rodPick = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.1, 8), new THREE.MeshBasicMaterial({ visible: false })); rodPick.position.y = 0.05; rodPick.userData.pick = true; rod.add(rodPick);
    const ROD_REST = ROD_HOME.clone().add(new THREE.Vector3(-0.05, 0, 0));
    rod.position.copy(ROD_REST); rod.rotation.z = Math.PI / 2;
    const bottle = new THREE.Group(); bottle.position.copy(BOT); group.add(bottle);
    { const b = new THREE.Mesh(new THREE.LatheGeometry([[0.0003, 0], [0.016, 0], [0.017, 0.003], [0.017, 0.04], [0.009, 0.05], [0.006, 0.054], [0.006, 0.062]].map(([r, y]) => new THREE.Vector2(r, y)), 28), glassMat({ opacity: 0.3 })); b.renderOrder = 9; bottle.add(b); }
    const botLiq = new THREE.Mesh(new THREE.CylinderGeometry(0.0155, 0.0155, 1, 20), water2({ color: CHEM.water })); botLiq.geometry.translate(0, 0.5, 0); botLiq.position.y = 0.0015; botLiq.scale.y = 0.0001; botLiq.renderOrder = 7; bottle.add(botLiq);
    const botLabelTex = canvasTex(256, 160, () => {});
    const botLabel = new THREE.Mesh(new THREE.PlaneGeometry(0.024, 0.015), new THREE.MeshBasicMaterial({ map: botLabelTex, transparent: true })); botLabel.position.set(0, 0.024, 0.0173); botLabel.visible = false; bottle.add(botLabel);
    const botPick = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.064, 10), new THREE.MeshBasicMaterial({ visible: false })); botPick.position.y = 0.032; botPick.userData.pick = true; bottle.add(botPick);
    const salts = new Particles({ max: 120, geometry: new THREE.DodecahedronGeometry(1, 0), material: paint(0xf6f6f2) }); group.add(salts.mesh);
    const drops = new Particles({ max: 80, geometry: new THREE.SphereGeometry(1, 6, 5), material: water2({ color: CHEM.water, base: 0.5 }) }); group.add(drops.mesh);
    const balCard = tag('', 'cond'); balCard.px = [-40, -110];
    const cylCard = tag('', 'cond'); cylCard.px = [70, -60];
    const bkCard = tag('', 'cond'); bkCard.px = [-60, -70];

    // ================= 状态 =================
    const fresh = () => ({ demo: false, paperL: false, paperR: false, rider: 0, panSalt: 0, pouring: false, spoonAt: false, saltInBk: 0, water: 0, wbCarry: null, cylCarry: null, inBk: 0, stir: 0, dis: 0, inBottle: false, view: S ? S.view : 'flat', said: {} });
    S = null; S = fresh();
    const tilt = () => clamp((S.panSalt - S.rider + (S.paperL ? 0.6 : 0) - (S.paperR ? 0.6 : 0)) * 0.12, -0.25, 0.25);      // 横梁的倾斜（左重为正）
    const readOf = () => S.water + VIEWS[S.view] * 1.5;          // 读到的数（俯视偏大、仰视偏小）
    const pct = () => { const salt = S.saltInBk, w = S.inBk; return salt + w > 0 ? (salt / (salt + w)) * 100 : 0; };

    // ================= 操作 =================
    // 微观次元：钻进烧杯里看，水分子把氯化钠晶体表面的 Na⁺、Cl⁻ 一个个拉进水里
    const mic = micro({ tag, look, back, group, scene: dissolveScene(), at: () => BK.clone().add(new THREE.Vector3(0, 0.006, 0)), label: '钻进烧杯里看', state: () => ({ salt: S.saltInBk > 0.1, water: S.inBk > 5, dis: S.dis, stir: S.stir }), show: () => S.saltInBk > 0.1, bar: () => bar, btnAt: () => BK.clone().add(new THREE.Vector3(0, BH + 0.014, 0)) });
    const A = {
      papers() { if (S.paperL && S.paperR) return status('两个托盘上已经各放了一张称量纸。'); S.paperL = S.paperR = true; sfx.clink({ freq: 2000, gain: 0.02 }); done('paper'); status('两个托盘上各放了一张<b>称量纸</b>（两边一样重，不影响称量）。把<b>游码</b>拨到 3 g。'); },
      riderDrag(p) { if (!p) return; const x = clamp(p.x - BAL.x, -0.0375, 0.0375); S.rider = Math.round(((x + 0.0375) / 0.075) * 50) / 10; },
      riderDrop() { if (Math.abs(S.rider - SALT) < 0.05) { done('rider'); status('游码拨到了 <b>3 g</b>。按住<b>药匙</b>，在左盘上方轻轻抖，加氯化钠到指针指在正中。'); } else status(`游码在 ${S.rider.toFixed(1)} g。要拨到 3 g。`); },
      spoonStart() { if (!S.paperL) return status('先在两个托盘上各放一张称量纸。'); S.spoonAt = true; S.pouring = true; },
      spoonEnd() { S.pouring = false; S.spoonAt = false; },
      panTap() {        // 左盘多了：点一下左盘，用药匙取出一点
        if (S.panSalt <= 0) return; S.panSalt = Math.max(0, S.panSalt - 0.3); status('用药匙从左盘取出了一点氯化钠。');
      },
      toBeaker() {
        if (S.panSalt <= 0.1) return;
        if (Math.abs(S.panSalt - SALT) > 0.15 && !S.demo) status(`天平还没平衡（称了约 ${S.panSalt.toFixed(1)} g）……也倒进去吧——看看最后浓度会怎样。`);
        S.saltInBk += S.panSalt; S.panSalt = 0; done('weigh'); sfx.clink({ freq: 2400, gain: 0.03 });
        for (let i = 0; i < 40; i++) salts.spawn({ p: BK.clone().add(new THREE.Vector3((Math.random() - 0.5) * 0.008, BH + 0.01, (Math.random() - 0.5) * 0.008)), v: new THREE.Vector3((Math.random() - 0.5) * 0.02, -0.03, (Math.random() - 0.5) * 0.02), size: 0.0012, life: 2 });
        status(`把称好的氯化钠（${S.saltInBk.toFixed(1)} g）倒进了烧杯。接下来用<b>量筒</b>量取 47 mL 水。`);
      },
      wbDrag(p) { if (!p) return; S.wbCarry = p.clone(); },
      wbDrop() { S.wbCarry = null; if (S.water > 0) status(`量筒里约 ${readOf().toFixed(1)} mL（${S.view === 'flat' ? '平视' : S.view === 'up' ? '仰视' : '俯视'}读数）。快到 47 mL 时改用<b>胶头滴管</b>滴加。`); },
      drop() { if (S.water <= 0) return status('先用蒸馏水瓶往量筒里倒水，快到刻度时再用滴管。'); S.water += 0.4; sfx.clink({ freq: 2600, gain: 0.015 }); for (let i = 0; i < 4; i++) drops.spawn({ p: CYL.clone().add(new THREE.Vector3(0, CYL_H + 0.01, 0)), v: new THREE.Vector3(0, -0.06 - i * 0.01, 0), size: 0.0012, life: 1.5 }); const r = readOf(); status(`滴了几滴：读数 <b>${r.toFixed(1)} mL</b>。`); if (Math.abs(r - WATER) < 0.25) { done('measure'); status(`读数正好 <b>47 mL</b>（${S.view === 'flat' ? '视线和凹液面最低处相平' : S.view === 'up' ? '仰视读的' : '俯视读的'}）。把量筒里的水倒进烧杯。`); } },
      cylDrag(p) { if (!p) return; S.cylCarry = p.clone(); },
      cylDrop() { S.cylCarry = null; },
      rodDrag(p) { if (!p) return; const last = S.lastRod; S.lastRod = p.clone(); S.rodCarry = p.clone(); S.rodIn = Math.hypot(p.x - BK.x, p.z - BK.z) < BR - 0.004; if (S.rodIn && last) S.stir = Math.min(1, S.stir + (Math.abs(p.x - last.x) + Math.abs(p.z - last.z)) * 40); },
      rodDrop() { S.rodCarry = null; S.lastRod = null; S.rodIn = false; },
      bottleTap() {
        if (S.inBottle) return;
        if (S.inBk < 1 || S.dis < 0.95) return status(S.inBk < 1 ? '先配好溶液（称量、量取、溶解），再装瓶。' : '氯化钠还没全部溶解，先用玻璃棒搅拌。');
        S.inBottle = true; sfx.clink({ freq: 1600, gain: 0.03 }); done('bottle');
        const p = pct();
        drawLabel();
        log(['装瓶，贴标签', '氯化钠溶液 6%', `按实际称、量的算：<b>${p.toFixed(2)}%</b>${Math.abs(p - 6) < 0.1 ? '（就是 6%）' : p > 6 ? '（<b>偏大</b>）' : '（<b>偏小</b>）'}`]);
        status(`装进试剂瓶，贴好了标签“氯化钠溶液 6%”。按你实际称的 ${S.saltInBk.toFixed(1)} g 氯化钠、量的 ${S.inBk.toFixed(1)} mL 水算，浓度是 <b>${p.toFixed(2)}%</b>。`);
        W?.t1.open(); far();
      },
      reset() { const v = S.view; S = fresh(); S.view = v; mic.close(); salts.clear(); drops.clear(); W?.tbl.clear(); far(); botLabel.visible = false; if (W) { W.t1.close(); W.t2.close(); W.next.hidden = true; } bar.undo('paper', 'rider', 'weigh', 'measure', 'pour', 'stir', 'bottle', 'why'); status('全部重新摆好了，记录也清空了。'); },
    };
    const drawLabel = () => { const c = botLabelTex.image, g = c.getContext('2d'); g.fillStyle = '#fffaf0'; g.fillRect(0, 0, 256, 160); g.strokeStyle = '#c23a3a'; g.lineWidth = 6; g.strokeRect(6, 6, 244, 148); g.fillStyle = '#23293a'; g.font = 'bold 44px "Songti SC", serif'; g.textAlign = 'center'; g.fillText('氯化钠溶液', 128, 70); g.font = 'bold 52px "Times New Roman", serif'; g.fillText('6%', 128, 130); botLabelTex.needsUpdate = true; botLabel.visible = true; };

    const drag = draggable(group, [
      { obj: riderPick, plane: 'xy', offset: 0.012, hint: '拖动游码', onStart: (p) => A.riderDrag(p), onDrag: (p) => A.riderDrag(p), onEnd: () => A.riderDrop() },
      { obj: spoonPick, plane: 'xy', offset: 0.05, hint: '按住不放：在左盘上方抖出氯化钠，松手停', onStart: () => A.spoonStart(), onDrag: () => {}, onEnd: () => A.spoonEnd() },
      { obj: wbPick, plane: 'xy', offset: -0.01, hint: '蒸馏水：拖到量筒口倒水，松手停', onStart: (p) => A.wbDrag(p), onDrag: (p) => A.wbDrag(p), onEnd: () => A.wbDrop() },
      { obj: cylPick, plane: 'xy', offset: 0, hint: () => (S.water > 1 ? '量筒：拖到烧杯口，把水倒进去' : ''), onStart: (p) => A.cylDrag(p), onDrag: (p) => A.cylDrag(p), onEnd: () => A.cylDrop() },
      { obj: rodPick, plane: 'xz', offset: 0.03, hint: '玻璃棒：伸进烧杯里来回拖着搅拌', onStart: (p) => A.rodDrag(p), onDrag: (p) => A.rodDrag(p), onEnd: () => A.rodDrop() },
    ], { taps: [
      { obj: papersPick, hint: '点一下：两个托盘上各放一张称量纸', onTap: () => A.papers() },
      { obj: panPick, hint: () => (S.panSalt > 0.1 && bar.has('rider') ? (tilt() > 0.02 ? '点一下：左盘多了，取出一点' : '点一下：把称好的氯化钠倒进烧杯') : ''), onTap: () => (tilt() > 0.02 ? A.panTap() : A.toBeaker()) },
      { obj: dropPick, hint: '点一下：用胶头滴管往量筒里滴几滴水', onTap: () => A.drop() },
      { obj: botPick, hint: '点一下：装瓶，贴上标签', onTap: () => A.bottleTap() },
    ], tip: tag('', 'pill') });
    const act = demoActs(drag, group);
    const cylToBk = () => BK.clone().add(new THREE.Vector3(BR + 0.004, BH - 0.066, 0));        // 手抓在量筒中下部：筒口在手上方 7 cm
    const wbToCyl = () => CYL.clone().add(new THREE.Vector3(0.02, CYL_H - 0.02, -0.01));

    const bar = lessonBar({
      look, back, group,
      steps: [
        { id: 'paper', title: '放称量纸', todo: '点一下<b>称量纸</b>，两个托盘上各放一张。', target: () => papers },
        { id: 'rider', title: '游码拨到 3 g', todo: '拖动横梁上的<b>游码</b>，拨到 3 g。', target: () => rider },
        { id: 'weigh', title: '称 3 g 氯化钠', todo: '按住<b>药匙</b>往左盘加氯化钠，加到指针指在正中；然后点<b>左盘</b>，把氯化钠倒进烧杯。', target: () => (S.panSalt > 0.1 && Math.abs(tilt()) < 0.02 ? pans[0] : spoon) },
        { id: 'measure', title: '量取 47 mL 水', todo: '把<b>蒸馏水</b>拖到量筒口倒到接近 47 mL，再点<b>胶头滴管</b>滴到 47 mL。视线和凹液面最低处相平。', target: () => (S.water < 44 ? (S.wbCarry ? null : wb) : dropper) },
        { id: 'pour', title: '倒入烧杯', todo: '把<b>量筒</b>拖到烧杯口，把水倒进盛有氯化钠的烧杯。', target: () => (S.cylCarry ? null : cyl) },
        { id: 'stir', title: '搅拌溶解', todo: '用<b>玻璃棒</b>搅拌，使氯化钠全部溶解。', target: () => (S.rodCarry ? null : rod) },
        { id: 'bottle', title: '装瓶贴标签', todo: '点一下<b>试剂瓶</b>：装瓶，贴上标签。', target: () => bottle },
        { id: 'why', title: '想一想', todo: '在左边作答。' },
      ],
      reels: {
        demo: {
          seal: '演示', label: '老师演示',
          ...sandbox({ get: () => S, set: (s) => { S = s; }, fresh, bar: () => bar, apply: () => { salts.clear(); drops.clear(); botLabel.visible = false; mic.close(); } }),
          shots: [
            { cap: '计算：50 g × 6% = 3 g 氯化钠，水 50 g − 3 g = 47 g（47 mL）。两个托盘上各放一张称量纸，游码拨到 3 g。', dur: 6, cam: [[BAL.x, 0.07, 0], [0.04, 0.2, 1], 0.26],
              during: act.seq(act.tap(papersPick, 0.15), act.drag(riderPick, () => new THREE.Vector3(BAL.x - 0.0375 + 0.075 * 0.6, 0.056, 0.012), { t0: 0.45, t1: 0.85, release: 0.9 })) },
            { cap: '左盘加氯化钠，加到指针指在正中——3 g。倒进烧杯。', dur: 8, cam: [[BAL.x, 0.07, 0], [0.04, 0.2, 1], 0.26],
              during: act.seq(act.hold(spoonPick, 0.05, 0.05 + SALT / 0.45 / 8), act.at(0.86, () => { S.panSalt = SALT; }), act.tap(panPick, 0.9)) },
            { cap: '用量筒量取 47 mL 水：先倒到接近刻度，再用胶头滴管滴加。读数时视线和凹液面的最低处相平。', dur: 9, cam: [[CYL.x, 0.12, 0], [0.0, 0.02, 1], 0.24],
              during: act.seq(act.drag(wbPick, wbToCyl, { t0: 0.04, t1: 0.2, release: 0.98, until: () => S.water >= 45 }), act.at(0.7, () => { S.water = 46.2; }), act.tap(dropPick, 0.78), act.tap(dropPick, 0.88)) },
            { cap: '把水倒进盛有氯化钠的烧杯。', dur: 4.5, cam: [[BK.x, 0.06, BK.z], [0.04, 0.3, 1], 0.28],
              during: act.drag(cylPick, cylToBk, { t0: 0.05, t1: 0.45, release: 0.95, until: () => S.water < 0.3 }) },
            { cap: '钻进烧杯里看：水分子把晶体表面的 Na⁺、Cl⁻ 一个个拉进水里；用玻璃棒搅拌，溶解得更快。', dur: 13, cam: [[BK.x, 0.06, BK.z], [0.04, 0.25, 1], 0.3],
              during: act.seq(act.at(0.02, () => mic.open(true)), act.path(rodPick, [null, new THREE.Vector3(BK.x, 0.09, BK.z), ...Array.from({ length: 14 }, (_, j) => new THREE.Vector3(BK.x + (j % 2 ? 0.012 : -0.012), 0.03, BK.z + (j % 4 < 2 ? 0.01 : -0.01)))], { t0: 0.35, t1: 0.9, release: 0.95 })) },
            { cap: '装进试剂瓶，贴上标签：氯化钠溶液 6%。演示完了，下面换你自己做。', enter: () => mic.close(), dur: 4, cam: [[0.05, 0.06, 0.04], [0.04, 0.25, 1], 0.36], during: act.tap(botPick, 0.2) },
          ],
        },
      },
    });
    const pointer = wrapPointer(drag, bar);

    // ================= 每帧 =================
    const step = (h) => {
      // 天平
      if (S.pouring && S.spoonAt) { S.panSalt += 0.45 * h; if (Math.random() < h * 30) salts.spawn({ p: pans[0].position.clone().add(new THREE.Vector3(0, 0.03, 0)), v: new THREE.Vector3((Math.random() - 0.5) * 0.01, -0.03, (Math.random() - 0.5) * 0.01), size: 0.0009, life: 0.8 }); }
      spoon.position.lerp(S.spoonAt ? pans[0].position.clone().add(new THREE.Vector3(-0.004, 0.032, 0)) : SPOON_HOME, 0.2);
      spoon.rotation.z += ((S.spoonAt ? -0.3 + Math.sin(performance.now() / 60) * 0.06 : 0) - spoon.rotation.z) * 0.4;
      const tl = tilt(); beam.rotation.z += (tl - beam.rotation.z) * Math.min(1, h * 4);
      pans[0].position.y = PAN_Y - Math.sin(beam.rotation.z) * PAN_DX; pans[1].position.y = PAN_Y + Math.sin(beam.rotation.z) * PAN_DX;
      pans[0].paper.visible = S.paperL; pans[1].paper.visible = S.paperR;
      saltHeap.visible = S.panSalt > 0.05; saltHeap.scale.setScalar(Math.cbrt(S.panSalt / 3) || 0.01); saltHeap.scale.y *= 0.5;
      rider.position.x = -0.0375 + 0.075 * (S.rider / 5);
      salts.update(h, (p, d) => { p.v.y -= 0.4 * d; p.p.addScaledVector(p.v, d); return p.p.y > 0.004; });
      // 量筒：蒸馏水瓶倒进来
      if (S.wbCarry) {
        const spout = S.wbCarry.clone().add(new THREE.Vector3(-0.02, 0.03, 0));
        const at = Math.abs(spout.x - CYL.x) < 0.02 && Math.abs(spout.y - (CYL_H + 0.004)) < 0.03;
        wb.position.lerp(at ? CYL.clone().add(new THREE.Vector3(0.021, CYL_H - 0.026, -0.01)) : S.wbCarry.clone().add(new THREE.Vector3(0, -0.03, 0)), 0.3);
        wb.rotation.z += ((at ? 1.3 : 0) - wb.rotation.z) * Math.min(1, h * 4);
        if (at && wb.rotation.z > 1.0) { S.water = Math.min(55, S.water + 8 * h); if (Math.random() < h * 25) drops.spawn({ p: CYL.clone().add(new THREE.Vector3(0.003, CYL_H + 0.006, 0)), v: new THREE.Vector3(0, -0.07, 0), size: 0.0014, life: 1.5 }); }
      } else { wb.position.lerp(WB_PIV, 0.25); wb.rotation.z *= 0.8; }
      if (S.water > 0 && !S.said.near && S.water > 42 && !S.demo) { S.said.near = true; }
      // 量筒倒进烧杯
      if (S.cylCarry) {
        const mouth = S.cylCarry.clone().add(new THREE.Vector3(0, 0.07, 0)), at = Math.hypot(mouth.x - (BK.x + BR), mouth.y - BH) < 0.04;
        cyl.position.lerp(at ? BK.clone().add(new THREE.Vector3(BR + 0.004 + 0.07, BH - 0.0, 0)) : S.cylCarry.clone().add(new THREE.Vector3(0, -0.07, 0)), 0.3);
        cyl.rotation.z += ((at ? 1.9 : 0) - cyl.rotation.z) * Math.min(1, h * 4);
        if (at && cyl.rotation.z > 1.5 && S.water > 0) { const dv = Math.min(S.water, 25 * h); S.water -= dv; S.inBk += dv; if (Math.random() < h * 30) drops.spawn({ p: BK.clone().add(new THREE.Vector3(BR - 0.004, BH, 0)), v: new THREE.Vector3(-0.01, -0.05, 0), size: 0.0015, life: 1 }); if (S.water <= 0.01 && !bar.has('pour')) { done('pour'); status(`把 ${S.inBk.toFixed(1)} mL 水倒进了烧杯。用<b>玻璃棒</b>搅拌，使氯化钠溶解。`); } }
      } else { cyl.position.lerp(CYL, 0.25); cyl.rotation.z *= 0.8; }
      cylLiq.visible = S.water > 0.05; cylLiq.scale.y = Math.max(0.0001, S.water * ML_H);
      drops.update(h, (p, d) => { p.v.y -= 0.5 * d; p.p.addScaledVector(p.v, d); return p.p.y > 0.01; });
      // 滴管：靠近量筒口时竖起来
      dropper.position.lerp(bar.current === 'measure' && S.water > 40 ? CYL.clone().add(new THREE.Vector3(0, CYL_H + 0.012, 0)) : DROP_HOME, 0.15);
      dropper.rotation.z += ((bar.current === 'measure' && S.water > 40 ? 0 : Math.PI / 2) - dropper.rotation.z) * 0.15;
      // 烧杯：水、溶解
      const lv = (S.inBk * 1e-6) / (Math.PI * (BR - 0.0012) ** 2);
      bk.setLevel(lv);
      S.stir = Math.max(0, S.stir - h * 1.2);
      if (S.inBk > 1 && S.saltInBk > 0 && S.dis < 1) S.dis = Math.min(1, S.dis + (0.01 + 0.3 * S.stir) * h * 2);
      if (S.dis >= 0.98 && !bar.has('stir') && S.inBk > 1) { done('stir'); status('氯化钠全部溶解了。点一下<b>试剂瓶</b>，装瓶、贴标签。'); }
      bkSalt.visible = S.saltInBk > 0.1 && S.dis < 0.98; bkSalt.scale.setScalar(Math.max(0.2, (1 - S.dis) * Math.cbrt(S.saltInBk / 3))); bkSalt.scale.y *= 0.45;
      if (S.rodCarry) { rod.position.lerp(S.rodIn ? new THREE.Vector3(S.rodCarry.x, 0.004, S.rodCarry.z) : new THREE.Vector3(S.rodCarry.x, 0.02, S.rodCarry.z), 0.5); rod.rotation.z += (0.25 - rod.rotation.z) * 0.3; }
      else { rod.position.lerp(ROD_REST, 0.2); rod.rotation.z += (Math.PI / 2 - rod.rotation.z) * 0.2; }
      bk.visible = true; botLiq.scale.y = S.inBottle ? 0.03 : 0.0001; if (S.inBottle) bk.setLevel(0);
      // 读数时凑近量筒看
      if (bar.current === 'measure' && S.water > 38 && !S.wbCarry) near('cyl', [CYL.x, (0.005 + S.water * ML_H + CYL_H + 0.03) / 2, 0], [0.0, VIEWS[S.view] * 0.4, 1], 0.2);        // 凹液面和上面的滴管都在画面里
      else if (nearK === 'cyl') far();
      // 卡片
      balCard.text(`<div class="cc"><div class="cc-t"><span class="cc-name">托盘天平</span>${S.panSalt > 0.1 && Math.abs(tl) < 0.02 ? '<span class="cc-res">平衡</span>' : ''}</div><div class="cc-more"><div class="cc-obs"><small>游码 ${S.rider.toFixed(1)} g · 左盘${S.panSalt > 0.05 ? (tl > 0.02 ? '偏重' : tl < -0.02 ? '偏轻' : '和游码一样重') : '还没放药品'}</small></div></div></div>`)
        .loc(group, BAL.x, PAN_Y + 0.02, 0).show(S.paperL);
      cylCard.text(`<div class="cc"><div class="cc-t"><span class="cc-name">量筒读数</span></div><div class="cc-more"><div class="cc-obs"><b style="font-size:1.15em">${readOf().toFixed(1)} mL</b><small>${S.view === 'flat' ? '平视' : S.view === 'up' ? '仰视（实际 ' + S.water.toFixed(1) + ' mL）' : '俯视（实际 ' + S.water.toFixed(1) + ' mL）'}</small></div></div></div>`)
        .loc(group, CYL.x, CYL_H, 0).show(S.water > 0.5);
      const p = pct();
      bkCard.text(`<div class="cc"><div class="cc-t"><span class="cc-name">烧杯里</span>${S.inBottle ? '<span class="cc-res">已装瓶</span>' : ''}</div><div class="cc-more"><div class="cc-obs"><small>氯化钠 ${S.saltInBk.toFixed(1)} g · 水 ${S.inBk.toFixed(1)} g${S.inBk > 1 && S.saltInBk > 0 ? ` · <b>${p.toFixed(2)}%</b>` : ''}</small></div></div></div>`)
        .loc(group, BK.x, BH, BK.z).show(S.saltInBk > 0 || S.inBk > 0);
    };

    return {
      group: root,
      pointer,
      card: false,
      toggles: ['cards', 'steps'],
      size: { w: 0.4, d: 0.16, h: 0.16 },
      view: { elev: 18, azim: -4, lookY: 0.42, frameMargin: 1.04 },
      mount(ui) {
        ui.el.classList.add('xuean');
        const ctx = () => `<div>称了氯化钠 ${S.saltInBk.toFixed(1)} g，量了水 ${S.inBk.toFixed(1)} mL（${S.view === 'flat' ? '平视' : S.view === 'up' ? '仰视' : '俯视'}读数）</div><div>算出来：${pct().toFixed(2)}%</div>`;
        const t2 = think({ title: '想一想', ctx, status: (m) => ui.status(m),
          q: '量取水时<b>俯视</b>读数，配出的溶液浓度会——',
          options: ['偏大：俯视读数偏大，实际量到的水偏少', '偏小', '不受影响'],
          wrong: ['俯视时视线从上往下，看到的刻度比凹液面最低处高——读数偏大，水实际少了。可以在“换个条件再试”里试试。', '读数不准，水的量就不准，浓度当然受影响。'],
          ok: '对：俯视读数偏大，量到的水偏少，浓度<b>偏大</b>；仰视读数偏小，水偏多，浓度<b>偏小</b>。可以掀开结论看看。',
          onOk: () => { next.hidden = false; done('why'); } });
        const t1 = think({ title: '想一想', ctx, status: (m) => ui.status(m),
          q: '为什么要用 3 g 氯化钠和 47 g 水？',
          options: ['50 g × 6% = 3 g 氯化钠，50 g − 3 g = 47 g 水', '6% 就是 6 g 氯化钠', '47 是随便取的'],
          wrong: ['6% 是氯化钠占溶液质量的 6%，溶液是 50 g。', '溶液质量 = 溶质质量 + 溶剂质量。'],
          ok: '对：溶质的质量分数 = 溶质质量 ÷ 溶液质量。',
          onOk: () => t2.open() });
        const next = h('button', { class: 'go big-next', hidden: true, onclick: () => ui.go(2) }, '掀开课本上的结论 →');
        const tbl = table(['做了什么', '结果', '说明']);
        const viewSeg = seg('读量筒时的视线', ['平视', '仰视', '俯视'], (_, k) => { S.view = ['flat', 'up', 'down'][k]; status(`读数方式改成了<b>${['平视', '仰视', '俯视'][k]}</b>。${S.water > 0 ? '（“全部重来”再量一次，看最后浓度。）' : ''}`); });
        const vary = h('details', { class: 'more' }, h('summary', {}, '换个条件再试'), h('p', { class: 'fineprint', html: '量取水的时候<b>仰视</b>或<b>俯视</b>读数，最后配出的溶液是百分之几？（先选好，再“全部重来”。）称量时氯化钠多加一点、少加一点，也可以看看。' }), viewSeg.el);
        const more = h('details', { class: 'more' }, h('summary', {}, '更多'), buttons([{ text: '全部重来（清空记录）', ghost: true, onClick: () => A.reset() }]).el);
        const note = h('p', { class: 'fineprint', html: '说明：水的密度按 1 g/mL；仰视 / 俯视的读数偏差按约 1.5 mL 计（眼睛高低差约 10 cm 时）。' });
        ui.controls.append(t1.el, t2.el, next, vary, more, note);
        ui.data.append(tbl.el);
        const dt = ui.data.previousElementSibling; if (dt?.classList.contains('bar-title')) dt.textContent = '观察记录';
        W = { tbl, t1, t2, next, status: (m) => ui.status(m) };
        bar.attach(ui);
        ui.status('配制 50 g 质量分数为 6% 的氯化钠溶液：先算出需要 <b>3 g 氯化钠、47 g 水</b>。桌上从左到右：氯化钠和药匙、托盘天平、烧杯、量筒和蒸馏水、试剂瓶。');
      },
      update(dt, t) { const k = bar.update(dt); step(Math.min(dt, 1 / 30) * k, t); mic.update(dt, k); },
      dispose() { mic.dispose(); bar.dispose(); salts.dispose(); drops.dispose(); },
      debug: { get S() { return S; }, A, bar, picks: { rider: riderPick, spoon: spoonPick, wb: wbPick, cyl: cylPick, rod: rodPick },
        qa: qaFlow(drag, [
          { name: '放称量纸', tap: papersPick },
          { name: '拨游码', drag: riderPick, to: () => new THREE.Vector3(BAL.x - 0.0375 + 0.075 * 0.6, 0.056, 0.012) },
          { name: '按住药匙', hold: spoonPick, wait: SALT / 0.45 },
          { name: '松开药匙', release: spoonPick, wait: 0.5 },
          { name: '调成 3 g', run: () => { S.panSalt = SALT; }, wait: 1 },
          { name: '倒进烧杯', tap: panPick, wait: 0.5 },
          { name: '拿起蒸馏水', hold: wbPick },
          { name: '倒进量筒', run: () => A.wbDrag(wbToCyl()), wait: 6.5 },
          { name: '放下蒸馏水', release: wbPick, wait: 0.5 },
          { name: '调到 46.2', run: () => { S.water = 46.2; } },
          { name: '滴 1', tap: dropPick, wait: 0.3 }, { name: '滴 2', tap: dropPick, wait: 1 },
          { name: '拿起量筒', hold: cylPick },
          { name: '倒进烧杯', run: () => A.cylDrag(cylToBk()), wait: 3 },
          { name: '放下量筒', release: cylPick, wait: 0.5 },
          { name: '拿起玻璃棒', hold: rodPick },
          ...Array.from({ length: 10 }, (_, j) => ({ name: `搅拌 ${j + 1}`, run: () => A.rodDrag(new THREE.Vector3(BK.x + (j % 2 ? 0.012 : -0.012), 0.03, BK.z + (j % 3 ? 0.008 : -0.008))), wait: 0.3 })),
          { name: '放下玻璃棒', release: rodPick, wait: 2 },
          { name: '装瓶', tap: botPick, wait: 0.5 },
          { name: '答第一题', run: () => W.t1.el.querySelector('button').click() },
          { name: '答第二题', run: () => W.t2.el.querySelector('button').click() },
        ]) },
    };
  },
};
