import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Upload, FileText, Save, Loader2 } from "lucide-react";
import { base44 } from "@/api/base44Client";

export default function ItemForm({ loading, onSubmit }) {
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [paid, setPaid] = useState(true);
  const [note, setNote] = useState("");
  const [invoiceFile, setInvoiceFile] = useState(null);
  const [receiptFile, setReceiptFile] = useState(null);
  const [uploading, setUploading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!name.trim() || !amount) return;

    setUploading(true);
    
    let invoiceUrl = null;
    let invoiceName = null;
    let receiptUrl = null;
    let receiptName = null;

    if (invoiceFile) {
      const result = await base44.integrations.Core.UploadFile({ file: invoiceFile });
      invoiceUrl = result.file_url;
      invoiceName = invoiceFile.name;
    }
    if (receiptFile) {
      const result = await base44.integrations.Core.UploadFile({ file: receiptFile });
      receiptUrl = result.file_url;
      receiptName = receiptFile.name;
    }

    await onSubmit({
      name: name.trim(),
      amount: Number(amount),
      paid,
      note: note.trim(),
      invoice_file: invoiceUrl,
      invoice_file_name: invoiceName,
      receipt_file: receiptUrl,
      receipt_file_name: receiptName,
    });

    setName("");
    setAmount("");
    setPaid(true);
    setNote("");
    setInvoiceFile(null);
    setReceiptFile(null);
    setUploading(false);
  }

  const isSubmitting = loading || uploading;

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground">Tétel neve</label>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Áram, gáz, közös költség"
            required
            className="h-10"
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground">Összeg (Ft)</label>
          <Input
            type="number"
            min="0"
            step="1"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="45 000"
            required
            className="h-10"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <FileInput 
          label="Számla PDF" 
          file={invoiceFile} 
          onChange={setInvoiceFile} 
        />
        <FileInput 
          label="Visszaigazolás PDF" 
          file={receiptFile} 
          onChange={setReceiptFile} 
        />
      </div>

      <div className="space-y-1.5">
        <label className="text-xs font-medium text-muted-foreground">Megjegyzés</label>
        <Textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Például fizetési határidő, szolgáltató vagy egyedi azonosító"
          rows={2}
          className="resize-none text-sm"
        />
      </div>

      <div className="flex items-center justify-between pt-1">
        <label className="flex items-center gap-2 cursor-pointer">
          <Checkbox checked={paid} onCheckedChange={setPaid} />
          <span className="text-sm font-medium text-foreground">Befizetve</span>
        </label>
        <Button disabled={isSubmitting} className="h-10 px-5">
          {isSubmitting ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Mentés...
            </>
          ) : (
            <>
              <Save className="w-4 h-4 mr-2" />
              Tétel rögzítése
            </>
          )}
        </Button>
      </div>
    </form>
  );
}

function FileInput({ label, file, onChange }) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-medium text-muted-foreground">{label}</label>
      <label className="flex items-center gap-2 border border-dashed border-border rounded-lg p-3 cursor-pointer hover:bg-accent/50 transition-colors">
        {file ? (
          <>
            <FileText className="w-4 h-4 text-primary shrink-0" />
            <span className="text-sm text-foreground truncate">{file.name}</span>
          </>
        ) : (
          <>
            <Upload className="w-4 h-4 text-muted-foreground shrink-0" />
            <span className="text-sm text-muted-foreground">Fájl kiválasztása</span>
          </>
        )}
        <input
          type="file"
          accept="application/pdf"
          className="hidden"
          onChange={(e) => onChange(e.target.files?.[0] || null)}
        />
      </label>
    </div>
  );
}