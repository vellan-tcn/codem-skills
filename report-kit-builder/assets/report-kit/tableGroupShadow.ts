import type React from 'react';

/**
 * 「分组分割阴影」—— 跨列分组表（改造前 / 改造后 / 结果…）的分组边界视觉。
 *
 * 视觉约定：不改变底色、不加边框线，只在列分组的交界处加一道很窄的内侧投影，
 * 让大块分组像被一道柔和的缝隙切开，而不会增加任何布局高度。
 *
 * 之所以用 inset box-shadow 而不是 border（重要，踩过）：
 *  1. border 会挤占单元格内容宽度，长数字/长列名被压缩换行；
 *  2. border 会让该行比其它行高出 1~2px，切换页面/翻页时整表抖动；
 *  3. inset 阴影画在单元格内部，不参与布局，行高绝对稳定。
 *
 * 用法：把样式加在**每个分组的第一列**上（数据行用 GROUP_SHADOW、
 * 深底行如表头与底部合计行用 GROUP_SHADOW_HEAD），同一列的表头子行、
 * 数据行、合计行都要加，阴影才能在竖直方向上连成一条缝。
 *
 * - GROUP_SHADOW：浅底（白 / 浅灰 / 斑马行）使用，浅黑阴影；
 * - GROUP_SHADOW_HEAD：深底（表头、合计行，底色 rk-table-head #0B2440）使用，白色阴影。
 *
 * 数值（inset 3px 0 4px -3px）：只在左侧 3px 内做渐隐，肉眼是"一道缝"而非"一条线"；
 * 阴影色 18%（浅底）/ 22%（深底）—— 深底需要用白色才看得出来。
 */
export const GROUP_SHADOW: React.CSSProperties = {
  boxShadow: 'inset 3px 0 4px -3px rgba(0, 0, 0, 0.18)',
};

export const GROUP_SHADOW_HEAD: React.CSSProperties = {
  boxShadow: 'inset 3px 0 4px -3px rgba(255, 255, 255, 0.22)',
};
