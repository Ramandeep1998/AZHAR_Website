/* SAIFI UDYOG — Main JavaScript (crash-safe boot) */

document.addEventListener('DOMContentLoaded', async () => {
  if (window.SAIFI_SAFE) SAIFI_SAFE.bindGlobalErrorHandlers();

  // Prefill must not wait on Firebase — otherwise Enquire Now arrives with an empty form
  try { prefillEnquiryFromUrl(); } catch (e) { console.warn('prefillEnquiryFromUrl', e); }

  try { await initSiteConfig(); } catch (e) { console.warn('initSiteConfig', e); }
  try { initHeader(); } catch (e) { console.warn('initHeader', e); }
  try { initMobileNav(); } catch (e) { console.warn('initMobileNav', e); }
  try { initScrollAnimations(); } catch (e) { console.warn('initScrollAnimations', e); }
  try { initCatalogueNav(); } catch (e) { console.warn('initCatalogueNav', e); }
  try { initContactForm(); } catch (e) { console.warn('initContactForm', e); }
  try { initWhatsAppFloat(); } catch (e) { console.warn('initWhatsAppFloat', e); }
  try { initBackToTop(); } catch (e) { console.warn('initBackToTop', e); }
  try { initProductLightbox(); } catch (e) { console.warn('initProductLightbox', e); }
  try { await initHomeCatalogue(); } catch (e) { console.warn('initHomeCatalogue', e); }
});

/* ---- Home: live products only (no sample / Unsplash filler) ---- */
function escapeHomeHtml(str) {
  if (window.SAIFI_SAFE) return SAIFI_SAFE.escapeHtml(str);
  if (!str) return '';
  const d = document.createElement('div');
  d.textContent = str;
  return d.innerHTML;
}

async function initHomeCatalogue() {
  const grid = document.getElementById('home-category-grid');
  if (!grid) return;

  const loading = document.getElementById('home-catalogue-loading');
  const intro = document.getElementById('home-products-intro');
  const heroImg = document.getElementById('home-hero-image');
  const heroBg = document.getElementById('home-hero-bg');

  try {
    if (typeof initFirebase === 'function') initFirebase();
    const data = (typeof getCatalogueData === 'function')
      ? await getCatalogueData()
      : [];

    const categories = Array.isArray(data) ? data : [];
    const firstImage = categories
      .flatMap(c => (c.subcategories || []).flatMap(s => s.products || []))
      .map(p => p.image)
      .find(src => src && !String(src).includes('unsplash.com'));

    if (firstImage && heroImg && heroBg) {
      const safe = window.SAIFI_SAFE ? SAIFI_SAFE.safeImageUrl(firstImage) : firstImage;
      heroImg.src = safe;
      heroImg.alt = 'SAIFI UDYOG furniture';
      heroImg.hidden = false;
      heroImg.removeAttribute('hidden');
      heroBg.classList.add('has-photo');
    }

    if (!categories.length) {
      if (window.__SAIFI_CATALOGUE_ERROR) {
        if (intro) intro.textContent = 'Catalogue could not load from the server.';
        grid.innerHTML = `
          <div class="home-empty-catalogue fade-in visible">
            <h3>Catalogue could not load</h3>
            <p>${escapeHomeHtml(window.__SAIFI_CATALOGUE_ERROR)}</p>
            <a href="products.html" class="btn btn-wood">See details</a>
          </div>`;
        return;
      }
      if (intro) {
        intro.textContent = 'New pieces are being prepared. Contact us for current availability.';
      }
      grid.innerHTML = `
        <div class="home-empty-catalogue fade-in visible">
          <h3>Catalogue updating</h3>
          <p>No products are listed yet. Reach out and we’ll share the latest range.</p>
          <a href="contact.html" class="btn btn-wood">Contact Us</a>
        </div>`;
      return;
    }

    if (intro) {
      intro.textContent = 'Explore furniture crafted for comfort, style and durability.';
    }

    grid.innerHTML = categories.map(cat => {
      const first = (cat.subcategories || [])
        .flatMap(s => s.products || [])
        .find(p => p && p.image);
      const img = first && first.image
        ? (window.SAIFI_SAFE ? SAIFI_SAFE.safeImageUrl(first.image) : first.image)
        : '';
      const count = (cat.subcategories || []).reduce(
        (n, s) => n + ((s.products && s.products.length) || 0), 0
      );
      const imgHtml = img
        ? `<img src="${escapeHomeHtml(img)}" alt="${escapeHomeHtml(cat.title || '')}" loading="lazy">`
        : `<div class="category-card-placeholder"></div>`;

      return `<a href="products.html#${escapeHomeHtml(cat.id || '')}" class="category-card fade-in">
        ${imgHtml}
        <div class="category-card-overlay">
          <h3>${escapeHomeHtml(cat.title || '')}</h3>
          <span class="category-card-count">${count} product${count === 1 ? '' : 's'}</span>
        </div>
      </a>`;
    }).join('');

    if (typeof initScrollAnimations === 'function') initScrollAnimations();
  } catch (err) {
    console.error(err);
    grid.innerHTML = `
      <div class="home-empty-catalogue fade-in visible">
        <h3>Catalogue temporarily unavailable</h3>
        <p><a href="contact.html">Contact us</a> for product details.</p>
      </div>`;
  } finally {
    if (loading) loading.remove();
  }
}

