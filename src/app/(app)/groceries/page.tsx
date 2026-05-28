export default function GroceriesPage() {
  return (
    <div className="p-4 space-y-6">
      <h1 className="text-2xl font-bold tracking-tight">Groceries</h1>

      <div className="glass-card p-6 flex flex-col items-center justify-center min-h-[200px] text-center">
        <p className="text-muted-foreground text-sm">
          Your grocery list will appear here after you confirm a meal plan.
        </p>
      </div>
    </div>
  );
}
