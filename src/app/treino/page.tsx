"use client";

import { useState, useEffect } from "react";
import { MonthlyCalendar } from "@/components/MonthlyCalendar";

function getDaysInMonth(year: number, month: number): Date[] {
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const days: Date[] = [];
  
  for (let i = 1; i <= lastDay.getDate(); i++) {
    days.push(new Date(year, month, i));
  }
  
  return days;
}

type Exercise = {
  id: string;
  name: string;
  sets: string;
  completed: boolean;
  weight?: number;
  minutes?: number;
  averageSpeed?: number;
  videoUrl?: string;
};

type WorkoutDay = {
  date: Date;
  dayOfWeek: string;
  dayLabel: string;
  muscleGroup: string;
  exercises: Exercise[];
  isWeekend: boolean;
};

function getWeekDates(): Date[] {
  const today = new Date();
  const currentDay = today.getDay();
  const monday = new Date(today);
  monday.setDate(today.getDate() - currentDay + 1);
  
  const week: Date[] = [];
  for (let i = 0; i < 7; i++) {
    const date = new Date(monday);
    date.setDate(monday.getDate() + i);
    week.push(date);
  }
  return week;
}

function getWorkoutForDate(date: Date, allWorkouts: WorkoutDay[]): WorkoutDay | null {
  const dayOfWeek = date.getDay();
  const dayNames = ["domingo", "segunda", "terca", "quarta", "quinta", "sexta", "sabado"];
  const dayName = dayNames[dayOfWeek];
  
  return allWorkouts.find(w => w.dayOfWeek === dayName) || null;
}

const mockWorkoutsByDay: Record<string, { muscleGroup: string; exercises: Omit<Exercise, "completed" | "weight">[] }> = {
  segunda: {
    muscleGroup: "Peito + Tríceps + Cardio leve",
    exercises: [
      { id: "1", name: "Supino reto", sets: "4x10" },
      { id: "2", name: "Supino inclinado", sets: "3x12" },
      { id: "3", name: "Crucifixo", sets: "3x15" },
      { id: "4", name: "Tríceps corda", sets: "3x12" },
      { id: "5", name: "Tríceps banco (ou coice)", sets: "3x12" },
      { id: "6", name: "Abdominal infra + prancha", sets: "3x20 / 3x30s" },
      { id: "7", name: "🚶‍♂️ Cardio leve na esteira (caminhada rápida)", sets: "" },
    ],
  },
  terca: {
    muscleGroup: "Costas + Bíceps + Cardio leve",
    exercises: [
      { id: "8", name: "Puxada frente pronada", sets: "4x10" },
      { id: "9", name: "Remada baixa ou cavalinho", sets: "3x12" },
      { id: "10", name: "Puxada neutra", sets: "3x12" },
      { id: "11", name: "Rosca direta", sets: "3x12" },
      { id: "12", name: "Rosca alternada (neutra)", sets: "3x12" },
      { id: "13", name: "Abdominal oblíquo", sets: "3x20" },
      { id: "14", name: "🚶‍♂️ Cardio leve (esteira ou escada inclinada)", sets: "" },
    ],
  },
  quarta: {
    muscleGroup: "Ombro + Trapézio + Abdômen + Cardio moderado",
    exercises: [
      { id: "15", name: "Desenvolvimento com halteres", sets: "4x10" },
      { id: "16", name: "Elevação lateral", sets: "3x15" },
      { id: "17", name: "Elevação frontal", sets: "3x12" },
      { id: "18", name: "Encolhimento (trapézio)", sets: "3x15" },
      { id: "19", name: "Abdominais (infra + prancha + oblíquos)", sets: "3x cada" },
      { id: "20", name: "🚶‍♂️ Cardio moderado (esteira inclinada ou bike)", sets: "" },
    ],
  },
  quinta: {
    muscleGroup: "PERNAS (dia pesado 1)",
    exercises: [
      { id: "21", name: "Agachamento livre", sets: "4x10" },
      { id: "22", name: "Afundo ou búlgaro", sets: "3x10" },
      { id: "23", name: "Leg Press", sets: "4x12" },
      { id: "24", name: "Cadeira extensora", sets: "3x15" },
      { id: "25", name: "Cadeira flexora", sets: "3x15" },
      { id: "26", name: "Panturrilha sentado", sets: "4x20" },
      { id: "27", name: "🚶‍♂️ Cardio leve pós-treino só pra soltar as pernas", sets: "" },
    ],
  },
  sexta: {
    muscleGroup: "Full Body + Cardio intenso",
    exercises: [
      { id: "28", name: "Supino reto", sets: "3x12" },
      { id: "29", name: "Remada curvada", sets: "3x12" },
      { id: "30", name: "Agachamento leve", sets: "3x12" },
      { id: "31", name: "Rosca direta + Tríceps corda (superset)", sets: "3x12" },
      { id: "32", name: "Abdominais + prancha", sets: "3 séries" },
      { id: "33", name: "🏃 Cardio intenso (esteira inclinada, caminhada forte, ou HIIT leve)", sets: "" },
    ],
  },
  sabado: {
    muscleGroup: "Cardio + Core (Opcional)",
    exercises: [
      { id: "34", name: "🚶 Caminhada ou esteira leve/moderada (130-145 bpm)", sets: "" },
      { id: "35", name: "Abdominais variados (infra, supra, prancha, lateral)", sets: "4x20" },
      { id: "36", name: "Alongamentos gerais + liberação miofascial", sets: "" },
    ],
  },
};

