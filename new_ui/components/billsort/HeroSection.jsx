import { Receipt } from "lucide-react";

export default function HeroSection({ activeMonth, items, total, paidCount, completion }) {
  const currency = new Intl.NumberFormat("hu-HU", {
    style: "currency",
    currency: "HUF",
    maximumFractionDigits: 0,
  });

  return (
    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary/90 via-primary to-primary/80 p-6 md:p-10 text-primary-foreground">
      <div className="absolute inset-0 opacity-10">
        <div className="absolute -right-20 -top-20 w-80 h-80 rounded-full bg-white/20 blur-3xl" />
        <div className="absolute -left-10 -bottom-10 w-60 h-60 rounded-full bg-white/10 blur-2xl" />
      </div>
      
      <div className="relative flex flex-col md:flex-row md:items-center md:justify-between gap-6">
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Receipt className="w-5 h-5 opacity-80" />
            <span className="text-xs font-semibold tracking-widest uppercase opacity-80">BillSort</span>
          </div>
          <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold leading-tight">
            Számlák és befizetések<br className="hidden md:block" /> egy helyen.
          </h1>
          <p className="text-sm md:text-base opacity-80 max-w-md leading-relaxed">
            Havi bontásban rögzítheted a tételeket, a számla összegét, a számla PDF-et és a kifizetési visszaigazolást.
          </p>
        </div>

        <div className="bg-white/15 backdrop-blur-sm rounded-xl p-5 min-w-[240px] border border-white/10">
          <span className="text-[10px] font-bold tracking-widest uppercase opacity-70">Aktuális hónap</span>
          <p className="text-lg font-bold mt-1">{activeMonth?.label || "Nincs még hónap"}</p>
          
          <div className="mt-3 h-2 rounded-full bg-white/20 overflow-hidden">
            <div 
              className="h-full rounded-full bg-white transition-all duration-500 ease-out" 
              style={{ width: `${completion}%` }} 
            />
          </div>
          
          <p className="text-xs mt-2 opacity-80">
            {paidCount}/{items.length} tétel rendezve, összesen {currency.format(total)}
          </p>
        </div>
      </div>
    </div>
  );
}