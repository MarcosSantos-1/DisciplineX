"use client";

import { useState, useEffect } from "react";
import { Recipe, MealOption } from "@/types/meals";
import { RecipeForm } from "./RecipeForm";
import { RecipeCard } from "./RecipeCard";

interface RecipeLibraryProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectRecipe?: (recipe: Recipe) => void; // Para usar como opção em um slot
  slotId?: string; // ID do slot para o qual estamos selecionando
}

export function RecipeLibrary({
  isOpen,
  onClose,
  onSelectRecipe,
  slotId,
}: RecipeLibraryProps) {
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);

  // Carregar receitas do localStorage
  useEffect(() => {
    if (isOpen) {
      const saved = localStorage.getItem("recipe_library");
      if (saved) {
        try {
          setRecipes(JSON.parse(saved));
        } catch (e) {
          console.error("Erro ao carregar receitas:", e);
        }
      }
    }
  }, [isOpen]);

  // Filtrar receitas por busca
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

  const handleSaveRecipe = (recipe: Recipe) => {
    const updated = [...recipes, recipe];
    setRecipes(updated);
    localStorage.setItem("recipe_library", JSON.stringify(updated));
    setShowForm(false);
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

  const handleSelectRecipe = (recipe: Recipe) => {
    if (onSelectRecipe && slotId) {
      // Converter receita para MealOption e adicionar ao slot
      onSelectRecipe(recipe);
      onClose();
    } else {
      // Apenas visualizar receita
      setSelectedRecipe(recipe);
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
          <div>
            <h2 className="text-2xl font-semibold text-zinc-100">
              Arsenal de Receitas ⚔️
            </h2>
            <p className="mt-1 text-sm text-zinc-400">
              Sua biblioteca pessoal de receitas
            </p>
          </div>
          <div className="flex items-center gap-3">
            {slotId && (
              <span className="rounded-full bg-emerald-500/10 px-3 py-1 text-xs text-emerald-300">
                Selecionando para refeição
              </span>
            )}
            <button
              onClick={() => setShowForm(true)}
              className="rounded-full bg-emerald-500/20 px-4 py-2 text-sm font-medium text-emerald-300 hover:bg-emerald-500/30 transition-colors"
            >
              + Nova Receita
            </button>
            <button
              onClick={onClose}
              className="rounded-full p-2 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100"
            >
              ✕
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
          {/* Grid de receitas */}
          <div className="flex-1 overflow-y-auto p-6">
            {filteredRecipes.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <div className="mb-4 text-6xl">📚</div>
                <h3 className="mb-2 text-lg font-semibold text-zinc-100">
                  {searchQuery
                    ? "Nenhuma receita encontrada"
                    : "Nenhuma receita ainda"}
                </h3>
                <p className="mb-6 text-sm text-zinc-400">
                  {searchQuery
                    ? "Tente buscar com outros termos"
                    : "Comece adicionando sua primeira receita"}
                </p>
                {!searchQuery && (
                  <button
                    onClick={() => setShowForm(true)}
                    className="rounded-full bg-emerald-500/20 px-4 py-2 text-sm font-medium text-emerald-300 hover:bg-emerald-500/30 transition-colors"
                  >
                    + Adicionar Primeira Receita
                  </button>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
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
              </div>
            )}
          </div>
        </div>

        {/* Formulário de receita */}
        {showForm && (
          <RecipeForm
            recipe={null}
            onSave={handleSaveRecipe}
            onCancel={() => setShowForm(false)}
          />
        )}

        {/* Visualização/Edição de receita */}
        {selectedRecipe && !showForm && (
          <RecipeForm
            recipe={selectedRecipe}
            onSave={handleUpdateRecipe}
            onCancel={() => setSelectedRecipe(null)}
          />
        )}
      </div>
    </div>
  );
}

