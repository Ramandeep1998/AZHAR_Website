# SAIFI UDYOG — Client Readiness

**Project:** Furniture digital catalogue (no cart / payments)  
**Firebase project:** `saifiudhyog`  
**Last reviewed:** September 2026

---

## Client-ready now

| Area | Notes |
|------|--------|
| Public pages | Home, Products, About, Contact load and are branded |
| Live catalogue | Products come from Firebase only (no fake Unsplash catalogue) |
| Admin product upload | Add / edit / delete products with photos |
| Categories in admin | Add / edit / delete categories |
| Product images on website | Uploaded photos show for visitors |
| Admin login | Email/Password (user must exist in Firebase Auth) |
| Search + image lightbox | Working on Products page |
| Enquire Now → Contact | Product name is remembered on the form |
| WhatsApp enquiries | Opens to **97193 04062** (`919719304062`) |
| Mobile navigation | Working |
| Local preview | `http://localhost:8080` when the local server is running |

**OK for a controlled demo** if real Active products are uploaded and you hard-refresh the browser.

---

## Not client-ready yet

| Area | What’s missing |
|------|----------------|
| **Live public URL** | Not deployed yet (Netlify / Firebase Hosting / GitHub Pages) |
| **Empty categories on public UI** | Categories with 0 products are hidden; should show “No product under this category” |
| **Firebase Storage (CDN)** | Optional; images mostly stored as compressed data in Firestore (fine for demo, not ideal at scale) |
| **Firestore rules** | Must be **Publish**ed in Firebase Console or public/enquiry access can break |
| **Business address** | Still empty until set in Admin → Settings |
| **Google Maps** | Needs `mapsEmbedUrl` in Settings |
| **Enquiry email alerts** | Needs Web3Forms access key in Settings (WhatsApp works without it) |
| **Admin Enquiries list** | Depends on Firestore enquiry create/read rules being published |
| **Demo data** | Removed — catalogue is admin-only |
| **Firebase ownership** | Project is under the current Google account until transferred to the client |
| **Custom domain + SSL** | Only after hosting is set up |

---

## Demo-call checklist

- [ ] 4–8 real products uploaded, Status = **Active**
- [ ] Hard refresh public site and admin (**Ctrl+Shift+R**)
- [ ] Show Products page + one product image
- [ ] Show Enquire Now → WhatsApp
- [ ] Add real products in Admin (no demo loader)
- [ ] Confirm Firestore rules are published

---

## Before full client handover

1. Deploy site to a real HTTPS URL  
2. Fill contact details, address, maps in Admin → Settings  
3. Confirm Firestore (+ Storage if used) rules are published  
4. Finish empty-category message on the public Products page  
5. Plan Firebase project transfer / client admin user  
6. Optional: enable Web3Forms for email enquiry alerts  

---

## Quick architecture reminder

```
Visitor → Public website → reads Firestore (products / categories)
Owner   → Admin panel   → writes Firestore (+ optional Storage)
Enquiry → Firestore enquiries + WhatsApp to owner
```

**Database:** Firebase Firestore collections `products`, `categories`, `settings`, `enquiries`  
**Images:** Mainly in product `imageUrl` (compressed); Firebase Storage only if upload succeeds
