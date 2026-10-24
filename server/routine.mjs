import {spawn} from 'node:child_process';
import {existsSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {ServiceError} from './services.mjs';
let active=false;
export function routineAvailable(){return process.env.ENABLE_TABPFN==='true'&&Boolean(process.env.TABPFN_MODEL_PATH)&&existsSync(process.env.TABPFN_MODEL_PATH);}
export async function predictRoutine(payload){
  if(!routineAvailable())throw new ServiceError('Local TabPFN is not configured.',503);
  if(active)throw new ServiceError('A preference prediction is already running.',429);
  if(!payload||!Array.isArray(payload.rows)||payload.rows.length>200)throw new ServiceError('Provide at most 200 rated evenings.',400);
  // Pass preference metadata only; never send story prose to the predictor.
  const rows=payload.rows.map(row=>({id:row.id,setting:row.setting,mood:row.mood,minutes:row.minutes,rating:row.rating,createdAt:row.createdAt}));
  active=true;
  try{return await new Promise((resolve,reject)=>{
    const child=spawn(process.env.PYTHON_BIN||'python3',[fileURLToPath(new URL('./routine.py',import.meta.url))],{stdio:['pipe','pipe','pipe'],env:{...process.env,HF_HUB_OFFLINE:'1',TABPFN_NO_BROWSER:'1',OMP_NUM_THREADS:'2'}});
    let output='';let finished=false;
    const done=(error,result)=>{if(finished)return;finished=true;clearTimeout(timer);error?reject(error):resolve(result);};
    const timer=setTimeout(()=>{child.kill('SIGKILL');done(new ServiceError('Prediction took too long.',504));},110000);
    child.stdout.on('data',chunk=>{output+=chunk;if(output.length>20000){child.kill('SIGKILL');done(new ServiceError('Prediction output was too large.',502));}});
    child.stderr.on('data',()=>{});
    child.stdin.on('error',()=>{});
    child.on('error',()=>done(new ServiceError('Python predictor is unavailable.',503)));
    child.on('close',code=>{try{const result=JSON.parse(output);if(code!==0||result.error)return done(new ServiceError(result.error||'Prediction failed.',code===2?400:503));done(null,result);}catch{done(new ServiceError('Prediction returned an invalid response.',502));}});
    child.stdin.end(JSON.stringify({rows,mood:payload.mood}));
  });}finally{active=false;}
}
