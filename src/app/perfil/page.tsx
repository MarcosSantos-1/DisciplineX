"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { ChecklistConfig } from "@/components/ChecklistConfig";
import { calculateBMR, UserProfile, PhysicalActivity } from "@/types/meals";

type WeightEntry = {
  date: string; // YYYY-MM-DD
  weight: number;
  timestamp: number; // Para ordenação
};

type ProgressPoint = {
  date: string;
  weight: number;
  label: string; // Data formatada para exibição
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
  includeDate = false,
}: {
  isOpen: boolean;
  onClose: () => void;
  initialValue: number;
  label: string;
  onSave: (value: number, date?: Date) => void;
  includeDate?: boolean;
}) {
  const [value, setValue] = useState(initialValue);
  const [selectedDate, setSelectedDate] = useState(new Date());

  useEffect(() => {
    if (isOpen) {
      setValue(initialValue);
      setSelectedDate(new Date());
    }
  }, [isOpen, initialValue]);

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
          {includeDate && (
            <div>
              <label className="text-xs text-zinc-400">Data da Pesagem</label>
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
          )}
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
              onSave(value, includeDate ? selectedDate : undefined);
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

function PerfilPageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  
  // Verificar se veio da página de configuração de checklist
  const initialTab = searchParams.get("tab") === "checklist-config" 
    ? "checklist-config" 
    : searchParams.get("tab") === "settings"
    ? "settings"
    : "overview";
  
  const [activeTab, setActiveTab] = useState<"overview" | "reports" | "settings" | "checklist-config">(initialTab);

  // Atualizar quando a URL mudar
  useEffect(() => {
    const tab = searchParams.get("tab");
    if (tab === "checklist-config") {
      setActiveTab("checklist-config");
    } else if (tab === "settings") {
      setActiveTab("settings");
    }
  }, [searchParams]);
  // Carregar peso atual do localStorage ou usar padrão
  const loadCurrentWeight = (): number => {
    const saved = localStorage.getItem("current_weight");
    if (saved) {
      try {
        return Number(saved);
      } catch (e) {
        return 92;
      }
    }
    return 92;
  };

  // Carregar histórico de peso do localStorage
  const loadWeightHistory = (): WeightEntry[] => {
    const saved = localStorage.getItem("weight_history");
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        return [];
      }
    }
    // Se não tiver histórico, criar entrada inicial com peso atual
    const initialWeight = loadCurrentWeight();
    return [{
      date: new Date().toISOString().split("T")[0],
      weight: initialWeight,
      timestamp: Date.now(),
    }];
  };

  const [currentWeight, setCurrentWeight] = useState(loadCurrentWeight());
  const [targetWeight, setTargetWeight] = useState(() => {
    const saved = localStorage.getItem("target_weight");
    return saved ? Number(saved) : 72;
  });
  const [anthropometry, setAnthropometry] = useState<AnthropometryData>(() => {
    const saved = localStorage.getItem("anthropometry");
    if (saved) {
      try {
        const data = JSON.parse(saved);
        return {
          ...data,
          lastMeasurementDate: new Date(data.lastMeasurementDate),
        };
      } catch (e) {
        // Fallback para valores padrão
      }
    }
    return {
      weight: 94,
      leanMass: 63.4,
      fatMass: 31.2,
      fatPercentage: 33,
      lastMeasurementDate: new Date(2024, 10, 10),
    };
  });
  const [weightHistory, setWeightHistory] = useState<WeightEntry[]>(loadWeightHistory());

  // Converter histórico de peso para pontos do gráfico
  const progress: ProgressPoint[] = weightHistory
    .sort((a, b) => a.timestamp - b.timestamp)
    .map((entry) => {
      const date = new Date(entry.date);
      const dayOfWeek = date.getDay();
      const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
      
      // Formatar label: se for fim de semana, mostrar data completa, senão apenas dia/mês
      const label = isWeekend || weightHistory.length <= 7
        ? date.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })
        : date.getDate().toString();

      return {
        date: entry.date,
        weight: entry.weight,
        label,
      };
    });

  const [isAnthropometryModalOpen, setIsAnthropometryModalOpen] = useState(false);
  const [isCurrentWeightModalOpen, setIsCurrentWeightModalOpen] = useState(false);
  const [isTargetWeightModalOpen, setIsTargetWeightModalOpen] = useState(false);

  const handleAnthropometrySave = (data: AnthropometryData) => {
    setAnthropometry(data);
    localStorage.setItem("anthropometry", JSON.stringify(data));
    
    // Salvar no histórico de antropometria
    const anthropometryHistory = (() => {
      const saved = localStorage.getItem("anthropometry_history");
      if (saved) {
        try {
          return JSON.parse(saved);
        } catch (e) {
          return [];
        }
      }
      return [];
    })();

    const dateKey = data.lastMeasurementDate.toISOString().split("T")[0];
    const newEntry = {
      date: dateKey,
      leanMass: data.leanMass,
      fatPercentage: data.fatPercentage,
      weight: data.weight,
      fatMass: data.fatMass,
    };

    // Verificar se já existe entrada para esta data
    const existingIndex = anthropometryHistory.findIndex((e: any) => e.date === dateKey);
    if (existingIndex >= 0) {
      anthropometryHistory[existingIndex] = newEntry;
    } else {
      anthropometryHistory.push(newEntry);
    }

    // Ordenar por data
    anthropometryHistory.sort((a: any, b: any) => a.date.localeCompare(b.date));
    localStorage.setItem("anthropometry_history", JSON.stringify(anthropometryHistory));
    
    // Atualizar também o peso atual quando atualizar antropometria
    const measurementDate = data.lastMeasurementDate;
    addWeightEntry(data.weight, measurementDate);
  };

  const addWeightEntry = (weight: number, date?: Date) => {
    const entryDate = date || new Date();
    const dateKey = entryDate.toISOString().split("T")[0];
    
    const newEntry: WeightEntry = {
      date: dateKey,
      weight,
      timestamp: entryDate.getTime(),
    };

    // Verificar se já existe entrada para esta data
    const updatedHistory = [...weightHistory];
    const existingIndex = updatedHistory.findIndex((e) => e.date === dateKey);
    
    if (existingIndex >= 0) {
      // Atualizar entrada existente
      updatedHistory[existingIndex] = newEntry;
    } else {
      // Adicionar nova entrada
      updatedHistory.push(newEntry);
    }

    // Ordenar por timestamp
    updatedHistory.sort((a, b) => a.timestamp - b.timestamp);
    
    setWeightHistory(updatedHistory);
    localStorage.setItem("weight_history", JSON.stringify(updatedHistory));
    
    // Atualizar peso atual se for a data mais recente
    const latestEntry = updatedHistory[updatedHistory.length - 1];
    if (latestEntry.date === dateKey) {
      setCurrentWeight(weight);
      localStorage.setItem("current_weight", weight.toString());
    }
  };

  const handleCurrentWeightSave = (weight: number, date?: Date) => {
    addWeightEntry(weight, date);
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  // Calcular peso perdido desde o primeiro registro
  const initialWeight = weightHistory.length > 0 ? weightHistory[0].weight : currentWeight;
  const weightLost = initialWeight - currentWeight;

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
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-sm font-medium text-zinc-100">
                Evolução de Peso
              </h3>
              {progress.length === 0 && (
                <p className="text-xs text-zinc-500">
                  Nenhuma pesagem registrada ainda
                </p>
              )}
            </div>
            {progress.length > 0 ? (
              <div className="flex items-end justify-between gap-1 sm:gap-2 h-48">
                {progress.map((point, idx) => {
                  const maxWeight = Math.max(...progress.map((p) => p.weight));
                  const minWeight = Math.min(...progress.map((p) => p.weight));
                  const range = maxWeight - minWeight;
                  const height = range > 0 ? ((point.weight - minWeight) / range) * 100 : 50;
                  const isLatest = idx === progress.length - 1;

                  return (
                    <div key={`${point.date}-${idx}`} className="flex-1 flex flex-col items-center gap-1.5 min-w-0">
                      <div className="w-full flex flex-col items-center justify-end h-32 relative group">
                        <div
                          className={`w-full rounded-t-lg bg-gradient-to-t transition-all ${
                            isLatest 
                              ? "from-jagger-500 to-jagger-400 ring-2 ring-jagger-400/50" 
                              : "from-jagger-600/80 to-jagger-400/80"
                          }`}
                          style={{ height: `${Math.max(height, 5)}%` }}
                        />
                        {/* Tooltip com peso exato */}
                        <div className="absolute bottom-full mb-2 hidden group-hover:block bg-zinc-900 border border-zinc-700 rounded-lg px-2 py-1 text-[10px] text-zinc-100 whitespace-nowrap z-10">
                          {point.weight}kg
                        </div>
                      </div>
                      <p className="text-[9px] text-zinc-400 text-center truncate w-full">{point.label}</p>
                      <p className={`text-[10px] font-medium ${isLatest ? "text-jagger-300" : "text-zinc-300"}`}>
                        {point.weight.toFixed(1)}kg
                      </p>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="flex items-center justify-center h-48 text-zinc-500 text-sm">
                Clique em "Peso Atual" para adicionar sua primeira pesagem
              </div>
            )}
          </section>
        </>
      )}

      {activeTab === "reports" && (() => {
        // Calcular relatórios com dados reais
        const today = new Date();
        const lastWeekStart = new Date(today);
        lastWeekStart.setDate(today.getDate() - 7);
        const lastMonthStart = new Date(today);
        lastMonthStart.setMonth(today.getMonth() - 1);

        // Função para obter score de um dia
        const getDayScore = (date: Date): number | null => {
          const dateKey = date.toISOString().split("T")[0];
          const saved = localStorage.getItem(`daily_checklist_${dateKey}`);
          if (saved) {
            try {
              const parsed = JSON.parse(saved);
              return parsed.score || null;
            } catch (e) {
              return null;
            }
          }
          return null;
        };

        // Função para verificar se treino foi completado
        const isWorkoutCompleted = (date: Date): boolean => {
          const dateKey = date.toISOString().split("T")[0];
          const saved = localStorage.getItem(`workout_${dateKey}`);
          if (saved) {
            try {
              const workout = JSON.parse(saved);
              if (workout.exercises && workout.exercises.length > 0) {
                return workout.exercises.every((ex: any) => ex.completed === true);
              }
            } catch (e) {
              return false;
            }
          }
          return false;
        };

        // Calcular dados da última semana
        const weeklyScores: number[] = [];
        const weeklyWorkouts: { completed: number; total: number } = { completed: 0, total: 0 };
        const weeklyWeightChange = (() => {
          const weekAgo = new Date(today);
          weekAgo.setDate(today.getDate() - 7);
          const weekAgoKey = weekAgo.toISOString().split("T")[0];
          const todayKey = today.toISOString().split("T")[0];
          
          const weekAgoWeight = weightHistory.find(e => e.date <= weekAgoKey);
          const todayWeightEntry = weightHistory.find(e => e.date <= todayKey);
          
          if (weekAgoWeight && todayWeightEntry) {
            return todayWeightEntry.weight - weekAgoWeight.weight;
          }
          return null;
        })();

        for (let i = 0; i < 7; i++) {
          const date = new Date(lastWeekStart);
          date.setDate(lastWeekStart.getDate() + i);
          const score = getDayScore(date);
          if (score !== null) {
            weeklyScores.push(score);
          }
          
          // Contar treinos (apenas dias de semana)
          const dayOfWeek = date.getDay();
          if (dayOfWeek !== 0 && dayOfWeek !== 6) {
            weeklyWorkouts.total++;
            if (isWorkoutCompleted(date)) {
              weeklyWorkouts.completed++;
            }
          }
        }

        const weeklyAvgScore = weeklyScores.length > 0
          ? Math.round(weeklyScores.reduce((a, b) => a + b, 0) / weeklyScores.length)
          : null;

        // Calcular dados do último mês
        const monthlyScores: number[] = [];
        const monthlyWorkouts: { completed: number; total: number } = { completed: 0, total: 0 };
        const monthlyWeightChange = (() => {
          const monthAgoKey = lastMonthStart.toISOString().split("T")[0];
          const todayKey = today.toISOString().split("T")[0];
          
          const monthAgoWeight = weightHistory.find(e => e.date <= monthAgoKey);
          const todayWeightEntry = weightHistory.find(e => e.date <= todayKey);
          
          if (monthAgoWeight && todayWeightEntry) {
            return todayWeightEntry.weight - monthAgoWeight.weight;
          }
          return null;
        })();

        const daysInMonth = Math.floor((today.getTime() - lastMonthStart.getTime()) / (1000 * 60 * 60 * 24));
        for (let i = 0; i < daysInMonth; i++) {
          const date = new Date(lastMonthStart);
          date.setDate(lastMonthStart.getDate() + i);
          const score = getDayScore(date);
          if (score !== null) {
            monthlyScores.push(score);
          }
          
          // Contar treinos (apenas dias de semana)
          const dayOfWeek = date.getDay();
          if (dayOfWeek !== 0 && dayOfWeek !== 6) {
            monthlyWorkouts.total++;
            if (isWorkoutCompleted(date)) {
              monthlyWorkouts.completed++;
            }
          }
        }

        const monthlyAvgScore = monthlyScores.length > 0
          ? Math.round(monthlyScores.reduce((a, b) => a + b, 0) / monthlyScores.length)
          : null;

        return (
          <section className="glass-panel rounded-3xl p-4">
            <h3 className="text-sm font-medium text-zinc-100 mb-4">
              Relatórios Detalhados
            </h3>
            <div className="space-y-3">
              <div className="rounded-2xl border border-zinc-800/80 bg-zinc-950/60 p-4">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-medium text-zinc-100">
                    Relatório Semanal
                  </p>
                  <span className="text-[10px] text-zinc-500">
                    Últimos 7 dias
                  </span>
                </div>
                <div className="space-y-1.5">
                  {weeklyAvgScore !== null ? (
                    <p className="text-[11px] text-zinc-400">
                      Score médio: <span className="text-zinc-100 font-medium">{weeklyAvgScore}/100</span>
                    </p>
                  ) : (
                    <p className="text-[11px] text-zinc-400">
                      Score médio: <span className="text-zinc-500">Sem dados suficientes</span>
                    </p>
                  )}
                  <p className="text-[11px] text-zinc-400">
                    Treinos completos: <span className="text-zinc-100 font-medium">{weeklyWorkouts.completed}/{weeklyWorkouts.total}</span>
                  </p>
                  {weeklyWeightChange !== null && (
                    <p className="text-[11px] text-zinc-400">
                      Variação de peso: <span className={`font-medium ${weeklyWeightChange < 0 ? "text-emerald-400" : weeklyWeightChange > 0 ? "text-red-400" : "text-zinc-100"}`}>
                        {weeklyWeightChange > 0 ? "+" : ""}{weeklyWeightChange.toFixed(1)}kg
                      </span>
                    </p>
                  )}
                </div>
              </div>

              <div className="rounded-2xl border border-zinc-800/80 bg-zinc-950/60 p-4">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-medium text-zinc-100">
                    Relatório Mensal
                  </p>
                  <span className="text-[10px] text-zinc-500">
                    Últimos 30 dias
                  </span>
                </div>
                <div className="space-y-1.5">
                  {monthlyAvgScore !== null ? (
                    <p className="text-[11px] text-zinc-400">
                      Score médio: <span className="text-zinc-100 font-medium">{monthlyAvgScore}/100</span>
                    </p>
                  ) : (
                    <p className="text-[11px] text-zinc-400">
                      Score médio: <span className="text-zinc-500">Sem dados suficientes</span>
                    </p>
                  )}
                  <p className="text-[11px] text-zinc-400">
                    Treinos completos: <span className="text-zinc-100 font-medium">{monthlyWorkouts.completed}/{monthlyWorkouts.total}</span>
                  </p>
                  {monthlyWeightChange !== null && (
                    <p className="text-[11px] text-zinc-400">
                      Variação de peso: <span className={`font-medium ${monthlyWeightChange < 0 ? "text-emerald-400" : monthlyWeightChange > 0 ? "text-red-400" : "text-zinc-100"}`}>
                        {monthlyWeightChange > 0 ? "+" : ""}{monthlyWeightChange.toFixed(1)}kg
                      </span>
                    </p>
                  )}
                </div>
              </div>

              <div className="rounded-2xl border border-zinc-800/80 bg-zinc-950/60 p-4">
                <p className="text-xs font-medium text-zinc-100 mb-2">
                  Evolução de Peso
                </p>
                <div className="space-y-1.5">
                  {weightHistory.length > 0 ? (
                    <>
                      <p className="text-[11px] text-zinc-400">
                        Peso inicial: <span className="text-zinc-100 font-medium">{weightHistory[0].weight.toFixed(1)}kg</span>
                      </p>
                      <p className="text-[11px] text-zinc-400">
                        Peso atual: <span className="text-zinc-100 font-medium">{currentWeight.toFixed(1)}kg</span>
                      </p>
                      <p className="text-[11px] text-zinc-400">
                        Total de pesagens: <span className="text-zinc-100 font-medium">{weightHistory.length}</span>
                      </p>
                      {weightLost !== 0 && (
                        <p className="text-[11px] text-zinc-400">
                          Progresso total: <span className={`font-medium ${weightLost > 0 ? "text-emerald-400" : "text-red-400"}`}>
                            {weightLost > 0 ? "-" : "+"}{Math.abs(weightLost).toFixed(1)}kg
                          </span>
                        </p>
                      )}
                    </>
                  ) : (
                    <p className="text-[11px] text-zinc-500">
                      Nenhuma pesagem registrada ainda
                    </p>
                  )}
                </div>
              </div>

              {/* Antropometria e Composição Corporal */}
              {(() => {
                // Carregar histórico de antropometria
                const anthropometryHistory = (() => {
                  const saved = localStorage.getItem("anthropometry_history");
                  if (saved) {
                    try {
                      return JSON.parse(saved);
                    } catch (e) {
                      return [];
                    }
                  }
                  // Se não tiver histórico, usar dados atuais como primeira entrada
                  if (anthropometry.lastMeasurementDate) {
                    return [{
                      date: anthropometry.lastMeasurementDate.toISOString().split("T")[0],
                      leanMass: anthropometry.leanMass,
                      fatPercentage: anthropometry.fatPercentage,
                      weight: anthropometry.weight,
                    }];
                  }
                  return [];
                })();

                const firstMeasurement = anthropometryHistory.length > 0 ? anthropometryHistory[0] : null;
                const latestMeasurement = anthropometryHistory.length > 0 
                  ? anthropometryHistory[anthropometryHistory.length - 1]
                  : anthropometry;

                const leanMassChange = firstMeasurement && latestMeasurement
                  ? latestMeasurement.leanMass - firstMeasurement.leanMass
                  : null;

                const fatPercentageChange = firstMeasurement && latestMeasurement
                  ? firstMeasurement.fatPercentage - latestMeasurement.fatPercentage
                  : null;

                return (
                  <div className="rounded-2xl border border-zinc-800/80 bg-zinc-950/60 p-4">
                    <p className="text-xs font-medium text-zinc-100 mb-2">
                      Composição Corporal
                    </p>
                    <div className="space-y-1.5">
                      {firstMeasurement ? (
                        <>
                          <p className="text-[11px] text-zinc-400">
                            Massa magra inicial: <span className="text-zinc-100 font-medium">{firstMeasurement.leanMass.toFixed(1)}kg</span>
                          </p>
                          <p className="text-[11px] text-zinc-400">
                            Massa magra atual: <span className="text-zinc-100 font-medium">{latestMeasurement.leanMass.toFixed(1)}kg</span>
                          </p>
                          {leanMassChange !== null && leanMassChange !== 0 && (
                            <p className="text-[11px] text-zinc-400">
                              Ganho de massa magra: <span className={`font-medium ${leanMassChange > 0 ? "text-emerald-400" : "text-red-400"}`}>
                                {leanMassChange > 0 ? "+" : ""}{leanMassChange.toFixed(1)}kg
                              </span>
                            </p>
                          )}
                          <p className="text-[11px] text-zinc-400 mt-2">
                            % Gordura inicial: <span className="text-zinc-100 font-medium">{firstMeasurement.fatPercentage.toFixed(1)}%</span>
                          </p>
                          <p className="text-[11px] text-zinc-400">
                            % Gordura atual: <span className="text-zinc-100 font-medium">{latestMeasurement.fatPercentage.toFixed(1)}%</span>
                          </p>
                          {fatPercentageChange !== null && fatPercentageChange !== 0 && (
                            <p className="text-[11px] text-zinc-400">
                              Redução de gordura: <span className={`font-medium ${fatPercentageChange > 0 ? "text-emerald-400" : "text-red-400"}`}>
                                {fatPercentageChange > 0 ? "-" : "+"}{Math.abs(fatPercentageChange).toFixed(1)}%
                              </span>
                            </p>
                          )}
                        </>
                      ) : (
                        <p className="text-[11px] text-zinc-500">
                          Nenhuma medição de antropometria registrada ainda
                        </p>
                      )}
                    </div>
                  </div>
                );
              })()}

              {/* Métricas Calóricas */}
              {(() => {
                const DAILY_CALORIE_GOAL = 1600; // Meta calórica diária
                
                // Calcular TMB atual
                const currentUserProfile: UserProfile = {
                  weight: currentWeight,
                  height: 165,
                  birthDate: "2003-06-15",
                  gender: "male",
                  leanBodyMass: anthropometry.leanMass,
                };
                const currentBMR = calculateBMR(currentUserProfile);

                // Calcular médias da última semana
                const weeklyExpenditures: number[] = [];
                const weeklyConsumed: number[] = [];
                const weeklyDeficits: number[] = [];

                for (let i = 0; i < 7; i++) {
                  const date = new Date(lastWeekStart);
                  date.setDate(lastWeekStart.getDate() + i);
                  const dateKey = date.toISOString().split("T")[0];

                  // Calcular gasto do dia
                  const savedActivities = localStorage.getItem(`activities_${dateKey}`);
                  let activities: PhysicalActivity[] = [];
                  if (savedActivities) {
                    try {
                      activities = JSON.parse(savedActivities);
                    } catch (e) {
                      activities = [];
                    }
                  }
                  const activityCalories = activities.reduce((sum, a) => sum + a.caloriesBurned, 0);
                  const dailyExpenditure = currentBMR + activityCalories;
                  weeklyExpenditures.push(dailyExpenditure);

                  // Calcular consumido do dia - ler de selectedMeals
                  const savedSelectedMeals = localStorage.getItem("selectedMeals");
                  let consumed = 0;
                  if (savedSelectedMeals) {
                    try {
                      const selectedMeals = JSON.parse(savedSelectedMeals);
                      const dayMeals = selectedMeals.filter((m: any) => m.date === dateKey);
                      
                      // Calcular calorias das refeições selecionadas
                      // Ler receitas e quick foods do localStorage
                      const recipes = JSON.parse(localStorage.getItem("recipe_library") || "[]");
                      const quickFoods = JSON.parse(localStorage.getItem("quickfood_library") || "[]");
                      
                      dayMeals.forEach((meal: any) => {
                        // Procurar na receita ou quick food
                        const recipe = recipes.find((r: any) => r.id === meal.optionId);
                        const quickFood = quickFoods.find((qf: any) => qf.id === meal.optionId);
                        
                        if (recipe) {
                          consumed += recipe.totalCalories || 0;
                        } else if (quickFood) {
                          consumed += quickFood.totalCalories || 0;
                        }
                      });
                    } catch (e) {
                      consumed = 0;
                    }
                  }
                  weeklyConsumed.push(consumed);

                  // Calcular déficit
                  const deficit = dailyExpenditure - consumed;
                  weeklyDeficits.push(deficit);
                }

                const avgExpenditure = weeklyExpenditures.length > 0
                  ? Math.round(weeklyExpenditures.reduce((a, b) => a + b, 0) / weeklyExpenditures.length)
                  : null;

                const avgConsumed = weeklyConsumed.length > 0
                  ? Math.round(weeklyConsumed.reduce((a, b) => a + b, 0) / weeklyConsumed.length)
                  : null;

                const avgDeficit = weeklyDeficits.length > 0
                  ? Math.round(weeklyDeficits.reduce((a, b) => a + b, 0) / weeklyDeficits.length)
                  : null;

                return (
                  <div className="rounded-2xl border border-zinc-800/80 bg-zinc-950/60 p-4">
                    <p className="text-xs font-medium text-zinc-100 mb-2">
                      Métricas Calóricas (Última Semana)
                    </p>
                    <div className="space-y-1.5">
                      {avgExpenditure !== null && (
                        <p className="text-[11px] text-zinc-400">
                          Gasto médio diário: <span className="text-zinc-100 font-medium">{avgExpenditure}kcal</span>
                        </p>
                      )}
                      {avgConsumed !== null && avgConsumed > 0 && (
                        <p className="text-[11px] text-zinc-400">
                          Consumo médio diário: <span className="text-zinc-100 font-medium">{avgConsumed}kcal</span>
                        </p>
                      )}
                      {avgDeficit !== null && (
                        <p className="text-[11px] text-zinc-400">
                          Déficit médio diário: <span className={`font-medium ${avgDeficit > 0 ? "text-emerald-400" : avgDeficit < 0 ? "text-red-400" : "text-zinc-100"}`}>
                            {avgDeficit > 0 ? "+" : ""}{avgDeficit}kcal
                          </span>
                        </p>
                      )}
                      <p className="text-[11px] text-zinc-400">
                        Meta calórica: <span className="text-zinc-100 font-medium">{DAILY_CALORIE_GOAL}kcal</span>
                      </p>
                      {avgConsumed !== null && avgConsumed > 0 && (
                        <p className="text-[11px] text-zinc-400">
                          Diferença da meta: <span className={`font-medium ${avgConsumed <= DAILY_CALORIE_GOAL ? "text-emerald-400" : "text-red-400"}`}>
                            {avgConsumed <= DAILY_CALORIE_GOAL ? "-" : "+"}{Math.abs(avgConsumed - DAILY_CALORIE_GOAL)}kcal
                          </span>
                        </p>
                      )}
                    </div>
                  </div>
                );
              })()}
            </div>
          </section>
        );
      })()}

      {activeTab === "settings" && (
        <section className="glass-panel rounded-3xl p-4">
          <h3 className="text-sm font-medium text-zinc-100 mb-4">
            Configurações
          </h3>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <button 
              onClick={() => setActiveTab("checklist-config")}
              className="flex flex-col items-start gap-2 rounded-2xl border border-zinc-800/80 bg-zinc-950/60 p-4 text-left hover:border-jagger-400/60 hover:bg-zinc-900/60 transition-colors"
            >
              <div className="flex items-center gap-2">
                <span className="text-xl">✅</span>
                <span className="text-sm font-medium text-zinc-100">Checklist Diário</span>
              </div>
              <p className="text-xs text-zinc-400">
                Ajustar perguntas e missões diárias
              </p>
            </button>

            <button 
              onClick={() => router.push("/perfil/treino")}
              className="flex flex-col items-start gap-2 rounded-2xl border border-zinc-800/80 bg-zinc-950/60 p-4 text-left hover:border-jagger-400/60 hover:bg-zinc-900/60 transition-colors"
            >
              <div className="flex items-center gap-2">
                <span className="text-xl">💪</span>
                <span className="text-sm font-medium text-zinc-100">Treinos</span>
              </div>
              <p className="text-xs text-zinc-400">
                Adicionar, editar exercícios, vídeos e GIFs
              </p>
            </button>

            <button 
              onClick={() => router.push("/perfil/jejum")}
              className="flex flex-col items-start gap-2 rounded-2xl border border-zinc-800/80 bg-zinc-950/60 p-4 text-left hover:border-jagger-400/60 hover:bg-zinc-900/60 transition-colors"
            >
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

      {activeTab === "checklist-config" && (
        <section className="glass-panel rounded-3xl p-4">
          <ChecklistConfig onClose={() => setActiveTab("settings")} />
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
        includeDate={true}
      />

      <WeightModal
        isOpen={isTargetWeightModalOpen}
        onClose={() => setIsTargetWeightModalOpen(false)}
        initialValue={targetWeight}
        label="Meta"
        onSave={(value) => {
          setTargetWeight(value);
          localStorage.setItem("target_weight", value.toString());
        }}
        includeDate={false}
      />
    </div>
  );
}

export default function PerfilPage() {
  return (
    <Suspense fallback={
      <div className="flex flex-1 items-center justify-center">
        <div className="text-zinc-400">Carregando...</div>
      </div>
    }>
      <PerfilPageContent />
    </Suspense>
  );
}
