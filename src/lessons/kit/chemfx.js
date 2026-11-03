// 化学实验的画面质感：插画式玻璃 / 水 / 气泡（边缘亮、中间透）、分层的火焰、白烟、带拖尾的火星、球棍式分子。
// 画风和其他器材一致（描边 + 平涂），这里只把“透明的东西”和“会动的现象”做得更像、更好看。
// 性能预算（作者要求不靠吃性能的特效）：不加后期、不加动态光源；着色器只多几行算术；粒子每个实验几百个以内。
import * as THREE from 'three';
import { Particles } from './fx.js';
import { canvasTex } from './props.js';

// ---------- 透明材质：菲涅尔边缘 + 插画式竖条高光 ----------
// base：正对视线处的不透明度；rim：边缘加多少；band：左上方那条竖着的高光有多亮
function fresnelPatch(mat, { base, rim, band, spot = 0, backK = 0.5, white = 0.55 }) {
  mat.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, { uBase: { value: base }, uRim: { value: rim }, uBand: { value: band }, uSpot: { value: spot }, uBack: { value: backK }, uWhite: { value: white } });
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', '#include <common>\nuniform float uBase, uRim, uBand, uSpot, uBack, uWhite;')
      .replace('#include <dithering_fragment>', `#include <dithering_fragment>
        vec3 vdir = normalize(vViewPosition);
        vec3 nn = normalize(normal);
        float fres = pow(1.0 - abs(dot(nn, vdir)), 2.2);
        float band = smoothstep(0.42, 0.62, -nn.x) * smoothstep(0.97, 0.78, -nn.x) * smoothstep(-0.6, 0.2, nn.y + 0.4);
        float spot = pow(max(0.0, dot(nn, normalize(vec3(-0.45, 0.6, 0.66)))), 40.0);
        float back = gl_FrontFacing ? 1.0 : uBack;
        vec3 col = mix(gl_FragColor.rgb, vec3(1.0), clamp(fres * uWhite + band * 0.85 + spot * uSpot, 0.0, 1.0));
        gl_FragColor = vec4(col, clamp((uBase + fres * uRim + band * uBand + spot * uSpot) * back, 0.0, 1.0));`);
  };
  mat.customProgramCacheKey = () => 'fres';
  return mat;
}

/** 玻璃（烧杯、试管、集气瓶、导管）。tint 是玻璃本身一点点的颜色。 */
export function glass2({ tint = 0xeaf6fb, base = 0.05, rim = 0.42, band = 0.5 } = {}) {
  const m = new THREE.MeshPhysicalMaterial({ color: tint, transparent: true, roughness: 0.05, metalness: 0, clearcoat: 1, side: THREE.DoubleSide, depthWrite: false });
  m.userData.see = 'glass';          // 质检用：玻璃是空心的，导管插进去、穿过塞子都不算穿模
  return fresnelPatch(m, { base, rim, band, backK: 0.45 });
}

/** 水（或溶液）。中间有颜色、边缘略亮；不画高光竖条（水是一整块）。 */
export function water2({ color = 0x7fc3e6, base = 0.34, rim = 0.28 } = {}) {
  const m = new THREE.MeshPhysicalMaterial({ color, transparent: true, roughness: 0.1, metalness: 0, side: THREE.DoubleSide, depthWrite: false });
  m.userData.see = 'liquid';         // 质检用：管子伸进水里不算穿模
  return fresnelPatch(m, { base, rim, band: 0.08, backK: 0.6, white: 0.35 });
}

/** 气泡：中间几乎透明，边缘一圈亮，左上一个小亮点。可直接用在 InstancedMesh 上。 */
export function bubble2({ color = 0xffffff, white = 0.9 } = {}) {      // 浅色液体（石灰水）里用深一点的边：bubble2({ color: 0x6f8797, white: 0.2 })
  const m = new THREE.MeshPhysicalMaterial({ color, transparent: true, roughness: 0, metalness: 0, depthWrite: false });
  return fresnelPatch(m, { base: 0.04, rim: 0.95, band: 0.0, spot: 0.9, backK: 0, white });
}

/**
 * 液体变浑浊（石灰水通入二氧化碳）：在液体里叠一层乳白色，再加一些慢慢下沉的白色小颗粒（碳酸钙沉淀）。
 * liquid：液体的网格（可以带 scale.y 表示液面高低、带 clippingPlanes——都跟着走）。液体要以 y 轴为中心。
 * 返回 { set(k), update(t) }：k = 0 澄清 … 1 很浑浊。
 */
