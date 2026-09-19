/* SAIFI UDYOG — Catalogue renderer (live Firebase only) */

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
      <p>No active products are published yet. If you added one in admin, set Status to <strong>Active</strong> (not Hidden), then refresh this page.</p>
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

function updateCatalogueNav(categories) {
  const nav = document.querySelector('.catalogue-nav .container');
  if (!nav) return;
  try {
    const visible = (categories || []).filter(c =>
      c && Array.isArray(c.subcategories) && c.subcategories.some(s => s && s.products && s.products.length)
    );
    if (!visible.length) {
      nav.innerHTML = '';
      return;
    }
    nav.innerHTML = visible.map((c, i) =>
      `<a href="#${escapeHtml(c.id || '')}" class="${i === 0 ? 'active' : ''}">${escapeHtml(c.title || '')}</a>`
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
