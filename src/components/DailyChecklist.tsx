"use client";

import { useState, useEffect, useCallback } from "react";
import type { ChecklistItem, DailyChecklist } from "@/types/meals";

interface DailyChecklistProps {
  date: Date;
  onScoreChange?: (score: number) => void;
  onAddSpecialCheck?: () => void;
}

// Função para calcular score ponderado
function calculateScore(items: ChecklistItem[], checkedIds: Set<string>, isWeekend: boolean): number {
  if (items.length === 0) return 100;

  // Nos fins de semana, excluir "Treino concluído" do cálculo de score
  const itemsForScore = isWeekend 
    ? items.filter(item => item.id !== "workout-completed")
    : items;

  const totalWeight = itemsForScore.reduce((sum, item) => sum + item.weight, 0);
  if (totalWeight === 0) return 100;

  const checkedWeight = itemsForScore
    .filter((item) => checkedIds.has(item.id))
    .reduce((sum, item) => sum + item.weight, 0);

  return Math.round((checkedWeight / totalWeight) * 100);
}

// Função para distribuir pesos automaticamente
function distributeWeights(
  defaultItems: ChecklistItem[],
  specialItems: ChecklistItem[],
  isWeekend: boolean
): ChecklistItem[] {
  // Nos fins de semana, substituir "Treino concluído" por "Estudar"
  let itemsToUse = [...defaultItems];
  const workoutIndex = itemsToUse.findIndex(item => item.id === "workout-completed");
  
  if (isWeekend) {
    // Remover "Treino concluído" do cálculo de score (mas manter na lista se existir)
    itemsToUse = itemsToUse.filter(item => item.id !== "workout-completed");
    
    // Adicionar "Estudar" se não existir
    const hasStudy = itemsToUse.some(item => item.id === "study");
    if (!hasStudy) {
      itemsToUse.splice(1, 0, { // Inserir na posição 1 (depois de "8h de sono")
        id: "study",
        label: "Estudar",
        isSpecial: false,
        weight: 0, // Será calculado
      });
    }
  }

  const allItems = [...itemsToUse, ...specialItems];
  const specialCount = specialItems.length;
  const defaultCount = itemsToUse.length;

  // Se não tem missões especiais, os 3 primeiros têm peso maior (80% total)
  if (specialCount === 0) {
    const highWeightItems = itemsToUse.slice(0, 3);
    const lowWeightItems = itemsToUse.slice(3);

    const highWeightTotal = 80;
    const lowWeightTotal = 20;

    const highWeightPerItem = highWeightTotal / highWeightItems.length;
    const lowWeightPerItem =
      lowWeightItems.length > 0 ? lowWeightTotal / lowWeightItems.length : 0;

    return allItems.map((item, idx) => {
      const originalIdx = itemsToUse.findIndex(i => i.id === item.id);
      if (originalIdx >= 0 && originalIdx < 3) {
        return { ...item, weight: highWeightPerItem };
      }
      if (originalIdx >= 0) {
        return { ...item, weight: lowWeightPerItem };
      }
      // Item especial (não deve acontecer aqui)
      return { ...item, weight: 0 };
    });
  }

  // Se tem missões especiais, redistribuir
  // Os 3 primeiros padrões têm peso maior, missões especiais têm peso médio, último padrão tem peso menor
  const highWeightItems = itemsToUse.slice(0, 3);
  const specialWeightItems = specialItems;
  const lowWeightItems = itemsToUse.slice(3);

  const highWeightTotal = 70; // 70% para os 3 primeiros
  const specialWeightTotal = 20; // 20% para missões especiais
  const lowWeightTotal = 10; // 10% para o restante

  const highWeightPerItem = highWeightTotal / highWeightItems.length;
  const specialWeightPerItem =
    specialWeightItems.length > 0
      ? specialWeightTotal / specialWeightItems.length
      : 0;
  const lowWeightPerItem =
    lowWeightItems.length > 0 ? lowWeightTotal / lowWeightItems.length : 0;

  return allItems.map((item) => {
    if (highWeightItems.some((h) => h.id === item.id)) {
      return { ...item, weight: highWeightPerItem };
    }
    if (specialWeightItems.some((s) => s.id === item.id)) {
      return { ...item, weight: specialWeightPerItem };
    }
    const originalIdx = itemsToUse.findIndex(i => i.id === item.id);
    if (originalIdx >= 0) {
      return { ...item, weight: lowWeightPerItem };
    }
    return { ...item, weight: 0 };
  });
}

