(() => {
  'use strict';
  const key='madame-attribution-v1', now=Date.now(), params=new URLSearchParams(location.search);
  let saved;try {saved=JSON.parse(sessionStorage.getItem(key));}catch{}
  const changedCampaign=saved && ['source','medium','campaign','content'].some(field=>params.has('utm_'+field) && params.get('utm_'+field)!==saved.value?.[field]);
  if(!saved?.value?.sessionId || now-saved.at>1800000 || changedCampaign) {
    let referrer='';try {const url=new URL(document.referrer);if(url.host!==location.host)referrer=url.origin;}catch{}
    saved={at:now,value:{sessionId:crypto.randomUUID(),source:params.get('utm_source')||'',medium:params.get('utm_medium')||'',campaign:params.get('utm_campaign')||'',content:params.get('utm_content')||'',referrer,device:matchMedia('(max-width:760px)').matches?'mobile':'desktop'}};
  }
  saved.at=now;try {sessionStorage.setItem(key,JSON.stringify(saved));}catch{}
  window.MADAME_ATTRIBUTION=saved.value;
  function track(type) {
    fetch('/api/track',{method:'POST',headers:{'Content-Type':'application/json'},keepalive:true,body:JSON.stringify({id:crypto.randomUUID(),type,attribution:saved.value})}).catch(()=>{});
  }
  track('pageview');
  document.addEventListener('click',event=>{
    const link=event.target.closest('#explore-complete,#intro-checkout,.mobile-sticky a');
    if(link && link.href.startsWith('https://lastlink.com/'))track('checkout');
  });
})();
