"use client";

import { useState, useRef, useEffect } from "react";
import { MealSlot, MealOption } from "@/types/meals";

interface MealModalProps {
  slot: MealSlot;
  onSelect: (optionId: string) => void;
  onClose: () => void;
  selectedOptionId?: string;
  onOpenLibrary?: (slotId: string) => void;
}

export function MealModal({ slot, onSelect, onClose, selectedOptionId, onOpenLibrary }: MealModalProps) {
  // Encontrar o índice da opção selecionada, se houver
  const initialIndex = selectedOptionId
    ? slot.options.findIndex((opt) => opt.id === selectedOptionId)
    : 0;
  const [currentIndex, setCurrentIndex] = useState(initialIndex >= 0 ? initialIndex : 0);
  const [startX, setStartX] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Atualizar índice quando selectedOptionId mudar
  useEffect(() => {
    if (selectedOptionId) {
      const index = slot.options.findIndex((opt) => opt.id === selectedOptionId);
      if (index >= 0) {
        setCurrentIndex(index);
      }
    }
  }, [selectedOptionId, slot.options]);

  const handleTouchStart = (e: React.TouchEvent) => {
    setStartX(e.touches[0].clientX);
    setIsDragging(true);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging) return;
    const currentX = e.touches[0].clientX;
    const diff = startX - currentX;

    if (Math.abs(diff) > 50) {
      if (diff > 0 && currentIndex < slot.options.length - 1) {
        setCurrentIndex(currentIndex + 1);
        setIsDragging(false);
      } else if (diff < 0 && currentIndex > 0) {
        setCurrentIndex(currentIndex - 1);
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

    if (Math.abs(diff) > 50) {
      if (diff > 0 && currentIndex < slot.options.length - 1) {
        setCurrentIndex(currentIndex + 1);
        setIsDragging(false);
      } else if (diff < 0 && currentIndex > 0) {
        setCurrentIndex(currentIndex - 1);
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

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-md rounded-3xl bg-zinc-900 p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-zinc-100">{slot.name}</h3>
            <p className="text-xs text-zinc-400">{slot.time}</p>
          </div>
          <button
            onClick={onClose}
            className="rounded-full p-2 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100"
          >
            ✕
          </button>
        </div>

        {/* Carrossel */}
        <div
          ref={containerRef}
          className="relative overflow-hidden rounded-2xl bg-zinc-950/60"
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        >
          <div
            className="flex transition-transform duration-300 ease-in-out"
            style={{
              transform: `translateX(-${currentIndex * 100}%)`,
            }}
          >
            {slot.options.map((option) => (
              <div
                key={option.id}
                className="min-w-full flex-shrink-0 p-6"
              >
                <MealOptionCard option={option} />
              </div>
            ))}
          </div>
        </div>

        {/* Indicadores de slide */}
        {slot.options.length > 1 && (
          <div className="mt-4 flex items-center justify-center gap-2">
            {slot.options.map((_, index) => (
              <button
                key={index}
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

        {/* Botões de navegação */}
        {slot.options.length > 1 && (
          <>
            {currentIndex > 0 && (
              <button
                onClick={() => goToSlide(currentIndex - 1)}
                className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-zinc-800/80 p-2 text-zinc-300 hover:bg-zinc-700"
                aria-label="Opção anterior"
              >
                ‹
              </button>
            )}
            {currentIndex < slot.options.length - 1 && (
              <button
                onClick={() => goToSlide(currentIndex + 1)}
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-zinc-800/80 p-2 text-zinc-300 hover:bg-zinc-700"
                aria-label="Próxima opção"
              >
                ›
              </button>
            )}
          </>
        )}

        {/* Botão de seleção */}
        <button
          onClick={() => onSelect(currentOption.id)}
          className="mt-6 w-full rounded-2xl bg-emerald-500/20 px-4 py-3 text-sm font-medium text-emerald-300 hover:bg-emerald-500/30 transition-colors"
        >
          Selecionar esta opção
        </button>

        {/* Botão para adicionar da biblioteca */}
        <button
          onClick={() => {
            if (onOpenLibrary) {
              onOpenLibrary(slot.id);
            }
            onClose();
          }}
          className="mt-2 w-full rounded-2xl border border-dashed border-zinc-700 px-4 py-3 text-sm text-zinc-400 hover:border-jagger-400/60 hover:text-jagger-100 transition-colors"
        >
          + Adicionar da biblioteca
        </button>
      </div>
    </div>
  );
}

function MealOptionCard({ option }: { option: MealOption }) {
  return (
    <div className="space-y-4">
      <div>
        <h4 className="text-base font-semibold text-zinc-100">{option.name}</h4>
        <div className="mt-2 flex items-center gap-2">
          <span className="rounded-full bg-emerald-500/10 px-3 py-1 text-sm text-emerald-300">
            {option.totalCalories} kcal
          </span>
        </div>
      </div>

      {/* Itens da refeição */}
      <div className="space-y-2">
        <p className="text-xs font-medium text-zinc-400 uppercase tracking-wide">
          Itens:
        </p>
        <div className="space-y-1.5">
          {option.items.map((item, idx) => (
            <div
              key={idx}
              className="flex items-start justify-between rounded-xl bg-zinc-900/60 p-2.5 text-xs"
            >
              <span className="text-zinc-300">{item.name}</span>
              <div className="ml-2 text-right">
                <span className="text-zinc-400">{item.quantity}</span>
                <span className="ml-2 text-zinc-500">
                  {item.calories} kcal
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Macros */}
      <div className="grid grid-cols-3 gap-2 rounded-xl bg-zinc-900/60 p-3">
        <div className="text-center">
          <p className="text-xs text-zinc-400">Proteína</p>
          <p className="mt-1 text-lg font-semibold text-red-400">
            {option.protein}g
          </p>
        </div>
        <div className="text-center">
          <p className="text-xs text-zinc-400">Carboidratos</p>
          <p className="mt-1 text-lg font-semibold text-blue-400">
            {option.carbs}g
          </p>
        </div>
        <div className="text-center">
          <p className="text-xs text-zinc-400">Gorduras</p>
          <p className="mt-1 text-lg font-semibold text-yellow-400">
            {option.fat}g
          </p>
        </div>
      </div>
    </div>
  );
}

