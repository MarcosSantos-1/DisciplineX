"use client";

import { useState } from "react";

type ProgressPoint = {
  week: string;
  weight: number;
  score: number;
};

type AnthropometryData = {
  weight: number;
  leanMass: number;
  fatMass: number;
  fatPercentage: number;
  lastMeasurementDate: Date;
};

function AnthropometryModal({
  isOpen,
  onClose,
  initialData,
  onSave,
}: {
  isOpen: boolean;
  onClose: () => void;
  initialData: AnthropometryData;
  onSave: (data: AnthropometryData) => void;
}) {
  const [formData, setFormData] = useState(initialData);
  const [selectedDate, setSelectedDate] = useState(new Date());

  if (!isOpen) return null;

  const formatDate = (date: Date) => {
    return date.toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="glass-panel w-full max-w-md rounded-3xl p-6 max-h-[90vh] overflow-y-auto">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-zinc-50">
            Atualizar Antropometria
          </h3>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-zinc-400 hover:text-zinc-100"
          >
            ✕
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="text-xs text-zinc-400">Data da Consulta</label>
            <input
              type="date"
              value={selectedDate.toISOString().split("T")[0]}
              onChange={(e) => setSelectedDate(new Date(e.target.value))}
              className="mt-1 w-full rounded-lg border border-zinc-700/80 bg-zinc-900/60 px-3 py-2 text-sm text-zinc-100 focus:border-jagger-400/60 focus:outline-none"
            />
            <p className="mt-1 text-[10px] text-zinc-500">
              {formatDate(selectedDate)}
            </p>
          </div>

          <div>
            <label className="text-xs text-zinc-400">Peso (kg)</label>
            <input
              type="number"
              step="0.1"
              value={formData.weight}
              onChange={(e) =>
                setFormData({ ...formData, weight: Number(e.target.value) })
              }
              className="mt-1 w-full rounded-lg border border-zinc-700/80 bg-zinc-900/60 px-3 py-2 text-sm text-zinc-100 focus:border-jagger-400/60 focus:outline-none"
            />
          </div>

          <div>
            <label className="text-xs text-zinc-400">Massa Magra (kg)</label>
            <input
              type="number"
              step="0.1"
              value={formData.leanMass}
              onChange={(e) =>
                setFormData({ ...formData, leanMass: Number(e.target.value) })
              }
              className="mt-1 w-full rounded-lg border border-zinc-700/80 bg-zinc-900/60 px-3 py-2 text-sm text-zinc-100 focus:border-jagger-400/60 focus:outline-none"
            />
          </div>

          <div>
            <label className="text-xs text-zinc-400">Massa Gorda (kg)</label>
            <input
              type="number"
              step="0.1"
              value={formData.fatMass}
              onChange={(e) =>
                setFormData({ ...formData, fatMass: Number(e.target.value) })
              }
              className="mt-1 w-full rounded-lg border border-zinc-700/80 bg-zinc-900/60 px-3 py-2 text-sm text-zinc-100 focus:border-jagger-400/60 focus:outline-none"
            />
          </div>

          <div>
            <label className="text-xs text-zinc-400">% Gordura</label>
            <input
              type="number"
              step="0.1"
              value={formData.fatPercentage}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  fatPercentage: Number(e.target.value),
                })
              }
              className="mt-1 w-full rounded-lg border border-zinc-700/80 bg-zinc-900/60 px-3 py-2 text-sm text-zinc-100 focus:border-jagger-400/60 focus:outline-none"
            />
          </div>
        </div>

        <div className="mt-6 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 rounded-xl border border-zinc-700/80 bg-zinc-950/60 px-4 py-2.5 text-sm font-medium text-zinc-300 transition-colors hover:border-zinc-600 hover:text-zinc-100"
          >
            Cancelar
          </button>
          <button
            onClick={() => {
              onSave({ ...formData, lastMeasurementDate: selectedDate });
              onClose();
            }}
            className="flex-1 rounded-xl bg-jagger-600 px-4 py-2.5 text-sm font-medium text-zinc-50 transition-colors hover:bg-jagger-500"
          >
            Salvar
          </button>
        </div>
      </div>
    </div>
  );
}

