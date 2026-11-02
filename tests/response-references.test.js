import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {initialState,transition,restoreState,getResponse,condition,resolveStoryText,validateStory} from '../src/branch.js';
const story=JSON.parse(fs.readFileSync('content/conversations/the-observatory.json','utf8')).story;
function answer(body){const start=transition(story,initialState(story),2);return transition(story,start,0,null,{body,uuid:'00000000-0000-4000-8000-000000000001',threadUUID:'00000000-0000-4000-8000-000000000002',replyTo:null});}
test('authored answer routes choose an outcome and UUID/tag resolve the same response',()=>{
 const state=answer('An AFRICAN or European swallow?'),response=getResponse(state,'swallow_answer');
 assert.equal(state.node,'swallowClarification');assert.equal(response.outcome,'questioned_the_premise');assert.equal(response.tag,'swallow_answer');assert.equal(getResponse(state,response.uuid),response);
 assert.equal(answer("I don't know").node,'swallowLibrary');assert.equal(answer('42').node,'swallowCrossing');assert.equal(getResponse(answer('42'),'swallow_answer').outcome,'offered_answer');
});
test('conditions use responses by UUID or tag and conditional text responds to outcomes',()=>{
 const state=answer('An African or European swallow?'),response=getResponse(state,'swallow_answer'),fragment=story.nodes.swallowClarification.fragments[0];
 assert.ok(condition(fragment.when,state.variables,state));assert.ok(condition({response:response.uuid,op:'contains',value:'AFRICAN',ignoreCase:true},state.variables,state));
 assert.ok(!condition(fragment.when,{},answer('42')));assert.ok(!condition({response:'missing',op:'!=',value:'x'},state.variables,state));
 assert.ok(condition({variable:'unset',op:'=',value:0},{},state));
});
test('text substitution uses actual bodies, UUIDs and tags without recursive expansion',()=>{
 const body='<script>alert(1)</script> {{variables.fake}}',state=answer(body),response=getResponse(state,'swallow_answer');
 assert.equal(resolveStoryText('You wrote: {{responses.swallow_answer.body}}',state),'You wrote: '+body);
 assert.equal(resolveStoryText('{{responses.'+response.uuid+'.uuid}} / {{responses.swallow_answer.tag}}',state),response.uuid+' / swallow_answer');
 assert.equal(resolveStoryText('{{variables.swallow_answer}}',state),body);assert.equal(resolveStoryText('Missing: {{responses.swallow_answer.outcome}}',initialState(story)),'Missing: ');
});
test('restore recomputes routes/outcomes and discarded answers lose references',()=>{
 const state=answer('An African or European swallow?'),saved=structuredClone(state);saved.history.at(-1).input.outcome='forged';saved.history.at(-1).to='stars';
 assert.deepEqual(restoreState(story,saved),state);const before=restoreState(story,{history:state.history.slice(0,-1)});assert.equal(before.node,'swallowQuestion');assert.equal(getResponse(before,'swallow_answer'),undefined);
});
test('invalid response tags, fields and route destinations fail authoring validation',()=>{
 for(const mutate of [s=>s.nodes.swallowQuestion.actions[0].routes[0].to='missing',s=>s.nodes.swallowQuestion.actions[0].routes[0].when.response='missing',s=>s.nodes.swallowClarification.body='{{responses.swallow_answer.script}}',s=>s.nodes.swallowClarification.fragments[0].when.field='constructor']){
 const invalid=structuredClone(story);mutate(invalid);assert.throws(()=>validateStory(invalid));
 }
 assert.ok(validateStory(story));
});
test('reused tags select the newest surviving answer while UUIDs retain exact identity',()=>{
 const loop={start:'ask',nodes:{ask:{body:'Answer',actions:[{label:'Reply',input:{variable:'answer',tag:'answer',label:'Answer'},to:'again'}]},again:{body:'Again?',actions:[{label:'Again',to:'ask'}]}}};
 const firstInput={uuid:'00000000-0000-4000-8000-000000000011',threadUUID:'00000000-0000-4000-8000-000000000012',replyTo:null,body:'first'};
 const first=transition(loop,initialState(loop),0,null,firstInput),ask=transition(loop,first,0);
 const second=transition(loop,ask,0,null,{...firstInput,uuid:'00000000-0000-4000-8000-000000000013',replyTo:firstInput.uuid,body:'second'});
 assert.equal(getResponse(second,'answer').body,'second');assert.equal(getResponse(second,firstInput.uuid).body,'first');
 assert.equal(getResponse(restoreState(loop,{history:second.history.slice(0,-1)}),'answer').body,'first');
});
