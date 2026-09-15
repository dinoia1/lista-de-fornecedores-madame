async page => {
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.emulateMedia({reducedMotion:'no-preference'});
  const results=[];
  for(const width of [1440,390,320,768]) {
    await page.setViewportSize({width,height:width>760?950:844});
    await page.goto('http://localhost:4173/?v=hero-limpo');
    await page.waitForFunction(()=>{const v=document.querySelector('video');return !v.paused&&v.currentTime>.4;});
    const result=await page.evaluate(()=>{
      const hero=document.querySelector('.hero'),r=hero.getBoundingClientRect(),v=document.querySelector('video');
      return {width:innerWidth,top:r.top,ratio:r.width/r.height,videoSize:[v.videoWidth,v.videoHeight],header:!!document.querySelector('.site-header'),heroText:hero.innerText.trim(),heroControls:hero.querySelectorAll('button,a,h1,h2,p').length,stickyHidden:document.querySelector('.mobile-sticky').hidden,nextFold:hero.nextElementSibling.id,overflow:document.documentElement.scrollWidth>innerWidth,fade:getComputedStyle(document.querySelector('.hero-shade')).backgroundImage};
    });
    const expected=width<=760?9/16:16/9;
    if(result.top!==0||Math.abs(result.ratio-expected)>.002||result.header||result.heroText||result.heroControls||!result.stickyHidden||result.overflow||result.nextFold!=='o-produto')throw Error(JSON.stringify(result));
    results.push(result);
    if(width===1440||width===390){
      const device=width===1440?'desktop':'mobile';
      await page.screenshot({path:`output/playwright/${device}.png`});
      await page.screenshot({path:`output/playwright/${device}-completa.png`,fullPage:true});
    }
  }
  await page.setViewportSize({width:390,height:844});
  await page.goto('http://localhost:4173/?v=hero-limpo');
  await page.waitForFunction(()=>!document.querySelector('video').paused);
  await page.locator('#video-control').click();
  await page.waitForFunction(()=>document.querySelector('video').paused);
  await page.locator('#video-control').click();
  await page.evaluate(()=>scrollTo(0,0));
  await page.waitForFunction(()=>!document.querySelector('video').paused);
  await page.emulateMedia({reducedMotion:'reduce'});
  await page.waitForFunction(()=>document.querySelector('video').paused);
  await page.emulateMedia({reducedMotion:'no-preference'});
  await page.setViewportSize({width:1440,height:950});
  await page.goto('http://localhost:4173/?v=hero-limpo');
  if(errors.length)throw Error(JSON.stringify(errors));
  return {results,errors,pauseOutsideHero:true,reducedMotion:true};
}
