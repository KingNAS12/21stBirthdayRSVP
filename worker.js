// Cloudflare Worker: receives RSVPs and commits them to rsvps.txt in your repo.
// Env vars: REPO ("username/reponame"), GH_TOKEN (secret; fine-grained token, Contents: read/write on that repo only)
const H={'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'content-type','Content-Type':'application/json'};
const J=(o,s=200)=>new Response(JSON.stringify(o),{status:s,headers:H});
const hex=a=>[...new Uint8Array(a)].map(b=>b.toString(16).padStart(2,'0')).join('');
const hash=async(p,s)=>hex(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(s+p)));
const dec=b=>new TextDecoder().decode(Uint8Array.from(atob(b.replace(/\n/g,'')),c=>c.charCodeAt(0)));
const enc=t=>btoa(String.fromCharCode(...new TextEncoder().encode(t)));

export default{async fetch(req,env){
  if(req.method==='OPTIONS')return new Response(null,{headers:H});
  if(req.method!=='POST')return J({error:'POST only'},405);
  let b;try{b=await req.json()}catch{return J({error:'Bad request'},400)}
  const name=String(b.name||'').replace(/[|\r\n]/g,' ').trim().slice(0,60), pw=String(b.password||'').slice(0,100);
  if(!name)return J({error:'Enter your name.'},400);
  if(b.action==='rsvp'&&!['yes','no','maybe'].includes(b.status))return J({error:'Pick yes, no or maybe.'},400);
  const url=`https://api.github.com/repos/${env.REPO}/contents/rsvps.txt`;
  const gh={Authorization:`Bearer ${env.GH_TOKEN}`,'User-Agent':'rsvp-worker',Accept:'application/vnd.github+json'};
  for(let i=0;i<3;i++){
    const r=await fetch(url,{headers:gh}), f=await r.json();
    const lines=(r.ok?dec(f.content):'').split('\n').filter(l=>l.trim()&&!l.startsWith('#'));
    const idx=lines.findIndex(l=>l.split('|')[0].toLowerCase()===name.toLowerCase());
    let salt='',h='';
    if(idx>=0){
      const p=lines[idx].split('|'); salt=p[2]||''; h=p[3]||'';
      if(h&&await hash(pw,salt)!==h)return J({error:'Wrong password for that name.'},401);
      if(b.action==='lookup')return J({status:p[1]});
    }else if(b.action==='lookup')return J({error:'No RSVP found for that name.'},404);
    else if(pw){salt=hex(crypto.getRandomValues(new Uint8Array(8)));h=await hash(pw,salt)}
    const row=[name,b.status,salt,h,new Date().toISOString()].join('|');
    idx>=0?lines[idx]=row:lines.push(row);
    const put=await fetch(url,{method:'PUT',headers:gh,body:JSON.stringify({
      message:`RSVP: ${name} - ${b.status}`,content:enc('# name|status|salt|hash|updated\n'+lines.join('\n')+'\n'),sha:r.ok?f.sha:undefined})});
    if(put.ok)return J({ok:true,status:b.status});
    if(put.status!==409&&put.status!==422)break;
  }
  return J({error:'Could not save. Try again in a moment.'},500);
}};
