"use client";

import { useState, useEffect } from "react";
import { Recipe, MealItem } from "@/types/meals";

interface RecipeFormProps {
  recipe: Recipe | null; // null = nova receita
  onSave: (recipe: Recipe) => void;
  onCancel: () => void;
}

export function RecipeForm({ recipe, onSave, onCancel }: RecipeFormProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [image, setImage] = useState("");
  const [prepTime, setPrepTime] = useState(30);
  const [ingredients, setIngredients] = useState<MealItem[]>([]);
  const [instructions, setInstructions] = useState<string[]>([]);
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");

  // Macros calculados
  const [totalCalories, setTotalCalories] = useState(0);
  const [protein, setProtein] = useState(0);
  const [carbs, setCarbs] = useState(0);
  const [fat, setFat] = useState(0);

  // Armazenar macros por ingrediente
  const [ingredientMacros, setIngredientMacros] = useState<
    Record<number, { protein: number; carbs: number; fat: number }>
  >({});

  // Campos de ingrediente
  const [ingredientName, setIngredientName] = useState("");
  const [ingredientQuantity, setIngredientQuantity] = useState("");
  const [ingredientCalories, setIngredientCalories] = useState(0);
  const [ingredientProtein, setIngredientProtein] = useState(0);
  const [ingredientCarbs, setIngredientCarbs] = useState(0);
  const [ingredientFat, setIngredientFat] = useState(0);

  // Campos de instrução
  const [instructionInput, setInstructionInput] = useState("");

  useEffect(() => {
    if (recipe) {
      setName(recipe.name);
      setDescription(recipe.description || "");
      setImage(recipe.image || "");
      setPrepTime(recipe.prepTime);
      setIngredients(recipe.ingredients);
      setInstructions(recipe.instructions);
      setTags(recipe.tags || []);
      setTotalCalories(recipe.totalCalories);
      setProtein(recipe.protein);
      setCarbs(recipe.carbs);
      setFat(recipe.fat);
      
      // Inicializar macros dos ingredientes (se não tiver, usar valores zerados)
      const macros: Record<number, { protein: number; carbs: number; fat: number }> = {};
      recipe.ingredients.forEach((_, idx) => {
        // Distribuir macros proporcionalmente entre ingredientes
        // (simplificado - em produção você teria macros por ingrediente)
        macros[idx] = {
          protein: recipe.protein / recipe.ingredients.length,
          carbs: recipe.carbs / recipe.ingredients.length,
          fat: recipe.fat / recipe.ingredients.length,
        };
      });
      setIngredientMacros(macros);
    } else {
      // Reset para nova receita
      setName("");
      setDescription("");
      setImage("");
      setPrepTime(30);
      setIngredients([]);
      setInstructions([]);
      setTags([]);
      setTotalCalories(0);
      setProtein(0);
      setCarbs(0);
      setFat(0);
      setIngredientMacros({});
    }
  }, [recipe]);

  // Calcular macros quando ingredientes mudam
  useEffect(() => {
    const total = ingredients.reduce((sum, ing) => sum + ing.calories, 0);
    const totalProtein = Object.values(ingredientMacros).reduce(
      (sum, macros) => sum + macros.protein,
      0
    );
    const totalCarbs = Object.values(ingredientMacros).reduce(
      (sum, macros) => sum + macros.carbs,
      0
    );
    const totalFat = Object.values(ingredientMacros).reduce(
      (sum, macros) => sum + macros.fat,
      0
    );
    setTotalCalories(total);
    setProtein(totalProtein);
    setCarbs(totalCarbs);
    setFat(totalFat);
  }, [ingredients, ingredientMacros]);

  const handleAddIngredient = () => {
    if (!ingredientName || !ingredientQuantity) return;

    const newIngredient: MealItem = {
      name: ingredientName,
      quantity: ingredientQuantity,
      calories: ingredientCalories,
    };

    const newIndex = ingredients.length;
    setIngredients([...ingredients, newIngredient]);
    setIngredientMacros({
      ...ingredientMacros,
      [newIndex]: {
        protein: ingredientProtein,
        carbs: ingredientCarbs,
        fat: ingredientFat,
      },
    });

    // Reset campos
    setIngredientName("");
    setIngredientQuantity("");
    setIngredientCalories(0);
    setIngredientProtein(0);
    setIngredientCarbs(0);
    setIngredientFat(0);
  };

  const handleRemoveIngredient = (index: number) => {
    setIngredients(ingredients.filter((_, i) => i !== index));
    // Reindexar macros
    const newMacros: Record<number, { protein: number; carbs: number; fat: number }> = {};
    ingredients.forEach((_, i) => {
      if (i < index) {
        newMacros[i] = ingredientMacros[i];
      } else if (i > index) {
        newMacros[i - 1] = ingredientMacros[i];
      }
    });
    setIngredientMacros(newMacros);
  };

  const handleAddInstruction = () => {
    if (!instructionInput.trim()) return;
    setInstructions([...instructions, instructionInput.trim()]);
    setInstructionInput("");
  };

  const handleRemoveInstruction = (index: number) => {
    setInstructions(instructions.filter((_, i) => i !== index));
  };

  const handleAddTag = () => {
    if (!tagInput.trim() || tags.includes(tagInput.trim())) return;
    setTags([...tags, tagInput.trim()]);
    setTagInput("");
  };

  const handleRemoveTag = (tag: string) => {
    setTags(tags.filter((t) => t !== tag));
  };

  const handleSave = () => {
    if (!name || ingredients.length === 0) {
      alert("Preencha pelo menos o nome e adicione ingredientes");
      return;
    }

    const newRecipe: Recipe = {
      id: recipe?.id || `recipe_${Date.now()}`,
      name,
      description,
      image,
      ingredients,
      instructions,
      prepTime,
      totalCalories,
      protein,
      carbs,
      fat,
      tags,
      createdAt: recipe?.createdAt || new Date().toISOString(),
    };

    onSave(newRecipe);
  };

  return (
    <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/90 p-4">
      <div className="flex h-full w-full max-w-4xl flex-col overflow-hidden rounded-3xl bg-zinc-900">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-zinc-800 p-6">
          <h2 className="text-xl font-semibold text-zinc-100">
            {recipe ? "Editar Receita" : "Nova Receita"}
          </h2>
          <button
            onClick={onCancel}
            className="rounded-full p-2 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100"
          >
            ✕
          </button>
        </div>

        {/* Conteúdo */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="space-y-6">
            {/* Informações básicas */}
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-medium text-zinc-300">
                  Nome da Receita *
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full rounded-xl border border-zinc-700 bg-zinc-950/60 px-4 py-2 text-sm text-zinc-100 focus:border-emerald-500/50 focus:outline-none"
                  placeholder="Ex: Frango Grelhado com Batata Doce"
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-zinc-300">
                  Tempo de Preparo (min)
                </label>
                <input
                  type="number"
                  value={prepTime}
                  onChange={(e) => setPrepTime(Number(e.target.value))}
                  className="w-full rounded-xl border border-zinc-700 bg-zinc-950/60 px-4 py-2 text-sm text-zinc-100 focus:border-emerald-500/50 focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-zinc-300">
                Descrição
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={2}
                className="w-full rounded-xl border border-zinc-700 bg-zinc-950/60 px-4 py-2 text-sm text-zinc-100 focus:border-emerald-500/50 focus:outline-none"
                placeholder="Uma breve descrição da receita..."
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-zinc-300">
                URL da Imagem
              </label>
              <input
                type="url"
                value={image}
                onChange={(e) => setImage(e.target.value)}
                className="w-full rounded-xl border border-zinc-700 bg-zinc-950/60 px-4 py-2 text-sm text-zinc-100 focus:border-emerald-500/50 focus:outline-none"
                placeholder="https://exemplo.com/imagem.jpg"
              />
            </div>

            {/* Ingredientes */}
            <div>
              <label className="mb-2 block text-sm font-medium text-zinc-300">
                Ingredientes *
              </label>
              <div className="space-y-2">
                {ingredients.map((ing, idx) => (
                  <div
                    key={idx}
                    className="flex items-center gap-2 rounded-xl bg-zinc-950/60 p-2"
                  >
                    <span className="flex-1 text-sm text-zinc-300">
                      {ing.name} ({ing.quantity}) - {ing.calories} kcal
                    </span>
                    <button
                      onClick={() => handleRemoveIngredient(idx)}
                      className="text-red-400 hover:text-red-300"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
              <div className="mt-3 grid gap-2 md:grid-cols-4">
                <input
                  type="text"
                  value={ingredientName}
                  onChange={(e) => setIngredientName(e.target.value)}
                  placeholder="Nome"
                  className="rounded-xl border border-zinc-700 bg-zinc-950/60 px-3 py-2 text-xs text-zinc-100 focus:border-emerald-500/50 focus:outline-none"
                />
                <input
                  type="text"
                  value={ingredientQuantity}
                  onChange={(e) => setIngredientQuantity(e.target.value)}
                  placeholder="Quantidade"
                  className="rounded-xl border border-zinc-700 bg-zinc-950/60 px-3 py-2 text-xs text-zinc-100 focus:border-emerald-500/50 focus:outline-none"
                />
                <input
                  type="number"
                  value={ingredientCalories}
                  onChange={(e) => setIngredientCalories(Number(e.target.value))}
                  placeholder="Calorias"
                  className="rounded-xl border border-zinc-700 bg-zinc-950/60 px-3 py-2 text-xs text-zinc-100 focus:border-emerald-500/50 focus:outline-none"
                />
                <button
                  onClick={handleAddIngredient}
                  className="rounded-xl bg-emerald-500/20 px-3 py-2 text-xs font-medium text-emerald-300 hover:bg-emerald-500/30"
                >
                  + Adicionar
                </button>
              </div>
              <div className="mt-2 grid gap-2 md:grid-cols-3">
                <input
                  type="number"
                  value={ingredientProtein}
                  onChange={(e) => setIngredientProtein(Number(e.target.value))}
                  placeholder="Proteína (g)"
                  className="rounded-xl border border-zinc-700 bg-zinc-950/60 px-3 py-2 text-xs text-zinc-100 focus:border-emerald-500/50 focus:outline-none"
                />
                <input
                  type="number"
                  value={ingredientCarbs}
                  onChange={(e) => setIngredientCarbs(Number(e.target.value))}
                  placeholder="Carboidratos (g)"
                  className="rounded-xl border border-zinc-700 bg-zinc-950/60 px-3 py-2 text-xs text-zinc-100 focus:border-emerald-500/50 focus:outline-none"
                />
                <input
                  type="number"
                  value={ingredientFat}
                  onChange={(e) => setIngredientFat(Number(e.target.value))}
                  placeholder="Gorduras (g)"
                  className="rounded-xl border border-zinc-700 bg-zinc-950/60 px-3 py-2 text-xs text-zinc-100 focus:border-emerald-500/50 focus:outline-none"
                />
              </div>
            </div>

            {/* Modo de preparo */}
            <div>
              <label className="mb-2 block text-sm font-medium text-zinc-300">
                Modo de Preparo
              </label>
              <div className="space-y-2">
                {instructions.map((inst, idx) => (
                  <div
                    key={idx}
                    className="flex items-start gap-2 rounded-xl bg-zinc-950/60 p-3"
                  >
                    <span className="flex-shrink-0 text-sm font-semibold text-emerald-400">
                      {idx + 1}.
                    </span>
                    <span className="flex-1 text-sm text-zinc-300">{inst}</span>
                    <button
                      onClick={() => handleRemoveInstruction(idx)}
                      className="text-red-400 hover:text-red-300"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
              <div className="mt-3 flex gap-2">
                <input
                  type="text"
                  value={instructionInput}
                  onChange={(e) => setInstructionInput(e.target.value)}
                  onKeyPress={(e) => e.key === "Enter" && handleAddInstruction()}
                  placeholder="Adicionar passo..."
                  className="flex-1 rounded-xl border border-zinc-700 bg-zinc-950/60 px-4 py-2 text-sm text-zinc-100 focus:border-emerald-500/50 focus:outline-none"
                />
                <button
                  onClick={handleAddInstruction}
                  className="rounded-xl bg-emerald-500/20 px-4 py-2 text-sm font-medium text-emerald-300 hover:bg-emerald-500/30"
                >
                  + Adicionar
                </button>
              </div>
            </div>

            {/* Tags */}
            <div>
              <label className="mb-2 block text-sm font-medium text-zinc-300">
                Tags
              </label>
              <div className="mb-2 flex flex-wrap gap-2">
                {tags.map((tag) => (
                  <span
                    key={tag}
                    className="flex items-center gap-1 rounded-full bg-emerald-500/10 px-3 py-1 text-xs text-emerald-300"
                  >
                    {tag}
                    <button
                      onClick={() => handleRemoveTag(tag)}
                      className="hover:text-emerald-200"
                    >
                      ✕
                    </button>
                  </span>
                ))}
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyPress={(e) => e.key === "Enter" && handleAddTag()}
                  placeholder="Adicionar tag..."
                  className="flex-1 rounded-xl border border-zinc-700 bg-zinc-950/60 px-4 py-2 text-sm text-zinc-100 focus:border-emerald-500/50 focus:outline-none"
                />
                <button
                  onClick={handleAddTag}
                  className="rounded-xl bg-emerald-500/20 px-4 py-2 text-sm font-medium text-emerald-300 hover:bg-emerald-500/30"
                >
                  + Adicionar
                </button>
              </div>
            </div>

            {/* Resumo de macros */}
            <div className="rounded-xl bg-zinc-950/60 p-4">
              <h3 className="mb-3 text-sm font-semibold text-zinc-300">
                Resumo Nutricional
              </h3>
              <div className="grid grid-cols-4 gap-4">
                <div className="text-center">
                  <p className="text-xs text-zinc-400">Calorias</p>
                  <p className="mt-1 text-lg font-semibold text-emerald-300">
                    {totalCalories}
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-xs text-zinc-400">Proteína</p>
                  <p className="mt-1 text-lg font-semibold text-red-300">
                    {protein}g
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-xs text-zinc-400">Carboidratos</p>
                  <p className="mt-1 text-lg font-semibold text-blue-300">
                    {carbs}g
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-xs text-zinc-400">Gorduras</p>
                  <p className="mt-1 text-lg font-semibold text-yellow-300">
                    {fat}g
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 border-t border-zinc-800 p-6">
          <button
            onClick={onCancel}
            className="rounded-xl border border-zinc-700 px-6 py-2 text-sm font-medium text-zinc-300 hover:bg-zinc-800"
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            className="rounded-xl bg-emerald-500/20 px-6 py-2 text-sm font-medium text-emerald-300 hover:bg-emerald-500/30"
          >
            {recipe ? "Salvar Alterações" : "Criar Receita"}
          </button>
        </div>
      </div>
    </div>
  );
}

