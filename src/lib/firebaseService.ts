import { 
  collection, 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc, 
  deleteDoc,
  getDocs,
  query,
  where,
  Timestamp,
  writeBatch
} from "firebase/firestore";
import { db } from "./firebase";

// Tipos de dados
export type FastingType = {
  id: string;
  name: string;
  duration: number;
  description: string;
};

export type FastingSchedule = {
  dayOfWeek: number;
  fastingTypeId: string | null;
  startTime: string;
};

export type FastingSession = {
  startTime: number;
  fastingTypeId: string;
  duration: number;
  paused: boolean;
  pausedAt?: number;
  pausedDuration: number;
};

export type Exercise = {
  id: string;
  name: string;
  type: "strength" | "cardio" | "custom";
  sets: number;
  reps: string;
  rest: number;
  completed: boolean;
  weight?: number;
  minutes?: number;
  averageSpeed?: number;
  intensity?: string;
  activityTemplateId?: string;
  videoUrl?: string;
};

export type WorkoutDay = {
  dayOfWeek: string;
  dayLabel: string;
  muscleGroup: string;
  exercises: Exercise[];
  isWeekend: boolean;
};

export type WeightEntry = {
  date: string;
  weight: number;
  timestamp: number;
};

export type AnthropometryData = {
  weight: number;
  leanMass: number;
  fatMass: number;
  fatPercentage: number;
  lastMeasurementDate: Date;
};

export type ChecklistItem = {
  id: string;
  label: string;
  isSpecial: boolean;
  weight: number;
  date?: string;
};

export type SelectedMeal = {
  slotId: string;
  optionId: string;
  date: string;
};

export type CustomMealOption = {
  id: string;
  slotId?: string;
  name: string;
  items: any[];
  totalCalories: number;
  protein: number;
  carbs: number;
  fat: number;
  image?: string;
};

export type Recipe = {
  id: string;
  name: string;
  description?: string;
  image?: string;
  ingredients: any[];
  instructions: string[];
  prepTime: number;
  totalCalories: number;
  protein: number;
  carbs: number;
  fat: number;
  createdAt: string;
  tags?: string[];
  type: "recipe";
};

export type QuickFood = {
  id: string;
  name: string;
  description?: string;
  image?: string;
  totalCalories: number;
  protein: number;
  carbs: number;
  fat: number;
  createdAt: string;
  tags?: string[];
  type: "quickfood";
  brand?: string;
  servingSize?: string;
};

// Helper para converter Date para Timestamp
const dateToTimestamp = (date: Date) => Timestamp.fromDate(date);
const timestampToDate = (timestamp: Timestamp) => timestamp.toDate();

// ==================== JEJUM ====================

export const fastingService = {
  // Tipos de Jejum
  async getFastingTypes(): Promise<FastingType[]> {
    try {
      const docRef = doc(db, "userData", "fastingTypes");
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        return docSnap.data().types || [];
      }
      return [];
    } catch (error) {
      console.error("Erro ao carregar tipos de jejum:", error);
      return [];
    }
  },

  async saveFastingTypes(types: FastingType[]): Promise<void> {
    try {
      const docRef = doc(db, "userData", "fastingTypes");
      await setDoc(docRef, { types }, { merge: true });
    } catch (error) {
      console.error("Erro ao salvar tipos de jejum:", error);
      throw error;
    }
  },

  // Cronograma Semanal
  async getFastingSchedule(): Promise<FastingSchedule[]> {
    try {
      const docRef = doc(db, "userData", "fastingSchedule");
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        return docSnap.data().schedule || [];
      }
      return [];
    } catch (error) {
      console.error("Erro ao carregar cronograma:", error);
      return [];
    }
  },

  async saveFastingSchedule(schedule: FastingSchedule[]): Promise<void> {
    try {
      const docRef = doc(db, "userData", "fastingSchedule");
      await setDoc(docRef, { schedule }, { merge: true });
    } catch (error) {
      console.error("Erro ao salvar cronograma:", error);
      throw error;
    }
  },

  // Sessão de Jejum
  async getFastingSession(dateKey: string): Promise<FastingSession | null> {
    try {
      const docRef = doc(db, "fastingSessions", dateKey);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        return docSnap.data() as FastingSession;
      }
      return null;
    } catch (error) {
      console.error("Erro ao carregar sessão:", error);
      return null;
    }
  },

  async saveFastingSession(dateKey: string, session: FastingSession): Promise<void> {
    try {
      const docRef = doc(db, "fastingSessions", dateKey);
      await setDoc(docRef, session);
    } catch (error) {
      console.error("Erro ao salvar sessão:", error);
      throw error;
    }
  },

  async deleteFastingSession(dateKey: string): Promise<void> {
    try {
      const docRef = doc(db, "fastingSessions", dateKey);
      await deleteDoc(docRef);
    } catch (error) {
      console.error("Erro ao deletar sessão:", error);
      throw error;
    }
  },

  // Histórico de Jejum
  async getFastingHistory(dateKey: string): Promise<FastingSession[]> {
    try {
      const docRef = doc(db, "fastingHistory", dateKey);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        return docSnap.data().history || [];
      }
      return [];
    } catch (error) {
      console.error("Erro ao carregar histórico:", error);
      return [];
    }
  },

  async addFastingHistory(dateKey: string, session: FastingSession): Promise<void> {
    try {
      const docRef = doc(db, "fastingHistory", dateKey);
      const docSnap = await getDoc(docRef);
      const history = docSnap.exists() ? docSnap.data().history || [] : [];
      history.push({
        ...session,
        completedAt: Date.now(),
        completed: true,
      });
      await setDoc(docRef, { history }, { merge: true });
    } catch (error) {
      console.error("Erro ao salvar histórico:", error);
      throw error;
    }
  },
};

