/* ============================================================
   Home — hero canvas field + pinned process scroll
   ============================================================ */
(function () {
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---- Hero canvas: drifting connected node field ---- */
  function heroField() {
    const cv = document.getElementById('heroCanvas');
    if (!cv) return;
    const ctx = cv.getContext('2d');
    let w, h, dpr, nodes = [], mouse = { x: -999, y: -999 };
    const COUNT = window.innerWidth < 760 ? 34 : 70;

    function size() {
      dpr = Math.min(2, window.devicePixelRatio || 1);
      w = cv.clientWidth; h = cv.clientHeight;
      cv.width = w * dpr; cv.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    function init() {
      nodes = [];
      for (let i = 0; i < COUNT; i++) {
        nodes.push({
          x: Math.random() * w, y: Math.random() * h,
          vx: (Math.random() - 0.5) * 0.22, vy: (Math.random() - 0.5) * 0.22,
          r: Math.random() * 1.6 + 0.5
        });
      }
    }
    function frame() {
      ctx.clearRect(0, 0, w, h);
      for (const n of nodes) {
        n.x += n.vx; n.y += n.vy;
        if (n.x < 0 || n.x > w) n.vx *= -1;
        if (n.y < 0 || n.y > h) n.vy *= -1;
        // mouse repel
        const dx = n.x - mouse.x, dy = n.y - mouse.y;
        const d = Math.hypot(dx, dy);
        if (d < 130) { n.x += dx / d * 0.8; n.y += dy / d * 0.8; }
      }
      // links
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const a = nodes[i], b = nodes[j];
          const dist = Math.hypot(a.x - b.x, a.y - b.y);
          if (dist < 130) {
            const o = (1 - dist / 130) * 0.16;
            ctx.strokeStyle = `rgba(214,243,124,${o})`;
            ctx.lineWidth = 0.6;
            ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
          }
        }
      }
      // nodes
      for (const n of nodes) {
        ctx.fillStyle = 'rgba(220,230,210,0.5)';
        ctx.beginPath(); ctx.arc(n.x, n.y, n.r, 0, Math.PI * 2); ctx.fill();
      }
      raf = requestAnimationFrame(frame);
    }
    let raf;
    function start() { cancelAnimationFrame(raf); size(); init(); if (!reduce) frame(); else { /* draw one static frame */ frameOnce(); } }
    function frameOnce() { ctx.clearRect(0,0,w,h); for (const n of nodes){ ctx.fillStyle='rgba(220,230,210,0.4)'; ctx.beginPath(); ctx.arc(n.x,n.y,n.r,0,Math.PI*2); ctx.fill(); } }
    window.addEventListener('resize', () => { size(); init(); });
    window.addEventListener('mousemove', (e) => {
      const r = cv.getBoundingClientRect();
      mouse.x = e.clientX - r.left; mouse.y = e.clientY - r.top;
    });
    start();
  }

  /* ---- Pinned horizontal process ---- */
  function processScroll() {
    if (!window.gsap || !window.ScrollTrigger || reduce) return;
    const track = document.querySelector('.proc-track');
    const pin = document.querySelector('.proc-pin');
    if (!track || !pin) return;
    if (window.innerWidth < 760) return; // vertical scroll on mobile
    const getScroll = () => track.scrollWidth - window.innerWidth + (window.innerWidth * 0.08);
    gsap.to(track, {
      x: () => -getScroll(),
      ease: 'none',
      scrollTrigger: {
        trigger: pin,
        start: 'top top',
        end: () => '+=' + getScroll(),
        scrub: 0.6,
        pin: true,
        anticipatePin: 1,
        invalidateOnRefresh: true
      }
    });
  }

  const boot = () => { heroField(); processScroll(); };
  if (document.readyState !== 'loading') boot();
  else document.addEventListener('DOMContentLoaded', boot);
})();
