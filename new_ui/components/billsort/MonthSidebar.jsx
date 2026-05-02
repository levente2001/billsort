import { useState } from "react";
import { Plus, Calendar, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function MonthSidebar({ 
  months, 
  activeMonthId, 
  setActiveMonthId, 
  monthStats, 
  onAddMonth, 
  loading,
  isOpen,
  setIsOpen 
}) {
  const monthFormatter = new Intl.DateTimeFormat("hu-HU", {
    year: "numeric",
    month: "long",
  });
  const [monthLabel, setMonthLabel] = useState(monthFormatter.format(new Date()));

  async function handleAddMonth(e) {
    e.preventDefault();
    const label = monthLabel.trim();
    if (!label) return;
    await onAddMonth(label);
    setMonthLabel(monthFormatter.format(new Date()));
  }

  return (
    <div className="space-y-1">
      {/* Mobile toggle */}
      <button 
        className="md:hidden w-full flex items-center justify-between bg-card border border-border rounded-xl p-4"
        onClick={() => setIsOpen(!isOpen)}
      >
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-primary" />
          <span className="font-semibold text-sm">Hónapok</span>
          <span className="text-xs text-muted-foreground">({months.length})</span>
        </div>
        {isOpen ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
      </button>

      <div className={`${isOpen ? 'block' : 'hidden'} md:block space-y-3`}>
        {/* Add month form */}
        <form onSubmit={handleAddMonth} className="bg-card border border-border rounded-xl p-4 space-y-3">
          <label className="text-xs font-medium text-muted-foreground">Új havi fül</label>
          <div className="flex gap-2">
            <Input
              value={monthLabel}
              onChange={(e) => setMonthLabel(e.target.value)}
              placeholder="2026. április"
              className="text-sm h-9"
            />
            <Button size="sm" disabled={loading} className="h-9 px-3 shrink-0">
              <Plus className="w-4 h-4" />
            </Button>
          </div>
        </form>

        {/* Month list */}
        <div className="space-y-1.5">
          {months.map((month) => {
            const stat = monthStats.find((s) => s.id === month.id);
            const isActive = month.id === activeMonthId;
            return (
              <button
                key={month.id}
                onClick={() => {
                  setActiveMonthId(month.id);
                  setIsOpen(false);
                }}
                className={`w-full text-left rounded-xl p-3 transition-all duration-200 border ${
                  isActive
                    ? "bg-primary/10 border-primary/30 shadow-sm"
                    : "bg-card border-border hover:bg-accent hover:border-accent"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className={`text-sm font-semibold ${isActive ? "text-primary" : "text-foreground"}`}>
                    {month.label}
                  </span>
                  <span className="text-[11px] text-muted-foreground">
                    {stat?.itemCount || 0} tétel
                  </span>
                </div>
                {stat && stat.itemCount > 0 && (
                  <div className="mt-2 h-1 rounded-full bg-muted overflow-hidden">
                    <div 
                      className={`h-full rounded-full transition-all duration-500 ${isActive ? "bg-primary" : "bg-primary/50"}`}
                      style={{ width: `${stat.completion}%` }} 
                    />
                  </div>
                )}
              </button>
            );
          })}
          {months.length === 0 && (
            <p className="text-xs text-muted-foreground text-center py-6">
              Adj hozzá egy hónapot a kezdéshez.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}