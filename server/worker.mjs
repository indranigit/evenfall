import {Worker,NativeConnection} from '@temporalio/worker';
import {fileURLToPath} from 'node:url';
import {story} from './services.mjs';
import {makeStory} from '../app/core.js';
if(!process.env.GEMMA_BASE_URL)throw Error('Configure GEMMA_BASE_URL before starting the worker.');
const connection=await NativeConnection.connect({address:process.env.TEMPORAL_ADDRESS||'localhost:7233',...(process.env.TEMPORAL_API_KEY?{tls:true,apiKey:process.env.TEMPORAL_API_KEY}:{})});
const worker=await Worker.create({connection,namespace:process.env.TEMPORAL_NAMESPACE||'default',taskQueue:'evenfall',workflowsPath:fileURLToPath(new URL('./workflows.js',import.meta.url)),maxConcurrentActivityTaskExecutions:1,activities:{prepareEvening:async({preferences,evening})=>{const result=await story(preferences);return {...makeStory(result.text,preferences,'Gemma · Temporal + Mastra'),evening};}}});
process.on('SIGTERM',()=>worker.shutdown());process.on('SIGINT',()=>worker.shutdown());
await worker.run();
