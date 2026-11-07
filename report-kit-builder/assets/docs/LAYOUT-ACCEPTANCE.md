# 长图式布局 · 多视口自动验收

> 配套 `LAYOUT-CANVAS-ZOOM.md`（布局实现与稿高基准）。本篇只讲**怎么用 puppeteer 自动验证布局没做歪**——属于 report-kit-builder 的验收职责，**与发布平台（妙搭等）无关**。
>
> 具体项目的验收脚本实例见各项目 `08_scratch/probe_layout.cjs` / `probe_zoom_verify.cjs` / `shot_layout.cjs`，本篇是通用配方。

## 1. 何时验收

按 `LAYOUT-CANVAS-ZOOM.md` 改完 `useCanvasZoom` + 页面根/区块的 `md:min-h-[var(--stage-h)]` / `md:flex-[权重_1_auto]` / `md:min-h-[稿高]` 之后，**至少跑一次多视口回归**，确认：宽屏整屏铺满、窄屏长图滚动不挤压、移动端单列、打印页不受影响。交付前强制（见 SKILL.md 红线 #9）。

## 2. puppeteer 启动参数

本机 Chrome，必带 `--host-resolver-rules`，否则 localhost 解析不稳：

```js
const puppeteer = require('puppeteer-core');
puppeteer.launch({
  executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  headless: 'new',
  args: ['--no-sandbox', '--disable-gpu', '--disable-dev-shm-usage',
         '--host-resolver-rules=MAP localhost 127.0.0.1'],
  protocolTimeout: 120000,
});
```

> 沙箱里平台默认 9000 预览损坏时，用项目自建调试台（见妙搭技能 `local-debug.md` 的 9100/3000 方案）起预览，再用本配方逐个视口量。

## 3. 视口矩阵（至少覆盖这 5 档）

| 视口 (宽×高) | 预期 zoom | 预期行为 |
|---|---|---|
| 2560×1440 | 1 | 整屏铺满，`docHeight == innerHeight` |
| 1920×1080 | 1 | 整屏铺满 |
| 1440×780 | 1 | 长图滚动（docHeight > innerHeight），区块不压缩 |
| 1080×620 | ≈0.84 | 长图滚动 |
| 700×900（<768）或桌面 500% | 1 / stageH=0 | 走移动端单列，字号未缩 |

## 4. 四个必记的取数坑（否则量出来全是假阳性/假阴性）

1. **读 zoom 必须用 `el.style.zoom`**：`getComputedStyle(el).zoom` 在 Chrome 恒报 `1`，不可信。
2. **Layout 根选择器** = `#root > div[style*="--stage-h"]`。`#root` 第一个子元素是平台浮层，别拿它当布局根。
3. **打印页不受 zoom 影响**：`#/print-*` 在 Layout 外，验收时断言 `zoomCount == 0`（DOM 里带 `style.zoom` 的元素数应为 0）。
4. **定位元素用稳定锚点，别用会重复出现的文本**：`querySelector`/遍历找目标块时，靠唯一 class/id 或"含唯一文本的祖先容器"；**不要**用 `innerText.includes('2026-09-15')` 这类会在明细表里也出现的文本——会命中错误元素，给出"没到底部/没生效"的假阴性（示例三甲医院 2026-10-28 因此多耗数轮，最后改用 `getBoundingClientRect().top` 坐标排序证伪）。

## 5. 验收断言（每个视口）

- `docHeight`（`documentElement.scrollHeight`）与 `innerHeight` 比较：宽屏应相等（铺满）、窄屏应大于（长图）。
- **横向滚动 = 0**：`document.documentElement.scrollWidth <= innerWidth + 1`。
- **区块重叠 = 0**：相邻 section 的 `getBoundingClientRect().top` 单调不减、无交叉。
- 图表容器 `md:min-h` 在 1440×780 下实测不低于约定值（如 160px 设计稿），防止被压扁。

## 6. 典型反模式（已被本配方抓出过）

区块用 `flex-[权重_1_0]`（basis:0）+ 内层 `flex-1`（basis:0）→ 内容高度不参与父级推导，窄视口（等效 150% 缩放 1280×720）文字溢出卡片。

**修法**：区块改 `flex-[权重_1_auto]`（基宽=内容，可长不可压）+ `SectionCard` 根改 `grid grid-rows-[auto_1fr]`（1fr 行最小即内容高，能长高装下内容；有富余时自动铺满；且 1fr 是确定高度，内部 `h-full` 才解析）。

## 7. 引用

- 布局实现与稿高基准：`LAYOUT-CANVAS-ZOOM.md`（同一目录）
- 项目实例探针：`08_scratch/probe_layout.cjs`（文档高/区块高/重叠/横滚）、`probe_zoom_verify.cjs`（zoom 值/图高）、`shot_layout.cjs`（截图）