function WeightModal({
  isOpen,
  onClose,
  initialValue,
  label,
  onSave,
}: {
  isOpen: boolean;
  onClose: () => void;
  initialValue: number;
  label: string;
  onSave: (value: number) => void;
}) {
  const [value, setValue] = useState(initialValue);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="glass-panel w-full max-w-md rounded-3xl p-6">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-zinc-50">
            Atualizar {label}
          </h3>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-zinc-400 hover:text-zinc-100"
          >
            ✕
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="text-xs text-zinc-400">{label} (kg)</label>
            <input
              type="number"
              step="0.1"
              value={value}
              onChange={(e) => setValue(Number(e.target.value))}
              className="mt-1 w-full rounded-lg border border-zinc-700/80 bg-zinc-900/60 px-3 py-2 text-sm text-zinc-100 focus:border-jagger-400/60 focus:outline-none"
            />
          </div>
        </div>

        <div className="mt-6 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 rounded-xl border border-zinc-700/80 bg-zinc-950/60 px-4 py-2.5 text-sm font-medium text-zinc-300 transition-colors hover:border-zinc-600 hover:text-zinc-100"
          >
            Cancelar
          </button>
          <button
            onClick={() => {
              onSave(value);
              onClose();
            }}
            className="flex-1 rounded-xl bg-jagger-600 px-4 py-2.5 text-sm font-medium text-zinc-50 transition-colors hover:bg-jagger-500"
          >
            Salvar
          </button>
        </div>
      </div>
    </div>
  );
}

