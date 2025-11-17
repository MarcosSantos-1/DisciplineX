"use client";

import { useState, useEffect } from "react";
import { DailyChecklist } from "@/components/DailyChecklist";
import { AddSpecialCheckModal } from "@/components/AddSpecialCheckModal";

function getDaysInMonth(year: number, month: number): Date[] {
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const days: Date[] = [];
  
  for (let i = 1; i <= lastDay.getDate(); i++) {
    days.push(new Date(year, month, i));
  }
  
  return days;
}

function getDayScore(date: Date): number | null {
  // Verificar se estamos no navegador
  if (typeof window === "undefined") return null;
  
  // Carregar score do checklist do dia
  const dateKey = date.toISOString().split("T")[0];
  const saved = localStorage.getItem(`daily_checklist_${dateKey}`);
  if (saved) {
    try {
      const parsed = JSON.parse(saved);
      return parsed.score || null;
    } catch (e) {
      console.error("Erro ao carregar score:", e);
    }
  }
  return null;
}

function hasSpecialCheck(date: Date): boolean {
  // Verificar se estamos no navegador
  if (typeof window === "undefined") return false;
  
  const dateKey = date.toISOString().split("T")[0];
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
}

export default function CalendarioPage() {
  const today = new Date();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date>(today);
  const [showSpecialCheckModal, setShowSpecialCheckModal] = useState(false);
  const [specialCheckDate, setSpecialCheckDate] = useState<Date>(today);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const days = getDaysInMonth(year, month);

  const monthNames = [
    "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
    "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
  ];

  const dayNames = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

  const navigateMonth = (direction: "prev" | "next") => {
    setCurrentDate((prev) => {
      const newDate = new Date(prev);
      if (direction === "prev") {
        newDate.setMonth(prev.getMonth() - 1);
      } else {
        newDate.setMonth(prev.getMonth() + 1);
      }
      return newDate;
    });
  };

  const isToday = (date: Date) => {
    const today = new Date();
    return (
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear()
    );
  };

  return (
    <div className="flex flex-1 flex-col gap-4">
      <header className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.25em] text-jagger-300/80">
            Calendário Completo
          </p>
          <h2 className="mt-1 text-2xl font-semibold text-zinc-50">
            Visão Mensal
          </h2>
          <p className="mt-1 text-xs text-zinc-400">
            Configure seus checklists e acompanhe o progresso.
          </p>
        </div>
      </header>

      {/* Navegação do mês */}
      <section className="glass-panel rounded-3xl p-4">
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={() => navigateMonth("prev")}
            className="rounded-xl border border-zinc-700/80 bg-zinc-950/60 px-3 py-1.5 text-sm text-zinc-300 hover:border-jagger-400/60 hover:text-jagger-100 transition-colors"
          >
            ←
          </button>
          <h3 className="text-lg font-semibold text-zinc-50">
            {monthNames[month]} {year}
          </h3>
          <button
            onClick={() => navigateMonth("next")}
            className="rounded-xl border border-zinc-700/80 bg-zinc-950/60 px-3 py-1.5 text-sm text-zinc-300 hover:border-jagger-400/60 hover:text-jagger-100 transition-colors"
          >
            →
          </button>
        </div>

        {/* Grid do calendário */}
        <div className="grid grid-cols-7 gap-1.5">
          {dayNames.map((day) => (
            <div
              key={day}
              className="py-2 text-center text-[10px] font-medium text-zinc-400 sm:text-xs"
            >
              {day}
            </div>
          ))}
          {/* Espaços vazios antes do primeiro dia do mês para alinhar com o dia da semana correto */}
          {days.length > 0 && (() => {
            const firstDayOfWeek = days[0].getDay();
            const emptyCells = [];
            for (let i = 0; i < firstDayOfWeek; i++) {
              emptyCells.push(
                <div key={`empty-${i}`} className="flex flex-col items-center justify-center rounded-xl border border-transparent p-2 text-xs" />
              );
            }
            return emptyCells;
          })()}
          {days.map((date) => {
            const score = getDayScore(date);
            const today = isToday(date);
            const dayOfWeek = date.getDay();
            const specialCheck = hasSpecialCheck(date);
            const hasScore = score !== null && score !== undefined;
            const isCompleted = hasScore && score! >= 80;
            const isIncomplete = hasScore && score! < 80;
            
            // Borda amarela apenas se tem missão especial E não tem score ainda
            const useYellowBorder = specialCheck && !hasScore;

            return (
              <button
                key={date.toISOString()}
                onClick={() => setSelectedDate(date)}
                className={`flex flex-col items-center justify-center rounded-xl border p-2 text-xs transition-all relative ${
                  today
                    ? "bg-jagger-800/80 border-jagger-400/60 shadow-2xl"
                    : useYellowBorder
                    ? "bg-zinc-900/60 border-2 border-yellow-400/60"
                    : isCompleted
                    ? "bg-emerald-500/10 border-emerald-500/40"
                    : isIncomplete
                    ? "bg-red-500/10 border-red-500/40"
                    : "bg-zinc-950/40 border-zinc-800/80 hover:bg-zinc-900/60"
                }`}
              >
                <span className={`font-semibold flex items-center gap-1 ${today ? "text-jagger-50" : "text-zinc-100"}`}>
                  {date.getDate()}
                  {specialCheck && (
                    <span className="text-yellow-400 text-[10px]">⭐</span>
                  )}
                </span>
                {score !== null && (
                  <span
                    className={`mt-1 text-[9px] ${
                      score >= 80 ? "text-emerald-300" : "text-red-300"
                    }`}
                  >
                    {score >= 80 ? "✅" : "❌"}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </section>

      {/* Checklist do dia selecionado */}
      <section className="grid flex-1 gap-3 md:grid-cols-[minmax(0,1.1fr)_minmax(0,1.1fr)]">
        <DailyChecklist 
          date={selectedDate} 
          onScoreChange={(score) => {
            // Score atualizado automaticamente pelo componente
          }}
          onAddSpecialCheck={() => {
            setShowSpecialCheckModal(true);
            setSpecialCheckDate(selectedDate);
          }}
        />
      </section>

      {/* Modal para adicionar check especial */}
      {showSpecialCheckModal && (
        <AddSpecialCheckModal
          date={specialCheckDate}
          onClose={() => setShowSpecialCheckModal(false)}
          onAdd={() => {
            // Forçar atualização do calendário
            setShowSpecialCheckModal(false);
            // O calendário será atualizado automaticamente quando o componente re-renderizar
          }}
        />
      )}
    </div>
  );
}
