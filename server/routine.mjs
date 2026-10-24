import {spawn} from 'node:child_process';
import {existsSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {ServiceError} from './services.mjs';
let active=false;
export function routineAvailable(){return process.env.ENABLE_TABPFN==='true'&&Boolean(process.env.TABPFN_MODEL_PATH)&&existsSync(process.env.TABPFN_MODEL_PATH);}
export async function predictRoutine(payload){
  if(!routineAvailable())throw new ServiceError(503,'Local TabPFN is not configured.');
  if(active)throw new ServiceError(429,'A preference prediction is already running.');
  if(!payload||!Array.isArray(payload.rows)||payload.rows.length>200)throw new ServiceError(400,'Provide at most 200 rated evenings.');
  // Pass preference metadata only; never send story prose to the predictor.
  const rows=payload.rows.map(row=>({id:row.id,setting:row.setting,mood:row.mood,minutes:row.minutes,rating:row.rating,createdAt:row.createdAt}));
  active=true;
  try{return await new Promise((resolve,reject)=>{
    const child=spawn(process.env.PYTHON_BIN||'python3',[fileURLToPath(new URL('./routine.py',import.meta.url))],{stdio:['pipe','pipe','pipe'],env:{...process.env,HF_HUB_OFFLINE:'1',TABPFN_NO_BROWSER:'1',OMP_NUM_THREADS:'2'}});
    let output='';let finished=false;
    const done=(error,result)=>{if(finished)return;finished=true;clearTimeout(timer);error?reject(error):resolve(result);};
    const timer=setTimeout(()=>{child.kill('SIGKILL');done(new ServiceError(504,'Prediction took too long.'));},110000);
    child.stdout.on('data',chunk=>{output+=chunk;if(output.length>20000){child.kill('SIGKILL');done(new ServiceError(502,'Prediction output was too large.'));}});
    child.stderr.on('data',()=>{});
    child.stdin.on('error',()=>{});
    child.on('error',()=>done(new ServiceError(503,'Python predictor is unavailable.')));
    child.on('close',code=>{try{const result=JSON.parse(output);if(code!==0||result.error)return done(new ServiceError(code===2?400:503,result.error||'Prediction failed.'));done(null,result);}catch{done(new ServiceError(502,'Prediction returned an invalid response.'));}});
    child.stdin.end(JSON.stringify({rows,mood:payload.mood}));
  });}finally{active=false;}
}
