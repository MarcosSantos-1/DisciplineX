"use client";

import { CircularChart } from "@/components/CircularChart";
import { MonthlyCalendar } from "@/components/MonthlyCalendar";
import { MealChecklist } from "@/components/MealChecklist";
import { DailyChecklist } from "@/components/DailyChecklist";
import { AddSpecialCheckModal } from "@/components/AddSpecialCheckModal";
import { FastingTracker } from "@/components/FastingTracker";
import { useRouter } from "next/navigation";
import { useState, useEffect, useMemo } from "react";
import { 
  SelectedMeal, 
  getMealsForDay, 
  PhysicalActivity,
  calculateBMR,
  calculateAge,
  UserProfile
} from "@/types/meals";
import { checklistService, workoutService, mealService } from "@/lib/firebaseService";

function getDaysInMonth(year: number, month: number): Date[] {
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const days: Date[] = [];
  
  for (let i = 1; i <= lastDay.getDate(); i++) {
    days.push(new Date(year, month, i));
  }
  
  return days;
}

async function getDayScore(date: Date): Promise<number | null> {
  // Verificar se estamos no navegador
  if (typeof window === "undefined") return null;
  
  // Carregar score do checklist do dia do Firebase
  const dateKey = date.toISOString().split("T")[0];
  try {
    return await checklistService.getDailyChecklistScore(dateKey);
  } catch (e) {
    console.error("Erro ao carregar score:", e);
    return null;
  }
}

// Meta calórica diária
const DAILY_CALORIE_GOAL = 1600;
const DAILY_PROTEIN_GOAL = 150;
const DAILY_CARBS_GOAL = 200;
const DAILY_FAT_GOAL = 65;

// Dados do usuário (depois virá do perfil/Firebase)
const USER_PROFILE: UserProfile = {
  weight: 94, // kg
  height: 165, // cm
  birthDate: "2003-06-15", // YYYY-MM-DD
  gender: "male",
  leanBodyMass: 63.4, // kg - Massa magra (usa Katch-McArdle)
  // bodyFatPercentage: 32.55, // % - Alternativa: pode calcular massa magra a partir disso
};

// Calcular TMB - usa Katch-McArdle se tiver massa magra, senão Mifflin-St Jeor
const BASAL_METABOLIC_RATE = calculateBMR(USER_PROFILE);

// Calcular gasto total do dia (TMB + atividades)
async function calculateDailyExpenditure(dateKey: string): Promise<number> {
  // Verificar se estamos no navegador
  if (typeof window === "undefined") return BASAL_METABOLIC_RATE;
  
  // Carregar atividades do Firebase
  let activities: PhysicalActivity[] = [];
  try {
    activities = await workoutService.getActivities(dateKey);
  } catch (e) {
    console.error("Erro ao carregar atividades:", e);
  }

  // Calcular calorias queimadas nas atividades
  const activityCalories = activities.reduce(
    (sum, activity) => sum + activity.caloriesBurned,
    0
  );

  // Gasto total = TMB + atividades
  return BASAL_METABOLIC_RATE + activityCalories;
}

