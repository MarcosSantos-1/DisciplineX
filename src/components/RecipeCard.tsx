"use client";

import { Recipe } from "@/types/meals";

interface RecipeCardProps {
  recipe: Recipe;
  onSelect: () => void;
  onEdit: () => void;
  onDelete: () => void;
  selectable?: boolean;
}

export function RecipeCard({
  recipe,
  onSelect,
  onEdit,
  onDelete,
  selectable = false,
}: RecipeCardProps) {
  return (
    <div
      className={`group relative overflow-hidden rounded-2xl bg-zinc-950/60 transition-all hover:bg-zinc-900/80 ${
        selectable ? "cursor-pointer" : ""
      }`}
      onClick={selectable ? onSelect : undefined}
    >
      {/* Imagem */}
      <div className="relative h-48 w-full overflow-hidden bg-zinc-800">
        {recipe.image ? (
          <img
            src={recipe.image}
            alt={recipe.name}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-6xl text-zinc-700">
            🍽️
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-zinc-900/80 to-transparent" />
        
        {/* Badge de calorias */}
        <div className="absolute top-2 right-2 rounded-full bg-emerald-500/20 px-2 py-1 text-xs font-semibold text-emerald-300">
          {recipe.totalCalories} kcal
        </div>
      </div>

      {/* Conteúdo */}
      <div className="p-4">
        <h3 className="mb-1 text-base font-semibold text-zinc-100">
          {recipe.name}
        </h3>
        {recipe.description && (
          <p className="mb-3 line-clamp-2 text-xs text-zinc-400">
            {recipe.description}
          </p>
        )}

        {/* Macros */}
        <div className="mb-3 flex gap-2 text-xs">
          <span className="rounded-full bg-red-500/10 px-2 py-1 text-red-300">
            🥩 {recipe.protein}g
          </span>
          <span className="rounded-full bg-blue-500/10 px-2 py-1 text-blue-300">
            🍚 {recipe.carbs}g
          </span>
          <span className="rounded-full bg-yellow-500/10 px-2 py-1 text-yellow-300">
            🧈 {recipe.fat}g
          </span>
        </div>

        {/* Tempo e tags */}
        <div className="flex items-center justify-between">
          <span className="text-xs text-zinc-500">
            ⏱️ {recipe.prepTime} min
          </span>
          {recipe.tags && recipe.tags.length > 0 && (
            <div className="flex gap-1">
              {recipe.tags.slice(0, 2).map((tag, idx) => (
                <span
                  key={idx}
                  className="rounded-full bg-zinc-800 px-2 py-0.5 text-[10px] text-zinc-400"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Ações (hover) */}
      {!selectable && (
        <div className="absolute right-2 top-2 flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onEdit();
            }}
            className="rounded-full bg-zinc-800/90 p-1.5 text-zinc-300 hover:bg-emerald-500/20 hover:text-emerald-300"
            title="Editar"
          >
            ✏️
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              if (confirm("Tem certeza que deseja excluir esta receita?")) {
                onDelete();
              }
            }}
            className="rounded-full bg-zinc-800/90 p-1.5 text-zinc-300 hover:bg-red-500/20 hover:text-red-300"
            title="Excluir"
          >
            🗑️
          </button>
        </div>
      )}

      {selectable && (
        <div className="absolute inset-0 flex items-center justify-center bg-emerald-500/10 opacity-0 transition-opacity group-hover:opacity-100">
          <span className="rounded-full bg-emerald-500/20 px-4 py-2 text-sm font-medium text-emerald-300">
            Selecionar
          </span>
        </div>
      )}
    </div>
  );
}

