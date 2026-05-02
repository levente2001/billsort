import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Plus, Menu, BarChart2, PlusCircle, Trash2, Loader2, CheckCircle2, Clock, Download, FileX } from "lucide-react";
import AddItemModal from "../components/billsort/AddItemModal";

const currency = new Intl.NumberFormat("hu-HU", {
  style: "currency",
  currency: "HUF",
  maximumFractionDigits: 0,
});

export default function Dashboard() {
  const navigate = useNavigate();
  const [months, setMonths] = useState([]);
  const [activeMonthId, setActiveMonthId] = useState("");
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [addingMonth, setAddingMonth] = useState(false);

  useEffect(() => {
    async function load() {
      const data = await base44.entities.BillMonth.list("created_date");
      setMonths(data);
      if (data.length > 0) setActiveMonthId(data[0].id);
      setLoading(false);
    }
    load();
  }, []);

  useEffect(() => {
    if (!activeMonthId) { setItems([]); return; }
    async function loadItems() {
      const data = await base44.entities.BillItem.filter({ month_id: activeMonthId }, "-created_date");
      setItems(data);
    }
    loadItems();
  }, [activeMonthId]);

  async function addMonth() {
    setAddingMonth(false);
    const monthFormatter = new Intl.DateTimeFormat("hu-HU", { year: "numeric", month: "long" });
    const label = monthFormatter.format(new Date());
    setActionLoading(true);
    const result = await base44.entities.BillMonth.create({ label });
    setMonths((prev) => [...prev, result]);
    setActiveMonthId(result.id);
    setActionLoading(false);
  }

  async function deleteMonth() {
    if (!activeMonthId) return;
    setActionLoading(true);
    for (const item of items) await base44.entities.BillItem.delete(item.id);
    await base44.entities.BillMonth.delete(activeMonthId);
    const remaining = months.filter((m) => m.id !== activeMonthId);
    setMonths(remaining);
    setItems([]);
    setActiveMonthId(remaining.length > 0 ? remaining[remaining.length - 1].id : "");
    setActionLoading(false);
  }

  async function addItem(data) {
    setActionLoading(true);
    const result = await base44.entities.BillItem.create({ ...data, month_id: activeMonthId });
    setItems((prev) => [result, ...prev]);
    setModalOpen(false);
    setActionLoading(false);
  }

  async function deleteItem(item) {
    setActionLoading(true);
    await base44.entities.BillItem.delete(item.id);
    setItems((prev) => prev.filter((i) => i.id !== item.id));
    setActionLoading(false);
  }

  const activeMonth = months.find((m) => m.id === activeMonthId);
  const total = items.reduce((s, i) => s + Number(i.amount || 0), 0);
  const paidCount = items.filter((i) => i.paid).length;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Top bar */}
      <header className="bg-card border-b border-border px-4 py-3 flex items-center justify-between sticky top-0 z-20">
        <div className="flex items-center gap-2">
          <span className="text-base font-bold text-primary">BillSort</span>
        </div>
        <div className="relative">
          <button
            className="w-9 h-9 flex items-center justify-center rounded-lg hover:bg-muted transition-colors"
            onClick={() => setMenuOpen((v) => !v)}
          >
            <Menu className="w-5 h-5 text-foreground" />
          </button>
          {menuOpen && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
              <div className="absolute right-0 top-11 z-20 bg-card border border-border rounded-xl shadow-lg w-48 overflow-hidden">
                <button
                  className="w-full flex items-center gap-3 px-4 py-3 text-sm font-medium text-foreground hover:bg-muted transition-colors"
                  onClick={() => { setMenuOpen(false); setModalOpen(true); }}
                >
                  <PlusCircle className="w-4 h-4 text-primary" />
                  Tétel hozzáadása
                </button>
                <div className="border-t border-border" />
                <button
                  className="w-full flex items-center gap-3 px-4 py-3 text-sm font-medium text-foreground hover:bg-muted transition-colors"
                  onClick={() => { setMenuOpen(false); navigate("/statistics"); }}
                >
                  <BarChart2 className="w-4 h-4 text-primary" />
                  Statisztika
                </button>
              </div>
            </>
          )}
        </div>
      </header>

      {/* Excel-style tab bar */}
      <div className="bg-card border-b border-border px-2 flex items-end gap-0.5 overflow-x-auto">
        {months.map((month) => (
          <button
            key={month.id}
            onClick={() => setActiveMonthId(month.id)}
            className={`shrink-0 px-4 py-2.5 text-sm font-medium border-x border-t rounded-t-lg transition-colors whitespace-nowrap ${
              month.id === activeMonthId
                ? "bg-background border-border text-primary -mb-px z-10 relative"
                : "bg-muted/60 border-transparent text-muted-foreground hover:bg-muted hover:text-foreground"
            }`}
          >
            {month.label}
          </button>
        ))}
        <button
          onClick={addMonth}
          disabled={actionLoading}
          className="shrink-0 px-3 py-2.5 text-muted-foreground hover:text-primary hover:bg-muted/60 rounded-t-lg transition-colors"
          title="Új hónap hozzáadása"
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>

      {/* Content */}
      <main className="flex-1 max-w-5xl w-full mx-auto px-4 py-6 space-y-4">
        {activeMonth ? (
          <>
            {/* Month header */}
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-lg font-bold text-foreground">{activeMonth.label}</h1>
                <p className="text-sm text-muted-foreground">
                  {items.length} tétel · {currency.format(total)} · {paidCount}/{items.length} befizetve
                </p>
              </div>
              <button
                onClick={deleteMonth}
                disabled={actionLoading}
                className="text-xs text-muted-foreground hover:text-destructive transition-colors flex items-center gap-1"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Hónap törlése
              </button>
            </div>

            {/* Item list */}
            {items.length === 0 ? (
              <div className="text-center py-20 text-muted-foreground">
                <FileX className="w-10 h-10 mx-auto mb-3 opacity-40" />
                <p className="font-medium">Még nincs tétel ebben a hónapban.</p>
                <p className="text-sm mt-1">A hamburger menüből adhatsz hozzá újat.</p>
              </div>
            ) : (
              <div className="bg-card border border-border rounded-xl overflow-hidden">
                {/* Table header */}
                <div className="grid grid-cols-[1fr_auto_auto_auto] gap-4 px-4 py-2.5 border-b border-border bg-muted/40 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  <span>Tétel</span>
                  <span className="text-right">Összeg</span>
                  <span className="hidden sm:block text-center">Fájlok</span>
                  <span></span>
                </div>

                {items.map((item, idx) => (
                  <div
                    key={item.id}
                    className={`grid grid-cols-[1fr_auto_auto_auto] gap-4 px-4 py-3.5 items-center ${
                      idx !== items.length - 1 ? "border-b border-border" : ""
                    } hover:bg-muted/30 transition-colors`}
                  >
                    {/* Name + status + note */}
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        {item.paid ? (
                          <CheckCircle2 className="w-3.5 h-3.5 text-primary shrink-0" />
                        ) : (
                          <Clock className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                        )}
                        <span className="font-medium text-sm text-foreground truncate">{item.name}</span>
                        {!item.paid && (
                          <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground">
                            függőben
                          </span>
                        )}
                      </div>
                      {item.note && (
                        <p className="text-xs text-muted-foreground mt-0.5 ml-5 truncate">{item.note}</p>
                      )}
                    </div>

                    {/* Amount */}
                    <span className="text-sm font-bold text-foreground whitespace-nowrap">
                      {currency.format(Number(item.amount || 0))}
                    </span>

                    {/* Files */}
                    <div className="hidden sm:flex items-center gap-1.5">
                      <FileChip url={item.invoice_file} name={item.invoice_file_name} label="Számla" />
                      <FileChip url={item.receipt_file} name={item.receipt_file_name} label="Visszaig." />
                    </div>

                    {/* Delete */}
                    <button
                      onClick={() => deleteItem(item)}
                      disabled={actionLoading}
                      className="w-7 h-7 flex items-center justify-center rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-24 text-muted-foreground">
            <p className="font-medium">Nincs még hónap.</p>
            <p className="text-sm mt-1">A "+" gombra kattintva adhatod hozzá az első hónapot.</p>
          </div>
        )}
      </main>

      {/* Add Item Modal */}
      <AddItemModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSubmit={addItem}
        loading={actionLoading}
        activeMonth={activeMonth}
      />
    </div>
  );
}

function FileChip({ url, name, label }) {
  if (!url) {
    return (
      <span className="text-[10px] text-muted-foreground/60 border border-dashed border-border rounded px-1.5 py-0.5">
        {label}
      </span>
    );
  }
  return (
    <a
      href={url}
      download={name}
      target="_blank"
      rel="noreferrer"
      className="text-[10px] font-medium text-primary bg-primary/10 hover:bg-primary/20 rounded px-1.5 py-0.5 flex items-center gap-0.5 transition-colors"
    >
      <Download className="w-2.5 h-2.5" />
      {label}
    </a>
  );
}