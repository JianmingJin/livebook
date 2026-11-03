// 课题2 化石能源的合理利用 · 实验 7-2 甲烷燃烧（课本上册第 171 页图 7-20）。
//
// (1) 点燃从导管放出的甲烷（已经验过纯），在火焰上方罩一个干燥的烧杯：烧杯内壁出现水雾。
// (2) 迅速把烧杯倒过来，向烧杯内注入少量澄清石灰水，振荡：石灰水变浑浊。
// 结论：甲烷燃烧生成水和二氧化碳——甲烷里含有氢元素和碳元素。CH₄ + 2O₂ ══(点燃) CO₂ + 2H₂O。
// 模型：罩着烧杯时，烧杯里攒下的二氧化碳和水跟着燃烧的时间涨；倒过来以后二氧化碳还留在烧杯里（比空气重），倒得慢、等久了会跑掉一些。
import * as THREE from 'three';
import { buttons, table } from './kit/ui.js';
import { draggable, clamp } from './kit/interact.js';
import { textPlate } from './kit/props.js';
import { Particles } from './kit/fx.js';
import { glassTube, chemBeaker, reagentBottle, CHEM } from './kit/chem.js';
import { water2, flame2, milky } from './kit/chemfx.js';
import { microWorld, methaneScene } from './kit/microworld.js';
import { lessonBar } from './kit/lessonbar.js';
import { qaFlow, sandbox, wrapPointer, paperSheet, think, demoActs } from './kit/chemlesson.js';
import { sfx } from './kit/audio.js';
import { paint, inked } from '../live/ink.js';
import { h } from '../ui/Panel.js';

const JET = new THREE.Vector3(-0.02, 0.12, 0);
const BK_HOME = new THREE.Vector3(0.07, 0, 0.05), LIME_HOME = new THREE.Vector3(0.12, 0, 0.03);
const BR = 0.022, BH = 0.05;

