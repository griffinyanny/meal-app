export default function PlanPage() {
  return (
    <div className="p-4 space-y-6">
      <div className="space-y-1">
        <p className="text-xs font-medium tracking-widest text-muted-foreground uppercase">
          Your Chef
        </p>
        <h1 className="text-2xl font-bold tracking-tight">
          What are we cooking?
        </h1>
        <p className="text-sm text-muted-foreground">
          I don&apos;t know much about you yet. Tell me what you&apos;re in the mood for,
          or let me surprise you.
        </p>
      </div>

      <div className="glass-card p-6 flex flex-col items-center justify-center min-h-[200px] text-center">
        <p className="text-muted-foreground text-sm">
          Your weekly meal plan will appear here.
        </p>
        <p className="text-xs text-muted-foreground/60 mt-2">
          Phase 1B will bring this to life with AI-powered plan generation.
        </p>
      </div>
    </div>
  );
}
