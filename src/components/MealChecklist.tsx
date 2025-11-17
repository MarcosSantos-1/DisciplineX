"use client";

import { useState, useEffect } from "react";
import { MealSlot, SelectedMeal, getMealsForDay, Recipe, MealOption } from "@/types/meals";
import { MealModal } from "./MealModal";
import { RecipeLibrary } from "./RecipeLibrary";

interface MealChecklistProps {
  selectedDate: Date;
}

export function MealChecklist({ selectedDate }: MealChecklistProps) {
  const [selectedMeals, setSelectedMeals] = useState<SelectedMeal[]>([]);
  const [openModalSlot, setOpenModalSlot] = useState<string | null>(null);
  const [showLibrary, setShowLibrary] = useState(false);
  const [librarySlotId, setLibrarySlotId] = useState<string | null>(null);
  
  const dayOfWeek = selectedDate.getDay();
  const meals = getMealsForDay(dayOfWeek);
  const dateKey = selectedDate.toISOString().split("T")[0];

  // Carregar refeições selecionadas do localStorage (depois virá do Firebase)
  useEffect(() => {
    const saved = localStorage.getItem(`meals_${dateKey}`);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setSelectedMeals(parsed);
      } catch (e) {
        console.error("Erro ao carregar refeições:", e);
        setSelectedMeals([]);
      }
    } else {
      setSelectedMeals([]);
    }
  }, [dateKey]);

  const getSelectedMeal = (slotId: string): SelectedMeal | undefined => {
    return selectedMeals.find((m) => m.slotId === slotId && m.date === dateKey);
  };

  const handleMealSelect = (slotId: string, optionId: string) => {
    const newSelectedMeal: SelectedMeal = {
      slotId,
      optionId,
      date: dateKey,
    };

    const updated = selectedMeals.filter(
      (m) => !(m.slotId === slotId && m.date === dateKey)
    );
    updated.push(newSelectedMeal);

    setSelectedMeals(updated);
    localStorage.setItem(`meals_${dateKey}`, JSON.stringify(updated));
    
    // Disparar evento customizado para atualizar a página principal
    window.dispatchEvent(new CustomEvent("mealsUpdated", { detail: { dateKey, meals: updated } }));
    
    setOpenModalSlot(null);
  };

  const handleRemoveMeal = (slotId: string) => {
    const updated = selectedMeals.filter(
      (m) => !(m.slotId === slotId && m.date === dateKey)
    );
    setSelectedMeals(updated);
    localStorage.setItem(`meals_${dateKey}`, JSON.stringify(updated));
    
    // Disparar evento customizado para atualizar a página principal
    window.dispatchEvent(new CustomEvent("mealsUpdated", { detail: { dateKey, meals: updated } }));
  };

  // Carregar opções customizadas dos slots
  const getCustomOptions = (slotId: string): MealOption[] => {
    const saved = localStorage.getItem(`custom_options_${slotId}`);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        return [];
      }
    }
    return [];
  };

  // Obter todas as opções de um slot (incluindo customizadas)
  const getAllSlotOptions = (slot: MealSlot): MealOption[] => {
    const customOptions = getCustomOptions(slot.id);
    return [...slot.options, ...customOptions];
  };

  const getMealOption = (slot: MealSlot, optionId: string): MealOption | undefined => {
    const allOptions = getAllSlotOptions(slot);
    return allOptions.find((opt) => opt.id === optionId);
  };

  // Converter receita da biblioteca em MealOption e adicionar ao slot
  const handleRecipeSelect = (recipe: Recipe) => {
    if (!librarySlotId) {
      // Apenas visualizar biblioteca
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

    // Salvar opção customizada no localStorage
    const customOptions = getCustomOptions(librarySlotId);
    const updatedCustomOptions = [...customOptions, mealOption];
    localStorage.setItem(
      `custom_options_${librarySlotId}`,
      JSON.stringify(updatedCustomOptions)
    );

    // Selecionar a nova opção
    handleMealSelect(librarySlotId, mealOption.id);
    setShowLibrary(false);
    setLibrarySlotId(null);
  };

  return (
    <>
      <div className="glass-panel flex flex-col rounded-3xl p-4">
        <div className="flex items-center justify-between gap-2">
          <div>
            <h3 className="text-sm font-medium text-zinc-100">
              Refeições da Operação
            </h3>
            <p className="text-[11px] text-zinc-400">
              {dayOfWeek >= 1 && dayOfWeek <= 5
                ? "4 refeições principais de segunda a sexta"
                : "3 refeições normais no fim de semana"}
            </p>
          </div>
          <button
            onClick={() => {
              setLibrarySlotId(null);
              setShowLibrary(true);
            }}
            className="rounded-full border border-zinc-700/80 bg-zinc-950/60 px-3 py-1 text-[11px] text-zinc-300 hover:border-jagger-400/60 hover:text-jagger-100"
          >
            Ver Arsenal ⚔️
          </button>
        </div>

        <div className="mt-3 flex-1 space-y-2.5 overflow-y-auto">
          {meals.map((slot) => {
            const selected = getSelectedMeal(slot.id);
            const mealOption = selected
              ? getMealOption(slot, selected.optionId)
              : null;

            return (
              <div
                key={slot.id}
                className={`flex flex-col gap-1 rounded-2xl p-3 text-xs transition-colors ${
                  selected
                    ? "bg-emerald-500/10 border border-emerald-500/20"
                    : "bg-zinc-950/60 hover:bg-zinc-900/80 cursor-pointer"
                }`}
                onClick={() => setOpenModalSlot(slot.id)}
              >
                {selected && mealOption ? (
                  <>
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={true}
                          readOnly
                          className="h-4 w-4 rounded border-zinc-600 bg-zinc-900 text-emerald-400 accent-emerald-400"
                        />
                        <p className="font-medium text-zinc-100">{slot.name}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[11px] text-emerald-300">
                          {mealOption.totalCalories} kcal
                        </span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRemoveMeal(slot.id);
                          }}
                          className="text-zinc-400 hover:text-red-400"
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                    <p className="text-[11px] text-zinc-400 ml-7">
                      {mealOption.name}
                    </p>
                    <div className="ml-7 mt-2 space-y-1">
                      {mealOption.items.map((item, idx) => (
                        <p
                          key={idx}
                          className="text-[11px] text-zinc-500"
                        >
                          • {item.name} ({item.quantity})
                        </p>
                      ))}
                    </div>
                    <div className="ml-7 mt-2 flex flex-wrap gap-2 text-[11px] text-zinc-400">
                      <span className="rounded-full bg-zinc-900/80 px-2 py-0.5">
                        🥩 {mealOption.protein}g proteína
                      </span>
                      <span className="rounded-full bg-zinc-900/80 px-2 py-0.5">
                        🍚 {mealOption.carbs}g carbos
                      </span>
                      <span className="rounded-full bg-zinc-900/80 px-2 py-0.5">
                        🧈 {mealOption.fat}g gorduras
                      </span>
                    </div>
                  </>
                ) : (
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={false}
                      readOnly
                      className="h-4 w-4 rounded border-zinc-600 bg-zinc-900 text-emerald-400 accent-emerald-400"
                    />
                    <div className="flex flex-col">
                      <span className="text-zinc-100">{slot.name}</span>
                      <span className="text-[11px] text-zinc-500">
                        {slot.time} • {slot.minCalories}-{slot.maxCalories} kcal
                      </span>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <button
          onClick={() => setOpenModalSlot("library")}
          className="mt-3 self-start rounded-full border border-dashed border-zinc-700 px-3 py-1.5 text-[11px] text-zinc-400 hover:border-jagger-400/60 hover:text-jagger-100"
        >
          + Adicionar refeição / receita
        </button>
      </div>

      {openModalSlot && openModalSlot !== "library" && (() => {
        const slot = meals.find((s) => s.id === openModalSlot);
        if (!slot) return null;
        
        // Criar slot com opções customizadas incluídas
        const slotWithCustomOptions: MealSlot = {
          ...slot,
          options: getAllSlotOptions(slot),
        };
        
        return (
          <MealModal
            slot={slotWithCustomOptions}
            onSelect={(optionId) => handleMealSelect(openModalSlot, optionId)}
            onClose={() => setOpenModalSlot(null)}
            selectedOptionId={getSelectedMeal(openModalSlot)?.optionId}
            onOpenLibrary={(slotId) => {
              setOpenModalSlot(null);
              setLibrarySlotId(slotId);
              setShowLibrary(true);
            }}
          />
        );
      })()}

      {showLibrary && (
        <RecipeLibrary
          isOpen={showLibrary}
          onClose={() => {
            setShowLibrary(false);
            setLibrarySlotId(null);
          }}
          onSelectRecipe={handleRecipeSelect}
          slotId={librarySlotId || undefined}
        />
      )}
    </>
  );
}

