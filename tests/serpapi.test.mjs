import test from 'node:test';
import assert from 'node:assert/strict';
import {inspiration} from '../server/services.mjs';
test('SerpApi hides credentials, filters links, caches repeats, and fails safely',async()=>{
  const oldFetch=globalThis.fetch,oldKey=process.env.SERPAPI_KEY,oldCloud=process.env.ENABLE_CLOUD;
  process.env.SERPAPI_KEY='test-only-provider-key';process.env.ENABLE_CLOUD='true';let requests=0;
  try{
    globalThis.fetch=async address=>{requests++;const url=new URL(address);assert.equal(url.origin,'https://serpapi.com');assert.equal(url.searchParams.get('api_key'),'test-only-provider-key');assert.equal(url.searchParams.get('q'),'Kyoto garden nature history');return Response.json({organic_results:[{title:'Unsafe',link:'javascript:alert(1)'},{title:'Credential link',link:'https://user:pass@example.com'},{title:'Garden',link:'https://example.com/garden',snippet:'Quiet moss and maple trees.'}]});};
    const first=await inspiration('  Kyoto  ');assert.equal(first.sources.length,1);assert.equal(first.sources[0].snippet,'Quiet moss and maple trees.');assert.equal(first.cached,false);assert.ok(!JSON.stringify(first).includes(process.env.SERPAPI_KEY));
    const repeat=await inspiration('kyoto');assert.equal(repeat.cached,true);assert.equal(requests,1);
    await assert.rejects(inspiration(' '),error=>error.status===400);assert.equal(requests,1);
    globalThis.fetch=async()=>new Response('',{status:429});await assert.rejects(inspiration('Coastal village'),error=>error.status===429&&!error.message.includes(process.env.SERPAPI_KEY));
    globalThis.fetch=async()=>Response.json({error:'private provider diagnostic'});await assert.rejects(inspiration('Forest village'),error=>error.status===502&&!error.message.includes('private provider'));
    globalThis.fetch=async()=>Response.json({});assert.deepEqual((await inspiration('Empty place')).sources,[]);
    globalThis.fetch=async()=>{throw Error('secret upstream URL');};await assert.rejects(inspiration('Remote valley'),error=>error.status===502&&!error.message.includes('secret'));
  }finally{globalThis.fetch=oldFetch;if(oldKey===undefined)delete process.env.SERPAPI_KEY;else process.env.SERPAPI_KEY=oldKey;if(oldCloud===undefined)delete process.env.ENABLE_CLOUD;else process.env.ENABLE_CLOUD=oldCloud;}
});
