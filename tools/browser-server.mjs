import { existsSync } from 'fs';
// 在沙箱外开一个常驻的浏览器服务，reviewer（例如 Codex）通过 tools/browse.mjs 连上来操作。
// 用法：node tools/browser-server.mjs   （会一直运行；地址写在 tools/.browser-ws）
import fs from 'fs';
import { createRequire } from 'module';
// playwright-core 装在 ~/.cache/livebook-tools（/tmp 会被系统定期清掉）；找不到再用 /tmp/lbshot
const PW_BASE = [`${process.env.HOME}/.cache/livebook-tools/package.json`, '/tmp/lbshot/package.json'].find((p) => existsSync(p.replace('package.json', 'node_modules/playwright-core/package.json'))) || '/tmp/lbshot/package.json';
const require = createRequire(PW_BASE);
const { chromium } = require('playwright-core');
const exe = process.env.HOME + '/Library/Caches/ms-playwright/chromium-1248/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing';
const server = await chromium.launchServer({ executablePath: exe, port: 5199, host: '127.0.0.1', wsPath: 'livebook', args: ['--use-angle=metal', '--autoplay-policy=no-user-gesture-required'] });
fs.writeFileSync(new URL('./.browser-ws', import.meta.url), server.wsEndpoint());
console.log('浏览器服务：', server.wsEndpoint());
