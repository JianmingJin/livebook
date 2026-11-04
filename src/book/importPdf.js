// 导入课本 PDF：顶栏的“导入课本”，或者把 PDF 直接拖进窗口。
// 文件只存在这台电脑的浏览器里（IndexedDB），不上传；导入以后书页、插图、结论原文都用这份课本。
import { PdfSource } from './PageSource.js';
import { putPdf, removePdf } from './pdfStore.js';

export function mountImport({ content, manifest, source }) {
  const actions = document.querySelector('#hud-top .hud-actions');
  if (!actions || document.getElementById('btn-import')) return;
  const imported = source.kind === 'pdf';
  const btn = Object.assign(document.createElement('button'), { id: 'btn-import', className: 'chip' + (source.kind === 'placeholder' ? ' chip-import' : '') });
  btn.textContent = imported ? '课本 ✓' : '导入课本';
  btn.title = imported ? '用的是你导入的课本（只存在这台电脑上）' : '导入你下载的课本 PDF：只在这台电脑上用，不上传';
  actions.append(btn);
  // 页脚：说清楚书页从哪来
  const copy = document.getElementById('copy');
  if (copy) copy.textContent = imported ? '课本页面来自你导入的教材文件，只在这台电脑上使用，仅供个人学习' : source.kind === 'placeholder' ? '书页是示意页；导入你下载的课本 PDF 后显示原书页，文件只在这台电脑上使用' : '课本页面来自本地教材文件，仅供个人学习使用';
  const input = Object.assign(document.createElement('input'), { type: 'file', accept: 'application/pdf,.pdf', hidden: true });
  document.body.append(input);

  // 小卡片：说明、进度、确认
  const pop = Object.assign(document.createElement('div'), { className: 'imp-pop', hidden: true });
  document.body.append(pop);
  const say = (html, acts = []) => {
    pop.hidden = false; pop.innerHTML = `<p>${html}</p>`;
    if (acts.length) { const row = document.createElement('div'); row.className = 'imp-acts'; for (const [t, fn, ghost] of acts) { const b = Object.assign(document.createElement('button'), { className: 'chip' + (ghost ? ' ghost' : ''), textContent: t }); b.onclick = fn; row.append(b); } pop.append(row); }
  };
  const hide = () => { pop.hidden = true; };

  const save = async (file, pages) => {
    say('正在保存到这台电脑……');
    await putPdf(content.id, { blob: file, name: file.name, size: file.size, pages, at: Date.now() });
    say('导入好了，正在打开你的课本……');
    setTimeout(() => location.reload(), 500);
  };
  const doImport = async (file) => {
    if (!file || !/pdf$/i.test(file.type || file.name)) return say('请选择课本的 PDF 文件。', [['知道了', hide, true]]);
    say(`正在读取《${file.name}》……`);
    let src;
    try { src = await PdfSource.open(content.id, await file.arrayBuffer()); } catch (e) { return say('这个文件打不开，换一个试试。', [['知道了', hide, true]]); }
    const n = src.pageCount;
    if (n !== manifest.pageCount) {
      return say(`这份 PDF 有 <b>${n}</b> 页，${manifest.title}（人教版）是 <b>${manifest.pageCount}</b> 页：可能不是同一版课本，页码和活页的位置会对不上。`, [['仍然使用', () => save(file, n)], ['取消', hide, true]]);
    }
    save(file, n);
  };

  btn.onclick = () => {
    if (!pop.hidden) return hide();
    if (imported) return say('现在用的是你导入的课本，只存在这台电脑上。', [['换一份', () => { hide(); input.click(); }], ['移除', async () => { await removePdf(content.id); location.reload(); }, true], ['关闭', hide, true]]);
    say(`导入你下载的《${manifest.title}》PDF（人教版，可以从国家中小学智慧教育平台下载）。文件只在这台电脑上用，不上传。也可以直接把 PDF 拖进窗口。`, [['选择文件', () => { hide(); input.click(); }], ['关闭', hide, true]]);
  };
  input.onchange = () => { const f = input.files?.[0]; input.value = ''; doImport(f); };
  addEventListener('dragover', (e) => { if ([...(e.dataTransfer?.items || [])].some((x) => x.kind === 'file')) e.preventDefault(); });
  addEventListener('drop', (e) => { const f = [...(e.dataTransfer?.files || [])][0]; if (!f) return; e.preventDefault(); doImport(f); });
}
