// 化学器材：试管、橡胶塞、导管、集气瓶（带玻璃片）、水槽、木条、细铁丝、药匙、棉花。
// 约定：每件器材是一个 group，局部 +y 朝上（试管、集气瓶的 +y 是从底到口）；尺寸单位和其他实验一样（米）。
import * as THREE from 'three';
import { paint, inked, hull, glassEdge } from '../../live/ink.js';
import { glowTexture } from './props.js';
import { glass2, water2, flame2, waterSurface } from './chemfx.js';

export const CHEM = { water: 0x8ccbe8, kmno4: 0x3a1640, rubber: 0x8b4a3c, wood: 0xd9b27c, iron: 0x5d636e };

/** 玻璃：边缘亮、中间透（见 chemfx.glass2）。opacity 越大玻璃越“实”（导管、带色的试剂瓶）。 */
export function glassMat({ opacity = 0.16, color = 0xffffff } = {}) {
  return glass2({ tint: color === 0xffffff ? 0xeaf6fb : color, base: opacity * 0.32, rim: 0.4 + opacity * 0.3, band: 0.5 });
}

/** 单孔试管架（镂空：底座 + 两根立柱 + 横梁上的圈），看得见试管里的液体。原点在底座中心，圈在 y = h。 */
export function tubeRack({ h = 0.07, r = 0.0105, w = 0.044, d = 0.032 } = {}) {
  const g = new THREE.Group(), m = paint(0xd9c9a6);
  const base = inked(new THREE.Mesh(new THREE.BoxGeometry(w, 0.008, d), m), { width: 0.7 }); base.position.y = 0.004;
  g.add(base);
  for (const sx of [-1, 1]) { const post = inked(new THREE.Mesh(new THREE.BoxGeometry(0.004, h - 0.006, 0.004), m), { width: 0.6 }); post.position.set(sx * (w / 2 - 0.003), 0.008 + (h - 0.006) / 2, -d / 2 + 0.004); g.add(post); }
  const bar = inked(new THREE.Mesh(new THREE.BoxGeometry(w - 0.002, 0.005, 0.005), m), { width: 0.6 }); bar.position.set(0, h, -d / 2 + 0.004); g.add(bar);
  const ring = hull(new THREE.Mesh(new THREE.TorusGeometry(r, 0.0014, 6, 24), paint(0xb9a77f)), 0.0004); ring.rotation.x = Math.PI / 2; ring.position.y = h; g.add(ring);
  const arm = inked(new THREE.Mesh(new THREE.BoxGeometry(0.004, 0.003, d / 2 - 0.004 - r), m), { width: 0.5 }); arm.position.set(0, h, -d / 2 + 0.004 + (d / 2 - 0.004 - r) / 2); g.add(arm);
  return g;
}

