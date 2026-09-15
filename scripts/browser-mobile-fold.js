async page => {
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.emulateMedia({reducedMotion:'no-preference'});
  const results=[];
  for(const [width,height] of [[390,844],[360,800],[430,932],[320,568]]){
    await page.setViewportSize({width,height});
    await page.goto('http://localhost:4173/?v=mobile-video-only');
    await page.waitForFunction(()=>{const v=document.querySelector('video');return !v.paused&&v.currentTime>.4;});
    const result=await page.evaluate(()=>{
      const hero=document.querySelector('.hero').getBoundingClientRect(),next=document.querySelector('#o-produto').getBoundingClientRect();
      return {width:innerWidth,height:innerHeight,heroTop:hero.top,heroBottom:hero.bottom,nextFoldTop:next.top,header:!!document.querySelector('.site-header'),heroText:document.querySelector('.hero').innerText.trim(),stickyHidden:document.querySelector('.mobile-sticky').hidden,overflow:document.documentElement.scrollWidth>innerWidth,source:document.querySelector('video').getAttribute('src')};
    });
    if(result.heroTop!==0||Math.abs(result.heroBottom-height)>1||result.nextFoldTop<height||result.header||result.heroText||!result.stickyHidden||result.overflow||!result.source.endsWith('hero-mobile.mp4'))throw Error(JSON.stringify(result));
    results.push(result);
    if(width===390){await page.screenshot({path:'output/playwright/mobile.png'});await page.screenshot({path:'output/playwright/mobile-completa.png',fullPage:true});}
  }
  if(errors.length)throw Error(JSON.stringify(errors));
  await page.setViewportSize({width:390,height:844});
  await page.goto('http://localhost:4173/?v=mobile-video-only');
  return {results,errors};
}
