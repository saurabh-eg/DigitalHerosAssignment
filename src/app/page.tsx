import { SITE_CONFIG } from "@/constants/site-config";

// Placeholder until the product hub is built in P2.
export default function Home() {
  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col justify-center gap-6 px-6 py-24">
      <p className="font-mono text-xs uppercase tracking-[0.2em] text-ink-muted">Web-to-print platform</p>
      <h1 className="text-5xl font-bold sm:text-7xl">{SITE_CONFIG.name}</h1>
      <p className="max-w-xl text-lg text-ink-muted">{SITE_CONFIG.description}</p>
      <span className="inline-flex w-fit rounded-full bg-accent px-5 py-2.5 font-medium text-accent-ink">
        Coming soon
      </span>
    </main>
  );
}
