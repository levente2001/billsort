import { useState } from "react";
import { X, Save, Upload, FileText, Loader2 } from "lucide-react";
import { base44 } from "@/api/base44Client";

export default function AddItemModal({ open, onClose, onSubmit, loading, activeMonth }) {
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [paid, setPaid] = useState(true);
  const [note, setNote] = useState("");
  const [invoiceFile, setInvoiceFile] = useState(null);
  const [receiptFile, setReceiptFile] = useState(null);
  const [uploading, setUploading] = useState(false);

  if (!open) return null;

  async function handleSubmit(e) {
    e.preventDefault();
    if (!name.trim() || !amount) return;

    setUploading(true);
    let invoice_file = null, invoice_file_name = null;
    let receipt_file = null, receipt_file_name = null;

    if (invoiceFile) {
      const res = await base44.integrations.Core.UploadFile({ file: invoiceFile });
      invoice_file = res.file_url;
      invoice_file_name = invoiceFile.name;
    }
    if (receiptFile) {
      const res = await base44.integrations.Core.UploadFile({ file: receiptFile });
      receipt_file = res.file_url;
      receipt_file_name = receiptFile.name;
    }
    setUploading(false);

    await onSubmit({ name: name.trim(), amount: Number(amount), paid, note: note.trim(), invoice_file, invoice_file_name, receipt_file, receipt_file_name });

    setName(""); setAmount(""); setPaid(true); setNote("");
    setInvoiceFile(null); setReceiptFile(null);
  }

  const isSubmitting = loading || uploading;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-card border border-border rounded-t-2xl sm:rounded-2xl w-full sm:max-w-md shadow-2xl z-10">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <div>
            <h2 className="font-bold text-foreground">Tétel hozzáadása</h2>
            {activeMonth && (
              <p className="text-xs text-muted-foreground mt-0.5">{activeMonth.label}</p>
            )}
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-muted transition-colors"
          >
            <X className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className="text-xs font-medium text-muted-foreground">Tétel neve *</label>
            <input
              className="mt-1 w-full border border-input rounded-lg px-3 py-2.5 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Áram, gáz, közös költség"
              required
            />
          </div>

          <div>
            <label className="text-xs font-medium text-muted-foreground">Összeg (Ft) *</label>
            <input
              type="number"
              min="0"
              step="1"
              className="mt-1 w-full border border-input rounded-lg px-3 py-2.5 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="45000"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <FileInput label="Számla PDF" file={invoiceFile} onChange={setInvoiceFile} />
            <FileInput label="Visszaigazolás" file={receiptFile} onChange={setReceiptFile} />
          </div>

          <div>
            <label className="text-xs font-medium text-muted-foreground">Megjegyzés</label>
            <textarea
              rows={2}
              className="mt-1 w-full border border-input rounded-lg px-3 py-2.5 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring resize-none"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Fizetési határidő, azonosító..."
            />
          </div>

          <label className="flex items-center gap-2.5 cursor-pointer">
            <input
              type="checkbox"
              checked={paid}
              onChange={(e) => setPaid(e.target.checked)}
              className="w-4 h-4 accent-primary rounded"
            />
            <span className="text-sm font-medium text-foreground">Befizetve</span>
          </label>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-primary text-primary-foreground rounded-lg py-2.5 text-sm font-semibold flex items-center justify-center gap-2 hover:opacity-90 transition-opacity disabled:opacity-60"
          >
            {isSubmitting ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> Mentés...</>
            ) : (
              <><Save className="w-4 h-4" /> Tétel rögzítése</>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}

function FileInput({ label, file, onChange }) {
  return (
    <div>
      <label className="text-xs font-medium text-muted-foreground">{label}</label>
      <label className="mt-1 flex items-center gap-1.5 border border-dashed border-border rounded-lg px-3 py-2 cursor-pointer hover:bg-accent/30 transition-colors">
        {file ? (
          <><FileText className="w-3.5 h-3.5 text-primary shrink-0" /><span className="text-xs text-foreground truncate">{file.name}</span></>
        ) : (
          <><Upload className="w-3.5 h-3.5 text-muted-foreground shrink-0" /><span className="text-xs text-muted-foreground">Fájl</span></>
        )}
        <input type="file" accept="application/pdf" className="hidden" onChange={(e) => onChange(e.target.files?.[0] || null)} />
      </label>
    </div>
  );
}