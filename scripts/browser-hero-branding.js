async page => {
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.emulateMedia({reducedMotion:'no-preference'});
  const results=[];
  for(const width of [1440,1024,768,390,320,430]){
    const height=width===320?568:width<=760?844:950;
    await page.setViewportSize({width,height});
    await page.goto('http://localhost:4173/?v=logo-mobile');
    await page.waitForFunction(()=>{const v=document.querySelector('video');return !v.paused&&v.currentTime>.4;});
    const visible=await page.locator('.hero-branding').isVisible();
    if(!visible)throw Error('Responsive branding visibility');
    const geometry=await page.locator('.hero-branding').evaluate(el=>{const r=el.getBoundingClientRect();return {left:r.left,right:r.right,top:r.top,bottom:r.bottom,overflow:[...el.children].some(child=>child.scrollWidth>child.clientWidth+1)};});
    if(geometry.left<0||geometry.right>(width>760?width/2:width)||geometry.top<0||geometry.overflow)throw Error(JSON.stringify(geometry));
    if(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth))throw Error('Horizontal overflow');
    if(width<=760){
      if(geometry.top<height*.55||geometry.bottom>height)throw Error('Mobile branding must stay in the lower part of the hero');
      if(!(await page.locator('.hero-branding-subtitle').innerText()).includes('900 itens'))throw Error('Missing mobile subtitle');
      if(Math.abs(await page.locator('.hero').evaluate(el=>el.getBoundingClientRect().height)-height)>1)throw Error('Mobile hero must fill the first fold');
      if(!(await page.locator('.mobile-sticky').isHidden()))throw Error('Mobile overlay');
    }
    results.push({width,brandingVisible:visible,geometry});
    if(width===1440||width===390){const device=width===1440?'desktop':'mobile';await page.screenshot({path:`output/playwright/${device}.png`});await page.screenshot({path:`output/playwright/${device}-completa.png`,fullPage:true});}
  }
  if(errors.length)throw Error(JSON.stringify(errors));
  await page.setViewportSize({width:390,height:844});await page.goto('http://localhost:4173/?v=logo-mobile');
  return {results,errors};
}