/** 试管：底在 y = 0，口在 y = len。返回 group：.mouth（口的局部坐标）、.r 内半径、.setPowder(m, color)、.cotton、.liquid(h, color) */
export function testTube({ r = 0.0085, len = 0.15, wall = 0.0008 } = {}) {
  const g = new THREE.Group();
  const pts = [];
  for (let i = 0; i <= 12; i++) { const a = -Math.PI / 2 + (i / 12) * (Math.PI / 2); pts.push(new THREE.Vector2(Math.max(0.0003, Math.cos(a) * (r + wall)), r + wall + Math.sin(a) * (r + wall))); }
  pts.push(new THREE.Vector2(r + wall, len - 0.002), new THREE.Vector2(r + wall + 0.0012, len), new THREE.Vector2(r, len));
  const glass = new THREE.Mesh(new THREE.LatheGeometry(pts, 32), glassMat());
  glass.renderOrder = 9; glassEdge(glass, 0.0006);
  g.add(glass);
  // 粉末：试管底部一小堆（可调多少）
  const powder = new THREE.Mesh(new THREE.SphereGeometry(r * 0.92, 18, 10, 0, Math.PI * 2, Math.PI * 0.45, Math.PI * 0.55), paint(CHEM.kmno4, { unique: true }));
  powder.position.y = r + wall; powder.visible = false;
  g.add(powder);
  // 棉花：试管口里一团
  const cotton = cottonBall(r * 0.62); cotton.scale.set(1, 1.6, 1); cotton.position.y = len - 0.017; cotton.visible = false;
  g.add(cotton);
  // 管内的水珠（冷凝水）
  const drops = new THREE.Group(); g.add(drops);
  for (let i = 0; i < 6; i++) { const d = new THREE.Mesh(new THREE.SphereGeometry(0.0012, 8, 6), paint(0xbfe6f6, { unique: true, transparent: true, opacity: 0.85 })); d.visible = false; drops.add(d); }
  // 裂纹（炸裂时出现）
  const crack = new THREE.Group(); crack.visible = false; g.add(crack);
  // 裂纹画成细管而不是 1 像素的线：远看、缩小成动图也看得出试管裂了
  const cm = new THREE.MeshBasicMaterial({ color: 0x24303f });
  for (let k = 0; k < 4; k++) {
    const a = (k / 4) * Math.PI * 2 + 0.3, pts2 = [];
    let y = r * 0.6, ang = a;
    for (let i = 0; i < 6; i++) { pts2.push(new THREE.Vector3(Math.cos(ang) * (r + wall + 0.0002), y, Math.sin(ang) * (r + wall + 0.0002))); y += 0.004 + Math.random() * 0.004; ang += (Math.random() - 0.5) * 0.6; }
    crack.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts2, false, 'catmullrom', 0.1), 20, 0.0003, 4, false), cm));
  }
  Object.assign(g, {
    glass, powder, cotton, drops, crack, r, len,
    mouth: new THREE.Vector3(0, len, 0),
    setPowder(m, color) { powder.visible = m > 0.01; powder.scale.set(1, Math.max(0.2, m), 1); if (color != null) powder.material.color.setHex(color); },
  });
  return g;
}

/** 一团棉花：几个小球挤在一起，蓬松的样子。 */
export function cottonBall(r = 0.008) {
  const g = new THREE.Group(), m = paint(0xfbfbf6, { unique: true });
  const pts = [[0, 0, 0, 1], [0.55, 0.2, 0.1, 0.7], [-0.5, 0.15, -0.15, 0.72], [0.1, 0.45, -0.35, 0.62], [-0.15, -0.2, 0.45, 0.66], [0.35, -0.3, -0.3, 0.58]];
  for (const [x, y, z, k] of pts) { const b = new THREE.Mesh(new THREE.IcosahedronGeometry(r * k, 1), m); b.position.set(x * r, y * r, z * r); g.add(b); }
  return g;
}

/** 试管夹（铁架台上的双爪夹）：两片弯爪夹住管子，爪内衬软木，侧面一个蝶形螺丝。局部 y 轴 = 试管轴。 */
export function tubeClamp(r = 0.0095) {
  const g = new THREE.Group();
  const metal = paint(0x8a929e), cork = paint(0xb88a5a);
  for (const s of [1, -1]) {
    // 弯爪：先把圆弧放平到“绕试管轴”的平面里，再转到前、后两侧
    const side = new THREE.Group(); side.rotation.y = s > 0 ? 0 : Math.PI;
    const prong = hull(new THREE.Mesh(new THREE.TorusGeometry(r + 0.0022, 0.0016, 6, 18, Math.PI * 0.75), metal), 0.0006);
    prong.rotation.x = Math.PI / 2; prong.rotation.z = Math.PI * 0.125;      // 圆弧从 22° 到 158°：包住前（后）半边
    const pad = new THREE.Mesh(new THREE.BoxGeometry(0.005, 0.009, 0.0025), cork);
    pad.position.set(0, 0, r + 0.0008);
    side.add(prong, pad); g.add(side);
  }
  const bolt = inked(new THREE.Mesh(new THREE.CylinderGeometry(0.0013, 0.0013, 0.016, 8), metal), { width: 0.6 });
  bolt.rotation.x = Math.PI / 2; bolt.position.set(-r - 0.004, 0, 0);
  const wing = inked(new THREE.Mesh(new THREE.BoxGeometry(0.0016, 0.007, 0.012), metal), { width: 0.6 });
  wing.position.set(-r - 0.004, 0, -0.012);
  g.add(bolt, wing);
  return g;
}

