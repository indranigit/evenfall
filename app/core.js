export const MODEL = 'gemma3-1b-it-q4f16_1-MLC';
export const SETTINGS = ['woodland', 'seaside', 'garden'];
export const MOODS = ['settled', 'restless', 'tired'];
export function preferences(input = {}) {
  return {
    setting: SETTINGS.includes(input.setting) ? input.setting : 'woodland',
    mood: MOODS.includes(input.mood) ? input.mood : 'settled',
    minutes: [2, 5, 8].includes(Number(input.minutes)) ? Number(input.minutes) : 2,
    character: String(input.character || '').replace(/[<>]/g, '').trim().slice(0, 40)
  };
}
export function storyPrompt(input, previous = '') {
  const p = preferences(input);
  const places = {woodland:'a quiet woodland with a lantern-lit cottage',seaside:'a quiet seaside cottage',garden:'a peaceful moonlit garden'};
  const character = p.character ? ' The main character is named '+p.character+'.' : ' The main character is a kind gardener named Mira.';
  const continuation = previous ? '\nContinue this earlier story with one new gentle event: '+String(previous).slice(-1800) : '';
  return 'Write a complete, calming bedtime story in English, about '+(p.minutes*95)+' words, set in '+places[p.setting]+'.'+character+
    ' The reader feels '+p.mood+'. Describe simple comforting actions, soft sensory details, and a peaceful ending. '+
    'Begin with a short title on its own line, then a blank line and the story in paragraphs. Output only the title and story. No lists, code, or commentary.'+continuation;
}
export function validateStory(text) {
  const value = String(text || '').replace(/<think>[\s\S]*?<\/think>/g, '').trim();
  if (/^(```|[\[{])/.test(value)) throw new Error('The model did not produce a readable story. Please try again.');
  if (value.length < 120 || value.length > 18000) throw new Error('The story was incomplete. Please try again.');
  const words = value.split(/\s+/);
  if (words.length > 50 && new Set(words.map(x => x.toLowerCase())).size / words.length < .13)
    throw new Error('The model repeated itself. Please try a shorter story.');
  return value;
}
export const sample = 'The Lantern Keeper\n\nAt the edge of a quiet garden stood a little cottage, its windows the colour of warm honey. Each evening, Mira carried a lantern down the path, past the lavender and the sleeping apple trees.\n\nShe was never in a hurry. The stones held the last warmth of the afternoon. A robin tucked its head beneath a wing, and the pond collected the first pale stars. Mira paused beside the gate to listen to the leaves settling around her.\n\nTonight, she left the lantern on the garden wall. Its small circle of light reached the old wooden bench, where a soft blanket waited. She sat for a while, feeling the evening grow comfortably still.\n\nThere was nothing left to gather and nowhere else she needed to be. Beyond the gate, the path rested beneath the moon. Inside the cottage, the kettle was warm. Mira took one last look at the peaceful garden, then went home.';
export function makeStory(text, input, source = MODEL) {
  const body = validateStory(text);
  return {id:crypto.randomUUID(), text:body, title:body.split('\n')[0].slice(0,100),
    ...preferences(input), source, createdAt:new Date().toISOString(), rating:null};
}
export function parseShelf(raw) {
  try { const rows = JSON.parse(raw || '[]'); return Array.isArray(rows) ? rows.filter(x =>
    x && typeof x.id === 'string' && typeof x.text === 'string' && x.text.length <= 18000 &&
    typeof x.title === 'string').slice(0,40) : []; } catch { return []; }
}
export function chooseRoutine(rows) {
  const rated = rows.filter(x => Number.isInteger(x.rating) && x.rating >= 1 && x.rating <= 5);
  if (!rated.length) return {...preferences(), reason:'A gentle starting point. Rate a few stories to personalize your routine.', method:'default'};
  const scores = SETTINGS.map(setting => {
    const matches = rated.filter(x => x.setting === setting);
    return {setting, score:(matches.reduce((n,x)=>n+x.rating,0)+6)/(matches.length+2), count:matches.length};
  }).sort((a,b)=>b.score-a.score);
  const best = rated.filter(x => x.setting === scores[0].setting).sort((a,b)=>b.rating-a.rating)[0];
  return {...preferences(best), reason:'Based on your saved story ratings; this is a simple preference baseline, not TabPFN.', method:'rating-average'};
}
export function metrics(text, elapsedMs, source) {
  return {source, words:String(text).trim().split(/\s+/).length, elapsedMs:Math.round(elapsedMs), recordedAt:new Date().toISOString()};
}
export function exportPack(stories) {
  return JSON.stringify({format:'evenfall-pack',version:1,createdAt:new Date().toISOString(),stories}, null, 2);
}
export function importPack(raw) {
  if (raw.length > 1000000) throw new Error('This pack is too large.');
  const pack = JSON.parse(raw);
  if (pack.format !== 'evenfall-pack' || pack.version !== 1 || !Array.isArray(pack.stories)) throw new Error('Choose an Evenfall bedtime pack.');
  const rows = parseShelf(JSON.stringify(pack.stories));
  if (!rows.length) throw new Error('This pack has no readable stories.');
  return rows.map(row => ({...row, id:crypto.randomUUID()}));
}
