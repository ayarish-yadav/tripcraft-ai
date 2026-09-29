import test from 'node:test';
import assert from 'node:assert/strict';
import {createApp,errorResponse} from '../app.js';
import {ApiError} from '@google/genai';
import {serviceStatus} from '../config/status.js';

test('provider quota and model errors return readable messages without raw upstream JSON',()=>{
  for(const status of [429,404,403]){
    const error=new ApiError({status,message:JSON.stringify({error:{code:status,message:'private upstream detail'}})});
    const response=errorResponse(error);
    assert.equal(response.status,503);
    assert.equal(response.code,status===429?'AI_QUOTA_EXCEEDED':'AI_PROVIDER_UNAVAILABLE');
    assert.ok(!response.message.includes('private upstream detail'));
    assert.ok(!response.message.includes('{'));
  }
  assert.deepEqual(errorResponse(Object.assign(Error('Enter a destination.'),{status:400})),{status:400,message:'Enter a destination.'});
});

test('independent hosting serves deep links and keeps missing assets and API errors distinct',async()=>{
  const server=createApp({demo:true}).listen(0,'127.0.0.1');
  await new Promise(resolve=>server.once('listening',resolve));
  const root=`http://127.0.0.1:${server.address().port}`;
  try {
    for(const path of ['/','/plan','/trips','/trip/example']){
      const response=await fetch(root+path);
      assert.equal(response.status,200);
      const html=await response.text();
      assert.match(html,/TripCraft/);
      assert.match(html,/id="root"/);
      assert.match(response.headers.get('content-security-policy'),/frame-src[^;]*https:\/\/www.openstreetmap.org/);
    }
    const health=await fetch(root+'/api/health').then(r=>r.json());
    assert.equal(health.mode,'demo');
    assert.equal((await fetch(root+'/api/auth/login',{method:'POST'})).status,503);
    assert.equal((await fetch(root+'/api/unknown')).status,404);
    assert.equal((await fetch(root+'/assets/missing.js')).status,404);
    assert.equal((await fetch(root+'/images/tripcraft-logo.png')).status,200);
  } finally {await new Promise(resolve=>server.close(resolve));}
});

test('live setup serves the website while returning prompt, truthful 503 responses for unavailable features',async()=>{
  let env={JWT_SECRET:'test-private-value-'.repeat(4)},databaseState=0;
  const server=createApp({getStatus:()=>serviceStatus({env,databaseState})}).listen(0,'127.0.0.1');
  await new Promise(resolve=>server.once('listening',resolve));
  const root=`http://127.0.0.1:${server.address().port}`;
  try{
    assert.equal((await fetch(root+'/status')).status,200);
    const healthResponse=await fetch(root+'/api/health');
    const health=await healthResponse.json();
    assert.equal(healthResponse.status,200);
    assert.equal(health.status,'setup_required');
    assert.deepEqual(health.missing,['MONGO_URI','GEMINI_API_KEY']);
    assert.equal(health.features.accounts,false);
    assert.ok(!JSON.stringify(health).includes(env.JWT_SECRET));
    assert.equal((await fetch(root+'/api/ready')).status,503);
    for(const path of ['/api/auth/signup','/api/ai/plan','/api/trips']){
      const response=await fetch(root+path,{method:'POST',headers:{'Content-Type':'application/json'},body:'{}'});
      assert.equal(response.status,503);
      assert.equal((await response.json()).code,'SERVICE_NOT_READY');
    }
    // Readiness follows the current database connection, not only a successful startup.
    env={...env,MONGO_URI:'private-database-value',GEMINI_API_KEY:'private-ai-value'};
    databaseState=1;
    const ready=await fetch(root+'/api/ready');
    assert.equal(ready.status,200);
    assert.equal((await ready.json()).features.aiPlanning,true);
    assert.equal((await fetch(root+'/api/ai/plan',{method:'POST'})).status,401);
    databaseState=0;
    assert.equal((await fetch(root+'/api/ready')).status,503);
    assert.equal((await fetch(root+'/api/trips')).status,503);
  }finally{await new Promise(resolve=>server.close(resolve));}
});

test('database-backed accounts can activate independently of AI; weak JWT configuration stays blocked',()=>{
  const env={MONGO_URI:'test-database',JWT_SECRET:'test-secret-'.repeat(4)};
  const status=serviceStatus({env,databaseState:1});
  assert.equal(status.features.accounts,true);
  assert.equal(status.features.aiPlanning,false);
  assert.equal(status.services.ai,'missing');
  assert.equal(serviceStatus({env:{...env,JWT_SECRET:'short'},databaseState:1}).features.accounts,false);
});
