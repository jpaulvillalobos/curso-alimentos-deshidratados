const buttonSelector = '.button, .btn-verify-forsua, .whatsapp-float, .brand-link-effect, .brand-mention';

function createRipple(button, event, delay = 0) {
  const bounds = button.getBoundingClientRect();
  const x = Math.min(Math.max(event.clientX - bounds.left, 0), bounds.width);
  const y = Math.min(Math.max(event.clientY - bounds.top, 0), bounds.height);
  const radius = Math.max(
    Math.hypot(x, y),
    Math.hypot(bounds.width - x, y),
    Math.hypot(x, bounds.height - y),
    Math.hypot(bounds.width - x, bounds.height - y)
  );
  const diameter = Math.ceil(radius * 2);
  const ripple = document.createElement('span');

  ripple.className = 'water-ripple';
  ripple.setAttribute('aria-hidden', 'true');
  ripple.style.left = `${x - radius}px`;
  ripple.style.top = `${y - radius}px`;
  ripple.style.width = `${diameter}px`;
  ripple.style.height = `${diameter}px`;
  ripple.style.animationDelay = `${delay}ms`;
  ripple.addEventListener('animationend', () => ripple.remove(), { once: true });
  button.append(ripple);
}

export function initEfectoAgua() {
  const supportsHover = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  if (!supportsHover || reduceMotion) return;

  document.querySelectorAll(buttonSelector).forEach((button) => {
    button.classList.add('water-effect-target');

    button.addEventListener('pointerenter', (event) => {
      if (event.pointerType && event.pointerType !== 'mouse') return;
      createRipple(button, event);
      createRipple(button, event, 130);
    });
  });
}