// TODO: trocar pelo número real (DDI + DDD + número, só dígitos)
const WHATSAPP = "5500000000000";
const MSG_PADRAO = "Olá! Vim pelo site e gostaria de fazer uma cotação.";

function linkWhatsApp(mensagem) {
  return `https://wa.me/${WHATSAPP}?text=${encodeURIComponent(mensagem)}`;
}

// ── Medição (Umami, sem cookies). Só registra algo se o script do Umami estiver ativo no <head>. ──
function medir(evento, dados) {
  window.umami?.track(evento, dados);
}

document.querySelectorAll("[data-wa]").forEach((link) => {
  link.href = linkWhatsApp(MSG_PADRAO);
  link.target = "_blank";
  link.rel = "noopener";
  link.addEventListener("click", () => {
    medir("whatsapp", { onde: link.closest("section, footer, header")?.id || link.closest("section, footer, header")?.tagName.toLowerCase() || "pagina" });
  });
});

// (o scroll suave do Lenis fica em animacoes.js, sincronizado com o GSAP)

// ── Links para a própria página (logo, "Início"): sobem até o topo sem recarregar ──
// e sem deixar "#alguma-coisa" no endereço. Sem JavaScript, o link recarrega a página no topo.
document.querySelectorAll("a[href]").forEach((link) => {
  link.addEventListener("click", (e) => {
    const destino = new URL(link.href, location.href);
    const mesmaPagina = destino.origin === location.origin && destino.pathname === location.pathname;
    if (!mesmaPagina || destino.hash || link.target === "_blank") return;

    e.preventDefault();
    const reduzMovimento = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (window.lenis) window.lenis.scrollTo(0);
    else window.scrollTo({ top: 0, behavior: reduzMovimento ? "auto" : "smooth" });
    history.replaceState(null, "", location.pathname + location.search);
  });
});

// ── Pausa animações que estão fora da tela (alivia a rolagem) ──
const observador = new IntersectionObserver((entradas) => {
  entradas.forEach((e) => e.target.classList.toggle("pausado", !e.isIntersecting));
});

document.querySelectorAll(".s-hero, .page-hero, .marquee").forEach((el) => observador.observe(el));

// ── Header ──
const header = document.querySelector("header");
const menuToggle = document.querySelector(".menu-toggle");

window.addEventListener("scroll", () => {
  header.classList.toggle("scrolled", window.scrollY > 10);
}, { passive: true });

// a página de manutenção não tem menu
if (menuToggle) {
  const setMenu = (aberto) => {
    header.classList.toggle("menu-open", aberto);
    menuToggle.setAttribute("aria-expanded", aberto);
    menuToggle.setAttribute("aria-label", aberto ? "Fechar menu" : "Abrir menu");

    // a página de trás não rola enquanto o menu está aberto
    document.documentElement.classList.toggle("menu-aberto", aberto);
    if (window.lenis) aberto ? window.lenis.stop() : window.lenis.start();
  };

  menuToggle.addEventListener("click", () => {
    setMenu(!header.classList.contains("menu-open"));
  });

  document.querySelectorAll(".menu a").forEach((link) => {
    link.addEventListener("click", () => setMenu(false));
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") setMenu(false);
  });
}

// ── Formulário de cotação ──
const form = document.querySelector("#form-cotacao");

// só existe na página inicial
if (form) {
  const campoSeguro = form.querySelector("#f-seguro");
  const campoTelefone = form.querySelector("#f-telefone");

  // máscara (00) 00000-0000
  campoTelefone.addEventListener("input", () => {
    const d = campoTelefone.value.replace(/\D/g, "").slice(0, 11);
    let v = d;
    if (d.length > 2) v = `(${d.slice(0, 2)}) ${d.slice(2)}`;
    if (d.length > 7) v = `(${d.slice(0, 2)}) ${d.slice(2, d.length - 4)}-${d.slice(-4)}`;
    campoTelefone.value = v;
  });

  // o que aparece embaixo do campo quando ele está vazio ou incompleto
  const mensagens = {
    "f-nome": "Informe seu nome.",
    "f-telefone": "Informe seu WhatsApp com DDD.",
    "f-seguro": "Escolha o tipo de seguro."
  };

  const mostrarErro = (campo, texto) => {
    campo.setAttribute("aria-invalid", !!texto);
    const msg = document.getElementById(campo.id + "-msg");
    if (msg) msg.textContent = texto || "";
  };

  const botao = form.querySelector('button[type="submit"]');
  const sucesso = document.querySelector("#form-sucesso");

  form.addEventListener("submit", (e) => {
    e.preventDefault();

    let primeiroInvalido = null;
    form.querySelectorAll("[required]").forEach((campo) => {
      const valido = campo.checkValidity();
      mostrarErro(campo, valido ? "" : mensagens[campo.id]);
      if (!valido && !primeiroInvalido) primeiroInvalido = campo;
    });

    if (primeiroInvalido) {
      primeiroInvalido.focus();
      return;
    }

    const dados = new FormData(form);
    const linhas = [
      "Olá! Gostaria de uma cotação.",
      "",
      `*Nome:* ${dados.get("nome").trim()}`,
      `*Telefone:* ${dados.get("telefone")}`,
      `*Seguro:* ${dados.get("seguro")}`
    ];

    const mensagem = dados.get("mensagem").trim();
    if (mensagem) linhas.push(`*Mensagem:* ${mensagem}`);

    const link = linkWhatsApp(linhas.join("\n"));
    window.open(link, "_blank", "noopener");
    medir("cotacao", { seguro: dados.get("seguro") });

    // avisa o que aconteceu e evita envio duplo; o link serve se o navegador bloqueou a aba
    if (sucesso) {
      sucesso.querySelector("#form-sucesso-link").href = link;
      sucesso.hidden = false;
    }
    const textoOriginal = botao.textContent;
    botao.disabled = true;
    botao.textContent = "Mensagem pronta no WhatsApp";
    setTimeout(() => {
      botao.disabled = false;
      botao.textContent = textoOriginal;
    }, 6000);
  });

  // a mensagem de erro some assim que a pessoa corrige o campo
  form.querySelectorAll("[required]").forEach((campo) => {
    campo.addEventListener("input", () => mostrarErro(campo, ""));
    campo.addEventListener("change", () => mostrarErro(campo, ""));
  });

  // vindo da página de produtos (index.html?seguro=Seguro%20Auto#cotacao),
  // o tipo de seguro já chega selecionado
  const seguroDaUrl = new URLSearchParams(location.search).get("seguro");
  if (seguroDaUrl && [...campoSeguro.options].some((o) => o.value === seguroDaUrl)) {
    campoSeguro.value = seguroDaUrl;
  }
}

const ano = document.querySelector("#ano");
if (ano) ano.textContent = new Date().getFullYear();
