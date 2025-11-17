"use client";

import { CircularChart } from "@/components/CircularChart";
import { MonthlyCalendar } from "@/components/MonthlyCalendar";
import { MealChecklist } from "@/components/MealChecklist";
import { useState, useEffect } from "react";
import { SelectedMeal, getMealsForDay } from "@/types/meals";

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

// Meta calórica diária
const DAILY_CALORIE_GOAL = 2200;
const DAILY_PROTEIN_GOAL = 150;
const DAILY_CARBS_GOAL = 200;
const DAILY_FAT_GOAL = 65;

function calculateNutritionFromMeals(
  selectedMeals: SelectedMeal[],
  dateKey: string
) {
  const meals = getMealsForDay(new Date(dateKey).getDay());
  let totalCalories = 0;
  let totalProtein = 0;
  let totalCarbs = 0;
  let totalFat = 0;

  // Função para obter opções customizadas de um slot
  const getCustomOptions = (slotId: string): any[] => {
    const saved = localStorage.getItem(`custom_options_${slotId}`);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        return [];
      }
    }
    return [];
  };

  selectedMeals
    .filter((m) => m.date === dateKey)
    .forEach((selectedMeal) => {
      const slot = meals.find((s) => s.id === selectedMeal.slotId);
      if (slot) {
        // Buscar nas opções padrão primeiro
        let option = slot.options.find((o) => o.id === selectedMeal.optionId);
        
        // Se não encontrar, buscar nas opções customizadas
        if (!option) {
          const customOptions = getCustomOptions(selectedMeal.slotId);
          option = customOptions.find((o: any) => o.id === selectedMeal.optionId);
        }
        
        if (option) {
          totalCalories += option.totalCalories;
          totalProtein += option.protein;
          totalCarbs += option.carbs;
          totalFat += option.fat;
        }
      }
    });

  return {
    calories: {
      consumed: totalCalories,
      limit: DAILY_CALORIE_GOAL,
      burned: 620, // Mock - depois virá do Firebase
    },
    macros: {
      protein: {
        label: "Proteína",
        consumed: totalProtein,
        limit: DAILY_PROTEIN_GOAL,
        color: "red",
        gradient: "from-red-400 to-orange-400",
      },
      carbs: {
        label: "Carboidratos",
        consumed: totalCarbs,
        limit: DAILY_CARBS_GOAL,
        color: "blue",
        gradient: "from-blue-400 to-cyan-400",
      },
      fat: {
        label: "Gorduras",
        consumed: totalFat,
        limit: DAILY_FAT_GOAL,
        color: "yellow",
        gradient: "from-yellow-400 to-amber-400",
      },
    },
  };
}

const mockChecklist = [
  { label: "Treino concluído", defaultChecked: true },
  { label: "Sem doces/processados", defaultChecked: false },
  { label: "8h de sono", defaultChecked: false },
  { label: "Hidratou (2L+)", defaultChecked: true },
];


export default function Home() {
  const today = new Date();
  const [selectedDate, setSelectedDate] = useState<Date>(today);
  const [monthDays, setMonthDays] = useState<Array<{ date: Date; score: number | null }>>([]);
  const [selectedMeals, setSelectedMeals] = useState<SelectedMeal[]>([]);

  const dateKey = selectedDate.toISOString().split("T")[0];
  const nutrition = calculateNutritionFromMeals(selectedMeals, dateKey);

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

  // Carregar refeições selecionadas quando a data muda
  useEffect(() => {
    const saved = localStorage.getItem(`meals_${dateKey}`);
    if (saved) {
      try {
        setSelectedMeals(JSON.parse(saved));
      } catch (e) {
        console.error("Erro ao carregar refeições:", e);
      }
    } else {
      setSelectedMeals([]);
    }
  }, [dateKey]);

  // Escutar mudanças nas refeições através de eventos customizados
  useEffect(() => {
    const handleMealsUpdate = (e: CustomEvent) => {
      if (e.detail.dateKey === dateKey) {
        setSelectedMeals(e.detail.meals);
      }
    };

    window.addEventListener("mealsUpdated", handleMealsUpdate as EventListener);

    return () => {
      window.removeEventListener("mealsUpdated", handleMealsUpdate as EventListener);
    };
  }, [dateKey]);

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
        <CircularChart calories={nutrition.calories} macros={nutrition.macros} />
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
            + Adicionar novo Check
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

        {/* Nutrição / refeições */}
        <MealChecklist selectedDate={selectedDate} />
      </section>
    </div>
  );
}

