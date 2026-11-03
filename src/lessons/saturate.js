// 课题2 溶解度 · 实验 9-5、9-6 饱和溶液与结晶（课本下册第 37–38 页图 9-8、9-9、9-10）。
//
// 实验 9-5：10 mL 水 + 2 g 氯化钠，搅拌（全溶）；再加 2 g，搅拌（有剩余：饱和）；再加 10 mL 水，搅拌（又全溶：不饱和）。
// 实验 9-6：10 mL 水 + 3 g 硝酸钾（全溶）；再加 3 g（有剩余）；加热（剩余的溶解）；再加 3 g（也溶解）；静置冷却（析出针状晶体：结晶）。
// 数据：课本表 9-1 的溶解度（每 100 g 水），按温度插值；10 mL 水按 10 g 计。20 ℃：氯化钠最多溶 3.6 g、硝酸钾 3.16 g；60 ℃ 硝酸钾 11 g。
import * as THREE from 'three';
import { buttons, table } from './kit/ui.js';
import { draggable, clamp } from './kit/interact.js';
import { textPlate, thermometer } from './kit/props.js';
import { chemBeaker, chemLamp, CHEM } from './kit/chem.js';
import { glass2 } from './kit/chemfx.js';
import { lessonBar } from './kit/lessonbar.js';
import { qaFlow, sandbox, wrapPointer, paperSheet, think, demoActs } from './kit/chemlesson.js';
import { sfx } from './kit/audio.js';
import { paint, inked } from '../live/ink.js';
import { h } from '../ui/Panel.js';

const SOL = { NaCl: [35.7, 35.8, 36.0, 36.3, 36.6, 37.0, 37.3, 37.8, 38.4, 39.0, 39.8], KNO3: [13.3, 20.9, 31.6, 45.8, 63.9, 85.5, 110, 138, 169, 202, 246] };
const sol = (k, T) => { const v = SOL[k], x = clamp(T, 0, 100) / 10, i = Math.min(9, Math.floor(x)); return v[i] + (v[i + 1] - v[i]) * (x - i); };
const ROOM = 20, BR = 0.026, BH = 0.06;
const B = { NaCl: new THREE.Vector3(-0.07, 0, 0), KNO3: new THREE.Vector3(0.05, 0.012, 0) };
const NAME = { NaCl: '氯化钠', KNO3: '硝酸钾' }, ADD = { NaCl: 2, KNO3: 3 };

