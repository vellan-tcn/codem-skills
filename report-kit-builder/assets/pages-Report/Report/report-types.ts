import type React from 'react';
import type { CopSummary, MonthlyCopItem } from '@shared/api.interface';

export interface MonthChip {
  month: string;
  enabled: boolean;
}

export interface MonthRange {
  minMonth: string;
  maxMonth: string;
}

export interface DailySeries {
  dates: string[];
  temp: (number | null)[];
  scop: (number | null)[];
}

export interface ReportTopbarProps {
  /** 数据新鲜度文案，如「数据更新至 2026-08」，加载中为 null */
  freshness: string | null;
}

export interface MonthChipsBarProps {
  chips: MonthChip[];
  selected: string | null;
  onSelect: (month: string) => void;
}

export interface CopKpiSectionProps {
  year: number | null;
  availableYears: number[];
  onYearChange: (year: number) => void;
  summary: CopSummary | null;
  monthly: MonthlyCopItem[];
}

export interface MonthlyCopTrendSectionProps {
  year: number;
  monthly: MonthlyCopItem[];
}

export interface SectionCardProps {
  no: string;
  icon: React.ReactNode;
  title: string;
  subtitle?: string;
  headerExtra?: React.ReactNode;
  defaultOpen?: boolean;
  children: React.ReactNode;
}