/** 升降台：上下两块板，中间剪刀式的支架。 */
export function labJack({ w = 0.075, d = 0.05, h = 0.028 } = {}) {
  const g = new THREE.Group();
  const plate = paint(0xa7afbb), arm = paint(0x6f7784);
  const top = inked(new THREE.Mesh(new THREE.BoxGeometry(w, 0.0035, d), plate), { width: 0.8 }); top.position.y = h - 0.00175;
  const bot = inked(new THREE.Mesh(new THREE.BoxGeometry(w, 0.0035, d), plate), { width: 0.8 }); bot.position.y = 0.00175;
  g.add(top, bot);
  const len = Math.hypot(w * 0.8, h - 0.007), ang = Math.atan2(h - 0.007, w * 0.8);
  for (const z of [d / 2 - 0.004, -d / 2 + 0.004]) for (const s of [1, -1]) {
    const a = inked(new THREE.Mesh(new THREE.BoxGeometry(len, 0.0022, 0.0022), arm), { width: 0.5 });
    a.position.set(0, h / 2, z); a.rotation.z = s * ang; g.add(a);
  }
  const screw = inked(new THREE.Mesh(new THREE.CylinderGeometry(0.0015, 0.0015, w + 0.012, 8), arm), { width: 0.5 });
  screw.rotation.z = Math.PI / 2; screw.position.y = h / 2; g.add(screw);
  const knob = inked(new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.004, 0.004, 14), paint(0x2c3140)), { width: 0.6 });
  knob.rotation.z = Math.PI / 2; knob.position.set(w / 2 + 0.008, h / 2, 0); g.add(knob);
  return g;
}

/** 单孔橡胶塞（小头朝 −y）。 */
export function stopper({ r1 = 0.0085, r2 = 0.0105, h = 0.018 } = {}) {
  const m = inked(new THREE.Mesh(new THREE.CylinderGeometry(r2, r1, h, 20), paint(CHEM.rubber)), { width: 1 });
  m.geometry.translate(0, h / 2, 0);
  return m;
}

/** 玻璃导管：沿一串点（局部坐标）的细管。返回 mesh；.curve 是中心线。 */
export function glassTube(points, { r = 0.0022 } = {}) {
  const curve = new THREE.CatmullRomCurve3(points, false, 'centripetal', 0.2);
  const mesh = new THREE.Mesh(new THREE.TubeGeometry(curve, Math.max(24, points.length * 16), r, 10, false), glassMat({ opacity: 0.28 }));
  mesh.renderOrder = 9; glassEdge(mesh, 0.0005);
  mesh.curve = curve;
  return mesh;
}

/** 乳胶管（不透明，棕黄色）。 */
// 坩埚钳：两根钢条在销轴处交叉，钳口弯成弧形夹住东西。钳口中心在原点，钳柄朝 +x
export function crucibleTongs({ len = 0.118 } = {}) {
  const g = new THREE.Group(), metal = paint(0x8a929e);
  for (const s of [1, -1]) {
    const pts = [[len, s * 0.0075], [len * 0.6, s * 0.0042], [0.03, s * 0.0013], [0.022, 0], [0.014, -s * 0.004], [0.006, -s * 0.0086], [-0.002, -s * 0.008], [-0.0072, -s * 0.0042]]
      .map(([x, z]) => new THREE.Vector3(x, s * 0.0011, z));
    const arm = hull(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 48, 0.0012, 6), metal), 0.0005);
    const end = new THREE.Mesh(new THREE.SphereGeometry(0.0019, 10, 8), metal); end.position.copy(pts[0]); end.scale.set(1.6, 0.7, 1);
    g.add(arm, end);
  }
  const pin = inked(new THREE.Mesh(new THREE.CylinderGeometry(0.0022, 0.0022, 0.0046, 12), paint(0x6d747e)), { width: 0.6 }); pin.position.x = 0.022;
  g.add(pin);
  return g;
}

