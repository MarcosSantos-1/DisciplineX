"use client";

import { useState, useEffect } from "react";
import { MonthlyCalendar } from "@/components/MonthlyCalendar";
import { 
  PhysicalActivity, 
  ACTIVITY_TEMPLATES, 
  ActivityTemplate,
  calculateBMR,
  calculateAge,
  calculateActivityCalories,
  UserProfile
} from "@/types/meals";

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

// Dados do usuário (depois virá do perfil/Firebase)
const USER_PROFILE: UserProfile = {
  weight: 94, // kg
  height: 165, // cm
  birthDate: "2003-06-15", // YYYY-MM-DD
  gender: "male",
  leanBodyMass: 63.4, // kg - Massa magra (usa Katch-McArdle)
  // bodyFatPercentage: 32.55, // % - Alternativa: pode calcular massa magra a partir disso
};

// Calcular TMB - usa Katch-McArdle se tiver massa magra, senão Mifflin-St Jeor
const USER_BMR = calculateBMR(USER_PROFILE);

// Função para determinar MET baseado no tipo de exercício
function getExerciseMET(exerciseName: string, minutes?: number, averageSpeed?: number): number {
  const name = exerciseName.toLowerCase();
  
  // Cardio baseado em velocidade/intensidade
  if (name.includes("🚶") || name.includes("caminhada")) {
    if (averageSpeed) {
      // Caminhada baseada na velocidade média
      if (averageSpeed >= 6) return 4.5; // Rápida (6-7 km/h)
      if (averageSpeed >= 5) return 3.8; // Moderada (5-6 km/h)
      return 3.0; // Leve (4-5 km/h)
    }
    return 3.8; // Padrão: moderada
  }
  
  if (name.includes("🏃") || name.includes("corrida") || name.includes("run")) {
    if (averageSpeed) {
      if (averageSpeed >= 10) return 10.0; // 10 km/h
      if (averageSpeed >= 8.5) return 8.3; // 8.5 km/h
      return 7.0; // 7 km/h
    }
    return 8.3; // Padrão: 8.5 km/h
  }
  
  if (name.includes("bicicleta") || name.includes("bike") || name.includes("🚴")) {
    if (averageSpeed) {
      if (averageSpeed >= 21) return 10.0; // Intensa (21-30 km/h)
      if (averageSpeed >= 16) return 6.8; // Moderada (16-20 km/h)
      return 4.0; // Leve (10-15 km/h)
    }
    return 6.8; // Padrão: moderada
  }
  
  if (name.includes("natação") || name.includes("swim") || name.includes("🏊")) {
    // Assumir moderada por padrão
    return 8.0;
  }
  
  // Musculação - sempre usar MET 6.0 (moderada)
  // Se não tiver minutos informados, estimar baseado em séries
  return 6.0;
}

