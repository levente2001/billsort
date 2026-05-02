import { Wallet, CheckCircle, FileWarning } from "lucide-react";

const currency = new Intl.NumberFormat("hu-HU", {
  style: "currency",
  currency: "HUF",
  maximumFractionDigits: 0,
});

export default function SummaryBar({ items, total, paidCount }) {
  const missingInvoice = items.filter((i) => !i.invoice_file).length;
  const missingReceipt = items.filter((i) => !i.receipt_file).length;
  const missingTotal = missingInvoice + missingReceipt;

  return (
    <div className="grid grid-cols-3 gap-3">
      <div className="bg-muted/50 rounded-lg p-3 text-center">
        <Wallet className="w-4 h-4 text-primary mx-auto mb-1" />
        <p className="text-xs text-muted-foreground">Összesen</p>
        <p className="text-sm font-bold text-foreground">{currency.format(total)}</p>
      </div>
      <div className="bg-muted/50 rounded-lg p-3 text-center">
        <CheckCircle className="w-4 h-4 text-primary mx-auto mb-1" />
        <p className="text-xs text-muted-foreground">Befizetve</p>
        <p className="text-sm font-bold text-foreground">{paidCount}/{items.length}</p>
      </div>
      <div className="bg-muted/50 rounded-lg p-3 text-center">
        <FileWarning className="w-4 h-4 text-destructive/70 mx-auto mb-1" />
        <p className="text-xs text-muted-foreground">Hiányzó</p>
        <p className="text-sm font-bold text-foreground">{missingTotal}</p>
      </div>
    </div>
  );
}