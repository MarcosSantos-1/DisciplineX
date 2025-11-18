import { useEffect, useState } from "react";
import { fastingService, workoutService, profileService, checklistService, mealService, libraryService } from "@/lib/firebaseService";

// Hook para sincronizar dados do localStorage com Firebase
export function useFirebaseSync() {
  const [isSyncing, setIsSyncing] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    const syncData = async () => {
      if (typeof window === "undefined") return;
      if (isInitialized) return;

      setIsSyncing(true);
      try {
        // Migrar tipos de jejum
        const localFastingTypes = localStorage.getItem("fasting_types");
        if (localFastingTypes) {
          try {
            const types = JSON.parse(localFastingTypes);
            const firebaseTypes = await fastingService.getFastingTypes();
            if (firebaseTypes.length === 0 && types.length > 0) {
              await fastingService.saveFastingTypes(types);
            }
          } catch (e) {
            console.error("Erro ao migrar tipos de jejum:", e);
          }
        }

        // Migrar cronograma de jejum
        const localSchedule = localStorage.getItem("fasting_schedule");
        if (localSchedule) {
          try {
            const schedule = JSON.parse(localSchedule);
            const firebaseSchedule = await fastingService.getFastingSchedule();
            if (firebaseSchedule.length === 0 && schedule.length > 0) {
              await fastingService.saveFastingSchedule(schedule);
            }
          } catch (e) {
            console.error("Erro ao migrar cronograma:", e);
          }
        }

        // Migrar configuração de treino
        const localWorkoutConfig = localStorage.getItem("workout_config");
        if (localWorkoutConfig) {
          try {
            const config = JSON.parse(localWorkoutConfig);
            const firebaseConfig = await workoutService.getWorkoutConfig();
            if (Object.keys(firebaseConfig).length === 0 && Object.keys(config).length > 0) {
              await workoutService.saveWorkoutConfig(config);
            }
          } catch (e) {
            console.error("Erro ao migrar configuração de treino:", e);
          }
        }

        // Migrar peso atual
        const localWeight = localStorage.getItem("current_weight");
        if (localWeight) {
          try {
            const weight = Number(localWeight);
            const firebaseWeight = await profileService.getCurrentWeight();
            if (firebaseWeight === 92 && weight !== 92) {
              await profileService.saveCurrentWeight(weight);
            }
          } catch (e) {
            console.error("Erro ao migrar peso:", e);
          }
        }

        // Migrar meta de peso
        const localTargetWeight = localStorage.getItem("target_weight");
        if (localTargetWeight) {
          try {
            const targetWeight = Number(localTargetWeight);
            const firebaseTargetWeight = await profileService.getTargetWeight();
            if (firebaseTargetWeight === 72 && targetWeight !== 72) {
              await profileService.saveTargetWeight(targetWeight);
            }
          } catch (e) {
            console.error("Erro ao migrar meta de peso:", e);
          }
        }

        // Migrar histórico de peso
        const localWeightHistory = localStorage.getItem("weight_history");
        if (localWeightHistory) {
          try {
            const history = JSON.parse(localWeightHistory);
            const firebaseHistory = await profileService.getWeightHistory();
            if (firebaseHistory.length === 0 && history.length > 0) {
              await profileService.saveWeightHistory(history);
            }
          } catch (e) {
            console.error("Erro ao migrar histórico de peso:", e);
          }
        }

        // Migrar antropometria
        const localAnthropometry = localStorage.getItem("anthropometry");
        if (localAnthropometry) {
          try {
            const anthropometry = JSON.parse(localAnthropometry);
            const firebaseAnthropometry = await profileService.getAnthropometry();
            if (!firebaseAnthropometry && anthropometry) {
              await profileService.saveAnthropometry({
                ...anthropometry,
                lastMeasurementDate: new Date(anthropometry.lastMeasurementDate),
              });
            }
          } catch (e) {
            console.error("Erro ao migrar antropometria:", e);
          }
        }

        // Migrar histórico de antropometria
        const localAnthropometryHistory = localStorage.getItem("anthropometry_history");
        if (localAnthropometryHistory) {
          try {
            const history = JSON.parse(localAnthropometryHistory);
            const firebaseHistory = await profileService.getAnthropometryHistory();
            if (firebaseHistory.length === 0 && history.length > 0) {
              await profileService.saveAnthropometryHistory(history);
            }
          } catch (e) {
            console.error("Erro ao migrar histórico de antropometria:", e);
          }
        }

        // Migrar refeições selecionadas
        const localSelectedMeals = localStorage.getItem("selectedMeals");
        if (localSelectedMeals) {
          try {
            const meals = JSON.parse(localSelectedMeals);
            const firebaseMeals = await mealService.getSelectedMeals();
            if (firebaseMeals.length === 0 && meals.length > 0) {
              await mealService.saveSelectedMeals(meals);
            }
          } catch (e) {
            console.error("Erro ao migrar refeições:", e);
          }
        }

        // Migrar Default Checklist
        const localDefaultChecklist = localStorage.getItem("default_checklist");
        if (localDefaultChecklist) {
          try {
            const checklist = JSON.parse(localDefaultChecklist);
            const firebaseChecklist = await checklistService.getDefaultChecklist();
            if (firebaseChecklist.length === 0 && checklist.length > 0) {
              await checklistService.saveDefaultChecklist(checklist);
            }
          } catch (e) {
            console.error("Erro ao migrar checklist padrão:", e);
          }
        }

        // Migrar Daily Checklists (todos os dias)
        const dailyChecklistKeys: string[] = [];
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && key.startsWith("daily_checklist_")) {
            dailyChecklistKeys.push(key);
          }
        }
        for (const key of dailyChecklistKeys) {
          try {
            const dateKey = key.replace("daily_checklist_", "");
            const saved = localStorage.getItem(key);
            if (saved) {
              const parsed = JSON.parse(saved);
              if (parsed && Array.isArray(parsed.items)) {
                const firebaseChecklist = await checklistService.getDailyChecklist(dateKey);
                if (!firebaseChecklist || firebaseChecklist.length === 0) {
                  await checklistService.saveDailyChecklist(dateKey, parsed.items);
                }
              }
            }
          } catch (e) {
            console.error(`Erro ao migrar checklist diário ${key}:`, e);
          }
        }

        // Migrar Special Checks (todos os dias)
        const specialCheckKeys: string[] = [];
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && key.startsWith("special_checks_")) {
            specialCheckKeys.push(key);
          }
        }
        for (const key of specialCheckKeys) {
          try {
            const dateKey = key.replace("special_checks_", "");
            const saved = localStorage.getItem(key);
            if (saved) {
              const parsed = JSON.parse(saved);
              if (Array.isArray(parsed)) {
                const firebaseChecks = await checklistService.getSpecialChecks(dateKey);
                if (firebaseChecks.length === 0 && parsed.length > 0) {
                  await checklistService.saveSpecialChecks(dateKey, parsed);
                }
              }
            }
          } catch (e) {
            console.error(`Erro ao migrar missões especiais ${key}:`, e);
          }
        }

        // Migrar Checklist States (todos os dias)
        const checklistStateKeys: string[] = [];
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && key.startsWith("checklist_state_")) {
            checklistStateKeys.push(key);
          }
        }
        for (const key of checklistStateKeys) {
          try {
            const dateKey = key.replace("checklist_state_", "");
            const saved = localStorage.getItem(key);
            if (saved) {
              const parsed = JSON.parse(saved);
              if (parsed && Array.isArray(parsed.checkedIds)) {
                const firebaseState = await checklistService.getChecklistState(dateKey);
                if (!firebaseState || firebaseState.size === 0) {
                  await checklistService.saveChecklistState(dateKey, new Set(parsed.checkedIds));
                }
              }
            }
          } catch (e) {
            console.error(`Erro ao migrar estado do checklist ${key}:`, e);
          }
        }

        // Migrar Meals (todos os dias)
        const mealKeys: string[] = [];
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && key.startsWith("meals_") && !key.includes("custom_options")) {
            mealKeys.push(key);
          }
        }
        for (const key of mealKeys) {
          try {
            const dateKey = key.replace("meals_", "");
            const saved = localStorage.getItem(key);
            if (saved) {
              const parsed = JSON.parse(saved);
              if (Array.isArray(parsed)) {
                const firebaseMeals = await mealService.getMeals(dateKey);
                if (firebaseMeals.length === 0 && parsed.length > 0) {
                  await mealService.saveMeals(dateKey, parsed);
                }
              }
            }
          } catch (e) {
            console.error(`Erro ao migrar refeições ${key}:`, e);
          }
        }

        // Migrar Custom Options (todos os slots)
        const customOptionKeys: string[] = [];
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && key.startsWith("custom_options_")) {
            customOptionKeys.push(key);
          }
        }
        for (const key of customOptionKeys) {
          try {
            const slotId = key.replace("custom_options_", "");
            const saved = localStorage.getItem(key);
            if (saved) {
              const parsed = JSON.parse(saved);
              if (Array.isArray(parsed)) {
                const firebaseOptions = await mealService.getCustomOptions(slotId);
                if (firebaseOptions.length === 0 && parsed.length > 0) {
                  await mealService.saveCustomOptions(slotId, parsed);
                }
              }
            }
          } catch (e) {
            console.error(`Erro ao migrar opções customizadas ${key}:`, e);
          }
        }

        // Migrar Recipe Library
        const localRecipes = localStorage.getItem("recipe_library");
        if (localRecipes) {
          try {
            const recipes = JSON.parse(localRecipes);
            const firebaseRecipes = await libraryService.getRecipes();
            if (firebaseRecipes.length === 0 && recipes.length > 0) {
              await libraryService.saveRecipes(recipes);
            }
          } catch (e) {
            console.error("Erro ao migrar biblioteca de receitas:", e);
          }
        }

        // Migrar Quick Food Library
        const localQuickFoods = localStorage.getItem("quickfood_library");
        if (localQuickFoods) {
          try {
            const quickFoods = JSON.parse(localQuickFoods);
            const firebaseQuickFoods = await libraryService.getQuickFoods();
            if (firebaseQuickFoods.length === 0 && quickFoods.length > 0) {
              await libraryService.saveQuickFoods(quickFoods);
            }
          } catch (e) {
            console.error("Erro ao migrar biblioteca de comidas prontas:", e);
          }
        }

        setIsInitialized(true);
      } catch (error) {
        console.error("Erro ao sincronizar dados:", error);
      } finally {
        setIsSyncing(false);
      }
    };

    syncData();
  }, [isInitialized]);

  return { isSyncing, isInitialized };
}

