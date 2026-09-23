const DEBUG='http://127.0.0.1:9223'
class CDP{constructor(ws){this.ws=ws;this.seq=0;this.p=new Map();this.exc=[];ws.onmessage=e=>{const m=JSON.parse(e.data);if(m.id&&this.p.has(m.id)){const{r,j}=this.p.get(m.id);this.p.delete(m.id);m.error?j(new Error(JSON.stringify(m.error))):r(m.result)}else if(m.method==='Runtime.exceptionThrown'){this.exc.push((m.params.exceptionDetails.exception?.description||'').split('\n')[0])}}}static async c(u){const ws=new WebSocket(u);await new Promise((a,b)=>{ws.onopen=a;ws.onerror=e=>b(new Error('ws'))});return new CDP(ws)}send(m,pr={}){const id=++this.seq;return new Promise((r,j)=>{this.p.set(id,{r,j});this.ws.send(JSON.stringify({id,method:m,params:pr}))})}async ev(x){const r=await this.send('Runtime.evaluate',{expression:x,returnByValue:true,awaitPromise:true});if(r.exceptionDetails)throw new Error(r.exceptionDetails.exception?.description||r.exceptionDetails.text);return r.result.value}close(){try{this.ws.close()}catch{}}}
async function nav(path){
  const t=await fetch(`${DEBUG}/json/new?about:blank`,{method:'PUT'}).then(r=>r.json())
  const c=await CDP.c(t.webSocketDebuggerUrl);await c.send('Page.enable');await c.send('Runtime.enable')
  await c.send('Emulation.setDeviceMetricsOverride',{width:1440,height:900,deviceScaleFactor:1,mobile:false})
  await c.send('Page.navigate',{url:'http://127.0.0.1:5174'+path});await new Promise(r=>setTimeout(r,4500))
  const d=await c.ev(`JSON.stringify({path:location.pathname,hasTable:!!document.querySelector('table'),rows:document.querySelectorAll('table tbody tr').length,th:[...document.querySelectorAll('table thead th')].map(x=>x.innerText.trim()),txt:document.body.innerText.replace(/\\n+/g,'|').slice(0,140)})`)
  console.log(path, d, '\n  EXC:', c.exc.slice(0,3).join(' || ')||'(none)')
  c.close()
}
for(const p of ['/dashboard','/videos','/distributions','/honors','/segments','/leads','/members','/hero-slides','/company']) await nav(p)
process.exit(0)