/* ---- Site Config (contact info from Firebase cloud) ---- */
async function initSiteConfig() {
  if (typeof SITE_CONFIG === 'undefined') return;

  let config = { ...SITE_CONFIG };
  if (typeof getSiteSettings === 'function') {
    try {
      config = await getSiteSettings();
    } catch (e) { /* use defaults */ }
  }
  window.SITE_RUNTIME_CONFIG = config;

  document.querySelectorAll('[data-contact]').forEach(el => {
    const key = el.dataset.contact;
    const value = config[key];
    if (!value) return;

    if (el.tagName === 'A') {
      el.textContent = value;
      if (key === 'email') el.href = `mailto:${value}`;
      if (key === 'phone') el.href = `tel:${value.replace(/\s/g, '')}`;
    } else {
      el.textContent = value;
    }
  });

  const waBtn = document.querySelector('[data-whatsapp-btn]');
  if (waBtn && config.whatsappNumber) {
    waBtn.href = `https://wa.me/${config.whatsappNumber}`;
    waBtn.style.display = '';
  } else if (waBtn) {
    waBtn.style.display = 'none';
  }

  const mapContainer = document.getElementById('map-container');
  if (mapContainer && config.mapsEmbedUrl) {
    mapContainer.innerHTML = `<iframe src="${config.mapsEmbedUrl}" width="100%" height="100%" style="border:0;" allowfullscreen loading="lazy" referrerpolicy="no-referrer-when-downgrade" title="SAIFI UDYOG location"></iframe>`;
    mapContainer.classList.remove('map-placeholder');
  }
}

/* ---- Sticky Header ---- */
function initHeader() {
  const header = document.querySelector('.header');
  if (!header) return;

  window.addEventListener('scroll', () => {
    header.classList.toggle('scrolled', window.scrollY > 40);
  });
}

/* ---- Mobile Navigation ---- */
function initMobileNav() {
  const nav = document.querySelector('.nav');
  const toggle = document.querySelector('.nav-toggle');
  if (!nav || !toggle) return;

  toggle.addEventListener('click', () => {
    nav.classList.toggle('open');
    toggle.classList.toggle('active');
    document.body.classList.toggle('nav-open', nav.classList.contains('open'));
  });

  document.querySelectorAll('.nav-links a').forEach(link => {
    link.addEventListener('click', () => {
      nav.classList.remove('open');
      toggle.classList.remove('active');
      document.body.classList.remove('nav-open');
    });
  });
}

/* ---- Scroll Animations ---- */
function initScrollAnimations() {
  const elements = document.querySelectorAll('.fade-in:not(.visible)');
  if (!elements.length) return;

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.12, rootMargin: '0px 0px -40px 0px' }
  );

  elements.forEach(el => observer.observe(el));
}

/* ---- Catalogue Category Navigation ---- */
function initCatalogueNav() {
  const navLinks = document.querySelectorAll('.catalogue-nav a');
  const sections = document.querySelectorAll('.catalogue-section[id]');

  if (!navLinks.length || !sections.length) return;

  navLinks.forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const target = document.querySelector(link.getAttribute('href'));
      if (target) {
        const offset = 160;
        const top = target.getBoundingClientRect().top + window.scrollY - offset;
        window.scrollTo({ top, behavior: 'smooth' });
      }
    });
  });

  const sectionObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const id = entry.target.getAttribute('id');
          navLinks.forEach(link => {
            link.classList.toggle('active', link.getAttribute('href') === `#${id}`);
          });
        }
      });
    },
    { threshold: 0.2, rootMargin: '-160px 0px -55% 0px' }
  );

  sections.forEach(section => sectionObserver.observe(section));
}

