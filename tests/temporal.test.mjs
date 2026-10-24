import test from 'node:test';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import {randomUUID} from 'node:crypto';
import {TestWorkflowEnvironment} from '@temporalio/testing';
import {Worker} from '@temporalio/worker';
test('Temporal retries a failed activity and completes three evenings once', {timeout:120000}, async()=>{
  const env=await TestWorkflowEnvironment.createTimeSkipping();
  const attempts=new Map();
  try{
    const worker=await Worker.create({connection:env.nativeConnection,taskQueue:'evenfall-test',workflowsPath:fileURLToPath(new URL('../server/workflows.js',import.meta.url)),activities:{
      async prepareEvening({preferences,evening}){
        const attempt=(attempts.get(evening)||0)+1;attempts.set(evening,attempt);
        if(evening===2&&attempt===1)throw new Error('Simulated transient model failure');
        return {evening,setting:preferences.setting,source:'TEST FIXTURE - no model inference'};
      }
    }});
    const result=await worker.runUntil(env.client.workflow.execute('bedtimePack',{workflowId:randomUUID(),taskQueue:'evenfall-test',args:[{setting:'garden'}]}));
    assert.deepEqual(result.map(row=>row.evening),[1,2,3]);
    assert.equal(attempts.get(1),1);assert.equal(attempts.get(2),2);assert.equal(attempts.get(3),1);
  }finally{await env.teardown();}
});
