async page => {
  await page.setViewportSize({width:1440,height:1000});
  await page.goto('http://localhost:4173');
  await page.evaluate(async()=>{await Promise.all([...document.images].map(async i=>{i.loading='eager';await i.decode();}));});
  await page.screenshot({path:'output/playwright/desktop.png'});
  await page.screenshot({path:'output/playwright/desktop-completa.png',fullPage:true});
  await page.setViewportSize({width:390,height:844});
  await page.screenshot({path:'output/playwright/mobile.png'});
  await page.screenshot({path:'output/playwright/mobile-completa.png',fullPage:true});
  const checks=[];
  for(const url of ['https://example.com/checkout','javascript:alert(1)','http://example.com/checkout']){
    await page.route('**/config.js',route=>route.fulfill({contentType:'text/javascript',body:`window.MADAME_CONFIG = ${JSON.stringify({checkoutUrl:url,price:'Valor de teste'})}`}));
    await page.reload();
    const href=await page.locator('#explore-complete').getAttribute('href');
    const pass=href===(url.startsWith('https:')?url:'#categorias');
    if(!pass)throw Error('Checkout config validation failed');
    checks.push({case:url,pass});
    await page.unroute('**/config.js');
  }
  await page.reload();
  if(!(await page.locator('#offer-terms').isHidden()))throw Error('Test config not restored');
  checks.push({case:'Real configuration restored; no purchase performed',pass:true});
  return checks;
}
