"use client";

import { useState, useEffect } from "react";
import { Recipe, QuickFood, ArsenalItem, MealOption } from "@/types/meals";
import { RecipeForm } from "./RecipeForm";
import { QuickFoodForm } from "./QuickFoodForm";
import { RecipeCard } from "./RecipeCard";
import { QuickFoodCard } from "./QuickFoodCard";

interface RecipeLibraryProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectRecipe?: (recipe: Recipe) => void; // Para usar como opção em um slot
  onSelectQuickFood?: (quickFood: QuickFood) => void; // Para usar como opção em um slot
  slotId?: string; // ID do slot para o qual estamos selecionando
}

export function RecipeLibrary({
  isOpen,
  onClose,
  onSelectRecipe,
  onSelectQuickFood,
  slotId,
}: RecipeLibraryProps) {
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [quickFoods, setQuickFoods] = useState<QuickFood[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [showRecipeForm, setShowRecipeForm] = useState(false);
  const [showQuickFoodForm, setShowQuickFoodForm] = useState(false);
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);
  const [selectedQuickFood, setSelectedQuickFood] = useState<QuickFood | null>(null);
  const [activeTab, setActiveTab] = useState<"all" | "recipes" | "quickfoods">("all");

  // Carregar receitas e comidas prontas do localStorage
  useEffect(() => {
    if (isOpen) {
      const savedRecipes = localStorage.getItem("recipe_library");
      if (savedRecipes) {
        try {
          const parsed = JSON.parse(savedRecipes);
          // Filtrar apenas receitas (com type: "recipe" ou sem type para compatibilidade)
          setRecipes(parsed.filter((r: any) => !r.type || r.type === "recipe"));
        } catch (e) {
          console.error("Erro ao carregar receitas:", e);
        }
      }
      
      const savedQuickFoods = localStorage.getItem("quickfood_library");
      if (savedQuickFoods) {
        try {
          setQuickFoods(JSON.parse(savedQuickFoods));
        } catch (e) {
          console.error("Erro ao carregar comidas prontas:", e);
        }
      }
    }
  }, [isOpen]);

  // Filtrar receitas e comidas prontas por busca
  const filteredRecipes = recipes.filter((recipe) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      recipe.name.toLowerCase().includes(query) ||
      recipe.description?.toLowerCase().includes(query) ||
      recipe.tags?.some((tag) => tag.toLowerCase().includes(query)) ||
      recipe.ingredients.some((ing) =>
        ing.name.toLowerCase().includes(query)
      )
    );
  });

  const filteredQuickFoods = quickFoods.filter((quickFood) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      quickFood.name.toLowerCase().includes(query) ||
      quickFood.description?.toLowerCase().includes(query) ||
      quickFood.brand?.toLowerCase().includes(query) ||
      quickFood.tags?.some((tag) => tag.toLowerCase().includes(query))
    );
  });

  // Itens filtrados baseado na aba ativa
  const getFilteredItems = () => {
    if (activeTab === "recipes") return filteredRecipes;
    if (activeTab === "quickfoods") return filteredQuickFoods;
    return [...filteredRecipes, ...filteredQuickFoods];
  };

  const handleSaveRecipe = (recipe: Recipe) => {
    const updated = [...recipes, recipe];
    setRecipes(updated);
    localStorage.setItem("recipe_library", JSON.stringify(updated));
    setShowRecipeForm(false);
  };

  const handleUpdateRecipe = (updatedRecipe: Recipe) => {
    const updated = recipes.map((r) =>
      r.id === updatedRecipe.id ? updatedRecipe : r
    );
    setRecipes(updated);
    localStorage.setItem("recipe_library", JSON.stringify(updated));
    setSelectedRecipe(null);
  };

  const handleDeleteRecipe = (recipeId: string) => {
    const updated = recipes.filter((r) => r.id !== recipeId);
    setRecipes(updated);
    localStorage.setItem("recipe_library", JSON.stringify(updated));
    setSelectedRecipe(null);
  };

  const handleSaveQuickFood = (quickFood: QuickFood) => {
    const updated = [...quickFoods, quickFood];
    setQuickFoods(updated);
    localStorage.setItem("quickfood_library", JSON.stringify(updated));
    setShowQuickFoodForm(false);
  };

  const handleUpdateQuickFood = (updatedQuickFood: QuickFood) => {
    const updated = quickFoods.map((qf) =>
      qf.id === updatedQuickFood.id ? updatedQuickFood : qf
    );
    setQuickFoods(updated);
    localStorage.setItem("quickfood_library", JSON.stringify(updated));
    setSelectedQuickFood(null);
  };

  const handleDeleteQuickFood = (quickFoodId: string) => {
    const updated = quickFoods.filter((qf) => qf.id !== quickFoodId);
    setQuickFoods(updated);
    localStorage.setItem("quickfood_library", JSON.stringify(updated));
    setSelectedQuickFood(null);
  };

  const handleSelectRecipe = (recipe: Recipe) => {
    if (onSelectRecipe && slotId) {
      onSelectRecipe(recipe);
      onClose();
    } else {
      setSelectedRecipe(recipe);
    }
  };

  const handleSelectQuickFood = (quickFood: QuickFood) => {
    if (onSelectQuickFood && slotId) {
      onSelectQuickFood(quickFood);
      onClose();
    } else {
      setSelectedQuickFood(quickFood);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
      onClick={onClose}
    >
      <div
        className="relative flex h-full w-full max-w-6xl flex-col rounded-3xl bg-zinc-900 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-zinc-800 p-6">
          <div className="flex items-center gap-4">
            <h2 className="text-2xl font-semibold text-zinc-100">
              Arsenal ⚔️
            </h2>
            {slotId && (
              <span className="rounded-full bg-emerald-500/10 px-3 py-1 text-xs text-emerald-300">
                Selecionando para refeição
              </span>
            )}
          </div>
          <div className="flex items-center gap-3">
            <div className="flex gap-2">
              <button
                onClick={() => setShowRecipeForm(true)}
                className="rounded-full bg-emerald-500/20 px-4 py-2 text-sm font-medium text-emerald-300 hover:bg-emerald-500/30 transition-colors"
              >
                🍽️ Nova Receita
              </button>
              <button
                onClick={() => setShowQuickFoodForm(true)}
                className="rounded-full bg-blue-500/20 px-4 py-2 text-sm font-medium text-blue-300 hover:bg-blue-500/30 transition-colors"
              >
                🍫 Nova Comida
              </button>
            </div>
            <button
              onClick={onClose}
              className="rounded-full p-2 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100 transition-colors"
              title="Fechar"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b border-zinc-800 px-6">
          <div className="flex gap-2">
            <button
              onClick={() => setActiveTab("all")}
              className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 ${
                activeTab === "all"
                  ? "border-emerald-400 text-emerald-300"
                  : "border-transparent text-zinc-400 hover:text-zinc-300"
              }`}
            >
              Todos ({filteredRecipes.length + filteredQuickFoods.length})
            </button>
            <button
              onClick={() => setActiveTab("recipes")}
              className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 ${
                activeTab === "recipes"
                  ? "border-emerald-400 text-emerald-300"
                  : "border-transparent text-zinc-400 hover:text-zinc-300"
              }`}
            >
              🍽️ Receitas ({filteredRecipes.length})
            </button>
            <button
              onClick={() => setActiveTab("quickfoods")}
              className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 ${
                activeTab === "quickfoods"
                  ? "border-blue-400 text-blue-300"
                  : "border-transparent text-zinc-400 hover:text-zinc-300"
              }`}
            >
              🍫 Comidas Prontas ({filteredQuickFoods.length})
            </button>
          </div>
        </div>

        {/* Barra de busca */}
        <div className="border-b border-zinc-800 p-4">
          <div className="relative">
            <input
              type="text"
              placeholder="Buscar receitas por nome, ingrediente ou tag..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-2xl border border-zinc-700 bg-zinc-950/60 px-4 py-3 pl-10 text-sm text-zinc-100 placeholder:text-zinc-500 focus:border-emerald-500/50 focus:outline-none"
            />
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500">
              🔍
            </span>
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {/* Conteúdo */}
        <div className="flex flex-1 overflow-hidden">
          {/* Grid de receitas e comidas prontas */}
          <div className="flex-1 overflow-y-auto p-6">
            {getFilteredItems().length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <div className="mb-4 text-6xl">📚</div>
                <h3 className="mb-2 text-lg font-semibold text-zinc-100">
                  {searchQuery
                    ? "Nenhum item encontrado"
                    : activeTab === "recipes"
                    ? "Nenhuma receita ainda"
                    : activeTab === "quickfoods"
                    ? "Nenhuma comida pronta ainda"
                    : "Nenhum item ainda"}
                </h3>
                <p className="mb-6 text-sm text-zinc-400">
                  {searchQuery
                    ? "Tente buscar com outros termos"
                    : activeTab === "recipes"
                    ? "Comece adicionando sua primeira receita"
                    : activeTab === "quickfoods"
                    ? "Comece adicionando sua primeira comida pronta"
                    : "Comece adicionando receitas ou comidas prontas"}
                </p>
                {!searchQuery && (
                  <div className="flex gap-2">
                    <button
                      onClick={() => setShowRecipeForm(true)}
                      className="rounded-full bg-emerald-500/20 px-4 py-2 text-sm font-medium text-emerald-300 hover:bg-emerald-500/30 transition-colors"
                    >
                      🍽️ Nova Receita
                    </button>
                    <button
                      onClick={() => setShowQuickFoodForm(true)}
                      className="rounded-full bg-blue-500/20 px-4 py-2 text-sm font-medium text-blue-300 hover:bg-blue-500/30 transition-colors"
                    >
                      🍫 Nova Comida
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {activeTab === "all" && (
                  <>
                    {filteredRecipes.map((recipe) => (
                      <RecipeCard
                        key={recipe.id}
                        recipe={recipe}
                        onSelect={() => handleSelectRecipe(recipe)}
                        onEdit={() => setSelectedRecipe(recipe)}
                        onDelete={() => handleDeleteRecipe(recipe.id)}
                        selectable={!!slotId}
                      />
                    ))}
                    {filteredQuickFoods.map((quickFood) => (
                      <QuickFoodCard
                        key={quickFood.id}
                        quickFood={quickFood}
                        onSelect={() => handleSelectQuickFood(quickFood)}
                        onEdit={() => setSelectedQuickFood(quickFood)}
                        onDelete={() => handleDeleteQuickFood(quickFood.id)}
                        selectable={!!slotId}
                      />
                    ))}
                  </>
                )}
                {activeTab === "recipes" &&
                  filteredRecipes.map((recipe) => (
                    <RecipeCard
                      key={recipe.id}
                      recipe={recipe}
                      onSelect={() => handleSelectRecipe(recipe)}
                      onEdit={() => setSelectedRecipe(recipe)}
                      onDelete={() => handleDeleteRecipe(recipe.id)}
                      selectable={!!slotId}
                    />
                  ))}
                {activeTab === "quickfoods" &&
                  filteredQuickFoods.map((quickFood) => (
                    <QuickFoodCard
                      key={quickFood.id}
                      quickFood={quickFood}
                      onSelect={() => handleSelectQuickFood(quickFood)}
                      onEdit={() => setSelectedQuickFood(quickFood)}
                      onDelete={() => handleDeleteQuickFood(quickFood.id)}
                      selectable={!!slotId}
                    />
                  ))}
              </div>
            )}
          </div>
        </div>

        {/* Formulários */}
        {showRecipeForm && (
          <RecipeForm
            recipe={null}
            onSave={handleSaveRecipe}
            onCancel={() => setShowRecipeForm(false)}
          />
        )}

        {showQuickFoodForm && (
          <QuickFoodForm
            quickFood={null}
            onSave={handleSaveQuickFood}
            onCancel={() => setShowQuickFoodForm(false)}
          />
        )}

        {/* Visualização/Edição */}
        {selectedRecipe && !showRecipeForm && (
          <RecipeForm
            recipe={selectedRecipe}
            onSave={handleUpdateRecipe}
            onCancel={() => setSelectedRecipe(null)}
          />
        )}

        {selectedQuickFood && !showQuickFoodForm && (
          <QuickFoodForm
            quickFood={selectedQuickFood}
            onSave={handleUpdateQuickFood}
            onCancel={() => setSelectedQuickFood(null)}
          />
        )}
      </div>
    </div>
  );
}

