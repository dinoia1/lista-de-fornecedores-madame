(() => {
  'use strict';
  const $ = (selector) => document.querySelector(selector);
  const video = $('#hero-video');
  const mobileVideo = matchMedia('(max-width:760px)');
  const reducedMotion = matchMedia('(prefers-reduced-motion:reduce)');
  let wantsPlayback = !reducedMotion.matches;
  let inView = true;
  function selectVideo() {
    const source = mobileVideo.matches ? video.dataset.mobile : video.dataset.desktop;
    if(video.getAttribute('src') !== source) {
      video.classList.remove('is-ready');
      video.src = source;
      video.load();
    }
  }
  function syncVideo() {
    if(wantsPlayback && inView && !document.hidden) {
      selectVideo();
      video.muted = true;
      video.play().catch(() => video.classList.remove('is-ready'));
    } else video.pause();
  }
  video.addEventListener('playing',() => video.classList.add('is-ready'));
  video.addEventListener('error',() => video.classList.remove('is-ready'));
  mobileVideo.addEventListener('change',() => { if(video.hasAttribute('src'))selectVideo(); syncVideo(); });
  reducedMotion.addEventListener('change',() => { wantsPlayback = !reducedMotion.matches; syncVideo(); });
  document.addEventListener('visibilitychange',syncVideo);
  new IntersectionObserver(entries => { inView = entries[0].isIntersecting; $('.mobile-sticky').hidden = inView; syncVideo(); },{threshold:0}).observe($('.hero'));
  syncVideo();
  const config = window.MADAME_CONFIG || {};
  let checkout = null;
  if(config.checkoutUrl) { try { const url = new URL(config.checkoutUrl); if(url.protocol === 'https:' && !url.username && !url.password)checkout = url.href; } catch {} }
  if(checkout) {
    $('#intro-checkout').href = checkout;
    document.querySelectorAll('#explore-complete, .mobile-sticky a').forEach(offer => {
      offer.href = checkout;
      offer.firstChild.textContent = (config.purchaseLabel || 'Comprar agora') + ' ';
    });
    $('.mobile-sticky').setAttribute('aria-label','Comprar a coleção');
  }
  const labels = {price:'Valor',installments:'Pagamento',guarantee:'Garantia',accessPeriod:'Acesso',updates:'Atualizações'};
  const terms = $('#offer-terms');
  Object.entries(labels).forEach(([key,label]) => {
    if(typeof config[key] !== 'string' || !config[key].trim())return;
    const p = document.createElement('p'), strong = document.createElement('strong');
    strong.textContent = `${label}: `; p.append(strong,document.createTextNode(config[key])); terms.append(p); terms.hidden = false;
  });
})();
