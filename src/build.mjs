import {createMarkdownRenderer} from './markdown.js';
import {createHash} from 'node:crypto';
import {messageUUID,validateMessageUUIDs} from './message-ids.mjs';
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import MarkdownIt from 'markdown-it';
import katex from 'katex';
import hljs from 'highlight.js';
import Ajv from 'ajv';
import {parseDice} from './dice.js';
import {validateStory} from './branch.js';
export const escape=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const RUNTIME_MODULES=['app.js','dice.js','branch.js','ui-utils.js','theme.js','dice-ui.js','story-ui.js','media.js','markdown.js','feedback-state.js','feedback.js'];
const root=fileURLToPath(new URL('../',import.meta.url));
const read=async p=>JSON.parse(await fs.readFile(path.join(root,p),'utf8'));
const base=(process.env.BASE_PATH||'').replace(/\/$/,'');
if(base&&!/^\/[a-zA-Z0-9_/-]+$/.test(base))throw Error('Invalid BASE_PATH');
export function safeURL(value,{local=false}={}){
 if(typeof value!=='string')throw Error('A URL is required.');
 if(/^\/(?!\/)/.test(value)&&!value.includes('\\')&&!value.split(/[/?#]/).includes('..'))return base+value;
 if(!local){let u;try{u=new URL(value);}catch{throw Error('Invalid URL');}if(u.protocol==='https:'&&!u.username&&!u.password)return u.href;}
 throw Error('Use a safe site-relative path or HTTPS URL.');
}
let emoji={};
const md=createMarkdownRenderer(MarkdownIt,{resolveURL:safeURL,math:katex,emoji:()=>emoji,renderEmoji:id=>emojiAsset(id),highlight:(source,lang)=>lang&&hljs.getLanguage(lang)?hljs.highlight(source,{language:lang,ignoreIllegals:true}).value:escape(source)});
function emojiAsset(id,cls='custom-emoji'){const item=emoji[id];if(!item)throw Error(`Unknown emoji ${id}`);return `<picture class="${cls}"><source media="(prefers-reduced-motion: reduce)" srcset="${escape(safeURL(item.static))}"><img src="${escape(safeURL(item.src))}" alt="${escape(item.alt)}" loading="lazy"></picture>`;}
export const markdown=s=>md.render(s||'');
function picture(src,alt,cls=''){return `<img class="${cls}" src="${escape(safeURL(src))}" alt="${escape(alt)}" loading="lazy">`;}
function attachment(a){
 const url=a.url||a.src;
 switch(a.type){
 case 'image':if(!a.alt)throw Error('Image descriptions are required.');return `<figure><a class="image-link" href="${escape(safeURL(a.src))}" data-fullsize>${picture(a.src,a.alt)}</a>${a.caption?`<figcaption>${escape(a.caption)}</figcaption>`:''}</figure>`;
 case 'link':return `<a class="preview-card" href="${escape(safeURL(url))}" rel="noreferrer"><span class="eyebrow">${escape(new URL(safeURL(url),'https://example.com').hostname)}</span><strong>${escape(a.title||url)}</strong><span>${escape(a.description||'Open this link')}</span><span aria-hidden="true">↗</span></a>`;
 case 'download':return `<a class="download" href="${escape(safeURL(a.src))}" download>↓ ${escape(a.title||'Download attachment')}</a>`;
 case 'audio':case 'video':return `<figure><${a.type} controls preload="none" ${a.type==='video'&&a.poster?`poster="${escape(safeURL(a.poster))}"`:''} src="${escape(safeURL(a.src))}">${a.captions?`<track kind="captions" src="${escape(safeURL(a.captions,{local:true}))}" srclang="en" label="English" default>`:''}<a href="${escape(safeURL(a.src))}">Open media</a></${a.type}>${a.caption?`<figcaption>${escape(a.caption)}</figcaption>`:''}${a.transcript?`<details><summary>Transcript / description</summary>${markdown(a.transcript)}</details>`:''}<a href="${escape(safeURL(a.src))}">Open ${a.type} file</a></figure>`;
 case 'embed':{
 const src=new URL(safeURL(a.src));if(!((src.hostname==='www.youtube-nocookie.com'&&/^\/embed\/[a-zA-Z0-9_-]+$/.test(src.pathname))||(src.hostname==='player.vimeo.com'&&/^\/video\/\d+$/.test(src.pathname))))throw Error('Embed provider is not allowlisted.');
 return `<div class="embed" data-embed="${escape(src.href)}" data-title="${escape(a.title||'External media')}"><p>${escape(a.title||'External media')}</p><button type="button" data-load-embed hidden>Load external player</button><p class="muted">Loading the player connects to its provider.</p><a href="${escape(safeURL(a.url))}" rel="noreferrer">Watch on provider ↗</a></div>`;}
 default:throw Error('Unknown attachment');
 }
}
function avatar(id,c,speakers){const s=speakers[id],src=c.avatars?.[id]||s.avatar;const initial=s.name.split(/\s+/).slice(0,2).map(x=>x[0]).join('');return `<span class="avatar ${escape(s.shape||'circle')}" style="--speaker:${escape(s.accent||'#657b76')}" aria-hidden="true"><span>${escape(initial)}</span>${src?`<picture>${s.avatarStatic?`<source media="(prefers-reduced-motion: reduce)" srcset="${escape(safeURL(s.avatarStatic))}">`:''}${picture(src,'')}</picture>`:''}</span>`;}
let site,speakers,conversations,styleVersion,scriptVersion;
const href=c=>`${base}/conversations/${c.id}/`;
function nav(active=''){return `<nav aria-label="Conversation library"><a class="brand" href="${base}/"><span class="brand-mark" aria-hidden="true">✳</span><span>Constellation<small>CONVERSATIONS</small></span></a><p class="nav-label">THE COLLECTION</p>${conversations.map(c=>`<a class="nav-item" href="${href(c)}"${c.id===active?' aria-current="page"':''}><span aria-hidden="true">${c.demo?'✧':'◌'}</span><span>${escape(c.title)}<small>${escape(c.demo?'An interactive field guide':(c.tags||['Conversation']).slice(0,2).join(' · '))}</small></span></a>`).join('')}<div class="nav-foot"><span class="tiny-star">✧</span><p>A place for good company<br>and open questions.</p><small>Maximum capability.<br>Minimum intrusion.</small></div></nav>`;}
function shell(title,body,active=''){return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="description" content="${escape(site.description)}"><meta name="color-scheme" content="light dark"><meta http-equiv="Content-Security-Policy" content="default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' https:; media-src 'self' https:; frame-src https://www.youtube-nocookie.com https://player.vimeo.com; connect-src 'self'; object-src 'none'; base-uri 'none'; form-action 'self'"><title>${escape(title===site.title?title:title+' · '+site.title)}</title><link rel="stylesheet" href="${base}/assets/vendor/katex.min.css"><link rel="stylesheet" href="${base}/assets/style-${styleVersion}.css"><script type="module" src="${base}/assets/js-${scriptVersion}/app.js"></script></head><body data-publication="${escape(active)}"><a class="skip" href="#main">Skip to content</a><div class="app-shell"><aside>${nav(active)}</aside><div class="workspace"><header class="topbar"><details class="mobile-nav"><summary>✳ Library</summary>${nav(active)}</details><span class="breadcrumb">THE READING ROOM <span>/</span> ${escape(active?'Conversation':'The collection')}</span><button class="theme-toggle" type="button" aria-label="Change color theme" hidden>◐ <span>Theme</span></button></header><main id="main">${body}</main><footer class="site-footer">Made for the conversation. <span>✧</span> Take your time.</footer></div></div><dialog id="image-dialog" aria-label="Full-size image"><button type="button" data-close>Close ×</button><img alt=""></dialog></body></html>`;}
function card(c){return `<a class="conversation-card ${c.demo?'demo-card':''}" href="${href(c)}"><div class="card-art">${c.cover?picture(c.cover,''):'<span aria-hidden="true">λ</span><div class="orbit" aria-hidden="true"></div>'}<span class="card-category">${c.demo?'EXPLORE THE POSSIBILITIES':'FAITH & PHILOSOPHY'}</span></div><div class="card-copy"><div class="card-meta"><span>${escape(c.tags?.[0]||'Conversation')}</span><time datetime="${c.date}">${new Date(c.date+'T00:00:00Z').toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric',timeZone:'UTC'})}</time></div><h2>${escape(c.title)} <span aria-hidden="true">↗</span></h2><p>${escape(c.description)}</p><div class="card-bottom"><div class="avatar-stack">${c.participants.slice(0,4).map(id=>avatar(id,c,speakers)).join('')}</div><span>${c.status==='awaiting-source'?'Awaiting original transcript':`${c.messages.length} messages${c.story?' · Interactive':''}`}</span></div></div></a>`;}
export function homeMode(items){return items.length===1?'conversation':items.length?'library':'empty';}
function library(){return `<section class="library-hero"><div class="eyebrow"><span class="gold-dot"></span> MANY VOICES. SHARED WONDER.</div><h1>Good questions.<br><em>Extraordinary company.</em></h1><p>Conversations worth keeping. Ideas worth wandering through.<br>A little space to think, together.</p><div class="hero-ornament" aria-hidden="true">✧</div></section><section class="collection" aria-labelledby="collection-title"><div class="section-heading"><h2 id="collection-title">The collection <span>${conversations.length.toString().padStart(2,'0')}</span></h2><span>Pull up a chair.</span></div><div class="cards">${conversations.map(card).join('')}</div></section><div class="collection-note"><span aria-hidden="true">✳</span><p>Some conversations open a window.<br>Others open a whole new world.</p></div>`;}
function readingOrder(c,direction){
 const id=c[direction];if(!id)return '';
 const target=conversations.find(item=>item.id===id);
 const label=direction==='previous'?'Read the preceding conversation':'Continue the conversation';
 return `<nav class="sequence-nav" aria-label="${label}"><a href="${href(target)}" rel="${direction==='previous'?'prev':'next'}"><span>${label}</span><strong>${direction==='previous'?'← ':''}${escape(target.title)}${direction==='next'?' →':''}</strong></a></nav>`;
}
export function validateReadingOrder(items){
 const published=new Set(items.filter(c=>c.published).map(c=>c.id));
 for(const c of items)for(const direction of ['previous','next'])if(c[direction]&&(c[direction]===c.id||!published.has(c[direction])))throw Error(`Invalid ${direction} publication for ${c.id}`);
}
function feedbackPanel(c){
 if(!c.feedback)return '';
 const targets=c.messages.map(m=>({uuid:messageUUID(c,m),name:speakers[m.speaker].name,excerpt:m.body.slice(0,100)}));
 const assets=Object.fromEntries(Object.entries(emoji).map(([id,e])=>[id,{...e,src:safeURL(e.src),static:safeURL(e.static)}]));
 return `<details class="feedback-panel" data-feedback data-publication="${escape(c.id)}" data-messages="${escape(JSON.stringify(targets))}" data-emoji="${escape(JSON.stringify(assets))}"><summary>Add a thought · local feedback</summary><p class="muted">Only in this tab’s session. These are your notes and prompts; adding one does not request an AI response. Nothing is published or submitted. Local-only UUID links work in this session, not for other readers.</p><p data-feedback-fallback class="muted">Enable JavaScript to add local feedback. The published conversation is readable above.</p><div data-feedback-controls hidden><div data-feedback-list aria-label="Your local feedback"></div><form><p data-reply-context class="muted"></p><button type="button" data-cancel-reply hidden>Cancel reply · start a new thread</button><label for="feedback-body">Your thought or prompt</label><textarea id="feedback-body" name="body" rows="5" maxlength="20000" required placeholder="Add a thought. Markdown is welcome."></textarea><div class="feedback-actions"><button type="button" data-preview-feedback>Preview</button><button type="submit">Add to session</button><button type="button" data-reset-feedback>Reset local feedback</button></div><div class="message-body feedback-preview" data-feedback-preview aria-label="Draft preview" hidden></div></form><p role="status" data-feedback-status></p></div></details>`;
}
function conversation(c){
 let previous;
 const messages=c.messages.map(m=>{
 const uuid=messageUUID(c,m),permalink=`<a class="message-permalink" href="#${uuid}" aria-label="Link to message by ${escape(speakers[m.speaker].name)}" title="Copy this link to share this message">#</a>`;
 const s=speakers[m.speaker],grouped=previous===m.speaker;previous=m.speaker;
 const isEmoji=/^[\p{Extended_Pictographic}\p{Emoji_Component}\s\u200d\ufe0f]+$/u.test(m.body)&&/[\p{Extended_Pictographic}\p{Regional_Indicator}\u20e3]/u.test(m.body)&&m.body.length<40;
 return `<article class="message ${grouped?'grouped':''} ${isEmoji?'emoji-only':''} ${s.role==='human'?'human-message':''} ${m.effect?'effect-'+m.effect:''}" id="${uuid}" aria-label="${escape(s.name)}"><div class="avatar-slot"><span class="message-anchor" id="${escape(m.id)}" aria-hidden="true"></span>${grouped?'':avatar(m.speaker,c,speakers)}</div><div class="message-main">${grouped?`<span class="sr-only">${escape(s.name)} continues:</span>${permalink}`:`<h3>${escape(s.name)}${s.role==='human'?' <span class="speaker-role">Human</span>':''} ${permalink}</h3>`}<div class="message-body">${markdown(m.body)}</div>${c.feedback?`<button class="feedback-reply" type="button" data-feedback-reply="${uuid}" hidden>Reply locally</button>`:''}${m.sticker?emojiAsset(m.sticker,'sticker'):''}${m.attachments?.length?`<div class="attachments">${m.attachments.map(attachment).join('')}</div>`:''}${m.dice?`<div class="dice-widget" data-expression="${escape(m.dice)}"><span class="dice-label">◇ ${escape(m.dice)}</span><button type="button" data-roll hidden>Roll dice</button><output aria-live="polite">Interactive roll available with JavaScript.</output></div>`:''}${m.reactions?.length?`<ul class="reactions" aria-label="Recorded reactions">${m.reactions.map(r=>`<li>${escape(r.emoji)} <span>${r.count}</span><span class="sr-only"> reactions</span></li>`).join('')}</ul>`:''}</div></article>`;
 }).join('');
 let story='';if(c.story){
 const rendered=Object.fromEntries(Object.entries(c.story.nodes).map(([id,n])=>[id,{...n,html:markdown(n.body)}]));
 story=`<section class="story-section" aria-labelledby="story-title"><div class="eyebrow">AN OPTIONAL DETOUR</div><h2 id="story-title">Step into the story</h2><p class="muted">An interactive adaptation. The conversation above stays exactly as published.</p><div class="story" data-story="${escape(JSON.stringify({...c.story,nodes:rendered}))}" data-storage="${c.id}:v${c.story.version}"><div data-story-view></div><output data-story-roll aria-live="polite"></output><div class="story-tools" hidden><button type="button" data-back>← Previous decision</button><button type="button" data-restart>Restart story</button></div><p data-storage-status class="muted"></p></div><details class="story-map"><summary>Read every passage (no interaction required)</summary>${Object.entries(c.story.nodes).map(([id,n])=>`<section id="passage-${escape(id)}"><h3>${escape(id)}</h3>${markdown(n.body)}<ul>${n.actions.map(a=>`<li>${escape(a.label)} → ${[a.to,a.pass,a.fail].filter(Boolean).map(t=>`<a href="#passage-${escape(t)}">${escape(t)}</a>`).join(' / ')}</li>`).join('')}</ul></section>`).join('')}</details></section>`;
 }
 return `<div class="reading-column"><a class="back-link" href="${base}/">← The collection</a><header class="publication-header"><div class="eyebrow">${escape(c.demo?'A CONSTELLATION FIELD GUIDE':'A CONSTELLATION CONVERSATION')}</div><h1>${escape(c.title)}</h1><p class="dek">${escape(c.description)}</p><div class="publication-meta"><time datetime="${c.date}">${c.date}</time><span>·</span><span>${c.participants.length} voices</span>${(c.tags||[]).map(t=>`<span class="tag">${escape(t)}</span>`).join('')}</div></header>${readingOrder(c,'previous')}${c.editorial?`<aside class="editorial-note" aria-label="Editorial note"><strong>${c.status==='awaiting-source'?'Transcript awaiting source':'About this edition'}</strong><p>${escape(c.editorial)}</p></aside>`:''}<section class="conversation" aria-label="Published conversation">${messages||`<div class="awaiting"><span aria-hidden="true">λ</span><h2>A place held for the original words.</h2><p>The transcript will appear here when the source exchanges are supplied.</p><div class="participant-list">${c.participants.map(id=>`<span>${avatar(id,c,speakers)}${escape(speakers[id].name)}</span>`).join('')}</div></div>`}</section>${c.demo?`<details class="dice-lab"><summary>Explore dice expressions</summary><form data-dice-form><label for="dice-expression">Dice expression</label><div class="dice-input-row"><input id="dice-expression" name="expression" value="3d6+2" maxlength="300" autocomplete="off" spellcheck="false" aria-describedby="dice-help"><button type="submit" hidden>Roll expression</button></div><p id="dice-help" class="muted">Try adv, 4d6dl1, 3d6!, 4d6r&lt;2, or 5d10cs&gt;=7. Supports + − * / and parentheses. Rolls are local and do not edit this transcript.</p><output aria-live="polite">Enable JavaScript to roll.</output></form></details>`:''}${story}${feedbackPanel(c)}${readingOrder(c,'next')}</div>`;
}
async function validate(c,validateJSON){
 if(!validateJSON(c))throw Error(`${c.id}: ${JSON.stringify(validateJSON.errors)}`);
 if(Number.isNaN(Date.parse(c.date))||new Date(c.date).toISOString().slice(0,10)!==c.date)throw Error('Invalid publication date');
 const ids=new Set();for(const id of c.participants)if(!speakers[id])throw Error('Unknown participant');
 for(const [id,src] of Object.entries(c.avatars||{})){if(!speakers[id])throw Error('Unknown avatar speaker');safeURL(src);}
 if(c.cover)safeURL(c.cover);
 for(const m of c.messages){if(ids.has(m.id))throw Error('Duplicate message id');ids.add(m.id);if(!c.participants.includes(m.speaker))throw Error('Message speaker missing from participants');if(m.dice)parseDice(m.dice);}
 if(c.story)validateStory(c.story);
}
export async function build(){
 const scriptHash=createHash('sha256');for(const name of RUNTIME_MODULES)scriptHash.update(await fs.readFile(path.join(root,'src',name)));scriptVersion=scriptHash.digest('hex').slice(0,12);
 styleVersion=createHash('sha256').update(await fs.readFile(path.join(root,'src/style.css'))).digest('hex').slice(0,12);
 site=await read('content/site.json');speakers=await read('content/speakers.json');emoji=await read('content/emoji.json');
 for(const s of Object.values(speakers)){if(typeof s.name!=='string'||!/^#[\da-f]{6}$/i.test(s.accent||'#657b76')||!['circle','square','rounded',undefined].includes(s.shape))throw Error('Invalid speaker');if(s.role&&!['human','collaborator'].includes(s.role))throw Error('Invalid speaker role');if(s.avatar)safeURL(s.avatar);if(s.avatarStatic)safeURL(s.avatarStatic);if(s.avatar&&/\.(gif|webp|apng)$/i.test(s.avatar)&&!s.avatarStatic)throw Error('Animated avatars need avatarStatic fallback');}
 for(const e of Object.values(emoji)){safeURL(e.src);safeURL(e.static);if(!e.alt)throw Error('Emoji alt text required');}
 const files=(await fs.readdir(path.join(root,'content/conversations'))).filter(f=>f.endsWith('.json'));
 const all=await Promise.all(files.map(f=>read('content/conversations/'+f)));const validator=new Ajv({allErrors:true}).compile(await read('content/schema.json'));
 const seen=new Set();for(const c of all){await validate(c,validator);if(seen.has(c.id))throw Error('Duplicate publication id');seen.add(c.id);}
 validateReadingOrder(all);
 validateMessageUUIDs(all);
 conversations=all.filter(c=>c.published).sort((a,b)=>b.date.localeCompare(a.date)||a.id.localeCompare(b.id));
 const out=path.join(root,'dist');await fs.mkdir(out,{recursive:true});for(const child of await fs.readdir(out))await fs.rm(path.join(out,child),{recursive:true,force:true});await fs.cp(path.join(root,'public'),out,{recursive:true});
 await fs.mkdir(path.join(out,'assets/vendor'),{recursive:true});await fs.copyFile(path.join(root,'node_modules/katex/dist/katex.min.css'),path.join(out,'assets/vendor/katex.min.css'));await fs.cp(path.join(root,'node_modules/katex/dist/fonts'),path.join(out,'assets/vendor/fonts'),{recursive:true});
 await fs.copyFile(path.join(root,'node_modules/markdown-it/dist/markdown-it.min.js'),path.join(out,'assets/vendor/markdown-it.min.js'));
 await fs.copyFile(path.join(root,'node_modules/markdown-it/LICENSE'),path.join(out,'assets/vendor/MARKDOWN-IT-LICENSE'));
 await fs.copyFile(path.join(root,'node_modules/katex/dist/katex.min.js'),path.join(out,'assets/vendor/katex.min.js'));
 await fs.copyFile(path.join(root,'node_modules/katex/LICENSE'),path.join(out,'assets/vendor/KATEX-LICENSE'));
 for(const name of ['app.js','dice.js','branch.js','ui-utils.js','theme.js','dice-ui.js','story-ui.js','media.js','markdown.js','feedback-state.js','feedback.js','style.css'])await fs.copyFile(path.join(root,'src',name),path.join(out,'assets',name));
 await fs.copyFile(path.join(root,'src/style.css'),path.join(out,`assets/style-${styleVersion}.css`));
 const scriptDir=path.join(out,`assets/js-${scriptVersion}`);await fs.mkdir(scriptDir,{recursive:true});for(const name of RUNTIME_MODULES)await fs.copyFile(path.join(root,'src',name),path.join(scriptDir,name));
 for(const c of conversations){const dir=path.join(out,'conversations',c.id);await fs.mkdir(dir,{recursive:true});await fs.writeFile(path.join(dir,'index.html'),shell(c.title,conversation(c),c.id));}
 const mode=homeMode(conversations);await fs.writeFile(path.join(out,'index.html'),shell(mode==='conversation'?conversations[0].title:site.title,mode==='conversation'?conversation(conversations[0]):mode==='library'?library():`<section class="library-hero"><div class="eyebrow">WELCOME TO CONSTELLATION</div><h1>A little room<br><em>for wonder.</em></h1><p>The first conversation is on its way. Pull up a chair.</p></section>`,mode==='conversation'?conversations[0].id:''));
 await fs.writeFile(path.join(out,'404.html'),shell('Page not found','<section class="library-hero"><h1>A quiet corner.</h1><p>This conversation could not be found.</p><a href="'+base+'/">Return to the collection</a></section>'));
 for(const c of conversations){
 const check=async u=>{if(typeof u==='string'&&u.startsWith('/')&&!u.startsWith('//')){const file=path.resolve(root,'public','.'+u);if(!file.startsWith(path.join(root,'public')+path.sep))throw Error('Invalid local asset path');await fs.access(file);}};
 await check(c.cover);for(const u of Object.values(c.avatars||{}))await check(u);
 for(const m of c.messages){for(const a of m.attachments||[])for(const k of ['src','poster','captions'])await check(a[k]);for(const match of m.body.matchAll(/!\[[^\]]*\]\(([^ )]+)/g))await check(match[1]);}
 }
 for(const s of Object.values(speakers)){for(const k of ['avatar','avatarStatic'])if(s[k]?.startsWith('/'))await fs.access(path.join(root,'public',s[k]));}
 for(const e of Object.values(emoji)){for(const k of ['src','static'])if(e[k].startsWith('/'))await fs.access(path.join(root,'public',e[k]));}
 await fs.writeFile(path.join(out,'.nojekyll'),'');console.log(`Built ${conversations.length} publications; homepage: ${mode}.`);
}
if(process.argv[1]===fileURLToPath(import.meta.url))await build();
