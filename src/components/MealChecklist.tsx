"use client";

import { useState, useEffect } from "react";
import { MealSlot, SelectedMeal, getMealsForDay, Recipe, QuickFood, MealOption } from "@/types/meals";
import { MealModal } from "./MealModal";
import { RecipeLibrary } from "./RecipeLibrary";
import { mealService } from "@/lib/firebaseService";

interface MealChecklistProps {
  selectedDate: Date;
}

export function MealChecklist({ selectedDate }: MealChecklistProps) {
  const [selectedMeals, setSelectedMeals] = useState<SelectedMeal[]>([]);
  const [openModalSlot, setOpenModalSlot] = useState<string | null>(null);
  const [showLibrary, setShowLibrary] = useState(false);
  const [librarySlotId, setLibrarySlotId] = useState<string | null>(null);
  const [showSlotSelector, setShowSlotSelector] = useState(false);
  const [pendingSelection, setPendingSelection] = useState<{ type: "recipe" | "quickfood"; item: Recipe | QuickFood } | null>(null);
  const [customOptionsMap, setCustomOptionsMap] = useState<Map<string, MealOption[]>>(new Map());
  const dayOfWeek = selectedDate.getDay();
  const dateKey = selectedDate.toISOString().split("T")[0];
  const [meals, setMeals] = useState<MealSlot[]>(() => getMealsForDay(dayOfWeek));

  useEffect(() => {
    let cancelled = false;
    setMeals(getMealsForDay(dayOfWeek));
    mealService.getSlotsForDay(dayOfWeek).then((slots) => {
      if (!cancelled) setMeals(slots);
    });
    return () => {
      cancelled = true;
    };
  }, [dayOfWeek]);

  useEffect(() => {
    const onPlan = () => {
      mealService.getSlotsForDay(dayOfWeek).then(setMeals);
    };
    window.addEventListener("mealPlanUpdated", onPlan);
    return () => window.removeEventListener("mealPlanUpdated", onPlan);
  }, [dayOfWeek]);

  // Carregar refeições selecionadas do Firebase
  useEffect(() => {
    const loadMeals = async () => {
      try {
        const meals = await mealService.getMeals(dateKey);
        setSelectedMeals(meals);
      } catch (e) {
        console.error("Erro ao carregar refeições:", e);
        setSelectedMeals([]);
      }
    };
    loadMeals();
  }, [dateKey]);

  // Carregar opções customizadas de todos os slots
  useEffect(() => {
    const loadCustomOptions = async () => {
      const optionsMap = new Map<string, MealOption[]>();
      for (const slot of meals) {
        try {
          const options = await mealService.getCustomOptions(slot.id);
          optionsMap.set(slot.id, options);
        } catch (e) {
          console.error(`Erro ao carregar opções customizadas para ${slot.id}:`, e);
        }
      }
      setCustomOptionsMap(optionsMap);
    };
    loadCustomOptions();
  }, [meals]);

  const getSelectedMeals = (slotId: string): SelectedMeal[] => {
    return selectedMeals.filter((m) => m.slotId === slotId && m.date === dateKey);
  };

  const handleMealSelect = async (slotId: string, optionId: string) => {
    // Verificar se já existe essa combinação (evitar duplicatas)
    const alreadyExists = selectedMeals.some(
      (m) => m.slotId === slotId && m.optionId === optionId && m.date === dateKey
    );

    if (alreadyExists) {
      // Se já existe, não adicionar novamente
      setOpenModalSlot(null);
      return;
    }

    const newSelectedMeal: SelectedMeal = {
      slotId,
      optionId,
      date: dateKey,
    };

    // ADICIONAR sem remover as anteriores (permite múltiplas refeições por slot)
    const updated = [...selectedMeals, newSelectedMeal];

    setSelectedMeals(updated);
    
    try {
      // Salvar no Firebase
      await mealService.saveMeals(dateKey, updated);
    } catch (e) {
      console.error("Erro ao salvar refeições:", e);
    }
    
    // Disparar evento customizado para atualizar a página principal
    console.log("Disparando evento mealsUpdated para", dateKey, "com", updated.length, "refeições");
    window.dispatchEvent(new CustomEvent("mealsUpdated", { detail: { dateKey, meals: updated } }));
    
    setOpenModalSlot(null);
  };

  const handleRemoveMeal = async (slotId: string, optionId: string) => {
    // Remover apenas a refeição específica (por slotId + optionId)
    const updated = selectedMeals.filter(
      (m) => !(m.slotId === slotId && m.optionId === optionId && m.date === dateKey)
    );
    setSelectedMeals(updated);
    
    try {
      // Salvar no Firebase
      await mealService.saveMeals(dateKey, updated);
    } catch (e) {
      console.error("Erro ao salvar refeições:", e);
    }
    
    // Disparar evento customizado para atualizar a página principal
    console.log("Disparando evento mealsUpdated (remove) para", dateKey, "com", updated.length, "refeições");
    window.dispatchEvent(new CustomEvent("mealsUpdated", { detail: { dateKey, meals: updated } }));
  };

  // Carregar opções customizadas dos slots do Firebase
  const getCustomOptions = async (slotId: string): Promise<MealOption[]> => {
    try {
      return await mealService.getCustomOptions(slotId);
    } catch (e) {
      console.error("Erro ao carregar opções customizadas:", e);
      return [];
    }
  };

  // Obter todas as opções de um slot (incluindo customizadas)
  const getAllSlotOptions = (slot: MealSlot): MealOption[] => {
    const customOptions = customOptionsMap.get(slot.id) || [];
    return [...slot.options, ...customOptions];
  };

  const getMealOption = (slot: MealSlot, optionId: string): MealOption | undefined => {
    const allOptions = getAllSlotOptions(slot);
    return allOptions.find((opt) => opt.id === optionId);
  };

  // Processar seleção pendente quando slot for escolhido
  const processPendingSelection = async (slotId: string) => {
    if (!pendingSelection) return;

    const slot = meals.find((s) => s.id === slotId);
    if (!slot) return;

    let mealOption: MealOption;

    if (pendingSelection.type === "recipe") {
      const recipe = pendingSelection.item as Recipe;
      mealOption = {
        id: `library_${recipe.id}_${Date.now()}`,
        name: recipe.name,
        items: recipe.ingredients,
        totalCalories: recipe.totalCalories,
        protein: recipe.protein,
        carbs: recipe.carbs,
        fat: recipe.fat,
        image: recipe.image,
      };
    } else {
      const quickFood = pendingSelection.item as QuickFood;
      mealOption = {
        id: `library_${quickFood.id}_${Date.now()}`,
        name: quickFood.name + (quickFood.brand ? ` (${quickFood.brand})` : ""),
        items: [
          {
            name: quickFood.name,
            quantity: quickFood.servingSize || "1 porção",
            calories: quickFood.totalCalories,
          },
        ],
        totalCalories: quickFood.totalCalories,
        protein: quickFood.protein,
        carbs: quickFood.carbs,
        fat: quickFood.fat,
        image: quickFood.image,
      };
    }

    // Salvar opção customizada no Firebase
    try {
      const customOptions = customOptionsMap.get(slotId) || [];
      const updatedCustomOptions = [...customOptions, mealOption];
      await mealService.saveCustomOptions(slotId, updatedCustomOptions);
      // Atualizar estado local
      setCustomOptionsMap(prev => new Map(prev).set(slotId, updatedCustomOptions));
    } catch (e) {
      console.error("Erro ao salvar opção customizada:", e);
    }

    // Selecionar a nova opção
    await handleMealSelect(slotId, mealOption.id);
    setPendingSelection(null);
  };

  // Converter receita da biblioteca em MealOption e adicionar ao slot
  const handleRecipeSelect = async (recipe: Recipe) => {
    // Se não tiver slot selecionado, pedir para escolher primeiro
    if (!librarySlotId) {
      setShowLibrary(false);
      setPendingSelection({ type: "recipe", item: recipe });
      setShowSlotSelector(true);
      return;
    }

    const slot = meals.find((s) => s.id === librarySlotId);
    if (!slot) return;

    // Criar MealOption a partir da Recipe
    const mealOption: MealOption = {
      id: `library_${recipe.id}_${Date.now()}`,
      name: recipe.name,
      items: recipe.ingredients,
      totalCalories: recipe.totalCalories,
      protein: recipe.protein,
      carbs: recipe.carbs,
      fat: recipe.fat,
      image: recipe.image,
    };

    // Salvar opção customizada no Firebase
    try {
      const customOptions = customOptionsMap.get(librarySlotId) || [];
      const updatedCustomOptions = [...customOptions, mealOption];
      await mealService.saveCustomOptions(librarySlotId, updatedCustomOptions);
      // Atualizar estado local
      setCustomOptionsMap(prev => new Map(prev).set(librarySlotId, updatedCustomOptions));
    } catch (e) {
      console.error("Erro ao salvar opção customizada:", e);
    }

    // Selecionar a nova opção
    await handleMealSelect(librarySlotId, mealOption.id);
    setShowLibrary(false);
    setLibrarySlotId(null);
  };

  // Converter comida pronta da biblioteca em MealOption e adicionar ao slot
  const handleQuickFoodSelect = async (quickFood: QuickFood) => {
    // Se não tiver slot selecionado, pedir para escolher primeiro
    if (!librarySlotId) {
      setShowLibrary(false);
      setPendingSelection({ type: "quickfood", item: quickFood });
      setShowSlotSelector(true);
      return;
    }

    const slot = meals.find((s) => s.id === librarySlotId);
    if (!slot) return;

    // Criar MealOption a partir da QuickFood
    const mealOption: MealOption = {
      id: `library_${quickFood.id}_${Date.now()}`,
      name: quickFood.name + (quickFood.brand ? ` (${quickFood.brand})` : ""),
      items: [
        {
          name: quickFood.name,
          quantity: quickFood.servingSize || "1 porção",
          calories: quickFood.totalCalories,
        },
      ],
      totalCalories: quickFood.totalCalories,
      protein: quickFood.protein,
      carbs: quickFood.carbs,
      fat: quickFood.fat,
      image: quickFood.image,
    };

    // Salvar opção customizada no Firebase
    try {
      const customOptions = customOptionsMap.get(librarySlotId) || [];
      const updatedCustomOptions = [...customOptions, mealOption];
      await mealService.saveCustomOptions(librarySlotId, updatedCustomOptions);
      // Atualizar estado local
      setCustomOptionsMap(prev => new Map(prev).set(librarySlotId, updatedCustomOptions));
    } catch (e) {
      console.error("Erro ao salvar opção customizada:", e);
    }

    // Selecionar a nova opção
    await handleMealSelect(librarySlotId, mealOption.id);
    setShowLibrary(false);
    setLibrarySlotId(null);
  };

  return (
    <>
      <div className="flex flex-col rounded-3xl border border-zinc-800/90 bg-zinc-950 p-3 md:p-4">
        <div className="flex items-start justify-between gap-2">
          <div>
            <h3 className="pt-2 text-sm font-medium text-zinc-100">Refeições</h3>
            <p className="pb-2 text-[11px] text-zinc-400">
              {dayOfWeek >= 1 && dayOfWeek <= 5
                ? "4 refeições principais de segunda a sexta"
                : "3 refeições normais no fim de semana"}
            </p>
          </div>
          <button
            type="button"
            aria-label="Configurar refeições"
            title="Configurar refeições"
            onClick={() => {
              if (typeof window !== "undefined") {
                window.location.href = "/perfil?tab=meal-config";
              }
            }}
            className="shrink-0 rounded-lg border border-zinc-800/90 bg-zinc-950 px-2.5 py-2 text-lg leading-none text-zinc-300 transition-colors hover:border-jagger-400/60 hover:text-jagger-100"
          >
            ⚙️
          </button>
        </div>

        <div className="mt-3 flex-1 space-y-2.5 overflow-y-auto">
          {meals.map((slot) => {
            const selectedMealsForSlot = getSelectedMeals(slot.id);
            const hasSelections = selectedMealsForSlot.length > 0;

            return (
              <div
                key={slot.id}
                className={`flex flex-col gap-2 rounded-2xl border p-3 text-xs transition-colors ${
                  hasSelections
                    ? "cursor-pointer border-emerald-500/25 bg-emerald-500/10"
                    : "cursor-pointer border-zinc-800/90 bg-zinc-950 hover:border-zinc-700"
                }`}
                onClick={() => setOpenModalSlot(slot.id)}
              >
                {/* Cabeçalho do slot */}
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={hasSelections}
                      readOnly
                      className="h-4 w-4 rounded border-zinc-600 bg-zinc-900 text-emerald-400 accent-emerald-400"
                    />
                    <p className="font-medium text-zinc-100">{slot.name}</p>
                  </div>
                  {hasSelections && (
                    <span className="text-[11px] text-zinc-400">
                      {selectedMealsForSlot.length} {selectedMealsForSlot.length === 1 ? "refeição" : "refeições"}
                    </span>
                  )}
                </div>

                {/* Lista de refeições selecionadas */}
                {hasSelections ? (
                  <div className="ml-7 space-y-2">
                    {selectedMealsForSlot.map((selectedMeal) => {
                      const mealOption = getMealOption(slot, selectedMeal.optionId);
                      if (!mealOption) return null;

                      return (
                        <div
                          key={`${selectedMeal.slotId}-${selectedMeal.optionId}`}
                          className="rounded-xl border border-zinc-800/90 bg-zinc-950 p-2.5"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1">
                              <p className="text-[11px] font-medium text-zinc-100 mb-1">
                                {mealOption.name}
                              </p>
                              <div className="space-y-0.5 mb-2">
                                {mealOption.items.map((item, idx) => (
                                  <p
                                    key={idx}
                                    className="text-[10px] text-zinc-500"
                                  >
                                    • {item.name} ({item.quantity})
                                  </p>
                                ))}
                              </div>
                              <div className="flex flex-wrap gap-1.5 text-[10px] text-zinc-400">
                                <span className="rounded-full bg-zinc-900/80 px-2 py-0.5">
                                  🔥 {mealOption.totalCalories} kcal
                                </span>
                                <span className="rounded-full bg-zinc-900/80 px-2 py-0.5">
                                  🥩 {mealOption.protein}g
                                </span>
                                <span className="rounded-full bg-zinc-900/80 px-2 py-0.5">
                                  🍚 {mealOption.carbs}g
                                </span>
                                <span className="rounded-full bg-zinc-900/80 px-2 py-0.5">
                                  🧈 {mealOption.fat}g
                                </span>
                              </div>
                            </div>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleRemoveMeal(slot.id, selectedMeal.optionId);
                              }}
                              className="shrink-0 text-zinc-400 hover:text-red-400 transition-colors p-1"
                              title="Remover refeição"
                            >
                              ✕
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="flex items-center gap-3 ml-7">
                    <div className="flex flex-col">
                      <span className="text-[11px] text-zinc-400">
                        {slot.time} • {slot.minCalories}-{slot.maxCalories} kcal
                      </span>
                      <span className="text-[10px] text-zinc-500 mt-0.5">
                        Clique para adicionar refeição
                      </span>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className="mt-3 flex w-full items-center justify-between gap-2">
          <button
            type="button"
            onClick={() => setShowSlotSelector(true)}
            className="rounded-full border border-dashed border-zinc-800/90 px-3 py-1.5 text-[11px] text-zinc-400 transition-colors hover:border-jagger-400/60 hover:text-jagger-100"
          >
            + Adicionar refeição / receita
          </button>
          <button
            type="button"
            onClick={() => {
              setLibrarySlotId(null);
              setShowLibrary(true);
            }}
            className="shrink-0 rounded-full border border-zinc-800/90 bg-zinc-950 px-3 py-1.5 text-[11px] text-zinc-300 transition-colors hover:border-jagger-400/60 hover:text-jagger-100"
          >
            Ver Arsenal ⚔️
          </button>
        </div>
      </div>

      {openModalSlot && openModalSlot !== "library" && (() => {
        const slot = meals.find((s) => s.id === openModalSlot);
        if (!slot) return null;
        
        // Criar slot com opções customizadas incluídas
        const slotWithCustomOptions: MealSlot = {
          ...slot,
          options: getAllSlotOptions(slot), // Já é síncrono agora
        };
        
        return (
          <MealModal
            slot={slotWithCustomOptions}
            onSelect={(optionId) => handleMealSelect(openModalSlot, optionId)}
            onClose={() => setOpenModalSlot(null)}
            selectedOptionId={getSelectedMeals(openModalSlot)[0]?.optionId}
            onOpenLibrary={(slotId) => {
              setOpenModalSlot(null);
              setLibrarySlotId(slotId);
              setShowLibrary(true);
            }}
          />
        );
      })()}

      {/* Modal para escolher slot quando clicar em "+Adicionar refeição/receita" */}
      {showSlotSelector && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
          onClick={() => {
            setShowSlotSelector(false);
            setPendingSelection(null);
          }}
        >
          <div
            className="relative w-full max-w-md rounded-3xl bg-zinc-900 p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-zinc-100">
                Escolher Refeição
              </h3>
              <button
                onClick={() => {
                  setShowSlotSelector(false);
                  setPendingSelection(null);
                }}
                className="rounded-full p-2 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100"
              >
                ✕
              </button>
            </div>
            <div className="space-y-2">
              {meals.map((slot) => (
                <button
                  key={slot.id}
                  onClick={() => {
                    // Se houver seleção pendente, processá-la
                    if (pendingSelection) {
                      processPendingSelection(slot.id).catch(e => console.error("Erro ao processar seleção:", e));
                    } else {
                      // Caso normal: abrir Arsenal com slot selecionado
                      setLibrarySlotId(slot.id);
                      setShowLibrary(true);
                    }
                    setShowSlotSelector(false);
                  }}
                  className="w-full rounded-xl border border-zinc-700 bg-zinc-950/60 px-4 py-3 text-left text-sm text-zinc-100 hover:border-emerald-500/50 hover:bg-zinc-900/80 transition-colors"
                >
                  <div className="font-medium">{slot.name}</div>
                  <div className="mt-1 text-xs text-zinc-400">
                    {slot.time} • {slot.minCalories}-{slot.maxCalories} kcal
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {showLibrary && (
        <RecipeLibrary
          isOpen={showLibrary}
          onClose={() => {
            setShowLibrary(false);
            setLibrarySlotId(null);
          }}
          onSelectRecipe={handleRecipeSelect}
          onSelectQuickFood={handleQuickFoodSelect}
          slotId={librarySlotId || undefined}
        />
      )}
    </>
  );
}

