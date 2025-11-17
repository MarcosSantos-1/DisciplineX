export interface MealItem {
  name: string;
  quantity: string;
  calories: number;
}

export interface MealOption {
  id: string;
  name: string;
  items: MealItem[];
  totalCalories: number;
  protein: number;
  carbs: number;
  fat: number;
  image?: string; // Para futuro uso com fotos
}

export interface MealSlot {
  id: string;
  name: string;
  time: string;
  minCalories: number;
  maxCalories: number;
  options: MealOption[];
}

export interface SelectedMeal {
  slotId: string;
  optionId: string;
  date: string; // YYYY-MM-DD format
}

export interface MealDayPlan {
  weekday: number; // 0 = domingo, 1 = segunda, etc.
  slots: MealSlot[];
}

// Tipos para receitas da biblioteca (Arsenal)
export interface Recipe {
  id: string;
  name: string;
  description?: string;
  image?: string; // URL da imagem
  ingredients: MealItem[]; // Lista de ingredientes
  instructions: string[]; // Modo de preparo (passo a passo)
  prepTime: number; // Tempo de preparo em minutos
  totalCalories: number;
  protein: number;
  carbs: number;
  fat: number;
  createdAt: string; // Data de criação
  tags?: string[]; // Tags para busca (ex: "proteico", "rápido", "doce")
  type: "recipe"; // Tipo para diferenciar de comidas prontas
}

// Tipo para comidas prontas (barrinhas, torradas, etc.)
export interface QuickFood {
  id: string;
  name: string;
  description?: string;
  image?: string; // URL da imagem
  totalCalories: number;
  protein: number;
  carbs: number;
  fat: number;
  createdAt: string; // Data de criação
  tags?: string[]; // Tags para busca
  type: "quickfood"; // Tipo para diferenciar de receitas
  brand?: string; // Marca (opcional)
  servingSize?: string; // Tamanho da porção (ex: "1 unidade", "30g")
}

// Tipo unificado para Arsenal (receitas ou comidas prontas)
export type ArsenalItem = Recipe | QuickFood;

// Tipos para sistema de checklist
export interface ChecklistItem {
  id: string;
  label: string;
  isSpecial: boolean; // Se true, é uma missão especial do dia
  weight: number; // Peso no score (0-100)
  date?: string; // YYYY-MM-DD - apenas para checks especiais
}

export interface DailyChecklist {
  date: string; // YYYY-MM-DD
  items: ChecklistItem[];
  score: number; // Score calculado do dia
}

// Tipos para atividades físicas e gasto calórico
export interface PhysicalActivity {
  id: string;
  name: string;
  type: "workout" | "walking" | "sports" | "other";
  caloriesBurned: number; // Calorias queimadas calculadas usando METs
  duration: number; // Duração em minutos
  date: string; // YYYY-MM-DD format
  notes?: string;
  met?: number; // MET da atividade (para cálculo)
}

export interface ActivityTemplate {
  id: string;
  name: string;
  met: number; // MET oficial da atividade
  category: "walking" | "cycling" | "running" | "strength" | "martial_arts" | "swimming" | "other";
}

export interface DailyCalorieExpenditure {
  date: string; // YYYY-MM-DD format
  basalMetabolicRate: number; // Taxa metabólica basal (TMB) calculada com Mifflin-St Jeor
  activities: PhysicalActivity[]; // Atividades do dia
  totalExpenditure: number; // TMB + atividades
}

// Dados do usuário (depois virá do perfil/Firebase)
export interface UserProfile {
  weight: number; // kg
  height: number; // cm
  birthDate: string; // YYYY-MM-DD format (para calcular idade)
  gender: "male" | "female";
  leanBodyMass?: number; // kg - Massa magra (LBM) - opcional
  bodyFatPercentage?: number; // % de gordura corporal - opcional
}

