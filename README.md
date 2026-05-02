# BillSort

Egyszeru Vite + Firebase webapp havi szamlak es kifizetesi visszaigazolasok nyilvantartasara.

## Helyi inditas

```bash
npm install
npm run dev
```

Firebase beallitas nelkul a felulet demó módban indul, hogy localhoston azonnal kiprobalhato legyen.

## Firebase

1. Hozz letre egy Firebase projektet.
2. Kapcsold be a Firestore Database es Storage szolgaltatasokat.
3. Masold a `.env.example` tartalmat `.env.local` fajlba.
4. Toltsd ki a `VITE_FIREBASE_*` valtozokat a Firebase web app config alapjan.
5. Inditsd ujra a dev servert.

Vercelen ugyanazokat a `VITE_FIREBASE_*` valtozokat add hozza az Environment Variables reszben.

## Firestore adatstruktura

- `months`: havi fulek
- `months/{monthId}/items`: az adott honap teteleinek listaja
- Storage: `months/{monthId}/items/{itemId}/...pdf`
