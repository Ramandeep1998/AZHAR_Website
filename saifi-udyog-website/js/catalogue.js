/* SAIFI UDYOG — Catalogue renderer (Firebase only) */

let catalogueData = [];

async function loadCatalogueData() {
  catalogueData = [];
  try {
    if (typeof getCatalogueData === 'function') {
      const data = await getCatalogueData();
      catalogueData = Array.isArray(data) ? data : [];
    }
  } catch (e) {
    console.warn('Catalogue load failed.', e);
    catalogueData = [];
  }
}

function escapeHtml(str) {
  if (window.SAIFI_SAFE) return SAIFI_SAFE.escapeHtml(str);
  if (!str) return '';
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function productImageHtml(src, alt) {
  if (window.SAIFI_SAFE) return SAIFI_SAFE.imgTag(src, alt);
  const safe = escapeHtml(src || '');
  return `<img src="${safe}" alt="${escapeHtml(alt || '')}" loading="lazy">`;
}

function emptyCatalogueHtml(isSearch) {
  const loadError = window.__SAIFI_CATALOGUE_ERROR;
  if (loadError && !isSearch) {
    return `<section class="catalogue-section"><div class="container">
      <div class="no-results fade-in visible">
        <h3>Catalogue could not load</h3>
        <p>${escapeHtml(loadError)}</p>
        <p style="margin-top:1rem;">Open Firebase Console → Firestore → <strong>Rules</strong> and publish:</p>
        <pre class="rules-snippet">match /products/{doc} { allow read: if true; allow write: if request.auth != null; }
match /categories/{doc} { allow read: if true; allow write: if request.auth != null; }</pre>
        <p style="margin-top:1rem;"><a href="products.html">Retry</a> · <a href="contact.html">Contact us</a></p>
      </div></div></section>`;
  }
  if (isSearch) {
    return `<section class="catalogue-section"><div class="container">
      <div class="no-results fade-in visible">
        <h3>No products found</h3>
        <p>Try a different search or <a href="contact.html">contact us</a> for availability.</p>
      </div></div></section>`;
  }
  return `<section class="catalogue-section"><div class="container">
    <div class="no-results fade-in visible">
      <h3>Catalogue coming soon</h3>
      <p>Products will appear here after they are added in the admin panel and set to <strong>Active</strong>.</p>
      <p style="margin-top:1rem;"><a href="contact.html">Contact us</a> for current availability.</p>
    </div></div></section>`;
}

function renderCatalogue(filter) {
  const container = document.getElementById('catalogue-container');
  if (!container) return;

  try {
    const query = String(filter || '').toLowerCase().trim();
    let html = '';
    let hasAnySection = false;
    let hasProductMatch = false;
    const categories = Array.isArray(catalogueData) ? catalogueData : [];

    if (!categories.length) {
      container.innerHTML = emptyCatalogueHtml(Boolean(query));
      updateCatalogueNav([]);
      return;
    }

    categories.forEach(category => {
      if (!category) return;
      const subs = Array.isArray(category.subcategories) ? category.subcategories : [];
      let categoryHtml = '';
      let categoryHasProducts = false;

      subs.forEach(sub => {
        if (!sub || !Array.isArray(sub.products)) return;
        const filtered = sub.products.filter(p => {
          if (!p) return false;
          if (!query) return true;
          const text = `${p.name || ''} ${p.description || ''} ${sub.name || ''} ${category.title || ''}`.toLowerCase();
          return text.includes(query);
        });
        if (!filtered.length) return;
        categoryHasProducts = true;
        hasProductMatch = true;

        categoryHtml += `<p class="subcategory-label">${escapeHtml(sub.name)}</p><div class="product-grid">`;
        filtered.forEach(product => {
          const name = product.name || 'Product';
          const image = product.image || '';
          const enquireUrl = `contact.html?product=${encodeURIComponent(name)}`;
          const safeImgAttr = window.SAIFI_SAFE
            ? SAIFI_SAFE.escapeHtml(SAIFI_SAFE.safeImageUrl(image))
            : escapeHtml(image);

          categoryHtml += `
            <div class="product-card fade-in">
              <div class="product-image lightbox-trigger" data-src="${safeImgAttr}" data-alt="${escapeHtml(name)}">
                ${productImageHtml(image, name)}
                <span class="product-zoom-hint">View</span>
              </div>
              <div class="product-info">
                <h3>${escapeHtml(name)}</h3>
                <p>${escapeHtml(product.description || '')}</p>
                <a href="${enquireUrl}" class="btn btn-wood btn-sm enquire-link" data-product="${escapeHtml(name)}">Enquire Now</a>
              </div>
            </div>`;
        });
        categoryHtml += '</div>';
      });

      // While searching, hide categories with no matches
      if (query && !categoryHasProducts) return;

      hasAnySection = true;
      if (!categoryHasProducts) {
        categoryHtml = `<div class="category-empty fade-in visible">
          <p><strong>No product under this category</strong></p>
          <p><a href="contact.html">Contact us</a> to ask about availability.</p>
        </div>`;
      }

      html += `
        <section id="${escapeHtml(category.id || '')}" class="catalogue-section">
          <div class="container">
            <div class="catalogue-section-header fade-in">
              <p class="section-label">Category</p>
              <h2>${escapeHtml(category.title || '')}</h2>
              <p>${escapeHtml(category.description || '')}</p>
            </div>
            ${categoryHtml}
          </div>
        </section>`;
    });

    if (!hasAnySection) {
      html = emptyCatalogueHtml(Boolean(query));
    } else if (query && !hasProductMatch) {
      html = emptyCatalogueHtml(true);
    }

    container.innerHTML = html;
    updateCatalogueNav(categories);
    bindEnquireLinks(container);
    if (typeof initScrollAnimations === 'function') initScrollAnimations();
    if (typeof initProductLightbox === 'function') initProductLightbox();
    if (typeof initCatalogueNav === 'function') initCatalogueNav();
  } catch (err) {
    console.error('renderCatalogue failed:', err);
    container.innerHTML = `<section class="catalogue-section"><div class="container">
      <div class="no-results fade-in visible">
        <h3>Unable to display products</h3>
        <p>Please refresh the page. If the problem continues, <a href="contact.html">contact us</a>.</p>
      </div></div></section>`;
  }
}

function bindEnquireLinks(root) {
  const scope = root || document;
  scope.querySelectorAll('a.enquire-link[data-product]').forEach((link) => {
    link.addEventListener('click', () => {
      const name = link.getAttribute('data-product') || '';
      if (typeof rememberEnquiryProduct === 'function') {
        rememberEnquiryProduct(name);
      } else {
        try { sessionStorage.setItem('saifi_enquiry_product', name); } catch (e) { /* ignore */ }
      }
    });
  });
}

function categoryIconSvg(id) {
  const icons = {
    sofas: '<path d="M4 10V8a3 3 0 0 1 3-3h10a3 3 0 0 1 3 3v2M3 14v4h2v-2h14v2h2v-4a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2z"/>',
    beds: '<path d="M3 12V7a2 2 0 0 1 2-2h6v7M3 12h18v6M3 18h18M13 5h6a2 2 0 0 1 2 2v5"/>',
    chairs: '<path d="M7 10V6a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v4M6 10h12v3a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2v-3zM8 15v4M16 15v4"/>',
    tables: '<path d="M4 10h16M6 10v8M18 10v8M8 14h8"/>',
    'office-furniture': '<path d="M4 20V8l8-4 8 4v12M4 12h16M12 8v12"/>',
    workstations: '<path d="M3 16h18M5 16V9h14v7M8 9V6h8v3M9 19h6"/>',
    cabinets: '<path d="M5 4h14v16H5zM5 12h14M12 12v8M9 8h.01M9 16h.01"/>',
    'custom-furniture': '<path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>',
    'home-furniture': '<path d="M3 11l9-8 9 8M5 10v10h14V10"/>',
    'sofa-seating': '<path d="M4 10V8a3 3 0 0 1 3-3h10a3 3 0 0 1 3 3v2M3 14v4h2v-2h14v2h2v-4a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2z"/>',
    'other-furniture': '<path d="M12 3v18M5 8h14M5 16h14"/>'
  };
  const path = icons[id] || icons['other-furniture'];
  return `<svg class="category-item-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${path}</svg>`;
}

function updateCatalogueNav(categories) {
  const nav = document.querySelector('.category-nav-list')
    || document.querySelector('.catalogue-nav-list')
    || document.querySelector('#catalogue-sidebar-nav');
  if (!nav) return;
  try {
    const list = (categories || []).filter(c => c && c.id && c.id !== '_other');
    if (!list.length) {
      nav.innerHTML = '<p class="catalogue-nav-empty">No categories yet</p>';
      return;
    }
    nav.innerHTML = list.map((c, i) =>
      `<a href="#${escapeHtml(c.id || '')}" class="category-item${i === 0 ? ' active' : ''}">
        <span class="category-item-left">${categoryIconSvg(c.id)}${escapeHtml(c.title || '')}</span>
      </a>`
    ).join('');
  } catch (e) {
    console.warn(e);
  }
}

function initCatalogueSearch() {
  const input = document.getElementById('product-search');
  if (!input) return;
  let debounce;
  input.addEventListener('input', () => {
    clearTimeout(debounce);
    debounce = setTimeout(() => {
      try { renderCatalogue(input.value); } catch (e) { console.error(e); }
    }, 250);
  });
}

async function initCataloguePage() {
  if (!document.getElementById('catalogue-container')) return;
  const loader = document.getElementById('catalogue-loader');
  try {
    if (loader) loader.style.display = 'flex';
    if (typeof initFirebase === 'function') initFirebase();
    await loadCatalogueData();
    renderCatalogue();
    initCatalogueSearch();
  } catch (err) {
    console.error(err);
    const container = document.getElementById('catalogue-container');
    if (container) {
      container.innerHTML = `<section class="catalogue-section"><div class="container">
        <div class="no-results fade-in visible">
          <h3>Catalogue temporarily unavailable</h3>
          <p>Please refresh. <a href="contact.html">Contact us</a> for product details.</p>
        </div></div></section>`;
    }
  } finally {
    if (loader) loader.style.display = 'none';
  }
}

document.addEventListener('DOMContentLoaded', initCataloguePage);