export default {
  id: 'saturate',
  fig: '图9-10',
  title: '饱和溶液与结晶',
  stampText: '实验',
  style: 'paper',
  predict: {
    q: '在室温下，10 mL 水里能不能无限地溶解氯化钠？',
    hint: '课本第 37 页实验 9-5。',
    options: ['不能，溶到一定量就溶不了了；再加水又能溶', '能，加多少溶多少', '一点也不能溶'],
    answer: 0,
  },
  need: '实验 9-5：10 mL 水里先后加 2 g、2 g 氯化钠，再加 10 mL 水；实验 9-6：10 mL 水里先后加 3 g、3 g 硝酸钾，加热，再加 3 g，冷却',
  conclusion: {
    crops: [{ page: 42, rect: [44, 370, 152, 574] }],
    quote: '在一定温度下，向一定量溶剂里加入某种溶质，当溶质不能继续溶解时，所得到的溶液叫作这种溶质的饱和溶液；还能继续溶解溶质的溶液，叫作这种溶质的不饱和溶液。……过多的硝酸钾会从饱和溶液中以晶体的形式析出，这一过程叫作结晶。',
    why: '溶质不能继续溶解的溶液是<b>饱和溶液</b>，还能继续溶解的是<b>不饱和溶液</b>。<b>增加溶剂</b>或<b>升高温度</b>（对硝酸钾），饱和溶液可以变成不饱和溶液——所以只有指明“在一定量溶剂里”和“在一定温度下”，饱和、不饱和才有确定的意义。<br>热的硝酸钾溶液冷却，溶解度变小，过多的硝酸钾以晶体的形式析出——<b>结晶</b>。',
    src: '课本下册第 37–38 页 · 第九单元 课题2 溶解度（实验 9-5、9-6）；溶解度数据：表 9-1',
  },

  create({ tag, look, back }) {
    const root = new THREE.Group(), group = new THREE.Group();
    root.add(group);
    let S = null, W = null;
    const status = (m) => { if (!S.demo) W?.status(m); else bar.caption(m); };
    const done = (id) => { if (!S.demo) bar.done(id); };
    const log = (row) => { if (!S.demo) W?.tbl.add(row); };

    paperSheet(group, { w: 0.3, d: 0.18, x: -0.01, z: 0.02 });
    const parts = {};
    for (const k of ['NaCl', 'KNO3']) {
      const bk = chemBeaker({ r: BR, h: BH, level: 0, color: CHEM.water, marks: true }); bk.position.copy(B[k]); group.add(bk);
      const heap = new THREE.Mesh(new THREE.SphereGeometry(0.012, 18, 8, 0, Math.PI * 2, 0, Math.PI / 2), paint(0xf6f6f2)); heap.scale.y = 0.35; heap.position.copy(B[k]).add(new THREE.Vector3(0, 0.0015, 0)); heap.visible = false; group.add(heap);
      const needles = new THREE.Group(); needles.position.copy(B[k]).add(new THREE.Vector3(0, 0.0015, 0)); group.add(needles);
      if (k === 'KNO3') for (let i = 0; i < 60; i++) { const L = 0.005 + Math.random() * 0.012; const n = new THREE.Mesh(new THREE.BoxGeometry(0.0012, L, 0.0012), paint(0xf6f6f2)); n.geometry.translate(0, L / 2, 0); const r = Math.sqrt(Math.random()) * 0.022, a = Math.random() * 6.28; n.position.set(Math.cos(a) * r, 0, Math.sin(a) * r); n.rotation.set((Math.random() - 0.5) * 1.4, Math.random() * 6, (Math.random() - 0.5) * 1.4); n.userData.k = Math.random(); needles.add(n); }
      const lab = textPlate(`${NAME[k]}（实验 ${k === 'NaCl' ? '9-5' : '9-6'}）`, { w: 0.04, h: 0.0075, color: '#23293a', bg: '#fffaf0', font: 'bold 70px "Songti SC", serif' }); lab.position.set(B[k].x, B[k].y + 0.01, BR + 0.0015); group.add(lab);
      const pick = new THREE.Mesh(new THREE.CylinderGeometry(BR + 0.004, BR + 0.004, BH, 12), new THREE.MeshBasicMaterial({ visible: false })); pick.position.set(0, BH / 2, 0); pick.userData.pick = true; bk.add(pick);
      // 药品瓶（点一下：加一份）
      const bt = new THREE.Group(); bt.position.copy(B[k]).add(new THREE.Vector3(-0.042, -B[k].y, 0.045)); group.add(bt);        // 放在烧杯左前方（不被烧杯挡住）
      const body = inked(new THREE.Mesh(new THREE.CylinderGeometry(0.013, 0.013, 0.034, 20), paint(0xeceef0)), { width: 0.6 }); body.position.y = 0.017; bt.add(body);
      const cap = inked(new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.01, 0.007, 18), paint(0x3d4352)), { width: 0.5 }); cap.position.y = 0.038; bt.add(cap);
      const bl = textPlate(`${NAME[k]} ${ADD[k]} g`, { w: 0.022, h: 0.0075, color: '#23293a', bg: '#fffaf0', font: 'bold 72px "Songti SC", serif' }); bl.position.set(0, 0.018, 0.0133); bt.add(bl);
      const btPick = new THREE.Mesh(new THREE.CylinderGeometry(0.017, 0.017, 0.045, 10), new THREE.MeshBasicMaterial({ visible: false })); btPick.position.y = 0.022; btPick.userData.pick = true; bt.add(btPick);
      const th = thermometer({ min: 0, max: 100, length: 0.11 }); th.position.copy(B[k]).add(new THREE.Vector3(0.016, 0.0125, -0.01)); th.rotation.z = 0.15; group.add(th);
      th.children[1].material = paint(0xd8342a, { keep: true }); th.children[0].material = glass2({ base: 0.06, rim: 0.5, band: 0.5 }); th.children[0].renderOrder = 9;
      parts[k] = { bk, heap, needles, pick, btPick, th, card: tag('', 'cond') };
      parts[k].card.px = [0, -80];
    }
    // 加水的量筒（实验 9-5）、陶土网和酒精灯（实验 9-6）
    const cup = new THREE.Group(); cup.position.set(-0.14, 0, -0.01); group.add(cup);
    const cupB = chemBeaker({ r: 0.014, h: 0.04, level: 0.03, color: CHEM.water, marks: false }); cup.add(cupB);
    const cl = textPlate('水 10 mL', { w: 0.022, h: 0.0072, color: '#23293a', bg: '#fffaf0', font: 'bold 72px "Songti SC", serif' }); cl.position.set(0, 0.01, 0.0145); cup.add(cl);
    const cupPick = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.04, 10), new THREE.MeshBasicMaterial({ visible: false })); cupPick.position.y = 0.02; cupPick.userData.pick = true; cup.add(cupPick);
    const net = inked(new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.002, 0.07), paint(0xd8d4cc)), { width: 0.5 }); net.position.set(B.KNO3.x, 0.011, 0); group.add(net);
    for (const [dx, dz] of [[-0.03, -0.03], [0.03, -0.03], [-0.03, 0.03], [0.03, 0.03]]) { const leg = inked(new THREE.Mesh(new THREE.BoxGeometry(0.003, 0.011, 0.003), paint(0x7a808a)), { width: 0.3 }); leg.position.set(B.KNO3.x + dx, 0.0055, dz); group.add(leg); }
    const lamp = chemLamp(); lamp.scale.setScalar(0.5); lamp.position.set(B.KNO3.x + 0.07, 0, 0.04); group.add(lamp);
    const lampPick = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.08, 10), new THREE.MeshBasicMaterial({ visible: false })); lampPick.position.set(0, 0.04, 0.03); lampPick.userData.pick = true; lamp.add(lampPick);
    const LAMP_HOME = lamp.position.clone(), LAMP_UNDER = new THREE.Vector3(B.KNO3.x, 0, 0.022);        // 网下偏前一点：从前面点得到酒精灯

    // ================= 状态 =================
    const freshB = (k) => ({ water: 10, added: 0, dis: 0, T: ROOM, stir: 0, lastLog: '' });
    const fresh = () => ({ demo: false, pend: { NaCl: null, KNO3: null }, b: { NaCl: freshB(), KNO3: freshB() }, lit: false, cupUsed: false, kStage: 0, nStage: 0, cooled: false });
    S = fresh();
    const cap = (k) => sol(k, S.b[k].T) * S.b[k].water / 100;

    // 每加一次 / 搅拌一次之后，等溶完了再记一行（记录写现象，不写数）
    const A = {
      add(k) { const Bk = S.b[k]; if (k === 'NaCl' && Bk.added >= 4) return status('课本只加两次，各 2 g。接着加 10 mL 水。'); if (k === 'KNO3' && (Bk.added >= 9 || (Bk.added >= 6 && Bk.T < 40))) return status(Bk.added >= 9 ? '课本加了三次，各 3 g。现在点酒精灯停止加热，静置冷却。' : '有剩余固体不再溶解了。点<b>酒精灯</b>加热烧杯。'); Bk.added += ADD[k]; sfx.clink({ freq: 2400, gain: 0.02 }); S.pend[k] = Bk.added === ADD[k] ? `加入 ${ADD[k]} g ${NAME[k]}，搅拌` : `再加入 ${ADD[k]} g ${NAME[k]}，搅拌`; status(`加入了 ${ADD[k]} g ${NAME[k]}。点一下烧杯：<b>搅拌</b>。`); },
      stir(k) { S.b[k].stir = 1; sfx.clink({ freq: 1600, gain: 0.015 }); },
      water() { if (S.cupUsed) return; if (S.b.NaCl.added < 4) return status('先做前两步：加两次 2 g 氯化钠。'); S.cupUsed = true; S.b.NaCl.water = 20; S.pend.NaCl = '再加入 10 mL 水，搅拌'; sfx.clink({ freq: 1200, gain: 0.03 }); status('加入了 10 mL 水。点一下烧杯：<b>搅拌</b>。'); },
      lamp() {
        if (!S.lit) { if (S.b.KNO3.added < 6) return status('先加两次 3 g 硝酸钾，等有剩余固体不再溶解时再加热。'); S.lit = true; S.pend.KNO3 = '加热烧杯'; status('点燃酒精灯，加热烧杯。看剩下的硝酸钾。'); }
        else { S.lit = false; if (S.b.KNO3.added >= 9) { S.pend.KNO3 = null; S.cooling = true; status('停止加热，<b>静置</b>，等溶液冷却……'); } }
      },
      reset() { S = fresh(); W?.tbl.clear(); if (W) { W.t1.close(); W.t2.close(); W.next.hidden = true; } bar.undo('n1', 'n2', 'n3', 'k1', 'k2', 'k3', 'k4', 'k5', 'why'); status('全部重新摆好了，记录也清空了。'); },
    };
    const drag = draggable(group, [], { taps: [
      ...['NaCl', 'KNO3'].flatMap((k) => [{ obj: parts[k].btPick, hint: `点一下：加 ${ADD[k]} g ${NAME[k]}`, onTap: () => A.add(k) }, { obj: parts[k].pick, hint: '点一下：用玻璃棒搅拌', onTap: () => A.stir(k) }]),
      { obj: cupPick, hint: () => (S.cupUsed ? '' : '点一下：往氯化钠那杯里加 10 mL 水'), onTap: () => A.water() },
      { obj: lampPick, hint: () => (S.lit ? '点一下：停止加热' : '点一下：点燃酒精灯，加热硝酸钾那杯'), onTap: () => A.lamp() },
    ], tip: tag('', 'pill') });
    const act = demoActs(drag, group);
    const P = (k) => parts[k];

    const bar = lessonBar({
      look, back, group,
      steps: [
        { id: 'n1', title: '9-5：加 2 g 氯化钠', todo: '点<b>氯化钠</b>瓶加 2 g，再点烧杯搅拌。', target: () => P('NaCl').bk },
        { id: 'n2', title: '再加 2 g', todo: '再加 2 g 氯化钠，搅拌，看有没有剩余。', target: () => P('NaCl').bk },
        { id: 'n3', title: '再加 10 mL 水', todo: '点<b>水</b>，加 10 mL，搅拌。', target: () => (S.cupUsed ? P('NaCl').bk : cup) },
        { id: 'k1', title: '9-6：加 3 g 硝酸钾', todo: '点<b>硝酸钾</b>瓶加 3 g，搅拌。', target: () => P('KNO3').bk },
        { id: 'k2', title: '再加 3 g', todo: '再加 3 g 硝酸钾，搅拌。', target: () => P('KNO3').bk },
        { id: 'k3', title: '加热', todo: '有剩余固体时，点<b>酒精灯</b>加热烧杯。', target: () => lamp },
        { id: 'k4', title: '再加 3 g', todo: '再加 3 g 硝酸钾，搅拌。', target: () => P('KNO3').bk },
        { id: 'k5', title: '静置冷却', todo: '点酒精灯<b>停止加热</b>，静置，等溶液冷却。', target: () => (S.lit ? lamp : null) },
        { id: 'why', title: '想一想', todo: '在左边作答。' },
      ],
      reels: {
        demo: {
          seal: '演示', label: '老师演示',
          ...sandbox({ get: () => S, set: (s) => { S = s; }, fresh, bar: () => bar }),
          shots: [
            { cap: '实验 9-5：10 mL 水里加 2 g 氯化钠，搅拌——全部溶解；再加 2 g，搅拌——有剩余：饱和了。', dur: 8, cam: [[B.NaCl.x, 0.04, 0], [0.05, 0.3, 1], 0.24], during: act.seq(act.tap(P('NaCl').btPick, 0.05), act.tap(P('NaCl').pick, 0.15), act.tap(P('NaCl').btPick, 0.5), act.tap(P('NaCl').pick, 0.6)) },
            { cap: '再加 10 mL 水，搅拌：剩余的氯化钠又溶解了——饱和溶液变成了不饱和溶液。', dur: 5, cam: [[B.NaCl.x, 0.04, 0], [0.05, 0.3, 1], 0.24], during: act.seq(act.tap(cupPick, 0.05), act.tap(P('NaCl').pick, 0.2)) },
            { cap: '实验 9-6：10 mL 水里先后加 3 g、3 g 硝酸钾——第二次有剩余；加热，剩余的溶解了；再加 3 g，也溶解了。', dur: 14, speed: 2, cam: [[B.KNO3.x, 0.05, 0], [0.05, 0.3, 1], 0.26],
              during: act.seq(act.tap(P('KNO3').btPick, 0.03), act.tap(P('KNO3').pick, 0.08), act.tap(P('KNO3').btPick, 0.2), act.tap(P('KNO3').pick, 0.25), act.tap(lampPick, 0.4), act.tap(P('KNO3').btPick, 0.75), act.tap(P('KNO3').pick, 0.8)) },
            { cap: '停止加热，静置冷却：烧杯底部析出了针状的硝酸钾晶体——结晶。演示完了，下面换你自己做。', dur: 10, speed: 3, cam: [[B.KNO3.x, 0.04, 0], [0.05, 0.3, 1], 0.24], during: act.tap(lampPick, 0.03) },
          ],
        },
      },
    });
    const pointer = wrapPointer(drag, bar);

    const step = (h) => {
      // 酒精灯挪到网下 / 挪开；温度
      lamp.position.lerp(S.lit ? LAMP_UNDER.clone().setY(0) : LAMP_HOME, 0.15); lamp.position.y = 0;
      lamp.flame.setOn(S.lit); lamp.flame.update(performance.now() / 1000);
      const K = S.b.KNO3; K.T += ((S.lit ? 70 : ROOM) - K.T) * Math.min(1, h * (S.lit ? 0.25 : 0.12));
      for (const k of ['NaCl', 'KNO3']) {
        const Bk = S.b[k], pt = parts[k];
        Bk.stir = Math.max(0, Bk.stir - h * 0.5);
        const c = cap(k), target = Math.min(Bk.added, c);
        Bk.dis += (target - Bk.dis) * Math.min(1, h * (target > Bk.dis ? 0.8 + 3 * Bk.stir : 0.25));
        const left = Bk.added - Bk.dis;
        pt.bk.setLevel((Bk.water * 1e-6) / (Math.PI * (BR - 0.0012) ** 2) * 1.05);
        pt.th.setTemp(Bk.T);
        const crys = k === 'KNO3' && S.cooling;
        pt.heap.visible = left > 0.08 && !crys; pt.heap.scale.setScalar(Math.max(0.3, Math.cbrt(left / 2))); pt.heap.scale.y *= 0.35;
        pt.needles.children.forEach((n) => { n.visible = crys && n.userData.k < left / 6; });
        // 记录
        if (S.pend[k] && Math.abs(Bk.dis - target) < 0.03 && (S.pend[k] === '加热烧杯' ? Bk.T > 55 : Bk.stirredAt === Bk.added + Bk.water)) {
          const all = left < 0.08, txt = S.pend[k]; S.pend[k] = null;
          const sat = !all;
          log([txt, all ? (txt === '加热烧杯' ? '剩余的硝酸钾<b>全部溶解</b>了' : '<b>全部溶解</b>') : '有固体<b>剩余</b>，不再溶解', all ? '不饱和溶液（还能再溶）' : '<b>饱和溶液</b>']);
          status(`${NAME[k]}：${all ? '全部溶解了' : '有剩余，不能再溶解——<b>饱和</b>了'}。`);
          const id = k === 'NaCl' ? ['n1', 'n2', 'n3'][S.nStage++] : ['k1', 'k2', 'k3', 'k4'][S.kStage++];
          if (id) done(id);
        }
        if (Bk.stir > 0.9) Bk.stirredAt = Bk.added + Bk.water;
        if (crys && Bk.T < 25 && !S.cooled) { S.cooled = true; done('k5'); log(['静置，冷却', `烧杯底部析出<b>针状晶体</b>（约 ${left.toFixed(1)} g）`, '温度降低，溶解度变小：<b>结晶</b>']); status('冷却后，烧杯底部析出了针状的硝酸钾晶体——<b>结晶</b>。'); W?.t1.open(); }
        pt.card.text(`<div class="cc"><div class="cc-t"><span class="cc-name">${NAME[k]} · ${Bk.water} mL 水 · ${Bk.T.toFixed(0)} ℃</span>${Bk.added && left > 0.08 ? '<span class="cc-res">饱和</span>' : ''}</div><div class="cc-more"><div class="cc-obs"><small>加了 ${Bk.added} g，最多能溶 ${c.toFixed(1)} g</small></div></div></div>`).loc(group, B[k].x, B[k].y + BH, 0).show(true);
      }
    };

    return {
      group: root,
      pointer,
      card: false,
      toggles: ['cards', 'steps'],
      size: { w: 0.26, d: 0.14, h: 0.12 },
      view: { elev: 20, azim: -4, lookY: 0.4, frameMargin: 1.08 },
      mount(ui) {
        ui.el.classList.add('xuean');
        const ctx = () => [...W.tbl.el.querySelectorAll('tbody tr')].map((tr) => `<div>${tr.children[0].innerHTML}：${tr.children[1].innerHTML}</div>`).join('');
        const t2 = think({ title: '想一想', ctx, status: (m) => ui.status(m),
          q: '热的硝酸钾溶液冷却后为什么会析出晶体？',
          options: ['温度降低，硝酸钾的溶解度变小，溶不下的硝酸钾以晶体析出', '水蒸发掉了', '加热时生成了新物质'],
          wrong: ['静置这一会儿，水几乎没少。', '硝酸钾溶解、析出都是物理变化。'],
          ok: '对：这一过程叫<b>结晶</b>。可以掀开结论看看。',
          onOk: () => { next.hidden = false; done('why'); } });
        const t1 = think({ title: '想一想', ctx, status: (m) => ui.status(m),
          q: '怎样能使饱和溶液变成不饱和溶液？',
          options: ['增加溶剂，或升高温度（对硝酸钾）', '再加溶质', '用玻璃棒多搅拌'],
          wrong: ['饱和溶液里再加溶质，溶不了。', '搅拌只能让它溶得快，不能溶得多。'],
          ok: '对：所以说“饱和”“不饱和”要指明<b>一定量溶剂</b>和<b>一定温度</b>。',
          onOk: () => t2.open() });
        const next = h('button', { class: 'go big-next', hidden: true, onclick: () => ui.go(2) }, '掀开课本上的结论 →');
        const tbl = table(['实验内容', '现象', '分析']);
        const more = h('details', { class: 'more' }, h('summary', {}, '更多'), buttons([{ text: '全部重来（清空记录）', ghost: true, onClick: () => A.reset() }]).el);
        const note = h('p', { class: 'fineprint', html: '说明：溶解度用课本表 9-1 的数据；10 mL 水按 10 g 计；加热、冷却的快慢是示意。' });
        ui.controls.append(t1.el, t2.el, next, more, note);
        ui.data.append(tbl.el);
        const dt = ui.data.previousElementSibling; if (dt?.classList.contains('bar-title')) dt.textContent = '观察记录';
        W = { tbl, t1, t2, next, status: (m) => ui.status(m) };
        bar.attach(ui);
        ui.status('左边一个烧杯（10 mL 水）做实验 9-5（氯化钠）；右边放在陶土网上的一个烧杯（10 mL 水）做实验 9-6（硝酸钾）。后面是两瓶药品，每点一下加一份。');
      },
      update(dt, t) { const k = bar.update(dt); step(Math.min(dt, 1 / 30) * k, t); },
      dispose() { bar.dispose(); },
      debug: { get S() { return S; }, A, bar, picks: { n: P('NaCl').btPick, k: P('KNO3').btPick, lamp: lampPick },
        qa: qaFlow(drag, [
          { name: '加 2 g', tap: P('NaCl').btPick }, { name: '搅拌 1', tap: P('NaCl').pick, wait: 3 },
          { name: '再加 2 g', tap: P('NaCl').btPick }, { name: '搅拌 2', tap: P('NaCl').pick, wait: 5 },
          { name: '加水', tap: cupPick }, { name: '搅拌 3', tap: P('NaCl').pick, wait: 4 },
          { name: '加 3 g', tap: P('KNO3').btPick }, { name: '搅拌 4', tap: P('KNO3').pick, wait: 3 },
          { name: '再加 3 g', tap: P('KNO3').btPick }, { name: '搅拌 5', tap: P('KNO3').pick, wait: 5 },
          { name: '加热', tap: lampPick, wait: 14 },
          { name: '再加 3 g（热）', tap: P('KNO3').btPick }, { name: '搅拌 6', tap: P('KNO3').pick, wait: 4 },
          { name: '停止加热', tap: lampPick, wait: 30 },
          { name: '答第一题', run: () => W.t1.el.querySelector('button').click() },
          { name: '答第二题', run: () => W.t2.el.querySelector('button').click() },
        ]) },
    };
  },
};
