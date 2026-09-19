/* SAIFI UDYOG — Admin Dashboard (Firebase Cloud) */

let allProducts = [];
let allCategories = [];

document.addEventListener('DOMContentLoaded', async () => {
  if (!FIREBASE_ENABLED) {
    window.location.href = 'index.html';
    return;
  }

  initFirebase();
  onAuthChange(user => {
    if (!user) window.location.href = 'index.html';
  });

  initNavigation();
  initModals();
  initProductForm();
  initCategoryForm();
  initSettingsForm();
  initLogout();
  initSeed();
  initEnquiries();

  document.getElementById('add-product-btn').addEventListener('click', () => openProductModal());
  document.getElementById('quick-add-product').addEventListener('click', () => {
    switchPanel('products');
    openProductModal();
  });
  document.getElementById('add-category-btn').addEventListener('click', () => openCategoryModal());

  await loadDashboard();
});

function initNavigation() {
  document.querySelectorAll('.admin-nav a[data-panel]').forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      switchPanel(link.dataset.panel);
    });
  });
  document.querySelectorAll('[data-panel-link]').forEach(btn => {
    btn.addEventListener('click', () => switchPanel(btn.dataset.panelLink));
  });
}

function switchPanel(id) {
  document.querySelectorAll('.admin-panel').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.admin-nav a[data-panel]').forEach(a => a.classList.remove('active'));
  document.getElementById(`panel-${id}`)?.classList.add('active');
  document.querySelector(`[data-panel="${id}"]`)?.classList.add('active');
  if (id === 'enquiries') loadEnquiries();
}

function initModals() {
  document.querySelectorAll('[data-close-modal]').forEach(b => b.addEventListener('click', closeAllModals));
  document.querySelectorAll('.admin-modal-overlay').forEach(o => {
    o.addEventListener('click', e => { if (e.target === o) closeAllModals(); });
  });
}

function openModal(id) { document.getElementById(id).classList.add('active'); }
function closeAllModals() {
  document.querySelectorAll('.admin-modal-overlay').forEach(m => m.classList.remove('active'));
}

async function loadDashboard() {
  try {
    allCategories = await getCategories();
    allProducts = await getProducts();
    renderStats();
    renderProductsTable();
    renderCategoriesGrid();
    populateCategorySelect();
    await loadSettingsForm();
  } catch (err) {
    alert('Error loading data: ' + err.message + '\n\nCheck Firebase setup (Firestore + Storage enabled).');
  }
}

function renderStats() {
  document.getElementById('stat-products').textContent = allProducts.length;
  document.getElementById('stat-categories').textContent = allCategories.length;
  document.getElementById('stat-active').textContent = allProducts.filter(p => p.active !== false).length;
}

function renderProductsTable() {
  const loader = document.getElementById('products-loader');
  const table = document.getElementById('products-table');
  const tbody = document.getElementById('products-tbody');
  const empty = document.getElementById('products-empty');
  loader.style.display = 'none';

  if (!allProducts.length) {
    table.style.display = 'none';
    empty.style.display = 'block';
    return;
  }
  empty.style.display = 'none';
  table.style.display = 'table';
  tbody.innerHTML = allProducts.map(p => {
    const cat = allCategories.find(c => c.id === p.categoryId);
    return `<tr>
      <td><img class="product-thumb" src="${esc(p.imageUrl)}" alt="" onerror="this.style.background='#eee'"></td>
      <td><strong>${esc(p.name)}</strong></td>
      <td>${esc(cat?.title || p.categoryId)}</td>
      <td>${esc(p.subcategory || '—')}</td>
      <td><span class="badge ${p.active === false ? 'inactive' : ''}">${p.active === false ? 'Hidden' : 'Active'}</span></td>
      <td class="table-actions">
        <button class="admin-btn admin-btn-outline admin-btn-sm" onclick="editProduct('${p.id}')">Edit</button>
        <button class="admin-btn admin-btn-danger admin-btn-sm" onclick="removeProduct('${p.id}')">Delete</button>
      </td>
    </tr>`;
  }).join('');
}

function populateCategorySelect() {
  document.getElementById('product-category').innerHTML = allCategories.map(c =>
    `<option value="${c.id}">${esc(c.title)}</option>`
  ).join('');
}

