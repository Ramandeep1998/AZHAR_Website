# Admin Panel Setup Guide

The SAIFI UDYOG admin panel lets the business owner **log in**, **upload product images**, **add/edit/delete products**, and **manage categories** — all without touching code.

## How It Works

```
Owner logs in → Admin Panel → Upload images & add products
                                      ↓
                              Firebase Cloud (database + storage)
                                      ↓
                         Public website reads products automatically
```

## Step 1: Create a Firebase Project (Free)

1. Go to [https://console.firebase.google.com](https://console.firebase.google.com)
2. Click **Create a project** → name it `saifi-udyog`
3. Disable Google Analytics (optional) → **Create project**

## Step 2: Register Your Website

1. In Firebase console, click **Web** icon (`</>`) to add an app
2. App nickname: `SAIFI UDYOG Website`
3. Copy the `firebaseConfig` object
4. Paste values into `js/firebase-config.js`:

```js
const FIREBASE_CONFIG = {
  apiKey: 'AIza...',
  authDomain: 'saifi-udyog.firebaseapp.com',
  projectId: 'saifi-udyog',
  storageBucket: 'saifi-udyog.appspot.com',
  messagingSenderId: '123456789',
  appId: '1:123456789:web:abc123'
};
```

## Step 3: Enable Authentication

1. Firebase Console → **Build** → **Authentication**
2. Click **Get started**
3. **Sign-in method** → Enable **Email/Password**
4. Go to **Users** tab → **Add user**
5. Enter owner's email and password (e.g. `owner@saifiudyog.com`)

## Step 4: Enable Firestore Database

1. Firebase Console → **Build** → **Firestore Database**
2. Click **Create database**
3. Choose **Start in test mode** (for setup)
4. Select a region close to you (e.g. `asia-south1` for India)
5. Click **Enable**

### Update Security Rules (Important!)

Go to **Firestore** → **Rules** and replace with:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /products/{doc} {
      allow read: if true;
      allow write: if request.auth != null;
    }
    match /categories/{doc} {
      allow read: if true;
      allow write: if request.auth != null;
    }
  }
}
```

Click **Publish**.

## Step 5: Enable Storage (for image uploads)

1. Firebase Console → **Build** → **Storage**
2. Click **Get started** → **Start in test mode**
3. Choose same region as Firestore

### Update Storage Rules

Go to **Storage** → **Rules**:

```
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /products/{allPaths=**} {
      allow read: if true;
      allow write: if request.auth != null;
    }
  }
}
```

Click **Publish**.

## Step 6: Access Admin Panel

1. Open your website: `yourdomain.com/admin/` or locally `admin/index.html`
2. Login with the email/password you created in Step 3
3. Click **Import Sample Products** to load the default catalogue (optional)
4. Start adding your own products!

## Admin Panel Features

| Feature | What it does |
|---------|-------------|
| **Add Product** | Upload image, name, description, category, subcategory |
| **Edit Product** | Update any product details or replace image |
| **Delete Product** | Remove a product from the website |
| **Manage Categories** | Add/edit/delete product categories |
| **Import Sample** | One-click import of default furniture catalogue |
| **View Website** | Preview the live catalogue |

## Admin URL

After deployment, share this URL only with the business owner:

```
https://your-website.com/admin/
```

**Do not link to admin from the public website.**

## Costs

Firebase **Spark (free) plan** includes:
- 1 GB Storage (plenty for furniture photos)
- 50K Firestore reads/day
- 20K Firestore writes/day
- 10 GB/month bandwidth

More than enough for a small furniture business.

## Troubleshooting

| Problem | Solution |
|---------|----------|
| "Firebase not configured" | Fill in `js/firebase-config.js` |
| Can't login | Check email/password in Firebase Authentication → Users |
| Image upload fails | Check Storage rules and that Storage is enabled |
| Products not showing on website | Make sure product status is "Active" |
| Permission denied | Update Firestore/Storage rules (see above) |

## Without Firebase

If Firebase is not set up, the website still works using the default products in `js/products-data.js`. The admin panel requires Firebase to function.
