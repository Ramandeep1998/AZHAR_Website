# SAIFI UDYOG — Furniture Catalogue Website

Cloud-powered furniture showroom with **Firebase admin panel**. Owner logs in, uploads products, customers see changes **instantly** on the live site.

---

## Live URLs (after hosting)

| Page | URL |
|------|-----|
| Website | `https://yoursite.com` |
| Products | `https://yoursite.com/products.html` |
| **Admin** | `https://yoursite.com/admin/` |

---

## Firebase Setup (one time — ~15 min)

Your Firebase project: **saifiudhyog** (config already in `js/firebase-config.js`)

### Complete these in [Firebase Console](https://console.firebase.google.com/project/saifiudhyog):

1. **Authentication** → Get started → Enable **Email/Password** → Add admin user
2. **Firestore** → Create database → test mode → region `asia-south1`
3. **Storage** → Get started → test mode
4. **Publish rules** from `firestore.rules` and `storage.rules`

**Full guide:** see `ADMIN-SETUP.md` or open `admin/setup.html`

### Admin login credentials
Created in Firebase → Authentication → Users (email + password you set).

---

## Owner workflow (after setup)

1. Go to `yoursite.com/admin/`
2. Login with email & password
3. Click **Import Sample Products** (first time only)
4. **Add Product** → upload image → fill details → Save
5. Product appears on live site **immediately** for all customers
6. Update contact info in **Settings** tab

**No export. No redeploy. No technical steps.**

---

## Deploy to Netlify

1. Push `saifi-udyog-website` folder to GitHub
2. [netlify.com](https://netlify.com) → Import from GitHub
3. Deploy — done!

Firebase works automatically on any hosted URL.

---

## Project Structure

```
saifi-udyog-website/
├── index.html, products.html, about.html, contact.html
├── admin/                  ← Owner panel (Firebase login)
├── js/
│   ├── firebase-config.js  ← Firebase keys (done)
│   ├── db.js               ← Cloud database layer
│   └── catalogue.js        ← Loads products from Firebase
├── data/catalogue.json     ← Fallback if Firebase empty
├── firestore.rules         ← Paste in Firebase Console
└── storage.rules           ← Paste in Firebase Console
```

---

## © SAIFI UDYOG