// ==================== TREINO ====================

export const workoutService = {
  // Configuração Semanal
  async getWorkoutConfig(): Promise<Record<string, WorkoutDay>> {
    try {
      const docRef = doc(db, "userData", "workoutConfig");
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        return docSnap.data().config || {};
      }
      return {};
    } catch (error) {
      console.error("Erro ao carregar configuração de treino:", error);
      return {};
    }
  },

  async saveWorkoutConfig(config: Record<string, WorkoutDay>): Promise<void> {
    try {
      const docRef = doc(db, "userData", "workoutConfig");
      await setDoc(docRef, { config }, { merge: true });
    } catch (error) {
      console.error("Erro ao salvar configuração de treino:", error);
      throw error;
    }
  },

  // Treino do Dia
  async getWorkout(dateKey: string): Promise<WorkoutDay | null> {
    try {
      const docRef = doc(db, "workouts", dateKey);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        return docSnap.data() as WorkoutDay;
      }
      return null;
    } catch (error) {
      console.error("Erro ao carregar treino:", error);
      return null;
    }
  },

  async saveWorkout(dateKey: string, workout: WorkoutDay): Promise<void> {
    try {
      const docRef = doc(db, "workouts", dateKey);
      await setDoc(docRef, workout);
    } catch (error) {
      console.error("Erro ao salvar treino:", error);
      throw error;
    }
  },

  // Atividades Físicas
  async getActivities(dateKey: string): Promise<any[]> {
    try {
      const docRef = doc(db, "activities", dateKey);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        return docSnap.data().activities || [];
      }
      return [];
    } catch (error) {
      console.error("Erro ao carregar atividades:", error);
      return [];
    }
  },

  async saveActivities(dateKey: string, activities: any[]): Promise<void> {
    try {
      const docRef = doc(db, "activities", dateKey);
      await setDoc(docRef, { activities });
    } catch (error) {
      console.error("Erro ao salvar atividades:", error);
      throw error;
    }
  },
};

// ==================== CHECKLIST ====================

