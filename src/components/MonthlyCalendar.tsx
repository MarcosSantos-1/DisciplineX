"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { checklistService } from "@/lib/firebaseService";

type DayData = {
  date: Date;
  score?: number | null;
  label?: string;
};

type MonthlyCalendarProps = {
  days: DayData[];
  onDayClick?: (date: Date) => void;
  getDayStatus?: (date: Date) => {
    completed: number;
    total: number;
    percentage: number;
    goalMet: boolean;
  } | null;
  formatDayLabel?: (date: Date) => string;
};

function sameCalendarDay(a: Date, b: Date) {
  return (
    a.getDate() === b.getDate() &&
    a.getMonth() === b.getMonth() &&
    a.getFullYear() === b.getFullYear()
  );
}

function buildAdjacentThreeDays(days: DayData[]): DayData[] {
  const anchor = new Date();
  const yesterday = new Date(anchor);
  yesterday.setDate(anchor.getDate() - 1);
  const tomorrow = new Date(anchor);
  tomorrow.setDate(anchor.getDate() + 1);
  return [yesterday, anchor, tomorrow].map((d) => {
    const found = days.find((x) => sameCalendarDay(x.date, d));
    return found ?? { date: d };
  });
}

export function MonthlyCalendar({
  days,
  onDayClick,
  getDayStatus,
  formatDayLabel,
}: MonthlyCalendarProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const todayCardRef = useRef<HTMLButtonElement>(null);
  const today = new Date();
  const [specialChecksMap, setSpecialChecksMap] = useState<Map<string, boolean>>(new Map());
  const todayIndex = days.findIndex(
    (d) =>
      d.date.getDate() === today.getDate() &&
      d.date.getMonth() === today.getMonth() &&
      d.date.getFullYear() === today.getFullYear()
  );

  const threeDayWindow = useMemo(() => buildAdjacentThreeDays(days), [days]);

  // Carregar checks especiais (mês + ontem/hoje/amanhã para faixa mobile)
  useEffect(() => {
    const loadSpecialChecks = async () => {
      const keys = new Set<string>();
      for (const day of days) {
        keys.add(day.date.toISOString().split("T")[0]);
      }
      for (const day of threeDayWindow) {
        keys.add(day.date.toISOString().split("T")[0]);
      }
      const checksMap = new Map<string, boolean>();
      for (const dateKey of keys) {
        try {
          const checks = await checklistService.getSpecialChecks(dateKey);
          checksMap.set(dateKey, checks && checks.length > 0);
        } catch (e) {
          checksMap.set(dateKey, false);
        }
      }
      setSpecialChecksMap(checksMap);
    };
    loadSpecialChecks();
  }, [days, threeDayWindow]);

  useEffect(() => {
    // Aguardar o DOM estar completamente renderizado
    const timer = setTimeout(() => {
      if (scrollContainerRef.current && todayCardRef.current && todayIndex !== -1) {
        const container = scrollContainerRef.current;
        const card = todayCardRef.current;
        
        // Usar scrollIntoView com opções para centralizar
        card.scrollIntoView({
          behavior: "smooth",
          block: "nearest",
          inline: "center",
        });
      }
    }, 150);

    return () => clearTimeout(timer);
  }, [todayIndex]);

  // Removido: não chamar onDayClick automaticamente para evitar voltar ao dia atual

  const isToday = (date: Date) => {
    return (
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear()
    );
  };

  const isYesterday = (date: Date) => {
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);
    return (
      date.getDate() === yesterday.getDate() &&
      date.getMonth() === yesterday.getMonth() &&
      date.getFullYear() === yesterday.getFullYear()
    );
  };

  const isTomorrow = (date: Date) => {
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);
    return (
      date.getDate() === tomorrow.getDate() &&
      date.getMonth() === tomorrow.getMonth() &&
      date.getFullYear() === tomorrow.getFullYear()
    );
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString("pt-BR", { day: "numeric", month: "short" }).toUpperCase();
  };

  const renderDayCell = (day: DayData, attachTodayRef: boolean) => {
    const dayIsToday = isToday(day.date);
    const dayIsYesterday = isYesterday(day.date);
    const dayIsTomorrow = isTomorrow(day.date);
    const isFocused = dayIsToday || dayIsYesterday || dayIsTomorrow;

    let status = null;
    if (getDayStatus) {
      status = getDayStatus(day.date);
    }

    const scoreBadge =
      day.score !== null && day.score !== undefined ? (
        <span
          className={
            "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] sm:text-[11px]" +
            " " +
            (day.score >= 80
              ? "bg-emerald-500/10 text-emerald-300"
              : "bg-red-500/10 text-red-300")
          }
        >
          {day.score >= 80 ? "✅" : "❌"} {day.score}/100
        </span>
      ) : status && status.total > 0 ? (
        <span
          className={
            "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] sm:text-[11px]" +
            " " +
            (status.goalMet
              ? "bg-emerald-500/10 text-emerald-300"
              : status.percentage > 0
              ? "bg-jagger-500/10 text-jagger-300"
              : "bg-zinc-500/10 text-zinc-500")
          }
        >
          {status.goalMet ? "✅" : status.percentage > 0 ? "🔄" : "⏳"} {status.completed}/
          {status.total}
        </span>
      ) : null;

    const dayLabel =
      day.label ||
      (dayIsToday ? "Hoje" : dayIsYesterday ? "Ontem" : dayIsTomorrow ? "Amanhã" : "");

    const dateKey = day.date.toISOString().split("T")[0];
    const hasSpecialCheck = specialChecksMap.get(dateKey) || false;

    const hasScore = day.score !== null && day.score !== undefined;
    const isCompleted = hasScore && day.score! >= 80;
    const isIncomplete = hasScore && day.score! < 80;

    const useYellowBorder = hasSpecialCheck && !hasScore;

    const stateClasses = dayIsToday
      ? "w-full min-w-0 bg-jagger-800/80 border-2 border-jagger-300 shadow-xl md:min-w-[10rem] md:shadow-2xl"
      : useYellowBorder
      ? "w-full min-w-0 bg-zinc-900/60 border-2 border-yellow-400/60 md:min-w-[9rem]"
      : isCompleted
      ? "w-full min-w-0 bg-emerald-500/10 border-emerald-500/40 md:min-w-[9rem]"
      : isIncomplete
      ? "w-full min-w-0 bg-red-500/10 border-red-500/40 md:min-w-[9rem]"
      : isFocused
      ? "w-full min-w-0 bg-zinc-900/60 border-zinc-700/80 md:min-w-[9rem]"
      : "w-full min-w-0 bg-zinc-950/40 border-zinc-800/80 opacity-60 hover:opacity-100 md:min-w-[8rem]";

    return (
      <div key={dateKey + (attachTodayRef ? "-desk" : "-mob")} className="min-w-0 flex-1 md:flex-none md:shrink-0">
        <button
          ref={attachTodayRef && dayIsToday ? todayCardRef : undefined}
          onClick={() => onDayClick?.(day.date)}
          className={`flex h-29 min-h-29 flex-col items-center justify-center gap-1.5 rounded-2xl border px-2 py-2 text-center transition-all md:h-30 md:min-h-30 md:rounded-3xl md:px-2.5 md:py-2.5 ${stateClasses}`}
        >
          {dayLabel && (
            <span className="text-[10px] uppercase tracking-[0.15em] text-zinc-400 sm:text-[11px]">
              {dayLabel}
            </span>
          )}
          <span className="flex items-center justify-center gap-1.5 text-sm font-semibold text-zinc-50 sm:text-base">
            {formatDayLabel ? formatDayLabel(day.date) : formatDate(day.date)}
            {hasSpecialCheck && <span className="text-xs text-yellow-400">⭐</span>}
          </span>
          <div className="flex min-h-5.5 items-center justify-center">
            {scoreBadge}
          </div>
        </button>
      </div>
    );
  };

  return (
    <div className="overflow-hidden rounded-3xl border border-zinc-800/90 bg-zinc-950 p-3 md:p-4">
      <div className="mb-2 flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-jagger-200/80">
            Calendário Tático
          </p>
        </div>
        <span className="hidden rounded-full border border-zinc-800/80 bg-zinc-950 px-3 py-1 text-[11px] text-zinc-400 md:inline-flex">
          Arraste para navegar
        </span>
      </div>

      {/* Mobile: só ontem · hoje · amanhã (hoje no centro) */}
      <div className="md:hidden">
        <div className="grid grid-cols-3 gap-2">{threeDayWindow.map((d) => renderDayCell(d, false))}</div>
      </div>

      {/* Desktop: faixa completa do mês */}
      <div className="hidden overflow-hidden md:block md:-mx-4">
        <div
          ref={scrollContainerRef}
          className="scrollbar-hide flex gap-2.5 overflow-x-auto px-4 pb-1 pt-1 sm:gap-3"
          style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
        >
          {days.map((day) => renderDayCell(day, true))}
        </div>
      </div>
    </div>
  );
}

