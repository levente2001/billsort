import { Wallet, CheckCircle, TrendingUp, FileWarning } from "lucide-react";

const currency = new Intl.NumberFormat("hu-HU", {
  style: "currency",
  currency: "HUF",
  maximumFractionDigits: 0,
});

function StatCard({ icon: Icon, label, value, color }) {
  return (
    <div className="bg-card rounded-xl border border-border p-4 flex items-start gap-3 hover:shadow-md transition-shadow">
      <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${color}`}>
        <Icon className="w-4 h-4" />
      </div>
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground font-medium">{label}</p>
        <p className="text-lg font-bold text-foreground truncate">{value}</p>
      </div>
    </div>
  );
}

function MonthStatCard({ month }) {
  return (
    <div className="bg-card rounded-xl border border-border p-4 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="font-semibold text-sm text-foreground truncate">{month.label}</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            {month.paidCount}/{month.itemCount} rendezve
          </p>
        </div>
        <p className="text-sm font-bold text-foreground whitespace-nowrap">
          {currency.format(month.total)}
        </p>
      </div>
      
      <div className="mt-3 h-1.5 rounded-full bg-muted overflow-hidden">
        <div 
          className="h-full rounded-full bg-primary transition-all duration-500" 
          style={{ width: `${month.completion}%` }} 
        />
      </div>
      
      {month.missingFiles > 0 && (
        <p className="text-[11px] text-destructive/80 mt-2 flex items-center gap-1">
          <FileWarning className="w-3 h-3" />
          {month.missingFiles} hiányzó PDF
        </p>
      )}
    </div>
  );
}

export default function StatsOverview({ globalStats, monthStats }) {
  const paidRate = globalStats.itemCount === 0 
    ? 0 
    : Math.round((globalStats.paidCount / globalStats.itemCount) * 100);

  return (
    <div className="space-y-4">
      <div>
        <span className="text-[10px] font-bold tracking-widest uppercase text-primary">Statisztika</span>
        <h2 className="text-xl font-bold text-foreground mt-0.5">Áttekintés</h2>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard 
          icon={Wallet} 
          label="Összes hónap" 
          value={currency.format(globalStats.total)} 
          color="bg-primary/10 text-primary" 
        />
        <StatCard 
          icon={CheckCircle} 
          label="Rendezett tételek" 
          value={`${globalStats.paidCount}/${globalStats.itemCount}`} 
          color="bg-chart-2/15 text-chart-2" 
        />
        <StatCard 
          icon={TrendingUp} 
          label="Rendezettség" 
          value={`${paidRate}%`} 
          color="bg-chart-3/15 text-chart-3" 
        />
        <StatCard 
          icon={FileWarning} 
          label="Hiányzó PDF-ek" 
          value={globalStats.missingFiles} 
          color="bg-destructive/10 text-destructive" 
        />
      </div>

      {monthStats.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {monthStats.map((month) => (
            <MonthStatCard key={month.id} month={month} />
          ))}
        </div>
      )}
    </div>
  );
}