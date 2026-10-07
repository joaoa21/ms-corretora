// Animações de entrada e de scroll (GSAP + ScrollTrigger) e scroll suave (Lenis).
// Só animamos transform, opacity e clip-path: o navegador não recalcula o layout,
// então não gera travadas nem "pulos" (CLS) na nota do Google.
//
// Marcação no HTML:
//   data-hero              → entra na abertura da página
//   data-reveal            → aparece ao rolar (sobe); "left", "right" ou "scale" mudam a direção
//   data-reveal-group      → os filhos aparecem um depois do outro
//
// Regra para não um efeito apagar o outro: a entrada usa "y"/"x" e os efeitos
// ligados à rolagem (parallax) usam "yPercent". O GSAP combina os dois no mesmo transform.

(() => {
  const raiz = document.documentElement;

  // se o GSAP não carregou, mostra tudo sem animação
  if (!window.gsap || !window.ScrollTrigger) {
    raiz.classList.remove("js");
    return;
  }

  gsap.registerPlugin(ScrollTrigger);

  const mm = gsap.matchMedia();
  const existe = (sel) => document.querySelector(sel) !== null;

  // quem pediu menos movimento no sistema não recebe nada disso
  mm.add("(prefers-reduced-motion: no-preference)", () => {
    const pararScroll = iniciarScrollSuave();
    animarEntrada();
    revelarAoRolar();
    acenderPalavras();
    abrirCotacao();
    const pararCarrossel = carrosselComRolagem();

    return () => {
      pararScroll?.();
      pararCarrossel?.();
    };
  });

  // camadas em velocidades diferentes: só no desktop (no celular tudo é uma coluna só)
  mm.add("(prefers-reduced-motion: no-preference) and (min-width: 62.5rem)", () => {
    parallaxHero();
    parallaxProdutos();
    parallaxSobre();
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
        // "auto" só interrompe as mesmas propriedades: o parallax (yPercent) continua
        overwrite: "auto",
        clearProps: "transition"
      })
    });
  }

  // ── Títulos que "acendem" palavra por palavra no ritmo da rolagem ──
  function acenderPalavras() {
    document.querySelectorAll(".section-title, .sobre-text .section-sub").forEach((el) => {
      const palavras = dividirEmPalavras(el);

      gsap.fromTo(palavras, { opacity: 0.15 }, {
        opacity: 1,
        ease: "none",
        stagger: 0.1,
        scrollTrigger: { trigger: el, start: "top 85%", end: "top 45%", scrub: true }
      });
    });
  }

  // envolve cada palavra num <span> (mantendo <span>, <em> e <br> que já existem no título)
  function dividirEmPalavras(el) {
    const textos = [];
    const caminho = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
    while (caminho.nextNode()) textos.push(caminho.currentNode);

    const palavras = [];
    textos.forEach((no) => {
      const pedaco = document.createDocumentFragment();

      no.textContent.split(/(\s+)/).forEach((parte) => {
        if (!parte) return;
        if (/^\s+$/.test(parte)) {
          pedaco.append(parte);
          return;
        }
        const span = document.createElement("span");
        span.className = "palavra";
        span.textContent = parte;
        pedaco.append(span);
        palavras.push(span);
      });

      no.replaceWith(pedaco);
    });

    return palavras;
  }

  // ── Seção de cotação "abrindo" até ocupar a largura toda ──
  function abrirCotacao() {
    if (!existe("#cotacao")) return;

    gsap.fromTo("#cotacao",
      { clipPath: "inset(0% 2.5% round 2.5rem)" },
      {
        clipPath: "inset(0% 0% round 0rem)",
        ease: "none",
        scrollTrigger: { trigger: "#cotacao", start: "top bottom", end: "top 20%", scrub: true }
      });
  }

  // ── Carrossel de seguradoras acelera quando a pessoa rola rápido ──
  function carrosselComRolagem() {
    const animacao = document.querySelector(".track")?.getAnimations?.()[0];
    if (!animacao) return;

    let alvo = 1;

    const gatilho = ScrollTrigger.create({
      trigger: ".marquee",
      start: "top bottom",
      end: "bottom top",
      onUpdate: (self) => {
        alvo = 1 + Math.min(Math.abs(self.getVelocity()) / 250, 5);
      }
    });

    // a velocidade sobe suave e volta ao normal aos poucos quando a rolagem para
    const suavizar = () => {
      animacao.playbackRate += (alvo - animacao.playbackRate) * 0.08;
      alvo += (1 - alvo) * 0.05;
    };
    gsap.ticker.add(suavizar);

    return () => {
      gsap.ticker.remove(suavizar);
      gatilho.kill();
      animacao.playbackRate = 1;
    };
  }

  // ── Parallax ──
  function parallaxHero() {
    if (!existe(".right-hero")) return; // só a página inicial tem as fotos

    const rolagemDoHero = { trigger: ".s-hero", start: "top top", end: "bottom top", scrub: true };

    gsap.to(".right-hero", { yPercent: -18, ease: "none", scrollTrigger: rolagemDoHero });
    gsap.to(".left-hero", { yPercent: 25, autoAlpha: 0, ease: "none", scrollTrigger: rolagemDoHero });

    // cada foto numa velocidade, dando profundidade
    const fotos = gsap.utils.toArray(".photo-card");
    [0, 14, -10].forEach((desvio, i) => {
      if (fotos[i]) gsap.to(fotos[i], { yPercent: desvio, ease: "none", scrollTrigger: rolagemDoHero });
    });
  }

  function parallaxProdutos() {
    const cards = gsap.utils.toArray(".product-grid .product-card");
    if (!cards.length) return;

    // colunas pares e ímpares sobem em ritmos diferentes
    cards.forEach((card, i) => {
      const coluna = i % 4;
      gsap.fromTo(card, { yPercent: coluna % 2 ? 10 : 0 }, {
        yPercent: coluna % 2 ? -10 : 0,
        ease: "none",
        scrollTrigger: { trigger: ".product-grid", start: "top bottom", end: "bottom top", scrub: true }
      });
    });
  }

  function parallaxSobre() {
    if (!existe(".sobre-visual")) return;

    const rolagemDoSobre = { trigger: "#sobre", start: "top bottom", end: "bottom top", scrub: true };

    // o card anda devagar e o selo mais rápido, parecendo flutuar na frente
    gsap.fromTo(".sobre-card", { yPercent: 6 }, { yPercent: -6, ease: "none", scrollTrigger: rolagemDoSobre });
    gsap.fromTo(".sobre-float", { yPercent: 60 }, { yPercent: -60, ease: "none", scrollTrigger: rolagemDoSobre });
  }
})();
