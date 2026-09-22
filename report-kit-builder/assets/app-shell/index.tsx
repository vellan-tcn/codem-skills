import React from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { ErrorBoundary } from 'react-error-boundary';

import { AppContainer } from '@lark-apaas/client-toolkit/components/AppContainer';
import { ErrorRender } from '@lark-apaas/client-toolkit/components/ErrorRender';

import RoutesComponent from './app.tsx';
import './index.css';
import { createPortal } from 'react-dom';
import { Toaster } from '@client/src/components/ui/sonner';

const CLIENT_BASE_PATH = process.env.CLIENT_BASE_PATH || '/';

document.title = '示例食品厂项目运营报告';
// 妙搭平台外壳会在应用加载后用应用名覆盖 title，这里守护回去（平台只设一次，不会循环打架）
const APP_TITLE = '示例食品厂项目运营报告';
const guardTitle = () => { if (document.title !== APP_TITLE) document.title = APP_TITLE; };
setTimeout(guardTitle, 1500);
setTimeout(guardTitle, 4000);
const titleEl = document.querySelector('title');
if (titleEl) {
  new MutationObserver(guardTitle).observe(titleEl, { childList: true, characterData: true });
}

const MainApp = () => {
  return (
    <BrowserRouter basename={CLIENT_BASE_PATH}>
      <AppContainer defaultTheme="light">
        <ErrorBoundary
          fallbackRender={({ error, resetErrorBoundary }) => (
            <ErrorRender
              error={error as Error}
              resetErrorBoundary={resetErrorBoundary}
            />
          )}
        >
          <RoutesComponent />
          {createPortal(<Toaster />, document.body)}
        </ErrorBoundary>
      </AppContainer>
    </BrowserRouter>
  );
};

createRoot(document.getElementById('root')!).render(<MainApp />);