function openProductModal(product = null) {
  document.getElementById('product-form').reset();
  document.getElementById('product-modal-title').textContent = product ? 'Edit Product' : 'Add Product';
  document.getElementById('product-id').value = product?.id || '';
  document.getElementById('product-name').value = product?.name || '';
  document.getElementById('product-description').value = product?.description || '';
  document.getElementById('product-category').value = product?.categoryId || allCategories[0]?.id || '';
  document.getElementById('product-subcategory').value = product?.subcategory || '';
  document.getElementById('product-order').value = product?.order || 0;
  document.getElementById('product-active').value = product?.active === false ? 'false' : 'true';
  document.getElementById('product-image-url').value = product?.imageUrl || '';

  const preview = document.getElementById('image-preview');
  const hint = document.getElementById('upload-hint');
  const area = document.getElementById('image-upload-area');
  if (product?.imageUrl) {
    preview.src = product.imageUrl;
    preview.style.display = 'block';
    hint.style.display = 'none';
    area.classList.add('has-image');
  } else {
    preview.style.display = 'none';
    hint.style.display = 'block';
    area.classList.remove('has-image');
  }
  openModal('product-modal');
}

window.editProduct = id => {
  const p = allProducts.find(x => x.id === id);
  if (p) openProductModal(p);
};

window.removeProduct = async id => {
  if (!confirm('Delete this product?')) return;
  try {
    await deleteProduct(id);
    await loadDashboard();
  } catch (err) { alert(err.message); }
};

function initProductForm() {
  document.getElementById('product-image-file').addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const progress = document.getElementById('upload-progress');
    progress.style.display = 'block';
    progress.textContent = 'Uploading to cloud...';
    try {
      const path = `products/${Date.now()}_${file.name.replace(/\s/g, '_')}`;
      const url = await uploadImage(file, path);
      document.getElementById('product-image-url').value = url;
      const preview = document.getElementById('image-preview');
      preview.src = url;
      preview.style.display = 'block';
      document.getElementById('upload-hint').style.display = 'none';
      document.getElementById('image-upload-area').classList.add('has-image');
      progress.textContent = 'Uploaded! Image will appear on live site.';
      setTimeout(() => { progress.style.display = 'none'; }, 2000);
    } catch (err) {
      progress.textContent = 'Upload failed: ' + err.message;
    }
  });

  document.getElementById('product-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('save-product-btn');
    const imageUrl = document.getElementById('product-image-url').value.trim();
    if (!imageUrl) { alert('Please upload a product image.'); return; }

    btn.disabled = true;
    btn.textContent = 'Saving...';
    try {
      await saveProduct({
        id: document.getElementById('product-id').value || undefined,
        name: document.getElementById('product-name').value.trim(),
        description: document.getElementById('product-description').value.trim(),
        categoryId: document.getElementById('product-category').value,
        subcategory: document.getElementById('product-subcategory').value.trim(),
        order: parseInt(document.getElementById('product-order').value) || 0,
        active: document.getElementById('product-active').value === 'true',
        imageUrl
      });
      closeAllModals();
      await loadDashboard();
    } catch (err) {
      alert('Error: ' + err.message);
    } finally {
      btn.disabled = false;
      btn.textContent = 'Save Product';
    }
  });
}

function renderCategoriesGrid() {
  const grid = document.getElementById('categories-grid');
  if (!allCategories.length) {
    grid.innerHTML = '<div class="empty-state"><p>No categories. Click Import Sample Products on Overview.</p></div>';
    return;
  }
  grid.innerHTML = allCategories.map(c => {
    const count = allProducts.filter(p => p.categoryId === c.id).length;
    return `<div class="category-admin-card">
      <h4>${esc(c.title)}</h4>
      <p>${esc(c.description || '')}</p>
      <span class="badge">${count} product${count !== 1 ? 's' : ''}</span>
      <div style="margin-top:0.75rem;display:flex;gap:0.5rem;">
        <button class="admin-btn admin-btn-outline admin-btn-sm" onclick="editCategory('${c.id}')">Edit</button>
        <button class="admin-btn admin-btn-danger admin-btn-sm" onclick="removeCategory('${c.id}')">Delete</button>
      </div>
    </div>`;
  }).join('');
}

function openCategoryModal(cat = null) {
  document.getElementById('category-modal-title').textContent = cat ? 'Edit Category' : 'Add Category';
  document.getElementById('category-id').value = cat?.id || '';
  document.getElementById('category-title').value = cat?.title || '';
  document.getElementById('category-description').value = cat?.description || '';
  document.getElementById('category-order').value = cat?.order || 0;
  openModal('category-modal');
}

window.editCategory = id => {
  const c = allCategories.find(x => x.id === id);
  if (c) openCategoryModal(c);
};

window.removeCategory = async id => {
  if (!confirm('Delete this category?')) return;
  try {
    await deleteCategory(id);
    await loadDashboard();
  } catch (err) { alert(err.message); }
};

function initCategoryForm() {
  document.getElementById('category-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const title = document.getElementById('category-title').value.trim();
    let id = document.getElementById('category-id').value;
    if (!id) id = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    try {
      await saveCategory({
        id, title,
        description: document.getElementById('category-description').value.trim(),
        order: parseInt(document.getElementById('category-order').value) || 0
      });
      closeAllModals();
      await loadDashboard();
    } catch (err) { alert(err.message); }
  });
}

