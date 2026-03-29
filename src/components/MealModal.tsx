"use client";

import { useState, useRef, useEffect, useLayoutEffect, useCallback } from "react";
import { MealSlot, MealOption } from "@/types/meals";

interface MealModalProps {
  slot: MealSlot;
  onSelect: (optionId: string) => void;
  onClose: () => void;
  selectedOptionId?: string;
  onOpenLibrary?: (slotId: string) => void;
}

export function MealModal({ slot, onSelect, onClose, selectedOptionId, onOpenLibrary }: MealModalProps) {
  const initialIndex = selectedOptionId
    ? slot.options.findIndex((opt) => opt.id === selectedOptionId)
    : 0;
  const [currentIndex, setCurrentIndex] = useState(initialIndex >= 0 ? initialIndex : 0);
  const indexRef = useRef(currentIndex);
  const [startX, setStartX] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const viewportRef = useRef<HTMLDivElement>(null);
  const [viewportW, setViewportW] = useState(0);

  useEffect(() => {
    indexRef.current = currentIndex;
  }, [currentIndex]);

  const measure = useCallback(() => {
    const el = viewportRef.current;
    if (!el) return;
    setViewportW(el.clientWidth);
  }, []);

  useLayoutEffect(() => {
    measure();
    const el = viewportRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => measure());
    ro.observe(el);
    return () => ro.disconnect();
  }, [measure, slot.options.length]);

  useEffect(() => {
    if (selectedOptionId) {
      const index = slot.options.findIndex((opt) => opt.id === selectedOptionId);
      if (index >= 0) {
        setCurrentIndex(index);
      }
    }
  }, [selectedOptionId, slot.options]);

  useEffect(() => {
    if (currentIndex >= slot.options.length) {
      setCurrentIndex(Math.max(0, slot.options.length - 1));
    }
  }, [currentIndex, slot.options.length]);

  const handleTouchStart = (e: React.TouchEvent) => {
    setStartX(e.touches[0].clientX);
    setIsDragging(true);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging) return;
    const currentX = e.touches[0].clientX;
    const diff = startX - currentX;
    const i = indexRef.current;

    if (Math.abs(diff) > 50) {
      if (diff > 0 && i < slot.options.length - 1) {
        setCurrentIndex(i + 1);
        setIsDragging(false);
      } else if (diff < 0 && i > 0) {
        setCurrentIndex(i - 1);
        setIsDragging(false);
      }
    }
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    setStartX(e.clientX);
    setIsDragging(true);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    const currentX = e.clientX;
    const diff = startX - currentX;
    const i = indexRef.current;

    if (Math.abs(diff) > 50) {
      if (diff > 0 && i < slot.options.length - 1) {
        setCurrentIndex(i + 1);
        setIsDragging(false);
      } else if (diff < 0 && i > 0) {
        setCurrentIndex(i - 1);
        setIsDragging(false);
      }
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const goToSlide = (index: number) => {
    setCurrentIndex(index);
  };

  const currentOption = slot.options[currentIndex];

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [onClose]);

  if (slot.options.length === 0) {
    return (
      <div
        className="fixed inset-0 z-50 flex items-end justify-center bg-black/80 p-0 sm:items-center sm:p-4"
        onClick={onClose}
      >
        <div
          className="w-full max-w-md rounded-t-3xl border border-zinc-800/90 bg-zinc-900 p-6 sm:rounded-3xl"
          onClick={(e) => e.stopPropagation()}
        >
          <h3 className="text-lg font-semibold text-zinc-100">{slot.name}</h3>
          <p className="mt-2 text-sm text-zinc-400">
            Nenhuma opção cadastrada para este horário. Configure em Perfil → Refeições (⚙️ no card de
            refeições).
          </p>
          <button
            type="button"
            onClick={onClose}
            className="mt-4 w-full rounded-xl border border-zinc-700 py-2.5 text-sm text-zinc-200"
          >
            Fechar
          </button>
        </div>
      </div>
    );
  }

  if (!currentOption) {
    return null;
  }

  const trackWidth = viewportW > 0 ? viewportW * slot.options.length : undefined;
  const offsetPx = viewportW > 0 ? currentIndex * viewportW : 0;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/80 p-0 sm:items-center sm:p-4"
      onClick={onClose}
    >
      <div
        className="flex max-h-[min(92dvh,720px)] w-full min-w-0 max-w-md flex-col rounded-t-3xl border border-zinc-800/90 bg-zinc-900 sm:rounded-3xl sm:border"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="min-w-0 shrink-0 border-b border-zinc-800/90 px-4 pb-3 pt-4 sm:px-6 sm:pt-6">
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0">
              <h3 className="truncate text-lg font-semibold text-zinc-100">{slot.name}</h3>
              <p className="text-xs text-zinc-400">{slot.time}</p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="shrink-0 rounded-full p-2 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100"
              aria-label="Fechar"
            >
              ✕
            </button>
          </div>
        </div>

        <div className="min-h-0 min-w-0 flex-1 overflow-y-auto px-3 pb-4 pt-3 sm:px-6 sm:pb-6">
          <div className="relative w-full min-w-0">
            <div
              ref={viewportRef}
              className="relative w-full min-w-0 overflow-hidden rounded-2xl border border-zinc-800/90 bg-zinc-950"
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
            >
              <div
                className="flex transition-transform duration-300 ease-out"
                style={{
                  width: trackWidth,
                  transform: viewportW ? `translate3d(-${offsetPx}px, 0, 0)` : undefined,
                }}
              >
                {slot.options.map((option) => (
                  <div
                    key={option.id}
                    className="box-border shrink-0 overflow-x-hidden px-3 py-4 sm:px-5 sm:py-5"
                    style={{
                      width: viewportW > 0 ? viewportW : "100%",
                      maxWidth: viewportW > 0 ? viewportW : undefined,
                    }}
                  >
                    <MealOptionCard option={option} />
                  </div>
                ))}
              </div>
            </div>

            {slot.options.length > 1 && currentIndex > 0 && (
              <button
                type="button"
                onClick={() => goToSlide(currentIndex - 1)}
                className="absolute left-1 top-1/2 z-10 -translate-y-1/2 rounded-full border border-zinc-700/80 bg-zinc-950/90 p-2 text-zinc-200 shadow-lg backdrop-blur-sm sm:left-2"
                aria-label="Opção anterior"
              >
                ‹
              </button>
            )}
            {slot.options.length > 1 && currentIndex < slot.options.length - 1 && (
              <button
                type="button"
                onClick={() => goToSlide(currentIndex + 1)}
                className="absolute right-1 top-1/2 z-10 -translate-y-1/2 rounded-full border border-zinc-700/80 bg-zinc-950/90 p-2 text-zinc-200 shadow-lg backdrop-blur-sm sm:right-2"
                aria-label="Próxima opção"
              >
                ›
              </button>
            )}
          </div>

          {slot.options.length > 1 && (
            <div className="mt-3 flex items-center justify-center gap-2">
              {slot.options.map((_, index) => (
                <button
                  key={index}
                  type="button"
                  onClick={() => goToSlide(index)}
                  className={`h-2 rounded-full transition-all ${
                    index === currentIndex
                      ? "w-8 bg-emerald-400"
                      : "w-2 bg-zinc-700 hover:bg-zinc-600"
                  }`}
                  aria-label={`Ir para opção ${index + 1}`}
                />
              ))}
            </div>
          )}

          <button
            type="button"
            onClick={() => onSelect(currentOption.id)}
            className="mt-4 w-full rounded-2xl bg-emerald-500/20 px-4 py-3 text-sm font-medium text-emerald-300 transition-colors hover:bg-emerald-500/30"
          >
            Selecionar esta opção
          </button>

          <button
            type="button"
            onClick={() => {
              if (onOpenLibrary) {
                onOpenLibrary(slot.id);
              }
              onClose();
            }}
            className="mt-2 w-full rounded-2xl border border-dashed border-zinc-700 px-4 py-3 text-sm text-zinc-400 transition-colors hover:border-jagger-400/60 hover:text-jagger-100"
          >
            + Adicionar da biblioteca
          </button>
        </div>
      </div>
    </div>
  );
}

