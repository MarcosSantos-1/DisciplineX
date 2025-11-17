"use client";

import { useState } from "react";

type MacroData = {
  label: string;
  consumed: number;
  limit: number;
  color: string;
  gradient: string;
};

type CircularChartProps = {
  calories: {
    consumed: number;
    limit: number;
    burned: number; // Gasto total do dia (TMB + atividades)
  };
  macros: {
    protein: MacroData;
    carbs: MacroData;
    fat: MacroData;
  };
};

function CircularProgress({
  percentage,
  size = 120,
  strokeWidth = 10,
  gradientId,
  gradientColors,
  label,
  value,
  unit,
  className = "",
}: {
  percentage: number;
  size?: number;
  strokeWidth?: number;
  gradientId: string;
  gradientColors: { from: string; to: string };
  label: string;
  value: number | string;
  unit: string;
  className?: string;
}) {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (percentage / 100) * circumference;

  return (
    <div className={`flex flex-col items-center ${className}`}>
      <div className="relative" style={{ width: size, height: size }}>
        <svg
          width={size}
          height={size}
          className="transform -rotate-90"
        >
          <defs>
            <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor={gradientColors.from} />
              <stop offset="100%" stopColor={gradientColors.to} />
            </linearGradient>
          </defs>
          {/* Background circle */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke="currentColor"
            strokeWidth={strokeWidth}
            fill="none"
            className="text-zinc-800"
          />
          {/* Progress circle */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={`url(#${gradientId})`}
            strokeWidth={strokeWidth}
            fill="none"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
            className="transition-all duration-500"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-lg font-bold text-zinc-50">{value}</span>
          <span className="text-[10px] text-zinc-400 uppercase tracking-wider">{unit}</span>
        </div>
      </div>
      <p className="mt-2 text-[11px] text-zinc-400 text-center">{label}</p>
    </div>
  );
}

export function CircularChart({ calories, macros }: CircularChartProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const calPercentage = Math.min((calories.consumed / calories.limit) * 100, 100);
  const proteinPercentage = Math.min((macros.protein.consumed / macros.protein.limit) * 100, 100);
  const carbsPercentage = Math.min((macros.carbs.consumed / macros.carbs.limit) * 100, 100);
  const fatPercentage = Math.min((macros.fat.consumed / macros.fat.limit) * 100, 100);

  return (
    <div className="glass-panel rounded-3xl p-4">
      <div className="flex items-center justify-between gap-2 mb-3">
        <h3 className="text-sm font-medium text-zinc-100">
          Balanço Calórico de Hoje
        </h3>
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="rounded-full bg-zinc-900 px-2 py-0.5 text-[11px] text-zinc-400 hover:text-zinc-200 transition-colors"
        >
          {isExpanded ? "Recolher" : "Expandir"}
        </button>
      </div>

      <div className="flex flex-col items-center">
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="cursor-pointer"
        >
          <CircularProgress
            percentage={calPercentage}
            size={140}
            strokeWidth={12}
            gradientId="calories-gradient"
            gradientColors={{ from: "#22d3ee", to: "#10b981" }}
            label="Calorias"
            value={calories.consumed}
            unit="kcal"
          />
        </button>

        <div className="mt-4 grid grid-cols-3 gap-3 text-xs w-full">
          <div className="rounded-2xl bg-zinc-950/60 px-2 py-2 text-center">
            <p className="text-[10px] text-zinc-400">Meta</p>
            <p className="mt-0.5 text-base font-semibold text-zinc-50">
              {calories.limit.toLocaleString()}
            </p>
            <p className="text-[10px] text-zinc-500">kcal</p>
          </div>
          <div className="rounded-2xl bg-zinc-950/60 px-2 py-2 text-center">
            <p className="text-[10px] text-zinc-400">🔥 Consumido</p>
            <p className="mt-0.5 text-base font-semibold text-amber-300">
              {calories.consumed.toLocaleString()}
            </p>
            <p className="text-[10px] text-zinc-500">kcal</p>
          </div>
          <div className="rounded-2xl bg-zinc-950/60 px-2 py-2 text-center">
            <p className="text-[10px] text-zinc-400">⚡ Gasto Total</p>
            <p className="mt-0.5 text-base font-semibold text-emerald-300">
              {calories.burned.toLocaleString()}
            </p>
            <p className="text-[10px] text-zinc-500">kcal</p>
          </div>
        </div>
      </div>

      {isExpanded && (
        <div className="mt-6 pt-4 border-t border-zinc-800/80">
          <p className="text-xs font-medium text-zinc-300 mb-4 text-center">
            Macros Nutricionais
          </p>
          <div className="grid grid-cols-3 gap-3 sm:gap-4">
            <CircularProgress
              percentage={proteinPercentage}
              size={90}
              strokeWidth={8}
              gradientId="protein-gradient"
              gradientColors={{ from: "#ef4444", to: "#f97316" }}
              label="Proteína"
              value={`${macros.protein.consumed}g`}
              unit={`/${macros.protein.limit}g`}
              className="sm:scale-110"
            />
            <CircularProgress
              percentage={carbsPercentage}
              size={90}
              strokeWidth={8}
              gradientId="carbs-gradient"
              gradientColors={{ from: "#3b82f6", to: "#06b6d4" }}
              label="Carboidratos"
              value={`${macros.carbs.consumed}g`}
              unit={`/${macros.carbs.limit}g`}
              className="sm:scale-110"
            />
            <CircularProgress
              percentage={fatPercentage}
              size={90}
              strokeWidth={8}
              gradientId="fat-gradient"
              gradientColors={{ from: "#eab308", to: "#f59e0b" }}
              label="Gorduras"
              value={`${macros.fat.consumed}g`}
              unit={`/${macros.fat.limit}g`}
              className="sm:scale-110"
            />
          </div>
        </div>
      )}
    </div>
  );
}

