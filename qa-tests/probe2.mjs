const DEBUG='http://127.0.0.1:9223'
class CDP{constructor(ws){this.ws=ws;this.seq=0;this.p=new Map();ws.onmessage=e=>{const m=JSON.parse(e.data);if(m.id&&this.p.has(m.id)){const{r,j}=this.p.get(m.id);this.p.delete(m.id);m.error?j(new Error(JSON.stringify(m.error))):r(m.result)}}}static async c(u){const ws=new WebSocket(u);await new Promise((a,b)=>{ws.onopen=a;ws.onerror=e=>b(new Error('ws'))});return new CDP(ws)}send(m,pr={}){const id=++this.seq;return new Promise((r,j)=>{this.p.set(id,{r,j});this.ws.send(JSON.stringify({id,method:m,params:pr}))})}async ev(x){const r=await this.send('Runtime.evaluate',{expression:x,returnByValue:true,awaitPromise:true});if(r.exceptionDetails)throw new Error(r.exceptionDetails.exception?.description||r.exceptionDetails.text);return r.result.value}close(){try{this.ws.close()}catch{}}}
const t=await fetch(`${DEBUG}/json/new?about:blank`,{method:'PUT'}).then(r=>r.json())
const c=await CDP.c(t.webSocketDebuggerUrl);await c.send('Page.enable');await c.send('Runtime.enable')
await c.send('Emulation.setDeviceMetricsOverride',{width:1440,height:900,deviceScaleFactor:1,mobile:false})
const nav=async(u,w=4000)=>{await c.ev(`location.href='${u}'`);await new Promise(r=>setTimeout(r,w));return await c.ev(`JSON.stringify({path:location.pathname,iw:innerWidth,th:[...document.querySelectorAll('table thead th')].map(x=>x.innerText.trim()),rows:document.querySelectorAll('table tbody tr').length,hasTable:!!document.querySelector('table'),tabs:document.querySelectorAll('.ad-tabbar, nav').length,txt:document.body.innerText.slice(0,160)})`)}
await c.send('Page.navigate',{url:'http://127.0.0.1:5174/login'});await new Promise(r=>setTimeout(r,1800))
await c.ev(`localStorage.clear()`)
await c.send('Page.navigate',{url:'http://127.0.0.1:5174/login'});await new Promise(r=>setTimeout(r,1500))
await c.ev(`(()=>{const e=document.querySelector('input[type=email]');const p=document.querySelector('input[type=password]');e.value='admin@jiaodianfilm.com';e.dispatchEvent(new Event('input',{bubbles:true}));p.value='Admin@123456';p.dispatchEvent(new Event('input',{bubbles:true}));document.querySelector('form').dispatchEvent(new Event('submit',{cancelable:true,bubbles:true}));return 1})()`)
await new Promise(r=>setTimeout(r,2500))
console.log('HONORS',await nav('/honors'))
console.log('MEMBERS',await nav('/members'))
console.log('VIDEOS',await nav('/videos'))
console.log('VID BTN',await c.ev(`JSON.stringify([...document.querySelectorAll('button')].map(b=>({t:b.innerText.trim().slice(0,8),dis:b.disabled})))`))
console.log('DIST',await nav('/distributions'))
c.close();process.exit(0)
