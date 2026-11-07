# 页面布局自适应规范：固定设计稿 + 整页 zoom + 竖向铺满

> **2026-10-27 定稿**（示例食品厂项目三轮返工实测沉淀）。
> 适用：所有「报告/看板/报表查询」类页面的**桌面端**布局。移动端（<768）不受本规范约束，走原生响应式。
> 与 `UI-FOUNDATION.md` 第 8 节「布局系统」配套：本文件解决**分辨率/缩放自适应**，UI-FOUNDATION 解决**容器宽与风格尺度**。

---

## 0. 先认清三种症状与三个反模式

用户只会描述现象，必须能反推出写错了什么。**以下三种写法全部禁止再用于新项目。**

| 用户说法 | 真实根因 | ❌ 反模式（禁止） |
|---|---|---|
| 「150% 缩放卡片挤在一起 / 压扁了」 | 区块高度按比例瓜分**视口高度**，视口一矮就被压 | **A. 一屏塞满比例分摊**：`h-[calc(100vh-x)]` + `overflow-hidden` + 子块 `flex-[0.95_1_0]` / `[4.5_1_0]` / `[0.3_1_0]`。视口 780px 高时「运行分析」只能分到约 38px |
| 「高分辨率底部留白很多」 | 区块高度写死，不随视口长高 | **B. 纯固定高度长图**：区块 `md:h-[215px]` 之类写死，2K 屏内容撑不满，底部空一大片 |
| 「放大后表格把图表压成一条缝」 | min-h 只能保护区块，**保护不了区块内部**的内容（表格 13 行固定 430px，图表被挤到 50px） | **C. 只加 min-h 的弹性布局**：`flex-[x_1_0]` + `md:min-h-[560px]`，窄视口下内部仍会挤压、甚至元素重叠 |

**核心认知**：只要区块高度**依赖视口高度**（比例分摊 / flex-grow 瓜分），就一定会在某个缩放级别挤压；只要高度**完全写死**，就一定会在某个分辨率留白。唯一解是——**设计稿尺寸固定不变，用 CSS zoom 整体等比缩放**。

---

## 1. 方案：三段式（横向缩放 · 竖向铺满 · 矮屏滚动）

1. **横向（不横铺）**：`zoom = clamp(视口宽 / DESIGN_WIDTH, MIN_ZOOM, MAX_ZOOM)`，`MAX_ZOOM = 1`——只缩不放。宽屏保持设计宽度居中、两侧留白；窗口变窄（系统缩放 150%/200%、浏览器 Ctrl+）时整页等比缩小，**布局比例恒定、内部永不挤压**。
2. **竖向（铺满）**：`--stage-h = round(视口高 / zoom) - NAV_H`，挂在**页面根容器**（工具条 + 内容一起算），内容区 `flex-1` 自动吃掉工具条以下的全部剩余高度——各页工具条高矮不同由 flexbox 消化，**不需要估算常量**。
3. **区块（矮屏滚动）**：`md:flex-[ratio_1_0]` + `md:min-h-[设计稿高]`。视口高 → 按比例长高铺满；视口矮 → 落到设计稿最小高度就不再压缩，整页改为「像长图一样」纵向滚动。

数学性质：浏览器缩放 s 倍时净字号 = 设计字号 × 物理宽 / (系统缩放 × DESIGN_WIDTH)，**与 s 无关** → Ctrl± 不再引发任何重排。

---

## 2. 代码骨架（可直接拷）

### 2.1 hook：`useCanvasZoom.ts`

```ts
import { useEffect, useState } from 'react';

/** 设计稿宽度 = 容器最大宽 + 40（页面左右留白）。★项目容器改宽时必须同步改这里 */
const DESIGN_WIDTH = 1280;
/** 低于该宽度视为移动端，禁用等比缩放（走原生响应式样式） */
const MOBILE_BREAKPOINT = 768;
/** 最大缩放：宽屏不放大，内容居中不横铺。★想让宽屏再大点就 1.1/1.2；保持不铺满留 1 */
const MAX_ZOOM = 1;
/** 最小缩放：极端放大时保底，避免文字小到看不清 */
const MIN_ZOOM = 0.62;
/** 顶部导航在设计稿坐标系里的总占位（h-9=36 + 下边框 1） */
const NAV_H = 37;

export interface CanvasZoom { zoom: number; stageH: number }

export function useCanvasZoom(): CanvasZoom {
  const calc = (): CanvasZoom => {
    const w = window.innerWidth;
    const h = window.innerHeight;
    if (w < MOBILE_BREAKPOINT) return { zoom: 1, stageH: 0 };
    const zoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, w / DESIGN_WIDTH));
    const stageH = Math.max(0, Math.round(h / zoom) - NAV_H);
    return { zoom, stageH };
  };
  const [val, setVal] = useState<CanvasZoom>(calc);
  useEffect(() => {
    const onResize = (): void => setVal(calc());
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);
  return val;
}
```

### 2.2 Layout 根节点（下发 zoom 与 --stage-h）

