"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import type { ChecklistItem } from "@/types/meals";
import { checklistService, workoutService } from "@/lib/firebaseService";
import { isWorkoutDayCompleted } from "@/lib/workoutProgress";

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

  // Função para verificar se o dia de treino já conta como concluído
  const checkWorkoutCompleted = useCallback(async (dateKey: string): Promise<boolean> => {
    try {
      const workout = await workoutService.getWorkout(dateKey);
      if (!workout || !workout.exercises || workout.exercises.length === 0) return false;

      return isWorkoutDayCompleted(workout.exercises);
    } catch (e) {
      return false;
    }
  }, []);

  // Carregar checklist padrão e checks especiais do dia
  useEffect(() => {
    const loadChecklist = async () => {
      // Carregar checklist padrão do Firebase
      let defaultItems: ChecklistItem[] = [];
      try {
        defaultItems = await checklistService.getDefaultChecklist();
      } catch (e) {
        console.error("Erro ao carregar checklist padrão:", e);
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

      // Carregar checks especiais do dia do Firebase
      let specialItems: ChecklistItem[] = [];
      try {
        specialItems = await checklistService.getSpecialChecks(dateKey);
      } catch (e) {
        console.error("Erro ao carregar checks especiais:", e);
      }

      // Distribuir pesos automaticamente (considerando fim de semana)
      const allItems = distributeWeights(defaultItems, specialItems, isWeekend);
      setItems(allItems);

      // Carregar estado salvo do dia do Firebase
      let savedCheckedIds = new Set<string>();
      try {
        savedCheckedIds = await checklistService.getChecklistState(dateKey);
        console.log(`[DailyChecklist] Estado carregado do Firebase para ${dateKey}:`, Array.from(savedCheckedIds));
      } catch (e) {
        console.error("Erro ao carregar estado do checklist:", e);
      }

      // Criar um novo Set para não modificar o estado salvo diretamente
      const initialCheckedIds = new Set(savedCheckedIds);

      // Verificar se treino foi completado automaticamente (apenas em dias de semana)
      if (!isWeekend) {
        const workoutCompleted = await checkWorkoutCompleted(dateKey);
        if (workoutCompleted) {
          const workoutItem = allItems.find(item => item.id === "workout-completed");
          if (workoutItem) {
            initialCheckedIds.add("workout-completed");
            console.log(`[DailyChecklist] Treino completado detectado, adicionando workout-completed`);
          }
        } else {
          initialCheckedIds.delete("workout-completed");
          console.log(`[DailyChecklist] Treino não completado, removendo workout-completed`);
        }
      } else {
        // Nos fins de semana, remover "workout-completed" do checkedIds
        initialCheckedIds.delete("workout-completed");
      }

      console.log(`[DailyChecklist] Estado final após processamento para ${dateKey}:`, Array.from(initialCheckedIds));
      setCheckedIds(initialCheckedIds);
    };

    loadChecklist();
  }, [dateKey, date, checkWorkoutCompleted]);

  // Escutar eventos de atualização (sem causar loop)
  useEffect(() => {
    const dayOfWeek = date.getDay();
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
    
    // Só escutar eventos de treino em dias de semana
    if (isWeekend) return;
    
    const handleWorkoutUpdate = (e: Event) => {
      const customEvent = e as CustomEvent;
      // Só atualizar se for para este dia
      if (customEvent.detail?.dateKey === dateKey) {
        // Verificar treino quando atualizar
        workoutService.getWorkout(dateKey).then((workout) => {
          const workoutCompleted = isWorkoutDayCompleted(workout?.exercises);
          
          setCheckedIds(prev => {
            const newSet = new Set(prev);
            if (workoutCompleted) {
              newSet.add("workout-completed");
            } else {
              newSet.delete("workout-completed");
            }
            return newSet;
          });
        }).catch(() => {
          // Ignorar erro
        });
      }
    };
    
    window.addEventListener("workoutUpdated", handleWorkoutUpdate);
    
    return () => {
      window.removeEventListener("workoutUpdated", handleWorkoutUpdate);
    };
  }, [dateKey, date]);

  // Calcular e salvar score quando mudar (sem disparar eventos que causam loops)
  // NOTA: Este useEffect é um backup. O salvamento principal acontece no handleToggle
  // Usar useRef para evitar salvamentos desnecessários
  const lastSavedStateRef = useRef<string>("");
  
  useEffect(() => {
    if (items.length === 0) return; // Não calcular se não tiver items ainda
    
    // Criar uma string única do estado atual para comparar
    const currentStateString = Array.from(checkedIds).sort().join(",");
    
    // Se o estado não mudou desde o último salvamento, não salvar novamente
    if (lastSavedStateRef.current === currentStateString) {
      return;
    }
    
    const saveChecklist = async () => {
      const dayOfWeek = date.getDay();
      const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
      const score = calculateScore(items, checkedIds, isWeekend);
      
      try {
        // Salvar estado no Firebase (backup)
        await checklistService.saveChecklistState(dateKey, checkedIds);

        // Salvar checklist completo com score no Firebase
        await checklistService.saveDailyChecklist(dateKey, items, score);
        
        // Atualizar referência do último estado salvo
        lastSavedStateRef.current = currentStateString;
        
        // Notificar mudança de score (sem causar loop)
        if (onScoreChange) {
          onScoreChange(score);
        }
      } catch (e) {
        console.error("Erro ao salvar checklist no useEffect:", e);
      }
    };

    // Usar um pequeno delay para evitar múltiplos salvamentos
    const timeoutId = setTimeout(() => {
      saveChecklist();
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [checkedIds, items, dateKey, date, onScoreChange]);

  const handleToggle = async (itemId: string) => {
    console.log(`[DailyChecklist] handleToggle chamado para ${itemId} no dia ${dateKey}`);
    console.log(`[DailyChecklist] Estado atual:`, Array.from(checkedIds));
    
    const newCheckedIds = new Set(checkedIds);
    if (newCheckedIds.has(itemId)) {
      newCheckedIds.delete(itemId);
      console.log(`[DailyChecklist] Removendo ${itemId}`);
    } else {
      newCheckedIds.add(itemId);
      console.log(`[DailyChecklist] Adicionando ${itemId}`);
    }
    
    console.log(`[DailyChecklist] Novo estado:`, Array.from(newCheckedIds));
    setCheckedIds(newCheckedIds);
    
    // Atualizar referência do último estado salvo
    lastSavedStateRef.current = Array.from(newCheckedIds).sort().join(",");
    
    // Salvar imediatamente no Firebase
    try {
      console.log(`[DailyChecklist] Salvando estado para ${dateKey}:`, Array.from(newCheckedIds));
      await checklistService.saveChecklistState(dateKey, newCheckedIds);
      console.log(`[DailyChecklist] Estado salvo com sucesso para ${dateKey}`);
      
      // Recalcular e salvar score
      const dayOfWeek = date.getDay();
      const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
      const score = calculateScore(items, newCheckedIds, isWeekend);
      await checklistService.saveDailyChecklist(dateKey, items, score);
      console.log(`[DailyChecklist] Score calculado e salvo: ${score}`);
      
      // Notificar mudança de score
      if (onScoreChange) {
        onScoreChange(score);
      }
    } catch (e) {
      console.error("[DailyChecklist] Erro ao salvar checklist:", e);
    }
  };

  const dayOfWeek = date.getDay();
  const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
  const score = calculateScore(items, checkedIds, isWeekend);
  const defaultItems = items.filter((item) => !item.isSpecial);
  const specialItems = items.filter((item) => item.isSpecial);

  return (
    <div className="rounded-3xl border border-zinc-800/90 bg-zinc-950 p-3 md:p-4">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <h3 className="text-sm pt-2 pb-1 font-medium text-zinc-100">
            Missões do Dia
          </h3>
          <p className="mt-0.5 pb-2 text-xs text-zinc-400">
            {date.toLocaleDateString("pt-BR", {
              weekday: "long",
              day: "numeric",
              month: "long",
            })}
          </p>
        </div>
        <button
          type="button"
          aria-label="Ajustar perguntas do checklist"
          title="Ajustar perguntas"
          onClick={() => {
            if (typeof window !== "undefined") {
              window.location.href = "/perfil?tab=checklist-config";
            }
          }}
          className="rounded-lg border border-zinc-700/80 bg-zinc-950 px-2.5 py-2 text-lg leading-none text-zinc-300 transition-colors hover:border-jagger-400/60 hover:text-jagger-100"
        >
          ⚙️
        </button>
      </div>

      <div className="mt-3 space-y-2.5">
        {/* Checks padrão */}
        {defaultItems.map((item) => {
          const isWorkoutItem = item.id === "workout-completed";
          const isChecked = checkedIds.has(item.id);
          const isWorkoutCompleted = isWorkoutItem && isChecked;
          
          // Nos fins de semana, não mostrar "Treino concluído" (ou mostrar mas sem peso no score)
          if (isWeekend && isWorkoutItem) {
            return null; // Não renderizar "Treino concluído" nos fins de semana
          }
          
          return (
            <label
              key={item.id}
              className={`flex items-center gap-3 rounded-2xl bg-zinc-950 px-3 py-2.5 text-sm transition-colors ${
                isWorkoutItem ? "cursor-not-allowed" : "cursor-pointer"
              }`}
            >
              <input
                type="checkbox"
                checked={isChecked}
                onChange={() => handleToggle(item.id)}
                disabled={isWorkoutItem}
                className={`h-4 w-4 shrink-0 rounded border-zinc-600 bg-zinc-900 disabled:cursor-not-allowed ${
                  isWorkoutCompleted 
                    ? "border-emerald-500/60 text-emerald-400 accent-emerald-400" 
                    : "text-emerald-400 accent-emerald-400"
                }`}
              />
            <div className="flex min-w-0 flex-1 flex-col">
              <span
                className={
                  isChecked
                    ? "text-zinc-500 line-through decoration-zinc-500"
                    : "text-zinc-100"
                }
              >
                {item.label}
              </span>

            </div>
            {item.weight > 0 && (
              <span
                className={`shrink-0 text-[10px] ${isChecked ? "text-zinc-600 line-through decoration-zinc-600" : "text-zinc-600"}`}
              >
                {item.weight.toFixed(1)}pts
              </span>
            )}
            {isWorkoutItem && (
              <span className={`shrink-0 text-[10px] italic ${isWorkoutCompleted ? "text-zinc-500 line-through decoration-zinc-500" : "text-zinc-500"}`}>
                {isWorkoutCompleted ? "✓ Concluído" : "(Automático)"}
              </span>
            )}
          </label>
          );
        })}

        {/* Checks especiais */}
        {specialItems.map((item) => {
          const spChecked = checkedIds.has(item.id);
          return (
          <div
            key={item.id}
            className="flex items-center gap-3 rounded-2xl bg-zinc-950 px-3 py-2.5 text-xs transition-colors"
          >
            <label className="flex flex-1 cursor-pointer items-center gap-3">
              <input
                type="checkbox"
                checked={spChecked}
                onChange={() => handleToggle(item.id)}
                className="h-4 w-4 shrink-0 rounded border-zinc-600 bg-zinc-900 text-zinc-300 accent-zinc-400"
              />
              <div className="flex min-w-0 flex-1 flex-col">
                <span
                  className={`flex items-center gap-1.5 ${
                    spChecked
                      ? "text-zinc-500 line-through decoration-zinc-500"
                      : "text-zinc-100"
                  }`}
                >
                  <span className="text-zinc-400">⭐</span>
                  {item.label}
                </span>
                <span
                  className={`text-[11px] ${spChecked ? "text-zinc-600 line-through decoration-zinc-600" : "text-zinc-500"}`}
                >
                  Missão especial do dia
                </span>
              </div>
              {item.weight > 0 && (
                <span
                  className={`shrink-0 text-[10px] ${spChecked ? "text-zinc-600 line-through decoration-zinc-600" : "text-zinc-600"}`}
                >
                  {item.weight.toFixed(1)}pts
                </span>
              )}
            </label>
            <button
              onClick={async () => {
                // Remover missão especial
                const updated = specialItems.filter(i => i.id !== item.id);
                
                try {
                  // Salvar no Firebase
                  await checklistService.saveSpecialChecks(dateKey, updated);
                } catch (e) {
                  console.error("Erro ao salvar checks especiais:", e);
                }
                
                // Remover do checkedIds se estiver marcado
                setCheckedIds(prev => {
                  const newSet = new Set(prev);
                  newSet.delete(item.id);
                  return newSet;
                });
                
                // Recarregar items do checklist
                let defaultItems: ChecklistItem[] = [];
                try {
                  defaultItems = await checklistService.getDefaultChecklist();
                } catch (e) {
                  console.error("Erro ao carregar checklist padrão:", e);
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
          );
        })}
      </div>

      <div className="mt-4 border-t border-zinc-800/90 pt-3 text-[11px] text-zinc-400">
        <div className="flex items-center justify-between gap-2">
          <span className="min-w-0 shrink">
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
          {onAddSpecialCheck && (
            <button
              type="button"
              onClick={onAddSpecialCheck}
              className="shrink-0 rounded-lg border border-dashed border-jagger-400/40 px-2 py-1.5 text-[10px] text-jagger-300 transition-colors hover:border-jagger-400/60 hover:bg-jagger-500/10 md:hidden"
            >
              <span className="flex items-center gap-1 whitespace-nowrap">
                <span>⭐</span>
                <span>Missão especial</span>
              </span>
            </button>
          )}
          <span
            className={`hidden shrink-0 md:inline ${
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
        {onAddSpecialCheck && (
          <button
            type="button"
            onClick={onAddSpecialCheck}
            className="mt-2 hidden w-full rounded-lg border border-dashed border-jagger-400/40 px-3 py-2 text-[11px] text-jagger-300 transition-colors hover:border-jagger-400/60 hover:bg-jagger-500/10 md:flex md:items-center md:justify-center md:gap-1.5"
          >
            <span>⭐</span>
            <span>Adicionar missão especial</span>
          </button>
        )}
      </div>
    </div>
  );
}

