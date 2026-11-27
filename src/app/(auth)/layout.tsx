import type { ReactNode } from "react";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <main className="flex flex-1 items-start justify-center px-4 py-12 sm:items-center sm:py-20">
      <div className="w-full max-w-md rounded-[var(--radius-card)] border border-line bg-surface p-6 shadow-[0_1px_2px_rgba(0,0,0,0.04)] sm:p-8">
        {children}
      </div>
    </main>
  );
}
