import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
const root=process.cwd();
test('production output has safe assets and progressive content',async()=>{
 execFileSync(process.execPath,['src/build.mjs'],{env:{...process.env,BASE_PATH:''}});
 const home=await fs.readFile('dist/index.html','utf8');assert.ok(home.includes('The collection'));assert.ok(!home.includes('http-equiv="refresh"'));
 const html=await fs.readFile('dist/conversations/the-observatory/index.html','utf8');
 for(const marker of ['<main','aria-label="Published conversation"','<audio controls','<video controls','<track kind="captions"','data-story=','Read every passage','katex','data-dice-form'])assert.ok(html.includes(marker),marker);
 const demo=JSON.parse(await fs.readFile('content/conversations/the-observatory.json','utf8'));
 for(const message of demo.messages){assert.ok(html.includes(`id="${message.uuid}"`));assert.ok(html.includes(`href="#${message.uuid}"`));assert.ok(html.includes(`id="${message.id}"`));}
 assert.ok(!html.includes('<iframe')); // provider is click-to-load
 const logos=await fs.readFile('dist/conversations/logos-loves-learning/index.html','utf8');assert.ok(logos.includes('Mmm. The Bible App'));assert.ok(logos.includes('Hm. Logos loves learning. That tracks.'));assert.ok(!logos.includes('Transcript awaiting source'));assert.ok(!logos.includes('class="dice-widget"'));assert.ok(logos.includes('rel="prev"'));
 const earlier=await fs.readFile('dist/conversations/a-celebration-of-aspiration-and-grandeur/index.html','utf8');assert.ok(earlier.includes('Penny Escher'));assert.ok(earlier.includes('Selah. 🌿'));assert.ok(earlier.includes('rel="next"'));

 for(const doc of [home,html,logos])for(const match of doc.matchAll(/(?:src|href)="(\/(?!\/)[^"#]*)"/g)){
  const target=path.join(root,'dist',match[1]);await fs.access(target);
 }
});
test('JSON schema rejects misspelled fields and invalid story shapes',async()=>{
 const {default:Ajv}=await import('ajv');const schema=JSON.parse(await fs.readFile('content/schema.json','utf8'));const validate=new Ajv().compile(schema);const c=JSON.parse(await fs.readFile('content/conversations/the-observatory.json','utf8'));
 assert.ok(validate(c));assert.ok(!validate({...c,titel:'wrong'}));const copy=structuredClone(c);copy.story.nodes.door.actions[0].when={variable:'x',op:'eval',value:1};assert.ok(!validate(copy));
});
