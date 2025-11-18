"use client";

import { useState, useEffect } from "react";
import { fastingService } from "@/lib/firebaseService";

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

type FastingSession = {
  startTime: number; // timestamp
  fastingTypeId: string;
  duration: number; // horas
  paused: boolean;
  pausedAt?: number;
  pausedDuration: number; // tempo total pausado em ms
};

interface FastingTrackerProps {
  date: Date;
}

export function FastingTracker({ date }: FastingTrackerProps) {
  const dayOfWeek = date.getDay();
  const dateKey = date.toISOString().split("T")[0];
  
  const [fastingTypes, setFastingTypes] = useState<FastingType[]>([]);
  const [schedule, setSchedule] = useState<FastingSchedule[]>([]);
  const [session, setSession] = useState<FastingSession | null>(null);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [isActive, setIsActive] = useState(false);

  // Carregar tipos de jejum e cronograma
  useEffect(() => {
    const loadData = async () => {
      try {
        // Carregar tipos de jejum do Firebase
        const firebaseTypes = await fastingService.getFastingTypes();
        if (firebaseTypes.length > 0) {
          setFastingTypes(firebaseTypes);
        }

        // Carregar cronograma do Firebase
        const firebaseSchedule = await fastingService.getFastingSchedule();
        if (firebaseSchedule.length === 7) {
          setSchedule(firebaseSchedule);
        }

        // Carregar sessão ativa do Firebase
        const firebaseSession = await fastingService.getFastingSession(dateKey);
        if (firebaseSession) {
          setSession(firebaseSession);
          setIsActive(!firebaseSession.paused);
        }
      } catch (error) {
        console.error("Erro ao carregar dados:", error);
      }
    };

    loadData();
  }, [dateKey]);

  // Obter tipo de jejum configurado para o dia
  const getDayFastingType = (): FastingType | null => {
    const daySchedule = schedule.find((s) => s.dayOfWeek === dayOfWeek);
    if (!daySchedule || !daySchedule.fastingTypeId) return null;
    
    return fastingTypes.find((t) => t.id === daySchedule.fastingTypeId) || null;
  };

  const fastingType = getDayFastingType();

  // Atualizar tempo decorrido
  useEffect(() => {
    if (!session || !isActive) {
      setElapsedTime(0);
      return;
    }

    const updateElapsed = () => {
      const now = Date.now();
      const pausedTime = session.pausedDuration || 0;
      const currentPausedTime = session.paused && session.pausedAt 
        ? now - session.pausedAt 
        : 0;
      
      const totalElapsed = now - session.startTime - pausedTime - currentPausedTime;
      setElapsedTime(totalElapsed);
    };

    updateElapsed();
    const interval = setInterval(updateElapsed, 1000);

    return () => clearInterval(interval);
  }, [session, isActive]);

  // Verificar se o jejum foi completado automaticamente
  useEffect(() => {
    if (!session || !isActive || !fastingType) return;

    const elapsedHours = elapsedTime / (1000 * 60 * 60);
    if (elapsedHours >= fastingType.duration) {
      handleComplete();
    }
  }, [elapsedTime, session, isActive, fastingType]);

  const handleStart = async () => {
    if (!fastingType) return;

    const now = Date.now();
    const newSession: FastingSession = {
      startTime: now,
      fastingTypeId: fastingType.id,
      duration: fastingType.duration,
      paused: false,
      pausedDuration: 0,
    };

    setSession(newSession);
    setIsActive(true);
    try {
      await fastingService.saveFastingSession(dateKey, newSession);
    } catch (error) {
      console.error("Erro ao salvar sessão:", error);
    }
  };

  const handlePause = async () => {
    if (!session) return;

    const now = Date.now();
    const updated: FastingSession = {
      ...session,
      paused: true,
      pausedAt: now,
    };

    setSession(updated);
    setIsActive(false);
    try {
      await fastingService.saveFastingSession(dateKey, updated);
    } catch (error) {
      console.error("Erro ao pausar sessão:", error);
    }
  };

  const handleResume = async () => {
    if (!session || !session.pausedAt) return;

    const now = Date.now();
    const pausedTime = now - session.pausedAt;
    const updated: FastingSession = {
      ...session,
      paused: false,
      pausedDuration: (session.pausedDuration || 0) + pausedTime,
      pausedAt: undefined,
    };

    setSession(updated);
    setIsActive(true);
    try {
      await fastingService.saveFastingSession(dateKey, updated);
    } catch (error) {
      console.error("Erro ao retomar sessão:", error);
    }
  };

  const handleComplete = async () => {
    if (!session) return;

    try {
      // Salvar histórico no Firebase
      await fastingService.addFastingHistory(dateKey, session);

      // Limpar sessão
      await fastingService.deleteFastingSession(dateKey);
      setSession(null);
      setIsActive(false);
    } catch (error) {
      console.error("Erro ao completar sessão:", error);
    }
  };

  const formatTime = (ms: number): string => {
    const hours = Math.floor(ms / (1000 * 60 * 60));
    const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((ms % (1000 * 60)) / 1000);
    return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
  };

  const getProgress = (): number => {
    if (!session || !fastingType) return 0;
    const elapsedHours = elapsedTime / (1000 * 60 * 60);
    return Math.min((elapsedHours / fastingType.duration) * 100, 100);
  };

  if (!fastingType) {
    return null; // Não mostrar se não há jejum configurado para o dia
  }

  const progress = getProgress();
  const elapsedHours = elapsedTime / (1000 * 60 * 60);
  const remainingHours = Math.max(0, fastingType.duration - elapsedHours);

  return (
    <div className="glass-panel rounded-3xl p-4">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <h3 className="text-sm font-medium text-zinc-100">
            ⏰ Jejum Intermitente
          </h3>
          <p className="mt-0.5 text-xs text-zinc-400">
            {fastingType.name} - {fastingType.description}
          </p>
        </div>
      </div>

      {!session ? (
        <div className="flex flex-col gap-3">
          <div className="rounded-2xl bg-zinc-950/60 border border-zinc-800 p-3 text-center">
            <p className="text-xs text-zinc-400 mb-1">Meta</p>
            <p className="text-lg font-semibold text-zinc-100">
              {fastingType.duration}h de jejum
            </p>
          </div>
          <button
            onClick={handleStart}
            className="rounded-xl bg-jagger-600 px-4 py-2.5 text-sm font-medium text-zinc-50 transition-colors hover:bg-jagger-500"
          >
            Iniciar Jejum
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {/* Barra de progresso */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-zinc-400">Progresso</span>
              <span className="font-semibold text-zinc-100">
                {progress.toFixed(1)}%
              </span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-zinc-900/60">
              <div
                className="h-full bg-gradient-to-r from-jagger-500 to-jagger-400 transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>

          {/* Tempo decorrido */}
          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-xl bg-zinc-950/60 border border-zinc-800 p-3 text-center">
              <p className="text-[10px] text-zinc-400 mb-1">Tempo decorrido</p>
              <p className="text-lg font-semibold text-zinc-100">
                {formatTime(elapsedTime)}
              </p>
              <p className="text-[10px] text-zinc-500 mt-1">
                {elapsedHours.toFixed(1)}h / {fastingType.duration}h
              </p>
            </div>
            <div className="rounded-xl bg-zinc-950/60 border border-zinc-800 p-3 text-center">
              <p className="text-[10px] text-zinc-400 mb-1">Tempo restante</p>
              <p className="text-lg font-semibold text-zinc-100">
                {formatTime(remainingHours * 60 * 60 * 1000)}
              </p>
              <p className="text-[10px] text-zinc-500 mt-1">
                {remainingHours.toFixed(1)}h restantes
              </p>
            </div>
          </div>

          {/* Botões de controle */}
          <div className="flex gap-2">
            {session.paused ? (
              <>
                <button
                  onClick={handleResume}
                  className="flex-1 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-medium text-zinc-50 transition-colors hover:bg-emerald-500"
                >
                  Retomar
                </button>
                <button
                  onClick={handleComplete}
                  className="flex-1 rounded-xl border border-zinc-700/80 bg-zinc-950/60 px-4 py-2.5 text-sm font-medium text-zinc-300 transition-colors hover:border-zinc-600 hover:text-zinc-100"
                >
                  Finalizar
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={handlePause}
                  className="flex-1 rounded-xl border border-zinc-700/80 bg-zinc-950/60 px-4 py-2.5 text-sm font-medium text-zinc-300 transition-colors hover:border-zinc-600 hover:text-zinc-100"
                >
                  Pausar
                </button>
                <button
                  onClick={handleComplete}
                  className="flex-1 rounded-xl bg-jagger-600 px-4 py-2.5 text-sm font-medium text-zinc-50 transition-colors hover:bg-jagger-500"
                >
                  Finalizar
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

