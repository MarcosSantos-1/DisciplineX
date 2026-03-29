"use client";

import {
  useState,
  useEffect,
  useMemo,
  useCallback,
  useRef,
  useId,
  useSyncExternalStore,
  Suspense,
} from "react";
import { createPortal } from "react-dom";
import { useSearchParams, useRouter } from "next/navigation";
import { ChecklistConfig } from "@/components/ChecklistConfig";
import { MealConfig } from "@/components/MealConfig";
import { calculateBMR, UserProfile, PhysicalActivity } from "@/types/meals";
import { profileService, checklistService, workoutService, mealService, libraryService } from "@/lib/firebaseService";

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

/** Domingo → sábado (primeira coluna do gráfico). */
const WEEKDAY_LABELS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"] as const;

function toLocalDateKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/**
 * Aceita variações do Firebase (mês/dia sem zero) e devolve sempre YYYY-MM-DD.
 * Sem isso, localeCompare("2025-11-03", "2025-3-15") ordena errado (nov antes de mar).
 */
function canonicalDateKey(raw: string): string | null {
  if (!raw || typeof raw !== "string") return null;
  const s = raw.trim();
  const m = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(s);
  if (m) {
    const y = Number(m[1]);
    const mo = Number(m[2]);
    const d = Number(m[3]);
    if (y < 1970 || y > 2100 || mo < 1 || mo > 12 || d < 1 || d > 31) return null;
    const dt = new Date(y, mo - 1, d, 12, 0, 0, 0);
    if (
      dt.getFullYear() !== y ||
      dt.getMonth() !== mo - 1 ||
      dt.getDate() !== d
    ) {
      return null;
    }
    return `${y}-${String(mo).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
  }
  const t = Date.parse(s);
  if (Number.isNaN(t)) return null;
  return toLocalDateKey(new Date(t));
}

/** Meio-dia local; só use com chave já canônica ou após canonicalDateKey. */
function timestampFromDateKey(dateKey: string): number {
  const parts = dateKey.split("-").map(Number);
  if (parts.length !== 3 || parts.some((n) => Number.isNaN(n))) return 0;
  const [y, mo, d] = parts;
  return new Date(y, mo - 1, d, 12, 0, 0, 0).getTime();
}

function stripDate(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

/**
 * Ciclo Março (1º de março, ano N) → último dia de Fevereiro (ano N+1).
 * Em janeiro e fevereiro ainda vale o ciclo que começou no março anterior.
 */
function getMarCycleBounds(today: Date): { rangeStart: Date; rangeEnd: Date } {
  const y = today.getFullYear();
  const month = today.getMonth();
  const cycleStartYear = month < 2 ? y - 1 : y;
  const rangeStart = stripDate(new Date(cycleStartYear, 2, 1));
  const rangeEnd = stripDate(new Date(cycleStartYear + 1, 2, 0));
  return { rangeStart, rangeEnd };
}

/** Semanas (colunas), domingo no topo; fora do intervalo do ciclo = null. */
function buildContributionGrid(today: Date): (Date | null)[][] {
  const { rangeStart, rangeEnd } = getMarCycleBounds(today);

  const gridStart = new Date(rangeStart);
  gridStart.setDate(gridStart.getDate() - gridStart.getDay());

  const gridEnd = new Date(rangeEnd);
  gridEnd.setDate(gridEnd.getDate() + (6 - gridEnd.getDay()));

  const days: (Date | null)[] = [];
  for (
    let d = new Date(gridStart);
    d <= gridEnd;
    d.setDate(d.getDate() + 1)
  ) {
    const cur = stripDate(d);
    if (cur < rangeStart || cur > rangeEnd) {
      days.push(null);
    } else {
      days.push(new Date(cur));
    }
  }

  const weeks: (Date | null)[][] = [];
  for (let i = 0; i < days.length; i += 7) {
    weeks.push(days.slice(i, i + 7));
  }
  return weeks;
}

function formatContributionTooltipDay(date: Date): string {
  return date.toLocaleDateString("pt-BR", {
    day: "numeric",
    month: "short",
  });
}

function normalizeWeightEntry(e: WeightEntry): WeightEntry | null {
  const w = Number(e.weight);
  if (Number.isNaN(w)) return null;
  const dateCanon = canonicalDateKey(String(e.date ?? ""));
  if (!dateCanon) return null;
  return {
    ...e,
    date: dateCanon,
    weight: w,
    timestamp: timestampFromDateKey(dateCanon),
  };
}

/** Abaixo do breakpoint sm (639px): layout mobile do gráfico de peso */
function useIsBelowSm(): boolean {
  return useSyncExternalStore(
    (onStoreChange) => {
      const mq = window.matchMedia("(max-width: 639px)");
      mq.addEventListener("change", onStoreChange);
      return () => mq.removeEventListener("change", onStoreChange);
    },
    () => window.matchMedia("(max-width: 639px)").matches,
    () => false
  );
}

/**
 * Primeiro, último e 2 índices intermediários uniformes (máx. 4 pontos).
 * O último índice é sempre a pesagem mais recente.
 */
function selectFourPointsForMobileChart(points: ProgressPoint[]): ProgressPoint[] {
  const L = points.length;
  if (L <= 4) return points;
  const idx = new Set<number>();
  for (let k = 0; k < 4; k++) {
    idx.add(Math.round((k * (L - 1)) / 3));
  }
  return [...idx].sort((a, b) => a - b).map((i) => points[i]);
}

function WeightEvolutionChart({
  points,
  yExtent,
  compactLegend,
}: {
  points: ProgressPoint[];
  /** Escala vertical usando série completa (evita achatar o recorte mobile) */
  yExtent?: { min: number; max: number } | null;
  /** Legenda em grelha fixa no card (mobile) */
  compactLegend?: boolean;
}) {
  const gradId = useId().replace(/:/g, "");

  const { linePath, areaPath, circles, yMin, yMax, vbW, vbH } = useMemo(() => {
    const weights = points.map((p) => p.weight);
    const minW = yExtent ? yExtent.min : Math.min(...weights);
    const maxW = yExtent ? yExtent.max : Math.max(...weights);
    const span = maxW - minW;
    const pad = span > 0 ? Math.max(span * 0.12, 0.5) : 2;
    const yMinV = minW - pad;
    const yMaxV = maxW + pad;
    const yRange = yMaxV - yMinV || 1;
    const n = points.length;
    /** viewBox 2:1 — mesma proporção do container (evita elipse com preserveAspectRatio none) */
    const VB_W = 200;
    const VB_H = 100;
    const xPad = 10;
    const yTop = 8;
    const yBottom = 92;
    const usableY = yBottom - yTop;

    const xy = points.map((p, i) => {
      const x =
        n === 1
          ? VB_W / 2
          : xPad + (i / (n - 1)) * (VB_W - 2 * xPad);
      const t = (p.weight - yMinV) / yRange;
      const y = yBottom - t * usableY;
      return { x, y: Math.max(yTop, Math.min(yBottom, y)) };
    });

    const dLine = xy
      .map((pt, i) => `${i === 0 ? "M" : "L"} ${pt.x} ${pt.y}`)
      .join(" ");
    const dArea = `M ${xy[0].x} ${yBottom} ${xy
      .map((pt) => `L ${pt.x} ${pt.y}`)
      .join(" ")} L ${xy[xy.length - 1].x} ${yBottom} Z`;

    return {
      linePath: dLine,
      areaPath: dArea,
      circles: xy,
      yMin: yMinV,
      yMax: yMaxV,
      vbW: VB_W,
      vbH: VB_H,
    };
  }, [points, yExtent]);

  const legendGridClass =
    compactLegend && points.length > 0
      ? points.length === 1
        ? "grid grid-cols-1 gap-1"
        : points.length === 2
          ? "grid grid-cols-2 gap-1"
          : points.length === 3
            ? "grid grid-cols-3 gap-1"
            : "grid grid-cols-4 gap-0.5"
      : "";

  const desktopDotR = points.length === 1 ? 1.65 : 1.25;
  const mobileDotR = points.length === 1 ? 2.8 : 2;
  const dotR = compactLegend ? mobileDotR : desktopDotR;
  const dotStroke = compactLegend ? 0.5 : 0.4;

  const legendCells = points.map((point, idx) => (
    <div key={point.date} className="min-w-0 px-0.5">
      <p className="truncate text-[9px] leading-tight text-zinc-500">{point.label}</p>
      <p
        className={`mt-0.5 text-[11px] font-medium tabular-nums ${
          idx === points.length - 1 ? "text-jagger-300" : "text-zinc-300"
        }`}
      >
        {point.weight.toFixed(1)} kg
      </p>
    </div>
  ));

  return (
    <div className="flex min-w-0 w-full flex-col gap-2">
      <div className="w-full min-w-0 max-w-full overflow-hidden rounded-xl border border-zinc-800/80 bg-zinc-950/40 px-2 pt-2 pb-1 sm:px-3 sm:pt-2">
        <div className="flex min-w-0 gap-1.5 sm:gap-2">
          <div className="flex w-7 shrink-0 flex-col justify-between py-1 text-[9px] tabular-nums leading-none text-zinc-500 sm:w-8">
            <span>{yMax.toFixed(1)}</span>
            <span>{yMin.toFixed(1)}</span>
          </div>
          <div className="flex min-w-0 flex-1 flex-col gap-1.5 sm:gap-2">
            {/* viewBox 2:1 = proporção da área — escala uniforme (sem achatar círculos) */}
            <div className="aspect-[2/1] w-full max-h-[11rem] sm:max-h-[13.5rem]">
              <svg
                viewBox={`0 0 ${vbW} ${vbH}`}
                className="h-full w-full text-jagger-400"
                preserveAspectRatio="none"
                aria-hidden
              >
                <defs>
                  <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#0ea5e9" stopOpacity="0.35" />
                    <stop offset="100%" stopColor="#09090b" stopOpacity="0" />
                  </linearGradient>
                </defs>
                {[0, 0.25, 0.5, 0.75, 1].map((t) => {
                  const y = 8 + (1 - t) * 84;
                  return (
                    <line
                      key={t}
                      x1="0"
                      x2={vbW}
                      y1={y}
                      y2={y}
                      className="stroke-zinc-800/60"
                      strokeWidth="0.35"
                      vectorEffect="non-scaling-stroke"
                    />
                  );
                })}
                <path d={areaPath} fill={`url(#${gradId})`} />
                <path
                  d={linePath}
                  fill="none"
                  className="stroke-jagger-400"
                  strokeWidth={compactLegend ? 1.25 : 1.05}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  vectorEffect="non-scaling-stroke"
                />
                {circles.map((pt, i) => (
                  <circle
                    key={`${points[i].date}-${i}`}
                    cx={pt.x}
                    cy={pt.y}
                    r={dotR}
                    className="fill-zinc-100 stroke-jagger-500"
                    strokeWidth={dotStroke}
                    vectorEffect="non-scaling-stroke"
                  />
                ))}
              </svg>
            </div>
            {/* Desktop: mesma largura do SVG — colunas alinhadas às bolinhas */}
            {!compactLegend && points.length > 0 && (
              <div
                className="grid w-full gap-x-0.5 text-center sm:gap-x-1"
                style={{
                  gridTemplateColumns: `repeat(${points.length}, minmax(0, 1fr))`,
                }}
              >
                {legendCells}
              </div>
            )}
          </div>
        </div>
      </div>
      {compactLegend && (
        <div className="w-full min-w-0 px-0.5 pb-0.5 sm:px-0">
          <div className={`text-center ${legendGridClass}`}>{legendCells}</div>
        </div>
      )}
    </div>
  );
}

/** Rótulo do mês na coluna da semana em que cai o dia 1 (estilo GitHub). */
function monthLabelForContributionWeek(week: (Date | null)[]): string | null {
  for (const d of week) {
    if (!d) continue;
    if (d.getDate() === 1) {
      const raw = d.toLocaleDateString("pt-BR", { month: "short" });
      const cleaned = raw.replace(/\.$/, "").trim();
      return (
        cleaned.charAt(0).toLocaleUpperCase("pt-BR") + cleaned.slice(1)
      );
    }
  }
  return null;
}

function MetaContributionHeatmap({
  weeks,
  scores,
}: {
  weeks: (Date | null)[][];
  scores: Record<string, number | null>;
}) {
  const [tip, setTip] = useState<{
    text: string;
    x: number;
    y: number;
    placement: "above" | "below";
  } | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const clearTip = useCallback(() => setTip(null), []);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const clear = () => setTip(null);
    window.addEventListener("scroll", clear, true);
    el.addEventListener("scroll", clear);
    return () => {
      window.removeEventListener("scroll", clear, true);
      el.removeEventListener("scroll", clear);
    };
  }, [weeks]);

  const showTip = (
    el: HTMLElement,
    day: Date,
    score: number | null | undefined
  ) => {
    const r = el.getBoundingClientRect();
    const t = `${formatContributionTooltipDay(day)}${
      score != null ? ` · ${score}%` : " · sem registro"
    }`;
    const spaceAbove = r.top;
    const placement: "above" | "below" = spaceAbove > 40 ? "above" : "below";
    setTip({
      text: t,
      x: r.left + r.width / 2,
      y: placement === "above" ? r.top : r.bottom,
      placement,
    });
  };

  const tooltip =
    tip &&
    createPortal(
      <div
        className="pointer-events-none fixed z-[400] max-w-[min(90vw,16rem)] whitespace-normal rounded-md border border-zinc-600/90 bg-zinc-900/98 px-1.5 py-1.5 text-center text-[10px] leading-snug text-zinc-100 shadow-xl backdrop-blur-sm"
        style={{
          left: tip.x,
          top: tip.placement === "above" ? tip.y - 6 : tip.y + 6,
          transform:
            tip.placement === "above"
              ? "translate(-50%, -100%)"
              : "translate(-50%, 0)",
        }}
        role="tooltip"
      >
        {tip.text}
      </div>,
      document.body
    );

  return (
    <>
      {tooltip}
      <div className="w-full min-w-0">
        <div
          ref={scrollRef}
          className="w-full max-w-full overflow-x-auto overflow-y-visible pb-1 scrollbar-hide touch-pan-x"
        >
          <div className="inline-flex w-max max-w-none items-stretch gap-1.5 sm:gap-2">
            <div
              className="flex shrink-0 flex-col gap-[3px] pl-0.5 sm:pl-1"
              aria-hidden
            >
              <div className="h-4 shrink-0" />
              {WEEKDAY_LABELS.map((label, i) => (
                <div
                  key={i}
                  className="flex h-3 min-w-[2.25rem] shrink-0 items-center justify-start text-left text-[10px] font-medium leading-tight text-zinc-300 sm:h-3.5 sm:min-w-[2.5rem]"
                >
                  {label}
                </div>
              ))}
            </div>
            <div className="flex gap-[3px]">
              {weeks.map((week, wi) => {
                const monthLabel = monthLabelForContributionWeek(week);
                return (
                  <div
                    key={wi}
                    className="flex flex-col items-center gap-1"
                  >
                    <div className="flex h-4 w-3 shrink-0 items-end justify-center sm:w-3.5">
                      <span className="text-center text-[9px] leading-none text-zinc-500">
                        {monthLabel ?? "\u00a0"}
                      </span>
                    </div>
                    <div className="flex flex-col gap-[3px]">
                      {week.map((day, di) => {
                        if (!day) {
                          return (
                            <div
                              key={`empty-${wi}-${di}`}
                              className="aspect-square h-3 w-3 shrink-0 rounded-[3px] bg-transparent sm:h-3.5 sm:w-3.5"
                              aria-hidden
                            />
                          );
                        }
                        const key = toLocalDateKey(day);
                        const score = scores[key];
                        const tipText = `${formatContributionTooltipDay(day)}${
                          score != null ? ` · ${score}%` : " · sem registro"
                        }`;

                        let cellClass =
                          "aspect-square h-3 w-3 shrink-0 rounded-[3px] border sm:h-3.5 sm:w-3.5 ";
                        if (score === null || score === undefined) {
                          cellClass += "bg-zinc-800/75 border-zinc-700/45";
                        } else if (score <= 60) {
                          cellClass += "bg-zinc-700/55 border-zinc-600/35";
                        } else if (score <= 85) {
                          cellClass += "bg-emerald-600/50 border-emerald-500/35";
                        } else {
                          cellClass += "bg-emerald-700 border-emerald-600/40";
                        }

                        return (
                          <div
                            key={key}
                            tabIndex={0}
                            className={`group relative outline-none focus-visible:ring-2 focus-visible:ring-jagger-400/40 focus-visible:ring-offset-1 focus-visible:ring-offset-zinc-950 ${cellClass}`}
                            title={tipText}
                            onMouseEnter={(e) =>
                              showTip(e.currentTarget, day, score)
                            }
                            onMouseLeave={clearTip}
                            onFocus={(e) => showTip(e.currentTarget, day, score)}
                            onBlur={clearTip}
                          />
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

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
  const tabParam = searchParams.get("tab");
  const initialTab =
    tabParam === "checklist-config"
      ? "checklist-config"
      : tabParam === "meal-config"
        ? "meal-config"
        : tabParam === "settings"
          ? "settings"
          : "overview";

  const [activeTab, setActiveTab] = useState<
    "overview" | "reports" | "settings" | "checklist-config" | "meal-config"
  >(initialTab);

  // Atualizar quando a URL mudar
  useEffect(() => {
    const tab = searchParams.get("tab");
    if (tab === "checklist-config") {
      setActiveTab("checklist-config");
    } else if (tab === "meal-config") {
      setActiveTab("meal-config");
    } else if (tab === "settings") {
      setActiveTab("settings");
    }
  }, [searchParams]);
  const [currentWeight, setCurrentWeight] = useState(92);
  const [targetWeight, setTargetWeight] = useState(72);
  const [anthropometry, setAnthropometry] = useState<AnthropometryData>({
    weight: 94,
    leanMass: 63.4,
    fatMass: 31.2,
    fatPercentage: 33,
    lastMeasurementDate: new Date(2024, 10, 10),
  });
  const [weightHistory, setWeightHistory] = useState<WeightEntry[]>([]);

  // Carregar dados do Firebase
  useEffect(() => {
    const loadData = async () => {
      let loadedWeight = 92;
      try {
        loadedWeight = await profileService.getCurrentWeight();
        setCurrentWeight(loadedWeight);
      } catch (e) {
        console.error("Erro ao carregar peso atual:", e);
      }

      try {
        const target = await profileService.getTargetWeight();
        setTargetWeight(target);
      } catch (e) {
        console.error("Erro ao carregar meta de peso:", e);
      }

      try {
        const history = await profileService.getWeightHistory();
        const normalized = history
          .map(normalizeWeightEntry)
          .filter((e): e is WeightEntry => e !== null);
        if (normalized.length > 0) {
          normalized.sort((a, b) => a.date.localeCompare(b.date));
          setWeightHistory(normalized);
        } else {
          const todayKey = toLocalDateKey(new Date());
          setWeightHistory([
            {
              date: todayKey,
              weight: loadedWeight,
              timestamp: timestampFromDateKey(todayKey),
            },
          ]);
        }
      } catch (e) {
        console.error("Erro ao carregar histórico de peso:", e);
      }

      try {
        const anthro = await profileService.getAnthropometry();
        if (anthro) {
          setAnthropometry(anthro);
        }
      } catch (e) {
        console.error("Erro ao carregar antropometria:", e);
      }
    };
    loadData();
  }, []);

  const progress: ProgressPoint[] = useMemo(() => {
    const byDate = new Map<string, WeightEntry>();
    for (const e of weightHistory) {
      const n = normalizeWeightEntry(e);
      if (!n) continue;
      byDate.set(n.date, n);
    }
    const sorted = [...byDate.values()].sort((a, b) =>
      a.date.localeCompare(b.date)
    );

    return sorted.map((entry) => {
      const date = new Date(`${entry.date}T12:00:00`);
      const label = date.toLocaleDateString("pt-BR", {
        day: "2-digit",
        month: "short",
      });
      return {
        date: entry.date,
        weight: entry.weight,
        label,
      };
    });
  }, [weightHistory]);

  const isBelowSm = useIsBelowSm();

  const weightChartPoints = useMemo(() => {
    if (!isBelowSm || progress.length <= 4) return progress;
    return selectFourPointsForMobileChart(progress);
  }, [isBelowSm, progress]);

  const weightChartYExtent = useMemo(() => {
    if (!progress.length) return null;
    const w = progress.map((p) => p.weight);
    return { min: Math.min(...w), max: Math.max(...w) };
  }, [progress]);

  const [isAnthropometryModalOpen, setIsAnthropometryModalOpen] = useState(false);
  const [isCurrentWeightModalOpen, setIsCurrentWeightModalOpen] = useState(false);
  const [isTargetWeightModalOpen, setIsTargetWeightModalOpen] = useState(false);
  const [anthropometryHistory, setAnthropometryHistory] = useState<any[]>([]);
  const [weeklyMetrics, setWeeklyMetrics] = useState<{
    expenditures: number[];
    consumed: number[];
    deficits: number[];
  }>({ expenditures: [], consumed: [], deficits: [] });
  
  // Estados para relatórios semanais e mensais
  const [weeklyReportData, setWeeklyReportData] = useState<{
    scores: number[];
    workouts: { completed: number; total: number };
    avgScore: number | null;
  }>({ scores: [], workouts: { completed: 0, total: 0 }, avgScore: null });
  
  const [monthlyReportData, setMonthlyReportData] = useState<{
    scores: number[];
    workouts: { completed: number; total: number };
    avgScore: number | null;
  }>({ scores: [], workouts: { completed: 0, total: 0 }, avgScore: null });

  const [contributionScores, setContributionScores] = useState<
    Record<string, number | null>
  >({});
  const [contributionLoading, setContributionLoading] = useState(true);

  const contributionWeeks = useMemo(
    () => buildContributionGrid(new Date()),
    []
  );

  // Carregar scores do checklist para o gráfico estilo GitHub (aba Visão Geral)
  useEffect(() => {
    if (activeTab !== "overview") return;

    let cancelled = false;

    const load = async () => {
      setContributionLoading(true);
      const keys = new Set<string>();
      for (const week of contributionWeeks) {
        for (const d of week) {
          if (d) keys.add(toLocalDateKey(d));
        }
      }

      const dateKeys = [...keys];
      const chunkSize = 40;
      const merged: Record<string, number | null> = {};

      try {
        for (let i = 0; i < dateKeys.length; i += chunkSize) {
          const chunk = dateKeys.slice(i, i + chunkSize);
          const results = await Promise.all(
            chunk.map(async (dateKey) => {
              try {
                const score = await checklistService.getDailyChecklistScore(
                  dateKey
                );
                return { dateKey, score };
              } catch {
                return { dateKey, score: null as number | null };
              }
            })
          );
          for (const { dateKey, score } of results) {
            merged[dateKey] = score;
          }
        }
        if (!cancelled) {
          setContributionScores(merged);
        }
      } finally {
        if (!cancelled) {
          setContributionLoading(false);
        }
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [activeTab, contributionWeeks]);

  // Carregar histórico de antropometria
  useEffect(() => {
    const loadHistory = async () => {
      try {
        const history = await profileService.getAnthropometryHistory();
        if (history.length > 0) {
          setAnthropometryHistory(history);
        } else if (anthropometry.lastMeasurementDate) {
          // Se não tiver histórico, usar dados atuais como primeira entrada
          setAnthropometryHistory([{
            date: anthropometry.lastMeasurementDate.toISOString().split("T")[0],
            leanMass: anthropometry.leanMass,
            fatPercentage: anthropometry.fatPercentage,
            weight: anthropometry.weight,
          }]);
        }
      } catch (e) {
        console.error("Erro ao carregar histórico de antropometria:", e);
      }
    };
    loadHistory();
  }, [anthropometry]);

  // Calcular métricas semanais do Firebase
  useEffect(() => {
    if (activeTab !== "reports") return;
    
    const calculateMetrics = async () => {
      const today = new Date();
      const lastWeekStart = new Date(today);
      lastWeekStart.setDate(today.getDate() - 7);
      
      const weeklyExpenditures: number[] = [];
      const weeklyConsumed: number[] = [];
      const weeklyDeficits: number[] = [];

      const currentUserProfile: UserProfile = {
        weight: currentWeight,
        height: 165,
        birthDate: "2003-06-15",
        gender: "male",
        leanBodyMass: anthropometry.leanMass,
      };
      const currentBMR = calculateBMR(currentUserProfile);

      // Carregar receitas e quick foods uma vez
      let recipes: any[] = [];
      let quickFoods: any[] = [];
      try {
        recipes = await libraryService.getRecipes();
        quickFoods = await libraryService.getQuickFoods();
      } catch (e) {
        console.error("Erro ao carregar receitas/quickfoods:", e);
      }

      for (let i = 0; i < 7; i++) {
        const date = new Date(lastWeekStart);
        date.setDate(lastWeekStart.getDate() + i);
        const dateKey = date.toISOString().split("T")[0];

        // Calcular gasto do dia do Firebase
        let dailyExpenditure = currentBMR;
        try {
          const activities = await workoutService.getActivities(dateKey);
          const activityCalories = activities.reduce((sum, a) => sum + a.caloriesBurned, 0);
          dailyExpenditure = currentBMR + activityCalories;
        } catch (e) {
          // Usar BMR como padrão
        }
        weeklyExpenditures.push(dailyExpenditure);

        // Calcular consumido do dia do Firebase
        let consumed = 0;
        try {
          const selectedMeals = await mealService.getMeals(dateKey);
          
          selectedMeals.forEach((meal: any) => {
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
        weeklyConsumed.push(consumed);

        // Calcular déficit
        const deficit = dailyExpenditure - consumed;
        weeklyDeficits.push(deficit);
      }

      setWeeklyMetrics({
        expenditures: weeklyExpenditures,
        consumed: weeklyConsumed,
        deficits: weeklyDeficits,
      });
    };

    calculateMetrics();
  }, [activeTab, currentWeight, anthropometry]);

  // Calcular dados semanais e mensais quando a aba de relatórios estiver ativa
  useEffect(() => {
    if (activeTab !== "reports") return;
    
    const today = new Date();
    const lastWeekStart = new Date(today);
    lastWeekStart.setDate(today.getDate() - 7);
    const lastMonthStart = new Date(today);
    lastMonthStart.setMonth(today.getMonth() - 1);

    const getDayScore = async (date: Date): Promise<number | null> => {
      const dateKey = date.toISOString().split("T")[0];
      try {
        return await checklistService.getDailyChecklistScore(dateKey);
      } catch (e) {
        return null;
      }
    };

    const isWorkoutCompleted = async (date: Date): Promise<boolean> => {
      const dateKey = date.toISOString().split("T")[0];
      try {
        const workout = await workoutService.getWorkout(dateKey);
        if (workout && workout.exercises && workout.exercises.length > 0) {
          return workout.exercises.every((ex: any) => ex.completed === true);
        }
      } catch (e) {
        return false;
      }
      return false;
    };

    // Calcular dados semanais
    const calculateWeeklyData = async () => {
      const weeklyScores: number[] = [];
      const weeklyWorkouts: { completed: number; total: number } = { completed: 0, total: 0 };

      const dates = Array.from({ length: 7 }, (_, i) => {
        const date = new Date(lastWeekStart);
        date.setDate(lastWeekStart.getDate() + i);
        return date;
      });

      const results = await Promise.all(
        dates.map(async (date) => {
          const score = await getDayScore(date);
          const dayOfWeek = date.getDay();
          const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
          const workoutCompleted = !isWeekend ? await isWorkoutCompleted(date) : false;
          
          return { score, isWeekend, workoutCompleted };
        })
      );

      results.forEach((result) => {
        if (result.score !== null) {
          weeklyScores.push(result.score);
        }
        if (!result.isWeekend) {
          weeklyWorkouts.total++;
          if (result.workoutCompleted) {
            weeklyWorkouts.completed++;
          }
        }
      });

      const weeklyAvgScore = weeklyScores.length > 0
        ? Math.round(weeklyScores.reduce((a, b) => a + b, 0) / weeklyScores.length)
        : null;

      setWeeklyReportData({
        scores: weeklyScores,
        workouts: weeklyWorkouts,
        avgScore: weeklyAvgScore,
      });
    };

    // Calcular dados mensais
    const calculateMonthlyData = async () => {
      const monthlyScores: number[] = [];
      const monthlyWorkouts: { completed: number; total: number } = { completed: 0, total: 0 };

      const daysInMonth = Math.floor((today.getTime() - lastMonthStart.getTime()) / (1000 * 60 * 60 * 24));
      const dates = Array.from({ length: daysInMonth }, (_, i) => {
        const date = new Date(lastMonthStart);
        date.setDate(lastMonthStart.getDate() + i);
        return date;
      });

      const results = await Promise.all(
        dates.map(async (date) => {
          const score = await getDayScore(date);
          const dayOfWeek = date.getDay();
          const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
          const workoutCompleted = !isWeekend ? await isWorkoutCompleted(date) : false;
          
          return { score, isWeekend, workoutCompleted };
        })
      );

      results.forEach((result) => {
        if (result.score !== null) {
          monthlyScores.push(result.score);
        }
        if (!result.isWeekend) {
          monthlyWorkouts.total++;
          if (result.workoutCompleted) {
            monthlyWorkouts.completed++;
          }
        }
      });

      const monthlyAvgScore = monthlyScores.length > 0
        ? Math.round(monthlyScores.reduce((a, b) => a + b, 0) / monthlyScores.length)
        : null;

      setMonthlyReportData({
        scores: monthlyScores,
        workouts: monthlyWorkouts,
        avgScore: monthlyAvgScore,
      });
    };

    calculateWeeklyData();
    calculateMonthlyData();
  }, [activeTab]);

  const handleAnthropometrySave = async (data: AnthropometryData) => {
    setAnthropometry(data);
    
    try {
      // Salvar antropometria no Firebase
      await profileService.saveAnthropometry(data);
      
      // Salvar no histórico de antropometria
      let anthropometryHistory = await profileService.getAnthropometryHistory();
      
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
      await profileService.saveAnthropometryHistory(anthropometryHistory);
      
      // Atualizar também o peso atual quando atualizar antropometria
      const measurementDate = data.lastMeasurementDate;
      await addWeightEntry(data.weight, measurementDate);
    } catch (e) {
      console.error("Erro ao salvar antropometria:", e);
    }
  };

  const addWeightEntry = async (weight: number, date?: Date) => {
    const entryDate = date || new Date();
    const dateKey = toLocalDateKey(entryDate);

    const newEntry: WeightEntry = {
      date: dateKey,
      weight,
      timestamp: timestampFromDateKey(dateKey),
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

    updatedHistory.sort((a, b) => a.date.localeCompare(b.date));
    
    setWeightHistory(updatedHistory);
    
    try {
      // Salvar histórico no Firebase
      await profileService.saveWeightHistory(updatedHistory);
      
      // Atualizar peso atual se for a data mais recente
      const latestEntry = updatedHistory[updatedHistory.length - 1];
      if (latestEntry.date === dateKey) {
        setCurrentWeight(weight);
        await profileService.saveCurrentWeight(weight);
      }
    } catch (e) {
      console.error("Erro ao salvar peso:", e);
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
    <div className="flex min-w-0 flex-1 flex-col gap-4">
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

          {/* Histórico de meta diária (estilo GitHub) */}
          <section className="glass-panel min-w-0 overflow-visible rounded-3xl p-3">
            <div className="mb-3 flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h3 className="text-sm font-medium text-zinc-100">
                  Histórico de metas
                </h3>

              </div>
              <div className="flex items-center gap-3 text-[10px] text-zinc-500 shrink-0">
                <span>Menos</span>
                <div className="flex gap-1">
                  <span
                    className="h-3 w-3 rounded-sm bg-zinc-800/80 border border-zinc-700/50"
                    title="Sem registro"
                  />
                  <span
                    className="h-3 w-3 rounded-sm bg-zinc-700/60 border border-zinc-600/40"
                    title="≤ 60%"
                  />
                  <span
                    className="h-3 w-3 rounded-sm bg-emerald-600/50 border border-emerald-500/35"
                    title="61–85%"
                  />
                  <span
                    className="h-3 w-3 rounded-sm bg-emerald-700 border border-emerald-600/45"
                    title="86–100%"
                  />
                </div>
                <span>Mais</span>
              </div>
            </div>

            {contributionLoading ? (
              <div className="flex h-28 items-center justify-center text-xs text-zinc-500">
                Carregando histórico…
              </div>
            ) : (
              <MetaContributionHeatmap
                weeks={contributionWeeks}
                scores={contributionScores}
              />
            )}
          </section>

          {/* Progress Chart */}
          <section className="glass-panel min-w-0 rounded-3xl p-4">
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
              <WeightEvolutionChart
                points={weightChartPoints}
                yExtent={
                  isBelowSm && progress.length > 4
                    ? weightChartYExtent
                    : null
                }
                compactLegend={isBelowSm}
              />
            ) : (
              <div className="flex items-center justify-center h-48 text-zinc-500 text-sm">
                Clique em "Peso Atual" para adicionar sua primeira pesagem
              </div>
            )}
          </section>
        </>
      )}

      {activeTab === "reports" && (() => {
        const today = new Date();
        const lastWeekStart = new Date(today);
        lastWeekStart.setDate(today.getDate() - 7);
        const lastMonthStart = new Date(today);
        lastMonthStart.setMonth(today.getMonth() - 1);

        const weeklyScores = weeklyReportData.scores;
        const weeklyWorkouts = weeklyReportData.workouts;
        const weeklyAvgScore = weeklyReportData.avgScore;
        
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

        const monthlyScores = monthlyReportData.scores;
        const monthlyWorkouts = monthlyReportData.workouts;
        const monthlyAvgScore = monthlyReportData.avgScore;
        
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

                // Usar métricas semanais do estado
                const weeklyExpenditures = weeklyMetrics.expenditures;
                const weeklyConsumed = weeklyMetrics.consumed;
                const weeklyDeficits = weeklyMetrics.deficits;

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

            <button
              type="button"
              onClick={() => router.push("/perfil?tab=meal-config")}
              className="flex flex-col items-start gap-2 rounded-2xl border border-zinc-800/80 bg-zinc-950/60 p-4 text-left transition-colors hover:border-jagger-400/60 hover:bg-zinc-900/60"
            >
              <div className="flex items-center gap-2">
                <span className="text-xl">🍽️</span>
                <span className="text-sm font-medium text-zinc-100">Refeições</span>
              </div>
              <p className="text-xs text-zinc-400">
                Horários, opções do cardápio, ingredientes e macros
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

      {activeTab === "meal-config" && (
        <section className="rounded-3xl border border-zinc-800/90 bg-zinc-950 p-4">
          <MealConfig onClose={() => setActiveTab("settings")} />
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
          profileService.saveTargetWeight(value).catch(e => console.error("Erro ao salvar meta de peso:", e));
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
