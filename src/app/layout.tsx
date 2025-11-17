import type { Metadata } from "next";
import "./globals.css";
import { LayoutShell } from "./layoutShell";

export const metadata: Metadata = {
  title: "DisciplineX",
  description: "Painel de disciplina pessoal de Jägger",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body>
        <LayoutShell>{children}</LayoutShell>
      </body>
    </html>
  );
}