```tsx
const { zoom, stageH }: CanvasZoom = useCanvasZoom();
const stageStyle = { zoom, '--stage-h': `${stageH}px` } as React.CSSProperties;
return (
  <div className="min-h-screen w-full bg-rk-bg-soft text-rk-ink" style={stageStyle}>
    <nav … />
    <Outlet />
  </div>
);
```

### 2.3 页面层（两处必改）

```tsx
// ① 页面根容器（工具条 + 内容）：竖向铺满的基准
<div className="flex w-full flex-col text-sm text-rk-ink md:min-h-[var(--stage-h)]">
  <ReportTopbar … />
  {/* ② 内容区 flex-1：自动吃掉工具条以下全部剩余 */}
  <main className="mx-auto flex w-full min-w-0 max-w-[1240px] flex-1 flex-col gap-3 px-6 pt-3 pb-4">
    {/* ③ 区块：按比例 grow + 设计稿 min-h 兜底 */}
    <div className="shrink-0 md:min-h-[220px] md:flex-[0.95_1_0]">…</div>
    <div className="shrink-0 md:min-h-[760px] md:flex-[4.5_1_0]">…</div>
    <div className="shrink-0 md:min-h-[64px]  md:flex-[0.3_1_0]">…</div>
  </main>
</div>
```

> 表格型页面（报表查询）同理：根容器 `md:min-h-[var(--stage-h)]`，**tab 面板补 `md:min-h-0 md:flex-1`**，卡片 `md:min-h-[420px] md:flex-1`（卡片内部表格滚动、sticky 表头保留）。

---

## 3. 参数表（改布局只改这几个数）

| 参数 | 默认 | 作用 / 调错会怎样 |
|---|---|---|
| `DESIGN_WIDTH` | 1280（容器 1240+40） | 缩放基准。与页面容器 `max-w` 必须配套；容器改成 1080 就设 1120 |
| `MAX_ZOOM` | 1 | 宽屏放大上限。>1 会横屏铺满、卡片被拉宽（用户明确不接受） |
| `MIN_ZOOM` | 0.62 | 极端放大时的字号保底，再窄就横向留白不再缩 |
| `NAV_H` | 37 | 导航占位。只扣导航，**工具条高度不要自己算**（由 flex-1 消化） |
| 区块 `md:min-h-[…]` | 设计稿实测值 | 矮屏开始滚动的阈值。调小 = 更晚才滚动（但过小会回到「挤压」） |

---

## 4. 断链坑（已踩，逐条核对）

1. **`--stage-h` 必须挂页面根容器，不能挂 `<main>`**：挂 main 时若按估算常量扣减，差额会被 Layout 根的 `min-h-screen` 静默吃掉 → 内容底部出现几十 px 空白、怎么都够不到底（示例食品厂 11:40 实测修掉）。
2. **卡片 `flex-1` 的父级面板也必须 `md:flex-1`**：tab 面板不 grow，卡片 `flex-1` 永远长不高（实测卡在 808px，补 `md:flex-1` 后 900→1120）。
3. **移动端必须排除**：`w < 768` 时 `zoom = 1`；所有 `min-h-[var(--stage-h)]` 只加 `md:` 前缀，否则会写死移动端高度。
4. **打印页不受影响**：`PrintReportPage` 不在 Layout 内，不走 zoom。
5. **验证缩放是否生效别信 `getComputedStyle().zoom`**：Chrome 恒报 `"1"`。要看区块实际渲染高度。

---

## 5. 验收清单（必须实测，不靠肉眼）

用 puppeteer-core + 本机 Chrome 跑 5 种视口 **1080×620 / 864×496 / 1440×780 / 1920×1080 / 2560×1300**，逐项打勾：

- [ ] **横向不铺满**：内容宽 = min(容器宽, 视口宽)；宽屏左右留白对称（1440→100/100、1920→340/340、2560→660/660）
- [ ] **等比不重排**：区块高 ÷ 视口宽 的比值在各视口恒定（±0.3% 取整噪声）
- [ ] **无挤压无重叠**：相邻区块 bottom 不超过下一个 top；图表高度不低于 ~130px（此前被压到 50px）
- [ ] **竖向铺满**：高分辨率下 `文档高 ≈ 视口高`（可 `docH == vh`），无滚动条；尾部空白 ≈ 底部 padding（≤32px）
- [ ] **矮屏滚动**：`1080×620` 等矮视口内容高于视口 → 纵向滚动，区块保持设计稿比例不被压缩

> 测量脚本要点：puppeteer-core 装**在项目外临时目录**（避免改项目 package-lock 导致构建失败）；请求必须带**完整浏览器 UA + Accept**，否则框架中间件返回假 404。

---

## 6. 与既有规范的边界

- 容器宽、断点、间距/圆角/字号等**风格尺度**以 `UI-FOUNDATION.md` 为准（默认容器 1080、唯一断点 768）；本文件的 `DESIGN_WIDTH` 必须与项目实际容器宽配套。
- 打印通道看 `PRINT-PATTERNS.md`；控件级量化规格看 `UI-CONSISTENCY.md`。
- 本规范是通用层改进，按「升级回灌规则」需回流 codem-skills 真源后 sync 下发。
