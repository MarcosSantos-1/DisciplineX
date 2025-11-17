"use client";

import { useState } from "react";
import { ChecklistItem } from "@/types/meals";

interface AddSpecialCheckModalProps {
  date: Date;
  onClose: () => void;
  onAdd: (item: ChecklistItem) => void;
}

export function AddSpecialCheckModal({
  date,
  onClose,
  onAdd,
}: AddSpecialCheckModalProps) {
  const [label, setLabel] = useState("");

  const handleAdd = () => {
    if (!label.trim()) {
      alert("Digite um nome para a missão especial");
      return;
    }

    const dateKey = date.toISOString().split("T")[0];
    const newItem: ChecklistItem = {
      id: `special_${dateKey}_${Date.now()}`,
      label: label.trim(),
      isSpecial: true,
      weight: 0, // Será calculado automaticamente
      date: dateKey,
    };

    // Carregar checks especiais existentes do dia
    const saved = localStorage.getItem(`special_checks_${dateKey}`);
    let existingItems: ChecklistItem[] = [];
    if (saved) {
      try {
        existingItems = JSON.parse(saved);
      } catch (e) {
        console.error("Erro ao carregar checks especiais:", e);
      }
    }

    // Adicionar novo item
    existingItems.push(newItem);
    localStorage.setItem(
      `special_checks_${dateKey}`,
      JSON.stringify(existingItems)
    );

    onAdd(newItem);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-md rounded-3xl bg-zinc-900 p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-zinc-100">
              Adicionar Missão Especial
            </h3>
            <p className="mt-1 text-sm text-zinc-400">
              {date.toLocaleDateString("pt-BR", {
                weekday: "long",
                day: "numeric",
                month: "long",
              })}
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-full p-2 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100 transition-colors"
          >
            ✕
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="mb-2 block text-sm font-medium text-zinc-300">
              Nome da missão
            </label>
            <input
              type="text"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="Ex: Fazer marmitas"
              className="w-full rounded-xl border border-zinc-700 bg-zinc-950/60 px-4 py-3 text-sm text-zinc-100 focus:border-jagger-500/50 focus:outline-none"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === "Enter") handleAdd();
              }}
            />
          </div>

          <div className="rounded-xl bg-jagger-500/10 border border-jagger-400/30 p-3">
            <p className="text-xs text-jagger-300 flex items-center gap-2">
              <span>⭐</span>
              <span>
                Esta missão aparecerá apenas neste dia e terá peso no score
                calculado automaticamente.
              </span>
            </p>
          </div>

          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 rounded-xl border border-zinc-700 px-4 py-3 text-sm font-medium text-zinc-300 hover:bg-zinc-800 transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={handleAdd}
              disabled={!label.trim()}
              className="flex-1 rounded-xl bg-jagger-500/20 px-4 py-3 text-sm font-medium text-jagger-300 hover:bg-jagger-500/30 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Adicionar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