function ExerciseCard({
  exercise,
  onComplete,
}: {
  exercise: Exercise;
  onComplete: (id: string, weight?: number, minutes?: number, averageSpeed?: number) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [weight, setWeight] = useState<string>("");
  const [minutes, setMinutes] = useState<string>("");
  const [averageSpeed, setAverageSpeed] = useState<string>("");

  const isCardio = exercise.name.includes("🚶") || exercise.name.includes("🏃") || exercise.name.toLowerCase().includes("cardio");

  const handleComplete = () => {
    if (isCardio) {
      if (minutes && !isNaN(Number(minutes))) {
        onComplete(exercise.id, undefined, Number(minutes), averageSpeed ? Number(averageSpeed) : undefined);
        setIsOpen(false);
        setMinutes("");
        setAverageSpeed("");
      }
    } else {
      if (weight && !isNaN(Number(weight))) {
        onComplete(exercise.id, Number(weight));
        setIsOpen(false);
        setWeight("");
      }
    }
  };

  return (
    <div
      className={`rounded-2xl border transition-all ${
        exercise.completed
          ? "bg-emerald-500/10 border-emerald-500/40"
          : "bg-zinc-950/60 border-zinc-800/80"
      }`}
    >
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex w-full items-center justify-between gap-2 px-3 py-2.5 text-left sm:gap-3 sm:px-4 sm:py-3"
      >
        <div className="flex flex-1 items-center gap-3">
          {exercise.completed && <span className="text-lg">✅</span>}
          <div className="flex-1">
            <p
              className={`text-xs font-medium sm:text-sm ${
                exercise.completed ? "text-emerald-300" : "text-zinc-100"
              }`}
            >
              {exercise.name}
            </p>
            <p className="mt-0.5 text-[11px] text-zinc-400 sm:text-xs">
              {exercise.sets}
              {exercise.completed && (
                <>
                  {exercise.weight && (
                    <span className="ml-2 text-emerald-300">
                      • {exercise.weight}kg
                    </span>
                  )}
                  {exercise.minutes && (
                    <span className="ml-2 text-emerald-300">
                      • {exercise.minutes}min
                      {exercise.averageSpeed && ` • ${exercise.averageSpeed} km/h`}
                    </span>
                  )}
                </>
              )}
            </p>
          </div>
        </div>
        <span className="text-zinc-400">{isOpen ? "▲" : "▼"}</span>
      </button>

      {isOpen && !exercise.completed && (
        <div className="border-t border-zinc-800/80 px-3 py-2.5 space-y-2.5 sm:px-4 sm:py-3 sm:space-y-3">
          {exercise.videoUrl && (
            <button className="flex w-full items-center justify-center gap-2 rounded-xl border border-zinc-700/80 bg-zinc-900/60 px-3 py-2 text-xs text-zinc-300 hover:border-jagger-400/60 hover:text-jagger-100 transition-colors">
              <span>▶️</span>
              <span>Ver vídeo / GIF</span>
            </button>
          )}

          {isCardio ? (
            <>
              <div className="flex items-center gap-2">
                <label className="text-xs text-zinc-400 flex-1">
                  Minutos:
                </label>
                <input
                  type="number"
                  value={minutes}
                  onChange={(e) => setMinutes(e.target.value)}
                  placeholder="0"
                  className="w-24 rounded-lg border border-zinc-700/80 bg-zinc-900/60 px-2 py-1.5 text-sm text-zinc-100 placeholder:text-zinc-500 focus:border-jagger-400/60 focus:outline-none"
                />
              </div>
              <div className="flex items-center gap-2">
                <label className="text-xs text-zinc-400 flex-1">
                  Velocidade média (km/h):
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={averageSpeed}
                  onChange={(e) => setAverageSpeed(e.target.value)}
                  placeholder="0"
                  className="w-24 rounded-lg border border-zinc-700/80 bg-zinc-900/60 px-2 py-1.5 text-sm text-zinc-100 placeholder:text-zinc-500 focus:border-jagger-400/60 focus:outline-none"
                />
              </div>
            </>
          ) : (
            <div className="flex items-center gap-2">
              <label className="text-xs text-zinc-400 flex-1">
                Peso utilizado (kg):
              </label>
              <input
                type="number"
                value={weight}
                onChange={(e) => setWeight(e.target.value)}
                placeholder="0"
                className="w-20 rounded-lg border border-zinc-700/80 bg-zinc-900/60 px-2 py-1.5 text-sm text-zinc-100 placeholder:text-zinc-500 focus:border-jagger-400/60 focus:outline-none"
              />
            </div>
          )}

          <button
            onClick={handleComplete}
            disabled={isCardio ? (!minutes || isNaN(Number(minutes))) : (!weight || isNaN(Number(weight)))}
            className="w-full rounded-xl bg-jagger-600 px-4 py-2.5 text-sm font-medium text-zinc-50 transition-colors hover:bg-jagger-500 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Finalizar exercício
          </button>
        </div>
      )}
    </div>
  );
}

export default function TreinoPage() {
  const today = new Date();
  const [selectedDate, setSelectedDate] = useState<Date>(today);
  const [workouts, setWorkouts] = useState<Map<string, WorkoutDay>>(new Map());
  const [monthDays, setMonthDays] = useState<Array<{ date: Date }>>([]);

  useEffect(() => {
    const currentDate = new Date();
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const days = getDaysInMonth(year, month);
    
    setMonthDays(days.map((date) => ({ date })));

    const initialWorkouts = new Map<string, WorkoutDay>();

    days.forEach((date) => {
      const dayOfWeek = date.getDay();
      const dayNames = ["domingo", "segunda", "terca", "quarta", "quinta", "sexta", "sabado"];
      const dayName = dayNames[dayOfWeek];
      const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

      const workoutData = mockWorkoutsByDay[dayName];
      if (workoutData) {
        initialWorkouts.set(date.toISOString(), {
          date,
          dayOfWeek: dayName,
          dayLabel: dayName.charAt(0).toUpperCase() + dayName.slice(1),
          muscleGroup: workoutData.muscleGroup,
          exercises: workoutData.exercises.map((ex) => ({
            ...ex,
            completed: false,
          })),
          isWeekend,
        });
      } else if (dayOfWeek === 0) {
        // Domingo - descanso
        initialWorkouts.set(date.toISOString(), {
          date,
          dayOfWeek: dayName,
          dayLabel: "Domingo",
          muscleGroup: "Descanso",
          exercises: [],
          isWeekend: true,
        });
      }
    });

    setWorkouts(initialWorkouts);
    // Garantir que o dia atual está selecionado
    setSelectedDate(currentDate);
  }, []);

  const currentWorkout = workouts.get(selectedDate.toISOString());

  const handleCompleteExercise = (exerciseId: string, weight?: number, minutes?: number, averageSpeed?: number) => {
    setWorkouts((prev) => {
      const newWorkouts = new Map(prev);
      const workout = newWorkouts.get(selectedDate.toISOString());
      if (workout) {
        workout.exercises = workout.exercises.map((ex) =>
          ex.id === exerciseId
            ? { ...ex, completed: true, weight, minutes, averageSpeed }
            : ex
        );
        newWorkouts.set(selectedDate.toISOString(), workout);
      }
      return newWorkouts;
    });
  };

  const getDayStatus = (workout: WorkoutDay | undefined) => {
    if (!workout || workout.exercises.length === 0) {
      return { completed: 0, total: 0, percentage: 0 };
    }
    const completed = workout.exercises.filter((e) => e.completed).length;
    const total = workout.exercises.length;
    return { completed, total, percentage: (completed / total) * 100 };
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
      <header className="flex flex-col gap-2">
        <div>
          <p className="text-xs uppercase tracking-[0.25em] text-jagger-300/80">
            Protocolo de Treino
          </p>
          <h2 className="mt-1 text-2xl font-semibold text-zinc-50">
            Rotina Semanal
          </h2>
          <p className="mt-1 text-xs text-zinc-400">
            Arraste os dias para navegar. Dia atual destacado.
          </p>
        </div>
      </header>

      {/* Calendário Mensal */}
      <MonthlyCalendar
        days={monthDays}
        onDayClick={setSelectedDate}
        getDayStatus={(date) => {
          const workout = workouts.get(date.toISOString());
          return getDayStatus(workout);
        }}
        formatDayLabel={(date) => {
          const dayOfWeek = date.getDay();
          const dayNames = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
          return dayNames[dayOfWeek];
        }}
      />

      {/* Lista de exercícios do dia selecionado */}
      {currentWorkout && currentWorkout.exercises.length > 0 && (
        <section className="glass-panel flex flex-1 flex-col rounded-3xl p-4">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-medium text-zinc-100">
                {currentWorkout.dayLabel} - {currentWorkout.muscleGroup}
              </h3>
              <p className="mt-0.5 text-xs text-zinc-400">
                {getDayStatus(currentWorkout).completed} de{" "}
                {getDayStatus(currentWorkout).total} exercícios concluídos
              </p>
            </div>
          </div>

          <div className="flex-1 space-y-2.5 overflow-y-auto">
            {currentWorkout.exercises.map((exercise) => (
              <ExerciseCard
                key={exercise.id}
                exercise={exercise}
                onComplete={(id, weight, minutes, averageSpeed) =>
                  handleCompleteExercise(id, weight, minutes, averageSpeed)
                }
              />
            ))}
          </div>

          {getDayStatus(currentWorkout).percentage === 100 && (
            <div className="mt-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/40 px-4 py-3 text-center">
              <p className="text-sm font-medium text-emerald-300">
                ✅ Treino completo! Missão cumprida.
              </p>
            </div>
          )}
        </section>
      )}

      {currentWorkout && currentWorkout.exercises.length === 0 && (
        <section className="glass-panel rounded-3xl p-4 text-center">
          <div className="flex flex-col items-center gap-3">
            <p className="text-lg">😴</p>
            <div>
              <p className="text-sm font-medium text-zinc-100">
                {currentWorkout.dayLabel} - {currentWorkout.muscleGroup}
              </p>
              <p className="mt-2 text-sm text-zinc-400">
                Dia de descanso. Aproveite para recuperar!
              </p>
            </div>
          </div>
        </section>
      )}

      {!currentWorkout && (
        <section className="glass-panel rounded-3xl p-4 text-center">
          <p className="text-sm text-zinc-400">
            Nenhum treino configurado para este dia.
          </p>
        </section>
      )}
    </div>
  );
}