function MealOptionCard({ option }: { option: MealOption }) {
  return (
    <div className="w-full max-w-full space-y-4 wrap-break-word">
      <div>
        <h4 className="text-base font-semibold leading-snug text-zinc-100">{option.name}</h4>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <span className="rounded-full bg-emerald-500/10 px-3 py-1 text-sm text-emerald-300">
            {option.totalCalories} kcal
          </span>
        </div>
      </div>

      <div className="space-y-2">
        <p className="text-xs font-medium uppercase tracking-wide text-zinc-400">Itens</p>
        <div className="space-y-1.5">
          {option.items.map((item, idx) => (
            <div
              key={idx}
              className="flex flex-col gap-1 rounded-xl border border-zinc-800/80 bg-zinc-900/60 p-2.5 text-xs sm:flex-row sm:items-start sm:justify-between"
            >
              <span className="min-w-0 flex-1 text-zinc-300">{item.name}</span>
              <div className="shrink-0 text-left sm:text-right">
                <span className="text-zinc-400">{item.quantity}</span>
                <span className="ml-2 text-zinc-500">{item.calories} kcal</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2 rounded-xl border border-zinc-800/80 bg-zinc-900/60 p-3">
        <div className="text-center">
          <p className="text-xs text-zinc-400">Proteína</p>
          <p className="mt-1 text-lg font-semibold text-red-400">{option.protein}g</p>
        </div>
        <div className="text-center">
          <p className="text-xs text-zinc-400">Carboidratos</p>
          <p className="mt-1 text-lg font-semibold text-blue-400">{option.carbs}g</p>
        </div>
        <div className="text-center">
          <p className="text-xs text-zinc-400">Gorduras</p>
          <p className="mt-1 text-lg font-semibold text-yellow-400">{option.fat}g</p>
        </div>
      </div>
    </div>
  );
}
