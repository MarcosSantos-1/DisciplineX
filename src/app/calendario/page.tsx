"use client";

import { useState } from "react";

type ChecklistItem = {
  id: string;
  label: string;
  enabled: boolean;
  weight: "high" | "medium" | "low";
  daysOfWeek: number[]; // 0 = domingo, 1 = segunda, etc.
};

const mockChecklistItems: ChecklistItem[] = [
  {
    id: "1",
    label: "Treino concluído",
    enabled: true,
    weight: "high",
    daysOfWeek: [1, 2, 3, 4, 5], // Segunda a Sexta
  },
  {
    id: "2",
    label: "Sem doces/processados",
    enabled: true,
    weight: "high",
    daysOfWeek: [0, 1, 2, 3, 4, 5, 6], // Todos os dias
  },
  {
    id: "3",
    label: "8h de sono",
    enabled: true,
    weight: "high",
    daysOfWeek: [0, 1, 2, 3, 4, 5, 6], // Todos os dias
  },
  {
    id: "4",
    label: "Hidratou (2L+)",
    enabled: true,
    weight: "medium",
    daysOfWeek: [0, 1, 2, 3, 4, 5, 6], // Todos os dias
  },
  {
    id: "5",
    label: "Jejuou conforme protocolo",
    enabled: false,
    weight: "medium",
    daysOfWeek: [1, 3, 5], // Segunda, Quarta, Sexta
  },
];

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
  // Mock - depois virá do Firebase
  const day = date.getDate();
  if (day % 3 === 0) return 88;
  if (day % 3 === 1) return 62;
  return null;
}

export default function CalendarioPage() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [checklistItems, setChecklistItems] = useState(mockChecklistItems);
  const [selectedItem, setSelectedItem] = useState<ChecklistItem | null>(null);

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

  const toggleChecklistItem = (id: string) => {
    setChecklistItems((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, enabled: !item.enabled } : item
      )
    );
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
          {days.map((date) => {
            const score = getDayScore(date);
            const today = isToday(date);
            const dayOfWeek = date.getDay();

            return (
              <button
                key={date.toISOString()}
                className={`flex flex-col items-center justify-center rounded-xl border p-2 text-xs transition-all ${
                  today
                    ? "bg-jagger-800/80 border-jagger-400/60 shadow-2xl"
                    : score !== null
                    ? score >= 80
                      ? "bg-emerald-500/10 border-emerald-500/40"
                      : "bg-red-500/10 border-red-500/40"
                    : "bg-zinc-950/40 border-zinc-800/80 hover:bg-zinc-900/60"
                }`}
              >
                <span className={`font-semibold ${today ? "text-jagger-50" : "text-zinc-100"}`}>
                  {date.getDate()}
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

      {/* Configuração de Checklist */}
      <section className="glass-panel rounded-3xl p-4">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-medium text-zinc-100">
              Configuração de Checklist
            </h3>
            <p className="mt-0.5 text-xs text-zinc-400">
              Defina quais perguntas aparecem em cada dia da semana.
            </p>
          </div>
        </div>

        <div className="space-y-2.5">
          {checklistItems.map((item) => (
            <div
              key={item.id}
              className="flex items-center justify-between rounded-2xl border border-zinc-800/80 bg-zinc-950/60 px-3 py-2.5"
            >
              <div className="flex flex-1 items-center gap-3">
                <input
                  type="checkbox"
                  checked={item.enabled}
                  onChange={() => toggleChecklistItem(item.id)}
                  className="h-4 w-4 rounded border-zinc-600 bg-zinc-900 text-emerald-400 accent-emerald-400"
                />
                <div className="flex-1">
                  <p className="text-xs font-medium text-zinc-100">
                    {item.label}
                  </p>
                  <p className="mt-0.5 text-[10px] text-zinc-500">
                    {item.daysOfWeek.length === 7
                      ? "Todos os dias"
                      : `${item.daysOfWeek.length} dias/semana`}
                    {" • "}
                    Peso:{" "}
                    {item.weight === "high"
                      ? "Alto"
                      : item.weight === "medium"
                      ? "Médio"
                      : "Baixo"}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedItem(item)}
                className="rounded-lg border border-zinc-700/80 bg-zinc-900/60 px-2 py-1 text-[10px] text-zinc-300 hover:border-jagger-400/60 hover:text-jagger-100 transition-colors"
              >
                Editar
              </button>
            </div>
          ))}
        </div>

        <button className="mt-3 w-full rounded-xl border border-dashed border-zinc-700 px-3 py-2 text-xs text-zinc-400 hover:border-jagger-400/60 hover:text-jagger-100 transition-colors">
          + Adicionar nova pergunta
        </button>
      </section>
    </div>
  );
}

