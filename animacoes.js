// Animações de entrada e de scroll (GSAP + ScrollTrigger) e scroll suave (Lenis).
// Só animamos transform e opacity: o navegador faz isso na GPU, sem recalcular
// o layout, então não gera travadas nem "pulos" (CLS) na nota do Google.
//
// Marcação no HTML:
//   data-hero              → entra na abertura da página
//   data-reveal            → aparece ao rolar (sobe); "left", "right" ou "scale" mudam a direção
//   data-reveal-group      → os filhos aparecem um depois do outro

(() => {
  const raiz = document.documentElement;

  // se o GSAP não carregou, mostra tudo sem animação
  if (!window.gsap || !window.ScrollTrigger) {
    raiz.classList.remove("js");
    return;
  }

  gsap.registerPlugin(ScrollTrigger);

  const mm = gsap.matchMedia();

  // quem pediu menos movimento no sistema não recebe nada disso
  mm.add("(prefers-reduced-motion: no-preference)", () => {
    const pararScroll = iniciarScrollSuave();
    animarEntrada();
    revelarAoRolar();

    return pararScroll;
  });

  // parallax só no desktop: no celular as fotos do hero nem aparecem
  mm.add("(prefers-reduced-motion: no-preference) and (min-width: 62.5rem)", () => {
    if (!document.querySelector(".right-hero")) return; // só a página inicial tem as fotos

    const rolagemDoHero = { trigger: ".s-hero", start: "top top", end: "bottom top", scrub: true };

    gsap.to(".right-hero", { yPercent: -12, ease: "none", scrollTrigger: rolagemDoHero });
    gsap.to(".left-hero", { y: 80, autoAlpha: 0.2, ease: "none", scrollTrigger: rolagemDoHero });
  });

  // a fonte pode chegar depois e mudar alturas: recalcula os pontos de disparo
  document.fonts?.ready.then(() => ScrollTrigger.refresh());

  // ── Lenis rodando no mesmo relógio do GSAP (um único loop de animação) ──
  function iniciarScrollSuave() {
    if (!window.Lenis) return;

    // com "duration" definido o Lenis ignora o "lerp", por isso só um dos dois
    const lenis = new Lenis({
      duration: 1.0,
      smoothWheel: true,
      anchors: { offset: -80 }
    });

    const tick = (tempo) => lenis.raf(tempo * 1000);

    lenis.on("scroll", ScrollTrigger.update);
    gsap.ticker.add(tick);
    gsap.ticker.lagSmoothing(0);

    return () => {
      gsap.ticker.remove(tick);
      lenis.destroy();
    };
  }

  // ── Abertura ──
  function animarEntrada() {
    const tl = gsap.timeline({ defaults: { duration: 0.9, ease: "power3.out" } });

    // só anima o que existe na página (a home e a de produtos têm topos diferentes)
    const existe = (sel) => document.querySelector(sel) !== null;

    // o título já está visível (é o LCP); ele só desliza até o lugar
    tl.to("[data-hero-titulo]", { y: 0, duration: 1.2, ease: "expo.out" }, 0)
      .fromTo("header [data-hero]", { autoAlpha: 0, y: -20 }, { autoAlpha: 1, y: 0 }, 0)
      .fromTo("main [data-hero]:not(.photo-card)", { autoAlpha: 0, y: 30 }, { autoAlpha: 1, y: 0, stagger: 0.1 }, 0.25);

    if (existe(".photo-card")) {
      tl.fromTo(".photo-card",
        { autoAlpha: 0, y: 50, scale: 0.94 },
        { autoAlpha: 1, y: 0, scale: 1, duration: 1.1, stagger: 0.12 }, 0.2);
    }

    // contadores: "+15" sobe de 0 a 15, "+2k" de 0 a 2
    document.querySelectorAll(".hero-stats strong").forEach((el) => {
      const partes = el.textContent.trim().match(/^(\D*)(\d+)(.*)$/);
      if (!partes) return;

      const [, antes, numero, depois] = partes;
      const contador = { valor: 0 };

      tl.to(contador, {
        valor: Number(numero),
        duration: 1.6,
        ease: "power2.out",
        snap: { valor: 1 },
        onUpdate: () => { el.textContent = antes + contador.valor + depois; }
      }, 0.6);
    });
  }

  // ── Elementos que aparecem ao rolar ──
  function revelarAoRolar() {
    const alvos = gsap.utils.toArray("[data-reveal], [data-reveal-group] > *");

    const deslocamento = {
      left:  { x: -60 },
      right: { x: 60 },
      scale: { scale: 0.85 }
    };

    alvos.forEach((el) => {
      gsap.set(el, {
        autoAlpha: 0,
        ...(deslocamento[el.dataset.reveal] || { y: 40 }),
        // alguns elementos têm transition no CSS (hover); ela brigaria com o GSAP
        transition: "none"
      });
    });

    ScrollTrigger.batch(alvos, {
      // clamp: itens no fim da página disparam mesmo sem chegar a 88% da tela
      start: "clamp(top 88%)",
      once: true,
      onEnter: (lote) => gsap.to(lote, {
        autoAlpha: 1,
        x: 0,
        y: 0,
        scale: 1,
        duration: 0.9,
        ease: "power3.out",
        stagger: 0.08,
        overwrite: true,
        // devolve o transform e a transition ao CSS para os efeitos de hover voltarem
        clearProps: "transform,transition"
      })
    });
  }
})();
