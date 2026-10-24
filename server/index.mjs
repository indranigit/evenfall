import {createServer} from 'node:http';
import {timingSafeEqual,createHash,randomUUID} from 'node:crypto';
import {pathToFileURL} from 'node:url';
import {createRemoteJWKSet,jwtVerify} from 'jose';
import * as services from './services.mjs';
const env=process.env;
const issuer=env.AUTH0_ISSUER;
const jwks=issuer?createRemoteJWKSet(new URL('.well-known/jwks.json',issuer.endsWith('/')?issuer:issuer+'/')):null;
async function authorize(req){const token=(req.headers.authorization||'').replace(/^Bearer /,'');if(!token)throw new services.ServiceError('Authentication required.',401);if(jwks){const {payload}=await jwtVerify(token,jwks,{issuer,audience:env.AUTH0_AUDIENCE,algorithms:['RS256']});if(!payload.sub||!String(payload.scope||'').split(' ').includes('evenfall:use'))throw new services.ServiceError('The evenfall:use scope is required.',403);return payload.sub;}const expected=env.EVENFALL_ACCESS_TOKEN||'';if(expected.length<32)throw new services.ServiceError('Backend authentication is not configured.');const a=Buffer.from(token),b=Buffer.from(expected);if(a.length!==b.length||!timingSafeEqual(a,b))throw new services.ServiceError('Authentication required.',401);return 'personal-owner';}
async function body(req){let raw='';for await(const chunk of req){raw+=chunk;if(Buffer.byteLength(raw)>1000000)throw new services.ServiceError('Request too large.',413);}try{return JSON.parse(raw||'{}');}catch{throw new services.ServiceError('Invalid JSON.',400);}}
let temporal;
async function temporalClient(){if(!services.capabilities().temporal)throw new services.ServiceError('Temporal is not configured.');if(!temporal){const {Client,Connection}=await import('@temporalio/client');const connection=await Connection.connect({address:env.TEMPORAL_ADDRESS,...(env.TEMPORAL_API_KEY?{tls:true,apiKey:env.TEMPORAL_API_KEY}:{})});temporal=new Client({connection,namespace:env.TEMPORAL_NAMESPACE||'default'});}return temporal;}
function ownerPrefix(user){return 'evenfall-'+createHash('sha256').update(user).digest('hex').slice(0,24)+'-';}
const usage=new Map();
function limit(user,path){const key=user+':'+path+':'+new Date().toISOString().slice(0,10);const cap=path==='/api/narrate'?10:path==='/api/packs'?3:60;const count=usage.get(key)||0;if(count>=cap)throw new services.ServiceError('Daily demo allowance reached for this action.',429);if(usage.size>2000)throw new services.ServiceError('The demo is busy. Try again later.',429);usage.set(key,count+1);}
export function createApp(){return createServer(async(req,res)=>{
  const origin=req.headers.origin;
  const allowed=(env.ALLOWED_ORIGINS||'http://127.0.0.1:4173,http://localhost:4173').split(',');
  res.setHeader('Cache-Control','no-store');res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('Vary','Origin');
  const send=(code,value)=>{res.writeHead(code,{'Content-Type':'application/json'});res.end(JSON.stringify(value));};
  try{
    if(origin&&!allowed.includes(origin))throw new services.ServiceError('This origin is not allowed.',403);
    if(origin){res.setHeader('Access-Control-Allow-Origin',origin);res.setHeader('Access-Control-Allow-Headers','Authorization,Content-Type');res.setHeader('Access-Control-Allow-Methods','GET,POST,OPTIONS');}
    if(req.method==='OPTIONS'){res.writeHead(204);res.end();return;}
    const path=new URL(req.url,'http://localhost').pathname;
    if(path==='/health'&&req.method==='GET'){send(200,{ok:true});return;}
    let user;try{user=await authorize(req);}catch(error){if(error instanceof services.ServiceError)throw error;throw new services.ServiceError('Invalid or expired access token.',401);}
    if(req.method==='GET'&&path==='/api/capabilities'){send(200,services.capabilities());return;}
    if(req.method==='GET'&&path==='/api/voices'){send(200,{voices:await services.voices()});return;}
    if(req.method==='GET'&&path==='/api/shelf'){send(200,await services.readShelf(user));return;}
    if(req.method==='GET'&&path.startsWith('/api/packs/')){const id=decodeURIComponent(path.slice(11));if(!id.startsWith(ownerPrefix(user)))throw new services.ServiceError('Pack not found.',404);const handle=(await temporalClient()).workflow.getHandle(id);const info=await handle.describe();if(info.status.name==='COMPLETED')send(200,{stories:await handle.result()});else if(['FAILED','CANCELED','TERMINATED','TIMED_OUT'].includes(info.status.name))throw new services.ServiceError('This pack stopped before completion. Start a new pack.',422);else send(200,{status:info.status.name});return;}
    if(req.method!=='POST')throw new services.ServiceError('Not found.',404);
    if(!['/api/story','/api/narrate','/api/inspiration','/api/shelf','/api/packs'].includes(path))throw new services.ServiceError('Not found.',404);
    if(!String(req.headers['content-type']).includes('application/json'))throw new services.ServiceError('Send JSON.',415);
    const input=await body(req);limit(user,path);
    if(path==='/api/story')send(200,await services.story(input.preferences));
    else if(path==='/api/narrate'){const audio=await services.narration(input.text,input.voice);res.writeHead(200,{'Content-Type':'audio/mpeg'});res.end(audio);}
    else if(path==='/api/inspiration')send(200,await services.inspiration(input.place));
    else if(path==='/api/shelf')send(200,await services.saveShelf(user,input.stories));
    else if(path==='/api/packs'){const id=ownerPrefix(user)+randomUUID();await (await temporalClient()).workflow.start('bedtimePack',{taskQueue:'evenfall',workflowId:id,args:[input.preferences],workflowExecutionTimeout:'30 minutes'});send(202,{id});}
  }catch(error){send(error.status||500,{error:error instanceof services.ServiceError?error.message:'The request could not complete. Check service configuration.'});}
});}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){createApp().listen(Number(env.PORT)||8780,env.HOST||'127.0.0.1',()=>console.log('Evenfall backend is ready.'));}