/* ---- Contact Form ---- */
function initContactForm() {
  const form = document.getElementById('contact-form');
  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const name = form.querySelector('[name="name"]').value.trim();
    const mobile = form.querySelector('[name="mobile"]').value.trim();
    const email = form.querySelector('[name="email"]').value.trim();
    const message = form.querySelector('[name="message"]').value.trim();
    const productField = form.querySelector('[name="product"]');
    const productFromUrl = new URLSearchParams(window.location.search).get('product') || '';
    const product = ((productField && productField.value) || productFromUrl || '').trim();

    if (!name || !mobile || !message) {
      showFormError('Please fill in all required fields.');
      return;
    }

    const submitBtn = form.querySelector('[type="submit"]');
    const waBtn = document.getElementById('submit-whatsapp');
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = 'Sending...';
    }
    if (waBtn) waBtn.disabled = true;

    const cfg = window.SITE_RUNTIME_CONFIG || SITE_CONFIG;
    const enquiry = { name, mobile, email, message, product };

    try {
      let savedId = null;
      if (typeof saveEnquiry === 'function') {
        savedId = await saveEnquiry(enquiry);
      }

      if (cfg.web3formsKey) {
        const fd = new FormData();
        fd.append('access_key', cfg.web3formsKey);
        fd.append('subject', `New Enquiry from ${name} — SAIFI UDYOG`);
        fd.append('from_name', name);
        fd.append('email', email || 'no-reply@saifiudyog.com');
        fd.append('message', formatEnquiryText(enquiry));
        await fetch('https://api.web3forms.com/submit', { method: 'POST', body: fd });
      } else if (cfg.formEndpoint) {
        const res = await fetch(cfg.formEndpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
          body: JSON.stringify(enquiry)
        });
        if (!res.ok) throw new Error('Email send failed');
      }

      if (cfg.whatsappNumber) {
        const text = encodeURIComponent(formatEnquiryText(enquiry, true));
        window.open(`https://wa.me/${cfg.whatsappNumber}?text=${text}`, '_blank');
        const saveNote = savedId
          ? 'Your enquiry was saved.'
          : 'Please tap Send on WhatsApp (cloud save may need Firestore enquiry rules).';
        showFormSuccess(`Thank you! ${saveNote}`);
      } else if (savedId) {
        showFormSuccess('Thank you! Your enquiry has been received. We will contact you shortly.');
      } else {
        throw new Error('Could not save enquiry');
      }

      form.reset();
      const group = document.getElementById('enquiry-product-group');
      if (group) group.hidden = true;
    } catch (err) {
      console.error(err);
      if (cfg.whatsappNumber) {
        const text = encodeURIComponent(formatEnquiryText(enquiry, true));
        window.open(`https://wa.me/${cfg.whatsappNumber}?text=${text}`, '_blank');
        showFormSuccess('WhatsApp opened — please tap Send to reach us.');
      } else {
        showFormError('Could not send enquiry. Please call or email us directly.');
      }
    } finally {
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Send Enquiry';
      }
      if (waBtn) waBtn.disabled = false;
    }
  });

  // Direct WhatsApp button
  const waDirect = document.getElementById('submit-whatsapp');
  if (waDirect) {
    waDirect.addEventListener('click', () => {
      const cfg = window.SITE_RUNTIME_CONFIG || SITE_CONFIG;
      if (!cfg.whatsappNumber) {
        alert('WhatsApp number not configured yet. Please use the form or call us.');
        return;
      }
      const name = document.getElementById('name')?.value.trim() || '';
      const mobile = document.getElementById('mobile')?.value.trim() || '';
      const email = document.getElementById('email')?.value.trim() || '';
      const message = document.getElementById('message')?.value.trim() || 'Hello, I would like to enquire about your furniture.';
      const product = (document.getElementById('enquiry-product')?.value
        || new URLSearchParams(window.location.search).get('product')
        || '').trim();
      const text = encodeURIComponent(formatEnquiryText({ name, mobile, email, message, product }, true));
      window.open(`https://wa.me/${cfg.whatsappNumber}?text=${text}`, '_blank');
    });
  }
}

function formatEnquiryText(data, forWhatsApp) {
  const lines = [
    forWhatsApp ? '*New Furniture Enquiry — SAIFI UDYOG*' : 'New Furniture Enquiry — SAIFI UDYOG',
    '',
    `Name: ${data.name}`,
    `Mobile: ${data.mobile}`,
    data.email ? `Email: ${data.email}` : '',
    data.product ? `Product: ${data.product.replace(/\+/g, ' ')}` : '',
    '',
    'Message:',
    data.message
  ].filter(Boolean);
  return lines.join(forWhatsApp ? '\n' : '\n');
}