// Função para estimar duração de um exercício de musculação
// Baseado em séries típicas: ~2 min por série (descanso + execução)
function estimateStrengthDuration(exerciseName: string): number {
  // Tentar extrair número de séries do nome ou usar padrão
  const seriesMatch = exerciseName.match(/(\d+)\s*(?:x|×|series|séries)/i);
  if (seriesMatch) {
    const series = parseInt(seriesMatch[1]);
    return series * 2; // 2 min por série
  }
  // Padrão: 4 séries = 8 minutos
  return 8;
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
  const [showActivityModal, setShowActivityModal] = useState(false);
  const [activities, setActivities] = useState<PhysicalActivity[]>([]);

  useEffect(() => {
    // Verificar se estamos no navegador
    if (typeof window === "undefined") return;
    
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
      const dateKey = date.toISOString().split("T")[0];
      const dateISO = date.toISOString();

      // Primeiro, verificar se há treino salvo no localStorage
      const saved = localStorage.getItem(`workout_${dateKey}`);
      if (saved) {
        try {
          const savedWorkout = JSON.parse(saved);
          // Garantir que a data está correta
          savedWorkout.date = date;
          initialWorkouts.set(dateISO, savedWorkout);
        } catch (e) {
          console.error("Erro ao carregar treino salvo:", e);
          // Se der erro, criar treino padrão
          const workoutData = mockWorkoutsByDay[dayName];
          if (workoutData) {
            initialWorkouts.set(dateISO, {
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
            initialWorkouts.set(dateISO, {
              date,
              dayOfWeek: dayName,
              dayLabel: "Domingo",
              muscleGroup: "Descanso",
              exercises: [],
              isWeekend: true,
            });
          }
        }
      } else {
        // Se não há treino salvo, criar treino padrão
        const workoutData = mockWorkoutsByDay[dayName];
        if (workoutData) {
          initialWorkouts.set(dateISO, {
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
          initialWorkouts.set(dateISO, {
            date,
            dayOfWeek: dayName,
            dayLabel: "Domingo",
            muscleGroup: "Descanso",
            exercises: [],
            isWeekend: true,
          });
        }
      }
    });

    setWorkouts(initialWorkouts);
    // Garantir que o dia atual está selecionado
    setSelectedDate(currentDate);
  }, []);

  // Carregar atividades quando a data muda
  useEffect(() => {
    // Verificar se estamos no navegador
    if (typeof window === "undefined") return;
    
    const dateKey = selectedDate.toISOString().split("T")[0];
    const saved = localStorage.getItem(`activities_${dateKey}`);
    if (saved) {
      try {
        setActivities(JSON.parse(saved));
      } catch (e) {
        console.error("Erro ao carregar atividades:", e);
        setActivities([]);
      }
    } else {
      setActivities([]);
    }
  }, [selectedDate]);

  const currentWorkout = workouts.get(selectedDate.toISOString());
  const dateKey = selectedDate.toISOString().split("T")[0];

  // Calcular gasto calórico do dia
  const dailyCalorieExpenditure = (() => {
    const activityCalories = activities.reduce((sum, activity) => sum + activity.caloriesBurned, 0);
    return {
      bmr: USER_BMR,
      activities: activities,
      total: USER_BMR + activityCalories,
    };
  })();

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
        
        // Salvar treino no localStorage
        const dateKey = selectedDate.toISOString().split("T")[0];
        localStorage.setItem(`workout_${dateKey}`, JSON.stringify(workout));
        
        // Disparar evento para atualizar checklist
        window.dispatchEvent(new CustomEvent("workoutUpdated", { detail: { dateKey } }));
      }
      return newWorkouts;
    });

    // Salvar atividade física para cálculo de gasto calórico usando METs
    const exercise = currentWorkout?.exercises.find((ex) => ex.id === exerciseId);
    if (exercise) {
      const dateKey = selectedDate.toISOString().split("T")[0];
      
      // Determinar MET e duração
      const met = getExerciseMET(exercise.name, minutes, averageSpeed);
      let durationMinutes = minutes;
      
      // Se não tiver minutos informados e for musculação, estimar
      if (!durationMinutes) {
        const isStrength = !exercise.name.includes("🚶") && 
                          !exercise.name.includes("🏃") && 
                          !exercise.name.toLowerCase().includes("cardio") &&
                          !exercise.name.toLowerCase().includes("caminhada") &&
                          !exercise.name.toLowerCase().includes("corrida");
        if (isStrength) {
          durationMinutes = estimateStrengthDuration(exercise.name);
        } else {
          // Para cardio sem minutos, não calcular (precisa de duração)
          return;
        }
      }
      
      // Calcular calorias usando METs
      const caloriesBurned = calculateActivityCalories(
        met,
        USER_PROFILE.weight,
        durationMinutes
      );

      if (caloriesBurned > 0) {
        const isCardio = exercise.name.includes("🚶") || 
                        exercise.name.includes("🏃") || 
                        exercise.name.toLowerCase().includes("cardio") ||
                        exercise.name.toLowerCase().includes("caminhada") ||
                        exercise.name.toLowerCase().includes("corrida") ||
                        exercise.name.toLowerCase().includes("bicicleta") ||
                        exercise.name.toLowerCase().includes("natação");
        
        const activity: PhysicalActivity = {
          id: `activity_${exerciseId}_${Date.now()}`,
          name: exercise.name,
          type: isCardio ? "walking" : "workout",
          caloriesBurned,
          duration: durationMinutes,
          date: dateKey,
          met: met,
        };

        // Carregar atividades existentes
        const saved = localStorage.getItem(`activities_${dateKey}`);
        let activities: PhysicalActivity[] = [];
        if (saved) {
          try {
            activities = JSON.parse(saved);
          } catch (e) {
            console.error("Erro ao carregar atividades:", e);
          }
        }

        // Adicionar nova atividade (evitar duplicatas)
        const existingIndex = activities.findIndex((a) => a.id === activity.id);
        if (existingIndex >= 0) {
          activities[existingIndex] = activity;
        } else {
          activities.push(activity);
        }

        // Salvar atividades
        localStorage.setItem(`activities_${dateKey}`, JSON.stringify(activities));

        // Disparar evento para atualizar dashboard
        window.dispatchEvent(new CustomEvent("activitiesUpdated", { detail: { dateKey, activities } }));
      }
    }
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
        days={monthDays.map(day => ({
          ...day,
          score: null, // Score vem do checklist, não do treino
        }))}
        onDayClick={setSelectedDate}
        getDayStatus={(date) => {
          // Verificar se estamos no navegador
          if (typeof window === "undefined") return null;
          
          // Carregar do localStorage para garantir que está atualizado
          const dateKey = date.toISOString().split("T")[0];
          const saved = localStorage.getItem(`workout_${dateKey}`);
          if (saved) {
            try {
              const workout = JSON.parse(saved);
              return getDayStatus(workout);
            } catch (e) {
              console.error("Erro ao carregar treino:", e);
            }
          }
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

          {/* Gasto Calórico do Dia */}
          <div className="mb-4 rounded-2xl bg-zinc-950/60 border border-zinc-800 p-3">
            <div className="mb-3">
              <h4 className="text-xs font-medium text-zinc-300">⚡ Gasto Calórico do Dia</h4>
            </div>
            <div className="grid grid-cols-3 gap-2 text-xs mb-3">
              <div className="text-center">
                <p className="text-[10px] text-zinc-400 mb-1">TMB</p>
                <p className="text-sm font-semibold text-zinc-200">{dailyCalorieExpenditure.bmr}</p>
                <p className="text-[10px] text-zinc-500">kcal</p>
              </div>
              <div className="text-center">
                <p className="text-[10px] text-zinc-400 mb-1">Atividades</p>
                <p className="text-sm font-semibold text-emerald-300">
                  {dailyCalorieExpenditure.activities.reduce((sum, a) => sum + a.caloriesBurned, 0)}
                </p>
                <p className="text-[10px] text-zinc-500">kcal</p>
              </div>
              <div className="text-center">
                <p className="text-[10px] text-zinc-400 mb-1">Total</p>
                <p className="text-sm font-semibold text-jagger-300">{dailyCalorieExpenditure.total}</p>
                <p className="text-[10px] text-zinc-500">kcal</p>
              </div>
            </div>
            <button
              onClick={() => setShowActivityModal(true)}
              className="w-full rounded-xl border border-dashed border-zinc-700 bg-zinc-900/60 px-3 py-2 text-[11px] text-zinc-300 hover:border-emerald-400/60 hover:text-emerald-100 transition-colors"
            >
              + Adicionar atividade
            </button>
            {activities.length > 0 && (
              <div className="mt-3 space-y-1.5">
                {activities.map((activity) => (
                  <div
                    key={activity.id}
                    className="flex items-center justify-between rounded-xl bg-zinc-900/60 px-2.5 py-1.5 text-[11px]"
                  >
                    <span className="text-zinc-300">{activity.name}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-zinc-400">{activity.duration}min</span>
                      <span className="text-emerald-300 font-medium">{activity.caloriesBurned} kcal</span>
                      <button
                        onClick={() => {
                          const updated = activities.filter((a) => a.id !== activity.id);
                          setActivities(updated);
                          localStorage.setItem(`activities_${dateKey}`, JSON.stringify(updated));
                          window.dispatchEvent(new CustomEvent("activitiesUpdated", { detail: { dateKey, activities: updated } }));
                        }}
                        className="text-zinc-500 hover:text-red-400 transition-colors"
                        title="Remover"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
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
        <section className="glass-panel rounded-3xl p-4">
          <div className="flex flex-col items-center gap-3 text-center mb-4">
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

          {/* Gasto Calórico do Dia (também em dias de descanso) */}
          <div className="rounded-2xl bg-zinc-950/60 border border-zinc-800 p-3">
            <div className="mb-3">
              <h4 className="text-xs font-medium text-zinc-300">⚡ Gasto Calórico do Dia</h4>
            </div>
            <div className="grid grid-cols-3 gap-2 text-xs mb-3">
              <div className="text-center">
                <p className="text-[10px] text-zinc-400 mb-1">TMB</p>
                <p className="text-sm font-semibold text-zinc-200">{dailyCalorieExpenditure.bmr}</p>
                <p className="text-[10px] text-zinc-500">kcal</p>
              </div>
              <div className="text-center">
                <p className="text-[10px] text-zinc-400 mb-1">Atividades</p>
                <p className="text-sm font-semibold text-emerald-300">
                  {dailyCalorieExpenditure.activities.reduce((sum, a) => sum + a.caloriesBurned, 0)}
                </p>
                <p className="text-[10px] text-zinc-500">kcal</p>
              </div>
              <div className="text-center">
                <p className="text-[10px] text-zinc-400 mb-1">Total</p>
                <p className="text-sm font-semibold text-jagger-300">{dailyCalorieExpenditure.total}</p>
                <p className="text-[10px] text-zinc-500">kcal</p>
              </div>
            </div>
            <button
              onClick={() => setShowActivityModal(true)}
              className="w-full rounded-xl border border-dashed border-zinc-700 bg-zinc-900/60 px-3 py-2 text-[11px] text-zinc-300 hover:border-emerald-400/60 hover:text-emerald-100 transition-colors"
            >
              + Adicionar atividade
            </button>
            {activities.length > 0 && (
              <div className="mt-3 space-y-1.5">
                {activities.map((activity) => (
                  <div
                    key={activity.id}
                    className="flex items-center justify-between rounded-xl bg-zinc-900/60 px-2.5 py-1.5 text-[11px]"
                  >
                    <span className="text-zinc-300">{activity.name}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-zinc-400">{activity.duration}min</span>
                      <span className="text-emerald-300 font-medium">{activity.caloriesBurned} kcal</span>
                      <button
                        onClick={() => {
                          const updated = activities.filter((a) => a.id !== activity.id);
                          setActivities(updated);
                          localStorage.setItem(`activities_${dateKey}`, JSON.stringify(updated));
                          window.dispatchEvent(new CustomEvent("activitiesUpdated", { detail: { dateKey, activities: updated } }));
                        }}
                        className="text-zinc-500 hover:text-red-400 transition-colors"
                        title="Remover"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
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

      {/* Modal para adicionar atividade */}
      {showActivityModal && (
        <ActivityModal
          dateKey={dateKey}
          onClose={() => setShowActivityModal(false)}
          onAddActivity={(activity) => {
            const updated = [...activities, activity];
            setActivities(updated);
            localStorage.setItem(`activities_${dateKey}`, JSON.stringify(updated));
            window.dispatchEvent(new CustomEvent("activitiesUpdated", { detail: { dateKey, activities: updated } }));
            setShowActivityModal(false);
          }}
        />
      )}
    </div>
  );
}

// Componente Modal para adicionar atividade
function ActivityModal({
  dateKey,
  onClose,
  onAddActivity,
}: {
  dateKey: string;
  onClose: () => void;
  onAddActivity: (activity: PhysicalActivity) => void;
}) {
  const [selectedTemplate, setSelectedTemplate] = useState<ActivityTemplate | null>(null);
  const [duration, setDuration] = useState<string>("");
  const [showDropdown, setShowDropdown] = useState(false);

  const handleAdd = () => {
    if (!selectedTemplate || !duration || isNaN(Number(duration))) {
      alert("Selecione uma atividade e informe a duração");
      return;
    }

    const durationMinutes = Number(duration);
    const caloriesBurned = calculateActivityCalories(
      selectedTemplate.met,
      USER_PROFILE.weight,
      durationMinutes
    );
    
    const activity: PhysicalActivity = {
      id: `activity_${selectedTemplate.id}_${Date.now()}`,
      name: selectedTemplate.name,
      type: selectedTemplate.category === "walking" ? "walking" : 
            selectedTemplate.category === "strength" ? "workout" :
            selectedTemplate.category === "martial_arts" ? "sports" : "other",
      caloriesBurned,
      duration: durationMinutes,
      date: dateKey,
      met: selectedTemplate.met,
    };

    onAddActivity(activity);
  };

  // Fechar dropdown ao clicar fora
  useEffect(() => {
    const handleClickOutside = () => {
      setShowDropdown(false);
    };
    if (showDropdown) {
      document.addEventListener("click", handleClickOutside);
      return () => document.removeEventListener("click", handleClickOutside);
    }
  }, [showDropdown]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-md rounded-3xl bg-zinc-900 p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-zinc-100">Adicionar Atividade</h3>
          <button
            onClick={onClose}
            className="rounded-full p-2 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100 transition-colors"
          >
            ✕
          </button>
        </div>

        <div className="space-y-4">
          {/* Dropdown de atividades */}
          <div className="relative">
            <label className="mb-2 block text-sm font-medium text-zinc-300">
              Atividade
            </label>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowDropdown(!showDropdown);
              }}
              className="w-full rounded-xl border border-zinc-700 bg-zinc-950/60 px-4 py-3 text-left text-sm text-zinc-100 focus:border-emerald-500/50 focus:outline-none flex items-center justify-between"
            >
              <span>{selectedTemplate ? selectedTemplate.name : "Selecione uma atividade..."}</span>
              <span className="text-zinc-500">{showDropdown ? "▲" : "▼"}</span>
            </button>
            {showDropdown && (
              <div 
                className="absolute z-10 mt-2 max-h-60 w-full overflow-y-auto rounded-xl border border-zinc-700 bg-zinc-900 shadow-xl"
                onClick={(e) => e.stopPropagation()}
              >
                {ACTIVITY_TEMPLATES.map((template) => (
                  <button
                    key={template.id}
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedTemplate(template);
                      setShowDropdown(false);
                    }}
                    className="w-full px-4 py-2 text-left text-sm text-zinc-100 hover:bg-zinc-800 transition-colors"
                  >
                    {template.name}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Duração */}
          <div>
            <label className="mb-2 block text-sm font-medium text-zinc-300">
              Duração (minutos)
            </label>
            <input
              type="number"
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
              placeholder="Ex: 30"
              className="w-full rounded-xl border border-zinc-700 bg-zinc-950/60 px-4 py-3 text-sm text-zinc-100 focus:border-emerald-500/50 focus:outline-none"
            />
          </div>

          {/* Preview do cálculo */}
          {selectedTemplate && duration && !isNaN(Number(duration)) && (
            <div className="rounded-xl bg-zinc-950/60 border border-zinc-800 p-3">
              <p className="text-xs text-zinc-400 mb-1">Estimativa de calorias:</p>
              <p className="text-lg font-semibold text-emerald-300">
                {calculateActivityCalories(
                  selectedTemplate.met,
                  USER_PROFILE.weight,
                  Number(duration)
                )}{" "}
                kcal
              </p>
              <p className="text-[10px] text-zinc-500 mt-1">
                MET: {selectedTemplate.met} × {USER_PROFILE.weight}kg × {Number(duration) / 60}h
              </p>
            </div>
          )}

          {/* Botões */}
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 rounded-xl border border-zinc-700 px-4 py-3 text-sm font-medium text-zinc-300 hover:bg-zinc-800 transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={handleAdd}
              disabled={!selectedTemplate || !duration || isNaN(Number(duration))}
              className="flex-1 rounded-xl bg-emerald-500/20 px-4 py-3 text-sm font-medium text-emerald-300 hover:bg-emerald-500/30 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Adicionar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
