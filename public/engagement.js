(() => {
  'use strict';
  const track=document.querySelector('#category-track');
  const previous=document.querySelector('[data-category-prev]');
  const next=document.querySelector('[data-category-next]');
  const reduced=matchMedia('(prefers-reduced-motion:reduce)');
  function move(direction) { track.scrollBy({left:direction*track.clientWidth*.8,behavior:reduced.matches?'instant':'smooth'}); }
  function updateNavigation() { previous.disabled=track.scrollLeft<=2; next.disabled=track.scrollLeft+track.clientWidth>=track.scrollWidth-2; }
  previous.addEventListener('click',()=>move(-1));
  next.addEventListener('click',()=>move(1));
  track.addEventListener('scroll',updateNavigation,{passive:true});
  window.addEventListener('resize',updateNavigation);
  track.addEventListener('keydown',event=>{
    if(event.target===track && ['ArrowLeft','ArrowRight'].includes(event.key)) { event.preventDefault(); move(event.key==='ArrowLeft'?-1:1); }
  });
  updateNavigation();

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
  document.querySelectorAll('#explore-complete,.mobile-sticky a').forEach(link=>link.addEventListener('click',()=>{clearTimeout(automatic);remember();}));
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
