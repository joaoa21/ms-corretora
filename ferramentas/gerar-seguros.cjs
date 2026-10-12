// Gera uma página para cada seguro a partir de dados/seguros.json
// e atualiza o sitemap.xml.
//
// Como usar (na pasta do site):
//   node ferramentas/gerar-seguros.cjs
//
// Para adicionar um seguro: inclua um bloco em dados/seguros.json, adicione o
// card dele em produtos.html (o ícone vem de lá) e rode este script.

const fs = require('fs');
const path = require('path');

const RAIZ = path.join(__dirname, '..');
const URL = 'https://mscorretoraseguros.com.br';
const ler = (f) => fs.readFileSync(path.join(RAIZ, f), 'utf8').replace(/\r\n/g, '\n');

const seguros = JSON.parse(ler('dados/seguros.json'));
const produtos = ler('produtos.html');

// cabeçalho e rodapé vêm da página de produtos, com os links apontando para a raiz
function bloco(inicio, fim) {
  const a = produtos.indexOf(inicio), b = produtos.indexOf(fim, a) + fim.length;
  if (a < 0 || b < fim.length) throw new Error('não achei ' + inicio);
  return produtos.slice(a, b)
    .replace(/ aria-current="page"/g, '')
    .replace(/href="\.\/(#[^"]*)?"/g, (m, h) => `href="/${h || ''}"`)
    .replace(/href="(produtos|privacidade)\.html/g, 'href="/$1.html')
    .replace(/href="seguros\//g, 'href="/seguros/')
    .replace(/src="assets\//g, 'src="/assets/');
}
const header = bloco('  <header>', '</header>');
const footer = bloco('  <footer>', '</footer>');

// ícone de cada seguro, copiado do card correspondente em produtos.html
function icone(nomeNoCard) {
  // acha o título do card (pode estar dentro de um link) e pega o ícone logo antes dele
  const reTitulo = new RegExp(`<h2>(?:<a [^>]*>)?${nomeNoCard.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?:<\\/a>)?<\\/h2>`);
  const posTitulo = produtos.search(reTitulo);
  if (posTitulo < 0) throw new Error('card não encontrado em produtos.html para: ' + nomeNoCard);
  const antes = produtos.slice(0, posTitulo);
  const inicioIcone = antes.lastIndexOf('<div class="product-icon');
  const trecho = antes.slice(inicioIcone);
  const m = trecho.match(/<svg[\s\S]*?<\/svg>/);
  if (!m) throw new Error('ícone não encontrado em produtos.html para: ' + nomeNoCard);
  return m[0];
}

const esc = (s) => s.replace(/&/g, '&amp;').replace(/"/g, '&quot;');
const semTags = (s) => s.replace(/<[^>]+>/g, '');
const json = (o) => JSON.stringify(o, null, 2).split('\n').map((l) => '  ' + l).join('\n');
const hoje = new Date().toISOString().slice(0, 10);

const passos = `
        <ol class="passos" data-reveal-group>
          <li class="passo">
            <span class="passo-num" aria-hidden="true">1</span>
            <h3>Conte o que você precisa</h3>
            <p>Preencha o formulário ou chame no WhatsApp. Leva um minuto e não tem compromisso.</p>
          </li>
          <li class="passo">
            <span class="passo-num" aria-hidden="true">2</span>
            <h3>Comparamos as seguradoras</h3>
            <p>Um consultor monta propostas nas principais seguradoras e mostra um comparativo claro de coberturas e preços.</p>
          </li>
          <li class="passo">
            <span class="passo-num" aria-hidden="true">3</span>
            <h3>Contrate sem burocracia</h3>
            <p>Você escolhe, assina digitalmente e recebe a apólice. Depois, cuidamos da renovação e acompanhamos você em caso de sinistro.</p>
          </li>
        </ol>`;

for (const s of seguros) {
  const url = `${URL}/seguros/${s.slug}/`;
  const cotar = `/?seguro=${encodeURIComponent(s.opcaoFormulario)}#cotacao`;
  const outros = seguros.filter((o) => o.slug !== s.slug);

  const jsonld = {
    '@context': 'https://schema.org',
    '@graph': [
      { '@type': 'BreadcrumbList', itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Início', item: `${URL}/` },
        { '@type': 'ListItem', position: 2, name: 'Produtos', item: `${URL}/produtos.html` },
        { '@type': 'ListItem', position: 3, name: s.nome, item: url }
      ] },
      { '@type': 'Service', '@id': `${url}#servico`, name: s.nome, serviceType: 'Seguro', url, description: s.descricao,
        provider: { '@id': `${URL}/#empresa` }, areaServed: { '@type': 'Country', name: 'Brasil' },
        hasOfferCatalog: { '@type': 'OfferCatalog', name: `Coberturas do ${s.nome}`, itemListElement: s.coberturas.map((c) => ({ '@type': 'Offer', itemOffered: { '@type': 'Service', name: c.titulo, description: c.texto } })) } },
      { '@type': 'FAQPage', mainEntity: s.faq.map((f) => ({ '@type': 'Question', name: f.p, acceptedAnswer: { '@type': 'Answer', text: f.r } })) }
    ]
  };

  const html = `<!DOCTYPE html>
<html lang="pt-BR">

<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${esc(s.titulo)}</title>
  <meta name="description" content="${esc(s.descricao)}">
  <meta name="robots" content="index, follow, max-image-preview:large">
  <meta name="theme-color" content="#0C1F4A">

  <link rel="canonical" href="${url}">

  <link rel="icon" href="/favicon.ico" sizes="48x48">
  <link rel="icon" href="/icons/favicon.svg" type="image/svg+xml">
  <link rel="apple-touch-icon" href="/icons/apple-touch-icon.png">
  <link rel="manifest" href="/site.webmanifest">

  <meta property="og:type" content="website">
  <meta property="og:locale" content="pt_BR">
  <meta property="og:site_name" content="MS Corretora de Seguros">
  <meta property="og:url" content="${url}">
  <meta property="og:title" content="${esc(s.nome)} | MS Corretora">
  <meta property="og:description" content="${esc(s.descricao)}">
  <meta property="og:image" content="${URL}/assets/og-produtos.jpg">
  <meta property="og:image:type" content="image/jpeg">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="630">
  <meta property="og:image:alt" content="Seguros da MS Corretora">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${esc(s.nome)} | MS Corretora">
  <meta name="twitter:description" content="${esc(s.descricao)}">
  <meta name="twitter:image" content="${URL}/assets/og-produtos.jpg">

  <script type="application/ld+json">
${json(jsonld)}
  </script>

  <link rel="preload" href="/fonts/bricolage-grotesque.woff2" as="font" type="font/woff2" crossorigin>
  <link rel="preload" href="/fonts/dm-sans.woff2" as="font" type="font/woff2" crossorigin>

  <script>document.documentElement.classList.add("js")</script>

  <link rel="stylesheet" href="/styles/global.css">
  <link rel="stylesheet" href="/styles/utility.css">
  <link rel="stylesheet" href="/styles/header.css">
  <link rel="stylesheet" href="/styles/hero.css">
  <link rel="stylesheet" href="/styles/products.css">
  <link rel="stylesheet" href="/styles/pagina.css">
  <link rel="stylesheet" href="/styles/produtos-pagina.css">
  <link rel="stylesheet" href="/styles/como-funciona.css">
  <link rel="stylesheet" href="/styles/duvidas.css">
  <link rel="stylesheet" href="/styles/seguro.css">
  <link rel="stylesheet" href="/styles/footer.css">

  <!--
    Medição de acessos (Umami Cloud: gratuito, sem cookies, não exige aviso de cookies).
    Para ativar: crie a conta em https://cloud.umami.is, cadastre o site, copie o
    "website id" e troque SEU-ID-AQUI abaixo, tirando os marcadores de comentário.
    Os cliques no WhatsApp e os envios do formulário já são contados pelo script.js.
  -->
  <!-- <script defer src="https://cloud.umami.is/script.js" data-website-id="SEU-ID-AQUI"></script> -->

  <script src="/vendor/lenis.min.js" defer></script>
  <script src="/vendor/gsap.min.js" defer></script>
  <script src="/vendor/ScrollTrigger.min.js" defer></script>
  <script src="/script.js" defer></script>
  <script src="/animacoes.js" defer></script>
</head>

<body>
  <a class="pular-conteudo" href="#conteudo">Pular para o conteúdo</a>
${header}

  <main id="conteudo">
    <section class="page-hero">
      <div class="s-hero-bg"></div>
      <div class="container page-hero-inner">
        <div class="page-hero-texto">
          <nav class="breadcrumb" aria-label="Você está em" data-hero>
            <a href="/">Início</a>
            <span aria-hidden="true">/</span>
            <a href="/produtos.html">Produtos</a>
            <span aria-hidden="true">/</span>
            <span aria-current="page">${s.nome}</span>
          </nav>

          <h1 data-hero-titulo>${s.h1}</h1>
          <p data-hero>${s.intro[0]}</p>

          <div class="page-hero-acoes" data-hero>
            <a href="${cotar}" class="btn">Cotar ${s.nome}<svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5" aria-hidden="true"><path d="M5 12h14M12 5l7 7-7 7"/></svg></a>
            <a data-wa href="/#cotacao" class="btn secondary">Falar no WhatsApp</a>
          </div>
        </div>

        <aside class="page-hero-painel" data-hero aria-label="Resumo do ${s.nome}">
          <ul>
${s.destaques.map((d) => `            <li><strong>${d.valor}</strong><span>${d.texto}</span></li>`).join('\n')}
          </ul>
        </aside>
      </div>
    </section>

    <section class="seguro-coberturas">
      <div class="container">
        <div class="products-header" data-reveal-group>
          <span class="section-label">Coberturas</span>
          <h2 class="section-title">O que o <span>${s.nome}</span> cobre</h2>
          <p class="section-sub">${s.intro[1]}</p>
        </div>

        <div class="coberturas-grid" data-reveal-group>
${s.coberturas.map((c) => `          <article class="cobertura">
            <span class="cobertura-icone" aria-hidden="true"></span>
            <h3>${c.titulo}</h3>
            <p>${c.texto}</p>
          </article>`).join('\n')}
        </div>

        <p class="coberturas-nota" data-reveal>As coberturas disponíveis e seus limites variam conforme a seguradora e o plano escolhido. Na cotação, mostramos exatamente o que cada proposta inclui.</p>
      </div>
    </section>

    <section class="seguro-detalhes">
      <div class="container">
        <div class="detalhes-grid">
          <div class="detalhe-card" data-reveal="left">
            <div class="product-icon ${s.cor === 'orange' ? 'orange' : ''}">${icone(s.opcaoFormulario)}</div>
            <h2>Para quem é indicado</h2>
            <ul class="lista-check">
${s.idealPara.map((i) => `              <li>${i}</li>`).join('\n')}
            </ul>
          </div>

          <div class="detalhe-card detalhe-card--escuro" data-reveal="right">
            <h2>Bom saber antes de contratar</h2>
            <ol class="lista-dicas">
${s.bomSaber.map((d) => `              <li>${d}</li>`).join('\n')}
            </ol>
          </div>
        </div>
      </div>
    </section>

    <section id="como-funciona">
      <div class="container">
        <div class="products-header" data-reveal-group>
          <span class="section-label">Como funciona</span>
          <h2 class="section-title">Do pedido à apólice em <span>3&nbsp;passos</span></h2>
          <p class="section-sub">Você não precisa entender de seguro. A gente compara, explica e cuida de tudo.</p>
        </div>
${passos}
      </div>
    </section>

    <section class="seguro-faq">
      <div class="container">
        <div class="products-header" data-reveal-group>
          <span class="section-label">Dúvidas</span>
          <h2 class="section-title">Perguntas sobre o ${s.nome}</h2>
        </div>

        <div class="faq-list faq-list--centro" data-reveal-group>
${s.faq.map((f, i) => `          <details class="faq-item" name="faq"${i === 0 ? ' open' : ''}>
            <summary>${f.p}</summary>
            <div class="faq-a">
              <p>${f.r}</p>
            </div>
          </details>`).join('\n')}
        </div>
      </div>
    </section>

    <section class="seguro-final">
      <div class="container">
        <div class="produtos-cta" data-reveal>
          <div>
            <h2>Pronto para cotar o ${s.nome}?</h2>
            <p>Preencha o formulário em um minuto ou chame no WhatsApp. Sem compromisso.</p>
          </div>
          <div class="produtos-cta-acoes">
            <a href="${cotar}" class="btn">Solicitar cotação</a>
            <a data-wa href="/#cotacao" class="btn secondary">Falar no WhatsApp</a>
          </div>
        </div>

        <nav class="outros-seguros" aria-label="Outros seguros" data-reveal>
          <span>Veja também:</span>
${outros.map((o) => `          <a href="/seguros/${o.slug}/">${o.curto}</a>`).join('\n')}
          <a href="/produtos.html" class="outros-seguros-todos">Todos os seguros</a>
        </nav>
      </div>
    </section>
  </main>

${footer}
</body>
</html>
`;

  const pasta = path.join(RAIZ, 'seguros', s.slug);
  fs.mkdirSync(pasta, { recursive: true });
  fs.writeFileSync(path.join(pasta, 'index.html'), html);
  console.log('gerado  seguros/' + s.slug + '/index.html');
}

// ── sitemap.xml com todas as páginas ──
const urls = [`${URL}/`, `${URL}/produtos.html`, ...seguros.map((s) => `${URL}/seguros/${s.slug}/`), `${URL}/privacidade.html`];
fs.writeFileSync(path.join(RAIZ, 'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map((u) => `  <url>\n    <loc>${u}</loc>\n    <lastmod>${hoje}</lastmod>\n  </url>`).join('\n')}
</urlset>
`);
console.log('sitemap.xml atualizado com', urls.length, 'páginas');
