"use client";

import { useState, useEffect } from "react";
import { ACTIVITY_TEMPLATES, ActivityTemplate } from "@/types/meals";

type ExerciseType = "strength" | "cardio" | "custom";

type Exercise = {
  id: string;
  name: string;
  type: ExerciseType;
  sets: number;
  reps: string;
  rest: number; // segundos - obrigatório para todos
  completed: boolean;
  // Para exercícios de força
  weight?: number;
  // Para exercícios de cardio
  minutes?: number;
  averageSpeed?: number; // km/h
  intensity?: string; // leve, moderado, intenso
  // Para templates de atividade
  activityTemplateId?: string;
  // Vídeo do YouTube
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

export default function TreinoConfigPage() {
  const [workouts, setWorkouts] = useState<Map<string, WorkoutDay>>(new Map());
  const [selectedDay, setSelectedDay] = useState<string>("segunda");

  const dayNames = ["segunda", "terca", "quarta", "quinta", "sexta", "sabado"];

  useEffect(() => {
    // Verificar se estamos no navegador
    if (typeof window === "undefined") return;
    
    // Carregar treinos salvos
    const saved = localStorage.getItem("workout_config");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        const workoutsMap = new Map<string, WorkoutDay>();
        Object.entries(parsed).forEach(([day, workout]: [string, any]) => {
          workoutsMap.set(day, {
            ...workout,
            date: new Date(),
            exercises: workout.exercises || [],
          });
        });
        setWorkouts(workoutsMap);
      } catch (e) {
        console.error("Erro ao carregar treinos:", e);
      }
    }
  }, []);

  const currentWorkout = workouts.get(selectedDay);

  const [showAddExerciseModal, setShowAddExerciseModal] = useState(false);
  const [newExerciseType, setNewExerciseType] = useState<ExerciseType>("strength");

  const handleAddExercise = (type: ExerciseType = "strength", templateId?: string) => {
    let newExercise: Exercise;

    if (templateId) {
      // Adicionar exercício a partir de template
      const template = ACTIVITY_TEMPLATES.find((t) => t.id === templateId);
      if (!template) return;

      newExercise = {
        id: Date.now().toString(),
        name: template.name,
        type: "cardio",
        sets: 1,
        reps: "",
        rest: 30, // Descanso padrão para cardio
        completed: false,
        minutes: 30,
        activityTemplateId: templateId,
        intensity: template.category === "walking" ? "leve" : template.category === "cycling" ? "moderado" : "intenso",
      };
    } else if (type === "cardio") {
      newExercise = {
        id: Date.now().toString(),
        name: "",
        type: "cardio",
        sets: 1,
        reps: "",
        rest: 30, // Descanso padrão para cardio
        completed: false,
        minutes: 30,
        intensity: "moderado",
      };
    } else {
      newExercise = {
        id: Date.now().toString(),
        name: "",
        type: "strength",
        sets: 3,
        reps: "10",
        rest: 60,
        completed: false,
      };
    }

    const updated = new Map(workouts);
    const workout = updated.get(selectedDay) || {
      date: new Date(),
      dayOfWeek: selectedDay,
      dayLabel: selectedDay.charAt(0).toUpperCase() + selectedDay.slice(1),
      muscleGroup: "",
      exercises: [],
      isWeekend: selectedDay === "sabado" || selectedDay === "domingo",
    };

    workout.exercises = [...workout.exercises, newExercise];
    updated.set(selectedDay, workout);
    setWorkouts(updated);
    saveWorkouts(updated);
    setShowAddExerciseModal(false);
  };

  const handleUpdateExercise = (exerciseId: string, updates: Partial<Exercise>) => {
    const updated = new Map(workouts);
    const workout = updated.get(selectedDay);
    if (workout) {
      workout.exercises = workout.exercises.map((ex) =>
        ex.id === exerciseId ? { ...ex, ...updates } : ex
      );
      updated.set(selectedDay, workout);
      setWorkouts(updated);
      saveWorkouts(updated);
    }
  };

  const handleDeleteExercise = (exerciseId: string) => {
    const updated = new Map(workouts);
    const workout = updated.get(selectedDay);
    if (workout) {
      workout.exercises = workout.exercises.filter((ex) => ex.id !== exerciseId);
      updated.set(selectedDay, workout);
      setWorkouts(updated);
      saveWorkouts(updated);
    }
  };

  const handleUpdateMuscleGroup = (muscleGroup: string) => {
    const updated = new Map(workouts);
    const workout = updated.get(selectedDay) || {
      date: new Date(),
      dayOfWeek: selectedDay,
      dayLabel: selectedDay.charAt(0).toUpperCase() + selectedDay.slice(1),
      muscleGroup: "",
      exercises: [],
      isWeekend: selectedDay === "sabado" || selectedDay === "domingo",
    };
    workout.muscleGroup = muscleGroup;
    updated.set(selectedDay, workout);
    setWorkouts(updated);
    saveWorkouts(updated);
  };

  const saveWorkouts = (workoutsToSave: Map<string, WorkoutDay>) => {
    // Verificar se estamos no navegador
    if (typeof window === "undefined") return;
    
    const config: Record<string, any> = {};
    workoutsToSave.forEach((workout, day) => {
      config[day] = {
        dayOfWeek: workout.dayOfWeek,
        dayLabel: workout.dayLabel,
        muscleGroup: workout.muscleGroup,
        exercises: workout.exercises,
        isWeekend: workout.isWeekend,
      };
    });
    localStorage.setItem("workout_config", JSON.stringify(config));
  };

  return (
    <div className="flex flex-1 flex-col gap-4">
      <header className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.25em] text-jagger-300/80">
            Configuração de Treinos
          </p>
          <h2 className="mt-1 text-2xl font-semibold text-zinc-50">
            Rotina Semanal
          </h2>
          <p className="mt-1 text-xs text-zinc-400">
            Configure os exercícios para cada dia da semana.
          </p>
        </div>
      </header>

      {/* Seleção de dia */}
      <section className="glass-panel rounded-3xl p-4">
        <div className="flex gap-2 overflow-x-auto pb-2">
          {dayNames.map((day) => (
            <button
              key={day}
              onClick={() => setSelectedDay(day)}
              className={`rounded-xl border px-4 py-2 text-sm font-medium transition-colors whitespace-nowrap ${
                selectedDay === day
                  ? "border-jagger-400 bg-jagger-500/20 text-jagger-300"
                  : "border-zinc-700/80 bg-zinc-950/60 text-zinc-400 hover:border-zinc-600 hover:text-zinc-200"
              }`}
            >
              {day.charAt(0).toUpperCase() + day.slice(1)}
            </button>
          ))}
        </div>
      </section>

      {/* Configuração do treino do dia */}
      <section className="glass-panel rounded-3xl p-4">
        <div className="mb-4">
          <label className="text-xs text-zinc-400 mb-2 block">
            Grupo Muscular
          </label>
          <input
            type="text"
            value={currentWorkout?.muscleGroup || ""}
            onChange={(e) => handleUpdateMuscleGroup(e.target.value)}
            placeholder="Ex: Peito e Tríceps"
            className="w-full rounded-lg border border-zinc-700/80 bg-zinc-900/60 px-3 py-2 text-sm text-zinc-100 focus:border-jagger-400/60 focus:outline-none"
          />
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium text-zinc-100">
              Exercícios
            </h3>
            <button
              onClick={() => setShowAddExerciseModal(true)}
              className="rounded-lg bg-jagger-600 px-3 py-1.5 text-xs font-medium text-zinc-50 transition-colors hover:bg-jagger-500"
            >
              + Adicionar
            </button>
          </div>

          {currentWorkout?.exercises.length === 0 ? (
            <p className="text-xs text-zinc-500 text-center py-8">
              Nenhum exercício configurado. Clique em "+ Adicionar" para começar.
            </p>
          ) : (
            currentWorkout?.exercises.map((exercise) => (
              <div
                key={exercise.id}
                className="rounded-2xl border border-zinc-800/80 bg-zinc-950/60 p-4 space-y-3"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className={`text-[10px] px-2 py-0.5 rounded-full ${
                    exercise.type === "strength" 
                      ? "bg-blue-500/20 text-blue-300"
                      : exercise.type === "cardio"
                      ? "bg-green-500/20 text-green-300"
                      : "bg-purple-500/20 text-purple-300"
                  }`}>
                    {exercise.type === "strength" ? "💪 Força" : exercise.type === "cardio" ? "🏃 Cardio" : "📝 Personalizado"}
                  </span>
                  <button
                    onClick={() => handleDeleteExercise(exercise.id)}
                    className="text-zinc-500 hover:text-red-400 text-xs"
                  >
                    ✕
                  </button>
                </div>

                {exercise.type === "strength" ? (
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div className="sm:col-span-2">
                      <label className="text-[10px] text-zinc-400 mb-1 block">
                        Nome do Exercício
                      </label>
                      <input
                        type="text"
                        value={exercise.name}
                        onChange={(e) =>
                          handleUpdateExercise(exercise.id, { name: e.target.value })
                        }
                        placeholder="Ex: Supino Reto"
                        className="w-full rounded-lg border border-zinc-700/80 bg-zinc-900/60 px-3 py-2 text-xs text-zinc-100 focus:border-jagger-400/60 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-zinc-400 mb-1 block">
                        Séries
                      </label>
                      <input
                        type="number"
                        value={exercise.sets}
                        onChange={(e) =>
                          handleUpdateExercise(exercise.id, {
                            sets: Number(e.target.value),
                          })
                        }
                        className="w-full rounded-lg border border-zinc-700/80 bg-zinc-900/60 px-3 py-2 text-xs text-zinc-100 focus:border-jagger-400/60 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-zinc-400 mb-1 block">
                        Repetições
                      </label>
                      <input
                        type="text"
                        value={exercise.reps}
                        onChange={(e) =>
                          handleUpdateExercise(exercise.id, { reps: e.target.value })
                        }
                        placeholder="Ex: 10-12"
                        className="w-full rounded-lg border border-zinc-700/80 bg-zinc-900/60 px-3 py-2 text-xs text-zinc-100 focus:border-jagger-400/60 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-zinc-400 mb-1 block">
                        Peso (kg)
                      </label>
                      <input
                        type="number"
                        step="0.5"
                        value={exercise.weight || ""}
                        onChange={(e) =>
                          handleUpdateExercise(exercise.id, {
                            weight: e.target.value ? Number(e.target.value) : undefined,
                          })
                        }
                        placeholder="Opcional"
                        className="w-full rounded-lg border border-zinc-700/80 bg-zinc-900/60 px-3 py-2 text-xs text-zinc-100 focus:border-jagger-400/60 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-zinc-400 mb-1 block">
                        Descanso (segundos)
                      </label>
                      <input
                        type="number"
                        value={exercise.rest}
                        onChange={(e) =>
                          handleUpdateExercise(exercise.id, {
                            rest: Number(e.target.value),
                          })
                        }
                        className="w-full rounded-lg border border-zinc-700/80 bg-zinc-900/60 px-3 py-2 text-xs text-zinc-100 focus:border-jagger-400/60 focus:outline-none"
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="text-[10px] text-zinc-400 mb-1 block">
                        URL do Vídeo (YouTube)
                      </label>
                      <input
                        type="url"
                        value={exercise.videoUrl || ""}
                        onChange={(e) =>
                          handleUpdateExercise(exercise.id, {
                            videoUrl: e.target.value || undefined,
                          })
                        }
                        placeholder="https://www.youtube.com/watch?v=..."
                        className="w-full rounded-lg border border-zinc-700/80 bg-zinc-900/60 px-3 py-2 text-xs text-zinc-100 focus:border-jagger-400/60 focus:outline-none"
                      />
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div className="sm:col-span-2">
                      <label className="text-[10px] text-zinc-400 mb-1 block">
                        Nome da Atividade
                      </label>
                      <input
                        type="text"
                        value={exercise.name}
                        onChange={(e) =>
                          handleUpdateExercise(exercise.id, { name: e.target.value })
                        }
                        placeholder="Ex: Caminhada rápida"
                        className="w-full rounded-lg border border-zinc-700/80 bg-zinc-900/60 px-3 py-2 text-xs text-zinc-100 focus:border-jagger-400/60 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-zinc-400 mb-1 block">
                        Duração (minutos)
                      </label>
                      <input
                        type="number"
                        value={exercise.minutes || ""}
                        onChange={(e) =>
                          handleUpdateExercise(exercise.id, {
                            minutes: e.target.value ? Number(e.target.value) : undefined,
                          })
                        }
                        className="w-full rounded-lg border border-zinc-700/80 bg-zinc-900/60 px-3 py-2 text-xs text-zinc-100 focus:border-jagger-400/60 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-zinc-400 mb-1 block">
                        Velocidade Média (km/h)
                      </label>
                      <input
                        type="number"
                        step="0.1"
                        value={exercise.averageSpeed || ""}
                        onChange={(e) =>
                          handleUpdateExercise(exercise.id, {
                            averageSpeed: e.target.value ? Number(e.target.value) : undefined,
                          })
                        }
                        placeholder="Opcional"
                        className="w-full rounded-lg border border-zinc-700/80 bg-zinc-900/60 px-3 py-2 text-xs text-zinc-100 focus:border-jagger-400/60 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-zinc-400 mb-1 block">
                        Descanso (segundos)
                      </label>
                      <input
                        type="number"
                        value={exercise.rest}
                        onChange={(e) =>
                          handleUpdateExercise(exercise.id, {
                            rest: Number(e.target.value),
                          })
                        }
                        className="w-full rounded-lg border border-zinc-700/80 bg-zinc-900/60 px-3 py-2 text-xs text-zinc-100 focus:border-jagger-400/60 focus:outline-none"
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="text-[10px] text-zinc-400 mb-1 block">
                        Intensidade
                      </label>
                      <select
                        value={exercise.intensity || "moderado"}
                        onChange={(e) =>
                          handleUpdateExercise(exercise.id, {
                            intensity: e.target.value,
                          })
                        }
                        className="w-full rounded-lg border border-zinc-700/80 bg-zinc-900/60 px-3 py-2 text-xs text-zinc-100 focus:border-jagger-400/60 focus:outline-none"
                      >
                        <option value="leve">Leve</option>
                        <option value="moderado">Moderado</option>
                        <option value="intenso">Intenso</option>
                      </select>
                    </div>
                    <div className="sm:col-span-2">
                      <label className="text-[10px] text-zinc-400 mb-1 block">
                        URL do Vídeo (YouTube)
                      </label>
                      <input
                        type="url"
                        value={exercise.videoUrl || ""}
                        onChange={(e) =>
                          handleUpdateExercise(exercise.id, {
                            videoUrl: e.target.value || undefined,
                          })
                        }
                        placeholder="https://www.youtube.com/watch?v=..."
                        className="w-full rounded-lg border border-zinc-700/80 bg-zinc-900/60 px-3 py-2 text-xs text-zinc-100 focus:border-jagger-400/60 focus:outline-none"
                      />
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </section>

      {/* Modal para adicionar exercício */}
      {showAddExerciseModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="glass-panel w-full max-w-md rounded-3xl p-6">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-zinc-50">
                Adicionar Exercício
              </h3>
              <button
                onClick={() => setShowAddExerciseModal(false)}
                className="rounded-lg p-1 text-zinc-400 hover:text-zinc-100"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-xs text-zinc-400 mb-2 block">
                  Tipo de Exercício
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setNewExerciseType("strength")}
                    className={`rounded-xl border px-4 py-2 text-sm font-medium transition-colors ${
                      newExerciseType === "strength"
                        ? "border-jagger-400 bg-jagger-500/20 text-jagger-300"
                        : "border-zinc-700/80 bg-zinc-950/60 text-zinc-400 hover:border-zinc-600"
                    }`}
                  >
                    💪 Força
                  </button>
                  <button
                    onClick={() => setNewExerciseType("cardio")}
                    className={`rounded-xl border px-4 py-2 text-sm font-medium transition-colors ${
                      newExerciseType === "cardio"
                        ? "border-jagger-400 bg-jagger-500/20 text-jagger-300"
                        : "border-zinc-700/80 bg-zinc-950/60 text-zinc-400 hover:border-zinc-600"
                    }`}
                  >
                    🏃 Cardio
                  </button>
                </div>
              </div>

              {newExerciseType === "cardio" && (
                <div>
                  <label className="text-xs text-zinc-400 mb-2 block">
                    Atividades Rápidas
                  </label>
                  <div className="max-h-48 overflow-y-auto space-y-1">
                    {ACTIVITY_TEMPLATES.map((template) => (
                      <button
                        key={template.id}
                        onClick={() => handleAddExercise("cardio", template.id)}
                        className="w-full rounded-lg border border-zinc-700/80 bg-zinc-950/60 px-3 py-2 text-left text-xs text-zinc-300 hover:border-jagger-400/60 hover:bg-zinc-900/60 transition-colors"
                      >
                        {template.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex gap-3">
                <button
                  onClick={() => setShowAddExerciseModal(false)}
                  className="flex-1 rounded-xl border border-zinc-700/80 bg-zinc-950/60 px-4 py-2.5 text-sm font-medium text-zinc-300 transition-colors hover:border-zinc-600 hover:text-zinc-100"
                >
                  Cancelar
                </button>
                <button
                  onClick={() => handleAddExercise(newExerciseType)}
                  className="flex-1 rounded-xl bg-jagger-600 px-4 py-2.5 text-sm font-medium text-zinc-50 transition-colors hover:bg-jagger-500"
                >
                  Adicionar {newExerciseType === "strength" ? "Força" : "Cardio"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

