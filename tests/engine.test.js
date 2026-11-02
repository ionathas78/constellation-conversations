import test from 'node:test';
import assert from 'node:assert/strict';
import {parseDice,rollDice,secureInteger} from '../src/dice.js';
import {validateStory,initialState,transition,restoreState} from '../src/branch.js';
import fs from 'node:fs';
const sequence=(...values)=>{let i=0;return()=>values[i++%values.length];};
test('standard terms, arithmetic, precedence and parentheses',()=>{
 assert.equal(rollDice('3d6+2',sequence(1,3,6)).total,12);
 assert.equal(rollDice('1d20+2d6*2-1',sequence(10,2,3)).total,19);
 assert.equal(rollDice('(1d6+2)*3',()=>4).total,18);
 assert.equal(rollDice('1d100',()=>100).total,100);
 assert.equal(rollDice('-1d6+8',()=>3).total,5);
});
test('keep/drop and advantage shorthand',()=>{
 for(const [expr,expected] of [['4d6kh3',15],['4d6kl2',4],['4d6dh1',10],['4d6dl1',15]])assert.equal(rollDice(expr,sequence(1,3,6,6)).total,expected);
 assert.equal(rollDice('adv',sequence(4,18)).total,18);assert.equal(rollDice('dis',sequence(4,18)).total,4);
});
test('explosions, reroll once, repeated reroll, success counts',()=>{
 const r=rollDice('1d6!',sequence(6,6,2));assert.equal(r.total,14);assert.deepEqual(r.terms[0].dice[0].parts,[6,6,2]);
 assert.equal(rollDice('1d6ro<3',sequence(1,2,5)).total,2);
 assert.equal(rollDice('1d6r<3',sequence(1,2,5)).total,5);
 assert.equal(rollDice('4d6cs>=4',sequence(2,4,6,1)).total,2);
 assert.equal(rollDice('2d6!kh1cs>=8',sequence(6,3,2)).total,1);
});
test('invalid expressions and abuse are bounded',()=>{
 for(const s of ['','1d1','101d6','1d1000001','2d6kh3','1d6kh1kl1','1d6!!','1d6r=1ro=2','Math.random()','1d6;alert(1)','2**3','1d6foo','9'.repeat(20)])assert.throws(()=>parseDice(s),s);
 assert.throws(()=>rollDice('1/0'));assert.throws(()=>rollDice('1d6!',()=>6));assert.throws(()=>rollDice('1d6r>0',()=>1));assert.throws(()=>rollDice('1d6',()=>0));
});
test('secure integer results stay in bounds',()=>{for(let i=0;i<200;i++){const r=secureInteger(20);assert.ok(r>=1&&r<=20);}});
const story=JSON.parse(fs.readFileSync(new URL('../content/conversations/the-observatory.json',import.meta.url))).story;
test('choice, variables, conditions, dice outcomes, restart and replay',()=>{
 assert.equal(validateStory(story),true);const first=initialState(story);
 const polite=transition(story,first,0);assert.equal(polite.variables.courtesy,1);assert.equal(transition(story,polite,0).node,'stars');
 assert.equal(transition(story,first,1,12).node,'stars');assert.equal(transition(story,first,1,11).node,'locked');
 assert.throws(()=>transition(story,{node:'greeting',variables:{},history:[]},0));
 assert.throws(()=>transition(story,first,1));
 const end=transition(story,polite,0);assert.deepEqual(restoreState(story,end),end);assert.deepEqual(restoreState(story,{history:[{from:'bad'}]}),first);
 assert.deepEqual(initialState(story),first);
});
test('bad targets and variables are rejected',()=>{
 assert.throws(()=>validateStory({start:'a',nodes:{a:{actions:[{to:'missing'}]}}}));
 assert.throws(()=>validateStory({start:'a',nodes:{a:{actions:[{to:'a',set:{constructor:1}}]}}}));
});

const inputStory={start:'ask',nodes:{ask:{body:'A question?',actions:[{label:'Continue',input:{variable:'answer',label:'Your answer',maxLength:30},to:'answered'}]},answered:{body:'Recorded.',actions:[{label:'Stars',to:'end',when:{variable:'answer',op:'=',value:'stars'}}]},end:{body:'End',actions:[]}}};
const response={uuid:'00112233-4455-4677-8899-aabbccddeeff',threadUUID:'10000000-0000-4000-8000-000000000000',replyTo:null,body:'stars'};
test('text actions store responses, preserve thread identity and replay submitted input',()=>{
 assert.ok(validateStory(inputStory));const first=initialState(inputStory),next=transition(inputStory,first,0,null,response);
 assert.equal(next.node,'answered');assert.equal(next.variables.answer,'stars');assert.equal(next.history[0].input.uuid,response.uuid);
 assert.deepEqual(restoreState(inputStory,next),next);assert.equal(transition(inputStory,next,0).node,'end');assert.deepEqual(initialState(inputStory).variables,{});
 const back=restoreState(inputStory,{history:next.history.slice(0,-1)});assert.equal(back.node,'ask');assert.deepEqual(back.variables,{});
});
test('text input validates length, presence, identities and allowed action configuration',()=>{
 const first=initialState(inputStory);for(const input of [undefined,{...response,body:''},{...response,body:'x'.repeat(31)},{...response,uuid:'bad'},{...response,replyTo:response.uuid}])assert.throws(()=>transition(inputStory,first,0,null,input));
 assert.deepEqual(restoreState(inputStory,{history:[{from:'ask',action:0,input:{...response,body:''}}]}),first);
 const bad=structuredClone(inputStory);bad.nodes.ask.actions[0].roll='1d6';assert.throws(()=>validateStory(bad));
 const conditionStory=structuredClone(inputStory);conditionStory.nodes.answered.actions[0].when.op='>';assert.throws(()=>validateStory(conditionStory));
});
test('successive story inputs preserve one thread and reject broken reply chains',()=>{
 const two=structuredClone(inputStory);two.nodes.answered.actions.push({label:'Say more',input:{variable:'more',label:'One more thought'},to:'end'});
 const first=transition(two,initialState(two),0,null,response),reply={uuid:'20000000-0000-4000-8000-000000000000',threadUUID:response.threadUUID,replyTo:response.uuid,body:'More'};
 const end=transition(two,first,1,null,reply);assert.equal(end.variables.more,'More');assert.equal(end.history[1].input.threadUUID,response.threadUUID);assert.deepEqual(restoreState(two,end),end);
 assert.throws(()=>transition(two,first,1,null,{...reply,threadUUID:'30000000-0000-4000-8000-000000000000'}));
 assert.throws(()=>transition(two,first,1,null,{...reply,uuid:response.uuid}));
});
