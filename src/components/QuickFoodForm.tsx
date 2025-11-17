"use client";

import { useState, useEffect } from "react";
import { QuickFood } from "@/types/meals";

interface QuickFoodFormProps {
  quickFood: QuickFood | null; // null = nova comida
  onSave: (quickFood: QuickFood) => void;
  onCancel: () => void;
}

export function QuickFoodForm({ quickFood, onSave, onCancel }: QuickFoodFormProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [image, setImage] = useState("");
  const [brand, setBrand] = useState("");
  const [servingSize, setServingSize] = useState("");
  const [totalCalories, setTotalCalories] = useState(0);
  const [protein, setProtein] = useState(0);
  const [carbs, setCarbs] = useState(0);
  const [fat, setFat] = useState(0);
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");

  useEffect(() => {
    if (quickFood) {
      setName(quickFood.name);
      setDescription(quickFood.description || "");
      setImage(quickFood.image || "");
      setBrand(quickFood.brand || "");
      setServingSize(quickFood.servingSize || "");
      setTotalCalories(quickFood.totalCalories);
      setProtein(quickFood.protein);
      setCarbs(quickFood.carbs);
      setFat(quickFood.fat);
      setTags(quickFood.tags || []);
    } else {
      // Reset para nova comida
      setName("");
      setDescription("");
      setImage("");
      setBrand("");
      setServingSize("");
      setTotalCalories(0);
      setProtein(0);
      setCarbs(0);
      setFat(0);
      setTags([]);
    }
  }, [quickFood]);

  const handleAddTag = () => {
    if (!tagInput.trim() || tags.includes(tagInput.trim())) return;
    setTags([...tags, tagInput.trim()]);
    setTagInput("");
  };

  const handleRemoveTag = (tag: string) => {
    setTags(tags.filter((t) => t !== tag));
  };

  const handleSave = () => {
    if (!name || totalCalories === 0) {
      alert("Preencha pelo menos o nome e as calorias");
      return;
    }

    const newQuickFood: QuickFood = {
      id: quickFood?.id || `quickfood_${Date.now()}`,
      name,
      description,
      image,
      brand,
      servingSize,
      totalCalories,
      protein,
      carbs,
      fat,
      tags,
      type: "quickfood",
      createdAt: quickFood?.createdAt || new Date().toISOString(),
    };

    onSave(newQuickFood);
  };

  return (
    <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/90 p-4">
      <div className="flex h-full w-full max-w-4xl flex-col overflow-hidden rounded-3xl bg-zinc-900">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-zinc-800 p-6">
          <h2 className="text-xl font-semibold text-zinc-100">
            {quickFood ? "Editar Comida Pronta" : "Nova Comida Pronta"}
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
                <label className="mb-2 flex items-center gap-2 text-sm font-medium text-zinc-300">
                  <span>🍫</span>
                  <span>Nome da Comida *</span>
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full rounded-xl border border-zinc-700 bg-zinc-950/60 px-4 py-2 text-sm text-zinc-100 focus:border-emerald-500/50 focus:outline-none"
                  placeholder="Ex: Barrinha de Cereal"
                />
              </div>
              <div>
                <label className="mb-2 flex items-center gap-2 text-sm font-medium text-zinc-300">
                  <span>🏢</span>
                  <span>Marca (opcional)</span>
                </label>
                <input
                  type="text"
                  value={brand}
                  onChange={(e) => setBrand(e.target.value)}
                  className="w-full rounded-xl border border-zinc-700 bg-zinc-950/60 px-4 py-2 text-sm text-zinc-100 focus:border-emerald-500/50 focus:outline-none"
                  placeholder="Ex: Nestlé"
                />
              </div>
            </div>

            <div>
              <label className="mb-2 flex items-center gap-2 text-sm font-medium text-zinc-300">
                <span>📝</span>
                <span>Descrição</span>
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={2}
                className="w-full rounded-xl border border-zinc-700 bg-zinc-950/60 px-4 py-2 text-sm text-zinc-100 focus:border-emerald-500/50 focus:outline-none"
                placeholder="Uma breve descrição..."
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="mb-2 flex items-center gap-2 text-sm font-medium text-zinc-300">
                  <span>📏</span>
                  <span>Porção</span>
                </label>
                <input
                  type="text"
                  value={servingSize}
                  onChange={(e) => setServingSize(e.target.value)}
                  className="w-full rounded-xl border border-zinc-700 bg-zinc-950/60 px-4 py-2 text-sm text-zinc-100 focus:border-emerald-500/50 focus:outline-none"
                  placeholder="Ex: 1 unidade, 30g"
                />
              </div>
              <div>
                <label className="mb-2 flex items-center gap-2 text-sm font-medium text-zinc-300">
                  <span>🖼️</span>
                  <span>Imagem</span>
                </label>
                <div className="space-y-2">
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setImage("")}
                      className={`rounded-xl border px-4 py-2 text-sm font-medium transition-colors ${
                        !image || image.startsWith("http")
                          ? "border-emerald-500/50 bg-emerald-500/10 text-emerald-300"
                          : "border-zinc-700 bg-zinc-950/60 text-zinc-400 hover:border-zinc-600"
                      }`}
                    >
                      🔗 URL
                    </button>
                    <button
                      type="button"
                      disabled
                      className="rounded-xl border border-zinc-700 bg-zinc-950/60 px-4 py-2 text-sm font-medium text-zinc-500 opacity-50 cursor-not-allowed"
                      title="Em breve: upload de imagens"
                    >
                      📤 Upload (em breve)
                    </button>
                  </div>
                  <input
                    type="url"
                    value={image}
                    onChange={(e) => setImage(e.target.value)}
                    className="w-full rounded-xl border border-zinc-700 bg-zinc-950/60 px-4 py-2 text-sm text-zinc-100 focus:border-emerald-500/50 focus:outline-none"
                    placeholder="https://exemplo.com/imagem.jpg"
                  />
                  {image && (
                    <div className="mt-2 rounded-xl overflow-hidden border border-zinc-700">
                      <img
                        src={image}
                        alt="Preview"
                        className="w-full h-32 object-cover"
                        onError={(e) => {
                          e.currentTarget.style.display = "none";
                        }}
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Informações nutricionais */}
            <div>
              <label className="mb-2 flex items-center gap-2 text-sm font-medium text-zinc-300">
                <span>📊</span>
                <span>Informações Nutricionais *</span>
              </label>
              <div className="grid gap-4 md:grid-cols-4">
                <div>
                  <label className="mb-1 block text-xs text-zinc-400">🔥 Calorias</label>
                  <input
                    type="number"
                    value={totalCalories}
                    onChange={(e) => setTotalCalories(Number(e.target.value))}
                    className="w-full rounded-xl border border-zinc-700 bg-zinc-950/60 px-3 py-2 text-sm text-zinc-100 focus:border-emerald-500/50 focus:outline-none"
                    placeholder="0"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs text-zinc-400">🥩 Proteína (g)</label>
                  <input
                    type="number"
                    value={protein}
                    onChange={(e) => setProtein(Number(e.target.value))}
                    className="w-full rounded-xl border border-zinc-700 bg-zinc-950/60 px-3 py-2 text-sm text-zinc-100 focus:border-emerald-500/50 focus:outline-none"
                    placeholder="0"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs text-zinc-400">🍚 Carboidratos (g)</label>
                  <input
                    type="number"
                    value={carbs}
                    onChange={(e) => setCarbs(Number(e.target.value))}
                    className="w-full rounded-xl border border-zinc-700 bg-zinc-950/60 px-3 py-2 text-sm text-zinc-100 focus:border-emerald-500/50 focus:outline-none"
                    placeholder="0"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs text-zinc-400">🧈 Gorduras (g)</label>
                  <input
                    type="number"
                    value={fat}
                    onChange={(e) => setFat(Number(e.target.value))}
                    className="w-full rounded-xl border border-zinc-700 bg-zinc-950/60 px-3 py-2 text-sm text-zinc-100 focus:border-emerald-500/50 focus:outline-none"
                    placeholder="0"
                  />
                </div>
              </div>
            </div>

            {/* Tags */}
            <div>
              <label className="mb-2 flex items-center gap-2 text-sm font-medium text-zinc-300">
                <span>🏷️</span>
                <span>Tags</span>
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

            {/* Resumo */}
            <div className="rounded-xl bg-gradient-to-br from-zinc-950/80 to-zinc-900/60 border border-zinc-800 p-4">
              <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-zinc-300">
                <span>📊</span>
                <span>Resumo Nutricional</span>
              </h3>
              <div className="grid grid-cols-4 gap-4">
                <div className="text-center rounded-xl bg-zinc-900/60 p-3">
                  <p className="text-xs text-zinc-400 mb-1">🔥 Calorias</p>
                  <p className="text-lg font-semibold text-emerald-300">
                    {totalCalories}
                  </p>
                  <p className="text-[10px] text-zinc-500 mt-0.5">kcal</p>
                </div>
                <div className="text-center rounded-xl bg-zinc-900/60 p-3">
                  <p className="text-xs text-zinc-400 mb-1">🥩 Proteína</p>
                  <p className="text-lg font-semibold text-red-300">
                    {protein}g
                  </p>
                  <p className="text-[10px] text-zinc-500 mt-0.5">gramas</p>
                </div>
                <div className="text-center rounded-xl bg-zinc-900/60 p-3">
                  <p className="text-xs text-zinc-400 mb-1">🍚 Carboidratos</p>
                  <p className="text-lg font-semibold text-blue-300">
                    {carbs}g
                  </p>
                  <p className="text-[10px] text-zinc-500 mt-0.5">gramas</p>
                </div>
                <div className="text-center rounded-xl bg-zinc-900/60 p-3">
                  <p className="text-xs text-zinc-400 mb-1">🧈 Gorduras</p>
                  <p className="text-lg font-semibold text-yellow-300">
                    {fat}g
                  </p>
                  <p className="text-[10px] text-zinc-500 mt-0.5">gramas</p>
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
            {quickFood ? "Salvar Alterações" : "Criar Comida"}
          </button>
        </div>
      </div>
    </div>
  );
}

