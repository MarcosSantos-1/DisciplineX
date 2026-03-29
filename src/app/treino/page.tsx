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
import { workoutService } from "@/lib/firebaseService";
import {
  getCompletedExerciseCount,
  isWorkoutDayCompleted,
  MIN_COMPLETED_EXERCISES_FOR_WORKOUT_DAY,
} from "@/lib/workoutProgress";
import {
  getSelectedExercise,
  hasAlternativeExercise,
  isCardioExercise,
  type ExerciseAlternative,
  type ExerciseSelection,
  type ExerciseType,
} from "@/lib/workoutExercise";

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
  sets: string | number;
  completed: boolean;
  weight?: number;
  minutes?: number;
  averageSpeed?: number;
  videoUrl?: string; // URL do YouTube
  // Novos campos da página de ajustes
  type?: ExerciseType;
  rest?: number; // segundos - obrigatório
  reps?: string;
  intensity?: string;
  activityTemplateId?: string;
  alternative?: ExerciseAlternative;
  selectedOption?: ExerciseSelection;
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

function normalizeAlternativeExercise(exercise: Exercise, alternative?: any): ExerciseAlternative | undefined {
  if (!alternative) return undefined;

  return {
    ...alternative,
    sets: typeof alternative.sets === "number"
      ? alternative.sets
      : (typeof alternative.sets === "string" ? parseInt(alternative.sets) || 0 : undefined),
    reps: alternative.reps || "",
    rest: alternative.rest !== undefined ? alternative.rest : (exercise.type === "cardio" ? 30 : 60),
    videoUrl: alternative.videoUrl || undefined,
    intensity: alternative.intensity || undefined,
    activityTemplateId: alternative.activityTemplateId || undefined,
  };
}

function normalizeWorkoutExercise(exercise: any): Exercise {
  let setsValue: string | number = exercise.sets || "";
  if (typeof exercise.sets === "number" && exercise.reps) {
    setsValue = `${exercise.sets}x${exercise.reps}`;
  } else if (typeof exercise.sets === "number") {
    setsValue = exercise.sets;
  } else if (typeof exercise.sets === "string") {
    setsValue = exercise.sets;
  }

  const normalizedExercise: Exercise = {
    ...exercise,
    sets: setsValue,
    rest: exercise.rest !== undefined ? exercise.rest : 0,
    videoUrl: exercise.videoUrl || undefined,
    type: exercise.type || undefined,
    reps: exercise.reps || undefined,
    intensity: exercise.intensity || undefined,
    activityTemplateId: exercise.activityTemplateId || undefined,
    selectedOption: exercise.selectedOption === "alternative" ? "alternative" : "primary",
  };

  const alternative = normalizeAlternativeExercise(normalizedExercise, exercise.alternative);
  if (alternative) {
    normalizedExercise.alternative = alternative;
  }

  return normalizedExercise;
}

function formatAlternativeForStorage(alternative?: ExerciseAlternative) {
  if (!alternative) return undefined;

  return {
    name: alternative.name,
    sets: typeof alternative.sets === "number"
      ? alternative.sets
      : (typeof alternative.sets === "string" ? parseInt(alternative.sets) || 0 : undefined),
    reps: alternative.reps || "",
    rest: alternative.rest,
    weight: alternative.weight,
    minutes: alternative.minutes,
    averageSpeed: alternative.averageSpeed,
    videoUrl: alternative.videoUrl,
    intensity: alternative.intensity,
    activityTemplateId: alternative.activityTemplateId,
  };
}

