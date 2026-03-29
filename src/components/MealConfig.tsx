"use client";

import { useState, useEffect } from "react";
import type { MealSlot, MealOption, MealItem } from "@/types/meals";
import { weekdayMeals, weekendMeals } from "@/types/meals";
import { mealService } from "@/lib/firebaseService";

function cloneSlots(slots: MealSlot[]): MealSlot[] {
  return JSON.parse(JSON.stringify(slots)) as MealSlot[];
}

function newOptionId() {
  return `opt_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

function newSlotId() {
  return `slot_${Date.now()}`;
}

interface MealConfigProps {
  onClose?: () => void;
}

export function MealConfig({ onClose }: MealConfigProps) {
  const [tab, setTab] = useState<"weekday" | "weekend">("weekday");
  const [weekdaySlots, setWeekdaySlots] = useState<MealSlot[]>(() => cloneSlots(weekdayMeals.slots));
  const [weekendSlots, setWeekendSlots] = useState<MealSlot[]>(() => cloneSlots(weekendMeals.slots));
  const [expandedSlotId, setExpandedSlotId] = useState<string | null>(null);
  const [expandedOptionKey, setExpandedOptionKey] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const plan = await mealService.getMealPlan();
        if (!alive) return;
        if (plan) {
          setWeekdaySlots(cloneSlots(plan.weekday));
          setWeekendSlots(cloneSlots(plan.weekend));
        }
      } catch (e) {
        console.error(e);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  const slots = tab === "weekday" ? weekdaySlots : weekendSlots;
  const setSlots = tab === "weekday" ? setWeekdaySlots : setWeekendSlots;

  const updateSlot = (slotId: string, patch: Partial<MealSlot>) => {
    setSlots((prev) => prev.map((s) => (s.id === slotId ? { ...s, ...patch } : s)));
  };

  const updateOption = (slotId: string, optionId: string, patch: Partial<MealOption>) => {
    setSlots((prev) =>
      prev.map((s) => {
        if (s.id !== slotId) return s;
        return {
          ...s,
          options: s.options.map((o) => (o.id === optionId ? { ...o, ...patch } : o)),
        };
      })
    );
  };

  const updateItem = (
    slotId: string,
    optionId: string,
    itemIndex: number,
    patch: Partial<MealItem>
  ) => {
    setSlots((prev) =>
      prev.map((s) => {
        if (s.id !== slotId) return s;
        return {
          ...s,
          options: s.options.map((o) => {
            if (o.id !== optionId) return o;
            const items = [...o.items];
            items[itemIndex] = { ...items[itemIndex], ...patch };
            return { ...o, items };
          }),
        };
      })
    );
  };

  const addSlot = () => {
    const id = newSlotId();
    const empty: MealSlot = {
      id,
      name: "Nova refeição",
      time: "12h00",
      minCalories: 300,
      maxCalories: 600,
      options: [
        {
          id: newOptionId(),
          name: "Opção 1",
          items: [{ name: "Ingrediente", quantity: "100g", calories: 100 }],
          totalCalories: 100,
          protein: 10,
          carbs: 10,
          fat: 5,
        },
      ],
    };
    setSlots((prev) => [...prev, empty]);
    setExpandedSlotId(id);
  };

  const removeSlot = (slotId: string) => {
    if (!confirm("Remover este horário de refeição e todas as opções?")) return;
    setSlots((prev) => prev.filter((s) => s.id !== slotId));
    if (expandedSlotId === slotId) setExpandedSlotId(null);
  };

  const addOption = (slotId: string) => {
    const opt: MealOption = {
      id: newOptionId(),
      name: "Nova opção",
      items: [],
      totalCalories: 0,
      protein: 0,
      carbs: 0,
      fat: 0,
    };
    setSlots((prev) =>
      prev.map((s) => (s.id === slotId ? { ...s, options: [...s.options, opt] } : s))
    );
    setExpandedOptionKey(`${slotId}:${opt.id}`);
  };

  const removeOption = (slotId: string, optionId: string) => {
    setSlots((prev) =>
      prev.map((s) =>
        s.id === slotId ? { ...s, options: s.options.filter((o) => o.id !== optionId) } : s
      )
    );
  };

  const addIngredient = (slotId: string, optionId: string) => {
    setSlots((prev) =>
      prev.map((s) => {
        if (s.id !== slotId) return s;
        return {
          ...s,
          options: s.options.map((o) =>
            o.id === optionId
              ? {
                  ...o,
                  items: [...o.items, { name: "", quantity: "", calories: 0 }],
                }
              : o
          ),
        };
      })
    );
  };

  const removeIngredient = (slotId: string, optionId: string, itemIndex: number) => {
    setSlots((prev) =>
      prev.map((s) => {
        if (s.id !== slotId) return s;
        return {
          ...s,
          options: s.options.map((o) => {
            if (o.id !== optionId) return o;
            return {
              ...o,
              items: o.items.filter((_, i) => i !== itemIndex),
            };
          }),
        };
      })
    );
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await mealService.saveMealPlan({
        weekday: weekdaySlots,
        weekend: weekendSlots,
      });
      window.dispatchEvent(new CustomEvent("mealPlanUpdated"));
      onClose?.();
    } catch (e) {
      console.error(e);
      alert("Não foi possível salvar. Tente de novo.");
    } finally {
      setSaving(false);
    }
  };

  const inputClass =
    "w-full rounded-lg border border-zinc-800/90 bg-zinc-950 px-2.5 py-1.5 text-xs text-zinc-100 placeholder:text-zinc-600 focus:border-jagger-500/60 focus:outline-none";

  if (loading) {
    return (
      <div className="py-12 text-center text-sm text-zinc-400">Carregando cardápio…</div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-sm font-medium text-zinc-100">Configurar refeições</h3>
          <p className="mt-0.5 text-xs text-zinc-400">
            Nome, horário e opções com ingredientes e macros. Salve para aplicar no app.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setTab("weekday")}
            className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
              tab === "weekday"
                ? "bg-jagger-600 text-zinc-50"
                : "border border-zinc-800/90 bg-zinc-950 text-zinc-400 hover:text-zinc-200"
            }`}
          >
            Segunda a sexta
          </button>
          <button
            type="button"
            onClick={() => setTab("weekend")}
            className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
              tab === "weekend"
                ? "bg-jagger-600 text-zinc-50"
                : "border border-zinc-800/90 bg-zinc-950 text-zinc-400 hover:text-zinc-200"
            }`}
          >
            Fim de semana
          </button>
        </div>
      </div>

      <div className="space-y-2">
        {slots.map((slot) => {
          const open = expandedSlotId === slot.id;
          return (
            <div
              key={slot.id}
              className="rounded-2xl border border-zinc-800/90 bg-zinc-950 p-3 text-xs"
            >
              <button
                type="button"
                onClick={() => setExpandedSlotId(open ? null : slot.id)}
                className="flex w-full items-center justify-between gap-2 text-left"
              >
                <span className="font-medium text-zinc-100">
                  {slot.name}{" "}
                  <span className="font-normal text-zinc-500">· {slot.time}</span>
                </span>
                <span className="text-zinc-500">{open ? "▲" : "▼"}</span>
              </button>

              {open && (
                <div className="mt-3 space-y-3 border-t border-zinc-800/80 pt-3">
                  <div className="grid gap-2 sm:grid-cols-2">
                    <label className="block">
                      <span className="mb-1 block text-[10px] uppercase tracking-wide text-zinc-500">
                        Nome
                      </span>
                      <input
                        className={inputClass}
                        value={slot.name}
                        onChange={(e) => updateSlot(slot.id, { name: e.target.value })}
                      />
                    </label>
                    <label className="block">
                      <span className="mb-1 block text-[10px] uppercase tracking-wide text-zinc-500">
                        Horário
                      </span>
                      <input
                        className={inputClass}
                        value={slot.time}
                        onChange={(e) => updateSlot(slot.id, { time: e.target.value })}
                        placeholder="ex: 12h20"
                      />
                    </label>
                    <label className="block">
                      <span className="mb-1 block text-[10px] uppercase tracking-wide text-zinc-500">
                        Kcal mín.
                      </span>
                      <input
                        type="number"
                        className={inputClass}
                        value={slot.minCalories}
                        onChange={(e) =>
                          updateSlot(slot.id, { minCalories: Number(e.target.value) || 0 })
                        }
                      />
                    </label>
                    <label className="block">
                      <span className="mb-1 block text-[10px] uppercase tracking-wide text-zinc-500">
                        Kcal máx.
                      </span>
                      <input
                        type="number"
                        className={inputClass}
                        value={slot.maxCalories}
                        onChange={(e) =>
                          updateSlot(slot.id, { maxCalories: Number(e.target.value) || 0 })
                        }
                      />
                    </label>
                  </div>

                  <div className="space-y-2">
                    <p className="text-[10px] font-medium uppercase tracking-wide text-zinc-500">
                      Opções desta refeição
                    </p>
                    {slot.options.length === 0 && (
                      <p className="text-zinc-500">Nenhuma opção — adicione uma abaixo.</p>
                    )}
                    {slot.options.map((opt) => {
                      const optKey = `${slot.id}:${opt.id}`;
                      const optOpen = expandedOptionKey === optKey;
                      return (
                        <div
                          key={opt.id}
                          className="rounded-xl border border-zinc-800/80 bg-zinc-900/40 p-2.5"
                        >
                          <button
                            type="button"
                            onClick={() =>
                              setExpandedOptionKey(optOpen ? null : optKey)
                            }
                            className="flex w-full items-center justify-between gap-2 text-left text-zinc-200"
                          >
                            <span className="truncate">{opt.name || "(sem nome)"}</span>
                            <span className="shrink-0 text-zinc-500">{optOpen ? "▲" : "▼"}</span>
                          </button>
                          {optOpen && (
                            <div className="mt-2 space-y-2 border-t border-zinc-800/60 pt-2">
                              <input
                                className={inputClass}
                                placeholder="Nome da opção"
                                value={opt.name}
                                onChange={(e) =>
                                  updateOption(slot.id, opt.id, { name: e.target.value })
                                }
                              />
                              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                                {(
                                  [
                                    ["kcal", "totalCalories"],
                                    ["Prot (g)", "protein"],
                                    ["Carb (g)", "carbs"],
                                    ["Gord (g)", "fat"],
                                  ] as const
                                ).map(([label, key]) => (
                                  <label key={key}>
                                    <span className="mb-0.5 block text-[10px] text-zinc-500">
                                      {label}
                                    </span>
                                    <input
                                      type="number"
                                      className={inputClass}
                                      value={opt[key]}
                                      onChange={(e) =>
                                        updateOption(slot.id, opt.id, {
                                          [key]: Number(e.target.value) || 0,
                                        } as Partial<MealOption>)
                                      }
                                    />
                                  </label>
                                ))}
                              </div>
                              <p className="text-[10px] font-medium uppercase text-zinc-500">
                                Ingredientes / itens
                              </p>
                              {opt.items.map((item, idx) => (
                                <div
                                  key={idx}
                                  className="grid gap-1.5 sm:grid-cols-[1fr_1fr_80px_auto]"
                                >
                                  <input
                                    className={inputClass}
                                    placeholder="Nome"
                                    value={item.name}
                                    onChange={(e) =>
                                      updateItem(slot.id, opt.id, idx, {
                                        name: e.target.value,
                                      })
                                    }
                                  />
                                  <input
                                    className={inputClass}
                                    placeholder="Quantidade"
                                    value={item.quantity}
                                    onChange={(e) =>
                                      updateItem(slot.id, opt.id, idx, {
                                        quantity: e.target.value,
                                      })
                                    }
                                  />
                                  <input
                                    type="number"
                                    className={inputClass}
                                    placeholder="Kcal"
                                    value={item.calories}
                                    onChange={(e) =>
                                      updateItem(slot.id, opt.id, idx, {
                                        calories: Number(e.target.value) || 0,
                                      })
                                    }
                                  />
                                  <button
                                    type="button"
                                    onClick={() => removeIngredient(slot.id, opt.id, idx)}
                                    className="rounded-lg px-2 text-red-400 hover:bg-red-500/10"
                                    title="Remover item"
                                  >
                                    ✕
                                  </button>
                                </div>
                              ))}
                              <div className="flex flex-wrap gap-2">
                                <button
                                  type="button"
                                  onClick={() => addIngredient(slot.id, opt.id)}
                                  className="rounded-lg border border-dashed border-zinc-700 px-2 py-1 text-[11px] text-zinc-400 hover:border-zinc-500"
                                >
                                  + Ingrediente
                                </button>
                                <button
                                  type="button"
                                  onClick={() => removeOption(slot.id, opt.id)}
                                  className="rounded-lg px-2 py-1 text-[11px] text-red-400 hover:bg-red-500/10"
                                >
                                  Remover opção
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => addOption(slot.id)}
                      className="rounded-lg border border-dashed border-zinc-700 px-3 py-1.5 text-[11px] text-zinc-300 hover:border-jagger-500/50"
                    >
                      + Opção de refeição
                    </button>
                    <button
                      type="button"
                      onClick={() => removeSlot(slot.id)}
                      className="rounded-lg px-3 py-1.5 text-[11px] text-red-400 hover:bg-red-500/10"
                    >
                      Excluir refeição
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <button
        type="button"
        onClick={addSlot}
        className="w-full rounded-xl border border-dashed border-zinc-700 py-2.5 text-xs text-zinc-400 hover:border-zinc-500 hover:text-zinc-200"
      >
        + Adicionar horário de refeição
      </button>

      <div className="flex flex-wrap gap-2 border-t border-zinc-800/90 pt-4">
        <button
          type="button"
          disabled={saving}
          onClick={handleSave}
          className="rounded-xl bg-jagger-600 px-4 py-2.5 text-sm font-medium text-zinc-50 hover:bg-jagger-500 disabled:opacity-50"
        >
          {saving ? "Salvando…" : "Salvar cardápio"}
        </button>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-zinc-800/90 bg-zinc-950 px-4 py-2.5 text-sm text-zinc-300 hover:border-zinc-600"
          >
            Voltar
          </button>
        )}
      </div>
    </div>
  );
}
