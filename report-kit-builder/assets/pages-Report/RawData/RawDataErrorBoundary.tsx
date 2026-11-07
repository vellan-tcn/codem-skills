import React from 'react';
import { logger } from '@lark-apaas/client-toolkit/logger';

interface RawDataErrorBoundaryProps {
  label: string;
  children: React.ReactNode;
}

interface RawDataErrorBoundaryState {
  hasError: boolean;
}

class RawDataErrorBoundary extends React.Component<
  RawDataErrorBoundaryProps,
  RawDataErrorBoundaryState
> {
  constructor(props: RawDataErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): RawDataErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: unknown): void {
    logger.error('数据查询页渲染异常', String(error));
  }

  render(): React.ReactNode {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-[120px] flex-1 items-center justify-center text-sm text-rk-danger">
          {this.props.label}加载异常，请刷新页面重试
        </div>
      );
    }
    return this.props.children;
  }
}

export default RawDataErrorBoundary;
