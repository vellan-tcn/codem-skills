import React from 'react';

export interface ErrorStateProps {
  /** 错误提示，默认「加载失败」 */
  message?: string;
  /** 次级说明，如网络原因 */
  description?: string;
  /** 点击重试回调；不传则不显示重试按钮 */
  onRetry?: () => void;
}

/** 加载失败占位：接口异常时使用，支持重试 */
const ErrorState: React.FC<ErrorStateProps> = ({
  message = '加载失败',
  description,
  onRetry,
}) => (
  <div className="flex min-h-[160px] flex-1 flex-col items-center justify-center gap-1.5 rounded-[14px] border border-rk-line bg-white px-4 py-8">
    <svg
      viewBox="0 0 48 48"
      className="h-9 w-9 text-rk-danger"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      aria-hidden="true"
    >
      <circle cx="24" cy="24" r="17" />
      <path d="M24 15v11M24 31.5v.5" />
    </svg>
    <p className="text-[13px] font-medium text-rk-ink md:text-sm">{message}</p>
    {description ? (
      <p className="text-xs text-rk-ink-soft/70 md:text-[13px]">{description}</p>
    ) : null}
    {onRetry ? (
      <button
        type="button"
        onClick={onRetry}
        className="mt-2 rounded-md border border-rk-line px-3 py-1 text-xs font-medium text-rk-brand transition-colors hover:bg-rk-bg-brand-soft md:text-[13px]"
      >
        重试
      </button>
    ) : null}
  </div>
);

export default ErrorState;