// Templates de atividades com METs oficiais
export const ACTIVITY_TEMPLATES: ActivityTemplate[] = [
  // Caminhada
  { id: "walk-light", name: "Caminhada leve (4-5 km/h)", met: 3.0, category: "walking" },
  { id: "walk-light-backpack", name: "Caminhada leve com mochila", met: 3.5, category: "walking" },
  { id: "walk-moderate", name: "Caminhada moderada (5-6 km/h)", met: 3.8, category: "walking" },
  { id: "walk-fast", name: "Caminhada rápida (6-7 km/h)", met: 4.5, category: "walking" },
  
  // Bicicleta
  { id: "bike-light", name: "Bicicleta leve (10-15 km/h)", met: 4.0, category: "cycling" },
  { id: "bike-moderate", name: "Bicicleta moderada (16-20 km/h)", met: 6.8, category: "cycling" },
  { id: "bike-intense", name: "Bicicleta intensa (21-30 km/h)", met: 10.0, category: "cycling" },
  
  // Corrida
  { id: "run-7kmh", name: "Corrida (7 km/h)", met: 7.0, category: "running" },
  { id: "run-8.5kmh", name: "Corrida (8.5 km/h)", met: 8.3, category: "running" },
  { id: "run-10kmh", name: "Corrida (10 km/h)", met: 10.0, category: "running" },
  
  // Musculação
  { id: "strength-light", name: "Musculação leve", met: 3.5, category: "strength" },
  { id: "strength-moderate", name: "Musculação moderada", met: 6.0, category: "strength" },
  { id: "strength-intense", name: "Musculação intensa", met: 8.0, category: "strength" },
  
  // Artes Marciais
  { id: "muay-thai", name: "Muay Thai", met: 8.5, category: "martial_arts" },
  { id: "jiu-jitsu", name: "Jiu Jitsu", met: 7.0, category: "martial_arts" },
  
  // Natação
  { id: "swimming-light", name: "Natação leve", met: 6.0, category: "swimming" },
  { id: "swimming-moderate", name: "Natação moderada", met: 8.0, category: "swimming" },
  { id: "swimming-intense", name: "Natação intensa", met: 10.0, category: "swimming" },
];

// Função para calcular TMB usando Katch-McArdle (mais precisa quando temos massa magra)
// Fórmula: TMB = 370 + (21.6 × massa_magra_kg)
export function calculateBMR_KatchMcArdle(leanBodyMass: number): number {
  return Math.round(370 + (21.6 * leanBodyMass));
}

// Função para calcular TMB usando Mifflin-St Jeor (fallback quando não temos massa magra)
export function calculateBMR_MifflinStJeor(weight: number, height: number, age: number, gender: "male" | "female"): number {
  // Fórmula Mifflin-St Jeor
  // Homens: TMB = (10 × peso_kg) + (6.25 × altura_cm) - (5 × idade) + 5
  // Mulheres: TMB = (10 × peso_kg) + (6.25 × altura_cm) - (5 × idade) - 161
  const base = (10 * weight) + (6.25 * height) - (5 * age);
  return Math.round(gender === "male" ? base + 5 : base - 161);
}

// Função principal para calcular TMB - usa Katch-McArdle se tiver massa magra, senão Mifflin-St Jeor
export function calculateBMR(profile: UserProfile): number {
  // Se tiver massa magra, usar Katch-McArdle (mais precisa)
  if (profile.leanBodyMass && profile.leanBodyMass > 0) {
    return calculateBMR_KatchMcArdle(profile.leanBodyMass);
  }
  
  // Se tiver % de gordura, calcular massa magra
  if (profile.bodyFatPercentage !== undefined && profile.bodyFatPercentage >= 0 && profile.bodyFatPercentage <= 100) {
    const leanBodyMass = profile.weight * (1 - profile.bodyFatPercentage / 100);
    return calculateBMR_KatchMcArdle(leanBodyMass);
  }
  
  // Fallback: usar Mifflin-St Jeor
  const age = calculateAge(profile.birthDate);
  return calculateBMR_MifflinStJeor(profile.weight, profile.height, age, profile.gender);
}

// Função para calcular idade a partir da data de nascimento
export function calculateAge(birthDate: string): number {
  const birth = new Date(birthDate);
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--;
  }
  return age;
}

// Função para calcular gasto calórico de uma atividade usando METs
// Fórmula: kcal = MET × peso_kg × horas
export function calculateActivityCalories(met: number, weight: number, durationMinutes: number): number {
  const hours = durationMinutes / 60;
  return Math.round(met * weight * hours);
}

