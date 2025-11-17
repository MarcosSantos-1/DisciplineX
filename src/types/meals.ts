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

