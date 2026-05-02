import { Trash2, Download, FileX, CheckCircle2, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";

const currency = new Intl.NumberFormat("hu-HU", {
  style: "currency",
  currency: "HUF",
  maximumFractionDigits: 0,
});

export default function ItemList({ items, onDelete, loading }) {
  if (items.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center mx-auto mb-3">
          <FileX className="w-6 h-6 text-muted-foreground" />
        </div>
        <p className="font-semibold text-foreground">Még nincs tétel.</p>
        <p className="text-sm text-muted-foreground mt-1">Az első rögzítés után itt jelennek meg.</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {items.map((item) => (
        <BillCard key={item.id} item={item} onDelete={onDelete} loading={loading} />
      ))}
    </div>
  );
}

function BillCard({ item, onDelete, loading }) {
  return (
    <div className="group bg-card border border-border rounded-xl p-4 hover:shadow-md transition-all duration-200">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            {item.paid ? (
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                <CheckCircle2 className="w-3 h-3" />
                befizetve
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-chart-3/15 text-chart-3">
                <Clock className="w-3 h-3" />
                várakozik
              </span>
            )}
            <h4 className="font-semibold text-sm text-foreground">{item.name}</h4>
          </div>
          {item.note && (
            <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{item.note}</p>
          )}
        </div>
        <p className="text-base font-bold text-foreground whitespace-nowrap">
          {currency.format(Number(item.amount || 0))}
        </p>
      </div>

      <div className="flex items-center flex-wrap gap-2 mt-3 pt-3 border-t border-border">
        <FileLink url={item.invoice_file} name={item.invoice_file_name} label="Számla" />
        <FileLink url={item.receipt_file} name={item.receipt_file_name} label="Visszaigazolás" />
        
        <div className="ml-auto">
          <Button
            variant="ghost"
            size="sm"
            className="h-8 px-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
            onClick={() => onDelete(item)}
            disabled={loading}
          >
            <Trash2 className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>
    </div>
  );
}

function FileLink({ url, name, label }) {
  if (!url) {
    return (
      <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground bg-muted rounded-lg px-2.5 py-1.5">
        <FileX className="w-3 h-3" />
        {label}: nincs
      </span>
    );
  }

  return (
    <a
      href={url}
      download={name}
      target="_blank"
      rel="noreferrer"
      className="inline-flex items-center gap-1 text-[11px] font-medium text-primary bg-primary/8 hover:bg-primary/15 rounded-lg px-2.5 py-1.5 transition-colors"
    >
      <Download className="w-3 h-3" />
      {label}
      {name && <span className="text-muted-foreground ml-0.5 max-w-[80px] truncate">({name})</span>}
    </a>
  );
}