export function milky(liquid, { n = 40, color = 0xfbfbf7, speck = 0.00045 } = {}) {
  const geo = liquid.geometry; geo.computeBoundingBox();
  const bb = geo.boundingBox, rx = (bb.max.x - bb.min.x) / 2, rz = (bb.max.z - bb.min.z) / 2;
  const clip = liquid.material.clippingPlanes || null;
  const mat = new THREE.MeshLambertMaterial({ color, transparent: true, opacity: 0, depthWrite: false }); mat.clippingPlanes = clip;
  const milk = new THREE.Mesh(geo, mat); milk.scale.set(0.97, 0.995, 0.97); milk.renderOrder = 9.6; milk.raycast = () => {};      // 画在玻璃（renderOrder 9）之后：不然玻璃的亮边会把乳白色洗掉
  liquid.add(milk);
  const sm = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.95 }); sm.clippingPlanes = clip;
  const specks = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 6, 4), sm, n); specks.count = 0; specks.raycast = () => {}; specks.frustumCulled = false; specks.renderOrder = milk.renderOrder + 0.1;
  const P = Array.from({ length: n }, () => ({ u: Math.sqrt(Math.random()) * 0.8, th: Math.random() * Math.PI * 2, y: Math.random(), ph: Math.random() * 6, s: 0.7 + Math.random() * 0.7 }));
  const m4 = new THREE.Matrix4(), v = new THREE.Vector3(), q = new THREE.Quaternion(), sc = new THREE.Vector3();
  let k = 0, added = false;
  return {
    milk, specks,
    set(x) { k = Math.max(0, Math.min(1, x)); mat.opacity = 0.86 * Math.pow(Math.min(1, k * 1.3), 0.6); },      // 浑浊以后挡住后面书页的字
    update(t) {
      if (!added && liquid.parent) { liquid.parent.add(specks); added = true; }        // 颗粒挂在液体的父级上：不跟着 scale.y 变扁
      specks.visible = liquid.visible;
      liquid.updateMatrix();
      const cnt = Math.round(n * Math.min(1, k * 1.4));
      for (let i = 0; i < cnt; i++) {
        const d = P[i], th = d.th + Math.sin(t * 0.3 + d.ph) * 0.3, yy = ((d.y - t * 0.006 * d.s) % 1 + 1) % 1;      // 慢慢往下沉
        v.set(Math.cos(th) * rx * d.u, bb.min.y + (bb.max.y - bb.min.y) * (0.04 + 0.92 * yy), Math.sin(th) * rz * d.u).applyMatrix4(liquid.matrix);
        sc.setScalar(speck * d.s); m4.compose(v, q, sc); specks.setMatrixAt(i, m4);
      }
      specks.count = cnt; specks.instanceMatrix.needsUpdate = true;
    },
  };
}

/** 水面：一圈比水亮一点的边（弯月面）加一层淡淡的面。r 是半径；返回 group（.setR(r)）。 */
export function waterSurface({ r = 0.02, color = 0xbfe6f6 } = {}) {
  const g = new THREE.Group();
  const face = new THREE.Mesh(new THREE.CircleGeometry(1, 40), new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.38, depthWrite: false, side: THREE.DoubleSide }));
  face.rotation.x = -Math.PI / 2; face.renderOrder = 8;
  const ring = new THREE.Mesh(new THREE.RingGeometry(0.9, 1, 48), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.7, depthWrite: false, side: THREE.DoubleSide }));
  ring.rotation.x = -Math.PI / 2; ring.renderOrder = 8;
  g.add(face, ring);
  g.setR = (rr) => g.scale.set(rr, 1, rr);
  g.setR(r);
  return g;
}

// ---------- 火焰：竖直朝上的公告板（始终面向镜头，但不跟着手里的木条倾斜——火苗总是往上窜） ----------
const NOISE = `
  float h21(vec2 p){ p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
  float vnoise(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
    return mix(mix(h21(i), h21(i + vec2(1, 0)), f.x), mix(h21(i + vec2(0, 1)), h21(i + vec2(1, 1)), f.x), f.y); }
  float fbm(vec2 p){ return 0.62 * vnoise(p) + 0.38 * vnoise(p * 2.03 + 7.1); }`;      // 两层噪声就够火苗晃动

