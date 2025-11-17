"use client";

import { useState, useEffect } from "react";
import { ChecklistItem } from "@/types/meals";

interface ChecklistConfigProps {
  onClose?: () => void;
}

export function ChecklistConfig({ onClose }: ChecklistConfigProps) {
  const [items, setItems] = useState<ChecklistItem[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editLabel, setEditLabel] = useState("");

  useEffect(() => {
    // Carregar checklist padrão
    const saved = localStorage.getItem("default_checklist");
    if (saved) {
      try {
        setItems(JSON.parse(saved));
      } catch (e) {
        console.error("Erro ao carregar checklist:", e);
      }
    } else {
      // Valores padrão
      setItems([
        {
          id: "sleep-8h",
          label: "8h de sono",
          isSpecial: false,
          weight: 26.67,
        },
        {
          id: "workout-completed",
          label: "Treino concluído",
          isSpecial: false,
          weight: 26.67,
        },
        {
          id: "no-processed",
          label: "Sem doces/processados",
          isSpecial: false,
          weight: 26.67,
        },
        {
          id: "water-3l",
          label: "+3L de água",
          isSpecial: false,
          weight: 20,
        },
      ]);
    }
  }, []);

  const handleSave = () => {
    localStorage.setItem("default_checklist", JSON.stringify(items));
    
    // Disparar evento para atualizar todos os checklists
    window.dispatchEvent(new CustomEvent("defaultChecklistUpdated"));
    
    if (onClose) {
      onClose();
    }
  };

  const handleAdd = () => {
    const newItem: ChecklistItem = {
      id: `item_${Date.now()}`,
      label: "Novo item",
      isSpecial: false,
      weight: 0,
    };
    setItems([...items, newItem]);
    setEditingId(newItem.id);
    setEditLabel("Novo item");
  };

  const handleDelete = (id: string) => {
    setItems(items.filter((item) => item.id !== id));
  };

  const handleEdit = (id: string) => {
    const item = items.find((i) => i.id === id);
    if (item) {
      setEditingId(id);
      setEditLabel(item.label);
    }
  };

  const handleSaveEdit = () => {
    if (editingId) {
      setItems(
        items.map((item) =>
          item.id === editingId ? { ...item, label: editLabel } : item
        )
      );
      setEditingId(null);
      setEditLabel("");
    }
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditLabel("");
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-zinc-100">
            Configurar Checklist Diário
          </h3>
          <p className="mt-1 text-sm text-zinc-400">
            Configure os itens padrão que aparecerão todos os dias. Os 3 primeiros itens têm peso maior no score.
          </p>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="rounded-full p-2 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100 transition-colors"
          >
            ✕
          </button>
        )}
      </div>

      <div className="space-y-2">
        {items.map((item, idx) => (
          <div
            key={item.id}
            className="flex items-center gap-3 rounded-xl bg-zinc-950/60 border border-zinc-800 p-3"
          >
            <span className="text-xs text-zinc-500 w-8">{idx + 1}.</span>
            {editingId === item.id ? (
              <div className="flex-1 flex items-center gap-2">
                <input
                  type="text"
                  value={editLabel}
                  onChange={(e) => setEditLabel(e.target.value)}
                  className="flex-1 rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 focus:border-emerald-500/50 focus:outline-none"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleSaveEdit();
                    if (e.key === "Escape") handleCancelEdit();
                  }}
                />
                <button
                  onClick={handleSaveEdit}
                  className="rounded-lg bg-emerald-500/20 px-3 py-2 text-xs text-emerald-300 hover:bg-emerald-500/30 transition-colors"
                >
                  Salvar
                </button>
                <button
                  onClick={handleCancelEdit}
                  className="rounded-lg border border-zinc-700 px-3 py-2 text-xs text-zinc-400 hover:bg-zinc-800 transition-colors"
                >
                  Cancelar
                </button>
              </div>
            ) : (
              <>
                <div className="flex-1">
                  <span className="text-sm text-zinc-100">{item.label}</span>
                  {idx < 3 && (
                    <span className="ml-2 text-[10px] text-zinc-500">
                      (Peso maior)
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleEdit(item.id)}
                    className="rounded-lg border border-zinc-700 px-3 py-1.5 text-xs text-zinc-300 hover:bg-zinc-800 transition-colors"
                  >
                    Editar
                  </button>
                  <button
                    onClick={() => handleDelete(item.id)}
                    className="rounded-lg border border-red-500/30 px-3 py-1.5 text-xs text-red-400 hover:bg-red-500/10 transition-colors"
                  >
                    Remover
                  </button>
                </div>
              </>
            )}
          </div>
        ))}
      </div>

      <button
        onClick={handleAdd}
        className="w-full rounded-xl border border-dashed border-zinc-700 px-4 py-3 text-sm text-zinc-400 hover:border-emerald-400/60 hover:text-emerald-100 transition-colors"
      >
        + Adicionar novo item
      </button>

      <div className="flex gap-3 pt-4">
        <button
          onClick={handleSave}
          className="flex-1 rounded-xl bg-emerald-500/20 px-4 py-3 text-sm font-medium text-emerald-300 hover:bg-emerald-500/30 transition-colors"
        >
          Salvar alterações
        </button>
        {onClose && (
          <button
            onClick={onClose}
            className="rounded-xl border border-zinc-700 px-4 py-3 text-sm font-medium text-zinc-300 hover:bg-zinc-800 transition-colors"
          >
            Cancelar
          </button>
        )}
      </div>
    </div>
  );
}

