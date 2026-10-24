import { MLCEngine } from '@mlc-ai/web-llm';
import { MODEL, storyPrompt } from './core.js';
let engine, busy = false, cancelled = false;
self.onmessage = async ({data}) => {
  if (data.type === 'cancel') { cancelled = true; engine?.interruptGenerate(); return; }
  if (busy) { self.postMessage({type:'error',id:data.id,error:'Please wait for the current task.'}); return; }
  busy = true; cancelled = false;
  try {
    if (data.type === 'load') {
      engine = new MLCEngine({initProgressCallback:p=>self.postMessage({type:'progress',id:data.id,progress:p.progress,text:p.text})});
      await engine.reload(MODEL);
      self.postMessage({type:'ready',id:data.id});
    } else if (data.type === 'generate') {
      if (!engine) throw Error('Load Gemma first.');
      const started = performance.now();
      const stream = await engine.chat.completions.create({messages:[{role:'user',content:storyPrompt(data.preferences,data.previous)}],temperature:.65,top_p:.9,repetition_penalty:1.1,max_tokens:Math.min(1600,Number(data.preferences.minutes)*180+160),stream:true,stream_options:{include_usage:true}});
      let text = '', usage, finishReason;
      for await (const chunk of stream) {
        if (cancelled) break;
        text += chunk.choices[0]?.delta?.content || '';
        if (chunk.usage) usage=chunk.usage;
        if (chunk.choices[0]?.finish_reason) finishReason=chunk.choices[0].finish_reason;
        self.postMessage({type:'token',id:data.id,text});
      }
      if (cancelled) self.postMessage({type:'cancelled',id:data.id});
      else if (finishReason === 'length') throw Error('The model reached its limit before finishing. Try a shorter story.');
      else self.postMessage({type:'result',id:data.id,text,usage,elapsedMs:performance.now()-started});
    }
  } catch(error) { self.postMessage({type:'error',id:data.id,error:error.message || 'Model task failed.'}); }
  finally { busy=false; }
};
