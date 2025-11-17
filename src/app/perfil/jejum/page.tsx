"use client";

import { useState, useEffect } from "react";

type FastingType = {
  id: string;
  name: string;
  duration: number; // em horas
  description: string;
};

type FastingSchedule = {
  dayOfWeek: number; // 0 = domingo, 6 = sábado
  fastingTypeId: string | null;
  startTime: string; // HH:mm
};

const DEFAULT_FASTING_TYPES: FastingType[] = [
  {
    id: "16-8",
    name: "16/8",
    duration: 16,
    description: "16 horas de jejum, 8 horas de janela alimentar",
  },
  {
    id: "18-6",
    name: "18/6",
    duration: 18,
    description: "18 horas de jejum, 6 horas de janela alimentar",
  },
  {
    id: "20-4",
    name: "20/4",
    duration: 20,
    description: "20 horas de jejum, 4 horas de janela alimentar",
  },
  {
    id: "omad",
    name: "OMAD",
    duration: 23,
    description: "Uma refeição por dia (23h de jejum)",
  },
];

export default function JejumConfigPage() {
  const [fastingTypes, setFastingTypes] = useState<FastingType[]>(DEFAULT_FASTING_TYPES);
  const [schedule, setSchedule] = useState<FastingSchedule[]>([]);
  const [showAddTypeModal, setShowAddTypeModal] = useState(false);
  const [newType, setNewType] = useState({ name: "", duration: 16, description: "" });

  const dayNames = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];

  useEffect(() => {
    // Carregar tipos de jejum salvos
    const savedTypes = localStorage.getItem("fasting_types");
    if (savedTypes) {
      try {
        setFastingTypes(JSON.parse(savedTypes));
      } catch (e) {
        console.error("Erro ao carregar tipos de jejum:", e);
      }
    }

    // Carregar cronograma salvo
    const savedSchedule = localStorage.getItem("fasting_schedule");
    if (savedSchedule) {
      try {
        setSchedule(JSON.parse(savedSchedule));
      } catch (e) {
        // Criar cronograma padrão
        const defaultSchedule: FastingSchedule[] = [];
        for (let i = 0; i < 7; i++) {
          defaultSchedule.push({
            dayOfWeek: i,
            fastingTypeId: null,
            startTime: "20:00",
          });
        }
        setSchedule(defaultSchedule);
      }
    } else {
      // Criar cronograma padrão
      const defaultSchedule: FastingSchedule[] = [];
      for (let i = 0; i < 7; i++) {
        defaultSchedule.push({
          dayOfWeek: i,
          fastingTypeId: null,
          startTime: "20:00",
        });
      }
      setSchedule(defaultSchedule);
    }
  }, []);

  const handleAddFastingType = () => {
    if (!newType.name || newType.duration <= 0) return;

    const type: FastingType = {
      id: Date.now().toString(),
      name: newType.name,
      duration: newType.duration,
      description: newType.description,
    };

    const updated = [...fastingTypes, type];
    setFastingTypes(updated);
    localStorage.setItem("fasting_types", JSON.stringify(updated));
    setNewType({ name: "", duration: 16, description: "" });
    setShowAddTypeModal(false);
  };

  const handleDeleteFastingType = (id: string) => {
    const updated = fastingTypes.filter((t) => t.id !== id);
    setFastingTypes(updated);
    localStorage.setItem("fasting_types", JSON.stringify(updated));
  };

  const handleUpdateSchedule = (dayOfWeek: number, updates: Partial<FastingSchedule>) => {
    const updated = schedule.map((s) =>
      s.dayOfWeek === dayOfWeek ? { ...s, ...updates } : s
    );
    setSchedule(updated);
    localStorage.setItem("fasting_schedule", JSON.stringify(updated));
  };

  const getDaySchedule = (dayOfWeek: number): FastingSchedule => {
    return schedule.find((s) => s.dayOfWeek === dayOfWeek) || {
      dayOfWeek,
      fastingTypeId: null,
      startTime: "20:00",
    };
  };

  return (
    <div className="flex flex-1 flex-col gap-4">
      <header className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.25em] text-jagger-300/80">
            Configuração de Jejum
          </p>
          <h2 className="mt-1 text-2xl font-semibold text-zinc-50">
            Protocolo de Jejum Intermitente
          </h2>
          <p className="mt-1 text-xs text-zinc-400">
            Configure seus tipos de jejum e cronograma semanal.
          </p>
        </div>
      </header>

      {/* Tipos de Jejum */}
      <section className="glass-panel rounded-3xl p-4">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-sm font-medium text-zinc-100">
            Tipos de Jejum
          </h3>
          <button
            onClick={() => setShowAddTypeModal(true)}
            className="rounded-lg bg-jagger-600 px-3 py-1.5 text-xs font-medium text-zinc-50 transition-colors hover:bg-jagger-500"
          >
            + Adicionar Tipo
          </button>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {fastingTypes.map((type) => (
            <div
              key={type.id}
              className="rounded-2xl border border-zinc-800/80 bg-zinc-950/60 p-4"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h4 className="text-sm font-medium text-zinc-100">
                    {type.name}
                  </h4>
                  <p className="mt-1 text-xs text-zinc-400">
                    {type.duration}h de jejum
                  </p>
                  {type.description && (
                    <p className="mt-1 text-[11px] text-zinc-500">
                      {type.description}
                    </p>
                  )}
                </div>
                <button
                  onClick={() => handleDeleteFastingType(type.id)}
                  className="ml-2 rounded-lg p-1.5 text-red-400 hover:bg-red-500/10 transition-colors"
                  title="Excluir tipo"
                >
                  ✕
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Cronograma Semanal */}
      <section className="glass-panel rounded-3xl p-4">
        <h3 className="text-sm font-medium text-zinc-100 mb-4">
          Cronograma Semanal
        </h3>
        <div className="space-y-3">
          {dayNames.map((dayName, index) => {
            const daySchedule = getDaySchedule(index);
            return (
              <div
                key={index}
                className="rounded-2xl border border-zinc-800/80 bg-zinc-950/60 p-4"
              >
                <div className="flex items-center gap-4">
                  <div className="w-24 shrink-0">
                    <p className="text-xs font-medium text-zinc-100">
                      {dayName}
                    </p>
                  </div>
                  <div className="flex-1 grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div>
                      <label className="text-[10px] text-zinc-400 mb-1 block">
                        Tipo de Jejum
                      </label>
                      <select
                        value={daySchedule.fastingTypeId || ""}
                        onChange={(e) =>
                          handleUpdateSchedule(index, {
                            fastingTypeId: e.target.value || null,
                          })
                        }
                        className="w-full rounded-lg border border-zinc-700/80 bg-zinc-900/60 px-3 py-2 text-xs text-zinc-100 focus:border-jagger-400/60 focus:outline-none"
                      >
                        <option value="">Nenhum</option>
                        {fastingTypes.map((type) => (
                          <option key={type.id} value={type.id}>
                            {type.name} ({type.duration}h)
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="text-[10px] text-zinc-400 mb-1 block">
                        Início do Jejum
                      </label>
                      <input
                        type="time"
                        value={daySchedule.startTime}
                        onChange={(e) =>
                          handleUpdateSchedule(index, { startTime: e.target.value })
                        }
                        className="w-full rounded-lg border border-zinc-700/80 bg-zinc-900/60 px-3 py-2 text-xs text-zinc-100 focus:border-jagger-400/60 focus:outline-none"
                      />
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Modal para adicionar tipo */}
      {showAddTypeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="glass-panel w-full max-w-md rounded-3xl p-6">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-zinc-50">
                Adicionar Tipo de Jejum
              </h3>
              <button
                onClick={() => setShowAddTypeModal(false)}
                className="rounded-lg p-1 text-zinc-400 hover:text-zinc-100"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-xs text-zinc-400">Nome</label>
                <input
                  type="text"
                  value={newType.name}
                  onChange={(e) =>
                    setNewType({ ...newType, name: e.target.value })
                  }
                  placeholder="Ex: 14/10"
                  className="mt-1 w-full rounded-lg border border-zinc-700/80 bg-zinc-900/60 px-3 py-2 text-sm text-zinc-100 focus:border-jagger-400/60 focus:outline-none"
                />
              </div>
              <div>
                <label className="text-xs text-zinc-400">Duração (horas)</label>
                <input
                  type="number"
                  value={newType.duration}
                  onChange={(e) =>
                    setNewType({ ...newType, duration: Number(e.target.value) })
                  }
                  className="mt-1 w-full rounded-lg border border-zinc-700/80 bg-zinc-900/60 px-3 py-2 text-sm text-zinc-100 focus:border-jagger-400/60 focus:outline-none"
                />
              </div>
              <div>
                <label className="text-xs text-zinc-400">Descrição (opcional)</label>
                <textarea
                  value={newType.description}
                  onChange={(e) =>
                    setNewType({ ...newType, description: e.target.value })
                  }
                  placeholder="Descreva o protocolo..."
                  className="mt-1 w-full rounded-lg border border-zinc-700/80 bg-zinc-900/60 px-3 py-2 text-sm text-zinc-100 focus:border-jagger-400/60 focus:outline-none"
                  rows={3}
                />
              </div>
            </div>

            <div className="mt-6 flex gap-3">
              <button
                onClick={() => setShowAddTypeModal(false)}
                className="flex-1 rounded-xl border border-zinc-700/80 bg-zinc-950/60 px-4 py-2.5 text-sm font-medium text-zinc-300 transition-colors hover:border-zinc-600 hover:text-zinc-100"
              >
                Cancelar
              </button>
              <button
                onClick={handleAddFastingType}
                className="flex-1 rounded-xl bg-jagger-600 px-4 py-2.5 text-sm font-medium text-zinc-50 transition-colors hover:bg-jagger-500"
              >
                Salvar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

