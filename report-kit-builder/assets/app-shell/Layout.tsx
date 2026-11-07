import React from 'react';
import { NavLink, Outlet } from 'react-router-dom';

import { useCanvasZoom } from '@client/src/hooks/useCanvasZoom';
import type { CanvasZoom } from '@client/src/hooks/useCanvasZoom';

const NAV_ITEMS: { to: string; label: string }[] = [
  { to: '/', label: '能效运营报告' },
  { to: '/raw-data', label: '配料车间数据查询' },
  { to: '/mfg-data', label: '制造车间数据查询' },
];

const Layout = () => {
  // 整页按设计稿等比缩放（横向不铺满、永不挤压），
  // 并把「视口剩余高度」以 --stage-h 下发给页面根容器做竖向铺满。
  // 规范见 assets/docs/LAYOUT-CANVAS-ZOOM.md
  const { zoom, stageH }: CanvasZoom = useCanvasZoom();
  const stageStyle = { zoom, '--stage-h': `${stageH}px` } as React.CSSProperties;
  return (
    <div className="min-h-screen w-full bg-rk-bg-soft text-rk-ink" style={stageStyle}>
      <nav className="w-full border-b border-white/10 bg-rk-gradient-ink">
        <div className="mx-auto flex h-9 max-w-[1240px] items-center gap-1 overflow-x-auto px-3 md:px-6">
          {NAV_ITEMS.map((item: { to: string; label: string }) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }: { isActive: boolean }) =>
                `flex min-h-[36px] shrink-0 items-center border-b-2 px-2.5 text-[13px] transition-colors md:min-h-0 md:h-9 md:px-3 md:text-sm ${
                  isActive
                    ? 'border-rk-teal font-medium text-white'
                    : 'border-transparent text-white/60 hover:text-white'
                }`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </div>
      </nav>
      <Outlet />
    </div>
  );
};

export default Layout;
