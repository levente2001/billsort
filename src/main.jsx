import React, { useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  ArrowLeft,
  BarChart2,
  CheckCircle2,
  Clock,
  Download,
  FilePenLine,
  FileText,
  FileWarning,
  FileX,
  Loader2,
  Menu,
  Plus,
  PlusCircle,
  Save,
  Trash2,
  TrendingUp,
  Upload,
  Wallet,
  X,
} from "lucide-react";
import { createFirebaseRepository, hasFirebaseConfig } from "./firebase";
import { createLocalRepository } from "./localRepository";
import "./styles.css";

const currency = new Intl.NumberFormat("hu-HU", {
  style: "currency",
  currency: "HUF",
  maximumFractionDigits: 0,
});

const monthFormatter = new Intl.DateTimeFormat("hu-HU", {
  year: "numeric",
  month: "long",
});

function getCreatedAtTime(entry) {
  const value = entry?.createdAt;
  if (!value) return 0;
  if (typeof value.toMillis === "function") return value.toMillis();
  if (typeof value.seconds === "number") return value.seconds * 1000;
  const parsed = Date.parse(value);
  return Number.isNaN(parsed) ? 0 : parsed;
}

function App() {
  const repository = useMemo(
    () => (hasFirebaseConfig ? createFirebaseRepository() : createLocalRepository()),
    [],
  );
  const [months, setMonths] = useState([]);
  const [activeMonthId, setActiveMonthId] = useState("");
  const [itemsByMonth, setItemsByMonth] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [monthModalOpen, setMonthModalOpen] = useState(false);
  const [deleteRequest, setDeleteRequest] = useState(null);
  const [view, setView] = useState("dashboard");
  const sortedMonths = useMemo(
    () => [...months].sort((a, b) => getCreatedAtTime(b) - getCreatedAtTime(a)),
    [months],
  );

  useEffect(() => repository.subscribeMonths(setMonths), [repository]);

  useEffect(() => {
    if (!activeMonthId && sortedMonths.length > 0) {
      setActiveMonthId(sortedMonths[0].id);
    }
  }, [activeMonthId, sortedMonths]);

  useEffect(() => {
    const unsubscribers = months.map((month) =>
      repository.subscribeItems(month.id, (monthItems) => {
        setItemsByMonth((current) => ({ ...current, [month.id]: monthItems }));
      }),
    );

    setItemsByMonth((current) =>
      months.reduce((next, month) => {
        next[month.id] = current[month.id] || [];
        return next;
      }, {}),
    );

    return () => unsubscribers.forEach((unsubscribe) => unsubscribe?.());
  }, [months, repository]);

  const activeMonth = sortedMonths.find((month) => month.id === activeMonthId);
  const items = activeMonthId ? itemsByMonth[activeMonthId] || [] : [];
  const allItems = sortedMonths.flatMap((month) => itemsByMonth[month.id] || []);
  const total = items.reduce((sum, item) => sum + Number(item.amount || 0), 0);
  const paidCount = items.filter((item) => item.paid).length;
  const monthStats = sortedMonths.map((month) => {
    const monthItems = itemsByMonth[month.id] || [];
    const monthTotal = monthItems.reduce((sum, item) => sum + Number(item.amount || 0), 0);
    const monthPaidCount = monthItems.filter((item) => item.paid).length;
    const missingFiles = monthItems.reduce(
      (sum, item) => sum + (item.invoiceFile ? 0 : 1) + (item.receiptFile ? 0 : 1),
      0,
    );

    return {
      id: month.id,
      label: month.label,
      total: monthTotal,
      itemCount: monthItems.length,
      paidCount: monthPaidCount,
      missingFiles,
      completion: monthItems.length === 0 ? 0 : Math.round((monthPaidCount / monthItems.length) * 100),
    };
  });
  const globalStats = {
    total: allItems.reduce((sum, item) => sum + Number(item.amount || 0), 0),
    itemCount: allItems.length,
    paidCount: allItems.filter((item) => item.paid).length,
    missingFiles: allItems.reduce(
      (sum, item) => sum + (item.invoiceFile ? 0 : 1) + (item.receiptFile ? 0 : 1),
      0,
    ),
  };

  async function addMonth(label) {
    setError("");
    setLoading(true);
    try {
      const result = await repository.createMonth(label);
      if (result?.id) setActiveMonthId(result.id);
      setMonthModalOpen(false);
      setView("dashboard");
    } catch (err) {
      setError("Nem sikerult letrehozni a honapot. Ellenorizd a Firebase beallitasokat.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function addItem(data) {
    if (!activeMonthId) return;

    setError("");
    setLoading(true);
    try {
      await repository.createItem(activeMonthId, data);
      setModalOpen(false);
    } catch (err) {
      setError("Nem sikerult menteni a tetelt vagy feltolteni a PDF-eket.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function updateItem(data) {
    if (!activeMonthId || !editingItem) return;

    setError("");
    setLoading(true);
    try {
      await repository.updateItem(activeMonthId, editingItem, data);
      setModalOpen(false);
      setEditingItem(null);
    } catch (err) {
      setError("Nem sikerult frissiteni a tetelt vagy feltolteni a PDF-eket.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function deleteItem(item) {
    setError("");
    setLoading(true);
    try {
      await repository.deleteItem(activeMonthId, item);
    } catch (err) {
      setError("Nem sikerult torolni a tetelt.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function deleteMonth() {
    setError("");
    setLoading(true);
    try {
      await repository.deleteMonth(activeMonthId, items);
      const remaining = sortedMonths.filter((month) => month.id !== activeMonthId);
      setActiveMonthId(remaining[0]?.id || "");
    } catch (err) {
      setError("Nem sikerult torolni a honapot.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function confirmDelete() {
    if (!deleteRequest) return;

    if (deleteRequest.type === "month") {
      await deleteMonth();
    } else {
      await deleteItem(deleteRequest.item);
    }

    setDeleteRequest(null);
  }

  return (
    <div className="app-frame">
      <Header
        menuOpen={menuOpen}
        setMenuOpen={setMenuOpen}
        onAddItem={() => {
          setEditingItem(null);
          setModalOpen(true);
        }}
        onStats={() => setView("stats")}
        hasActiveMonth={Boolean(activeMonth)}
      />

      {view === "dashboard" && (
        <MonthTabs
          months={sortedMonths}
          activeMonthId={activeMonthId}
          setActiveMonthId={setActiveMonthId}
          onAddMonth={() => setMonthModalOpen(true)}
          loading={loading}
        />
      )}

      {repository.mode === "local" && (
        <aside className="notice slim">
          Firebase env valtozok nelkul demo modban fut. Az eles menteshez toltsd ki a `.env.local`
          fajlt.
        </aside>
      )}

      {error && <aside className="error slim">{error}</aside>}

      {view === "stats" ? (
        <StatisticsPage globalStats={globalStats} monthStats={monthStats} onBack={() => setView("dashboard")} />
      ) : (
        <DashboardPage
          activeMonth={activeMonth}
          items={items}
          total={total}
          paidCount={paidCount}
          loading={loading}
          onDeleteMonth={() => setDeleteRequest({ type: "month" })}
          onDeleteItem={(item) => setDeleteRequest({ type: "item", item })}
          onAddItem={() => {
            setEditingItem(null);
            setModalOpen(true);
          }}
          onEditItem={(item) => {
            setEditingItem(item);
            setModalOpen(true);
          }}
        />
      )}

      <AddItemModal
        open={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setEditingItem(null);
        }}
        onSubmit={editingItem ? updateItem : addItem}
        loading={loading}
        activeMonth={activeMonth}
        item={editingItem}
      />

      <AddMonthModal
        open={monthModalOpen}
        onClose={() => setMonthModalOpen(false)}
        onSubmit={addMonth}
        loading={loading}
      />

      <ConfirmDeleteModal
        request={deleteRequest}
        onClose={() => setDeleteRequest(null)}
        onConfirm={confirmDelete}
        loading={loading}
      />
    </div>
  );
}

function Header({ menuOpen, setMenuOpen, onAddItem, onStats, hasActiveMonth }) {
  return (
    <header className="topbar">
      <button className="brand-button" type="button" aria-label="BillSort">
        BillSort
      </button>
      <div className="menu-wrap">
        <button className="icon-button" type="button" onClick={() => setMenuOpen((open) => !open)} aria-label="Menu">
          <Menu size={22} />
        </button>
        {menuOpen && (
          <>
            <button className="menu-backdrop" type="button" aria-label="Menu bezarasa" onClick={() => setMenuOpen(false)} />
            <div className="menu-popover">
              <button
                type="button"
                onClick={() => {
                  setMenuOpen(false);
                  onAddItem();
                }}
                disabled={!hasActiveMonth}
              >
                <PlusCircle size={20} />
                Tétel hozzáadása
              </button>
              <button
                type="button"
                onClick={() => {
                  setMenuOpen(false);
                  onStats();
                }}
              >
                <BarChart2 size={20} />
                Statisztika
              </button>
            </div>
          </>
        )}
      </div>
    </header>
  );
}

function MonthTabs({ months, activeMonthId, setActiveMonthId, onAddMonth, loading }) {
  return (
    <nav className="tabbar" aria-label="Havi fulek">
      <button
        className="tab add-tab"
        type="button"
        onClick={onAddMonth}
        disabled={loading}
        title="Uj honap hozzaadasa"
      >
        <Plus size={18} />
      </button>
      {months.map((month) => (
        <button
          type="button"
          key={month.id}
          onClick={() => setActiveMonthId(month.id)}
          className={month.id === activeMonthId ? "tab active" : "tab"}
        >
          {month.label}
        </button>
      ))}
    </nav>
  );
}

function DashboardPage({
  activeMonth,
  items,
  total,
  paidCount,
  loading,
  onDeleteMonth,
  onDeleteItem,
  onAddItem,
  onEditItem,
}) {
  if (!activeMonth) {
    return (
      <main className="page-shell empty-page">
        <FileX size={42} />
        <h1>Nincs meg honap.</h1>
        <p>A felso "+" fullel add hozza az elso honapot.</p>
      </main>
    );
  }

  return (
    <main className="page-shell dashboard-page">
      <section className="month-header">
        <div>
          <h1>{activeMonth.label}</h1>
          <p>
            {items.length} tétel · {currency.format(total)} · {paidCount}/{items.length} befizetve
          </p>
        </div>
        <button className="text-action danger-action" type="button" onClick={onDeleteMonth} disabled={loading}>
          <Trash2 size={16} />
          Hónap törlése
        </button>
      </section>

      <ItemTable items={items} onDelete={onDeleteItem} onEdit={onEditItem} loading={loading} onAddItem={onAddItem} />
    </main>
  );
}

function ItemTable({ items, onDelete, onEdit, loading, onAddItem }) {
  if (items.length === 0) {
    return (
      <section className="empty-list">
        <FileX size={44} />
        <p>Még nincs tétel ebben a hónapban.</p>
        <button type="button" onClick={onAddItem}>
          <PlusCircle size={18} />
          Tétel hozzáadása
        </button>
      </section>
    );
  }

  return (
    <section className="items-table" aria-label="Rogzitett tetelek">
      <div className="table-head">
        <span>Tétel</span>
        <span>Összeg</span>
        <span>Fájlok</span>
        <span>Akciók</span>
      </div>
      {items.map((item) => (
        <article className="table-row" key={item.id}>
          <div className="item-cell">
            <div className="item-title">
              {item.paid ? <CheckCircle2 size={16} /> : <Clock size={16} />}
              <strong>{item.name}</strong>
            </div>
            {item.note && <p>{item.note}</p>}
          </div>
          <strong className="amount-cell">{currency.format(Number(item.amount || 0))}</strong>
          <div className="file-cell">
            <FileChip file={item.invoiceFile} label="Számla" />
            <FileChip file={item.receiptFile} label="Visszaig." />
          </div>
          <div className="action-cell">
            <button className="edit-chip" type="button" onClick={() => onEdit(item)} disabled={loading} aria-label="Tetel szerkesztese">
              <FilePenLine size={16} />
            </button>
            <button className="delete-chip" type="button" onClick={() => onDelete(item)} disabled={loading} aria-label="Tetel torlese">
              <Trash2 size={16} />
            </button>
          </div>
        </article>
      ))}
    </section>
  );
}

function FileChip({ file, label }) {
  if (!file?.url) {
    return <span className="file-chip missing">{label}</span>;
  }

  return (
    <a className="file-chip ready" href={file.url} download={file.name} target="_blank" rel="noreferrer">
      <Download size={12} />
      {label}
    </a>
  );
}

function AddItemModal({ open, onClose, onSubmit, loading, activeMonth, item }) {
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [paid, setPaid] = useState(true);
  const [note, setNote] = useState("");
  const [invoiceFile, setInvoiceFile] = useState(null);
  const [receiptFile, setReceiptFile] = useState(null);
  const isEditing = Boolean(item);

  useEffect(() => {
    if (!open) return;

    setName(item?.name || "");
    setAmount(item?.amount != null ? String(item.amount) : "");
    setPaid(item?.paid ?? true);
    setNote(item?.note || "");
    setInvoiceFile(null);
    setReceiptFile(null);
  }, [item, open]);

  if (!open) return null;

  async function submit(event) {
    event.preventDefault();
    if (!name.trim() || !amount) return;

    await onSubmit({
      name: name.trim(),
      amount,
      paid,
      note: note.trim(),
      invoiceFile,
      receiptFile,
    });

    setName("");
    setAmount("");
    setPaid(true);
    setNote("");
    setInvoiceFile(null);
    setReceiptFile(null);
  }

  return (
    <div className="modal-layer">
      <button className="modal-backdrop" type="button" aria-label="Modal bezarasa" onClick={onClose} />
      <section className="item-modal" role="dialog" aria-modal="true" aria-labelledby="modal-title">
        <header>
          <div>
            <h2 id="modal-title">{isEditing ? "Tétel szerkesztése" : "Tétel hozzáadása"}</h2>
            {activeMonth && <p>{activeMonth.label}</p>}
          </div>
          <button className="modal-close" type="button" onClick={onClose} aria-label="Bezaras">
            <X size={18} />
          </button>
        </header>

        <form onSubmit={submit} className="modal-form">
          <label>
            Tétel neve *
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Áram, gáz, közös költség"
              required
            />
          </label>

          <label>
            Összeg (Ft) *
            <input
              type="number"
              min="0"
              step="1"
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
              placeholder="45000"
              required
            />
          </label>

          <div className="file-input-grid">
            <FileInput label="Számla PDF" file={invoiceFile} currentFile={item?.invoiceFile} onChange={setInvoiceFile} />
            <FileInput label="Visszaigazolás" file={receiptFile} currentFile={item?.receiptFile} onChange={setReceiptFile} />
          </div>

          <label>
            Megjegyzés
            <textarea
              rows={2}
              value={note}
              onChange={(event) => setNote(event.target.value)}
              placeholder="Fizetési határidő, azonosító..."
            />
          </label>

          <label className="checkbox-row">
            <input type="checkbox" checked={paid} onChange={(event) => setPaid(event.target.checked)} />
            Befizetve
          </label>

          <button className="primary-submit" type="submit" disabled={loading}>
            {loading ? <Loader2 className="spin" size={18} /> : <Save size={18} />}
            {loading ? "Mentés..." : isEditing ? "Módosítás mentése" : "Tétel rögzítése"}
          </button>
        </form>
      </section>
    </div>
  );
}

function AddMonthModal({ open, onClose, onSubmit, loading }) {
  const [label, setLabel] = useState(monthFormatter.format(new Date()));

  if (!open) return null;

  async function submit(event) {
    event.preventDefault();
    const trimmedLabel = label.trim();
    if (!trimmedLabel) return;

    await onSubmit(trimmedLabel);
    setLabel(monthFormatter.format(new Date()));
  }

  return (
    <div className="modal-layer">
      <button className="modal-backdrop" type="button" aria-label="Modal bezarasa" onClick={onClose} />
      <section className="item-modal month-modal" role="dialog" aria-modal="true" aria-labelledby="month-modal-title">
        <header>
          <div>
            <h2 id="month-modal-title">Hónap hozzáadása</h2>
            <p>Adj nevet az új fülnek.</p>
          </div>
          <button className="modal-close" type="button" onClick={onClose} aria-label="Bezaras">
            <X size={18} />
          </button>
        </header>

        <form onSubmit={submit} className="modal-form">
          <label>
            Hónap neve *
            <input
              value={label}
              onChange={(event) => setLabel(event.target.value)}
              placeholder="2026. április"
              autoFocus
              required
            />
          </label>

          <button className="primary-submit" type="submit" disabled={loading}>
            {loading ? <Loader2 className="spin" size={18} /> : <Save size={18} />}
            {loading ? "Mentés..." : "Hónap létrehozása"}
          </button>
        </form>
      </section>
    </div>
  );
}

function ConfirmDeleteModal({ request, onClose, onConfirm, loading }) {
  if (!request) return null;

  const isMonth = request.type === "month";
  const title = isMonth ? "Hónap törlése" : "Tétel törlése";
  const message = isMonth
    ? "Biztosan törlöd ezt a hónapot és az összes hozzá tartozó tételt?"
    : `Biztosan törlöd ezt a tételt: ${request.item?.name || ""}?`;

  return (
    <div className="modal-layer">
      <button className="modal-backdrop" type="button" aria-label="Modal bezarasa" onClick={onClose} />
      <section className="item-modal confirm-modal" role="dialog" aria-modal="true" aria-labelledby="confirm-modal-title">
        <header>
          <div>
            <h2 id="confirm-modal-title">{title}</h2>
            <p>{message}</p>
          </div>
          <button className="modal-close" type="button" onClick={onClose} aria-label="Bezaras">
            <X size={18} />
          </button>
        </header>

        <div className="confirm-actions">
          <button className="secondary-submit" type="button" onClick={onClose} disabled={loading}>
            Mégsem
          </button>
          <button className="danger-submit" type="button" onClick={onConfirm} disabled={loading}>
            {loading ? <Loader2 className="spin" size={18} /> : <Trash2 size={18} />}
            {loading ? "Törlés..." : "Törlés"}
          </button>
        </div>
      </section>
    </div>
  );
}

function FileInput({ label, file, currentFile, onChange }) {
  return (
    <label className="upload-field">
      <span>{label}</span>
      <span className="upload-box">
        {file ? (
          <>
            <FileText size={16} />
            <span>{file.name}</span>
          </>
        ) : (
          <>
            <Upload size={16} />
            <span>Fájl</span>
          </>
        )}
        <input type="file" accept="application/pdf" onChange={(event) => onChange(event.target.files?.[0] || null)} />
      </span>
      {currentFile?.name && !file && <small>Jelenlegi: {currentFile.name}</small>}
    </label>
  );
}

function StatisticsPage({ globalStats, monthStats, onBack }) {
  const paidRate =
    globalStats.itemCount === 0 ? 0 : Math.round((globalStats.paidCount / globalStats.itemCount) * 100);

  return (
    <main className="stats-page">
      <header className="stats-top">
        <button type="button" onClick={onBack} aria-label="Vissza">
          <ArrowLeft size={22} />
        </button>
        <h1>Statisztika</h1>
      </header>

      <section className="stats-content">
        <h2>Összesítés</h2>
        <div className="stats-grid">
          <StatCard icon={Wallet} label="Összes összeg" value={currency.format(globalStats.total)} />
          <StatCard icon={CheckCircle2} label="Rendezve" value={`${globalStats.paidCount}/${globalStats.itemCount}`} />
          <StatCard icon={TrendingUp} label="Rendezettség" value={`${paidRate}%`} />
          <StatCard icon={FileWarning} label="Hiányzó PDF" value={globalStats.missingFiles} warning />
        </div>

        <h2>Havi bontás</h2>
        <div className="monthly-stats">
          {monthStats.map((month) => (
            <article className="month-stat-row" key={month.id}>
              <div>
                <h3>{month.label}</h3>
                <p>
                  {month.paidCount}/{month.itemCount} rendezve · {month.missingFiles} hiányzó PDF
                </p>
                <div className="progress-line">
                  <span style={{ width: `${month.completion}%` }} />
                </div>
              </div>
              <strong>{currency.format(month.total)}</strong>
            </article>
          ))}
          {monthStats.length === 0 && <p className="stats-empty">Nincs még havi adat.</p>}
        </div>
      </section>
    </main>
  );
}

function StatCard({ icon: Icon, label, value, warning }) {
  return (
    <article className="stat-card">
      <Icon size={18} className={warning ? "warning-icon" : ""} />
      <span>{label}</span>
      <strong>{value}</strong>
    </article>
  );
}

createRoot(document.getElementById("root")).render(<App />);
