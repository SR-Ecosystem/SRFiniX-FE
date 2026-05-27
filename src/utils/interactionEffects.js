let audioContext;
let lastSoundAt = 0;

const getAudioContext = () => {
  if (typeof window === 'undefined') return null;
  const AudioCtx = window.AudioContext || window.webkitAudioContext;
  if (!AudioCtx) return null;
  if (!audioContext) audioContext = new AudioCtx();
  return audioContext;
};

export const playInteractionSound = (kind = 'tap') => {
  if (typeof window === 'undefined') return;
  if (window.localStorage.getItem('soundEffects') === 'off') return;

  const nowMs = Date.now();
  if (nowMs - lastSoundAt < 70) return;
  lastSoundAt = nowMs;

  const ctx = getAudioContext();
  if (!ctx) return;

  if (ctx.state === 'suspended') {
    ctx.resume().catch(() => {});
  }

  const tones = {
    tap: { frequency: 620, end: 760, duration: 0.055, gain: 0.025 },
    confirm: { frequency: 720, end: 980, duration: 0.08, gain: 0.035 },
    danger: { frequency: 240, end: 190, duration: 0.09, gain: 0.03 },
    nav: { frequency: 520, end: 680, duration: 0.06, gain: 0.026 },
  };
  const tone = tones[kind] || tones.tap;
  const start = ctx.currentTime;

  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = 'sine';
  osc.frequency.setValueAtTime(tone.frequency, start);
  osc.frequency.exponentialRampToValueAtTime(tone.end, start + tone.duration);

  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.exponentialRampToValueAtTime(tone.gain, start + 0.012);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + tone.duration);

  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(start);
  osc.stop(start + tone.duration + 0.02);
};

const getInteractiveTarget = (target) => {
  if (!(target instanceof Element)) return null;
  return target.closest('button, a, [role="button"], input[type="checkbox"], input[type="radio"], select');
};

const isDisabled = (target) => (
  target?.disabled ||
  target?.getAttribute('aria-disabled') === 'true' ||
  target?.classList.contains('disabled')
);

const getSoundKind = (target) => {
  const text = `${target.textContent || ''} ${target.getAttribute('aria-label') || ''}`.toLowerCase();
  const classes = target.className?.toString().toLowerCase() || '';

  if (classes.includes('danger') || text.includes('delete') || text.includes('remove') || text.includes('logout')) return 'danger';
  if (text.includes('save') || text.includes('add') || text.includes('confirm') || text.includes('apply') || text.includes('create')) return 'confirm';
  if (target.tagName === 'A' || text.includes('home') || text.includes('analytics') || text.includes('settings') || text.includes('menu')) return 'nav';
  return 'tap';
};

const addRipple = (event, target) => {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  if (['INPUT', 'SELECT', 'TEXTAREA'].includes(target.tagName)) return;

  const rect = target.getBoundingClientRect();
  const size = Math.max(rect.width, rect.height);
  const ripple = document.createElement('span');
  ripple.className = 'sr-interaction-ripple';
  ripple.style.width = `${size}px`;
  ripple.style.height = `${size}px`;
  ripple.style.left = `${event.clientX - rect.left - size / 2}px`;
  ripple.style.top = `${event.clientY - rect.top - size / 2}px`;

  target.classList.add('sr-interactive-active');
  target.appendChild(ripple);
  ripple.addEventListener('animationend', () => ripple.remove(), { once: true });
  window.setTimeout(() => target.classList.remove('sr-interactive-active'), 150);
};

export const installInteractionEffects = () => {
  if (typeof window === 'undefined') return () => {};

  const handlePointerDown = (event) => {
    const target = getInteractiveTarget(event.target);
    if (!target || isDisabled(target)) return;
    addRipple(event, target);
  };

  const handleClick = (event) => {
    const target = getInteractiveTarget(event.target);
    if (!target || isDisabled(target)) return;
    playInteractionSound(getSoundKind(target));
  };

  document.addEventListener('pointerdown', handlePointerDown, true);
  document.addEventListener('click', handleClick, true);

  return () => {
    document.removeEventListener('pointerdown', handlePointerDown, true);
    document.removeEventListener('click', handleClick, true);
  };
};
