export class EveningAudio {
  constructor(report) { this.report=report; this.context=null; this.interval=null; this.speechRun=0; }
  voices() { return (globalThis.speechSynthesis?.getVoices() || []).filter(v=>v.localService && /^en[-_]/i.test(v.lang) && !/Bells|Boing|Bubbles|Trinoids|Whisper|Zarvox|Bad News|Good News|Cellos|Organ|Junior|Jester|Superstar|Wobble/i.test(v.name)).sort((a,b)=>({Samantha:0,Daniel:1,Karen:2}[a.name]??10)-({Samantha:0,Daniel:1,Karen:2}[b.name]??10)).slice(0,3); }
  speak(text, index=0) {
    if (!globalThis.speechSynthesis) throw Error('This browser has no device narration.');
    const voices=this.voices(); if(!voices.length) throw Error('Install an English device voice, or use connected narration.');
    this.stopSpeech(); const run=this.speechRun;
    const chunks=text.match(/[^.!?]+[.!?]+|[^.!?]+$/g) || [text]; let n=0;
    const next=()=>{ if(run!==this.speechRun)return; if(n>=chunks.length){this.report('Narration finished.');return;}
      const utterance=new SpeechSynthesisUtterance(chunks[n++]); this.utterance=utterance;
      utterance.voice=voices[index] || voices[0];utterance.rate=.82;utterance.pitch=.94;
      const started=performance.now();utterance.onend=()=>{if(run!==this.speechRun)return;if(performance.now()-started<180 && utterance.text.length>30){this.report('Your device ended narration immediately. Try another installed voice.');return;}next();};
      utterance.onerror=()=>{if(run===this.speechRun)this.report('Device narration could not play. Try another voice.');};
      speechSynthesis.speak(utterance);
    }; next(); this.report('Reading aloud.');
  }
  pause(){if(!globalThis.speechSynthesis)return;if(speechSynthesis.paused)speechSynthesis.resume();else speechSynthesis.pause();}
  stopSpeech(){this.speechRun++;globalThis.speechSynthesis?.cancel();}
  async play(kind,volume,minutes,onTick){
    await this.stopSound();const C=globalThis.AudioContext || globalThis.webkitAudioContext;if(!C)throw Error('Audio is unavailable in this browser.');
    const ctx=new C();this.context=ctx;await ctx.resume();const length=ctx.sampleRate*8;const buffer=ctx.createBuffer(1,length,ctx.sampleRate);const data=buffer.getChannelData(0);let brown=0;
    for(let i=0;i<length;i++){const white=Math.random()*2-1;brown=(brown+.02*white)/1.02;data[i]=kind==='rain'?white*.3:brown*3.5;}
    const source=ctx.createBufferSource();source.buffer=buffer;source.loop=true;const filter=ctx.createBiquadFilter();filter.type=kind==='rain'?'highpass':'lowpass';filter.frequency.value=kind==='rain'?650:kind==='ocean'?650:220;
    this.gain=ctx.createGain();this.gain.gain.value=Number(volume);source.connect(filter).connect(this.gain).connect(ctx.destination);source.start();
    if(kind==='ocean'){const lfo=ctx.createOscillator();const depth=ctx.createGain();lfo.frequency.value=.07;depth.gain.value=140;lfo.connect(depth).connect(filter.frequency);lfo.start();}
    const end=Date.now()+Number(minutes)*60000;
    this.interval=setInterval(()=>{const remaining=Math.max(0,end-Date.now());onTick(Math.ceil(remaining/1000));if(remaining<20000)this.gain.gain.setTargetAtTime(Number(volume)*remaining/20000,ctx.currentTime,.5);if(!remaining){this.stop();onTick(0);}},500);
  }
  volume(value){if(this.context && this.gain)this.gain.gain.setTargetAtTime(Number(value),this.context.currentTime,.1);}
  async stopSound(){clearInterval(this.interval);this.interval=null;const ctx=this.context;this.context=null;if(ctx && ctx.state!=='closed')await ctx.close();}
  stop(){this.stopSpeech();return this.stopSound();}
}
