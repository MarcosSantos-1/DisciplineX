"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import {
  HomeIcon,
  FireIcon,
  CalendarDaysIcon,
  UserCircleIcon,
} from "@heroicons/react/24/outline";
import {
  HomeIcon as HomeIconSolid,
  FireIcon as FireIconSolid,
  CalendarDaysIcon as CalendarDaysIconSolid,
  UserCircleIcon as UserCircleIconSolid,
} from "@heroicons/react/24/solid";
import { useFirebaseSync } from "@/hooks/useFirebaseSync";

type LayoutShellProps = {
  children: ReactNode;
};

const NAV_ITEMS = [
  { href: "/", label: "Dashboard", Icon: HomeIcon, IconSolid: HomeIconSolid },
  { href: "/treino", label: "Treino", Icon: FireIcon, IconSolid: FireIconSolid },
  { href: "/calendario", label: "Calendário", Icon: CalendarDaysIcon, IconSolid: CalendarDaysIconSolid },
  { href: "/perfil", label: "Perfil", Icon: UserCircleIcon, IconSolid: UserCircleIconSolid },
];

function classNames(...values: (string | false | null | undefined)[]) {
  return values.filter(Boolean).join(" ");
}

export function LayoutShell({ children }: LayoutShellProps) {
  const pathname = usePathname();
  // Sincronizar dados do localStorage para Firebase na primeira vez
  useFirebaseSync();

  return (
    <div className="flex min-h-screen text-sm text-zinc-100">
      {/* Sidebar desktop */}
      <aside className="hidden md:flex sidebar-blur w-64 flex-col justify-between px-5 py-6">
        <div className="space-y-8">
          <div>
            <p className="text-xs uppercase tracking-[0.25em] text-jagger-300/80">
              Operação
            </p>
            <h1 className="mt-2 text-xl font-semibold text-zinc-50">
              Jägger Discipline
            </h1>
            <p className="mt-1 text-xs text-zinc-400">
              Meta: -22kg até junho / 2026
            </p>
          </div>

          <nav className="space-y-1">
            {NAV_ITEMS.map((item) => {
              const active = pathname === item.href;
              const IconComponent = active ? item.IconSolid : item.Icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={classNames(
                    "flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm transition-colors",
                    active
                      ? "bg-jagger-800/80 text-jagger-50 border border-jagger-500/70 shadow-2xl"
                      : "text-zinc-400 hover:text-zinc-100 hover:bg-zinc-900/70"
                  )}
                >
                  <IconComponent className="h-5 w-5" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 px-4 py-3 text-xs text-zinc-400">
          <p className="font-medium text-zinc-200">
            Status da campanha:{" "}
            <span className="text-emerald-400">Em andamento</span>
          </p>
          <p className="mt-1 text-[11px] text-zinc-500">
            Lembrete: disciplina vence motivação. Uma missão por dia.
          </p>
        </div>
      </aside>

      {/* Conteúdo + bottom nav mobile */}
      <div className="flex flex-1 flex-col overflow-hidden">
        <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-4 px-4 pb-24 pt-4 md:max-w-5xl md:px-8 md:pb-8 md:pt-6 overflow-x-hidden">
          {children}
        </main>

        {/* Bottom nav mobile */}
        <nav className="fixed inset-x-0 bottom-0 z-20 border-t border-zinc-800/80 bg-zinc-950/90 backdrop-blur-2xl md:hidden">
          <div className="mx-auto flex max-w-md items-center justify-between px-4 py-2.5">
            {NAV_ITEMS.map((item) => {
              const active = pathname === item.href;
              const IconComponent = active ? item.IconSolid : item.Icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className="flex flex-1 flex-col items-center gap-0.5 text-[11px]"
                >
                  <div
                    className={classNames(
                      "flex h-9 w-9 items-center justify-center rounded-2xl border transition-colors",
                      active
                        ? "border-jagger-400/80 bg-jagger-700/60 text-jagger-50 shadow-2xl"
                        : "border-zinc-800 bg-zinc-950/60 text-zinc-400"
                    )}
                  >
                    <IconComponent className="h-5 w-5" />
                  </div>
                  <span
                    className={classNames(
                      "mt-0.5",
                      active ? "text-zinc-100" : "text-zinc-500"
                    )}
                  >
                    {item.label}
                  </span>
                </Link>
              );
            })}
          </div>
        </nav>
      </div>
    </div>
  );
}


