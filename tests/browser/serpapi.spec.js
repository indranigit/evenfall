import {test,expect} from '@playwright/test';
test('SerpApi consent, summaries, cached repeat and offline reload',async({page,context},info)=>{
  let searches=0;const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.route('https://evenfall-api.example/api/**',async route=>{
    const request=route.request(),headers={'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'Authorization,Content-Type','Access-Control-Allow-Methods':'GET,POST,OPTIONS'};
    if(request.method()==='OPTIONS')return route.fulfill({status:204,headers});
    if(request.url().endsWith('/capabilities'))return route.fulfill({json:{serpapi:true},headers});
    searches++;expect(request.postDataJSON()).toEqual({place:'Kyoto'});
    return route.fulfill({headers,json:{place:'Kyoto',fetchedAt:new Date().toISOString(),sources:[{title:'Quiet garden',url:'https://example.com/garden',snippet:'Moss and maple trees beside a stream.'},{title:'Unsafe link',url:'javascript:alert(1)'}]}});
  });
  await page.goto('/');await page.getByText('Optional connected features',{exact:true}).click();
  await page.locator('#api').fill('https://evenfall-api.example');await page.locator('#token').fill('test-only-demo-access-token-32-characters');await page.locator('#connect').click();
  await expect(page.locator('#capabilities')).toContainText('serpapi');await page.locator('#inspiration').fill('Kyoto');await page.locator('#search').click();
  await expect(page.locator('#status')).toContainText('consent');expect(searches).toBe(0);
  await page.locator('#cloudConsent').check();await page.locator('#search').click();
  await expect(page.locator('#sources')).toContainText('Moss and maple trees');await expect(page.locator('#sources a')).toHaveCount(1);expect(searches).toBe(1);
  await page.locator('#search').click();await expect(page.locator('#status')).toContainText('without spending a search');expect(searches).toBe(1);
  await page.evaluate(()=>navigator.serviceWorker.ready);await expect.poll(()=>page.evaluate(()=>Boolean(navigator.serviceWorker.controller))).toBe(true);
  await context.setOffline(true);await page.reload();await page.getByText('Optional connected features',{exact:true}).click();
  await expect(page.locator('#token')).toHaveValue('');await expect(page.locator('#sources')).toContainText('Moss and maple trees');await page.locator('#search').click();
  await expect(page.locator('#status')).toContainText('available offline');expect(searches).toBe(1);
  await page.locator('#inspiration').fill('Unknown place');await page.locator('#search').click();await expect(page.locator('#status')).toContainText('Search needs internet');
  await page.screenshot({path:info.outputPath('evenfall-serpapi-offline.png'),fullPage:true});expect(errors).toEqual([]);
});
