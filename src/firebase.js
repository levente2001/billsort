import { initializeApp } from "firebase/app";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getFirestore,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
} from "firebase/firestore";
import {
  deleteObject,
  getDownloadURL,
  getStorage,
  ref,
  uploadBytes,
} from "firebase/storage";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

export const hasFirebaseConfig = Object.values(firebaseConfig).every(Boolean);

const app = hasFirebaseConfig ? initializeApp(firebaseConfig) : null;
const db = app ? getFirestore(app) : null;
const storage = app ? getStorage(app) : null;

const monthsCollection = () => collection(db, "months");
const itemsCollection = (monthId) => collection(db, "months", monthId, "items");

function cleanStorageName(name) {
  return name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9._-]/g, "-")
    .replace(/-+/g, "-")
    .toLowerCase();
}

async function uploadPdf(file, monthId, itemId, type) {
  if (!file) return null;

  const path = `months/${monthId}/items/${itemId}/${type}-${Date.now()}-${cleanStorageName(file.name)}`;
  const fileRef = ref(storage, path);
  await uploadBytes(fileRef, file, { contentType: file.type || "application/pdf" });
  const url = await getDownloadURL(fileRef);

  return {
    name: file.name,
    path,
    size: file.size,
    url,
  };
}

async function deleteStoredFile(file) {
  if (!file?.path) return;
  await deleteObject(ref(storage, file.path));
}

export function createFirebaseRepository() {
  return {
    mode: "firebase",

    subscribeMonths(callback) {
      const q = query(monthsCollection(), orderBy("createdAt", "desc"));
      return onSnapshot(q, (snapshot) => {
        callback(snapshot.docs.map((entry) => ({ id: entry.id, ...entry.data() })));
      });
    },

    subscribeItems(monthId, callback) {
      const q = query(itemsCollection(monthId), orderBy("createdAt", "desc"));
      return onSnapshot(q, (snapshot) => {
        callback(snapshot.docs.map((entry) => ({ id: entry.id, ...entry.data() })));
      });
    },

    async createMonth(label) {
      return addDoc(monthsCollection(), {
        label,
        createdAt: serverTimestamp(),
      });
    },

    async deleteMonth(monthId, items) {
      await Promise.all(
        items.flatMap((item) => [
          deleteStoredFile(item.invoiceFile),
          deleteStoredFile(item.receiptFile),
        ]),
      );
      await Promise.all(items.map((item) => deleteDoc(doc(db, "months", monthId, "items", item.id))));
      await deleteDoc(doc(db, "months", monthId));
    },

    async createItem(monthId, data) {
      const itemRef = await addDoc(itemsCollection(monthId), {
        name: data.name,
        amount: Number(data.amount || 0),
        note: data.note || "",
        paid: data.paid,
        createdAt: serverTimestamp(),
      });

      const [invoiceFile, receiptFile] = await Promise.all([
        uploadPdf(data.invoiceFile, monthId, itemRef.id, "invoice"),
        uploadPdf(data.receiptFile, monthId, itemRef.id, "receipt"),
      ]);

      await updateDoc(itemRef, { invoiceFile, receiptFile });
      return itemRef;
    },

    async updateItem(monthId, item, data) {
      const itemRef = doc(db, "months", monthId, "items", item.id);
      let invoiceFile = item.invoiceFile || null;
      let receiptFile = item.receiptFile || null;

      if (data.invoiceFile) {
        const nextInvoiceFile = await uploadPdf(data.invoiceFile, monthId, item.id, "invoice");
        await deleteStoredFile(item.invoiceFile);
        invoiceFile = nextInvoiceFile;
      }

      if (data.receiptFile) {
        const nextReceiptFile = await uploadPdf(data.receiptFile, monthId, item.id, "receipt");
        await deleteStoredFile(item.receiptFile);
        receiptFile = nextReceiptFile;
      }

      await updateDoc(itemRef, {
        name: data.name,
        amount: Number(data.amount || 0),
        note: data.note || "",
        paid: data.paid,
        invoiceFile,
        receiptFile,
      });
    },

    async deleteItem(monthId, item) {
      await Promise.all([deleteStoredFile(item.invoiceFile), deleteStoredFile(item.receiptFile)]);
      await deleteDoc(doc(db, "months", monthId, "items", item.id));
    },
  };
}