export default function PerfilPage() {
  const [activeTab, setActiveTab] = useState<"overview" | "reports" | "settings">("overview");
  const [currentWeight, setCurrentWeight] = useState(92);
  const [targetWeight, setTargetWeight] = useState(72);
  const [anthropometry, setAnthropometry] = useState<AnthropometryData>({
    weight: 94,
    leanMass: 63.4,
    fatMass: 31.2,
    fatPercentage: 33,
    lastMeasurementDate: new Date(2024, 10, 10), // 10 de novembro de 2024
  });
  const [progress, setProgress] = useState<ProgressPoint[]>([
    { week: "Sem 1", weight: 100, score: 65 },
    { week: "Sem 2", weight: 98, score: 72 },
    { week: "Sem 3", weight: 96, score: 75 },
    { week: "Sem 4", weight: 94, score: 78 },
    { week: "Sem 5", weight: 93, score: 80 },
    { week: "Sem 6", weight: 92, score: 78 },
  ]);

  const [isAnthropometryModalOpen, setIsAnthropometryModalOpen] = useState(false);
  const [isCurrentWeightModalOpen, setIsCurrentWeightModalOpen] = useState(false);
  const [isTargetWeightModalOpen, setIsTargetWeightModalOpen] = useState(false);

  const handleAnthropometrySave = (data: AnthropometryData) => {
    setAnthropometry(data);
    // Atualizar também o peso atual quando atualizar antropometria
    setCurrentWeight(data.weight);
    // Adicionar ao gráfico de progresso
    const newProgress = [...progress];
    const today = new Date();
    const weekNumber = Math.floor((today.getTime() - new Date(2024, 9, 1).getTime()) / (7 * 24 * 60 * 60 * 1000)) + 1;
    const weekLabel = `Sem ${weekNumber}`;
    const existingIndex = newProgress.findIndex((p) => p.week === weekLabel);
    if (existingIndex >= 0) {
      newProgress[existingIndex].weight = data.weight;
    } else {
      newProgress.push({ week: weekLabel, weight: data.weight, score: 78 });
    }
    setProgress(newProgress);
  };

  const handleCurrentWeightSave = (weight: number) => {
    setCurrentWeight(weight);
    // Adicionar ao gráfico de progresso
    const newProgress = [...progress];
    const today = new Date();
    const weekNumber = Math.floor((today.getTime() - new Date(2024, 9, 1).getTime()) / (7 * 24 * 60 * 60 * 1000)) + 1;
    const weekLabel = `Sem ${weekNumber}`;
    const existingIndex = newProgress.findIndex((p) => p.week === weekLabel);
    if (existingIndex >= 0) {
      newProgress[existingIndex].weight = weight;
    } else {
      newProgress.push({ week: weekLabel, weight, score: 78 });
    }
    setProgress(newProgress);
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  const weightLost = 100 - currentWeight; // Mock - assumindo peso inicial de 100kg

  return (
    <div className="flex flex-1 flex-col gap-4">
      <header className="flex flex-col gap-2">
        <div>
          <p className="text-xs uppercase tracking-[0.25em] text-jagger-300/80">
            Perfil Operacional
          </p>
          <h2 className="mt-1 text-2xl font-semibold text-zinc-50">
            Jägger
          </h2>
          <p className="mt-1 text-xs text-zinc-400">
            Controle de atividades e relatórios de evolução.
          </p>
        </div>
      </header>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-zinc-800/80 overflow-x-auto">
        <button
          onClick={() => setActiveTab("overview")}
          className={`px-4 py-2 text-sm font-medium transition-colors whitespace-nowrap ${
            activeTab === "overview"
              ? "border-b-2 border-jagger-400 text-jagger-300"
              : "text-zinc-400 hover:text-zinc-200"
          }`}
        >
          Visão Geral
        </button>
        <button
          onClick={() => setActiveTab("reports")}
          className={`px-4 py-2 text-sm font-medium transition-colors whitespace-nowrap ${
            activeTab === "reports"
              ? "border-b-2 border-jagger-400 text-jagger-300"
              : "text-zinc-400 hover:text-zinc-200"
          }`}
        >
          Relatórios
        </button>
        <button
          onClick={() => setActiveTab("settings")}
          className={`px-4 py-2 text-sm font-medium transition-colors whitespace-nowrap ${
            activeTab === "settings"
              ? "border-b-2 border-jagger-400 text-jagger-300"
              : "text-zinc-400 hover:text-zinc-200"
          }`}
        >
          Ajustes
        </button>
      </div>

      {activeTab === "overview" && (
        <>
          {/* Stats Cards */}
          <section className="grid gap-3 grid-cols-2">
            <button
              onClick={() => setIsCurrentWeightModalOpen(true)}
              className="glass-panel rounded-3xl p-4 text-left hover:bg-zinc-900/80 transition-colors"
            >
              <p className="text-xs text-zinc-400">Peso Atual</p>
              <p className="mt-1 text-2xl font-bold text-zinc-50">
                {currentWeight}kg
              </p>
              <p className="mt-1 text-xs text-emerald-400">
                -{weightLost}kg desde o início
              </p>
            </button>

            <button
              onClick={() => setIsTargetWeightModalOpen(true)}
              className="glass-panel rounded-3xl p-4 text-left hover:bg-zinc-900/80 transition-colors"
            >
              <p className="text-xs text-zinc-400">Meta</p>
              <p className="mt-1 text-2xl font-bold text-zinc-50">
                {targetWeight}kg
              </p>
              <p className="mt-1 text-xs text-zinc-500">
                Faltam {currentWeight - targetWeight}kg
              </p>
            </button>
          </section>

          {/* Antropometria Grid 2x2 */}
          <section className="glass-panel rounded-3xl p-4">
            <div className="mb-3 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-medium text-zinc-100">
                  Antropometria
                </h3>
                <p className="mt-0.5 text-xs text-zinc-400">
                  Dados da última consulta
                </p>
              </div>
              <button
                onClick={() => setIsAnthropometryModalOpen(true)}
                className="rounded-full border border-zinc-700/80 bg-zinc-950/60 px-3 py-1 text-[11px] text-zinc-300 hover:border-jagger-400/60 hover:text-jagger-100 transition-colors"
              >
                Atualizar
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-2xl border border-zinc-800/80 bg-zinc-950/60 p-3">
                <p className="text-[10px] text-zinc-400">Última Medição</p>
                <p className="mt-1 text-sm font-semibold text-zinc-50">
                  {formatDate(anthropometry.lastMeasurementDate)}
                </p>
              </div>
              <div className="rounded-2xl border border-zinc-800/80 bg-zinc-950/60 p-3">
                <p className="text-[10px] text-zinc-400">Peso</p>
                <p className="mt-1 text-sm font-semibold text-zinc-50">
                  {anthropometry.weight} kg
                </p>
              </div>
              <div className="rounded-2xl border border-zinc-800/80 bg-zinc-950/60 p-3">
                <p className="text-[10px] text-zinc-400">Massa Magra</p>
                <p className="mt-1 text-sm font-semibold text-zinc-50">
                  {anthropometry.leanMass} kg
                </p>
              </div>
              <div className="rounded-2xl border border-zinc-800/80 bg-zinc-950/60 p-3">
                <p className="text-[10px] text-zinc-400">Massa Gorda</p>
                <p className="mt-1 text-sm font-semibold text-zinc-50">
                  {anthropometry.fatMass} kg
                </p>
              </div>
            </div>
            <div className="mt-3 rounded-2xl border border-zinc-800/80 bg-zinc-950/60 p-3">
              <p className="text-[10px] text-zinc-400">% Gordura</p>
              <p className="mt-1 text-lg font-semibold text-jagger-300">
                {anthropometry.fatPercentage}%
              </p>
            </div>
          </section>

          {/* Progress Chart */}
          <section className="glass-panel rounded-3xl p-4">
            <h3 className="text-sm font-medium text-zinc-100 mb-4">
              Evolução de Peso
            </h3>
            <div className="flex items-end justify-between gap-2 h-48">
              {progress.map((point, idx) => {
                const maxWeight = Math.max(...progress.map((p) => p.weight));
                const minWeight = Math.min(...progress.map((p) => p.weight));
                const range = maxWeight - minWeight;
                const height = range > 0 ? ((point.weight - minWeight) / range) * 100 : 50;

                return (
                  <div key={idx} className="flex-1 flex flex-col items-center gap-2">
                    <div className="w-full flex flex-col items-center justify-end h-32">
                      <div
                        className="w-full rounded-t-lg bg-gradient-to-t from-jagger-600 to-jagger-400 transition-all"
                        style={{ height: `${height}%` }}
                      />
                    </div>
                    <p className="text-[9px] text-zinc-400">{point.week}</p>
                    <p className="text-[10px] font-medium text-zinc-300">{point.weight}kg</p>
                  </div>
                );
              })}
            </div>
          </section>
        </>
      )}

      {activeTab === "reports" && (
        <section className="glass-panel rounded-3xl p-4">
          <h3 className="text-sm font-medium text-zinc-100 mb-4">
            Relatórios Detalhados
          </h3>
          <div className="space-y-3">
            <div className="rounded-2xl border border-zinc-800/80 bg-zinc-950/60 p-3">
              <p className="text-xs font-medium text-zinc-100">
                Relatório Semanal
              </p>
              <p className="mt-1 text-[11px] text-zinc-400">
                Última semana: Score médio de 78/100. Treinos completos: 5/5.
                Peso: -1kg.
              </p>
            </div>
            <div className="rounded-2xl border border-zinc-800/80 bg-zinc-950/60 p-3">
              <p className="text-xs font-medium text-zinc-100">
                Relatório Mensal
              </p>
              <p className="mt-1 text-[11px] text-zinc-400">
                Último mês: Score médio de 75/100. Treinos completos: 20/22.
                Peso: -4kg.
              </p>
            </div>
            <div className="rounded-2xl border border-zinc-800/80 bg-zinc-950/60 p-3">
              <p className="text-xs font-medium text-zinc-100">
                Análise de Macros
              </p>
              <p className="mt-1 text-[11px] text-zinc-400">
                Média semanal: Proteína 140g/dia, Carbos 180g/dia, Gorduras
                55g/dia.
              </p>
            </div>
          </div>
        </section>
      )}

      {activeTab === "settings" && (
        <section className="glass-panel rounded-3xl p-4">
          <h3 className="text-sm font-medium text-zinc-100 mb-4">
            Configurações
          </h3>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <button className="flex flex-col items-start gap-2 rounded-2xl border border-zinc-800/80 bg-zinc-950/60 p-4 text-left hover:border-jagger-400/60 hover:bg-zinc-900/60 transition-colors">
              <div className="flex items-center gap-2">
                <span className="text-xl">💪</span>
                <span className="text-sm font-medium text-zinc-100">Treinos</span>
              </div>
              <p className="text-xs text-zinc-400">
                Adicionar, editar exercícios, vídeos e GIFs
              </p>
            </button>

            <button className="flex flex-col items-start gap-2 rounded-2xl border border-zinc-800/80 bg-zinc-950/60 p-4 text-left hover:border-jagger-400/60 hover:bg-zinc-900/60 transition-colors">
              <div className="flex items-center gap-2">
                <span className="text-xl">⏰</span>
                <span className="text-sm font-medium text-zinc-100">Jejum</span>
              </div>
              <p className="text-xs text-zinc-400">
                Configurar dias padrões e tipos de jejum
              </p>
            </button>
          </div>
        </section>
      )}

      <AnthropometryModal
        isOpen={isAnthropometryModalOpen}
        onClose={() => setIsAnthropometryModalOpen(false)}
        initialData={anthropometry}
        onSave={handleAnthropometrySave}
      />

      <WeightModal
        isOpen={isCurrentWeightModalOpen}
        onClose={() => setIsCurrentWeightModalOpen(false)}
        initialValue={currentWeight}
        label="Peso Atual"
        onSave={handleCurrentWeightSave}
      />

      <WeightModal
        isOpen={isTargetWeightModalOpen}
        onClose={() => setIsTargetWeightModalOpen(false)}
        initialValue={targetWeight}
        label="Meta"
        onSave={setTargetWeight}
      />
    </div>
  );
}
