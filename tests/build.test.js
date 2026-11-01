import test from 'node:test';
import assert from 'node:assert/strict';
import {markdown,safeURL,homeMode,validateReadingOrder} from '../src/build.mjs';
test('raw HTML and scripts stay inert',()=>{const result=markdown('<script>alert(1)</script>\n\n<img src=x onerror=alert(1)>');assert.ok(!result.includes('<script>'));assert.ok(result.includes('&lt;script&gt;'));assert.ok(!result.includes('<img src=x'));assert.ok(!markdown('[click](javascript:alert(1))').includes('href="javascript:'));});
test('safe URLs reject dangerous protocols and paths',()=>{for(const u of ['javascript:alert(1)','//evil.com','data:text/html,x','/../secret','/a\\b','https://user:pass@example.com'])assert.throws(()=>safeURL(u));assert.equal(safeURL('https://example.com/'),'https://example.com/');assert.equal(safeURL('/assets/a.png'),'/assets/a.png');});
test('homepage generation handles zero, one and many',()=>{assert.equal(homeMode([]),'empty');assert.equal(homeMode([{}]),'conversation');assert.equal(homeMode([{},{}]),'library');});
test('Markdown tables, highlighting, math and accessible math output',()=>{const html=markdown('| A | B |\n|---|---|\n|1|2|\n\n```js\nconst a = 1;\n```\n\n$x^2$');assert.ok(html.includes('<table>'));assert.ok(html.includes('hljs-keyword'));assert.ok(html.includes('<math'));});

test("inline images have full-size links without nesting existing links",()=>{assert.ok(markdown("![Sky](/assets/sky.png)").includes("data-fullsize"));const linked=markdown("[![Sky](/assets/sky.png)](https://example.com/)");assert.equal((linked.match(/<a /g)||[]).length,1);});

test('reading order links require published, distinct destinations',()=>{const a={id:'a',published:true,next:'b'},b={id:'b',published:true,previous:'a'};assert.doesNotThrow(()=>validateReadingOrder([a,b]));assert.throws(()=>validateReadingOrder([a,{...b,published:false}]));assert.throws(()=>validateReadingOrder([{...a,next:'a'}]));});