/**
 * 分层火焰。w、h 是火焰的宽和高（米）；core 内焰、mid 主体、edge 外沿；blue = 底部蓝色区的多少（酒精灯、蜡烛芯旁）。
 * 和 props.flame 一样的接口：setOn(v) setSize(k) update(t)；另有 setColors({...})。
 */
export function flame2({ w = 0.012, h = 0.04, core = 0xfff8dc, mid = 0xffc24a, edge = 0xff7a22, blue = 0.0, blueColor = 0x4f86ff, alpha = 1, glow = true, glowK = 0.45, light = 0 } = {}) {      // 默认不带光源；alpha < 1 是半透明的火焰（酒精灯、氢气）
  const g = new THREE.Group();
  const geo = new THREE.PlaneGeometry(w, h, 1, 1); geo.translate(0, h / 2, 0);      // 几何体就是真实大小（实验按器材的包围盒取景）
  const uni = {
    uT: { value: 0 }, uK: { value: 1 }, uSeed: { value: Math.random() * 10 },
    uCore: { value: new THREE.Color(core) }, uMid: { value: new THREE.Color(mid) }, uEdge: { value: new THREE.Color(edge) }, uBlue: { value: new THREE.Color(blueColor) }, uBlueAmt: { value: blue }, uAlpha: { value: alpha },
  };
  const mat = new THREE.ShaderMaterial({
    uniforms: uni, transparent: true, depthWrite: false,
    vertexShader: `uniform float uK; varying vec2 vUv;
      void main(){ vUv = uv;
        vec3 c = (modelMatrix * vec4(0.0, 0.0, 0.0, 1.0)).xyz;
        float s = length(modelMatrix[0].xyz) * uK;
        vec3 toCam = normalize(vec3(cameraPosition.x - c.x, 0.0, cameraPosition.z - c.z) + 1e-5);
        vec3 right = normalize(cross(vec3(0.0, 1.0, 0.0), toCam));
        vec3 wp = c + right * position.x * s + vec3(0.0, 1.0, 0.0) * position.y * s;
        gl_Position = projectionMatrix * viewMatrix * vec4(wp, 1.0); }`,
    fragmentShader: `uniform float uT, uSeed, uBlueAmt, uAlpha; uniform vec3 uCore, uMid, uEdge, uBlue; varying vec2 vUv; ${NOISE}
      void main(){
        float y = vUv.y, x = (vUv.x - 0.5) * 2.0;
        float n = fbm(vec2(x * 1.3 + uSeed, y * 2.6 - uT * 2.8));
        float wob = (n - 0.5) * 0.55 * y * y;
        float prof = pow(max(y, 0.0), 0.42) * pow(max(1.0 - y, 0.0), 0.85) * 1.7;
        float r = abs(x + wob) / max(prof, 0.002);
        float top = smoothstep(1.0, 0.72 + 0.18 * n, y);
        float a = smoothstep(1.0, 0.62, r) * smoothstep(0.0, 0.06, y) * top;
        float inner = smoothstep(0.85, 0.05, r) * smoothstep(0.75, 0.18, y);
        vec3 col = mix(uEdge, uMid, smoothstep(0.0, 0.9, 1.0 - r));
        col = mix(col, uCore, inner * 0.9);
        float base = smoothstep(0.32, 0.02, y) * uBlueAmt;
        col = mix(col, uBlue, base * (1.0 - inner * 0.4));
        a *= 1.0 - base * 0.35;
        a *= mix(uAlpha, 1.0, inner * 0.6);        // 内焰更亮更实，外焰按 uAlpha 透明
        if (a < 0.01) discard;
        gl_FragColor = vec4(col, a);
      }`,
  });
  const body = new THREE.Mesh(geo, mat); body.renderOrder = 14; body.frustumCulled = false;
  g.add(body);
  let halo = null;
  if (glow) {
    const tex = canvasTex(128, 128, (c, W, H) => { const gr = c.createRadialGradient(W / 2, H / 2, 0, W / 2, H / 2, W / 2); gr.addColorStop(0, 'rgba(255,255,255,0.9)'); gr.addColorStop(0.35, 'rgba(255,255,255,0.28)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); c.fillStyle = gr; c.fillRect(0, 0, W, H); });
    halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, color: mid, transparent: true, opacity: glowK, depthWrite: false, blending: THREE.AdditiveBlending }));
    halo.renderOrder = 13; halo.position.y = h * 0.45; halo.scale.setScalar(h * 2.4);
    g.add(halo);
  }
  const pl = light ? new THREE.PointLight(0xffb35a, 0, 0.5, 2) : null;
  if (pl) { pl.position.y = h * 0.5; g.add(pl); }
  let on = true, k = 1, shown = 1;
  return Object.assign(g, {
    body, mat, halo,
    setOn(v) { on = v; },
    setSize(v) { k = v; },
    setColors({ core: c1, mid: c2, edge: c3, blue: b } = {}) { if (c1 != null) uni.uCore.value.setHex(c1); if (c2 != null) { uni.uMid.value.setHex(c2); halo?.material.color.setHex(c2); } if (c3 != null) uni.uEdge.value.setHex(c3); if (b != null) uni.uBlueAmt.value = b; },
    update(t) {
      shown += ((on ? k : 0) - shown) * 0.25;
      const f = 1 + Math.sin(t * 17.3) * 0.04 + Math.sin(t * 29.1 + 1.3) * 0.03;
      uni.uT.value = t; uni.uK.value = Math.max(0, shown) * f;
      g.visible = shown > 0.02;
      if (halo) { halo.material.opacity = glowK * shown; halo.scale.setScalar(h * 2.4 * Math.max(0.2, shown)); halo.position.y = h * 0.45 * shown; }
      if (pl) pl.intensity = light * shown;
    },
  });
}