export function rubberTube(points, { r = 0.0032 } = {}) {
  const curve = new THREE.CatmullRomCurve3(points, false, 'centripetal', 0.3);
  const mesh = hull(new THREE.Mesh(new THREE.TubeGeometry(curve, 40, r, 10, false), paint(0xc98a4a)), 0.0007);
  mesh.curve = curve;
  return mesh;
}

/**
 * 集气瓶：底在 y = 0，口在 y = h。.setWater(f) 瓶里水占的比例（0–1，从口那一端算起，适合倒立在水槽里）；
 * .plate 玻璃片；.gas 里有多少气体由实验自己算。
 */
export function gasJar({ r = 0.021, h = 0.08 } = {}) {
  const g = new THREE.Group();
  const neck = r * 0.72;
  const pts = [new THREE.Vector2(0.0003, 0), new THREE.Vector2(r, 0), new THREE.Vector2(r + 0.0012, 0.002), new THREE.Vector2(r + 0.0012, h * 0.78),
    new THREE.Vector2(neck + 0.0012, h * 0.9), new THREE.Vector2(neck + 0.0012, h - 0.0015), new THREE.Vector2(neck + 0.004, h), new THREE.Vector2(neck, h)];
  const glass = new THREE.Mesh(new THREE.LatheGeometry(pts, 36), glassMat({ opacity: 0.15 })); glass.geometry.translate(0, 0.0006, 0);
  glass.renderOrder = 9; glassEdge(glass, 0.0007);
  const ip = [new THREE.Vector2(0.0003, 0.0015), new THREE.Vector2(r - 0.0004, 0.0015), new THREE.Vector2(r - 0.0004, h * 0.78), new THREE.Vector2(neck - 0.0004, h * 0.9), new THREE.Vector2(neck - 0.0004, h - 0.001), new THREE.Vector2(0.0003, h - 0.001)];
  const cut = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);      // 世界坐标里的水面（实验每帧更新）
  const wm = water2({ color: CHEM.water }); wm.clippingPlanes = [cut];
  const water = new THREE.Mesh(new THREE.LatheGeometry(ip, 36), wm);
  water.renderOrder = 7;
  const plate = inked(new THREE.Mesh(new THREE.BoxGeometry(neck * 2 + 0.016, 0.0018, neck * 2 + 0.016), glass2({ base: 0.18, rim: 0.5, band: 0.3 })), { width: 0.6, color: 0x5d7f95, opacity: 0.5 });      // 玻璃片
  plate.renderOrder = 10;
  plate.position.y = h + 0.0009;
  const pick = new THREE.Mesh(new THREE.CylinderGeometry(r + 0.004, r + 0.004, h + 0.01, 12), new THREE.MeshBasicMaterial({ visible: false }));
  pick.position.y = h / 2; pick.userData.pick = true;
  g.add(glass, water, plate, pick);
  const vol = Math.PI * r * r * h * 0.92;       // 内容积（米³），只用于比例
  Object.assign(g, {
    glass, water, plate, pick, cut, r, h, neck, vol,
    mouth: new THREE.Vector3(0, h, 0),
    /** f：瓶里水占容积的比例。正放时水在下面，倒立时水在口那一端——统一用“世界里的水面高度”切出来。 */
    setWater(f) {
      water.visible = f > 0.003;
      g.updateMatrixWorld(true);
      const a = g.localToWorld(new THREE.Vector3(0, 0, 0)), b = g.localToWorld(new THREE.Vector3(0, h, 0));
      const down = a.y < b.y ? a : b, up = a.y < b.y ? b : a;
      cut.normal.set(0, -1, 0); cut.constant = down.y + (up.y - down.y) * Math.min(1, f);   // 切掉高于水面的部分
    },
  });
  return g;
}

