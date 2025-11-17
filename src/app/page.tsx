"use client";

import { CircularChart } from "@/components/CircularChart";
import { MonthlyCalendar } from "@/components/MonthlyCalendar";
import { useState, useEffect } from "react";

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

const mockCalories = {
  consumed: 1150,
  limit: 1900,
  burned: 620,
};

const mockMacros = {
  protein: {
    label: "Proteína",
    consumed: 137,
    limit: 150,
    color: "red",
    gradient: "from-red-400 to-orange-400",
  },
  carbs: {
    label: "Carboidratos",
    consumed: 110,
    limit: 200,
    color: "blue",
    gradient: "from-blue-400 to-cyan-400",
  },
  fat: {
    label: "Gorduras",
    consumed: 48,
    limit: 65,
    color: "yellow",
    gradient: "from-yellow-400 to-amber-400",
  },
};

const mockChecklist = [
  { label: "Treino concluído", defaultChecked: true },
  { label: "Sem doces/processados", defaultChecked: false },
  { label: "8h de sono", defaultChecked: false },
  { label: "Hidratou (2L+)", defaultChecked: true },
];

const mockMeals = [
  {
    name: "Café da Manhã Operacional",
    description: "Ovos mexidos, aveia com whey, café sem açúcar.",
    kcal: 520,
    protein: 42,
    carbs: 38,
    fat: 18,
  },
  {
    name: "Almoço Base",
    description: "Frango grelhado, arroz integral, salada verde.",
    kcal: 650,
    protein: 55,
    carbs: 52,
    fat: 16,
  },
  {
    name: "Jantar Leve",
    description: "Tilápia, legumes no vapor, azeite.",
    kcal: 430,
    protein: 40,
    carbs: 20,
    fat: 14,
  },
];

export default function Home() {
  const today = new Date();
  const [selectedDate, setSelectedDate] = useState<Date>(today);
  const [monthDays, setMonthDays] = useState<Array<{ date: Date; score: number | null }>>([]);

  useEffect(() => {
    const currentDate = new Date();
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const days = getDaysInMonth(year, month);
    
    setMonthDays(
      days.map((date) => ({
        date,
        score: getDayScore(date),
      }))
    );
    // Garantir que o dia atual está selecionado
    setSelectedDate(currentDate);
  }, []);

  return (
    <div className="flex flex-1 flex-col gap-4">
      {/* Header */}
      <header className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.25em] text-jagger-300/80">
            Dia de Operação
          </p>
          <h2 className="mt-1 text-2xl font-semibold text-zinc-50">
            Painel Diário
          </h2>
          <p className="mt-1 text-xs text-zinc-400">
            Complete as missões para aumentar o{" "}
            <span className="text-jagger-300">Disciplinary Score</span>.
          </p>
        </div>
        <div className="hidden text-right text-xs text-zinc-400 sm:block">
          <p>Campanha atual</p>
          <p className="text-sm font-semibold text-emerald-400">
            -22kg até Junho / 2026
          </p>
        </div>
      </header>

      {/* Calendário Mensal */}
      <MonthlyCalendar
        days={monthDays}
        onDayClick={setSelectedDate}
      />

      {/* Card de calorias com gráfico circular */}
      <section>
        <CircularChart calories={mockCalories} macros={mockMacros} />
      </section>

      {/* Checklist disciplinar + nutrição */}
      <section className="grid flex-1 gap-3 md:grid-cols-[minmax(0,1.1fr)_minmax(0,1.1fr)]">
        {/* Checklist */}
        <div className="glass-panel flex flex-col rounded-3xl p-4">
          <div className="flex items-center justify-between gap-2">
            <div>
              <h3 className="text-sm font-medium text-zinc-100">
                Checklist Disciplinar
              </h3>
              <p className="text-[11px] text-zinc-400">
                Itens padrão configurados no calendário.
              </p>
            </div>
            <button className="rounded-full border border-zinc-700/80 bg-zinc-950/60 px-3 py-1 text-[11px] text-zinc-300 hover:border-jagger-400/60 hover:text-jagger-100">
              Ajustar perguntas
            </button>
          </div>

          <div className="mt-3 space-y-2.5">
            {mockChecklist.map((item, idx) => (
              <label
                key={item.label}
                className="flex cursor-pointer items-center gap-3 rounded-2xl bg-zinc-950/60 px-3 py-2.5 text-xs hover:bg-zinc-900/80"
              >
                <input
                  type="checkbox"
                  defaultChecked={item.defaultChecked}
                  className="h-4 w-4 rounded border-zinc-600 bg-zinc-900 text-emerald-400 accent-emerald-400"
                />
                <div className="flex flex-col">
                  <span className="text-zinc-100">{item.label}</span>
                  {idx <= 2 && (
                    <span className="text-[11px] text-zinc-500">
                      Peso maior no score do dia.
                    </span>
                  )}
                </div>
              </label>
            ))}
          </div>

          <button className="mt-3 self-start rounded-full border border-dashed border-zinc-700 px-3 py-1.5 text-[11px] text-zinc-400 hover:border-jagger-400/60 hover:text-jagger-100">
            + Adicionar nova pergunta
          </button>

          <div className="mt-4 flex items-center justify-between rounded-2xl bg-zinc-950/70 px-3 py-2 text-[11px] text-zinc-400">
            <span>
              🔥 Score estimado de hoje:{" "}
              <span className="font-semibold text-jagger-200">88 / 100</span>
            </span>
            <span className="hidden text-emerald-400 sm:inline">
              Missão quase concluída
            </span>
          </div>
        </div>

        {/* Nutrição / refeições mock */}
        <div className="glass-panel flex flex-col rounded-3xl p-4">
          <div className="flex items-center justify-between gap-2">
            <div>
              <h3 className="text-sm font-medium text-zinc-100">
                Refeições da Operação
              </h3>
              <p className="text-[11px] text-zinc-400">
                Combinações que batem meta de proteína e calorias.
              </p>
            </div>
            <button className="rounded-full border border-zinc-700/80 bg-zinc-950/60 px-3 py-1 text-[11px] text-zinc-300 hover:border-jagger-400/60 hover:text-jagger-100">
              Ver biblioteca
            </button>
          </div>

          <div className="mt-3 flex-1 space-y-2.5 overflow-y-auto">
            {mockMeals.map((meal) => (
              <div
                key={meal.name}
                className="flex flex-col gap-1 rounded-2xl bg-zinc-950/60 p-3 text-xs"
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="font-medium text-zinc-100">{meal.name}</p>
                  <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[11px] text-emerald-300">
                    {meal.kcal} kcal
                  </span>
                </div>
                <p className="text-[11px] text-zinc-400">
                  {meal.description}
                </p>
                <div className="mt-2 flex flex-wrap gap-2 text-[11px] text-zinc-400">
                  <span className="rounded-full bg-zinc-900/80 px-2 py-0.5">
                    🥩 {meal.protein}g proteína
                  </span>
                  <span className="rounded-full bg-zinc-900/80 px-2 py-0.5">
                    🍚 {meal.carbs}g carbos
                  </span>
                  <span className="rounded-full bg-zinc-900/80 px-2 py-0.5">
                    🧈 {meal.fat}g gorduras
                  </span>
                </div>
              </div>
            ))}
          </div>

          <button className="mt-3 self-start rounded-full border border-dashed border-zinc-700 px-3 py-1.5 text-[11px] text-zinc-400 hover:border-jagger-400/60 hover:text-jagger-100">
            + Adicionar refeição / receita
          </button>
        </div>
      </section>
    </div>
  );
}

