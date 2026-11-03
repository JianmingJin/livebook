// 课题1 溶液的酸碱性 · 实验 10-1 向溶液中加入酸碱指示剂（课本下册第 60 页图 10-1）。
//
// 四支试管分两组，每组里一支白醋、一支肥皂水。一组滴紫色石蕊溶液，另一组滴无色酚酞溶液。
// 结果：白醋 + 石蕊 → 红；肥皂水 + 石蕊 → 蓝；白醋 + 酚酞 → 无色（不变）；肥皂水 + 酚酞 → 红。
// 模型：白醋 pH 约 3、肥皂水 pH 约 10；石蕊 pH < 5 红、> 8 蓝，之间紫；酚酞 pH > 8.2 红。颜色随滴进去的滴数加深（滴 3 滴就很明显）。
import * as THREE from 'three';
import { buttons, table } from './kit/ui.js';
import { draggable, clamp } from './kit/interact.js';
import { textPlate } from './kit/props.js';
import { Particles } from './kit/fx.js';
import { testTube, glassMat } from './kit/chem.js';
import { water2 } from './kit/chemfx.js';
import { lessonBar } from './kit/lessonbar.js';
import { qaFlow, sandbox, wrapPointer, paperSheet, think, demoActs } from './kit/chemlesson.js';
import { sfx } from './kit/audio.js';
import { paint, inked } from '../live/ink.js';
import { h } from '../ui/Panel.js';

const XS = [-0.07, -0.035, 0.035, 0.07], T_R = 0.0085, T_LEN = 0.1, T_Y = 0.012;
const SOLN = ['白醋', '肥皂水', '白醋', '肥皂水'], PH = { 白醋: 3, 肥皂水: 10 };
const BASE = { 白醋: 0xf2f0e6, 肥皂水: 0xeef0f2 };
const IND = [{ key: 'lit', name: '紫色石蕊溶液', inside: 0x8b5fb0, home: new THREE.Vector3(-0.12, 0.006, 0.06), group: [0, 1] }, { key: 'ph', name: '无色酚酞溶液', inside: 0xf2f2ee, home: new THREE.Vector3(0.12, 0.006, 0.06), group: [2, 3] }];
const colorOf = (ind, pH) => (ind === 'lit' ? (pH < 5 ? 0xd9455f : pH > 8 ? 0x3d6fc4 : 0x8b5fb0) : pH > 8.2 ? 0xe0507a : null);
const word = (ind, pH) => (ind === 'lit' ? (pH < 5 ? '变<b>红</b>' : pH > 8 ? '变<b>蓝</b>' : '紫色（不变）') : pH > 8.2 ? '变<b>红</b>' : '<b>不变色</b>（无色）');