/** 水槽：长方形玻璃槽，水面在 y = level。 */
export function trough({ w = 0.17, d = 0.11, h = 0.065, level = 0.05 } = {}) {
  const g = new THREE.Group();
  const box = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), glassMat({ opacity: 0.12 }));
  box.geometry.translate(0, h / 2, 0); box.renderOrder = 6; glassEdge(box, 0.0008);
  const water = new THREE.Mesh(new THREE.BoxGeometry(w - 0.004, 1, d - 0.004), water2({ color: CHEM.water, base: 0.26, rim: 0.2 }));
  water.geometry.translate(0, 0.5, 0); water.position.y = 0.002; water.scale.y = level - 0.002; water.renderOrder = 5;
  g.add(box, water);
  Object.assign(g, { box, water, w, d, h, level, setColor(hex) { water.material.color.setHex(hex); } });
  return g;
}

/** 木条：一端带火星 / 火焰。.setState('none' | 'ember' | 'flame', k) */
export function splint({ len = 0.13 } = {}) {
  const g = new THREE.Group();
  const stick = inked(new THREE.Mesh(new THREE.BoxGeometry(0.004, len, 0.004), paint(CHEM.wood)), { width: 0.8 });
  stick.position.y = len / 2;
  const tip = new THREE.Mesh(new THREE.BoxGeometry(0.0046, 0.008, 0.0046), paint(0x3b2a20, { unique: true, keep: true }));      // keep：纸本画风下也保留火星的红
  tip.position.y = 0.004;
  const ember = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture(), color: 0xff5a1f, transparent: true, opacity: 0, depthWrite: false }));      // 普通混合：叠加混合在浅色纸面上看不见
  ember.scale.set(0.02, 0.02, 1); ember.position.y = 0.003;
  const f = flame2({ w: 0.009, h: 0.03, blue: 0.25 }); f.position.y = 0.004; f.setOn(false);      // 火苗总是朝上（不随木条倾斜）
  g.add(stick, tip, ember, f);
  let state = 'none', k = 0;
  Object.assign(g, {
    stick, tip, ember, flame: f, len,
    setState(s, kk = 1) { state = s; k = kk; },
    update(t) {
      const glow = state === 'ember' ? 0.5 + 0.35 * k + Math.sin(t * 9) * 0.08 : state === 'flame' ? 0.6 : 0;
      ember.material.opacity = glow; ember.scale.setScalar(0.014 + 0.014 * (state === 'ember' ? k : 0.6));
      tip.material.color.setHex(state === 'none' ? 0x3b2a20 : 0xc8461e);
      f.setOn(state === 'flame'); f.setSize(0.75 + 0.45 * k); f.update(t);
    },
  });
  return g;
}

/** 螺旋状细铁丝（下端系一根火柴）。下端在 y = 0。 */
export function ironWire({ turns = 6, r = 0.005, h = 0.028, len = 0.09 } = {}) {
  const g = new THREE.Group();
  const pts = [];
  for (let i = 0; i <= turns * 16; i++) { const a = (i / 16) * Math.PI * 2; pts.push(new THREE.Vector3(Math.cos(a) * r, 0.006 + (i / (turns * 16)) * h, Math.sin(a) * r)); }
  pts.push(new THREE.Vector3(0, 0.006 + h + 0.004, 0), new THREE.Vector3(0, len, 0));
  const wire = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 260, 0.0006, 6, false), paint(CHEM.iron, { unique: true }));
  const match = inked(new THREE.Mesh(new THREE.BoxGeometry(0.0022, 0.016, 0.0022), paint(0xe8d3a8)), { width: 0.7 });
  match.position.y = -0.002;
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.0018, 8, 6), paint(0xb3392b, { unique: true })); head.position.y = -0.010;
  const f = flame2({ w: 0.006, h: 0.02 }); f.position.y = -0.012; f.setOn(false);
  const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture(), color: 0xffd27a, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending }));
  glow.scale.set(0.05, 0.05, 1); glow.position.y = 0.016;
  g.add(wire, match, head, f, glow);
  Object.assign(g, { wire, match, head, flame: f, glow });
  return g;
}

