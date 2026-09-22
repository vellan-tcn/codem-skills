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

import type { RawWorkshop } from '@client/src/api/raw-data';

export interface ReportTopbarProps {
  /** 数据新鲜度文案，如「数据更新至 2026-08」，加载中为 null */
  freshness: string | null;
  workshop?: 'pei' | 'mfg';
  onWorkshopChange: (w: RawWorkshop) => void;
}

export interface MonthChipsBarProps {
  chips: MonthChip[];
  selected: string | null;
  onSelect: (month: string) => void;
}

export interface ProjectInfoSectionProps {
  variableCount: number;
  dataRange: MonthRange | null;
  workshop?: 'pei' | 'mfg';
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
  workshop: 'pei' | 'mfg';
}

export interface CoolElecSectionProps {
  year: number;
  monthly: MonthlyCopItem[];
}

export interface TempScopSectionProps {
  month: string | null;
  tempVar: string | null;
  scopVar: string | null;
  daily: DailySeries | null;
  loading: boolean;
}

export interface MonthlyTableSectionProps {
  year: number;
  monthly: MonthlyCopItem[];
}

export interface HistoryQuerySectionProps {
  variables: string[];
}

export type DataNotesSectionProps = Record<string, never>;

export interface SectionCardProps {
  no: string;
  icon: React.ReactNode;
  title: string;
  subtitle?: string;
  headerExtra?: React.ReactNode;
  defaultOpen?: boolean;
  children: React.ReactNode;
}
