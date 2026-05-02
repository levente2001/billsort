import { initializeApp } from "firebase/app";
import {
  createUserWithEmailAndPassword,
  getAuth,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
} from "firebase/auth";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getFirestore,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
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
const auth = app ? getAuth(app) : null;
const db = app ? getFirestore(app) : null;
const storage = app ? getStorage(app) : null;

const monthsCollection = () => collection(db, "months");
const itemsCollection = (monthId) => collection(db, "months", monthId, "items");
const usersCollection = () => collection(db, "users");
const auditLogsCollection = () => collection(db, "auditLogs");
const userDoc = (uid) => doc(db, "users", uid);

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

async function writeAuditLog(tenantId, actor, action, details) {
  await addDoc(auditLogsCollection(), {
    tenantId,
    actorEmail: actor?.email || "ismeretlen",
    actorRole: actor?.role || "ismeretlen",
    action,
    details,
    createdAt: serverTimestamp(),
  });
}

function normalizeEmail(email) {
  return email.trim().toLowerCase();
}

async function readUserProfile(user) {
  if (!user) return null;

  const snapshot = await getDoc(userDoc(user.uid));
  if (snapshot.exists()) return { id: snapshot.id, ...snapshot.data() };

  const email = normalizeEmail(user.email || "");
  const profile = {
    email,
    role: email === "kalolevente@gmail.com" ? "tenant" : "tenant",
    createdAt: serverTimestamp(),
  };
  await setDoc(userDoc(user.uid), profile);

  return { id: user.uid, ...profile };
}

export function createFirebaseAuthService() {
  return {
    subscribe(callback) {
      return onAuthStateChanged(auth, async (user) => {
        const profile = await readUserProfile(user);
        callback(user, profile);
      });
    },

    async signIn(email, password) {
      await signInWithEmailAndPassword(auth, normalizeEmail(email), password);
    },

    async register(email, password, role) {
      const credentials = await createUserWithEmailAndPassword(auth, normalizeEmail(email), password);
      const profile = {
        email: normalizeEmail(email),
        role,
        createdAt: serverTimestamp(),
      };

      await setDoc(userDoc(credentials.user.uid), profile);
      return credentials.user;
    },

    async signOut() {
      await signOut(auth);
    },
  };
}

export async function migrateLegacyMonthsToTenant(tenantId, email) {
  if (normalizeEmail(email || "") !== "kalolevente@gmail.com") return;

  const snapshot = await getDocs(monthsCollection());
  await Promise.all(
    snapshot.docs
      .filter((entry) => !entry.data().tenantId)
      .map((entry) => updateDoc(entry.ref, { tenantId })),
  );
}

export function subscribeTenantsForOwner(ownerEmail, callback) {
  const q = query(usersCollection(), where("ownerEmailLower", "==", normalizeEmail(ownerEmail || "")));
  return onSnapshot(q, (snapshot) => {
    callback(
      snapshot.docs
        .map((entry) => ({ id: entry.id, ...entry.data() }))
        .filter((profile) => profile.role === "tenant"),
    );
  });
}

export async function addOwnerToTenant(tenantId, ownerEmail, actor) {
  const normalized = normalizeEmail(ownerEmail);
  await updateDoc(userDoc(tenantId), {
    ownerEmail: normalized,
    ownerEmailLower: normalized,
    ownerAddedAt: serverTimestamp(),
  });
  await writeAuditLog(tenantId, actor, "Tulajdonos hozzáadása", `Tulajdonos email: ${normalized}`);
}

export function createFirebaseRepository(tenantId, viewer) {
  return {
    mode: "firebase",
    tenantId,
    viewer,

    subscribeMonths(callback) {
      const q = query(monthsCollection(), where("tenantId", "==", tenantId));
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

    subscribeAuditLogs(callback) {
      const q = query(auditLogsCollection(), where("tenantId", "==", tenantId));
      return onSnapshot(q, (snapshot) => {
        callback(snapshot.docs.map((entry) => ({ id: entry.id, ...entry.data() })));
      });
    },

    async createMonth(label) {
      const monthRef = await addDoc(monthsCollection(), {
        label,
        tenantId,
        createdAt: serverTimestamp(),
      });
      await writeAuditLog(tenantId, viewer, "Hónap létrehozása", label);
      return monthRef;
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
      await writeAuditLog(tenantId, viewer, "Hónap törlése", `${items.length} tétel törölve`);
    },

    async createItem(monthId, data) {
      const itemRef = await addDoc(itemsCollection(monthId), {
        name: data.name,
        amount: Number(data.amount || 0),
        note: data.note || "",
        paid: data.paid,
        ownerAccepted: false,
        ownerAcceptedAt: null,
        ownerAcceptedBy: null,
        createdAt: serverTimestamp(),
      });

      const [invoiceFile, receiptFile] = await Promise.all([
        uploadPdf(data.invoiceFile, monthId, itemRef.id, "invoice"),
        uploadPdf(data.receiptFile, monthId, itemRef.id, "receipt"),
      ]);

      await updateDoc(itemRef, { invoiceFile, receiptFile });
      await writeAuditLog(tenantId, viewer, "Tétel létrehozása", `${data.name} (${Number(data.amount || 0)} Ft)`);
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
        ownerAccepted: item.ownerAccepted || false,
        ownerAcceptedAt: item.ownerAcceptedAt || null,
        ownerAcceptedBy: item.ownerAcceptedBy || null,
        invoiceFile,
        receiptFile,
      });
      await writeAuditLog(tenantId, viewer, "Tétel módosítása", `${item.name} -> ${data.name}`);
    },

    async deleteItem(monthId, item) {
      await Promise.all([deleteStoredFile(item.invoiceFile), deleteStoredFile(item.receiptFile)]);
      await deleteDoc(doc(db, "months", monthId, "items", item.id));
      await writeAuditLog(tenantId, viewer, "Tétel törlése", item.name || "Névtelen tétel");
    },

    async acceptItem(monthId, item) {
      const itemRef = doc(db, "months", monthId, "items", item.id);
      await updateDoc(itemRef, {
        ownerAccepted: true,
        ownerAcceptedAt: serverTimestamp(),
        ownerAcceptedBy: viewer?.email || null,
      });
      await writeAuditLog(
        tenantId,
        viewer,
        "Tulajdonosi elfogadás",
        `Elfogadott tétel: ${item.name || "Névtelen tétel"}`,
      );
    },
  };
}