/** 药匙（勺里可以有一小撮粉末）。勺头在 y = 0 附近，柄朝 +x。 */
export function spatula({ color = CHEM.kmno4 } = {}) {
  const g = new THREE.Group();
  const handle = inked(new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.0025, 0.007), paint(0xd7dbe0)), { width: 0.8 });
  handle.position.x = 0.058;
  const bowl = new THREE.Mesh(new THREE.SphereGeometry(0.007, 14, 8, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), paint(0xd7dbe0, { side: THREE.DoubleSide }));
  bowl.scale.set(1.3, 0.6, 1);
  const heap = new THREE.Mesh(new THREE.SphereGeometry(0.0055, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2), paint(color, { unique: true }));
  heap.scale.set(1.3, 0.6, 1);
  g.add(handle, bowl, heap);
  Object.assign(g, { heap });
  return g;
}

/** 广口试剂瓶（装固体）。 */
export function reagentBottle({ r = 0.018, h = 0.045, color = CHEM.kmno4, label = '' } = {}) {
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.CylinderGeometry(r, r, h, 24), glassMat({ opacity: 0.22, color: 0xa9774f }));
  body.position.y = h / 2; body.renderOrder = 8; glassEdge(body, 0.0007);
  const stuff = new THREE.Mesh(new THREE.CylinderGeometry(r - 0.002, r - 0.002, h * 0.45, 20), paint(color));
  stuff.position.y = h * 0.24;
  const cap = inked(new THREE.Mesh(new THREE.CylinderGeometry(r * 0.75, r * 0.75, 0.008, 20), paint(0x3d4352)), { width: 0.8 });
  cap.position.y = h + 0.004;
  g.add(body, stuff, cap);
  g.label = label;
  return g;
}

/**
 * 酒精灯（化学用）：玻璃灯身里装着酒精，瓷质灯芯管，灯帽。火焰分外焰、内焰、焰心，底部略带蓝色；不带光源。
 * 和 props.alcoholLamp 一样的用法：.flame 控制火焰；灯帽由实验自己摆。
 */
export function chemLamp() {
  const g = new THREE.Group();
  const pts = [new THREE.Vector2(0.0003, 0), new THREE.Vector2(0.03, 0), new THREE.Vector2(0.035, 0.008), new THREE.Vector2(0.036, 0.022), new THREE.Vector2(0.031, 0.038), new THREE.Vector2(0.016, 0.048), new THREE.Vector2(0.011, 0.05), new THREE.Vector2(0.011, 0.056)];
  const body = new THREE.Mesh(new THREE.LatheGeometry(pts, 40), glass2({ tint: 0xeaf6fb, base: 0.08, rim: 0.5, band: 0.6 })); body.geometry.translate(0, 0.0006, 0);
  body.renderOrder = 9;
  const fuel = new THREE.Mesh(new THREE.CylinderGeometry(0.0335, 0.03, 0.02, 32), water2({ color: 0xd8eef5, base: 0.4, rim: 0.2 }));
  fuel.position.y = 0.011; fuel.renderOrder = 7;
  const collar = inked(new THREE.Mesh(new THREE.CylinderGeometry(0.0115, 0.0125, 0.008, 20), paint(0xe9ecef)), { width: 0.8 });
  collar.position.y = 0.058;
  const tubeW = inked(new THREE.Mesh(new THREE.CylinderGeometry(0.0045, 0.0045, 0.012, 14), paint(0xd9dde2)), { width: 0.7 });
  tubeW.position.y = 0.067;
  const wick = new THREE.Mesh(new THREE.CylinderGeometry(0.0022, 0.0026, 0.006, 8), paint(0xf2ede2, { unique: true }));
  wick.position.y = 0.075;
  const f = flame2({ w: 0.014, h: 0.046, core: 0xf2f6ff, mid: 0xffdc8a, edge: 0xffa24a, blue: 0.85, blueColor: 0x5b8cff, alpha: 0.55, glowK: 0.22 });     // 酒精灯火焰：淡、半透明，底部偏蓝
  f.position.y = 0.076;
  g.add(body, fuel, collar, tubeW, wick, f);
  g.flame = f; g.wick = wick;
  return g;
}