function formatExerciseForStorage(exercise: Exercise) {
  const formattedExercise: any = {
    id: exercise.id,
    name: exercise.name,
    type: exercise.type || "strength",
    sets: typeof exercise.sets === "number" ? exercise.sets : (typeof exercise.sets === "string" ? parseInt(exercise.sets) || 0 : 0),
    reps: exercise.reps || "",
    rest: exercise.rest !== undefined ? exercise.rest : (exercise.type === "cardio" ? 30 : 60),
    completed: exercise.completed,
    selectedOption: exercise.selectedOption || "primary",
  };

  if (exercise.weight !== undefined) formattedExercise.weight = exercise.weight;
  if (exercise.minutes !== undefined) formattedExercise.minutes = exercise.minutes;
  if (exercise.averageSpeed !== undefined) formattedExercise.averageSpeed = exercise.averageSpeed;
  if (exercise.videoUrl) formattedExercise.videoUrl = exercise.videoUrl;
  if (exercise.intensity) formattedExercise.intensity = exercise.intensity;
  if (exercise.activityTemplateId) formattedExercise.activityTemplateId = exercise.activityTemplateId;

  const alternative = formatAlternativeForStorage(exercise.alternative);
  if (alternative) {
    formattedExercise.alternative = alternative;
  }

  return formattedExercise;
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

// Componente para exibir vídeo do YouTube
function VideoPlayer({ url }: { url: string }) {
  const [showVideo, setShowVideo] = useState(false);
  
  // Extrair ID do vídeo do YouTube
  const getYouTubeVideoId = (url: string): string | null => {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url.match(regExp);
    return match && match[2].length === 11 ? match[2] : null;
  };

  const videoId = getYouTubeVideoId(url);
  
  if (!videoId) {
    return (
      <div className="rounded-xl border border-red-500/50 bg-red-500/10 px-3 py-2 text-xs text-red-300">
        URL do YouTube inválida
      </div>
    );
  }

  if (!showVideo) {
    return (
      <button
        onClick={() => setShowVideo(true)}
        className="flex w-full items-center justify-center gap-2 rounded-xl border border-zinc-700/80 bg-zinc-900/60 px-3 py-2 text-xs text-zinc-300 hover:border-jagger-400/60 hover:text-jagger-100 transition-colors"
      >
        <span>▶️</span>
        <span>Ver vídeo do YouTube</span>
      </button>
    );
  }

  return (
    <div className="space-y-2">
      <div className="relative w-full overflow-hidden rounded-xl" style={{ paddingBottom: "56.25%" }}>
        <iframe
          className="absolute top-0 left-0 h-full w-full"
          src={`https://www.youtube.com/embed/${videoId}`}
          title="YouTube video player"
          frameBorder="0"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      </div>
      <button
        onClick={() => setShowVideo(false)}
        className="w-full rounded-lg border border-zinc-700/80 bg-zinc-950/60 px-3 py-2 text-xs text-zinc-400 hover:border-zinc-600 hover:text-zinc-200 transition-colors"
      >
        Fechar vídeo
      </button>
    </div>
  );
}

// Função para buscar record da semana para um exercício
async function getWeeklyRecord(exerciseName: string, exerciseId: string): Promise<number | null> {
  if (typeof window === "undefined") return null;
  
  try {
    const today = new Date();
    const currentDay = today.getDay();
    const monday = new Date(today);
    monday.setDate(today.getDate() - currentDay + 1);
    monday.setHours(0, 0, 0, 0);
    
    let maxWeight = 0;
    
    // Buscar treinos dos últimos 7 dias
    for (let i = 0; i < 7; i++) {
      const date = new Date(monday);
      date.setDate(monday.getDate() + i);
      const dateKey = date.toISOString().split("T")[0];
      
      try {
        const workout = await workoutService.getWorkout(dateKey);
        if (workout && workout.exercises) {
          const exercise = workout.exercises.find((ex: any) => 
            ex.id === exerciseId || ex.name === exerciseName
          );
          if (exercise && exercise.weight && exercise.weight > maxWeight) {
            maxWeight = exercise.weight;
          }
        }
      } catch (e) {
        // Ignorar erros
      }
    }
    
    return maxWeight > 0 ? maxWeight : null;
  } catch (e) {
    console.error("Erro ao buscar record:", e);
    return null;
  }
}

function ExerciseCard({
  exercise,
  onComplete,
  onUpdate,
  onSelectOption,
}: {
  exercise: Exercise;
  onComplete: (id: string, weight?: number, minutes?: number, averageSpeed?: number) => void;
  onUpdate?: (id: string, weight?: number, minutes?: number, averageSpeed?: number) => void;
  onSelectOption?: (id: string, option: ExerciseSelection) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [weight, setWeight] = useState<string>(exercise.weight?.toString() || "");
  const [minutes, setMinutes] = useState<string>(exercise.minutes?.toString() || "");
  const [averageSpeed, setAverageSpeed] = useState<string>(exercise.averageSpeed?.toString() || "");
  const [weeklyRecord, setWeeklyRecord] = useState<number | null>(null);
  const selectedExercise = getSelectedExercise(exercise);
  const isCardio = isCardioExercise(exercise);
  const hasAlternative = hasAlternativeExercise(exercise);

  // Buscar record da semana quando o componente montar ou quando o exercício mudar
  useEffect(() => {
    if (!isCardio && exercise.id) {
      getWeeklyRecord(selectedExercise.name, exercise.id).then(setWeeklyRecord);
    }
  }, [exercise.id, selectedExercise.name, isCardio]);

  // Atualizar valores quando o exercício mudar
  useEffect(() => {
    setWeight((exercise.weight ?? selectedExercise.weight)?.toString() || "");
    setMinutes((exercise.minutes ?? selectedExercise.minutes)?.toString() || "");
    setAverageSpeed((exercise.averageSpeed ?? selectedExercise.averageSpeed)?.toString() || "");
  }, [
    exercise.weight,
    exercise.minutes,
    exercise.averageSpeed,
    selectedExercise.weight,
    selectedExercise.minutes,
    selectedExercise.averageSpeed,
  ]);

  const handleComplete = () => {
    if (isCardio) {
      if (minutes && !isNaN(Number(minutes))) {
        if (exercise.completed && onUpdate) {
          onUpdate(exercise.id, undefined, Number(minutes), averageSpeed ? Number(averageSpeed) : undefined);
        } else {
          onComplete(exercise.id, undefined, Number(minutes), averageSpeed ? Number(averageSpeed) : undefined);
        }
        setIsOpen(false);
      }
    } else {
      if (weight && !isNaN(Number(weight))) {
        if (exercise.completed && onUpdate) {
          onUpdate(exercise.id, Number(weight));
        } else {
          onComplete(exercise.id, Number(weight));
        }
        setIsOpen(false);
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
              {selectedExercise.name}
            </p>
            <p className="mt-0.5 text-[11px] text-zinc-400 sm:text-xs">
              {isCardio ? (
                // Para cardio, não mostrar séries/reps, apenas o nome completo
                selectedExercise.name.includes("🚶") || selectedExercise.name.includes("🏃") || selectedExercise.name.toLowerCase().includes("cardio")
                  ? "" // Cardio mostra apenas o nome completo no título
                  : selectedExercise.minutes 
                    ? `${selectedExercise.minutes} min`
                    : ""
              ) : (
                // Para exercícios de força
                (() => {
                  // Se sets é string como "3x12", usar diretamente
                  if (typeof selectedExercise.sets === "string" && selectedExercise.sets.includes("x")) {
                    return selectedExercise.sets;
                  }
                  // Se sets é número e tem reps, formatar como "3x12"
                  if (typeof selectedExercise.sets === "number" && selectedExercise.reps) {
                    return `${selectedExercise.sets}x${selectedExercise.reps}`;
                  }
                  // Se sets é string mas não tem "x", usar como está
                  if (typeof selectedExercise.sets === "string" && selectedExercise.sets) {
                    return selectedExercise.sets;
                  }
                  // Se sets é número mas não tem reps, mostrar apenas o número
                  if (typeof selectedExercise.sets === "number") {
                    return selectedExercise.sets.toString();
                  }
                  return "";
                })() + (selectedExercise.rest !== undefined && selectedExercise.rest !== null && selectedExercise.rest >= 0 ? ` • ${selectedExercise.rest}s descanso` : "")
              )}
              {exercise.completed && (
                <>
                  {exercise.weight && (
                    <span className="ml-2 text-emerald-300">
                      • {exercise.weight}kg
                    </span>
                  )}
                  {exercise.minutes && !isCardio && (
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

      {isOpen && (
        <div className="border-t border-zinc-800/80 px-3 py-2.5 space-y-2.5 sm:px-4 sm:py-3 sm:space-y-3">
          {hasAlternative && onSelectOption && (
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => onSelectOption(exercise.id, "primary")}
                className={`rounded-xl border px-3 py-2 text-xs transition-colors ${
                  (exercise.selectedOption || "primary") === "primary"
                    ? "border-jagger-400 bg-jagger-500/20 text-jagger-200"
                    : "border-zinc-700/80 bg-zinc-900/60 text-zinc-400 hover:border-zinc-600"
                }`}
              >
                Principal
              </button>
              <button
                onClick={() => onSelectOption(exercise.id, "alternative")}
                className={`rounded-xl border px-3 py-2 text-xs transition-colors ${
                  exercise.selectedOption === "alternative"
                    ? "border-jagger-400 bg-jagger-500/20 text-jagger-200"
                    : "border-zinc-700/80 bg-zinc-900/60 text-zinc-400 hover:border-zinc-600"
                }`}
              >
                Alternativa
              </button>
            </div>
          )}

          {selectedExercise.videoUrl && selectedExercise.videoUrl.trim() !== "" && (
            <VideoPlayer url={selectedExercise.videoUrl} />
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
                placeholder={weeklyRecord ? `Record: ${weeklyRecord}kg` : "0"}
                className="w-20 rounded-lg border border-zinc-700/80 bg-zinc-900/60 px-2 py-1.5 text-sm text-zinc-100 placeholder:text-zinc-500 focus:border-jagger-400/60 focus:outline-none"
              />
              {weeklyRecord && (
                <span className="text-[10px] text-zinc-500">
                  Record: {weeklyRecord}kg
                </span>
              )}
            </div>
          )}

          <button
            onClick={handleComplete}
            disabled={isCardio ? (!minutes || isNaN(Number(minutes))) : (!weight || isNaN(Number(weight)))}
            className="w-full rounded-xl bg-jagger-600 px-4 py-2.5 text-sm font-medium text-zinc-50 transition-colors hover:bg-jagger-500 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {exercise.completed ? "Atualizar exercício" : "Finalizar exercício"}
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
    const loadWorkouts = async () => {
      const currentDate = new Date();
      const year = currentDate.getFullYear();
      const month = currentDate.getMonth();
      const days = getDaysInMonth(year, month);
      
      setMonthDays(days.map((date) => ({ date })));

      const initialWorkouts = new Map<string, WorkoutDay>();

      // Carregar configuração semanal do Firebase
      const firebaseConfig = await workoutService.getWorkoutConfig();

      for (const date of days) {
        const dayOfWeek = date.getDay();
        const dayNames = ["domingo", "segunda", "terca", "quarta", "quinta", "sexta", "sabado"];
        const dayName = dayNames[dayOfWeek];
        const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
        const dateKey = date.toISOString().split("T")[0];
        const dateISO = date.toISOString();

        // Primeiro, verificar se há treino específico da data salvo no Firebase
        let workoutForDate: WorkoutDay | null = null;
        
        try {
          const savedDateWorkout = await workoutService.getWorkout(dateKey);
          if (savedDateWorkout) {
            workoutForDate = {
              ...savedDateWorkout,
              date,
              exercises: savedDateWorkout.exercises.map((ex: any) => normalizeWorkoutExercise(ex)),
            };
          }
        } catch (e) {
          console.error("Erro ao carregar treino da data:", e);
        }

        // Se não tem treino específico da data, carregar da configuração semanal
        if (!workoutForDate && firebaseConfig && firebaseConfig[dayName]) {
          const dayConfig = firebaseConfig[dayName];
          if (dayConfig && dayConfig.exercises && Array.isArray(dayConfig.exercises) && dayConfig.exercises.length > 0) {
            workoutForDate = {
              date,
              dayOfWeek: dayName,
              dayLabel: dayConfig.dayLabel || dayName.charAt(0).toUpperCase() + dayName.slice(1),
              muscleGroup: dayConfig.muscleGroup || "",
              exercises: dayConfig.exercises.map((ex: any) => ({
                id: ex.id || Date.now().toString() + Math.random(),
                name: ex.name || "",
                type: ex.type || "strength",
                sets: typeof ex.sets === "number" ? ex.sets.toString() : (ex.sets || ""),
                reps: ex.reps || "",
                rest: ex.rest !== undefined ? ex.rest : (ex.type === "cardio" ? 30 : 60),
                completed: false, // Resetar completado para o novo dia
                weight: ex.weight,
                minutes: ex.minutes,
                averageSpeed: ex.averageSpeed,
                videoUrl: ex.videoUrl || undefined,
                intensity: ex.intensity || undefined,
                activityTemplateId: ex.activityTemplateId || undefined,
                alternative: normalizeAlternativeExercise(
                  { id: ex.id || "", name: ex.name || "", type: ex.type || "strength", sets: ex.sets || "", completed: false } as Exercise,
                  ex.alternative
                ),
                selectedOption: "primary",
              })),
              isWeekend: dayConfig.isWeekend !== undefined ? dayConfig.isWeekend : isWeekend,
            };
          }
        }

        // Se ainda não tem, usar mock padrão
        if (!workoutForDate) {
          const workoutData = mockWorkoutsByDay[dayName];
          if (workoutData) {
            workoutForDate = {
              date,
              dayOfWeek: dayName,
              dayLabel: dayName.charAt(0).toUpperCase() + dayName.slice(1),
              muscleGroup: workoutData.muscleGroup,
              exercises: workoutData.exercises.map((ex) => ({
                ...ex,
                completed: false,
                sets: typeof ex.sets === "string" ? parseInt(ex.sets) || 0 : ex.sets,
                type: ex.type || (ex.name.includes("🚶") || ex.name.includes("🏃") || ex.name.toLowerCase().includes("cardio") ? "cardio" : "strength"),
                rest: ex.rest !== undefined ? ex.rest : (ex.type === "cardio" ? 30 : 60),
                selectedOption: "primary" as const,
              })),
              isWeekend,
            };
          } else if (dayOfWeek === 0) {
            workoutForDate = {
              date,
              dayOfWeek: dayName,
              dayLabel: "Domingo",
              muscleGroup: "Descanso",
              exercises: [],
              isWeekend: true,
            };
          }
        }

        if (workoutForDate) {
          initialWorkouts.set(dateISO, workoutForDate);
        }
      }

      setWorkouts(initialWorkouts);
      // Garantir que o dia atual está selecionado
      setSelectedDate(currentDate);
    };

    loadWorkouts();
  }, []);

  // Recarregar treinos quando a configuração mudar
  useEffect(() => {
    if (typeof window === "undefined") return;

    const handleConfigUpdate = async () => {
      // Recarregar completamente os treinos do Firebase
      const currentDate = new Date();
      const year = currentDate.getFullYear();
      const month = currentDate.getMonth();
      const days = getDaysInMonth(year, month);
      
      const firebaseConfig = await workoutService.getWorkoutConfig();
      const updatedWorkouts = new Map<string, WorkoutDay>();
      
      for (const date of days) {
        const dayOfWeek = date.getDay();
        const dayNames = ["domingo", "segunda", "terca", "quarta", "quinta", "sexta", "sabado"];
        const dayName = dayNames[dayOfWeek];
        const dateKey = date.toISOString().split("T")[0];
        const dateISO = date.toISOString();
        
        // Primeiro verificar se há treino específico da data
        let workoutForDate: WorkoutDay | null = null;
        try {
          const savedDateWorkout = await workoutService.getWorkout(dateKey);
          if (savedDateWorkout) {
            workoutForDate = {
              ...savedDateWorkout,
              date,
              exercises: savedDateWorkout.exercises.map((ex: any) => normalizeWorkoutExercise(ex)),
            };
          }
        } catch (e) {
          console.error("Erro ao carregar treino da data:", e);
        }
        
        // Se não tem treino específico, usar configuração semanal
        if (!workoutForDate && firebaseConfig && firebaseConfig[dayName]) {
          const dayConfig = firebaseConfig[dayName];
          if (dayConfig && dayConfig.exercises && Array.isArray(dayConfig.exercises) && dayConfig.exercises.length > 0) {
            workoutForDate = {
              date,
              dayOfWeek: dayName,
              dayLabel: dayConfig.dayLabel || dayName.charAt(0).toUpperCase() + dayName.slice(1),
              muscleGroup: dayConfig.muscleGroup || "",
              exercises: dayConfig.exercises.map((ex: any) => ({
                id: ex.id || Date.now().toString() + Math.random(),
                name: ex.name || "",
                type: ex.type || "strength",
                sets: typeof ex.sets === "number" ? ex.sets : (typeof ex.sets === "string" ? parseInt(ex.sets) || 0 : 0),
                reps: ex.reps || "",
                rest: ex.rest !== undefined ? ex.rest : (ex.type === "cardio" ? 30 : 60),
                completed: false,
                weight: ex.weight,
                minutes: ex.minutes,
                averageSpeed: ex.averageSpeed,
                videoUrl: ex.videoUrl || undefined,
                intensity: ex.intensity || undefined,
                activityTemplateId: ex.activityTemplateId || undefined,
                alternative: normalizeAlternativeExercise(
                  { id: ex.id || "", name: ex.name || "", type: ex.type || "strength", sets: ex.sets || "", completed: false } as Exercise,
                  ex.alternative
                ),
                selectedOption: "primary",
              })),
              isWeekend: dayConfig.isWeekend !== undefined ? dayConfig.isWeekend : (dayOfWeek === 0 || dayOfWeek === 6),
            };
          }
        }
        
        // Se ainda não tem, usar mock padrão
        if (!workoutForDate) {
          const workoutData = mockWorkoutsByDay[dayName];
          if (workoutData) {
            workoutForDate = {
              date,
              dayOfWeek: dayName,
              dayLabel: dayName.charAt(0).toUpperCase() + dayName.slice(1),
              muscleGroup: workoutData.muscleGroup,
              exercises: workoutData.exercises.map((ex) => ({
                ...ex,
                completed: false,
                sets: typeof ex.sets === "string" ? parseInt(ex.sets) || 0 : ex.sets,
                selectedOption: "primary" as const,
              })),
              isWeekend: dayOfWeek === 0 || dayOfWeek === 6,
            };
          } else if (dayOfWeek === 0) {
            workoutForDate = {
              date,
              dayOfWeek: dayName,
              dayLabel: "Domingo",
              muscleGroup: "Descanso",
              exercises: [],
              isWeekend: true,
            };
          }
        }
        
        if (workoutForDate) {
          updatedWorkouts.set(dateISO, workoutForDate);
        }
      }
      
      setWorkouts(updatedWorkouts);
    };

    window.addEventListener("workoutConfigUpdated", handleConfigUpdate);
    return () => {
      window.removeEventListener("workoutConfigUpdated", handleConfigUpdate);
    };
  }, []);

  // Recarregar treino quando a data selecionada mudar
  useEffect(() => {
    const loadWorkoutForDate = async () => {
      const dateKey = selectedDate.toISOString().split("T")[0];
      const dateISO = selectedDate.toISOString();
      const dayOfWeek = selectedDate.getDay();
      const dayNames = ["domingo", "segunda", "terca", "quarta", "quinta", "sexta", "sabado"];
      const dayName = dayNames[dayOfWeek];
      
      // Verificar se há treino específico da data no Firebase
      let workoutForDate: WorkoutDay | null = null;
      
      try {
        const savedDateWorkout = await workoutService.getWorkout(dateKey);
        if (savedDateWorkout) {
          workoutForDate = {
            ...savedDateWorkout,
            date: selectedDate,
            exercises: savedDateWorkout.exercises.map((ex: any) => normalizeWorkoutExercise(ex)),
          };
        }
      } catch (e) {
        console.error("Erro ao carregar treino da data:", e);
      }
      
      // Se não tem treino específico da data, carregar da configuração semanal
      if (!workoutForDate) {
        try {
          const firebaseConfig = await workoutService.getWorkoutConfig();
          if (firebaseConfig && firebaseConfig[dayName]) {
            const dayConfig = firebaseConfig[dayName];
            if (dayConfig && dayConfig.exercises && Array.isArray(dayConfig.exercises) && dayConfig.exercises.length > 0) {
              workoutForDate = {
                date: selectedDate,
                dayOfWeek: dayName,
                dayLabel: dayConfig.dayLabel || dayName.charAt(0).toUpperCase() + dayName.slice(1),
                muscleGroup: dayConfig.muscleGroup || "",
                exercises: dayConfig.exercises.map((ex: any) =>
                  normalizeWorkoutExercise({
                    ...ex,
                    id: ex.id || Date.now().toString() + Math.random(),
                    name: ex.name || "",
                    type: ex.type || "strength",
                    completed: false,
                  })
                ),
                isWeekend: dayConfig.isWeekend !== undefined ? dayConfig.isWeekend : (dayOfWeek === 0 || dayOfWeek === 6),
              };
            }
          }
        } catch (e) {
          console.error("Erro ao carregar configuração:", e);
        }
      }
    
    // Se ainda não tem, usar mock padrão
    if (!workoutForDate) {
      const workoutData = mockWorkoutsByDay[dayName];
      if (workoutData) {
        workoutForDate = {
          date: selectedDate,
          dayOfWeek: dayName,
          dayLabel: dayName.charAt(0).toUpperCase() + dayName.slice(1),
          muscleGroup: workoutData.muscleGroup,
          exercises: workoutData.exercises.map((ex) => ({
            ...ex,
            completed: false,
            selectedOption: "primary" as const,
          })),
          isWeekend: dayOfWeek === 0 || dayOfWeek === 6,
        };
      } else if (dayOfWeek === 0) {
        workoutForDate = {
          date: selectedDate,
          dayOfWeek: dayName,
          dayLabel: "Domingo",
          muscleGroup: "Descanso",
          exercises: [],
          isWeekend: true,
        };
      }
    }
    
      if (workoutForDate) {
        setWorkouts((prev) => {
          const updated = new Map(prev);
          updated.set(dateISO, workoutForDate!);
          return updated;
        });
      }
    };

    loadWorkoutForDate();
  }, [selectedDate]);

  // Carregar atividades quando a data muda
  useEffect(() => {
    const loadActivities = async () => {
      const dateKey = selectedDate.toISOString().split("T")[0];
      try {
        const firebaseActivities = await workoutService.getActivities(dateKey);
        setActivities(firebaseActivities);
      } catch (error) {
        console.error("Erro ao carregar atividades:", error);
        setActivities([]);
      }
    };

    loadActivities();
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

  const handleUpdateExercise = async (exerciseId: string, weight?: number, minutes?: number, averageSpeed?: number) => {
    let workoutToSave: WorkoutDay | null = null;
    
    setWorkouts((prev) => {
      const newWorkouts = new Map(prev);
      const workout = newWorkouts.get(selectedDate.toISOString());
      if (workout) {
        workout.exercises = workout.exercises.map((ex) =>
          ex.id === exerciseId
            ? { ...ex, weight, minutes, averageSpeed }
            : ex
        );
        newWorkouts.set(selectedDate.toISOString(), workout);
        workoutToSave = { ...workout };
      }
      return newWorkouts;
    });

    // Salvar treino no Firebase após atualizar o estado
    if (workoutToSave) {
      const workout: WorkoutDay = workoutToSave;
      const dateKey = selectedDate.toISOString().split("T")[0];
      try {
        // Converter para o formato esperado pelo Firebase (sem Date object e sem undefined)
        const exercisesFormatted = workout.exercises.map(formatExerciseForStorage);
        
        const workoutToSaveFormatted: any = {
          dayOfWeek: workout.dayOfWeek,
          dayLabel: workout.dayLabel,
          muscleGroup: workout.muscleGroup,
          exercises: exercisesFormatted,
          isWeekend: workout.isWeekend,
        };
        
        console.log("Atualizando treino do dia:", dateKey, workoutToSaveFormatted);
        await workoutService.saveWorkout(dateKey, workoutToSaveFormatted);
        console.log("Treino atualizado com sucesso!");
        
        // Disparar evento para atualizar checklist
        window.dispatchEvent(new CustomEvent("workoutUpdated", { detail: { dateKey } }));
      } catch (error) {
        console.error("Erro ao atualizar treino:", error);
        alert(`Erro ao atualizar treino: ${error instanceof Error ? error.message : "Erro desconhecido"}`);
      }
    }
  };

  const handleSelectExerciseOption = async (exerciseId: string, selectedOption: ExerciseSelection) => {
    let workoutToSave: WorkoutDay | null = null;

    setWorkouts((prev) => {
      const newWorkouts = new Map(prev);
      const workout = newWorkouts.get(selectedDate.toISOString());
      if (workout) {
        workout.exercises = workout.exercises.map((ex) =>
          ex.id === exerciseId ? { ...ex, selectedOption } : ex
        );
        newWorkouts.set(selectedDate.toISOString(), workout);
        workoutToSave = { ...workout };
      }
      return newWorkouts;
    });

    if (workoutToSave) {
      const workout: WorkoutDay = workoutToSave;
      const dateKey = selectedDate.toISOString().split("T")[0];
      try {
        await workoutService.saveWorkout(dateKey, {
          dayOfWeek: workout.dayOfWeek,
          dayLabel: workout.dayLabel,
          muscleGroup: workout.muscleGroup,
          exercises: workout.exercises.map(formatExerciseForStorage),
          isWeekend: workout.isWeekend,
        } as any);
      } catch (error) {
        console.error("Erro ao selecionar opção do exercício:", error);
      }
    }
  };

  const handleCompleteExercise = async (exerciseId: string, weight?: number, minutes?: number, averageSpeed?: number) => {
    let workoutToSave: WorkoutDay | null = null;
    
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
        workoutToSave = { ...workout };
      }
      return newWorkouts;
    });

    // Salvar treino no Firebase após atualizar o estado
    if (workoutToSave) {
      const workout: WorkoutDay = workoutToSave;
      const dateKey = selectedDate.toISOString().split("T")[0];
      try {
        // Converter para o formato esperado pelo Firebase (sem Date object e sem undefined)
        const exercisesFormatted = workout.exercises.map(formatExerciseForStorage);
        
        const workoutToSaveFormatted: any = {
          dayOfWeek: workout.dayOfWeek,
          dayLabel: workout.dayLabel,
          muscleGroup: workout.muscleGroup,
          exercises: exercisesFormatted,
          isWeekend: workout.isWeekend,
        };
        
        console.log("Salvando treino do dia:", dateKey, workoutToSaveFormatted);
        await workoutService.saveWorkout(dateKey, workoutToSaveFormatted);
        console.log("Treino salvo com sucesso!");
        
        // Disparar evento para atualizar checklist
        window.dispatchEvent(new CustomEvent("workoutUpdated", { detail: { dateKey } }));
      } catch (error) {
        console.error("Erro ao salvar treino:", error);
        alert(`Erro ao salvar treino: ${error instanceof Error ? error.message : "Erro desconhecido"}`);
      }
    }

    // Salvar atividade física para cálculo de gasto calórico usando METs
    const exercise = currentWorkout?.exercises.find((ex) => ex.id === exerciseId);
    if (exercise) {
      const selectedExercise = getSelectedExercise(exercise);
      const dateKey = selectedDate.toISOString().split("T")[0];
      
      // Determinar MET e duração
      const met = getExerciseMET(selectedExercise.name, minutes, averageSpeed);
      let durationMinutes = minutes;
      
      // Se não tiver minutos informados e for musculação, estimar
      if (!durationMinutes) {
        const isStrength = !selectedExercise.name.includes("🚶") && 
                          !selectedExercise.name.includes("🏃") && 
                          !selectedExercise.name.toLowerCase().includes("cardio") &&
                          !selectedExercise.name.toLowerCase().includes("caminhada") &&
                          !selectedExercise.name.toLowerCase().includes("corrida");
        if (isStrength) {
          durationMinutes = estimateStrengthDuration(selectedExercise.name);
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
        const isCardio = selectedExercise.name.includes("🚶") || 
                        selectedExercise.name.includes("🏃") || 
                        selectedExercise.name.toLowerCase().includes("cardio") ||
                        selectedExercise.name.toLowerCase().includes("caminhada") ||
                        selectedExercise.name.toLowerCase().includes("corrida") ||
                        selectedExercise.name.toLowerCase().includes("bicicleta") ||
                        selectedExercise.name.toLowerCase().includes("natação");
        
        const activity: PhysicalActivity = {
          id: `activity_${exerciseId}_${Date.now()}`,
          name: selectedExercise.name,
          type: isCardio ? "walking" : "workout",
          caloriesBurned,
          duration: durationMinutes,
          date: dateKey,
          met: met,
        };

        // Carregar atividades existentes do Firebase
        let activities: PhysicalActivity[] = [];
        try {
          activities = await workoutService.getActivities(dateKey);
        } catch (e) {
          console.error("Erro ao carregar atividades:", e);
        }

        // Adicionar nova atividade (evitar duplicatas)
        const existingIndex = activities.findIndex((a) => a.id === activity.id);
        if (existingIndex >= 0) {
          activities[existingIndex] = activity;
        } else {
          activities.push(activity);
        }

        // Salvar atividades no Firebase
        try {
          await workoutService.saveActivities(dateKey, activities);
        } catch (error) {
          console.error("Erro ao salvar atividades:", error);
        }

        // Disparar evento para atualizar dashboard
        window.dispatchEvent(new CustomEvent("activitiesUpdated", { detail: { dateKey, activities } }));
      }
    }
  };

  const getDayStatus = (workout: WorkoutDay | undefined) => {
    if (!workout || workout.exercises.length === 0) {
      return { completed: 0, total: 0, percentage: 0, goalMet: false };
    }
    const completed = getCompletedExerciseCount(workout.exercises);
    const total = workout.exercises.length;
    return {
      completed,
      total,
      percentage: (completed / total) * 100,
      goalMet: isWorkoutDayCompleted(workout.exercises),
    };
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
          // Usar workout do estado (já carregado do Firebase pelos useEffects)
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
                        onClick={async () => {
                          const updated = activities.filter((a) => a.id !== activity.id);
                          setActivities(updated);
                          try {
                            await workoutService.saveActivities(dateKey, updated);
                            window.dispatchEvent(new CustomEvent("activitiesUpdated", { detail: { dateKey, activities: updated } }));
                          } catch (error) {
                            console.error("Erro ao remover atividade:", error);
                          }
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
                onUpdate={(id, weight, minutes, averageSpeed) =>
                  handleUpdateExercise(id, weight, minutes, averageSpeed)
                }
                onSelectOption={(id, option) =>
                  handleSelectExerciseOption(id, option)
                }
              />
            ))}
          </div>

          {getDayStatus(currentWorkout).goalMet && (
            <div className="mt-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/40 px-4 py-3 text-center">
              <p className="text-sm font-medium text-emerald-300">
                ✅ Dia de treino contado. Você bateu a meta de {MIN_COMPLETED_EXERCISES_FOR_WORKOUT_DAY} exercícios concluídos.
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
                        onClick={async () => {
                          const updated = activities.filter((a) => a.id !== activity.id);
                          setActivities(updated);
                          try {
                            await workoutService.saveActivities(dateKey, updated);
                            window.dispatchEvent(new CustomEvent("activitiesUpdated", { detail: { dateKey, activities: updated } }));
                          } catch (error) {
                            console.error("Erro ao remover atividade:", error);
                          }
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
          onAddActivity={async (activity) => {
            const updated = [...activities, activity];
            setActivities(updated);
            try {
              await workoutService.saveActivities(dateKey, updated);
              window.dispatchEvent(new CustomEvent("activitiesUpdated", { detail: { dateKey, activities: updated } }));
              setShowActivityModal(false);
            } catch (error) {
              console.error("Erro ao adicionar atividade:", error);
            }
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
