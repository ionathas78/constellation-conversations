import {createMarkdownRenderer,escapeHTML,browserURL} from './markdown.js';
let scriptsReady;
function loadScript(name){return new Promise((resolve,reject)=>{const script=document.createElement('script');script.src=new URL('../vendor/'+name,import.meta.url).href;script.onload=resolve;script.onerror=()=>{script.remove();reject(Error('Formatting tools could not load. Your draft is still here; try again.'));};document.head.append(script);});}
export async function getReaderMarkdown(emoji={}){
 if(!scriptsReady)scriptsReady=Promise.all([window.markdownit?null:loadScript('markdown-it.min.js'),window.katex?null:loadScript('katex.min.js')]).catch(error=>{scriptsReady=null;throw error;});
 await scriptsReady;
 return createMarkdownRenderer(window.markdownit,{math:window.katex,emoji:()=>emoji,renderEmoji:id=>{const item=emoji[id];return `<picture class="custom-emoji"><source media="(prefers-reduced-motion: reduce)" srcset="${escapeHTML(browserURL(item.static))}"><img src="${escapeHTML(browserURL(item.src))}" alt="${escapeHTML(item.alt)}" loading="lazy"></picture>`;}});
}