async function calculateNutritionFromMeals(
  selectedMeals: SelectedMeal[],
  dateKey: string
) {
  // Parsear dateKey corretamente (formato YYYY-MM-DD)
  const [year, month, day] = dateKey.split("-").map(Number);
  const date = new Date(year, month - 1, day); // month é 0-indexed
  const dayOfWeek = date.getDay();
  
  console.log("Parsing dateKey:", dateKey, "-> dayOfWeek:", dayOfWeek, "date:", date);
  
  const meals = getMealsForDay(dayOfWeek);
  console.log("Slots retornados por getMealsForDay:", meals.map(m => ({ id: m.id, name: m.name, optionsCount: m.options.length })));
  
  let totalCalories = 0;
  let totalProtein = 0;
  let totalCarbs = 0;
  let totalFat = 0;

  // Função para obter opções customizadas de um slot do Firebase
  const getCustomOptions = async (slotId: string): Promise<any[]> => {
    // Verificar se estamos no navegador
    if (typeof window === "undefined") return [];
    
    try {
      return await mealService.getCustomOptions(slotId);
    } catch (e) {
      return [];
    }
  };

  console.log("calculateNutritionFromMeals - selectedMeals:", selectedMeals, "dateKey:", dateKey);
  
  const filteredMeals = selectedMeals.filter((m) => m.date === dateKey);
  console.log("Refeições filtradas para", dateKey, ":", filteredMeals);
  
  // Processar refeições de forma assíncrona
  for (const selectedMeal of filteredMeals) {
    console.log("Processando refeição:", selectedMeal);
    const slot = meals.find((s) => s.id === selectedMeal.slotId);
    console.log("Slot encontrado:", slot?.name, "para slotId:", selectedMeal.slotId);
    
    if (slot) {
      console.log("Slot completo:", JSON.stringify(slot, null, 2));
      console.log("Opções disponíveis no slot:", slot.options.map(o => ({ id: o.id, name: o.name })));
      console.log("Total de opções:", slot.options.length);
      // Buscar nas opções padrão primeiro
      let option = slot.options.find((o) => o.id === selectedMeal.optionId);
      console.log("Buscando optionId:", selectedMeal.optionId);
      console.log("Comparação de IDs:", slot.options.map(o => `"${o.id}" === "${selectedMeal.optionId}"? ${o.id === selectedMeal.optionId}`));
      console.log("Opção padrão encontrada:", option?.name, option ? "✓" : "✗");
      
      // Se não encontrar, buscar nas opções customizadas
      if (!option) {
        const customOptions = await getCustomOptions(selectedMeal.slotId);
        console.log("Opções customizadas para", selectedMeal.slotId, ":", customOptions);
        option = customOptions.find((o: any) => o.id === selectedMeal.optionId);
        console.log("Opção customizada encontrada:", option?.name);
      }
      
      if (option) {
        console.log("Adicionando macros:", option.totalCalories, "kcal,", option.protein, "g proteína");
        totalCalories += option.totalCalories;
        totalProtein += option.protein;
        totalCarbs += option.carbs;
        totalFat += option.fat;
      } else {
        console.warn("Opção não encontrada para", selectedMeal.optionId, "no slot", selectedMeal.slotId);
      }
    } else {
      console.warn("Slot não encontrado:", selectedMeal.slotId);
    }
  }

  const burned = await calculateDailyExpenditure(dateKey);

  return {
    calories: {
      consumed: totalCalories,
      limit: DAILY_CALORIE_GOAL,
      burned: burned,
    },
    macros: {
      protein: {
        label: "Proteína",
        consumed: totalProtein,
        limit: DAILY_PROTEIN_GOAL,
        color: "red",
        gradient: "from-red-400 to-orange-400",
      },
      carbs: {
        label: "Carboidratos",
        consumed: totalCarbs,
        limit: DAILY_CARBS_GOAL,
        color: "blue",
        gradient: "from-blue-400 to-cyan-400",
      },
      fat: {
        label: "Gorduras",
        consumed: totalFat,
        limit: DAILY_FAT_GOAL,
        color: "yellow",
        gradient: "from-yellow-400 to-amber-400",
      },
    },
  };
}



