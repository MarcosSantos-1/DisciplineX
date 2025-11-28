"use client";

import { useState, useEffect, useRef } from "react";
import { DailyChecklist } from "@/components/DailyChecklist";
import { AddSpecialCheckModal } from "@/components/AddSpecialCheckModal";
import { checklistService, workoutService } from "@/lib/firebaseService";
import type { WorkoutDay } from "@/lib/firebaseService";

function getDaysInMonth(year: number, month: number): Date[] {
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const days: Date[] = [];
  
  for (let i = 1; i <= lastDay.getDate(); i++) {
    days.push(new Date(year, month, i));
  }
  
  return days;
}

async function getDayScore(date: Date): Promise<number | null> {
  // Verificar se estamos no navegador
  if (typeof window === "undefined") return null;
  
  // Carregar score do checklist do dia do Firebase
  const dateKey = date.toISOString().split("T")[0];
  try {
    return await checklistService.getDailyChecklistScore(dateKey);
  } catch (e) {
    console.error("Erro ao carregar score:", e);
    return null;
  }
}

async function hasSpecialCheck(date: Date): Promise<boolean> {
  // Verificar se estamos no navegador
  if (typeof window === "undefined") return false;
  
  const dateKey = date.toISOString().split("T")[0];
  try {
    const checks = await checklistService.getSpecialChecks(dateKey);
    return checks && checks.length > 0;
  } catch (e) {
    return false;
  }
}

export default function CalendarioPage() {
  const today = new Date();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [showSpecialCheckModal, setShowSpecialCheckModal] = useState(false);
  const [specialCheckDate, setSpecialCheckDate] = useState<Date>(today);
  const [daysWithScores, setDaysWithScores] = useState<Array<{ date: Date; score: number | null; hasSpecial: boolean }>>([]);
  const [workout, setWorkout] = useState<WorkoutDay | null>(null);
  const carouselRef = useRef<HTMLDivElement>(null);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const days = getDaysInMonth(year, month);

  // Carregar scores e checks especiais
  useEffect(() => {
    const loadDaysData = async () => {
      const daysData = await Promise.all(
        days.map(async (date) => ({
          date,
          score: await getDayScore(date),
          hasSpecial: await hasSpecialCheck(date),
        }))
      );
      setDaysWithScores(daysData);
    };
    loadDaysData();
  }, [currentDate]);

  // Carregar treino quando selecionar um dia
  useEffect(() => {
    if (!selectedDate) {
      setWorkout(null);
      return;
    }

    const loadWorkout = async () => {
      const dateKey = selectedDate.toISOString().split("T")[0];
      try {
        const workoutData = await workoutService.getWorkout(dateKey);
        setWorkout(workoutData);
      } catch (e) {
        console.error("Erro ao carregar treino:", e);
        setWorkout(null);
      }
    };

    loadWorkout();
  }, [selectedDate]);

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
          {daysWithScores.map((dayData) => {
            const date = dayData.date;
            const score = dayData.score;
            const today = isToday(date);
            const dayOfWeek = date.getDay();
            const specialCheck = dayData.hasSpecial;
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

      {/* Conteúdo do dia selecionado */}
      {selectedDate && (
        <section className="flex flex-1 flex-col gap-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium text-zinc-100">
              {selectedDate.toLocaleDateString("pt-BR", {
                weekday: "long",
                day: "numeric",
                month: "long",
              })}
            </h3>
            <button
              onClick={() => setSelectedDate(null)}
              className="rounded-full border border-zinc-700/80 bg-zinc-950/60 px-3 py-1 text-[11px] text-zinc-300 hover:border-jagger-400/60 hover:text-jagger-100 transition-colors"
            >
              Fechar
            </button>
          </div>

          {/* Carrossel de cards (Missões do Dia e Treinos) */}
          <div className="relative">
            <div
              ref={carouselRef}
              className="flex gap-4 overflow-x-auto scrollbar-hide snap-x snap-mandatory pb-2"
              style={{
                scrollbarWidth: "none",
                msOverflowStyle: "none",
              }}
            >
              {/* Card de Missões do Dia */}
              <div className="flex-shrink-0 w-full sm:w-[calc(100%-1rem)] md:w-1/2 snap-start">
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
              </div>

              {/* Card de Treinos do Dia */}
              <div className="flex-shrink-0 w-full sm:w-[calc(100%-1rem)] md:w-1/2 snap-start">
                <div className="glass-panel rounded-3xl p-4">
                  <div className="mb-3">
                    <h3 className="text-sm font-medium text-zinc-100">
                      Treinos do Dia
                    </h3>
                    <p className="mt-0.5 text-xs text-zinc-400">
                      Exercícios realizados
                    </p>
                  </div>

                  {workout && workout.exercises && workout.exercises.length > 0 ? (
                    (() => {
                      const completedExercises = workout.exercises.filter((ex) => ex.completed);
                      
                      if (completedExercises.length === 0) {
                        return (
                          <div className="text-center py-6 text-sm text-zinc-400">
                            Nenhum treino realizado neste dia
                          </div>
                        );
                      }

                      return (
                        <div className="space-y-2">
                          {completedExercises.map((exercise) => {
                            const isCardio = exercise.type === "cardio" || 
                              exercise.name.includes("🚶") || 
                              exercise.name.includes("🏃") || 
                              exercise.name.toLowerCase().includes("cardio");

                            return (
                              <div
                                key={exercise.id}
                                className="rounded-xl bg-emerald-500/10 border border-emerald-500/40 px-2.5 py-2"
                              >
                                <p className="text-[11px] font-medium text-emerald-300 leading-tight">
                                  {exercise.name}
                                </p>
                                <div className="mt-1.5 flex flex-wrap gap-1 text-[10px] text-zinc-400">
                                  {!isCardio && exercise.weight && (
                                    <span className="rounded-md bg-zinc-900/60 px-1.5 py-0.5">
                                      💪 {exercise.weight}kg
                                    </span>
                                  )}
                                  {exercise.sets && (
                                    <span className="rounded-md bg-zinc-900/60 px-1.5 py-0.5">
                                      📊 {typeof exercise.sets === "string" 
                                        ? exercise.sets 
                                        : exercise.reps 
                                          ? `${exercise.sets}x${exercise.reps}`
                                          : exercise.sets.toString()}
                                    </span>
                                  )}
                                  {isCardio && exercise.minutes && (
                                    <span className="rounded-md bg-zinc-900/60 px-1.5 py-0.5">
                                      ⏱️ {exercise.minutes}min
                                    </span>
                                  )}
                                  {isCardio && exercise.averageSpeed && (
                                    <span className="rounded-md bg-zinc-900/60 px-1.5 py-0.5">
                                      🏃 {exercise.averageSpeed} km/h
                                    </span>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      );
                    })()
                  ) : (
                    <div className="text-center py-6 text-sm text-zinc-400">
                      Nenhum treino realizado neste dia
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Indicadores de scroll */}
            <div className="flex justify-center gap-2 mt-4">
              <div className="h-1.5 w-1.5 rounded-full bg-zinc-700" />
              <div className="h-1.5 w-1.5 rounded-full bg-zinc-700" />
            </div>
          </div>
        </section>
      )}

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