export const checklistService = {
  // Checklist diário
  async getDailyChecklist(dateKey: string): Promise<ChecklistItem[] | null> {
    try {
      const docRef = doc(db, "dailyChecklists", dateKey);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        return docSnap.data().items || null;
      }
      return null;
    } catch (error) {
      console.error("Erro ao carregar checklist diário:", error);
      return null;
    }
  },

  async saveDailyChecklist(dateKey: string, items: ChecklistItem[], score?: number): Promise<void> {
    try {
      const docRef = doc(db, "dailyChecklists", dateKey);
      const data: any = { items, date: dateKey };
      if (score !== undefined) {
        data.score = score;
      }
      await setDoc(docRef, data);
    } catch (error) {
      console.error("Erro ao salvar checklist diário:", error);
      throw error;
    }
  },
  
  async getDailyChecklistScore(dateKey: string): Promise<number | null> {
    try {
      const docRef = doc(db, "dailyChecklists", dateKey);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        return docSnap.data().score || null;
      }
      return null;
    } catch (error) {
      console.error("Erro ao carregar score do checklist:", error);
      return null;
    }
  },

  // Checklist padrão
  async getDefaultChecklist(): Promise<ChecklistItem[]> {
    try {
      const docRef = doc(db, "userData", "defaultChecklist");
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        return docSnap.data().items || [];
      }
      return [];
    } catch (error) {
      console.error("Erro ao carregar checklist padrão:", error);
      return [];
    }
  },

  async saveDefaultChecklist(items: ChecklistItem[]): Promise<void> {
    try {
      const docRef = doc(db, "userData", "defaultChecklist");
      await setDoc(docRef, { items });
    } catch (error) {
      console.error("Erro ao salvar checklist padrão:", error);
      throw error;
    }
  },

  // Missões especiais
  async getSpecialChecks(dateKey: string): Promise<ChecklistItem[]> {
    try {
      const docRef = doc(db, "specialChecks", dateKey);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        return docSnap.data().items || [];
      }
      return [];
    } catch (error) {
      console.error("Erro ao carregar missões especiais:", error);
      return [];
    }
  },

  async saveSpecialChecks(dateKey: string, items: ChecklistItem[]): Promise<void> {
    try {
      const docRef = doc(db, "specialChecks", dateKey);
      await setDoc(docRef, { items, date: dateKey });
    } catch (error) {
      console.error("Erro ao salvar missões especiais:", error);
      throw error;
    }
  },

  // Estado do checklist (checkedIds)
  async getChecklistState(dateKey: string): Promise<Set<string> | null> {
    try {
      const docRef = doc(db, "checklistStates", dateKey);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const checkedIds = docSnap.data().checkedIds || [];
        return new Set(checkedIds);
      }
      return null;
    } catch (error) {
      console.error("Erro ao carregar estado do checklist:", error);
      return null;
    }
  },

  async saveChecklistState(dateKey: string, checkedIds: Set<string>): Promise<void> {
    try {
      const docRef = doc(db, "checklistStates", dateKey);
      await setDoc(docRef, { checkedIds: Array.from(checkedIds), date: dateKey });
    } catch (error) {
      console.error("Erro ao salvar estado do checklist:", error);
      throw error;
    }
  },
};

// ==================== REFEIÇÕES ====================

export const mealService = {
  // Refeições do dia
  async getMeals(dateKey: string): Promise<SelectedMeal[]> {
    try {
      const docRef = doc(db, "meals", dateKey);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        return docSnap.data().meals || [];
      }
      return [];
    } catch (error) {
      console.error("Erro ao carregar refeições:", error);
      return [];
    }
  },

  async saveMeals(dateKey: string, meals: SelectedMeal[]): Promise<void> {
    try {
      const docRef = doc(db, "meals", dateKey);
      await setDoc(docRef, { meals, date: dateKey });
    } catch (error) {
      console.error("Erro ao salvar refeições:", error);
      throw error;
    }
  },

  // Refeições selecionadas gerais
  async getSelectedMeals(): Promise<SelectedMeal[]> {
    try {
      const docRef = doc(db, "userData", "selectedMeals");
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        return docSnap.data().meals || [];
      }
      return [];
    } catch (error) {
      console.error("Erro ao carregar refeições selecionadas:", error);
      return [];
    }
  },

  async saveSelectedMeals(meals: SelectedMeal[]): Promise<void> {
    try {
      const docRef = doc(db, "userData", "selectedMeals");
      await setDoc(docRef, { meals });
    } catch (error) {
      console.error("Erro ao salvar refeições selecionadas:", error);
      throw error;
    }
  },

  // Opções customizadas
  async getCustomOptions(slotId: string): Promise<CustomMealOption[]> {
    try {
      const docRef = doc(db, "customMealOptions", slotId);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        return docSnap.data().options || [];
      }
      return [];
    } catch (error) {
      console.error("Erro ao carregar opções customizadas:", error);
      return [];
    }
  },

  async saveCustomOptions(slotId: string, options: CustomMealOption[]): Promise<void> {
    try {
      const docRef = doc(db, "customMealOptions", slotId);
      await setDoc(docRef, { options, slotId });
    } catch (error) {
      console.error("Erro ao salvar opções customizadas:", error);
      throw error;
    }
  },
};

// ==================== BIBLIOTECA (ARSENAL) ====================