export default {
  id: 'indicator',
  fig: '图10-1',
  title: '酸碱指示剂',
  stampText: '实验',
  style: 'paper',
  predict: {
    q: '向白醋和肥皂水里分别滴紫色石蕊溶液，会变成什么颜色？',
    hint: '课本第 60 页实验 10-1。食醋有酸性，肥皂水有碱性。',
    options: ['白醋变红，肥皂水变蓝', '白醋变蓝，肥皂水变红', '都变红', '都不变色'],
    answer: 0,
  },
  need: '两组试管（白醋、肥皂水），一组滴紫色石蕊溶液，另一组滴无色酚酞溶液，观察并记录',
  conclusion: {
    crops: [{ page: 64, rect: [42, 395, 240, 560] }],
    quote: '酸性溶液能使紫色石蕊溶液变成红色，不能使无色酚酞溶液变色；碱性溶液能使紫色石蕊溶液变成蓝色，使无色酚酞溶液变成红色。利用酸碱指示剂可以检验溶液的酸碱性。',
    why: '白醋显<b>酸性</b>：石蕊变红，酚酞不变色；肥皂水显<b>碱性</b>：石蕊变蓝，酚酞变红。石蕊、酚酞这类遇到酸性或碱性溶液会变色的物质叫<b>酸碱指示剂</b>。',
    src: '课本下册第 60–61 页 · 第十单元 课题1 溶液的酸碱性（实验 10-1）',
  },

  create({ tag, look, back }) {
    const root = new THREE.Group(), group = new THREE.Group();
    root.add(group);
    let S = null, W = null;
    const status = (m) => { if (!S.demo) W?.status(m); else bar.caption(m); };
    const done = (id) => { if (!S.demo) bar.done(id); };
    const log = (row) => { if (!S.demo) W?.tbl.add(row); };

    paperSheet(group, { w: 0.32, d: 0.16, x: 0, z: 0.02 });
    const rackM = paint(0xd9c9a6);
    for (const cx of [-0.0525, 0.0525]) {
      const base = inked(new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.008, 0.03), rackM), { width: 0.6 }); base.position.set(cx, 0.004, 0); group.add(base);
      for (const sx of [-1, 1]) { const p = inked(new THREE.Mesh(new THREE.BoxGeometry(0.004, 0.06, 0.026), rackM), { width: 0.5 }); p.position.set(cx + sx * 0.033, 0.036, 0); group.add(p); }
      const top = inked(new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.004, 0.02), rackM), { width: 0.5 }); top.position.set(cx, 0.064, -0.006); group.add(top);
    }
    const tubes = XS.map((x, k) => {
      const t = testTube({ r: T_R, len: T_LEN }); t.position.set(x, T_Y, 0); group.add(t);
      const liq = new THREE.Mesh(new THREE.CylinderGeometry(T_R - 0.0008, T_R - 0.0008, 0.03, 18), water2({ color: BASE[SOLN[k]], base: 0.55 })); liq.position.y = 0.016; liq.renderOrder = 9.6; t.add(liq);
      const lab = textPlate(SOLN[k], { w: 0.018, h: 0.0072, color: '#23293a', bg: '#fffaf0', font: 'bold 80px "Songti SC", serif' }); lab.position.set(x, 0.004, 0.0162); group.add(lab);
      return Object.assign(t, { liq });
    });
    const grpLab = ['滴石蕊', '滴酚酞'].map((t, i) => { const l = textPlate(t, { w: 0.02, h: 0.007, color: '#5a6070', bg: 'rgba(0,0,0,0)', font: 'bold 80px "Songti SC", serif' }); l.rotation.x = -Math.PI / 2; l.position.set(i ? 0.0525 : -0.0525, 0.0005, 0.03); group.add(l); return l; });
    const droppers = IND.map((I) => {
      const g = new THREE.Group(); group.add(g);
      const tube = new THREE.Mesh(new THREE.CylinderGeometry(0.0016, 0.0024, 0.042, 10), glassMat({ opacity: 0.35 })); tube.position.y = 0.021; tube.renderOrder = 9; g.add(tube);
      const inside = new THREE.Mesh(new THREE.CylinderGeometry(0.0012, 0.0018, 0.02, 8), paint(I.inside, { keep: true })); inside.position.y = 0.012; g.add(inside);
      const bulb = inked(new THREE.Mesh(new THREE.SphereGeometry(0.0052, 12, 8), paint(0xc23a3a, { keep: true })), { width: 0.4 }); bulb.scale.y = 1.6; bulb.position.y = 0.048; g.add(bulb);
      const pick = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.06, 8), new THREE.MeshBasicMaterial({ visible: false })); pick.position.y = 0.03; pick.userData.pick = true; g.add(pick);
      const l = textPlate(I.name, { w: 0.03, h: 0.0072, color: '#23293a', bg: '#fffaf0', font: 'bold 70px "Songti SC", serif' }); l.rotation.x = -Math.PI / 2; l.position.set(I.home.x, 0.0004, I.home.z + 0.012); group.add(l);
      g.position.copy(I.home); g.rotation.z = Math.PI / 2;
      return Object.assign(g, { pick });
    });
    const drops = new Particles({ max: 40, geometry: new THREE.SphereGeometry(1, 6, 5), material: water2({ color: 0x9a7fc0, base: 0.6 }) }); group.add(drops.mesh);
    const cards = XS.map(() => { const c = tag('', 'cond'); c.px = [0, -64]; return c; });

    const fresh = () => ({ demo: false, n: XS.map(() => 0), ind: XS.map(() => null), carry: [null, null], drip: 0, logged: {} });
    S = fresh();

    const A = {
      dDrag(i, p) { if (!p) return; S.carry[i] = p.clone(); },
      dDrop(i) { S.carry[i] = null; },
      reset() { S = fresh(); drops.clear(); W?.tbl.clear(); if (W) { W.t1.close(); W.next.hidden = true; } bar.undo('lit', 'ph', 'why'); status('全部重新摆好了，记录也清空了。'); },
    };
    const drag = draggable(group, IND.map((I, i) => ({ obj: droppers[i].pick, plane: 'xy', offset: 0, hint: `${I.name}：拖到这一组试管口上方，按住——一滴一滴地滴`, onStart: (p) => A.dDrag(i, p), onDrag: (p) => A.dDrag(i, p), onEnd: () => A.dDrop(i) })), { tip: tag('', 'pill') });
    const act = demoActs(drag, group);
    const overT = (k) => () => new THREE.Vector3(XS[k], T_Y + T_LEN + 0.012, 0);
    const sel = (k) => S.ind[k];

    const bar = lessonBar({
      look, back, group,
      steps: [
        { id: 'lit', title: '滴石蕊溶液', todo: '把<b>紫色石蕊溶液</b>拖到左边一组（白醋、肥皂水）的试管口上方，各滴几滴。', target: () => (S.carry[0] ? null : droppers[0]) },
        { id: 'ph', title: '滴酚酞溶液', todo: '把<b>无色酚酞溶液</b>拖到右边一组的试管口上方，各滴几滴。', target: () => (S.carry[1] ? null : droppers[1]) },
        { id: 'why', title: '想一想', todo: '在左边作答。' },
      ],
      reels: {
        demo: {
          seal: '演示', label: '老师演示',
          ...sandbox({ get: () => S, set: (s) => { S = s; }, fresh, bar: () => bar, apply: () => drops.clear() }),
          shots: [
            { cap: '向左边一组（白醋、肥皂水）滴紫色石蕊溶液：白醋变红，肥皂水变蓝。', dur: 8, cam: [[-0.05, 0.07, 0], [0.04, 0.25, 1], 0.24],
              during: act.seq(act.drag(droppers[0].pick, overT(0), { t0: 0.04, t1: 0.25, release: 0.45 }), act.drag(droppers[0].pick, overT(1), { t0: 0.5, t1: 0.65, release: 0.92 })) },
            { cap: '向右边一组滴无色酚酞溶液：白醋不变色，肥皂水变红。演示完了，下面换你自己做。', dur: 8, cam: [[0.05, 0.07, 0], [0.04, 0.25, 1], 0.24],
              during: act.seq(act.drag(droppers[1].pick, overT(2), { t0: 0.04, t1: 0.25, release: 0.45 }), act.drag(droppers[1].pick, overT(3), { t0: 0.5, t1: 0.65, release: 0.92 })) },
          ],
        },
      },
    });
    const pointer = wrapPointer(drag, bar);

    const step = (h) => {
      droppers.forEach((d, i) => {
        if (S.carry[i]) {
          const k = XS.findIndex((x) => Math.abs(S.carry[i].x - x) < 0.012 && S.carry[i].y > T_Y + T_LEN - 0.01);
          d.position.lerp(k >= 0 ? overT(k)() : S.carry[i], 0.4); d.rotation.z += (0 - d.rotation.z) * 0.3;
          if (k >= 0) {
            S.drip += h;
            if (S.drip > 0.5) {
              S.drip = 0;
              if (S.ind[k] && S.ind[k] !== IND[i].key) { status('这支试管已经滴了另一种指示剂。'); }
              else if (!IND[i].group.includes(k)) { status(`${IND[i].name}要滴在${i ? '右' : '左'}边那一组。`); }
              else { S.ind[k] = IND[i].key; S.n[k] = Math.min(5, S.n[k] + 1); sfx.clink({ freq: 2600, gain: 0.015 }); drops.spawn({ p: overT(k)().add(new THREE.Vector3(0, -0.012, 0)), v: new THREE.Vector3(0, -0.07, 0), size: 0.0012, life: 1.2 }); }
            }
          } else S.drip = 0.3;
        } else { d.position.lerp(IND[i].home, 0.25); d.rotation.z += (Math.PI / 2 - d.rotation.z) * 0.25; }
      });
      drops.update(h, (p, d) => { p.p.addScaledVector(p.v, d); return p.p.y > T_Y + 0.03; });
      XS.forEach((x, k) => {
        const tb = tubes[k], ind = S.ind[k], pH = PH[SOLN[k]], c = ind ? colorOf(ind, pH) : null, f = clamp(S.n[k] / 3, 0, 1);
        tb.liq.material.color.set(BASE[SOLN[k]]).lerp(new THREE.Color(c ?? BASE[SOLN[k]]), f);
        if (ind && S.n[k] >= 3 && !S.logged[k]) {
          S.logged[k] = true;
          log([SOLN[k], ind === 'lit' ? '紫色石蕊溶液' : '无色酚酞溶液', word(ind, pH)]);
          status(`${SOLN[k]} + ${ind === 'lit' ? '石蕊' : '酚酞'}：${word(ind, pH).replace(/<[^>]+>/g, '')}。`);
          if (S.logged[0] && S.logged[1]) done('lit');
          if (S.logged[2] && S.logged[3]) done('ph');
          if ([0, 1, 2, 3].every((j) => S.logged[j])) W?.t1.open();
        }
        cards[k].text(`<div class="cc"><div class="cc-t"><span class="cc-name">${SOLN[k]}</span>${S.logged[k] ? `<span class="cc-res">${word(ind, pH).replace(/<[^>]+>/g, '').split('（')[0]}</span>` : ''}</div></div>`).loc(group, x, T_Y + T_LEN, 0).show(S.n[k] > 0);
      });
    };

    return {
      group: root,
      pointer,
      card: false,
      toggles: ['cards', 'steps'],
      size: { w: 0.28, d: 0.12, h: 0.13 },
      view: { elev: 18, azim: -4, lookY: 0.42, frameMargin: 1.06 },
      mount(ui) {
        ui.el.classList.add('xuean');
        const ctx = () => [...W.tbl.el.querySelectorAll('tbody tr')].map((tr) => `<div>${tr.children[0].innerHTML} + ${tr.children[1].innerHTML}：${tr.children[2].innerHTML}</div>`).join('');
        const t1 = think({ title: '想一想', ctx, status: (m) => ui.status(m),
          q: '一瓶无色溶液，滴入无色酚酞溶液不变色，滴入紫色石蕊溶液变红。它显什么性？',
          options: ['酸性', '碱性', '中性'],
          wrong: ['碱性溶液会使酚酞变红、石蕊变蓝。', '中性溶液不能使石蕊变红。'],
          ok: '对：酸性溶液使石蕊变<b>红</b>、酚酞不变色；碱性溶液使石蕊变<b>蓝</b>、酚酞变<b>红</b>。可以掀开结论看看。',
          onOk: () => { next.hidden = false; done('why'); } });
        const next = h('button', { class: 'go big-next', hidden: true, onclick: () => ui.go(2) }, '掀开课本上的结论 →');
        const tbl = table(['溶液', '指示剂', '颜色变化']);
        const more = h('details', { class: 'more' }, h('summary', {}, '更多'), buttons([{ text: '全部重来（清空记录）', ghost: true, onClick: () => A.reset() }]).el);
        const note = h('p', { class: 'fineprint', html: '说明：白醋按 pH 约 3、肥皂水按 pH 约 10 计；石蕊在 pH 5 以下红、8 以上蓝，酚酞在 pH 8.2 以上红。' });
        ui.controls.append(t1.el, next, more, note);
        ui.data.append(tbl.el);
        const dt = ui.data.previousElementSibling; if (dt?.classList.contains('bar-title')) dt.textContent = '观察记录';
        W = { tbl, t1, next, status: (m) => ui.status(m) };
        bar.attach(ui);
        ui.status('图 10-1：四支试管分成两组，每组一支白醋、一支肥皂水。左边那组滴紫色石蕊溶液，右边那组滴无色酚酞溶液。');
      },
      update(dt, t) { const k = bar.update(dt); step(Math.min(dt, 1 / 30) * k, t); },
      dispose() { bar.dispose(); drops.dispose(); },
      debug: { get S() { return S; }, A, bar, picks: { lit: droppers[0].pick, ph: droppers[1].pick },
        qa: qaFlow(drag, [
          ...[[0, 0], [0, 1], [1, 2], [1, 3]].flatMap(([i, k]) => [{ name: `拿 ${i}-${k}`, hold: droppers[i].pick }, { name: `滴 ${i}-${k}`, run: () => A.dDrag(i, overT(k)()), wait: 2.2 }, { name: `放 ${i}-${k}`, release: droppers[i].pick, wait: 0.3 }]),
          { name: '答', run: () => W.t1.el.querySelector('button').click() },
        ]) },
    };
  },
};