export default {
  id: 'methane',
  fig: '图7-20',
  title: '甲烷燃烧',
  stampText: '实验',
  style: 'paper',
  predict: {
    q: '甲烷燃烧以后生成什么？',
    hint: '课本第 171 页实验 7-2：罩干燥的烧杯，再倒进澄清石灰水。',
    options: ['水和二氧化碳', '只有水', '只有二氧化碳', '氢气和碳'],
    answer: 0,
  },
  need: '点燃甲烷，罩一个干燥的烧杯观察内壁；迅速把烧杯倒过来，注入少量澄清石灰水，振荡观察',
  conclusion: {
    crops: [{ page: 177, rect: [278, 388, 375, 562] }],
    quote: '天然气主要含有由碳和氢组成的气态碳氢化合物，其中最主要的成分是甲烷。',
    formula: 'CH₄ + 2O₂ ══(点燃) CO₂ + 2H₂O',
    why: '甲烷燃烧，产生<b>明亮的蓝色火焰</b>；干燥烧杯内壁出现<b>水雾</b>——生成了水，甲烷里含有<b>氢元素</b>；倒进澄清石灰水振荡，<b>变浑浊</b>——生成了二氧化碳，甲烷里含有<b>碳元素</b>。<br>甲烷和空气混合遇明火可能爆炸，所以点燃甲烷前也要<b>先验纯</b>（和氢气一样）。',
    src: '课本上册第 171 页 · 第七单元 课题2 化石能源的合理利用（实验 7-2）',
  },

  create({ tag, look, back }) {
    const root = new THREE.Group(), group = new THREE.Group();
    root.add(group);
    let S = null, W = null;
    const status = (m) => { if (!S.demo) W?.status(m); else bar.caption(m); };
    const done = (id) => { if (!S.demo) bar.done(id); };
    const log = (row) => { if (!S.demo) W?.tbl.add(row); };

    paperSheet(group, { w: 0.26, d: 0.16, x: 0.03, z: 0.02 });

    // ================= 甲烷导管（尖嘴）、火焰 =================
    const tank = new THREE.Group(); tank.position.set(-0.07, 0, 0); group.add(tank);
    { const body = inked(new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.07, 22), paint(0x6f8aa0)), { width: 0.6 }); body.position.y = 0.035; tank.add(body);
      const valve = inked(new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.006, 0.012, 12), paint(0x3d4352)), { width: 0.5 }); valve.position.y = 0.076; tank.add(valve);
      const lab = textPlate('甲烷（已验纯）', { w: 0.03, h: 0.008, color: '#23293a', bg: '#fffaf0', font: 'bold 64px "Songti SC", serif' }); lab.position.set(0, 0.04, 0.0183); tank.add(lab); }
    const tube = glassTube([new THREE.Vector3(-0.07, 0.082, 0), new THREE.Vector3(-0.07, 0.095, 0), new THREE.Vector3(-0.06, 0.1, 0), new THREE.Vector3(JET.x, 0.1, 0), JET.clone()], { r: 0.002 }); group.add(tube);
    const flame = flame2({ w: 0.008, h: 0.026, core: 0xeaf4ff, mid: 0x9cc4ff, edge: 0x4f7cff, blue: 0.9, glowK: 0.4, alpha: 0.8 }); flame.position.copy(JET).add(new THREE.Vector3(0, 0.001, 0)); flame.setOn(false); group.add(flame);
    const jetPick = new THREE.Mesh(new THREE.SphereGeometry(0.012, 10, 8), new THREE.MeshBasicMaterial({ visible: false })); jetPick.position.copy(JET); jetPick.userData.pick = true; group.add(jetPick);

    // ================= 干燥的烧杯、澄清石灰水 =================
    const piv = new THREE.Group(); group.add(piv);
    const bk = chemBeaker({ r: BR, h: BH, level: 0, color: 0xe6f0f2, marks: false }); bk.position.y = -BH / 2; piv.add(bk);
    const mist = new THREE.Mesh(new THREE.CylinderGeometry(BR - 0.0008, BR - 0.0008, BH - 0.002, 32, 1, true), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide })); mist.position.y = BH / 2; mist.renderOrder = 9.7; bk.add(mist);
    const milk = milky(bk.liq);
    const bkPick = new THREE.Mesh(new THREE.CylinderGeometry(BR + 0.004, BR + 0.004, BH, 10), new THREE.MeshBasicMaterial({ visible: false })); bkPick.position.y = BH / 2; bkPick.userData.pick = true; bk.add(bkPick);
    const PIV_HOME = BK_HOME.clone().add(new THREE.Vector3(0, BH / 2, 0)); piv.position.copy(PIV_HOME);
    const lime = reagentBottle({ r: 0.013, h: 0.04, color: 0xe6f0f2 }); lime.position.copy(LIME_HOME); group.add(lime);
    const limeLab = textPlate('澄清石灰水', { w: 0.026, h: 0.0075, color: '#23293a', bg: '#fffaf0', font: 'bold 70px "Songti SC", serif' }); limeLab.position.set(0, 0.022, 0.0135); lime.add(limeLab);
    const limePick = new THREE.Mesh(new THREE.CylinderGeometry(0.017, 0.017, 0.05, 10), new THREE.MeshBasicMaterial({ visible: false })); limePick.position.y = 0.025; limePick.userData.pick = true; lime.add(limePick);
    const drops = new Particles({ max: 40, geometry: new THREE.SphereGeometry(1, 6, 5), material: water2({ color: 0xe6f0f2, base: 0.5 }) }); group.add(drops.mesh);
    const card = tag('', 'cond'); card.px = [80, -60];

    // ================= 状态 =================
    const fresh = () => ({ demo: false, lit: false, bkCarry: null, covered: 0, water: 0, co2: 0, up: false, lime: 0, limeCarry: null, shake: 0, lastX: null, turbid: 0, logged: {} });
    S = fresh();

    // 微观次元：钻进火焰里看，CH₄ 和 O₂ 拆成原子、重新组合成 CO₂ 和 H₂O
    const MW_AT = JET.clone().add(new THREE.Vector3(0, 0.008, 0));
    const mw = microWorld({ mode: 'holo', scene: methaneScene(), place: () => ({ pos: group.localToWorld(MW_AT.clone()), scale: 0.0062 * group.getWorldScale(new THREE.Vector3()).x, cam: window.__lb.stage.camera }) });
    const goBtn = tag('钻进火焰里看 ⊙', 'pill mw-go', () => openMicro());
    const openMicro = (demo = false) => {
      if (!demo) look([MW_AT.x, MW_AT.y + 0.05, MW_AT.z], [0.05, 0.2, 1], 0.3);
      const r = () => { const cam = window.__lb?.stage?.camera; if (!cam) return [innerWidth / 2, innerHeight * 0.8]; const v = group.localToWorld(MW_AT.clone()).project(cam); return [(v.x + 1) / 2 * innerWidth, (1 - v.y) / 2 * innerHeight]; };
      mw.open(r, { lit: S.lit });
    };
    mw.onClose = () => { if (!bar.playing) back(); };
    const A = {
      light() { if (S.lit) return; S.lit = true; done('light'); sfx.whoosh?.({ freq: 600, gain: 0.07, dur: 0.3 }); status('点燃了甲烷：<b>明亮的蓝色火焰</b>。在火焰上方罩一个<b>干燥的烧杯</b>。'); },
      bkDrag(p) {
        if (!p) return; const last = S.lastX; S.bkCarry = p.clone();
        if (S.up && S.lime > 0.5 && last != null) S.shake = Math.min(1, S.shake + Math.abs(p.x - last) * 30);
        S.lastX = p.x;
      },
      bkDrop() {
        S.bkCarry = null; S.lastX = null;
        if (S.covered > 0 && !S.up && S.water > 0.4) { S.up = true; done('cover'); status('迅速把烧杯<b>倒过来</b>，放在桌上（二氧化碳比空气重，留在杯里）。把<b>澄清石灰水</b>倒进去一点，再按住烧杯左右晃（振荡）。'); }
      },
      limeDrag(p) { if (!p) return; S.limeCarry = p.clone(); },
      limeDrop() { S.limeCarry = null; },
      reset() { S = fresh(); drops.clear(); mw.close(); W?.tbl.clear(); if (W) { W.t1.close(); W.t2.close(); W.next.hidden = true; } bar.undo('light', 'cover', 'lime', 'shake', 'why'); status('全部重新摆好了，记录也清空了。'); },
    };
    const drag = draggable(group, [
      { obj: bkPick, plane: 'xy', offset: 0, hint: () => (S.up ? (S.lime > 0.5 ? '按住，左右来回拖：振荡' : '') : '干燥的烧杯：倒扣着罩在火焰上方'), onStart: (p) => A.bkDrag(p), onDrag: (p) => A.bkDrag(p), onEnd: () => A.bkDrop() },
      { obj: limePick, plane: 'xy', offset: 0, hint: () => (S.up && S.lime < 0.5 ? '澄清石灰水：拖到烧杯口倒一点' : ''), onStart: (p) => A.limeDrag(p), onDrag: (p) => A.limeDrag(p), onEnd: () => A.limeDrop() },
    ], { taps: [{ obj: jetPick, hint: () => (S.lit ? '' : '点一下：点燃甲烷'), onTap: () => A.light() }], tip: tag('', 'pill') });
    const act = demoActs(drag, group);
    const over = () => JET.clone().add(new THREE.Vector3(0, 0.055, 0));
    const limeTo = () => BK_HOME.clone().add(new THREE.Vector3(0.02, BH + 0.02, 0));

    const bar = lessonBar({
      look, back, group,
      steps: [
        { id: 'light', title: '点燃甲烷', todo: '点一下<b>尖嘴</b>，点燃甲烷。', target: () => jetPick },
        { id: 'cover', title: '罩干燥的烧杯', todo: '把<b>干燥的烧杯</b>倒扣着罩在火焰上方，过一会儿看内壁；然后松手（烧杯会倒过来放在桌上）。', target: () => (S.bkCarry ? null : piv) },
        { id: 'lime', title: '注入澄清石灰水', todo: '把<b>澄清石灰水</b>拖到烧杯口，倒进去一点。', target: () => (S.limeCarry ? null : lime) },
        { id: 'shake', title: '振荡', todo: '按住<b>烧杯</b>，左右来回拖（振荡），看石灰水。', target: () => (S.bkCarry ? null : piv) },
        { id: 'why', title: '想一想', todo: '在左边作答。' },
      ],
      reels: {
        demo: {
          seal: '演示', label: '老师演示',
          ...sandbox({ get: () => S, set: (s) => { S = s; }, fresh, bar: () => bar, apply: () => { drops.clear(); mw.close(); } }),
          shots: [
            { cap: '点燃从导管放出的甲烷（已验纯）：明亮的蓝色火焰。罩一个干燥的烧杯：内壁出现水雾。', dur: 8, cam: [[JET.x, 0.15, 0], [0.05, 0.2, 1], 0.26],
              during: act.seq(act.tap(jetPick, 0.05), act.drag(bkPick, over, { t0: 0.2, t1: 0.4, release: 0.95 })) },
            { cap: '钻进火焰里看：一个 CH₄ 和两个 O₂ 拆成原子，碳原子进了 CO₂，氢原子进了 H₂O。', dur: 11, cam: [[MW_AT.x, MW_AT.y + 0.05, MW_AT.z], [0.05, 0.2, 1], 0.3], during: act.at(0.02, () => openMicro(true)) },
            { cap: '迅速把烧杯倒过来，注入少量澄清石灰水，振荡：石灰水变浑浊。', enter: () => mw.close(), dur: 9, cam: [[BK_HOME.x, 0.05, BK_HOME.z], [0.05, 0.3, 1], 0.24],
              during: act.seq(act.drag(limePick, limeTo, { t0: 0.05, t1: 0.3, release: 0.45 }), act.wiggle(bkPick, { t0: 0.5, t1: 0.95, amp: 0.015, hz: 2.5, dur: 9 })) },
            { cap: '甲烷燃烧生成了水和二氧化碳：甲烷里含有氢元素和碳元素。演示完了，下面换你自己做。', dur: 4 },
          ],
        },
      },
    });
    const pointer = wrapPointer(drag, bar);

    // ================= 每帧 =================
    const step = (h, t) => {
      flame.setOn(S.lit); flame.update(t);
      // 烧杯：罩在火焰上（倒扣），松手后正放在桌上
      if (S.bkCarry && !S.up) {
        const at = Math.abs(S.bkCarry.x - JET.x) < 0.02 && S.bkCarry.y > JET.y + 0.02 && S.bkCarry.y < JET.y + 0.09;
        piv.position.lerp(at ? over() : S.bkCarry.clone(), 0.35); piv.rotation.z += (Math.PI - piv.rotation.z) * 0.25;
        if (at && S.lit) { S.covered += h; S.water = Math.min(1, S.water + h * 0.3); S.co2 = Math.min(1, S.co2 + h * 0.3); if (S.water > 0.4 && !S.logged.mist) { S.logged.mist = true; log(['(1) 点燃甲烷，罩一个干燥的烧杯', '蓝色火焰；烧杯内壁出现<b>水雾</b>', '生成了水：甲烷含<b>氢</b>元素']); status('烧杯内壁出现了<b>水雾</b>：甲烷燃烧生成了水。松手，把烧杯迅速倒过来。'); } }
      } else if (S.up) {
        const base = PIV_HOME.clone(); if (S.bkCarry) { base.x += clamp(S.bkCarry.x - PIV_HOME.x, -0.012, 0.012); base.y += 0.008; }        // 拿起来晃：离开桌面一点
        piv.position.lerp(base, 0.4); piv.rotation.z += (0 - piv.rotation.z) * 0.3; piv.rotation.z += S.bkCarry ? (base.x - PIV_HOME.x) * 2 : 0;
        if (!S.bkCarry) S.co2 = Math.max(0, S.co2 - h * 0.01);           // 敞着口放久了跑掉一点
      } else { piv.position.lerp(PIV_HOME, 0.25); piv.rotation.z += (0 - piv.rotation.z) * 0.25; }
      mist.material.opacity = S.water * 0.5 * (S.lime > 0.5 ? 0.4 : 1);
      // 石灰水
      if (S.limeCarry) {
        const at = S.up && Math.abs(S.limeCarry.x - (BK_HOME.x + 0.02)) < 0.03 && S.limeCarry.y > BH;
        lime.position.lerp(S.limeCarry.clone().add(new THREE.Vector3(0, -0.02, 0)), 0.4);
        lime.rotation.z += ((at ? 1.9 : 0) - lime.rotation.z) * 0.2;
        if (at && lime.rotation.z > 1.5 && S.lime < 1) { S.lime = Math.min(1, S.lime + h); if (Math.random() < h * 20) drops.spawn({ p: BK_HOME.clone().add(new THREE.Vector3(0.008, BH, 0)), v: new THREE.Vector3(0, -0.05, 0), size: 0.0012, life: 1 }); if (S.lime >= 1 && !bar.has('lime')) { done('lime'); status('注入了少量澄清石灰水。按住烧杯，左右来回拖：<b>振荡</b>。'); } }
      } else { lime.position.lerp(LIME_HOME, 0.25); lime.rotation.z *= 0.8; }
      drops.update(h, (p, d) => { p.v.y -= 0.5 * d; p.p.addScaledVector(p.v, d); return p.p.y > 0.008; });
      bk.setLevel(S.lime * 0.008);
      // 振荡：二氧化碳和石灰水反应
      S.shake = Math.max(0, S.shake - h * 0.6);
      // 石灰水：只要一点点二氧化碳就明显变浑浊（约 4.5 mL 就够）——浑浊程度往“烧杯里攒下的二氧化碳够不够”靠，振荡时靠得快
      if (S.lime > 0.5) {
        if (S.cap == null) S.cap = S.co2;
        const want = clamp(S.cap * 4, 0, 1);
        S.turbid += (want - S.turbid) * Math.min(1, (0.03 + 2.5 * S.shake) * h);
        if (S.shake > 0.5 && want < 0.5 && !S.logged.few && !S.demo) { S.logged.few = true; status('振荡了，石灰水只是有一点点浑浊——烧杯罩在火焰上的时间太短，攒下的二氧化碳太少。“更多 → 全部重来”，罩久一点（看到水雾以后再等一会儿）。'); }
      }
      milk.set(S.turbid); milk.update(t);
      if (S.turbid > 0.5 && !S.logged.lime) { S.logged.lime = true; done('shake'); log(['(2) 烧杯倒过来，注入澄清石灰水，振荡', '石灰水<b>变浑浊</b>', '生成了二氧化碳：甲烷含<b>碳</b>元素']); status('石灰水<b>变浑浊</b>了：甲烷燃烧生成了二氧化碳。'); W?.t1.open(); }
      card.text(`<div class="cc"><div class="cc-t"><span class="cc-name">烧杯里</span>${S.turbid > 0.5 ? '<span class="cc-res">变浑浊</span>' : S.water > 0.4 ? '<span class="cc-res">水雾</span>' : ''}</div></div>`).loc(piv, 0, BH / 2, 0).show(S.covered > 0);
    };

    return {
      group: root,
      pointer,
      card: false,
      toggles: ['cards', 'steps'],
      size: { w: 0.22, d: 0.12, h: 0.21 },
      view: { elev: 14, azim: -4, lookY: 0.56, frameMargin: 1.08 },
      mount(ui) {
        ui.el.classList.add('xuean');
        const ctx = () => [...W.tbl.el.querySelectorAll('tbody tr')].map((tr) => `<div>${tr.children[0].innerHTML}：${tr.children[1].innerHTML}</div>`).join('');
        const t2 = think({ title: '想一想', ctx, status: (m) => ui.status(m),
          q: '点燃甲烷前要注意什么？',
          options: ['先检验甲烷的纯度（混有空气遇明火可能爆炸）', '先把甲烷加热', '不用注意什么'],
          wrong: ['甲烷不用加热就能点着。', '甲烷和空气混合，遇明火可能爆炸。'],
          ok: '对：和氢气一样，点燃可燃性气体前要<b>验纯</b>。可以掀开结论看看。',
          onOk: () => { next.hidden = false; done('why'); } });
        const t1 = think({ title: '想一想', ctx, status: (m) => ui.status(m),
          q: '由这两个现象，可以推断甲烷里一定含有哪些元素？',
          options: ['碳元素和氢元素', '只有碳元素', '碳、氢、氧三种元素'],
          wrong: ['水雾说明生成了水，水里的氢从哪里来？', '生成物里的氧可能来自空气里的氧气，不能说明甲烷含氧。'],
          ok: '对：生成水说明含<b>氢</b>，生成二氧化碳说明含<b>碳</b>（氧可能来自氧气）。',
          onOk: () => t2.open() });
        const next = h('button', { class: 'go big-next', hidden: true, onclick: () => ui.go(2) }, '掀开课本上的结论 →');
        const tbl = table(['实验编号', '现象', '说明']);
        const more = h('details', { class: 'more' }, h('summary', {}, '更多'), buttons([{ text: '全部重来（清空记录）', ghost: true, onClick: () => A.reset() }]).el);
        const note = h('p', { class: 'fineprint', html: '说明：甲烷按已经验纯处理；水雾、浑浊出现的快慢是示意。' });
        ui.controls.append(t1.el, t2.el, next, more, note);
        ui.data.append(tbl.el);
        const dt = ui.data.previousElementSibling; if (dt?.classList.contains('bar-title')) dt.textContent = '观察记录';
        W = { tbl, t1, t2, next, status: (m) => ui.status(m) };
        bar.attach(ui);
        ui.status('图 7-20：左边是甲烷（已验纯），从尖嘴导管放出；右边一个干燥的烧杯、一瓶澄清石灰水。');
      },
      update(dt, t) {
        const k = bar.update(dt); step(Math.min(dt, 1 / 30) * k, t);
        mw.set({ lit: S.lit }); mw.update(Math.min(dt, 1 / 30) * Math.min(k, 1.5));
        goBtn.loc(group, MW_AT.x - 0.03, MW_AT.y, MW_AT.z).show(S.lit && !mw.isOpen && !bar.playing);
      },
      dispose() { mw.dispose(); bar.dispose(); drops.dispose(); },
      debug: { get S() { return S; }, A, bar, picks: { bk: bkPick, lime: limePick, jet: jetPick },
        qa: qaFlow(drag, [
          { name: '点燃', tap: jetPick, wait: 0.5 },
          { name: '拿起烧杯', hold: bkPick },
          { name: '罩上', run: () => A.bkDrag(over()), wait: 2.5 },
          { name: '松手倒过来', release: bkPick, wait: 0.8 },
          { name: '拿起石灰水', hold: limePick },
          { name: '倒', run: () => A.limeDrag(limeTo()), wait: 1.5 },
          { name: '放下石灰水', release: limePick, wait: 0.3 },
          { name: '按住烧杯', hold: bkPick },
          ...Array.from({ length: 10 }, (_, j) => ({ name: `振荡 ${j + 1}`, run: () => A.bkDrag(BK_HOME.clone().add(new THREE.Vector3(j % 2 ? 0.015 : -0.015, 0.03, 0))), wait: 0.2 })),
          { name: '松手', release: bkPick, wait: 1 },
          { name: '答第一题', run: () => W.t1.el.querySelector('button').click() },
          { name: '答第二题', run: () => W.t2.el.querySelector('button').click() },
        ]) },
    };
  },
};