// ---------- 白烟：柔软、会翻滚着散开 ----------
let _smokeTex = null;
function smokeTex() {
  if (_smokeTex) return _smokeTex;
  _smokeTex = canvasTex(128, 128, (c, W, H) => {
    c.clearRect(0, 0, W, H);
    for (let i = 0; i < 14; i++) {
      const x = W / 2 + (Math.random() - 0.5) * W * 0.36, y = H / 2 + (Math.random() - 0.5) * H * 0.36, r = W * (0.16 + Math.random() * 0.2);
      const gr = c.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, 'rgba(255,255,255,0.32)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
      c.fillStyle = gr; c.fillRect(0, 0, W, H);
    }
  });
  return _smokeTex;
}
/** 白烟（五氧化二磷、蜡烛熄灭后的烟……）。update(dt, { rate, origin, spread, up, size }) */
export function smoke2({ max = 220, color = 0xf4f4f0, opacity = 0.75 } = {}) {
  const ps = new Particles({ max, sprite: true, color });
  ps.mat.uniforms.map.value = smokeTex();
  let acc = 0;
  return {
    mesh: ps.mesh,
    update(dt, { rate = 0, origin, spread = 0.01, up = 0.05, size = 0.02, life = 3 }) {
      acc += rate * dt;
      while (acc > 1 && origin) {
        acc -= 1;
        ps.spawn({ p: origin.clone().add(new THREE.Vector3((Math.random() - 0.5) * spread, 0, (Math.random() - 0.5) * spread)), v: new THREE.Vector3((Math.random() - 0.5) * 0.012, up * (0.7 + Math.random() * 0.6), (Math.random() - 0.5) * 0.008), size, life: life * (0.8 + Math.random() * 0.4), s0: size, ph: Math.random() * 6 });
      }
      ps.update(dt, (p, d) => {
        p.p.addScaledVector(p.v, d);
        p.v.y *= 1 - d * 0.35; p.v.x += Math.sin(p.age * 2.3 + p.ph) * 0.012 * d;      // 越往上越慢、左右摆
        const k = p.age / p.life;
        p.alpha = Math.min(1, k * 5) * Math.pow(1 - k, 1.3) * opacity;
        p.size = p.s0 * (1 + k * 3.2);
      });
    },
    clear: () => ps.clear(),
    dispose: () => ps.dispose(),
  };
}

