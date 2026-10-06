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

// Exhaustively exercise duplicate keys and uneven partitions, including empty/singleton input.
for (const algorithm of ['merge','quick']) {
 for (let size=0;size<=6;size++) {
  for (let code=0;code<3**size;code++) {
   let n=code;const input=Array.from({length:size},()=>{const value=n%3;n=Math.floor(n/3);return value;});
   const original=[...input],expected=[...input].sort((a,b)=>a-b),frames=simulate(algorithm,input);
   assert.deepEqual(input,original,'simulation must not mutate caller input');
   assert.deepEqual(frames.at(-1).values,expected);
   assert.equal(frames.at(-1).complete,true);
   for(const frame of frames){
    assert.ok(frame.active.every(i=>i>=0&&i<size));
    assert.ok(frame.line>=0&&frame.line<definitions[algorithm].code.length);
    if(algorithm==='quick') for(const index of frame.marked) assert.equal(frame.values[index],expected[index],'fixed pivots must already be in final position');
   }
   checked++;
  }
 }
}
for(const input of [[1,2,3,4,5],[5,4,3,2,1],[2,2,2,2,2]]){
 assert.equal(simulate('quick',input).at(-1).comparisons,10,'last-pivot worst case makes n(n-1)/2 comparisons');
}
const mergeFrames=simulate('merge',[4,1,3,2]);
assert.ok(mergeFrames.some(f=>f.aux.length>0),'merge workspace must be visible');
assert.equal(mergeFrames.at(-1).comparisons,5);
assert.equal(mergeFrames.at(-1).moves,8);
const {courses}=await import('../dist/courses.mjs');
for(const course of courses)for(const chapter of course.chapters)for(const id of chapter.lessons){
 assert.ok(definitions[id]);assert.ok(topics.some(t=>t.algorithms.includes(id)));
}
console.log(`${checked} total cases passed, including exhaustive merge/quicksort inputs and course lesson links.`);
