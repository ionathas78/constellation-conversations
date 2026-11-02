import test from 'node:test';
import assert from 'node:assert/strict';
import MarkdownIt from 'markdown-it';
import katex from 'katex';
import Ajv from 'ajv';
import fs from 'node:fs';
import {appendFeedback,restoreFeedback,newSessionUUID} from '../src/feedback-state.js';
import {createMarkdownRenderer} from '../src/markdown.js';
const published=['4b506304-8e39-44e6-b4ec-600241530fba'];
const clock=()=> '2026-11-02T12:00:00.000Z';
function uuidFactory(){let n=0;return()=>`00000000-0000-4000-8000-${String(++n).padStart(12,'0')}`;}
test('local replies keep their root thread and restore without touching the transcript',()=>{
 const ids=uuidFactory(),first=appendFeedback({version:1,messages:[]},{body:'**Hello**',replyTo:published[0]},published,ids,clock);
 const second=appendFeedback(first,{body:'A reply',replyTo:first.messages[0].uuid},published,ids,clock);
 const third=appendFeedback(second,{body:'Another reply',replyTo:published[0]},published,ids,clock);
 assert.equal(first.messages.length,1);assert.equal(third.messages.length,3);assert.equal(new Set(third.messages.map(m=>m.threadUUID)).size,1);
 assert.deepEqual(restoreFeedback(JSON.parse(JSON.stringify(third)),published),third);
 const validate=new Ajv().compile(JSON.parse(fs.readFileSync('content/feedback-schema.json','utf8')));assert.ok(validate(third));
 const corrupt=structuredClone(third);corrupt.messages[2].threadUUID=ids();assert.equal(restoreFeedback(corrupt,published).messages.length,0);
 assert.equal(restoreFeedback({version:1,messages:[]},published).messages.length,0);
});
test('empty, oversized, broken targets and malformed saved state are rejected',()=>{
 const blank={version:1,messages:[]},ids=uuidFactory();
 assert.throws(()=>appendFeedback(blank,{body:''},published,ids,clock));
 assert.throws(()=>appendFeedback(blank,{body:'x'.repeat(20001)},published,ids,clock));
 assert.throws(()=>appendFeedback(blank,{body:'hi',replyTo:'missing'},published,ids,clock));
 const good=appendFeedback(blank,{body:'Hi'},published,ids,clock);
 const bad=structuredClone(good);bad.messages[0].replyTo=bad.messages[0].uuid;
 assert.equal(restoreFeedback(bad,published).messages.length,0);
 const duplicate={version:1,messages:[...good.messages,...good.messages]};assert.equal(restoreFeedback(duplicate,published).messages.length,0);
});
test('the shared reader renderer escapes HTML, blocks active URLs and renders math',()=>{
 const md=createMarkdownRenderer(MarkdownIt,{math:katex});
 const html=md.render('**A thought**\n\n<script>alert(1)</script>\n\n$x^2$');
 assert.ok(html.includes('<strong>A thought</strong>'));assert.ok(!html.includes('<script>'));assert.ok(html.includes('<math'));
 assert.ok(!md.render('[bad](javascript:alert(1))').includes('href="javascript:'));
 assert.throws(()=>md.render('![image](//example.com/tracker.png)'));
});

test('UUID generation keeps secure randomness on browsers without randomUUID',()=>{const uuid=newSessionUUID({getRandomValues:bytes=>bytes.fill(255)});assert.equal(uuid,'ffffffff-ffff-4fff-bfff-ffffffffffff');assert.throws(()=>newSessionUUID({}));});