export const libraryService = {
  // Receitas
  async getRecipes(): Promise<Recipe[]> {
    try {
      const docRef = doc(db, "userData", "recipeLibrary");
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        return docSnap.data().recipes || [];
      }
      return [];
    } catch (error) {
      console.error("Erro ao carregar receitas:", error);
      return [];
    }
  },

  async saveRecipes(recipes: Recipe[]): Promise<void> {
    try {
      const docRef = doc(db, "userData", "recipeLibrary");
      await setDoc(docRef, { recipes });
    } catch (error) {
      console.error("Erro ao salvar receitas:", error);
      throw error;
    }
  },

  // Comidas prontas
  async getQuickFoods(): Promise<QuickFood[]> {
    try {
      const docRef = doc(db, "userData", "quickFoodLibrary");
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        return docSnap.data().quickFoods || [];
      }
      return [];
    } catch (error) {
      console.error("Erro ao carregar comidas prontas:", error);
      return [];
    }
  },

  async saveQuickFoods(quickFoods: QuickFood[]): Promise<void> {
    try {
      const docRef = doc(db, "userData", "quickFoodLibrary");
      await setDoc(docRef, { quickFoods });
    } catch (error) {
      console.error("Erro ao salvar comidas prontas:", error);
      throw error;
    }
  },
};

// ==================== PERFIL ====================

export const profileService = {
  // Peso Atual
  async getCurrentWeight(): Promise<number> {
    try {
      const docRef = doc(db, "userData", "profile");
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        return docSnap.data().currentWeight || 92;
      }
      return 92;
    } catch (error) {
      console.error("Erro ao carregar peso atual:", error);
      return 92;
    }
  },

  async saveCurrentWeight(weight: number): Promise<void> {
    try {
      const docRef = doc(db, "userData", "profile");
      await updateDoc(docRef, { currentWeight: weight });
    } catch (error) {
      // Se o documento não existir, criar
      const docRef = doc(db, "userData", "profile");
      await setDoc(docRef, { currentWeight: weight }, { merge: true });
    }
  },

  // Meta de Peso
  async getTargetWeight(): Promise<number> {
    try {
      const docRef = doc(db, "userData", "profile");
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        return docSnap.data().targetWeight || 72;
      }
      return 72;
    } catch (error) {
      console.error("Erro ao carregar meta de peso:", error);
      return 72;
    }
  },

  async saveTargetWeight(weight: number): Promise<void> {
    try {
      const docRef = doc(db, "userData", "profile");
      await updateDoc(docRef, { targetWeight: weight });
    } catch (error) {
      const docRef = doc(db, "userData", "profile");
      await setDoc(docRef, { targetWeight: weight }, { merge: true });
    }
  },

  // Histórico de Peso
  async getWeightHistory(): Promise<WeightEntry[]> {
    try {
      const docRef = doc(db, "userData", "weightHistory");
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        return docSnap.data().history || [];
      }
      return [];
    } catch (error) {
      console.error("Erro ao carregar histórico de peso:", error);
      return [];
    }
  },

  async saveWeightHistory(history: WeightEntry[]): Promise<void> {
    try {
      const docRef = doc(db, "userData", "weightHistory");
      await setDoc(docRef, { history });
    } catch (error) {
      console.error("Erro ao salvar histórico de peso:", error);
      throw error;
    }
  },

  // Antropometria
  async getAnthropometry(): Promise<AnthropometryData | null> {
    try {
      const docRef = doc(db, "userData", "anthropometry");
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const data = docSnap.data();
        return {
          ...data,
          lastMeasurementDate: timestampToDate(data.lastMeasurementDate),
        } as AnthropometryData;
      }
      return null;
    } catch (error) {
      console.error("Erro ao carregar antropometria:", error);
      return null;
    }
  },

  async saveAnthropometry(data: AnthropometryData): Promise<void> {
    try {
      const docRef = doc(db, "userData", "anthropometry");
      await setDoc(docRef, {
        ...data,
        lastMeasurementDate: dateToTimestamp(data.lastMeasurementDate),
      });
    } catch (error) {
      console.error("Erro ao salvar antropometria:", error);
      throw error;
    }
  },

  // Histórico de Antropometria
  async getAnthropometryHistory(): Promise<any[]> {
    try {
      const docRef = doc(db, "userData", "anthropometryHistory");
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        return docSnap.data().history || [];
      }
      return [];
    } catch (error) {
      console.error("Erro ao carregar histórico de antropometria:", error);
      return [];
    }
  },

  async saveAnthropometryHistory(history: any[]): Promise<void> {
    try {
      const docRef = doc(db, "userData", "anthropometryHistory");
      await setDoc(docRef, { history });
    } catch (error) {
      console.error("Erro ao salvar histórico de antropometria:", error);
      throw error;
    }
  },
};