function initSettingsForm() {
  document.getElementById('settings-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = e.target.querySelector('button[type=submit]');
    btn.disabled = true;
    try {
      await saveSiteSettings({
        phone: document.getElementById('set-phone').value.trim(),
        whatsapp: document.getElementById('set-whatsapp').value.trim(),
        whatsappNumber: document.getElementById('set-whatsapp-num').value.trim(),
        email: document.getElementById('set-email').value.trim(),
        address: document.getElementById('set-address').value.trim(),
        mapsEmbedUrl: document.getElementById('set-maps').value.trim(),
        web3formsKey: document.getElementById('set-web3forms').value.trim()
      });
      alert('Settings saved! Visible on live site immediately.');
    } catch (err) { alert(err.message); }
    btn.disabled = false;
  });
}

async function loadSettingsForm() {
  const s = await getSiteSettings();
  document.getElementById('set-phone').value = s.phone || '';
  document.getElementById('set-whatsapp').value = s.whatsapp || '';
  document.getElementById('set-whatsapp-num').value = s.whatsappNumber || '';
  document.getElementById('set-email').value = s.email || '';
  document.getElementById('set-address').value = s.address || '';
  document.getElementById('set-maps').value = s.mapsEmbedUrl || '';
  document.getElementById('set-web3forms').value = s.web3formsKey || '';
}

function initEnquiries() {
  document.getElementById('refresh-enquiries').addEventListener('click', loadEnquiries);
}

async function loadEnquiries() {
  const loader = document.getElementById('enquiries-loader');
  const list = document.getElementById('enquiries-list');
  const empty = document.getElementById('enquiries-empty');
  loader.style.display = 'flex';
  list.innerHTML = '';

  try {
    const enquiries = await getEnquiries();
    loader.style.display = 'none';

    if (!enquiries.length) {
      empty.style.display = 'block';
      return;
    }
    empty.style.display = 'none';

    list.innerHTML = enquiries.map(e => {
      const date = e.createdAt?.toDate
        ? e.createdAt.toDate().toLocaleString('en-IN')
        : 'Recently';
      return `<div class="enquiry-card ${e.read ? '' : 'unread'}" id="enq-${e.id}">
        <div class="enquiry-header">
          <strong>${esc(e.name)}</strong>
          <span class="enquiry-date">${date}</span>
        </div>
        <p class="enquiry-meta">📱 ${esc(e.mobile)}${e.email ? ` &nbsp;·&nbsp; 📧 ${esc(e.email)}` : ''}</p>
        ${e.product ? `<p class="enquiry-product">Product: <strong>${esc(e.product)}</strong></p>` : ''}
        <p class="enquiry-message">${esc(e.message)}</p>
        <div class="enquiry-actions">
          <a href="https://wa.me/${e.mobile.replace(/\D/g, '')}?text=${encodeURIComponent('Hello ' + e.name + ', thank you for your enquiry at SAIFI UDYOG.')}" target="_blank" class="admin-btn admin-btn-outline admin-btn-sm">Reply on WhatsApp</a>
          ${e.email ? `<a href="mailto:${e.email}" class="admin-btn admin-btn-outline admin-btn-sm">Send Email</a>` : ''}
          <button class="admin-btn admin-btn-outline admin-btn-sm" onclick="markRead('${e.id}')">Mark Read</button>
          <button class="admin-btn admin-btn-danger admin-btn-sm" onclick="deleteEnq('${e.id}')">Delete</button>
        </div>
      </div>`;
    }).join('');
  } catch (err) {
    loader.style.display = 'none';
    list.innerHTML = `<div class="empty-state"><p>Error loading enquiries: ${esc(err.message)}</p></div>`;
  }
}

window.markRead = async id => {
  await markEnquiryRead(id);
  document.getElementById(`enq-${id}`)?.classList.remove('unread');
};

window.deleteEnq = async id => {
  if (!confirm('Delete this enquiry?')) return;
  await deleteEnquiry(id);
  await loadEnquiries();
};

function initSeed() {
  document.getElementById('seed-btn').addEventListener('click', async () => {
    if (!confirm('Import sample furniture catalogue to cloud? (Only do this once)')) return;
    const btn = document.getElementById('seed-btn');
    btn.disabled = true;
    btn.textContent = 'Importing...';
    try {
      await seedDatabase();
      alert('Sample products imported! Check your live products page.');
      await loadDashboard();
    } catch (err) { alert(err.message); }
    btn.disabled = false;
    btn.textContent = 'Import Sample Products';
  });
}

function initLogout() {
  document.getElementById('logout-btn').addEventListener('click', async (e) => {
    e.preventDefault();
    await adminLogout();
    window.location.href = 'index.html';
  });
}

function esc(str) {
  if (!str) return '';
  const d = document.createElement('div');
  d.textContent = str;
  return d.innerHTML;
}
