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
  let automatic;
  const remember=()=>{try{sessionStorage.setItem('madame-lead-seen','1');}catch{}};
  function open() {
    clearTimeout(automatic);
    if(dialog.open)return;
    remember();dialog.showModal();document.body.classList.add('dialog-open');
    if(!form.hidden)form.elements.name.focus();else done.focus();
  }
  dialog.addEventListener('close',()=>document.body.classList.remove('dialog-open'));
  dialog.querySelector('.lead-close').addEventListener('click',()=>dialog.close());
  done.addEventListener('click',()=>dialog.close());
  document.querySelectorAll('[data-lead-open]').forEach(button=>button.addEventListener('click',open));
  document.querySelectorAll('#explore-complete,#intro-checkout,.mobile-sticky a').forEach(link=>link.addEventListener('click',()=>{clearTimeout(automatic);remember();}));
  let seen=false;try{seen=sessionStorage.getItem('madame-lead-seen')==='1';}catch{}
  if(!seen)automatic=setTimeout(()=>{if(!document.hidden)open();},12000);
  phone.addEventListener('input',()=>phone.setCustomValidity(''));
  form.addEventListener('submit',async event=>{
    event.preventDefault();
    if(submit.disabled)return;
    let digits=phone.value.replace(/\D/g,'');
    if(digits.startsWith('55') && [12,13].includes(digits.length))digits=digits.slice(2);
    phone.setCustomValidity(/^\d{10,11}$/.test(digits)&&!digits.startsWith('0')?'':'Informe o telefone com DDD, com 10 ou 11 dígitos.');
    if(!form.reportValidity())return;
    status.textContent='Enviando seu cadastro…';status.classList.remove('is-error');
    submit.disabled=true;
    const controller=new AbortController();
    const timeout=setTimeout(()=>controller.abort(),15000);
    try {
      const response=await fetch('/api/leads',{method:'POST',headers:{'Content-Type':'application/json'},signal:controller.signal,body:JSON.stringify({name:form.elements.name.value,phone:phone.value,email:form.elements.email.value,consent:form.elements.consent.checked,website:form.elements.website.value})});
      const result=await response.json();
      if(!response.ok||result.ok!==true)throw Error(result.message || 'Não foi possível enviar. Tente novamente.');
      form.hidden=true;done.hidden=false;
      status.textContent='Pronto! Seu cadastro foi recebido. Obrigada pelo interesse na coleção.';
      done.focus();
    } catch(error) {
      status.classList.add('is-error');
      status.textContent=error.name==='AbortError'?'A confirmação demorou mais que o esperado. Tente novamente em instantes.':error instanceof SyntaxError||error instanceof TypeError?'Não foi possível conectar. Tente novamente em instantes.':error.message;
    } finally {clearTimeout(timeout);submit.disabled=false;}
  });
})();