// Dados das refeições operacionais (Segunda a Sexta)
export const weekdayMeals: MealDayPlan = {
  weekday: 1, // Segunda-feira (representa segunda a sexta)
  slots: [
    {
      id: "lunch",
      name: "Almoço Operacional",
      time: "12h20",
      minCalories: 550,
      maxCalories: 750,
      options: [
        {
          id: "lunch-a",
          name: "OPÇÃO A — Marmita Clássica",
          items: [
            { name: "Arroz integral", quantity: "150g", calories: 195 },
            { name: "Milho (opcional)", quantity: "20g", calories: 20 },
            { name: "Sassami de frango grelhado", quantity: "150g", calories: 165 },
            { name: "Brócolis", quantity: "80g", calories: 28 },
            { name: "Cenoura", quantity: "80g", calories: 33 },
            { name: "Azeite", quantity: "1 colher de chá (5ml)", calories: 40 },
          ],
          totalCalories: 481,
          protein: 45,
          carbs: 55,
          fat: 12,
        },
        {
          id: "lunch-b",
          name: "OPÇÃO B — Batata doce + Carne moída",
          items: [
            { name: "Batata doce cozida", quantity: "180g", calories: 154 },
            { name: "Carne moída magra (patinho)", quantity: "150g", calories: 250 },
            { name: "Salada de beterraba", quantity: "100g", calories: 43 },
            { name: "Azeite", quantity: "1 colher de chá", calories: 40 },
          ],
          totalCalories: 487,
          protein: 38,
          carbs: 48,
          fat: 15,
        },
        {
          id: "lunch-c",
          name: "OPÇÃO C — Mandioca + Contra filé",
          items: [
            { name: "Mandioca cozida", quantity: "150g", calories: 171 },
            { name: "Contra filé grelhado", quantity: "140g", calories: 336 },
            { name: "Brócolis", quantity: "80g", calories: 28 },
            { name: "Cenoura", quantity: "60g", calories: 25 },
          ],
          totalCalories: 560,
          protein: 52,
          carbs: 42,
          fat: 18,
        },
      ],
    },
    {
      id: "afternoon-snack",
      name: "Lanche da Tarde",
      time: "16h30",
      minCalories: 260,
      maxCalories: 430,
      options: [
        {
          id: "snack-a",
          name: "OPÇÃO A — Iogurte proteico",
          items: [
            { name: "Iogurte natural", quantity: "170g", calories: 100 },
            { name: "Whey protein", quantity: "1 scoop", calories: 110 },
            { name: "Fruta pequena (maçã ou banana)", quantity: "1 unidade", calories: 80 },
          ],
          totalCalories: 290,
          protein: 35,
          carbs: 28,
          fat: 5,
        },
        {
          id: "snack-b",
          name: "OPÇÃO B — Sanduíche simples funcional",
          items: [
            { name: "Pão integral", quantity: "2 fatias", calories: 140 },
            { name: "Patê de frango com cenoura e creme de leite", quantity: "80g", calories: 120 },
            { name: "Requeijão", quantity: "1 colher de sopa (20g)", calories: 50 },
            { name: "Whey protein", quantity: "1 scoop", calories: 110 },
          ],
          totalCalories: 420,
          protein: 42,
          carbs: 38,
          fat: 12,
        },
        {
          id: "snack-c",
          name: "OPÇÃO C — Mix rápido",
          items: [
            { name: "Banana", quantity: "1 unidade", calories: 90 },
            { name: "Torradinha fit", quantity: "3 unidades", calories: 65 },
            { name: "Whey protein", quantity: "1 scoop", calories: 110 },
          ],
          totalCalories: 265,
          protein: 28,
          carbs: 35,
          fat: 4,
        },
      ],
    },
    {
      id: "dinner",
      name: "Jantar Base",
      time: "18h30",
      minCalories: 480,
      maxCalories: 650,
      options: [
        {
          id: "dinner-a",
          name: "OPÇÃO A — Marmita Clássica",
          items: [
            { name: "Arroz integral", quantity: "150g", calories: 195 },
            { name: "Milho (opcional)", quantity: "20g", calories: 20 },
            { name: "Sassami de frango grelhado", quantity: "150g", calories: 165 },
            { name: "Brócolis", quantity: "80g", calories: 28 },
            { name: "Cenoura", quantity: "80g", calories: 33 },
            { name: "Azeite", quantity: "1 colher de chá (5ml)", calories: 40 },
          ],
          totalCalories: 481,
          protein: 45,
          carbs: 55,
          fat: 12,
        },
        {
          id: "dinner-b",
          name: "OPÇÃO B — Batata doce + Carne moída",
          items: [
            { name: "Batata doce cozida", quantity: "180g", calories: 154 },
            { name: "Carne moída magra (patinho)", quantity: "150g", calories: 250 },
            { name: "Salada de beterraba", quantity: "100g", calories: 43 },
            { name: "Azeite", quantity: "1 colher de chá", calories: 40 },
          ],
          totalCalories: 487,
          protein: 38,
          carbs: 48,
          fat: 15,
        },
        {
          id: "dinner-c",
          name: "OPÇÃO C — Mandioca + Contra filé",
          items: [
            { name: "Mandioca cozida", quantity: "150g", calories: 171 },
            { name: "Contra filé grelhado", quantity: "140g", calories: 336 },
            { name: "Brócolis", quantity: "80g", calories: 28 },
            { name: "Cenoura", quantity: "60g", calories: 25 },
          ],
          totalCalories: 560,
          protein: 52,
          carbs: 42,
          fat: 18,
        },
      ],
    },
    {
      id: "pre-sleep",
      name: "Lanche pré-sono",
      time: "22h30",
      minCalories: 110,
      maxCalories: 180,
      options: [
        {
          id: "pre-sleep-a",
          name: "OPÇÃO A — Shake rápido",
          items: [
            { name: "Whey protein", quantity: "1 scoop", calories: 110 },
          ],
          totalCalories: 110,
          protein: 25,
          carbs: 3,
          fat: 1,
        },
        {
          id: "pre-sleep-b",
          name: "OPÇÃO B — Iogurte + 1 fruta",
          items: [
            { name: "Iogurte natural pequeno", quantity: "170g", calories: 100 },
            { name: "Fruta (maçã/banana/manga pequena)", quantity: "1 unidade", calories: 50 },
          ],
          totalCalories: 150,
          protein: 8,
          carbs: 22,
          fat: 3,
        },
        {
          id: "pre-sleep-c",
          name: "OPÇÃO C — Ovo",
          items: [
            { name: "Ovo cozido", quantity: "1 unidade", calories: 70 },
            { name: "Fruta", quantity: "1 unidade", calories: 90 },
          ],
          totalCalories: 160,
          protein: 12,
          carbs: 18,
          fat: 5,
        },
        {
          id: "pre-sleep-d",
          name: "OPÇÃO D — Patê de frango",
          items: [
            { name: "Patê de frango", quantity: "100g", calories: 150 },
          ],
          totalCalories: 150,
          protein: 20,
          carbs: 5,
          fat: 6,
        },
      ],
    },
  ],
};

// Dados para sábado e domingo (3 refeições normais - placeholder por enquanto)
export const weekendMeals: MealDayPlan = {
  weekday: 0, // Domingo (representa sábado e domingo)
  slots: [
    {
      id: "breakfast",
      name: "Café da Manhã",
      time: "08h00",
      minCalories: 400,
      maxCalories: 600,
      options: [],
    },
    {
      id: "lunch",
      name: "Almoço",
      time: "13h00",
      minCalories: 500,
      maxCalories: 700,
      options: [],
    },
    {
      id: "dinner",
      name: "Jantar",
      time: "19h00",
      minCalories: 400,
      maxCalories: 600,
      options: [],
    },
  ],
};

export function getMealsForDay(dayOfWeek: number): MealSlot[] {
  // 1-5 = Segunda a Sexta
  if (dayOfWeek >= 1 && dayOfWeek <= 5) {
    return weekdayMeals.slots;
  }
  // 0, 6 = Domingo e Sábado
  return weekendMeals.slots;
}

