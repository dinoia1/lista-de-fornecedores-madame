(() => {
  'use strict';
  const track=document.querySelector('#category-track');
  const previous=document.querySelector('[data-category-prev]');
  const next=document.querySelector('[data-category-next]');
  const reduced=matchMedia('(prefers-reduced-motion:reduce)');
  const toggle=document.querySelector('[data-category-toggle]');
  const originals=[...track.children];
  originals.forEach(item=>{
    const copy=item.cloneNode(true);
    copy.setAttribute('aria-hidden','true');copy.dataset.loopCopy='true';
    copy.querySelectorAll('a').forEach(link=>link.tabIndex=-1);
    track.append(copy);
  });
  track.classList.add('is-looping');
  let cycle=0,position=0,last=0,pauseUntil=0,hovered=false,dragging=false,visible=false;
  let paused=reduced.matches;
  function measure() {cycle=track.children[originals.length].getBoundingClientRect().left-track.firstElementChild.getBoundingClientRect().left;position=track.scrollLeft;}
  function updateToggle() {toggle.textContent=paused?'▷':'Ⅱ';toggle.setAttribute('aria-label',paused?'Retomar carrossel':'Pausar carrossel');toggle.setAttribute('aria-pressed',String(paused));}
  function move(direction) {
    pauseUntil=performance.now()+3000;
    let target=track.scrollLeft+direction*track.clientWidth*.65;
    if(cycle>0)target=((target%cycle)+cycle)%cycle;
    track.scrollLeft=target;position=track.scrollLeft;
  }
  previous.addEventListener('click',()=>move(-1));
  next.addEventListener('click',()=>move(1));
  toggle.addEventListener('click',()=>{paused=!paused;updateToggle();});
  reduced.addEventListener('change',()=>{paused=reduced.matches;updateToggle();});
  track.addEventListener('mouseenter',()=>hovered=true);
  track.addEventListener('mouseleave',()=>hovered=false);
  track.addEventListener('pointerdown',()=>dragging=true);
  const release=()=>{if(dragging){dragging=false;pauseUntil=performance.now()+3000;}};
  window.addEventListener('pointerup',release);window.addEventListener('pointercancel',release);
  track.addEventListener('wheel',()=>pauseUntil=performance.now()+3000,{passive:true});
  window.addEventListener('resize',measure);
  track.addEventListener('keydown',event=>{
    if(event.target===track && ['ArrowLeft','ArrowRight'].includes(event.key)) { event.preventDefault(); move(event.key==='ArrowLeft'?-1:1); }
  });
  new IntersectionObserver(entries=>visible=entries[0].isIntersecting).observe(track);
  function animate(now) {
    const elapsed=last?Math.min(now-last,50):0;last=now;
    const focused=track.contains(document.activeElement);
    if(visible&&!document.hidden&&!paused&&!hovered&&!dragging&&!focused&&now>=pauseUntil&&!document.querySelector('#lead-dialog').open&&cycle>0){
      position=(position+elapsed*.036)%cycle;track.scrollLeft=position;
    } else position=track.scrollLeft;
    requestAnimationFrame(animate);
  }
  measure();updateToggle();requestAnimationFrame(animate);

  const referenceValues=[...document.querySelectorAll('.reference-value:not([hidden])')];
  const strikeObserver=new IntersectionObserver(entries=>{
    entries.forEach(entry=>{
      if(entry.isIntersecting){entry.target.classList.add('is-struck');strikeObserver.unobserve(entry.target);}
    });
  },{threshold:.8});
  referenceValues.forEach(value=>{
    value.classList.add('strike-ready');
    if(reduced.matches)value.classList.add('is-struck');else strikeObserver.observe(value);
  });
  reduced.addEventListener('change',()=>{
    if(reduced.matches){referenceValues.forEach(value=>value.classList.add('is-struck'));strikeObserver.disconnect();}
  });

  const dialog=document.querySelector('#lead-dialog');
  const form=document.querySelector('#lead-form');
  const status=document.querySelector('#lead-status');
  const submit=form.querySelector('[type=submit]');
  const done=dialog.querySelector('.lead-done');
  const phone=form.elements.phone;
  const steps=[...form.querySelectorAll('[data-lead-step]')];
  const progress=[...dialog.querySelectorAll('.lead-progress li')];
  const back=form.querySelector('.lead-back');
  const incentive=window.MADAME_CONFIG?.leadIncentive;
  const hasIncentive=typeof incentive?.headline==='string' && incentive.headline.trim() && typeof incentive.description==='string' && incentive.description.trim();
  if(hasIncentive){dialog.querySelector('#lead-title').textContent=incentive.headline;dialog.querySelector('#lead-description').textContent='Conte um pouco sobre seu negócio em três etapas rápidas.';}
  if(hasIncentive && typeof incentive.referencePrice==='string' && typeof incentive.price==='string'){
    dialog.querySelector('#lead-offer-reference').textContent=incentive.referencePrice;
    dialog.querySelector('#lead-offer-price').textContent=incentive.price;
  }
  let step=0;
  function showStep(index,focus=true){
    step=index;steps.forEach((field,i)=>{field.hidden=i!==step;field.disabled=i!==step;});
    progress.forEach((item,i)=>{if(i===step)item.setAttribute('aria-current','step');else item.removeAttribute('aria-current');item.classList.toggle('is-complete',i<step);});
    dialog.querySelector('#lead-step-counter').textContent=`Etapa ${step+1} de 3`;
    submit.querySelector('span').textContent=step<2?'Continuar':'Concluir meu cadastro';
    back.hidden=step===0;status.textContent='';status.classList.remove('is-error');
    if(focus){dialog.scrollTop=0;const legend=steps[step].querySelector('legend');legend.tabIndex=-1;legend.focus();}
  }
  showStep(0,false);
  back.addEventListener('click',()=>{if(!submit.disabled)showStep(step-1);});
  let automatic;
  const remember=()=>{try{sessionStorage.setItem('madame-lead-seen','1');}catch{}};
  function open() {
    clearTimeout(automatic);
    if(dialog.open)return;
    remember();dialog.showModal();document.body.classList.add('dialog-open');
    if(!form.hidden)showStep(step);else done.focus();
  }
  dialog.addEventListener('close',()=>document.body.classList.remove('dialog-open'));
  dialog.querySelector('.lead-close').addEventListener('click',()=>dialog.close());
  done.addEventListener('click',()=>dialog.close());
  document.querySelectorAll('[data-lead-open]').forEach(button=>button.addEventListener('click',open));
  document.querySelectorAll('#explore-complete,#intro-checkout,.mobile-sticky a').forEach(link=>link.addEventListener('click',()=>{clearTimeout(automatic);remember();}));
  let seen=false;try{seen=sessionStorage.getItem('madame-lead-seen')==='1';}catch{}
  if(!seen)automatic=setTimeout(()=>{if(!document.hidden)open();},12000);
  if(location.hash==='#cadastro')open();
  window.addEventListener('hashchange',()=>{if(location.hash==='#cadastro')open();});
  phone.addEventListener('input',()=>phone.setCustomValidity(''));
  form.addEventListener('submit',async event=>{
    event.preventDefault();
    if(submit.disabled)return;
    if(step<2){if(!form.reportValidity())return;showStep(step+1);return;}
    let digits=phone.value.replace(/\D/g,'');
    if(digits.startsWith('55') && [12,13].includes(digits.length))digits=digits.slice(2);
    phone.setCustomValidity(/^\d{10,11}$/.test(digits)&&!digits.startsWith('0')?'':'Informe o telefone com DDD, com 10 ou 11 dígitos.');
    if(!form.reportValidity())return;
    const revenueRange=form.querySelector('[name=revenueRange]:checked')?.value;
    const personType=form.querySelector('[name=personType]:checked')?.value;
    if(!revenueRange){showStep(0);return;}if(!personType){showStep(1);return;}
    status.textContent='Enviando seu cadastro…';status.classList.remove('is-error');
    submit.disabled=true;back.disabled=true;
    const controller=new AbortController();
    const timeout=setTimeout(()=>controller.abort(),15000);
    try {
      const response=await fetch('/api/leads',{method:'POST',headers:{'Content-Type':'application/json'},signal:controller.signal,body:JSON.stringify({name:form.elements.name.value,phone:phone.value,email:form.elements.email.value,consent:form.elements.consent.checked,website:form.elements.website.value,attribution:window.MADAME_ATTRIBUTION,qualification:{revenueRange,personType}})});
      const result=await response.json();
      if(!response.ok||result.ok!==true)throw Error(result.message || 'Não foi possível enviar. Tente novamente.');
      form.hidden=true;done.hidden=false;
      dialog.querySelector('.lead-progress').hidden=true;dialog.querySelector('#lead-step-counter').hidden=true;
      status.textContent='Pronto! Seu cadastro foi recebido. Obrigada pelo interesse na coleção.';
      if(hasIncentive){
        dialog.querySelector('.lead-offer').hidden=!(typeof incentive.referencePrice==='string' && typeof incentive.price==='string');
        dialog.querySelector('#lead-title').textContent='Seu cadastro está pronto!';
        dialog.querySelector('#lead-description').textContent='Agora você pode seguir para o checkout da coleção.';
        dialog.querySelector('.lead-incentive').hidden=false;
        dialog.querySelector('#lead-incentive-title').textContent='Continue seu garimpo';
        dialog.querySelector('#lead-incentive-description').textContent=incentive.description;
        if(typeof incentive.code==='string' && incentive.code.trim()){const code=dialog.querySelector('#lead-incentive-code');code.textContent='Cupom: '+incentive.code;code.hidden=false;}
        try{const url=new URL(incentive.checkoutUrl);if(url.protocol==='https:' && !url.username && !url.password){const link=dialog.querySelector('#lead-incentive-link');link.href=url.href;link.hidden=false;}}catch{}
      }
      done.focus();
    } catch(error) {
      status.classList.add('is-error');
      status.textContent=error.name==='AbortError'?'A confirmação demorou mais que o esperado. Tente novamente em instantes.':error instanceof SyntaxError||error instanceof TypeError?'Não foi possível conectar. Tente novamente em instantes.':error.message;
    } finally {clearTimeout(timeout);submit.disabled=false;back.disabled=false;}
  });
})();
