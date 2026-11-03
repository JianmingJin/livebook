# 配合 tools/shelfcast.mjs：每一帧的平均亮度；前后两帧亮度跳得多的标出来（白屏一闪就是一下变亮又变回去）。
# 翻页时页面露出来也会跳，要对着帧图看。用法：python3 tools/flash.py <名字>
import json, sys
from PIL import Image, ImageStat
tag = sys.argv[1] if len(sys.argv) > 1 else 'go'
meta = json.load(open(f'/tmp/lbqa/cast/{tag}.json'))
rows = []
for m in meta:
    if 'mark' in m: rows.append(('MARK', m['mark'], m['t'])); continue
    im = Image.open(m['fn']).convert('L'); st = ImageStat.Stat(im)
    # 亮度 + 画面里“接近纯白/纯米色”的比例
    w, h = im.size; px = im.resize((90, 56)).getdata(); bright = sum(1 for v in px if v > 225) / len(px)
    rows.append((m['fn'].split('/')[-1], round(st.mean[0], 1), round(bright, 3), round(m['t'], 3), m['url'].split('5188')[-1]))
prev = None
for r in rows:
    if r[0] == 'MARK': print('----', r[1], 'at', round(r[2], 2)); continue
    flag = ''
    if prev and abs(r[1] - prev[1]) > 12: flag = '  <<< 跳 %+.1f' % (r[1] - prev[1])
    print(r[0], r[1], r[2], r[3], r[4], flag)
    prev = r
