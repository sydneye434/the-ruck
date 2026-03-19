import type { ReactNode } from "react";

export default function ComingSoon({ title, description }: { title: string; description?: ReactNode }) {
  return (
    <div className="mx-auto max-w-3xl px-6 py-10">
      <div className="border border-white/10 bg-white/5 p-6">
        <div className="text-xs font-mono text-white/70">Status</div>
        <h1 className="mt-2 text-2xl font-semibold">{title}</h1>
        <p className="mt-2 text-white/75">{description ?? "This section is scaffolding-only right now. Next step: wire it to the SprintForge/The Ruck data layer."}</p>
        <div className="mt-6 text-sm text-white/60 font-mono">Next: API + repository-backed pages</div>
      </div>
    </div>
  );
}

