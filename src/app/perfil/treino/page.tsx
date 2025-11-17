"use client";

import { useState, useEffect } from "react";

type Exercise = {
  id: string;
  name: string;
  sets: number;
  reps: string;
  rest: number;
  completed: boolean;
  weight?: number;
  minutes?: number;
  averageSpeed?: number;
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

  const handleAddExercise = () => {
    const newExercise: Exercise = {
      id: Date.now().toString(),
      name: "",
      sets: 3,
      reps: "10",
      rest: 60,
      completed: false,
    };

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
              onClick={handleAddExercise}
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
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div>
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
                </div>
                <button
                  onClick={() => handleDeleteExercise(exercise.id)}
                  className="w-full rounded-lg border border-red-500/50 bg-red-500/10 px-3 py-2 text-xs font-medium text-red-400 transition-colors hover:bg-red-500/20"
                >
                  Excluir Exercício
                </button>
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  );
}

