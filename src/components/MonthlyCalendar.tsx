"use client";

import { useState, useEffect, useRef } from "react";

type DayData = {
  date: Date;
  score?: number | null;
  label?: string;
};

type MonthlyCalendarProps = {
  days: DayData[];
  onDayClick?: (date: Date) => void;
  getDayStatus?: (date: Date) => { completed: number; total: number; percentage: number } | null;
  formatDayLabel?: (date: Date) => string;
  onAddSpecialCheck?: (date: Date) => void;
};

export function MonthlyCalendar({
  days,
  onDayClick,
  getDayStatus,
  formatDayLabel,
  onAddSpecialCheck,
}: MonthlyCalendarProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const todayCardRef = useRef<HTMLButtonElement>(null);
  const today = new Date();
  const todayIndex = days.findIndex(
    (d) =>
      d.date.getDate() === today.getDate() &&
      d.date.getMonth() === today.getMonth() &&
      d.date.getFullYear() === today.getFullYear()
  );

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

  return (
    <div className="glass-panel rounded-3xl p-3 md:p-4 overflow-hidden">
      <div className="mb-2 flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-jagger-200/80">
            Calendário Tático
          </p>
        </div>
        <span className="hidden rounded-full bg-zinc-900 px-3 py-1 text-[11px] text-zinc-400 md:inline-flex">
          Arraste para navegar
        </span>
      </div>

      <div className="overflow-hidden -mx-3 md:-mx-4">
        <div
          ref={scrollContainerRef}
          className="flex gap-2.5 overflow-x-auto pb-1 pt-1 px-3 md:px-4 scrollbar-hide sm:gap-3"
          style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
        >
        {days.map((day, idx) => {
          const today = isToday(day.date);
          const yesterday = isYesterday(day.date);
          const tomorrow = isTomorrow(day.date);
          const isFocused = today || yesterday || tomorrow;

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
                  (status.percentage === 100
                    ? "bg-emerald-500/10 text-emerald-300"
                    : status.percentage > 0
                    ? "bg-jagger-500/10 text-jagger-300"
                    : "bg-zinc-500/10 text-zinc-500")
                }
              >
                {status.percentage === 100 ? "✅" : status.percentage > 0 ? "🔄" : "⏳"}{" "}
                {status.completed}/{status.total}
              </span>
            ) : null;

          const dayLabel = day.label || (today ? "Hoje" : yesterday ? "Ontem" : tomorrow ? "Amanhã" : "");

          // Verificar se o dia tem missão especial
          const dateKey = day.date.toISOString().split("T")[0];
          const hasSpecialCheck = (() => {
            try {
              const saved = localStorage.getItem(`special_checks_${dateKey}`);
              if (saved) {
                const checks = JSON.parse(saved);
                return checks && checks.length > 0;
              }
            } catch (e) {
              return false;
            }
            return false;
          })();

          // Verificar se o dia tem score (foi concluído ou não)
          const hasScore = day.score !== null && day.score !== undefined;
          const isCompleted = hasScore && day.score! >= 80;
          const isIncomplete = hasScore && day.score! < 80;

          // Se tem missão especial mas não tem score ainda, usar borda amarela
          const useYellowBorder = hasSpecialCheck && !hasScore;

          return (
            <div
              key={day.date.toISOString()}
              className="relative"
            >
              <button
                ref={today ? todayCardRef : null}
                onClick={() => onDayClick?.(day.date)}
                className={`flex flex-col items-start justify-between rounded-3xl border px-2.5 py-2.5 text-left transition-all w-full ${
                  today
                    ? "min-w-[110px] bg-jagger-800/80 border-2 border-jagger-300 shadow-2xl md:min-w-[10rem] md:px-3 md:py-3 scale-105"
                    : useYellowBorder
                    ? "min-w-[100px] bg-zinc-900/60 border-2 border-yellow-400/60 md:min-w-[9rem]"
                    : isCompleted
                    ? "min-w-[100px] bg-emerald-500/10 border-emerald-500/40 md:min-w-[9rem]"
                    : isIncomplete
                    ? "min-w-[100px] bg-red-500/10 border-red-500/40 md:min-w-[9rem]"
                    : isFocused
                    ? "min-w-[100px] bg-zinc-900/60 border-zinc-700/80 md:min-w-[9rem]"
                    : "min-w-[90px] bg-zinc-950/40 border-zinc-800/80 opacity-60 hover:opacity-100 md:min-w-[8rem]"
                }`}
              >
              {dayLabel && (
                <span className="text-[10px] uppercase tracking-[0.15em] text-zinc-400 sm:text-[11px]">
                  {dayLabel}
                </span>
              )}
              <span className="mt-1 text-sm font-semibold text-zinc-50 sm:text-base flex items-center gap-1.5">
                {formatDayLabel ? formatDayLabel(day.date) : formatDate(day.date)}
                {hasSpecialCheck && (
                  <span className="text-yellow-400 text-xs">⭐</span>
                )}
              </span>
              {scoreBadge && <div className="mt-2">{scoreBadge}</div>}
            </button>
            {onAddSpecialCheck && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onAddSpecialCheck(day.date);
                }}
                className={`absolute top-1 right-1 rounded-full p-1.5 text-[10px] transition-colors ${
                  hasSpecialCheck
                    ? "bg-yellow-500/20 text-yellow-300 hover:bg-yellow-500/30"
                    : "bg-jagger-500/20 text-jagger-300 hover:bg-jagger-500/30"
                }`}
                title={hasSpecialCheck ? "Editar missão especial" : "Adicionar missão especial"}
              >
                {hasSpecialCheck ? "⭐" : "⭐+"}
              </button>
            )}
          </div>
        );
        })}
        </div>
      </div>
    </div>
  );
}

