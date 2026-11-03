// 显示偏好：观察卡片、底部步骤栏要不要显示（想要纯净的操作感时可以关掉）。存在本地，换一课还记得。
// 只对声明了 toggles 的实验生效（例如化学“燃烧的条件”）；物理课没有声明，完全不受影响。
const KEY = 'livebook.show';
const load = () => { try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch { return {}; } };
export const show = { cards: true, steps: true, ...load() };
let active = false;
export function applyShow(on = active) {
  active = on;
  document.body.classList.toggle('hide-cards', on && !show.cards);
  document.body.classList.toggle('hide-steps', on && !show.steps);
}
export function setShow(k, v) {
  show[k] = v;
  localStorage.setItem(KEY, JSON.stringify(show));
  applyShow();
}
