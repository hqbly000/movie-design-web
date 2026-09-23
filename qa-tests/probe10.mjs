const DEBUG='http://127.0.0.1:9223'
class CDP{constructor(ws){this.ws=ws;this.seq=0;this.p=new Map();this.exc=[];ws.onmessage=e=>{const m=JSON.parse(e.data);if(m.id&&this.p.has(m.id)){const{r,j}=this.p.get(m.id);this.p.delete(m.id);m.error?j(new Error(JSON.stringify(m.error))):r(m.result)}else if(m.method==='Runtime.exceptionThrown'){this.exc.push(m.params.exceptionDetails.exception?.description||m.params.exceptionDetails.text)}}}static async c(u){const ws=new WebSocket(u);await new Promise((a,b)=>{ws.onopen=a;ws.onerror=e=>b(new Error('ws'))});return new CDP(ws)}send(m,pr={}){const id=++this.seq;return new Promise((r,j)=>{this.p.set(id,{r,j});this.ws.send(JSON.stringify({id,method:m,params:pr}))})}async ev(x){const r=await this.send('Runtime.evaluate',{expression:x,returnByValue:true,awaitPromise:true});if(r.exceptionDetails)throw new Error(r.exceptionDetails.exception?.description||r.exceptionDetails.text);return r.result.value}close(){try{this.ws.close()}catch{}}}
const t=await fetch(`${DEBUG}/json/new?about:blank`,{method:'PUT'}).then(r=>r.json())
const c=await CDP.c(t.webSocketDebuggerUrl);await c.send('Page.enable');await c.send('Runtime.enable')
await c.send('Emulation.setDeviceMetricsOverride',{width:1440,height:900,deviceScaleFactor:1,mobile:false})
await c.send('Page.navigate',{url:'http://127.0.0.1:5175/login'});await new Promise(r=>setTimeout(r,3000))
await c.ev(`localStorage.clear()`)
await c.send('Page.navigate',{url:'http://127.0.0.1:5175/login'})
let ok=false
for(let i=0;i<30;i++){await new Promise(r=>setTimeout(r,500));try{ok=await c.ev(`!!document.querySelector('input[type=email]')`)}catch{}if(ok)break}
console.log('login form ready=',ok,'path=',await c.ev('location.pathname'))
await c.ev(`(()=>{const e=document.querySelector('input[type=email]');const p=document.querySelector('input[type=password]');e.value='admin@lightisle.studio';e.dispatchEvent(new Event('input',{bubbles:true}));p.value='Admin@123456';p.dispatchEvent(new Event('input',{bubbles:true}));document.querySelector('form').dispatchEvent(new Event('submit',{cancelable:true,bubbles:true}));return 1})()`)
await new Promise(r=>setTimeout(r,3000))
c.exc=[]
await c.ev(`location.href='/videos'`);await new Promise(r=>setTimeout(r,5000))
console.log('=== FULL EXCEPTION ===')
console.log(c.exc[0]||'(none)')
c.close();process.exit(0)
