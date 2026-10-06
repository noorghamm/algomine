import assert from 'node:assert/strict';
import {BuildState,sanitizeBlocks,BUILD_LIMIT,nextToFace,pointInPolygon} from '../dist/build-state.mjs';
const b=(x,y,z,t='stone')=>({x,y,z,t});
const model=new BuildState();
assert.equal(model.place(b(0,0,0)),'');
assert.equal(model.place(b(0,0,1,'gold')),'');
assert.equal(model.top(0,0),1);
assert.ok(model.place(b(0,0,1)),'duplicates must be rejected');
for(const p of [b(5,0,0),b(0,-5,0),b(0,0,6),b(0,0,-1),b(.5,0,0),b(0,0,NaN),b(0,0,0,'script')])assert.ok(model.checkPlace(p));
assert.equal(model.blocks.length,2);
assert.equal(model.remove(b(0,0,0)),''); // Creative mode permits floating blocks.
assert.deepEqual(model.skyline(),[2]);
assert.ok(model.undo());assert.equal(model.blocks.length,2);
assert.ok(model.redo());assert.equal(model.blocks.length,1);
assert.ok(model.clear());assert.equal(model.blocks.length,0);
assert.ok(model.undo());assert.deepEqual(model.blocks,[b(0,0,1,'gold')]);
assert.ok(model.undo());assert.equal(model.blocks.length,2);
assert.equal(model.place(b(1,0,0)),'');assert.equal(model.future.length,0,'new edits invalidate redo');
assert.ok(model.remove(b(2,2,-1))); // Bedrock cannot be mined.
const corrupt=[null,{},b(0,0,0),b(0,0,0,'gold'),b(1,0,0,'bad'),b(1,0,2),b(9,0,0)];
assert.deepEqual(sanitizeBlocks(corrupt),[b(0,0,0),b(1,0,2)]);
assert.deepEqual(new BuildState(JSON.parse(JSON.stringify(model.blocks))).blocks,model.blocks,'storage round trip');
const skyline=new BuildState([b(1,1,4),b(-2,-1,1),b(2,-1,0),b(1,1,0)]);
assert.deepEqual(skyline.skyline(),[2,1,5],'height by Y then X, not block count');
for(const [face,expected] of [['top',b(0,0,1)],['left',b(0,1,0)],['right',b(1,0,0)]]){
 const {t,...position}=expected;assert.deepEqual(nextToFace({block:b(0,0,0),face}),position);
}
assert.ok(pointInPolygon(0,0,[[-2,0],[0,-1],[2,0],[0,1]]));
assert.equal(pointInPolygon(2,2,[[-2,0],[0,-1],[2,0],[0,1]]),false);
const full=new BuildState();outer:for(let x=-4;x<=4;x++)for(let y=-4;y<=4;y++)for(let z=0;z<6;z++){if(full.blocks.length===BUILD_LIMIT)break outer;assert.equal(full.place(b(x,y,z)),'');}
assert.ok(full.place(b(4,4,5)));assert.equal(full.blocks.length,BUILD_LIMIT);
assert.equal(full.past.length,50,'undo history is bounded');
const other=new BuildState();other.place(b(-1,-1,0));assert.equal(other.blocks.length,1);assert.equal(full.blocks.length,BUILD_LIMIT,'biome state isolation');
console.log('Build checks passed: placement, mining, limits, undo/redo, safe loading, persistence, face geometry and sorting bridge.');