/** 烧杯（化学用）：玻璃杯身带倾倒嘴、刻度线，杯里的水带弯月面。底在 y = 0。.setLevel(h) .setColor(hex) */
export function chemBeaker({ r = 0.042, h = 0.12, level = 0.07, color = CHEM.water, marks = true } = {}) {
  const g = new THREE.Group();
  const pts = [new THREE.Vector2(0.0003, 0), new THREE.Vector2(r - 0.002, 0), new THREE.Vector2(r, 0.003), new THREE.Vector2(r, h - 0.002), new THREE.Vector2(r + 0.0018, h)];
  const body = new THREE.Mesh(new THREE.LatheGeometry(pts, 48), glass2({ base: 0.05, rim: 0.42, band: 0.55 })); body.geometry.translate(0, 0.0006, 0);
  body.renderOrder = 9;
  // 倾倒嘴：杯口一侧向外翻的一小段
  const lip = new THREE.Mesh(new THREE.TorusGeometry(0.006, 0.0012, 6, 12, Math.PI), glass2({ base: 0.12, rim: 0.5, band: 0.3 }));
  lip.position.set(-r - 0.003, h - 0.001, 0); lip.rotation.set(0, Math.PI / 2, 0);
  g.add(body, lip);
  if (marks) {
    const tick = new THREE.LineBasicMaterial({ color: 0x9fb4c2, transparent: true, opacity: 0.8 });
    for (let k = 1; k <= 4; k++) {
      const y = (h * 0.85 * k) / 4, a0 = -0.5, a1 = 0.1;
      const pts2 = []; for (let i = 0; i <= 8; i++) { const a = a0 + ((a1 - a0) * i) / 8; pts2.push(new THREE.Vector3(Math.sin(a) * (r + 0.0004), y, Math.cos(a) * (r + 0.0004))); }
      g.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts2), tick));
    }
  }
  const liq = new THREE.Mesh(new THREE.CylinderGeometry(r - 0.0012, r - 0.0012, 1, 40), water2({ color }));
  liq.geometry.translate(0, 0.5, 0); liq.position.y = 0.0012; liq.renderOrder = 7;
  const surf = waterSurface({ r: r - 0.0012 }); surf.renderOrder = 8;
  g.add(liq, surf);
  Object.assign(g, {
    body, liq, surf, r, h,
    setLevel(l) { liq.visible = surf.visible = l > 0.002; liq.scale.y = Math.max(0.001, l - 0.0012); surf.position.y = l; },
    setColor(hex) { liq.material.color.setHex(hex); },
  });
  g.setLevel(level);
  return g;
}

/** 蜡烛（化学用）：烛身、烛芯、火焰（不带光源）。.flame 控制火焰。 */
export function chemCandle({ height = 0.05, r = 0.008 } = {}) {
  const g = new THREE.Group();
  const body = hull(new THREE.Mesh(new THREE.CylinderGeometry(r, r, height, 22), paint(0xf6ecd6)), 0.0012);
  body.position.y = height / 2;
  const pool = new THREE.Mesh(new THREE.CircleGeometry(r * 0.75, 18), paint(0xf9f1de, { unique: true })); pool.rotation.x = -Math.PI / 2; pool.position.y = height + 0.0003;
  const wick = new THREE.Mesh(new THREE.CylinderGeometry(0.0006, 0.0007, 0.006, 6), paint(0x2b2420)); wick.position.y = height + 0.003;
  const f = flame2({ w: 0.009, h: 0.03, core: 0xfffbe8, mid: 0xffcf5a, edge: 0xff8f2e, blue: 0.35, glowK: 0.3 });
  f.position.y = height + 0.002;
  g.add(body, pool, wick, f);
  g.flame = f; g.top = height;
  return g;
}
