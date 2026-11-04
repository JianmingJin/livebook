// 导入课本 PDF。没导入时，右上角“导入课本”下面冒出一个小提示框（先闪几下）：可以导入，也可以点“不用了”，以后就不再出现。
// 文件只存在这台电脑的浏览器里（IndexedDB），不上传；导入以后书页、插图、结论原文都用这份课本。
import { PdfSource } from './PageSource.js';
import { putPdf, removePdf } from './pdfStore.js';
import { EDITIONS, DOWNLOADERS } from '../content/editions.js';

const el = (tag, attrs = {}, ...kids) => { const e = Object.assign(document.createElement(tag), attrs); for (const k of kids.flat()) if (k != null) e.append(k); return e; };
const link = (href, text) => el('a', { href, target: '_blank', rel: 'noopener', textContent: text });
const QUIET = 'lb-imp-quiet';          // 点过“不用了”：不再自动出现

export function mountImport({ content, manifest, source }) {
  const actions = document.querySelector('#hud-top .hud-actions');
  if (!actions || document.getElementById('btn-import')) return;
  const imported = source.kind === 'pdf', ed = EDITIONS[content.id];
  const pages = ed?.pages ?? manifest.pageCount;
  const short = `${(ed?.name ?? manifest.title).replace('义务教育教科书·', '')}（人教版 2024，${pages} 页）`;
  const btn = el('button', { id: 'btn-import', className: 'chip', textContent: imported ? '课本 ✓' : '导入课本', title: imported ? '用的是你导入的课本（只存在这台电脑上）' : '导入课本 PDF：只在这台电脑上用，不上传' });
  actions.append(btn);
  const copy = document.getElementById('copy');          // 页脚
  if (copy) copy.textContent = imported ? '课本页面来自你导入的教材文件，只在这台电脑上使用' : source.kind === 'placeholder' ? '教材需自行导入，本站不提供课本' : '课本页面来自本地教材文件，仅供个人学习使用';
  const input = el('input', { type: 'file', accept: 'application/pdf,.pdf', hidden: true });
  document.body.append(input);

  // 按钮下面的小提示框
  const tip = el('div', { className: 'imp-tip', hidden: true });
  document.body.append(tip);
  const place = () => { const r = btn.getBoundingClientRect(); tip.style.top = `${r.bottom + 10}px`; tip.style.right = `${Math.max(12, innerWidth - r.right)}px`; };
  addEventListener('resize', () => { if (!tip.hidden) place(); });
  const hide = () => { tip.hidden = true; tip.classList.remove('blink'); };
  const acts = (...bs) => el('div', { className: 'imp-acts' }, bs.map(([t, fn, ghost]) => el('button', { className: 'imp-btn' + (ghost ? ' ghost' : ''), textContent: t, onclick: fn })));
  const show = (blink, ...kids) => { tip.replaceChildren(...kids); place(); tip.hidden = false; tip.classList.toggle('blink', !!blink); };
  const offer = (blink) => show(blink,
    el('b', { textContent: '教材需自行导入，本站不提供课本' }),
    el('p', { textContent: `需要完整书页时，导入对应的 PDF：${short}。只在这台电脑上用，不上传。` }),
    el('p', { className: 'imp-how' }, '怎么获取：老师手里一般都有；没有的话，可以用 ', link(DOWNLOADERS.parser.url, DOWNLOADERS.parser.name), ' 从', ed ? link(ed.url, '国家中小学智慧教育平台') : '国家中小学智慧教育平台', '下载', ed?.login ? '（这一本要先登录平台）' : '', '，或者让 WorkBuddy 这类 AI 助手用下载课本的 skill 代劳。'),
    acts(['导入', () => input.click()], ['不用了', () => { localStorage.setItem(QUIET, '1'); hide(); }, true]));
  const say = (text, ...bs) => show(false, el('p', { innerHTML: text }), bs.length ? acts(...bs) : null);

  const save = async (file, n) => {
    say('正在保存到这台电脑……');
    await putPdf(content.id, { blob: file, name: file.name, size: file.size, pages: n, at: Date.now() });
    say('导入好了，正在打开……');
    setTimeout(() => location.reload(), 400);
  };
  const doImport = async (file) => {
    if (!file || !/pdf$/i.test(file.type || file.name)) return say('请选择课本的 PDF 文件。', ['重新选择', () => input.click()], ['关闭', hide, true]);
    say('正在读取……');
    let src;
    try { src = await PdfSource.open(content.id, await file.arrayBuffer()); } catch (e) { return say('这个文件打不开，换一个试试。', ['重新选择', () => input.click()], ['关闭', hide, true]); }
    const n = src.pageCount;
    if (n !== pages) return say(`这份 PDF 有 <b>${n}</b> 页，这本是 <b>${pages}</b> 页，可能不是同一版，书页会对不上。`, ['仍然使用', () => save(file, n)], ['重新选择', () => input.click(), true]);
    save(file, n);
  };

  btn.onclick = () => {
    if (!tip.hidden) return hide();
    if (!imported) return offer(false);
    show(false, el('p', { textContent: `用的是你导入的课本：${short}。只存在这台电脑上。` }),
      acts(['换一份', () => input.click()], ['移除', async () => { await removePdf(content.id); location.reload(); }, true], ['关闭', hide, true]));
  };
  input.onchange = () => { const f = input.files?.[0]; input.value = ''; doImport(f); };
  addEventListener('dragover', (e) => { if ([...(e.dataTransfer?.items || [])].some((x) => x.kind === 'file')) e.preventDefault(); });
  addEventListener('drop', (e) => { const f = [...(e.dataTransfer?.files || [])][0]; if (!f) return; e.preventDefault(); doImport(f); });
  // 没导入、也没有本地书页（线上）：进书以后冒出来、闪几下；点过“不用了”就不再自动出现
  if (source.kind === 'placeholder' && !localStorage.getItem(QUIET)) setTimeout(() => offer(true), 1200);
}
