const STORAGE_KEY = "billsort-local-state";

function readState() {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (!saved) return { months: [], items: {} };

  try {
    return JSON.parse(saved);
  } catch {
    return { months: [], items: {} };
  }
}

function writeState(state) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function toLocalFile(file) {
  if (!file) return null;
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.addEventListener("load", () => {
      resolve({
        name: file.name,
        size: file.size,
        url: reader.result,
        demoOnly: true,
      });
    });
    reader.addEventListener("error", reject);
    reader.readAsDataURL(file);
  });
}

export function createLocalRepository() {
  const listeners = {
    months: new Set(),
    items: new Map(),
  };

  function notifyMonths() {
    const state = readState();
    listeners.months.forEach((listener) => listener(state.months));
  }

  function notifyItems(monthId) {
    const state = readState();
    const monthItems = state.items[monthId] || [];
    const monthListeners = listeners.items.get(monthId);
    monthListeners?.forEach((listener) => listener(monthItems));
  }

  return {
    mode: "local",

    subscribeMonths(callback) {
      listeners.months.add(callback);
      callback(readState().months);
      return () => listeners.months.delete(callback);
    },

    subscribeItems(monthId, callback) {
      if (!listeners.items.has(monthId)) listeners.items.set(monthId, new Set());
      listeners.items.get(monthId).add(callback);
      callback(readState().items[monthId] || []);
      return () => listeners.items.get(monthId)?.delete(callback);
    },

    async createMonth(label) {
      const state = readState();
      state.months.unshift({
        id: crypto.randomUUID(),
        label,
        createdAt: new Date().toISOString(),
      });
      writeState(state);
      notifyMonths();
    },

    async deleteMonth(monthId) {
      const state = readState();
      state.months = state.months.filter((month) => month.id !== monthId);
      delete state.items[monthId];
      writeState(state);
      notifyMonths();
      notifyItems(monthId);
    },

    async createItem(monthId, data) {
      const state = readState();
      const [invoiceFile, receiptFile] = await Promise.all([
        toLocalFile(data.invoiceFile),
        toLocalFile(data.receiptFile),
      ]);
      const item = {
        id: crypto.randomUUID(),
        name: data.name,
        amount: Number(data.amount || 0),
        note: data.note || "",
        paid: data.paid,
        invoiceFile,
        receiptFile,
        createdAt: new Date().toISOString(),
      };

      state.items[monthId] = [item, ...(state.items[monthId] || [])];
      writeState(state);
      notifyItems(monthId);
    },

    async updateItem(monthId, item, data) {
      const state = readState();
      const [invoiceFile, receiptFile] = await Promise.all([
        data.invoiceFile ? toLocalFile(data.invoiceFile) : Promise.resolve(item.invoiceFile || null),
        data.receiptFile ? toLocalFile(data.receiptFile) : Promise.resolve(item.receiptFile || null),
      ]);

      state.items[monthId] = (state.items[monthId] || []).map((entry) =>
        entry.id === item.id
          ? {
              ...entry,
              name: data.name,
              amount: Number(data.amount || 0),
              note: data.note || "",
              paid: data.paid,
              invoiceFile,
              receiptFile,
            }
          : entry,
      );

      writeState(state);
      notifyItems(monthId);
    },

    async deleteItem(monthId, item) {
      const state = readState();
      state.items[monthId] = (state.items[monthId] || []).filter((entry) => entry.id !== item.id);
      writeState(state);
      notifyItems(monthId);
    },
  };
}
