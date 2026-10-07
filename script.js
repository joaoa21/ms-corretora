// TODO: trocar pelo número real (DDI + DDD + número, só dígitos)
const WHATSAPP = "5500000000000";
const MSG_PADRAO = "Olá! Vim pelo site e gostaria de fazer uma cotação.";

function linkWhatsApp(mensagem) {
  return `https://wa.me/${WHATSAPP}?text=${encodeURIComponent(mensagem)}`;
}

document.querySelectorAll("[data-wa]").forEach((link) => {
  link.href = linkWhatsApp(MSG_PADRAO);
  link.target = "_blank";
  link.rel = "noopener";
});

// (o scroll suave do Lenis fica em animacoes.js, sincronizado com o GSAP)

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

  form.addEventListener("submit", (e) => {
    e.preventDefault();

    let primeiroInvalido = null;
    form.querySelectorAll("[required]").forEach((campo) => {
      const valido = campo.checkValidity();
      campo.setAttribute("aria-invalid", !valido);
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

    window.open(linkWhatsApp(linhas.join("\n")), "_blank", "noopener");
  });

  form.querySelectorAll("[required]").forEach((campo) => {
    campo.addEventListener("input", () => campo.removeAttribute("aria-invalid"));
    campo.addEventListener("change", () => campo.removeAttribute("aria-invalid"));
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
