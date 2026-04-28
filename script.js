const lenis = new Lenis({
  duration: 1.2, // muda a força do efeito
  smoothWheel: true,
  smoothTouch: false,
  lerp: 0.08
});

function raf(time) {
  lenis.raf(time);
  requestAnimationFrame(raf);
}

requestAnimationFrame(raf);