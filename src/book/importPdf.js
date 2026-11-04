// 导入课本 PDF。没导入时一打开书就弹出一个小窗：要哪一版、多少页、怎么下载；也可以从顶栏“导入课本”打开，或者直接把 PDF 拖进窗口。
// 文件只存在这台电脑的浏览器里（IndexedDB），不上传；导入以后书页、插图、结论原文都用这份课本。
import { PdfSource } from './PageSource.js';
import { putPdf, removePdf } from './pdfStore.js';
import { EDITIONS, DOWNLOADERS } from '../content/editions.js';

const el = (tag, attrs = {}, ...kids) => { const e = Object.assign(document.createElement(tag), attrs); for (const k of kids.flat()) if (k != null) e.append(k); return e; };
const link = (href, text) => el('a', { href, target: '_blank', rel: 'noopener', textContent: text });

export function mountImport({ content, manifest, source }) {
  const actions = document.querySelector('#hud-top .hud-actions');
  if (!actions || document.getElementById('btn-import')) return;
  const imported = source.kind === 'pdf', ed = EDITIONS[content.id];
  const pages = ed?.pages ?? manifest.pageCount;
  const btn = el('button', { id: 'btn-import', className: 'chip' + (source.kind === 'placeholder' ? ' chip-import' : ''), textContent: imported ? '课本 ✓' : '导入课本', title: imported ? '用的是你导入的课本（只存在这台电脑上）' : '导入你下载的课本 PDF：只在这台电脑上用，不上传' });
  actions.append(btn);
  const copy = document.getElementById('copy');          // 页脚：说清楚书页从哪来
  if (copy) copy.textContent = imported ? '课本页面来自你导入的教材文件，只在这台电脑上使用，仅供个人学习' : source.kind === 'placeholder' ? '书页是示意页；导入你下载的课本 PDF 后显示原书页，文件只在这台电脑上使用' : '课本页面来自本地教材文件，仅供个人学习使用';
  const input = el('input', { type: 'file', accept: 'application/pdf,.pdf', hidden: true });
  document.body.append(input);

  // 小窗
  const card = el('div', { className: 'imp-card' }), mask = el('div', { className: 'imp-mask', hidden: true }, card);
  document.body.append(mask);
  const close = () => { mask.hidden = true; };
  mask.addEventListener('click', (e) => { if (e.target === mask) close(); });
  const show = (...kids) => { card.replaceChildren(el('button', { className: 'imp-x', textContent: '×', title: '关闭', onclick: close }), ...kids); mask.hidden = false; };
  const acts = (...bs) => el('div', { className: 'imp-acts' }, bs.map(([t, fn, ghost]) => el('button', { className: 'imp-btn' + (ghost ? ' ghost' : ''), textContent: t, onclick: fn })));
  const bookBox = () => el('div', { className: 'imp-book' },
    el('b', { textContent: '需要这一版' }),
    el('div', { className: 'imp-name', textContent: `人教版《${ed?.name ?? manifest.title}》` }),
    el('div', { textContent: `${ed?.press ?? '人民教育出版社'} · ${ed?.rev ?? ''}` }),
    ed?.year ? el('div', { textContent: ed.year }) : null,
    el('div', { textContent: `PDF 共 ${pages} 页${ed?.isbn ? ` · ISBN ${ed.isbn}` : ''}` }));
  const guide = () => show(
    el('h3', { textContent: '导入这本课本，看到原书页' }),
    el('p', { className: 'imp-lead', textContent: '现在显示的是示意页。导入你下载的课本 PDF 以后，书页、插图、结论原文都是原书的。文件只在这台电脑上用，不上传。' }),
    bookBox(),
    el('div', { className: 'imp-how' }, el('b', { textContent: '怎么下载' }), el('ol', {},
      el('li', {}, '在国家中小学智慧教育平台找到这本书：', ed ? link(ed.url, '打开这本书的页面') : link('https://basic.smartedu.cn/tchMaterial', '打开平台的教材页面'), '。平台默认只能在线看', ed?.login ? '，这一本还要先登录（免费注册）。' : '。'),
      el('li', {}, '用下载工具存成 PDF：电脑上可以用 ', link(DOWNLOADERS.parser.url, DOWNLOADERS.parser.name), '，把上面那本书的网页地址贴进去；也可以让 AI 助手代劳，在 WorkBuddy、Claude Code 这类支持 Skills 的助手里装上 ', link(DOWNLOADERS.skill.url, DOWNLOADERS.skill.name), `，对它说“下载人教版《${ed?.name ?? manifest.title}》（${ed?.rev ?? '根据 2022 年版课程标准修订'}）”。`),
      el('li', {}, `下好以后核对一下：PDF 是 ${pages} 页。`))),
    acts(['选择 PDF 文件', () => input.click()], ['先看示意页', close, true]),
    el('p', { className: 'imp-note', textContent: '也可以直接把 PDF 拖进这个窗口。' }));
  const say = (text, ...bs) => show(el('h3', { textContent: text.title }), el('p', { className: 'imp-lead', innerHTML: text.body || '' }), bs.length ? acts(...bs) : null);

  const save = async (file, n) => {
    say({ title: '正在保存到这台电脑……' });
    await putPdf(content.id, { blob: file, name: file.name, size: file.size, pages: n, at: Date.now() });
    say({ title: '导入好了', body: '正在打开你的课本……' });
    setTimeout(() => location.reload(), 500);
  };
  const doImport = async (file) => {
    if (!file || !/pdf$/i.test(file.type || file.name)) return say({ title: '这不是 PDF', body: '请选择课本的 PDF 文件。' }, ['重新选择', () => input.click()], ['关闭', close, true]);
    say({ title: `正在读取《${file.name}》……` });
    let src;
    try { src = await PdfSource.open(content.id, await file.arrayBuffer()); } catch (e) { return say({ title: '这个文件打不开', body: '换一个试试。' }, ['重新选择', () => input.click()], ['关闭', close, true]); }
    const n = src.pageCount;
    if (n !== pages) {
      return show(el('h3', { textContent: '页数对不上' }),
        el('p', { className: 'imp-lead', innerHTML: `这份 PDF 有 <b>${n}</b> 页，要的这一版是 <b>${pages}</b> 页：可能不是同一版课本，书页和活页的位置会对不上。` }),
        bookBox(), acts(['仍然使用', () => save(file, n)], ['重新选择', () => input.click(), true], ['取消', close, true]));
    }
    save(file, n);
  };

  btn.onclick = () => {
    if (!mask.hidden) return close();
    if (!imported) return guide();
    show(el('h3', { textContent: '用的是你导入的课本' }), el('p', { className: 'imp-lead', textContent: '只存在这台电脑上。' }), bookBox(),
      acts(['换一份', () => input.click()], ['移除', async () => { await removePdf(content.id); location.reload(); }, true], ['关闭', close, true]));
  };
  input.onchange = () => { const f = input.files?.[0]; input.value = ''; doImport(f); };
  addEventListener('dragover', (e) => { if ([...(e.dataTransfer?.items || [])].some((x) => x.kind === 'file')) e.preventDefault(); });
  addEventListener('drop', (e) => { const f = [...(e.dataTransfer?.files || [])][0]; if (!f) return; e.preventDefault(); doImport(f); });
  // 没导入、也没有本地书页（线上）：打开书时先问一句（每次打开这本书问一次）
  if (source.kind === 'placeholder' && !sessionStorage.getItem(`lb-imp-${content.id}`)) { sessionStorage.setItem(`lb-imp-${content.id}`, '1'); setTimeout(guide, 900); }
}
