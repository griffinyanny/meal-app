export default function YouPage() {
  return (
    <div className="p-4 space-y-6">
      <h1 className="text-2xl font-bold tracking-tight">You</h1>

      <div className="glass-card p-6 flex flex-col items-center justify-center min-h-[200px] text-center">
        <p className="text-muted-foreground text-sm">
          Your preferences, dietary info, and memory audit will live here.
        </p>
      </div>
    </div>
  );
}
