import React, { useEffect, useRef } from 'react';
import Chart from 'chart.js/auto';
import type { ChartConfiguration, ChartType } from 'chart.js';

interface ChartCanvasProps<TType extends ChartType> {
  config: ChartConfiguration<TType>;
  className?: string;
}

function ChartCanvas<TType extends ChartType>({
  config,
  className,
}: ChartCanvasProps<TType>) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const chartRef = useRef<Chart<TType> | null>(null);

  useEffect(() => {
    const canvas: HTMLCanvasElement | null = canvasRef.current;
    if (!canvas) return;
    chartRef.current?.destroy();
    chartRef.current = new Chart<TType>(canvas, config);
    return () => {
      chartRef.current?.destroy();
      chartRef.current = null;
    };
  }, [config]);

  return (
    <div className={className ?? 'relative h-[260px] w-full overflow-visible md:h-[320px]'}>
      <canvas ref={canvasRef} />
    </div>
  );
}

export default ChartCanvas;
