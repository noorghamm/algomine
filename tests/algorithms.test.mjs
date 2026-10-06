import assert from 'node:assert/strict';
import {simulate,topics,definitions} from '../dist/algorithms.mjs';
const cases=[[1,2,3],[3,2,1],[7,3,9,4,6,2,8,5],[5,5,5,5],[20,1,20,2,2,1],[8,4,12,2,6,10,14]];
let checked=0;
for(const values of cases){
 for(const name of ['bubble','selection','insertion']){const f=simulate(name,values);assert.deepEqual(f.at(-1).values,[...values].sort((a,b)=>a-b));assert.deepEqual(f[0].values,values);checked++;}
 for(const name of ['linear','binary'])for(const target of [...new Set(values),99]){const f=simulate(name,values,target).at(-1);const data=name==='binary'?[...values].sort((a,b)=>a-b):values;assert.equal(f.marked.length>0,data.includes(target));if(f.marked.length)assert.equal(data[f.marked[0]],target);checked++;}
 for(const name of ['stack','queue']){const f=simulate(name,values).at(-1);assert.deepEqual(f.output,name==='stack'?[...values].reverse():values);assert.deepEqual(f.values,[]);checked++;}
 const heap=simulate('heap',values).at(-1).values;for(let i=1;i<heap.length;i++)assert.ok(heap[Math.floor((i-1)/2)]>=heap[i]);assert.deepEqual([...heap].sort((a,b)=>a-b),[...values].sort((a,b)=>a-b));checked++;
 assert.deepEqual(simulate('inorder',values).at(-1).output,[...new Set(values)].sort((a,b)=>a-b));checked++;
 assert.deepEqual(simulate('traverse',values).at(-1).output,values);checked++;
 for(const target of [...new Set(values),99]){const f=simulate('bst',values,target).at(-1);assert.equal(f.message.startsWith('Found'),values.includes(target));checked++;}
 const table=simulate('hash',values).at(-1).values;assert.deepEqual(table.filter(v=>v!==null).sort((a,b)=>a-b),[...values].sort((a,b)=>a-b));checked++;
}
const graph=[1,2,3,4,5,6,7];assert.deepEqual(simulate('bfs',graph).at(-1).output,[1,2,3,4,5,6,7]);assert.deepEqual(simulate('dfs',graph).at(-1).output,[1,2,4,7,5,3,6]);checked+=2;
for(const topic of topics)for(const id of topic.algorithms){for(const f of simulate(id,topic.values)){assert.ok(f.line>=0&&f.line<definitions[id].code.length);assert.ok(f.active.every(i=>Number.isInteger(i)&&i>=0));}checked++;}
console.log(`${checked} algorithm cases passed: sorting, searches, stack/queue order, tree traversal, graph order, heap property, collision handling, and pseudocode bounds.`);
