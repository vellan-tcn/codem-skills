import { useEffect, useState } from 'react';

/**
 * 「长图式」自适应：固定设计稿 + 整页 zoom 等比缩放 + 竖向铺满。
 * 规范见 assets/docs/LAYOUT-CANVAS-ZOOM.md（三反模式 / 三段式 / 断链坑 / 验收清单）。
 */

/** 设计稿宽度 = 容器最大宽 + 40（页面左右留白）。★★项目特定参数：容器改宽必须同步改这里 */
const DESIGN_WIDTH = 1280;
/** 低于该宽度视为移动端，禁用等比缩放（走原生响应式样式） */
const MOBILE_BREAKPOINT = 768;
/** 最大缩放：宽屏下不再放大，内容保持设计宽度居中（避免横向铺满、卡片被拉宽） */
const MAX_ZOOM = 1;
/** 最小缩放：极端放大时保底，避免文字过小到看不清（再窄就横向留白，不无限缩） */
const MIN_ZOOM = 0.62;
/** 顶部导航在设计稿坐标系里的总占位（h-9=36 + 下边框 1）。工具条高度不用算，由页面 flex-1 消化 */
const NAV_H = 37;

export interface CanvasZoom {
  /** 整页等比缩放系数：<=1，只缩不放 */
  zoom: number;
  /** 页面根容器可用高度（设计稿坐标系 px），供 min-h 竖向铺满 */
  stageH: number;
}

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
