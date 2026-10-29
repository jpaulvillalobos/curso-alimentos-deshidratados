const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

function revealGroup(selector, animationClass, stagger = false) {
  const elements = [...document.querySelectorAll(selector)];

  elements.forEach((element, index) => {
    element.classList.add('reveal', animationClass);

    if (stagger) {
      element.style.setProperty('--reveal-delay', `${Math.min(index * 75, 375)}ms`);
    }
  });

  return elements;
}

function initCardInteractions() {
  const cards = document.querySelectorAll(
    '.benefit-item, .bonus-card, .testimonial-card, .pricing-card, .forsua-verification-card'
  );

  cards.forEach((card) => {
    card.classList.add('interactive-card');

    card.addEventListener('pointermove', (event) => {
      if (event.pointerType !== 'mouse' || reduceMotion.matches) return;

      const bounds = card.getBoundingClientRect();
      const horizontal = (event.clientX - bounds.left) / bounds.width - 0.5;
      const vertical = (event.clientY - bounds.top) / bounds.height - 0.5;

      card.style.setProperty('--tilt-x', `${horizontal * 2}deg`);
      card.style.setProperty('--tilt-y', `${vertical * -2}deg`);
    });

    card.addEventListener('pointerleave', () => {
      card.style.setProperty('--tilt-x', '0deg');
      card.style.setProperty('--tilt-y', '0deg');
    });
  });
}

function initHeroMotion() {
  const heroCopy = document.querySelector('.hero-copy');
  const heroMedia = document.querySelector('.hero-media-wrap');
  const hero = document.querySelector('.hero');

  heroCopy?.classList.add('hero-enter');
  heroMedia?.classList.add('hero-enter');

  if (!hero || !heroMedia || reduceMotion.matches || !window.matchMedia('(pointer: fine)').matches) return;

  hero.addEventListener('pointermove', (event) => {
    const bounds = hero.getBoundingClientRect();
    const x = (event.clientX - bounds.left) / bounds.width - 0.5;
    const y = (event.clientY - bounds.top) / bounds.height - 0.5;

    heroMedia.style.setProperty('--hero-shift-x', `${x * 5}px`);
    heroMedia.style.setProperty('--hero-shift-y', `${y * 5}px`);
  });

  hero.addEventListener('pointerleave', () => {
    heroMedia.style.setProperty('--hero-shift-x', '0px');
    heroMedia.style.setProperty('--hero-shift-y', '0px');
  });
}

export function initAnimaciones() {
  const revealTargets = [
    ...revealGroup('.section-heading', 'fade-in-up'),
    ...revealGroup('.achievement-list > li', 'fade-in-up', true),
    ...revealGroup('.module-row', 'fade-in-right', true),
    ...revealGroup('.video-card-section', 'zoom-in'),
    ...revealGroup('.bonus-card', 'zoom-in', true),
    ...revealGroup('.partner-lockup', 'fade-in-left'),
    ...revealGroup('.partnership-copy', 'fade-in-right'),
    ...revealGroup('.testimonial-video-box', 'zoom-in'),
    ...revealGroup('.testimonial-card', 'fade-in-up', true),
    ...revealGroup('.pricing-card', 'zoom-in'),
    ...revealGroup('.faq-intro', 'fade-in-left'),
    ...revealGroup('.faq-item', 'fade-in-up', true),
    ...revealGroup('.faq-final-cta', 'fade-in-up'),
    ...revealGroup('.lead-intro', 'fade-in-left'),
    ...revealGroup('.lead-form-panel', 'fade-in-right'),
    ...revealGroup('.forsua-verification-card', 'fade-in-up')
  ];

  initCardInteractions();
  initHeroMotion();

  if (reduceMotion.matches || !('IntersectionObserver' in window)) {
    revealTargets.forEach((element) => element.classList.add('active'));
    return;
  }

  const observer = new IntersectionObserver((entries, currentObserver) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add('active');
      currentObserver.unobserve(entry.target);
    });
  }, { threshold: 0.12, rootMargin: '0px 0px -36px 0px' });

  revealTargets.forEach((element) => observer.observe(element));
}

function getAccordionContent(details) {
  return [...details.children].filter((child) => child.matches('p, ul'));
}

function animateAccordion(details, opening) {
  const contents = getAccordionContent(details);
  const duration = reduceMotion.matches ? 0 : 260;

  if (opening) details.open = true;

  contents.forEach((content) => {
    content.getAnimations().forEach((animation) => animation.cancel());
    const height = content.getBoundingClientRect().height;
    const targetHeight = opening ? content.scrollHeight : 0;

    if (!duration || !content.animate) return;

    content.animate(
      [
        { height: `${opening ? 0 : height}px`, opacity: opening ? 0 : 1 },
        { height: `${targetHeight}px`, opacity: opening ? 1 : 0 }
      ],
      { duration, easing: 'cubic-bezier(0.2, 0.7, 0.2, 1)' }
    );
  });

  if (!opening) {
    window.setTimeout(() => {
      details.open = false;
    }, duration);
  }
}

export function initAcordeon() {
  const accordions = document.querySelectorAll('.faq-item, .module-row');

  accordions.forEach((details) => {
    const summary = details.querySelector(':scope > summary');
    if (!summary) return;

    summary.addEventListener('click', (event) => {
      event.preventDefault();
      const opening = !details.open;

      if (opening) {
        const group = details.closest('.faq-list, .module-list');
        group?.querySelectorAll('details[open]').forEach((sibling) => {
          if (sibling !== details) animateAccordion(sibling, false);
        });
      }

      animateAccordion(details, opening);
    });
  });
}

export function initCounters() {
  const counters = [...document.querySelectorAll('[data-counter]')];
  if (!counters.length) return;

  const animateCounter = (element) => {
    const target = Number(element.dataset.counter);
    const prefix = element.dataset.prefix || '';
    const suffix = element.dataset.suffix || '';

    if (reduceMotion.matches || !('requestAnimationFrame' in window)) {
      element.textContent = `${prefix}${target}${suffix}`;
      return;
    }

    const duration = 1100;
    const startedAt = performance.now();

    const update = (now) => {
      const progress = Math.min((now - startedAt) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      element.textContent = `${prefix}${Math.round(target * eased)}${suffix}`;

      if (progress < 1) requestAnimationFrame(update);
    };

    requestAnimationFrame(update);
  };

  if (reduceMotion.matches || !('IntersectionObserver' in window)) {
    counters.forEach(animateCounter);
    return;
  }

  const observer = new IntersectionObserver((entries, currentObserver) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      animateCounter(entry.target);
      currentObserver.unobserve(entry.target);
    });
  }, { threshold: 0.55 });

  counters.forEach((counter) => observer.observe(counter));
}
