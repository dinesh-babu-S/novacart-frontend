/* bg-morphism.js - Dynamic Glassmorphism Shopping Background
 * Injected on every page via app.js
 * Creates floating shopping icons + animated gradient orbs
 */

(function initMorphBackground() {

    // Inject the canvas if it doesn't already exist
    if (document.getElementById('bg-canvas')) return;

    const canvas = document.createElement('div');
    canvas.id = 'bg-canvas';
    canvas.setAttribute('aria-hidden', 'true');

    // ── Gradient Orbs ────────────────────────────────────────────────
    const orbCount = 4;
    for (let i = 1; i <= orbCount; i++) {
        const orb = document.createElement('div');
        orb.className = `bg-orb bg-orb-${i}`;
        canvas.appendChild(orb);
    }

    // ── Floating Shopping Icon Blobs ─────────────────────────────────
    // Each entry: [icon class, size px, top%, left%, animation, delay, color-class]
    const icons = [
        // Large icons - scattered corners
        ['bi-bag-heart-fill',       72, 8,  88,  'drift 18s ease-in-out infinite',         '0s',    'bg-icon-gold'],
        ['bi-cart-fill',            68, 75, 5,   'drift-slow 22s ease-in-out infinite',    '2s',    ''],
        ['bi-stars',                60, 20, 92,  'float 14s ease-in-out infinite',          '1s',    'bg-icon-pink'],
        ['bi-gift-fill',            64, 88, 55,  'drift 16s ease-in-out infinite',          '3s',    'bg-icon-blue'],
        ['bi-tag-fill',             56, 12, 40,  'float-reverse 12s ease-in-out infinite', '0.5s',  'bg-icon-gold'],
        // Medium icons - mid zones
        ['bi-handbag-fill',         50, 45, 82,  'drift-slow 20s ease-in-out infinite',    '4s',    ''],
        ['bi-box-seam-fill',        48, 60, 15,  'float 16s ease-in-out infinite',          '2.5s',  'bg-icon-blue'],
        ['bi-credit-card-fill',     46, 30, 68,  'drift 24s ease-in-out infinite',          '1.5s',  'bg-icon-pink'],
        ['bi-gem',                  44, 80, 75,  'float-reverse 18s ease-in-out infinite', '3.5s',  'bg-icon-gold'],
        ['bi-percent',              42, 52, 48,  'drift-slow 14s ease-in-out infinite',    '0.8s',  ''],
        // Small icons - fill gaps
        ['bi-truck',                36, 18, 60,  'float 20s ease-in-out infinite',          '2s',    'bg-icon-blue'],
        ['bi-bag-check-fill',       34, 65, 40,  'drift 15s ease-in-out infinite',          '4.5s',  ''],
        ['bi-currency-rupee',       32, 38, 22,  'float-reverse 22s ease-in-out infinite', '1.2s',  'bg-icon-gold'],
        ['bi-shop-window',          38, 92, 28,  'drift-slow 18s ease-in-out infinite',    '3s',    'bg-icon-pink'],
        ['bi-receipt',              30, 5,  15,  'float 11s ease-in-out infinite',          '0s',    ''],
    ];

    icons.forEach(([iconClass, size, top, left, animation, delay, colorClass]) => {
        const wrap = document.createElement('div');
        const classes = ['bg-icon'];
        if (colorClass) classes.push(colorClass);
        wrap.className = classes.join(' ');

        const padding = Math.round(size * 0.35);
        wrap.style.cssText = `
            width: ${size + padding * 2}px;
            height: ${size + padding * 2}px;
            top: ${top}%;
            left: ${left}%;
            font-size: ${size}px;
            animation: ${animation};
            animation-delay: ${delay};
            border-radius: ${Math.round(size * 0.3)}px;
        `;

        const icon = document.createElement('i');
        icon.className = `bi ${iconClass}`;
        wrap.appendChild(icon);
        canvas.appendChild(wrap);
    });

    // ── Inject before <body> content ─────────────────────────────────
    document.body.insertBefore(canvas, document.body.firstChild);

    // ── Subtle parallax on mouse move (desktop only) ──────────────────
    if (window.matchMedia('(pointer: fine)').matches) {
        let ticking = false;
        document.addEventListener('mousemove', (e) => {
            if (ticking) return;
            ticking = true;
            requestAnimationFrame(() => {
                const cx = window.innerWidth / 2;
                const cy = window.innerHeight / 2;
                const dx = (e.clientX - cx) / cx;   // -1 to +1
                const dy = (e.clientY - cy) / cy;   // -1 to +1

                // Shift orbs very slightly for depth effect
                const orbs = canvas.querySelectorAll('.bg-orb');
                orbs.forEach((orb, i) => {
                    const factor = (i + 1) * 8;
                    orb.style.transform = `translate(${dx * factor}px, ${dy * factor}px)`;
                });

                ticking = false;
            });
        });
    }

})();