// ---------- 火星：亮点 + 速度方向上的拖尾 ----------
export class Sparks {
  constructor({ max = 500, color = 0xffe1a0, tail = 0.018 } = {}) {
    this.max = max; this.tail = tail; this.list = [];
    this.pos = new Float32Array(max * 6); this.col = new Float32Array(max * 6);
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(this.pos, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(this.col, 3));
    this.mesh = new THREE.LineSegments(geo, new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
    this.mesh.frustumCulled = false; this.mesh.raycast = () => {}; this.mesh.renderOrder = 15;
    this.c = new THREE.Color(color);
  }
  spawn(p, v, life = 0.5) { if (this.list.length < this.max) this.list.push({ p: p.clone(), v: v.clone(), age: 0, life }); }
  update(dt, gravity = 0.6) {
    let n = 0;
    for (let i = this.list.length - 1; i >= 0; i--) {
      const s = this.list[i]; s.age += dt;
      if (s.age > s.life) { this.list.splice(i, 1); continue; }
      s.v.y -= gravity * dt; s.p.addScaledVector(s.v, dt);
    }
    for (const s of this.list) {
      const k = 1 - s.age / s.life, t = this.tail / Math.max(0.05, s.v.length());
      this.pos.set([s.p.x, s.p.y, s.p.z, s.p.x - s.v.x * t, s.p.y - s.v.y * t, s.p.z - s.v.z * t], n * 6);
      this.col.set([this.c.r * k, this.c.g * k, this.c.b * k * 0.9, this.c.r * k * 0.2, this.c.g * k * 0.08, 0], n * 6);
      n++;
    }
    this.mesh.geometry.setDrawRange(0, n * 2);
    this.mesh.geometry.attributes.position.needsUpdate = true;
    this.mesh.geometry.attributes.color.needsUpdate = true;
  }
  clear() { this.list.length = 0; this.mesh.geometry.setDrawRange(0, 0); }
}

// ---------- 分子（空间填充模型，标准配色：O 红、H 白、N 蓝） ----------
const ATOM = { O: { r: 1, c: 0xe23b2e }, H: { r: 0.62, c: 0xf6f6f2 }, N: { r: 0.95, c: 0x3b67d6 } };
/** molecules({ max, unit })：unit 是氧原子半径（米）。begin() → add(kind, pos, angle) … → end()。kind: 'H2O' | 'O2' | 'H2' | 'N2' */
export function molecules({ max = 300, unit = 0.0012 } = {}) {
  const g = new THREE.Group();
  const geo = new THREE.SphereGeometry(1, 14, 10);
  const mk = (el) => { const m = new THREE.InstancedMesh(geo, new THREE.MeshStandardMaterial({ color: ATOM[el].c, roughness: 0.45, metalness: 0 }), max); m.count = 0; m.frustumCulled = false; m.raycast = () => {}; m.renderOrder = 12; g.add(m); return m; };
  const meshes = { O: mk('O'), H: mk('H'), N: mk('N') };
  const n = { O: 0, H: 0, N: 0 }, M = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3(), v = new THREE.Vector3();
  const put = (el, p) => { if (n[el] >= max) return; s.setScalar(ATOM[el].r * unit); M.compose(p, q, s); meshes[el].setMatrixAt(n[el]++, M); };
  return Object.assign(g, {
    begin() { n.O = n.H = n.N = 0; },
    add(kind, p, ang = 0) {
      const u = unit, c = Math.cos(ang), sn = Math.sin(ang);
      const off = (x, y) => v.set(p.x + (x * c - y * sn) * u, p.y + (x * sn + y * c) * u, p.z).clone();
      if (kind === 'H2O') { put('O', p.clone()); const a = THREE.MathUtils.degToRad(104.5) / 2; put('H', off(Math.sin(a) * 1.25, Math.cos(a) * 1.25)); put('H', off(-Math.sin(a) * 1.25, Math.cos(a) * 1.25)); }
      else if (kind === 'O2') { put('O', off(-0.62, 0)); put('O', off(0.62, 0)); }
      else if (kind === 'N2') { put('N', off(-0.58, 0)); put('N', off(0.58, 0)); }
      else if (kind === 'H2') { put('H', off(-0.4, 0)); put('H', off(0.4, 0)); }
    },
    end() { for (const el of ['O', 'H', 'N']) { meshes[el].count = n[el]; meshes[el].instanceMatrix.needsUpdate = true; } },
  });
}

/**
 * 试管里的液体：圆底（和试管底一样），液面是一个平的顶面——用 setLevel(y) 改高低（会重建形状，不用裁切面，所以从上面看是一整块液体，不是空碗）。
 * 浑浊：setMilk(k, color) 叠一层乳白（或别的颜色的沉淀），再加一些在液体里慢慢下沉的小颗粒；颗粒只在液面以下。
 *   const L = tubeLiquid({ R: 0.0077, yc: 0.0093, top: 0.088, color }); tube.add(L);
 *   每帧：L.setLevel(y)（试管局部坐标）；L.setColor(c)；L.setMilk(k, color, speckColor)；L.update(t)
 * R：液体半径（比试管内壁小一点）；yc：试管底那个半球的球心高度；top：液面最高能到哪。
 */
export function tubeLiquid({ R = 0.0077, yc = 0.0093, top = 0.088, color = 0xe6eef2, base = 0.55, specks = 60, speck = 0.0006 } = {}) {
  const g = new THREE.Group();
  const mat = water2({ color, base });
  const milkMat = new THREE.MeshLambertMaterial({ color: 0xffffff, emissive: 0xffffff, emissiveIntensity: 0.35, transparent: true, opacity: 0, depthWrite: false });
  const mesh = new THREE.Mesh(new THREE.BufferGeometry(), mat); mesh.renderOrder = 9.5; mesh.raycast = () => {};
  const milk = new THREE.Mesh(new THREE.BufferGeometry(), milkMat); milk.scale.set(0.96, 0.995, 0.96); milk.renderOrder = 9.6; milk.raycast = () => {};
  const sm = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.95 });
  const dots = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 6, 4), sm, specks); dots.count = 0; dots.renderOrder = 9.7; dots.raycast = () => {}; dots.frustumCulled = false;
  g.add(mesh, milk, dots);
  const P = Array.from({ length: specks }, () => ({ u: Math.sqrt(Math.random()), th: Math.random() * Math.PI * 2, y: Math.random(), ph: Math.random() * 6, s: 0.7 + Math.random() * 0.7 }));
  const m4 = new THREE.Matrix4(), v = new THREE.Vector3(), q = new THREE.Quaternion(), sc = new THREE.Vector3();
  const yb = yc - R;
  let level = -1, k = 0;
  const rAt = (y) => (y >= yc ? R : Math.sqrt(Math.max(0, R * R - (yc - y) ** 2)));
  const build = (y) => {
    const pts = [new THREE.Vector2(0.0002, yb)];
    const aTop = y >= yc ? 0 : Math.asin((y - yc) / R);
    for (let i = 1; i <= 8; i++) { const a = -Math.PI / 2 + (i / 8) * (aTop + Math.PI / 2); pts.push(new THREE.Vector2(Math.max(0.0002, Math.cos(a) * R), yc + Math.sin(a) * R)); }
    if (y > yc) pts.push(new THREE.Vector2(R, y));
    pts.push(new THREE.Vector2(0.0002, y));
    return new THREE.LatheGeometry(pts, 20);
  };
  const api = Object.assign(g, {
    mat, milk, dots,
    get level() { return level; },
    setLevel(y) {
      y = Math.min(top, y);
      const show = y > yb + 0.0004;
      mesh.visible = milk.visible = show;
      if (!show || Math.abs(y - level) < 0.00015) { if (!show) level = y; return api; }
      level = y;
      const geo = build(y); mesh.geometry.dispose(); mesh.geometry = geo; milk.geometry = geo;
      return api;
    },
    setColor(c) { mat.color.set(c); return api; },
    /** k：0 澄清 … 1 很浑浊；color：浑浊的颜色；speckColor：颗粒的颜色 */
    setMilk(kk, color = 0xffffff, speckColor = color) {
      k = Math.max(0, Math.min(1, kk));
      milkMat.opacity = 0.9 * Math.pow(Math.min(1, k * 1.25), 0.6);
      milkMat.color.set(color); milkMat.emissive.set(color);
      sm.color.set(speckColor);
      return api;
    },
    update(t) {
      const h = level - yb, cnt = level > yb + 0.0004 ? Math.round(specks * Math.min(1, k * 1.4)) : 0;
      for (let i = 0; i < cnt; i++) {
        const d = P[i], yy = ((d.y - t * 0.01 * d.s) % 1 + 1) % 1, y = yb + 0.0006 + (h - 0.0012) * yy, r = rAt(y) * 0.85 * d.u, th = d.th + Math.sin(t * 0.3 + d.ph) * 0.3;      // 慢慢往下沉
        v.set(Math.cos(th) * r, y, Math.sin(th) * r); sc.setScalar(speck * d.s); m4.compose(v, q, sc); dots.setMatrixAt(i, m4);
      }
      dots.count = cnt; dots.instanceMatrix.needsUpdate = true;
    },
    dispose() { mesh.geometry.dispose(); mat.dispose(); milkMat.dispose(); sm.dispose(); dots.geometry.dispose(); },
  });
  return api;
}
