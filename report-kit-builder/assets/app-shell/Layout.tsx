import React from 'react';
import { NavLink, Outlet } from 'react-router-dom';

const NAV_ITEMS: { to: string; label: string }[] = [
  { to: '/', label: '能效运营报告' },
  { to: '/raw-data', label: '配料车间数据查询' },
  { to: '/mfg-data', label: '制造车间数据查询' },
];

const Layout = () => {
  return (
    <div className="min-h-screen w-full bg-rk-bg-soft text-rk-ink">
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