export default function Home() {
  const router = useRouter();
  const today = new Date();
  const [selectedDate, setSelectedDate] = useState<Date>(today);
  const [monthDays, setMonthDays] = useState<Array<{ date: Date; score: number | null }>>([]);
  const [selectedMeals, setSelectedMeals] = useState<SelectedMeal[]>([]);
  const [showSpecialCheckModal, setShowSpecialCheckModal] = useState(false);
  const [specialCheckDate, setSpecialCheckDate] = useState<Date>(today);

  const dateKey = selectedDate.toISOString().split("T")[0];
  const [nutrition, setNutrition] = useState({
    calories: {
      consumed: 0,
      limit: DAILY_CALORIE_GOAL,
      burned: BASAL_METABOLIC_RATE,
    },
    macros: {
      protein: { label: "Proteína", consumed: 0, limit: DAILY_PROTEIN_GOAL, color: "red", gradient: "from-red-400 to-orange-400" },
      carbs: { label: "Carboidratos", consumed: 0, limit: DAILY_CARBS_GOAL, color: "blue", gradient: "from-blue-400 to-cyan-400" },
      fat: { label: "Gorduras", consumed: 0, limit: DAILY_FAT_GOAL, color: "yellow", gradient: "from-yellow-400 to-amber-400" },
    },
  });
  
  // Recalcular nutrição sempre que selectedMeals ou dateKey mudar
  useEffect(() => {
    const calculateNutrition = async () => {
      if (typeof window === "undefined") return;
      
      // Ler refeições do Firebase
      let mealsToUse = selectedMeals;
      try {
        const mealsFromFirebase = await mealService.getMeals(dateKey);
        mealsToUse = mealsFromFirebase.length > 0 ? mealsFromFirebase : selectedMeals;
      } catch (e) {
        console.error("Erro ao carregar refeições do Firebase:", e);
      }
      
      console.log("Recalculando nutrição para", dateKey);
      console.log("Refeições do estado:", selectedMeals);
      console.log("Refeições do Firebase:", mealsToUse);
      
      const result = await calculateNutritionFromMeals(mealsToUse, dateKey);
      console.log("Resultado do cálculo:", result);
      setNutrition(result);
    };
    
    calculateNutrition();
  }, [selectedMeals, dateKey]);

  useEffect(() => {
    // Verificar se estamos no navegador
    if (typeof window === "undefined") return;
    
    const loadDays = async () => {
      const currentDate = new Date();
      const year = currentDate.getFullYear();
      const month = currentDate.getMonth();
      const days = getDaysInMonth(year, month);
      
      // Carregar scores do Firebase
      const daysWithScores = await Promise.all(
        days.map(async (date) => ({
          date,
          score: await getDayScore(date),
        }))
      );
      
      setMonthDays(daysWithScores);
    };

    loadDays();

    // Atualizar scores periodicamente (sem causar loops)
    const interval = setInterval(() => {
      loadDays();
    }, 2000); // Atualizar a cada 2 segundos

    return () => {
      clearInterval(interval);
    };
  }, []);

  // Carregar refeições selecionadas quando a data muda ou quando o componente monta
  useEffect(() => {
    // Verificar se estamos no navegador
    if (typeof window === "undefined") return;
    
    const loadMeals = async () => {
      try {
        const meals = await mealService.getMeals(dateKey);
        console.log("Carregando refeições para", dateKey, ":", meals);
        setSelectedMeals(meals);
      } catch (e) {
        console.error("Erro ao carregar refeições:", e);
        setSelectedMeals([]);
      }
    };

    loadMeals();
  }, [dateKey]);

  // Escutar mudanças nas refeições através de eventos customizados
  useEffect(() => {
    // Verificar se estamos no navegador
    if (typeof window === "undefined") return;
    
    const handleMealsUpdate = (e: CustomEvent) => {
      console.log("Evento mealsUpdated capturado:", e.detail);
      if (e.detail.dateKey === dateKey) {
        console.log("Atualizando refeições para", dateKey, ":", e.detail.meals);
        // Atualizar estado E forçar re-render
        setSelectedMeals(e.detail.meals);
        // Firebase já está sincronizado pelo MealChecklist
      } else {
        console.log("Ignorando evento - dateKey diferente:", e.detail.dateKey, "!=", dateKey);
      }
    };

    window.addEventListener("mealsUpdated", handleMealsUpdate as EventListener);

    return () => {
      window.removeEventListener("mealsUpdated", handleMealsUpdate as EventListener);
    };
  }, [dateKey]);

  // Escutar mudanças nas atividades através de eventos customizados
  useEffect(() => {
    // Verificar se estamos no navegador
    if (typeof window === "undefined") return;
    
    const handleActivitiesUpdate = async () => {
      // Forçar re-render para atualizar o gasto calórico recarregando refeições
      try {
        const meals = await mealService.getMeals(dateKey);
        setSelectedMeals(meals);
      } catch (e) {
        console.error("Erro ao recarregar refeições:", e);
      }
    };

    window.addEventListener("activitiesUpdated", handleActivitiesUpdate as EventListener);

    return () => {
      window.removeEventListener("activitiesUpdated", handleActivitiesUpdate as EventListener);
    };
  }, [dateKey]);

  return (
    <div className="flex flex-1 flex-col gap-4">
      {/* Header */}
      <header className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.25em] text-jagger-300/80">
            Dia de Operação
          </p>
          <h2 className="mt-1 text-2xl font-semibold text-zinc-50">
            Painel Diário
          </h2>
          <p className="mt-1 text-xs text-zinc-400">
            Complete as missões para aumentar o{" "}
            <span className="text-jagger-300">Disciplinary Score</span>.
          </p>
        </div>
        <div className="hidden text-right text-xs text-zinc-400 sm:block">
          <p>Campanha atual</p>
          <p className="text-sm font-semibold text-emerald-400">
            -22kg até Junho / 2026
          </p>
        </div>
      </header>

      {/* Calendário Mensal */}
      <MonthlyCalendar
        days={monthDays}
        onDayClick={setSelectedDate}
        onAddSpecialCheck={(date) => {
          // Abrir modal para adicionar check especial
          setShowSpecialCheckModal(true);
          setSpecialCheckDate(date);
        }}
      />

      {/* Checklist disciplinar + nutrição */}
      <section className="grid flex-1 gap-3 md:grid-cols-[minmax(0,1.1fr)_minmax(0,1.1fr)]">
        {/* Checklist */}
        <DailyChecklist 
          date={selectedDate} 
          onScoreChange={(score) => {
            // Score atualizado automaticamente pelo componente
          }}
          onAddSpecialCheck={() => {
            setShowSpecialCheckModal(true);
            setSpecialCheckDate(selectedDate);
          }}
        />

        {/* Rastreador de Jejum */}
        <FastingTracker date={selectedDate} />

        {/* Nutrição / refeições */}
        <MealChecklist selectedDate={selectedDate} />
      </section>

      {/* Card de calorias com gráfico circular - Movido para o final */}
      <section>
        <CircularChart calories={nutrition.calories} macros={nutrition.macros} />
      </section>

      {/* Modal para adicionar check especial */}
      {showSpecialCheckModal && (
        <AddSpecialCheckModal
          date={specialCheckDate}
          onClose={() => setShowSpecialCheckModal(false)}
          onAdd={() => {
            // Forçar atualização do checklist
            window.dispatchEvent(new CustomEvent("checklistUpdated", { detail: { dateKey: specialCheckDate.toISOString().split("T")[0] } }));
            setShowSpecialCheckModal(false);
          }}
        />
      )}
    </div>
  );
}