function showFormSuccess(customMessage) {
  const form = document.getElementById('contact-form');
  const success = document.querySelector('.form-success');
  if (form) form.style.display = 'none';
  if (success) {
    if (customMessage) {
      const p = success.querySelector('p');
      if (p) p.textContent = customMessage;
    }
    success.classList.add('show');
  }
}

function showFormError(msg) {
  alert(msg);
}

function prefillEnquiryFromUrl() {
  const params = new URLSearchParams(window.location.search);
  let product = params.get('product');

  // Local static servers sometimes strip ?query on .html → clean URL redirects
  if (!product) {
    try {
      product = sessionStorage.getItem('saifi_enquiry_product') || '';
    } catch (e) { /* ignore */ }
  }

  if (!product) return;

  try {
    product = decodeURIComponent(product).replace(/\+/g, ' ').trim();
  } catch (e) {
    product = String(product).replace(/\+/g, ' ').trim();
  }
  if (!product) return;

  try {
    sessionStorage.removeItem('saifi_enquiry_product');
  } catch (e) { /* ignore */ }

  const productField = document.getElementById('enquiry-product');
  const productGroup = document.getElementById('enquiry-product-group');
  if (productField) {
    productField.value = product;
    if (productGroup) productGroup.hidden = false;
  }

  const messageField = document.getElementById('message');
  if (messageField && !messageField.value.trim()) {
    messageField.value = `I would like to enquire about: ${product}`;
  }
}

/** Keep product name across navigation when hosts drop query strings */
function rememberEnquiryProduct(name) {
  const value = String(name || '').trim();
  if (!value) return;
  try {
    sessionStorage.setItem('saifi_enquiry_product', value);
  } catch (e) { /* ignore */ }
}

/* ---- Floating WhatsApp Button ---- */
function initWhatsAppFloat() {
  const waNum = (window.SITE_RUNTIME_CONFIG || SITE_CONFIG)?.whatsappNumber;
  if (!waNum) return;
  if (document.querySelector('.whatsapp-float')) return;

  const link = document.createElement('a');
  link.href = `https://wa.me/${waNum}`;
  link.className = 'whatsapp-float';
  link.target = '_blank';
  link.rel = 'noopener';
  link.setAttribute('aria-label', 'Chat on WhatsApp');
  link.innerHTML = `
    <svg viewBox="0 0 24 24" fill="currentColor" width="28" height="28">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.435 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
    </svg>`;
  document.body.appendChild(link);
}

/* ---- Back to Top ---- */
function initBackToTop() {
  const btn = document.createElement('button');
  btn.className = 'back-to-top';
  btn.setAttribute('aria-label', 'Back to top');
  btn.innerHTML = '↑';
  document.body.appendChild(btn);

  window.addEventListener('scroll', () => {
    btn.classList.toggle('visible', window.scrollY > 500);
  });

  btn.addEventListener('click', () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });
}

/* ---- Product Image Lightbox ---- */
function initProductLightbox() {
  document.querySelectorAll('.lightbox-trigger').forEach(trigger => {
    trigger.addEventListener('click', () => {
      openLightbox(trigger.dataset.src, trigger.dataset.alt);
    });
  });
}

function openLightbox(src, alt) {
  let overlay = document.querySelector('.lightbox-overlay');
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.className = 'lightbox-overlay';
    overlay.innerHTML = `
      <button class="lightbox-close" aria-label="Close">&times;</button>
      <img class="lightbox-image" src="" alt="">
      <p class="lightbox-caption"></p>`;
    document.body.appendChild(overlay);

    overlay.addEventListener('click', (e) => {
      if (e.target === overlay || e.target.classList.contains('lightbox-close')) {
        closeLightbox();
      }
    });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') closeLightbox();
    });
  }

  const safeSrc = window.SAIFI_SAFE
    ? SAIFI_SAFE.safeImageUrl(String(src || '').replace('w=600', 'w=1200'))
    : src;
  const img = overlay.querySelector('.lightbox-image');
  img.onerror = () => {
    img.onerror = null;
    img.src = window.SAIFI_SAFE ? SAIFI_SAFE.PLACEHOLDER_IMAGE : '';
  };
  img.src = safeSrc;
  img.alt = alt || '';
  overlay.querySelector('.lightbox-caption').textContent = alt || '';
  overlay.classList.add('active');
  document.body.style.overflow = 'hidden';
}

function closeLightbox() {
  const overlay = document.querySelector('.lightbox-overlay');
  if (overlay) {
    overlay.classList.remove('active');
    document.body.style.overflow = '';
  }
}
