import { useEffect, useState } from "react";
import { fastingService, workoutService, profileService, checklistService, mealService } from "@/lib/firebaseService";

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