export function DailyChecklist({ date, onScoreChange, onAddSpecialCheck }: DailyChecklistProps) {
  const dateKey = date.toISOString().split("T")[0];
  const [checkedIds, setCheckedIds] = useState<Set<string>>(new Set());
  const [items, setItems] = useState<ChecklistItem[]>([]);

  // Função para verificar se todos os treinos do dia foram completados
  const checkWorkoutCompleted = useCallback((dateKey: string): boolean => {
    // Verificar se há treinos salvos para este dia
    const saved = localStorage.getItem(`workout_${dateKey}`);
    if (!saved) return false;
    
    try {
      const workout = JSON.parse(saved);
      if (!workout.exercises || workout.exercises.length === 0) return false;
      
      // Verificar se todos os exercícios foram completados
      return workout.exercises.every((ex: any) => ex.completed === true);
    } catch (e) {
      return false;
    }
  }, []);

  // Carregar checklist padrão e checks especiais do dia
  useEffect(() => {
    // Carregar checklist padrão
    const defaultChecklist = localStorage.getItem("default_checklist");
    let defaultItems: ChecklistItem[] = [];
    if (defaultChecklist) {
      try {
        defaultItems = JSON.parse(defaultChecklist);
      } catch (e) {
        console.error("Erro ao carregar checklist padrão:", e);
      }
    }

    // Se não tiver padrão salvo, usar os padrões iniciais
    if (defaultItems.length === 0) {
      defaultItems = [
        {
          id: "sleep-8h",
          label: "8h de sono",
          isSpecial: false,
          weight: 26.67,
        },
        {
          id: "workout-completed",
          label: "Treino concluído",
          isSpecial: false,
          weight: 26.67,
        },
        {
          id: "no-processed",
          label: "Sem doces/processados",
          isSpecial: false,
          weight: 26.67,
        },
        {
          id: "water-3l",
          label: "+3L de água",
          isSpecial: false,
          weight: 20,
        },
      ];
    }

    // Verificar se é fim de semana
    const dayOfWeek = date.getDay();
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6; // 0 = domingo, 6 = sábado

    // Carregar checks especiais do dia
    const specialChecklist = localStorage.getItem(`special_checks_${dateKey}`);
    let specialItems: ChecklistItem[] = [];
    if (specialChecklist) {
      try {
        specialItems = JSON.parse(specialChecklist);
      } catch (e) {
        console.error("Erro ao carregar checks especiais:", e);
      }
    }

    // Distribuir pesos automaticamente (considerando fim de semana)
    const allItems = distributeWeights(defaultItems, specialItems, isWeekend);
    setItems(allItems);

    // Carregar estado salvo do dia
    const savedState = localStorage.getItem(`checklist_state_${dateKey}`);
    let initialCheckedIds = new Set<string>();
    if (savedState) {
      try {
        const parsed = JSON.parse(savedState);
        initialCheckedIds = new Set(parsed.checkedIds || []);
      } catch (e) {
        console.error("Erro ao carregar estado do checklist:", e);
      }
    }

    // Verificar se treino foi completado automaticamente (apenas em dias de semana)
    if (!isWeekend) {
      const workoutCompleted = checkWorkoutCompleted(dateKey);
      if (workoutCompleted) {
        const workoutItem = allItems.find(item => item.id === "workout-completed");
        if (workoutItem) {
          initialCheckedIds.add("workout-completed");
        }
      } else {
        initialCheckedIds.delete("workout-completed");
      }
    } else {
      // Nos fins de semana, remover "workout-completed" do checkedIds
      initialCheckedIds.delete("workout-completed");
    }

    setCheckedIds(initialCheckedIds);
  }, [dateKey, date]);

  // Escutar eventos de atualização (sem causar loop)
  useEffect(() => {
    const dayOfWeek = date.getDay();
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
    
    // Só escutar eventos de treino em dias de semana
    if (isWeekend) return;
    
    const handleWorkoutUpdate = (e: CustomEvent) => {
      // Só atualizar se for para este dia
      if (e.detail?.dateKey === dateKey) {
        // Verificar treino quando atualizar
        const saved = localStorage.getItem(`workout_${dateKey}`);
        let workoutCompleted = false;
        if (saved) {
          try {
            const workout = JSON.parse(saved);
            if (workout.exercises && workout.exercises.length > 0) {
              workoutCompleted = workout.exercises.every((ex: any) => ex.completed === true);
            }
          } catch (e) {
            // Ignorar erro
          }
        }
        
        setCheckedIds(prev => {
          const newSet = new Set(prev);
          if (workoutCompleted) {
            newSet.add("workout-completed");
          } else {
            newSet.delete("workout-completed");
          }
          return newSet;
        });
      }
    };
    
    window.addEventListener("workoutUpdated", handleWorkoutUpdate as EventListener);
    
    return () => {
      window.removeEventListener("workoutUpdated", handleWorkoutUpdate as EventListener);
    };
  }, [dateKey, date]);

  // Calcular e salvar score quando mudar (sem disparar eventos que causam loops)
  useEffect(() => {
    if (items.length === 0) return; // Não calcular se não tiver items ainda
    
    const dayOfWeek = date.getDay();
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
    const score = calculateScore(items, checkedIds, isWeekend);
    
    // Salvar estado
    localStorage.setItem(
      `checklist_state_${dateKey}`,
      JSON.stringify({ checkedIds: Array.from(checkedIds) })
    );

    // Salvar score do dia
    const dailyChecklist: DailyChecklist = {
      date: dateKey,
      items: items,
      score: score,
    };
    localStorage.setItem(
      `daily_checklist_${dateKey}`,
      JSON.stringify(dailyChecklist)
    );

    // Notificar mudança de score (sem causar loop)
    if (onScoreChange) {
      onScoreChange(score);
    }
  }, [checkedIds, items, dateKey, onScoreChange]);

  const handleToggle = (itemId: string) => {
    setCheckedIds((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(itemId)) {
        newSet.delete(itemId);
      } else {
        newSet.add(itemId);
      }
      return newSet;
    });
  };

  const dayOfWeek = date.getDay();
  const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
  const score = calculateScore(items, checkedIds, isWeekend);
  const defaultItems = items.filter((item) => !item.isSpecial);
  const specialItems = items.filter((item) => item.isSpecial);

  return (
    <div className="glass-panel rounded-3xl p-4">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <h3 className="text-sm font-medium text-zinc-100">
            Missões do Dia
          </h3>
          <p className="mt-0.5 text-xs text-zinc-400">
            {date.toLocaleDateString("pt-BR", {
              weekday: "long",
              day: "numeric",
              month: "long",
            })}
          </p>
        </div>
        <button 
          onClick={() => {
            if (typeof window !== "undefined") {
              window.location.href = "/perfil?tab=checklist-config";
            }
          }}
          className="rounded-full border border-zinc-700/80 bg-zinc-950/60 px-3 py-1 text-[11px] text-zinc-300 hover:border-jagger-400/60 hover:text-jagger-100"
        >
          Ajustar perguntas
        </button>
      </div>

      <div className="mt-3 space-y-2.5">
        {/* Checks padrão */}
        {defaultItems.map((item, idx) => {
          const isWorkoutItem = item.id === "workout-completed";
          const isStudyItem = item.id === "study";
          const isChecked = checkedIds.has(item.id);
          const isWorkoutCompleted = isWorkoutItem && isChecked;
          
          // Nos fins de semana, não mostrar "Treino concluído" (ou mostrar mas sem peso no score)
          if (isWeekend && isWorkoutItem) {
            return null; // Não renderizar "Treino concluído" nos fins de semana
          }
          
          return (
            <label
              key={item.id}
              className={`flex items-center gap-3 rounded-2xl px-3 py-2.5 text-xs transition-colors ${
                isWorkoutItem 
                  ? `cursor-not-allowed ${isWorkoutCompleted ? "bg-emerald-500/10 border border-emerald-500/30" : "bg-zinc-950/60"}`
                  : "cursor-pointer bg-zinc-950/60 hover:bg-zinc-900/80"
              }`}
            >
              <input
                type="checkbox"
                checked={isChecked}
                onChange={() => handleToggle(item.id)}
                disabled={isWorkoutItem}
                className={`h-4 w-4 rounded border-zinc-600 bg-zinc-900 disabled:cursor-not-allowed ${
                  isWorkoutCompleted 
                    ? "text-emerald-400 accent-emerald-400 border-emerald-500/60" 
                    : "text-emerald-400 accent-emerald-400"
                }`}
              />
            <div className="flex flex-col flex-1">
              <span className={`${isWorkoutCompleted ? "text-emerald-300" : "text-zinc-100"}`}>
                {item.label}
              </span>
              {(idx < 3 || (isWeekend && isStudyItem)) && (
                <span className="text-[11px] text-zinc-500">
                  Peso maior no score do dia.
                </span>
              )}
            </div>
            {item.weight > 0 && (
              <span className={`text-[10px] ${isWorkoutCompleted ? "text-emerald-400/60" : "text-zinc-600"}`}>
                {item.weight.toFixed(1)}pts
              </span>
            )}
            {isWorkoutItem && (
              <span className={`text-[10px] italic ${isWorkoutCompleted ? "text-emerald-400" : "text-zinc-500"}`}>
                {isWorkoutCompleted ? "✓ Concluído" : "(Automático)"}
              </span>
            )}
          </label>
          );
        })}

        {/* Checks especiais */}
        {specialItems.map((item) => (
          <div
            key={item.id}
            className="flex items-center gap-3 rounded-2xl bg-jagger-500/10 border border-jagger-400/30 px-3 py-2.5 text-xs hover:bg-jagger-500/20 transition-colors"
          >
            <label className="flex cursor-pointer items-center gap-3 flex-1">
              <input
                type="checkbox"
                checked={checkedIds.has(item.id)}
                onChange={() => handleToggle(item.id)}
                className="h-4 w-4 rounded border-jagger-400/60 bg-zinc-900 text-jagger-400 accent-jagger-400"
              />
              <div className="flex flex-col flex-1">
                <span className="text-zinc-100 flex items-center gap-1.5">
                  <span className="text-jagger-300">⭐</span>
                  {item.label}
                </span>
                <span className="text-[11px] text-jagger-400/80">
                  Missão especial do dia
                </span>
              </div>
              {item.weight > 0 && (
                <span className="text-[10px] text-jagger-400/60">
                  {item.weight.toFixed(1)}pts
                </span>
              )}
            </label>
            <button
              onClick={() => {
                // Remover missão especial
                const updated = specialItems.filter(i => i.id !== item.id);
                localStorage.setItem(`special_checks_${dateKey}`, JSON.stringify(updated));
                
                // Remover do checkedIds se estiver marcado
                setCheckedIds(prev => {
                  const newSet = new Set(prev);
                  newSet.delete(item.id);
                  return newSet;
                });
                
                // Recarregar items do checklist
                const defaultChecklist = localStorage.getItem("default_checklist");
                let defaultItems: ChecklistItem[] = [];
                if (defaultChecklist) {
                  try {
                    defaultItems = JSON.parse(defaultChecklist);
                  } catch (e) {
                    console.error("Erro ao carregar checklist padrão:", e);
                  }
                }
                if (defaultItems.length === 0) {
                  defaultItems = [
                    { id: "sleep-8h", label: "8h de sono", isSpecial: false, weight: 26.67 },
                    { id: "workout-completed", label: "Treino concluído", isSpecial: false, weight: 26.67 },
                    { id: "no-processed", label: "Sem doces/processados", isSpecial: false, weight: 26.67 },
                    { id: "water-3l", label: "+3L de água", isSpecial: false, weight: 20 },
                  ];
                }
                
                const dayOfWeek = date.getDay();
                const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
                const allItems = distributeWeights(defaultItems, updated, isWeekend);
                setItems(allItems);
                
                // Disparar evento para atualizar calendário
                window.dispatchEvent(new CustomEvent("checklistUpdated", { detail: { dateKey } }));
              }}
              className="ml-2 rounded-lg p-1.5 text-red-400 hover:bg-red-500/10 transition-colors"
              title="Excluir missão especial"
            >
              ✕
            </button>
          </div>
        ))}
      </div>

      {onAddSpecialCheck && (
        <button
          onClick={onAddSpecialCheck}
          className="mt-3 self-start rounded-full border border-dashed border-jagger-400/40 px-3 py-1.5 text-[11px] text-jagger-300 hover:border-jagger-400/60 hover:bg-jagger-500/10 transition-colors flex items-center gap-1.5"
        >
          <span>⭐</span>
          <span>Adicionar missão especial</span>
        </button>
      )}

      <div className="mt-4 flex items-center justify-between rounded-2xl bg-zinc-950/70 px-3 py-2 text-[11px] text-zinc-400">
        <span>
          🔥 Score de hoje:{" "}
          <span
            className={`font-semibold ${
              score >= 80
                ? "text-emerald-300"
                : score >= 60
                ? "text-jagger-200"
                : "text-red-300"
            }`}
          >
            {score} / 100
          </span>
        </span>
        <span
          className={`hidden sm:inline ${
            score === 100
              ? "text-emerald-400"
              : score >= 80
              ? "text-emerald-300"
              : score >= 60
              ? "text-jagger-300"
              : "text-red-400"
          }`}
        >
          {score === 100
            ? "Missão completa!"
            : score >= 80
            ? "Quase lá!"
            : score >= 60
            ? "Bom progresso"
            : "Continue!"}
        </span>
      </div>
    </div>
  );
}

