async page => {
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto('http://localhost:4173');
  if(await page.locator('.catalog-section,.steps-section,.madame-section,.faq-section').count())throw Error('Section still present');
  for(const width of [390,1440]){
    await page.setViewportSize({width,height:1000});
    if(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth))throw Error('Overflow');
    await page.evaluate(async()=>{await Promise.all([...document.images].map(async i=>{i.loading='eager';await i.decode();}));});
    await page.screenshot({path:`output/playwright/${width===390?'mobile':'desktop'}-completa.png`,fullPage:true});
  }
  await page.setViewportSize({width:390,height:844});
  await page.getByRole('button',{name:'Abrir menu',exact:true}).click();
  if(!(await page.locator('#mobile-nav').isVisible()))throw Error('Menu');
  await page.keyboard.press('Escape');
  const broken=await page.evaluate(()=>[...document.querySelectorAll('a[href^="#"]')].filter(a=>!document.getElementById(a.hash.slice(1))).map(a=>a.hash));
  if(errors.length||broken.length)throw Error(JSON.stringify({errors,broken}));
  return {removedSections:4,brokenAnchors:broken,errors,imagesLoaded:true,viewports:[390,1440]};
}
