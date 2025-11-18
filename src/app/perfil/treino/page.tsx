"use client";

import { useState, useEffect } from "react";
import { ACTIVITY_TEMPLATES, ActivityTemplate } from "@/types/meals";
import { workoutService } from "@/lib/firebaseService";

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
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const dayNames = ["domingo", "segunda", "terca", "quarta", "quinta", "sexta", "sabado"];

  // Função auxiliar para remover campos undefined de um objeto
  const removeUndefinedFields = (obj: any): any => {
    if (obj === null || obj === undefined) {
      return null;
    }
    if (Array.isArray(obj)) {
      return obj.map(removeUndefinedFields);
    }
    if (typeof obj === "object") {
      const cleaned: any = {};
      for (const key in obj) {
        if (obj[key] !== undefined) {
          cleaned[key] = removeUndefinedFields(obj[key]);
        }
      }
      return cleaned;
    }
    return obj;
  };

  useEffect(() => {
    const loadData = async () => {
      try {
        // Carregar configuração de treino do Firebase
        const firebaseConfig = await workoutService.getWorkoutConfig();
        
        // Função auxiliar para converter sets de string para número e extrair reps
        const parseExerciseFromMock = (ex: any): Exercise => {
          let sets = 0;
          let reps = "";
          
          if (typeof ex.sets === "string") {
            if (ex.sets.includes("x")) {
              const parts = ex.sets.split("x");
              sets = parseInt(parts[0]) || 0;
              reps = parts[1] || "";
            } else if (ex.sets === "") {
              sets = 1;
              reps = "";
            } else {
              sets = parseInt(ex.sets) || 0;
            }
          } else {
            sets = ex.sets || 0;
          }
          
          const isCardio = ex.name.includes("🚶") || ex.name.includes("🏃") || ex.name.toLowerCase().includes("cardio");
          
          return {
            id: ex.id,
            name: ex.name,
            type: ex.type || (isCardio ? "cardio" : "strength"),
            sets,
            reps: ex.reps || reps,
            rest: ex.rest !== undefined ? ex.rest : (isCardio ? 30 : 60),
            completed: false,
            minutes: ex.minutes,
            intensity: ex.intensity,
          };
        };

        // Treinos mockados padrão (mesmos da página de treino)
        const mockWorkoutsByDay: Record<string, { muscleGroup: string; exercises: any[] }> = {
          segunda: {
            muscleGroup: "Peito + Tríceps + Cardio leve",
            exercises: [
              { id: "1", name: "Supino reto", sets: "4x10" },
              { id: "2", name: "Supino inclinado", sets: "3x12" },
              { id: "3", name: "Crucifixo", sets: "3x15" },
              { id: "4", name: "Tríceps corda", sets: "3x12" },
              { id: "5", name: "Tríceps banco (ou coice)", sets: "3x12" },
              { id: "6", name: "Abdominal infra + prancha", sets: "3x20 / 3x30s" },
              { id: "7", name: "🚶‍♂️ Cardio leve na esteira (caminhada rápida)", sets: "", minutes: 20 },
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
              { id: "14", name: "🚶‍♂️ Cardio leve (esteira ou escada inclinada)", sets: "", minutes: 20 },
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
              { id: "20", name: "🚶‍♂️ Cardio moderado (esteira inclinada ou bike)", sets: "", minutes: 30 },
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
              { id: "27", name: "🚶‍♂️ Cardio leve pós-treino só pra soltar as pernas", sets: "", minutes: 15 },
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
              { id: "33", name: "🏃 Cardio intenso (esteira inclinada, caminhada forte, ou HIIT leve)", sets: "", minutes: 30 },
            ],
          },
          sabado: {
            muscleGroup: "Cardio + Core (Opcional)",
            exercises: [
              { id: "34", name: "🚶 Caminhada ou esteira leve/moderada (130-145 bpm)", sets: "", minutes: 45 },
              { id: "35", name: "Abdominais variados (infra, supra, prancha, lateral)", sets: "4x20" },
              { id: "36", name: "Alongamentos gerais + liberação miofascial", sets: "" },
            ],
          },
          domingo: {
            muscleGroup: "Descanso",
            exercises: [],
          },
        };

        // Sempre carregar mockados primeiro, depois mesclar com Firebase
        const workoutsMapFromMock = new Map<string, WorkoutDay>();
        Object.entries(mockWorkoutsByDay).forEach(([day, mockData]) => {
          workoutsMapFromMock.set(day, {
            date: new Date(),
            dayOfWeek: day,
            dayLabel: day.charAt(0).toUpperCase() + day.slice(1),
            muscleGroup: mockData.muscleGroup,
            exercises: mockData.exercises.map(parseExerciseFromMock),
            isWeekend: day === "sabado" || day === "domingo",
          });
        });

        if (firebaseConfig && Object.keys(firebaseConfig).length > 0) {
          // Se tem configuração no Firebase, mesclar com mockados (Firebase tem prioridade)
          Object.entries(firebaseConfig).forEach(([day, workout]: [string, any]) => {
            if (workout && workout.exercises && Array.isArray(workout.exercises) && workout.exercises.length > 0) {
              workoutsMapFromMock.set(day, {
                ...workout,
                date: new Date(),
                exercises: workout.exercises.map((ex: any) => ({
                  ...ex,
                  rest: ex.rest !== undefined ? ex.rest : (ex.type === "cardio" ? 30 : 60),
                  videoUrl: ex.videoUrl || undefined,
                  type: ex.type || "strength",
                  reps: ex.reps || "",
                  intensity: ex.intensity || undefined,
                  activityTemplateId: ex.activityTemplateId || undefined,
                  sets: typeof ex.sets === "number" ? ex.sets : (typeof ex.sets === "string" ? parseInt(ex.sets) || 0 : 0),
                })),
              });
            }
          });
        }
        
        setWorkouts(workoutsMapFromMock);
        
        // Se não tinha nada no Firebase ou estava vazio, salvar os mockados
        if (!firebaseConfig || Object.keys(firebaseConfig).length === 0) {
          const configToSave: Record<string, any> = {};
          workoutsMapFromMock.forEach((workout, day) => {
            const exerciseData = workout.exercises.map((ex) => {
              const exercise: any = {
                id: ex.id,
                name: ex.name,
                type: ex.type || "strength",
                sets: typeof ex.sets === "number" ? ex.sets : 0,
                reps: ex.reps || "",
                rest: ex.rest !== undefined ? ex.rest : (ex.type === "cardio" ? 30 : 60),
                completed: false,
              };
              
              // Adicionar campos opcionais apenas se existirem
              if (ex.weight !== undefined) exercise.weight = ex.weight;
              if (ex.minutes !== undefined) exercise.minutes = ex.minutes;
              if (ex.averageSpeed !== undefined) exercise.averageSpeed = ex.averageSpeed;
              if (ex.videoUrl) exercise.videoUrl = ex.videoUrl;
              if (ex.intensity) exercise.intensity = ex.intensity;
              if (ex.activityTemplateId) exercise.activityTemplateId = ex.activityTemplateId;
              
              return exercise;
            });
            
            configToSave[day] = {
              dayOfWeek: workout.dayOfWeek,
              dayLabel: workout.dayLabel,
              muscleGroup: workout.muscleGroup,
              exercises: exerciseData,
              isWeekend: workout.isWeekend,
            };
          });
          
          // Remover campos undefined antes de salvar
          const cleanedConfig = removeUndefinedFields(configToSave);
          await workoutService.saveWorkoutConfig(cleanedConfig);
        } else {
          // Mesmo que tenha Firebase, garantir que todos os dias estão presentes
          let needsUpdate = false;
          dayNames.forEach((day) => {
            if (!firebaseConfig[day]) {
              needsUpdate = true;
            } else if (!firebaseConfig[day].exercises || firebaseConfig[day].exercises.length === 0) {
              // Se o dia existe mas não tem exercícios, usar mock se disponível
              if (mockWorkoutsByDay[day] && mockWorkoutsByDay[day].exercises.length > 0) {
                needsUpdate = true;
              }
            }
          });
          
          if (needsUpdate) {
            const configToSave: Record<string, any> = {};
            workoutsMapFromMock.forEach((workout, day) => {
              const exerciseData = workout.exercises.map((ex) => {
                const exercise: any = {
                  id: ex.id,
                  name: ex.name,
                  type: ex.type || "strength",
                  sets: typeof ex.sets === "number" ? ex.sets : 0,
                  reps: ex.reps || "",
                  rest: ex.rest !== undefined ? ex.rest : (ex.type === "cardio" ? 30 : 60),
                  completed: false,
                };
                
                // Adicionar campos opcionais apenas se existirem
                if (ex.weight !== undefined) exercise.weight = ex.weight;
                if (ex.minutes !== undefined) exercise.minutes = ex.minutes;
                if (ex.averageSpeed !== undefined) exercise.averageSpeed = ex.averageSpeed;
                if (ex.videoUrl) exercise.videoUrl = ex.videoUrl;
                if (ex.intensity) exercise.intensity = ex.intensity;
                if (ex.activityTemplateId) exercise.activityTemplateId = ex.activityTemplateId;
                
                return exercise;
              });
              
              configToSave[day] = {
                dayOfWeek: workout.dayOfWeek,
                dayLabel: workout.dayLabel,
                muscleGroup: workout.muscleGroup,
                exercises: exerciseData,
                isWeekend: workout.isWeekend,
              };
            });
            
            // Remover campos undefined antes de salvar
            const cleanedConfig = removeUndefinedFields(configToSave);
            await workoutService.saveWorkoutConfig(cleanedConfig);
          }
        }
      } catch (error) {
        console.error("Erro ao carregar treinos:", error);
      }
    };

    loadData();
  }, []);

  const currentWorkout = workouts.get(selectedDay);

  const [showAddExerciseModal, setShowAddExerciseModal] = useState(false);
  const [newExerciseType, setNewExerciseType] = useState<ExerciseType>("strength");

  const handleAddExercise = async (type: ExerciseType = "strength", templateId?: string) => {
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
    await saveWorkouts(updated, true);
    setShowAddExerciseModal(false);
  };

  const handleUpdateExercise = async (exerciseId: string, updates: Partial<Exercise>) => {
    const updated = new Map(workouts);
    const workout = updated.get(selectedDay);
    if (workout) {
      workout.exercises = workout.exercises.map((ex) =>
        ex.id === exerciseId ? { ...ex, ...updates } : ex
      );
      updated.set(selectedDay, workout);
      setWorkouts(updated);
      await saveWorkouts(updated);
    }
  };

  const handleDeleteExercise = async (exerciseId: string) => {
    const updated = new Map(workouts);
    const workout = updated.get(selectedDay);
    if (workout) {
      workout.exercises = workout.exercises.filter((ex) => ex.id !== exerciseId);
      updated.set(selectedDay, workout);
      setWorkouts(updated);
      await saveWorkouts(updated);
    }
  };

  const handleUpdateMuscleGroup = async (muscleGroup: string) => {
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
    await saveWorkouts(updated);
  };

  const saveWorkouts = async (workoutsToSave: Map<string, WorkoutDay>, showFeedback = false) => {
    setIsSaving(true);
    setSaveError(null);
    
    try {
      const config: Record<string, any> = {};
      workoutsToSave.forEach((workout, day) => {
        if (workout && workout.exercises) {
          const exerciseData = workout.exercises.map((ex) => {
            const exercise: any = {
              id: ex.id,
              name: ex.name,
              type: ex.type || "strength",
              sets: typeof ex.sets === "number" ? ex.sets : (typeof ex.sets === "string" ? parseInt(ex.sets) || 0 : 0),
              reps: ex.reps || "",
              rest: ex.rest !== undefined ? ex.rest : (ex.type === "cardio" ? 30 : 60),
              completed: false, // Sempre false na configuração
            };
            
            // Adicionar campos opcionais apenas se existirem
            if (ex.weight !== undefined) exercise.weight = ex.weight;
            if (ex.minutes !== undefined) exercise.minutes = ex.minutes;
            if (ex.averageSpeed !== undefined) exercise.averageSpeed = ex.averageSpeed;
            if (ex.videoUrl) exercise.videoUrl = ex.videoUrl;
            if (ex.intensity) exercise.intensity = ex.intensity;
            if (ex.activityTemplateId) exercise.activityTemplateId = ex.activityTemplateId;
            
            return exercise;
          });
          
          config[day] = {
            dayOfWeek: workout.dayOfWeek,
            dayLabel: workout.dayLabel,
            muscleGroup: workout.muscleGroup,
            exercises: exerciseData,
            isWeekend: workout.isWeekend,
          };
        }
      });
      
      // Remover campos undefined antes de salvar
      const cleanedConfig = removeUndefinedFields(config);
      
      console.log("Salvando configuração de treino:", cleanedConfig);
      await workoutService.saveWorkoutConfig(cleanedConfig);
      console.log("Configuração salva com sucesso!");
      
      // Disparar evento para atualizar página de treino
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("workoutConfigUpdated"));
      }
      
      if (showFeedback) {
        setShowSuccessMessage(true);
        setTimeout(() => {
          setShowSuccessMessage(false);
        }, 3000);
      }
    } catch (e) {
      console.error("Erro ao salvar treinos:", e);
      const errorMessage = e instanceof Error ? e.message : "Erro ao salvar treinos";
      setSaveError(errorMessage);
      setTimeout(() => {
        setSaveError(null);
      }, 5000);
    } finally {
      setIsSaving(false);
    }
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
        <button
          onClick={() => saveWorkouts(workouts, true)}
          disabled={isSaving}
          className={`rounded-xl border px-6 py-2.5 text-sm font-medium transition-colors whitespace-nowrap ${
            isSaving
              ? "border-zinc-700 bg-zinc-800/60 text-zinc-500 cursor-not-allowed"
              : "border-jagger-400 bg-jagger-500/20 text-jagger-300 hover:bg-jagger-500/30 hover:border-jagger-300"
          }`}
        >
          {isSaving ? "Salvando..." : "💾 Salvar Exercícios"}
        </button>
      </header>

      {/* Mensagens de feedback */}
      {showSuccessMessage && (
        <div className="glass-panel rounded-xl border border-green-500/50 bg-green-500/10 p-4">
          <p className="text-sm font-medium text-green-400">
            ✓ Exercícios salvos com sucesso!
          </p>
        </div>
      )}
      
      {saveError && (
        <div className="glass-panel rounded-xl border border-red-500/50 bg-red-500/10 p-4">
          <p className="text-sm font-medium text-red-400">
            ✗ Erro ao salvar: {saveError}
          </p>
        </div>
      )}

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

