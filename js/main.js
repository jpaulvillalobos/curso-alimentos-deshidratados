import { initAnimaciones, initAcordeon, initCounters } from './modules/animaciones.js';
import { initEfectoAgua } from './assets/efecto-agua.js';
import { initSolicitudForm } from './modules/formulario-contacto.js';

document.documentElement.classList.add('js-motion');

function initHeader() {
  const header = document.querySelector('.site-header');
  if (!header) return;

  let frameRequested = false;
  const updateHeader = () => {
    header.classList.toggle('is-scrolled', window.scrollY > 12);
    frameRequested = false;
  };

  const onScroll = () => {
    if (frameRequested) return;
    frameRequested = true;
    window.requestAnimationFrame(updateHeader);
  };

  window.addEventListener('scroll', onScroll, { passive: true });
  updateHeader();
}

function initMobileNavigation() {
  const menu = document.querySelector('.mobile-menu');
  if (!menu) return;

  menu.querySelectorAll('a').forEach((link) => {
    link.addEventListener('click', () => {
      menu.open = false;
    });
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') menu.open = false;
  });
}

function initConversionTracking() {
  document.addEventListener('click', (event) => {
    const link = event.target.closest('a[href]');
    if (!link) return;

    const url = new URL(link.href, window.location.href);
    const channel = url.hostname === 'go.hotmart.com'
      ? 'hotmart'
      : url.hostname === 'wa.me'
        ? 'whatsapp'
        : null;

    if (!channel) return;

    const detail = {
      channel,
      href: link.href,
      label: link.textContent.trim() || link.getAttribute('aria-label') || channel
    };

    document.dispatchEvent(new CustomEvent('lobolink:conversion', { detail }));

    if (Array.isArray(window.dataLayer)) {
      window.dataLayer.push({ event: 'lobolink_conversion_click', ...detail });
    }
  });
}

function init() {
  initAnimaciones();
  initAcordeon();
  initCounters();
  initEfectoAgua();
  initSolicitudForm();
  initHeader();
  initMobileNavigation();
  initConversionTracking();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init, { once: true });
} else {
  init();
}
