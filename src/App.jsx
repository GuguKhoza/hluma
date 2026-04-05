import { useState, useEffect, useRef } from "react";

const CONFIG = {
  supabase: {
    url: "https://wfzzfmfcuskgpurgjzom.supabase.co",
    anonKey: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndmenpmbWZjdXNrZ3B1cmdqem9tIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ4ODQ4NTQsImV4cCI6MjA5MDQ2MDg1NH0.fR5qTnq5r2Suy0yhA2g9Q0P-o3aqqVNvo---LHPT350",
  },
};

const db = (() => {
  const h = { "Content-Type":"application/json", apikey:CONFIG.supabase.anonKey, Authorization:`Bearer ${CONFIG.supabase.anonKey}` };
  const q = async (table, method="GET", body=null, params="") => {
    const res = await fetch(`${CONFIG.supabase.url}/rest/v1/${table}${params}`, {
      method, headers:{...h, Prefer:method==="POST"?"return=representation":""},
      body:body?JSON.stringify(body):null,
    });
    if (!res.ok) throw new Error(await res.text());
    return res.status===204?null:res.json();
  };
  const uploadFile = async (bucket, path, file) => {
    const res = await fetch(`${CONFIG.supabase.url}/storage/v1/object/${bucket}/${path}`, {
      method:"POST",
      headers:{ apikey:CONFIG.supabase.anonKey, Authorization:`Bearer ${CONFIG.supabase.anonKey}`, "Content-Type":file.type, "x-upsert":"true" },
      body:file,
    });
    if (!res.ok) throw new Error(await res.text());
    return `${CONFIG.supabase.url}/storage/v1/object/public/${bucket}/${path}`;
  };
  return { from:(t)=>({ select:(c="*",p="")=>q(t,"GET",null,`?select=${c}${p}`), insert:(d)=>q(t,"POST",d), update:(d,m)=>q(t,"PATCH",d,`?${m}`) }), uploadFile };
})();

const V = {
  saId:(id)=>{
    const c=id.replace(/\D/g,"");
    if(c.length!==13) return {valid:false,error:"Must be exactly 13 digits."};
    const yy=parseInt(c.slice(0,2)),mm=parseInt(c.slice(2,4)),dd=parseInt(c.slice(4,6));
    if(mm<1||mm>12) return {valid:false,error:"Invalid month in ID."};
    if(dd<1||dd>31) return {valid:false,error:"Invalid day in ID."};
    const cy=new Date().getFullYear()%100, fy=yy>cy?1900+yy:2000+yy;
    const dob=new Date(`${fy}-${String(mm).padStart(2,"0")}-${String(dd).padStart(2,"0")}`);
    if(isNaN(dob)||dob>new Date()) return {valid:false,error:"Invalid date of birth."};
    const age=Math.floor((Date.now()-dob)/(365.25*86400000));
    if(age<16) return {valid:false,error:"Must be at least 16 years old."};
    const gender=parseInt(c.slice(6,10))>=5000?"Male":"Female";
    const citizen=c[10]==="0"?"SA Citizen":"Permanent Resident";
    let sum=0;
    for(let i=0;i<13;i++){let d=parseInt(c[i]);if(i%2===1){d*=2;if(d>9)d-=9;}sum+=d;}
    if(sum%10!==0) return {valid:false,error:"ID checksum failed — check for typos."};
    return {valid:true,age,gender,citizen,dob:dob.toISOString().split("T")[0]};
  },
  email:(v)=>{const ok=/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v);return {valid:ok,error:ok?null:"Invalid email address."};},
  phone:(v)=>{const c=v.replace(/[\s\-()]/g,"");const ok=/^(\+27|0)[6-8][0-9]{8}$/.test(c);return {valid:ok,error:ok?null:"Enter a valid SA number (e.g. 071 234 5678)."};},
  cipc:(v)=>{
    if(!v) return {valid:true};
    const c=v.trim().toUpperCase();
    const m=c.match(/^(\d{4})\/(\d{6})\/(07|06|08|09|10|21|23)$/);
    if(!m) return {valid:false,error:"Format: YYYY/NNNNNN/07 (e.g. 2024/123456/07)."};
    const yr=parseInt(m[1]);
    if(yr<1888||yr>new Date().getFullYear()) return {valid:false,error:`Year ${yr} is out of range.`};
    const types={"07":"Pty Ltd","06":"Ltd","08":"NPC/PLC","09":"SOC","10":"External","21":"NPO","23":"Co-op"};
    return {valid:true,companyType:types[m[3]]};
  },
  required:(v,n)=>(!v||!String(v).trim())?{valid:false,error:`${n} is required.`}:{valid:true},
  minLength:(v,n,name)=>String(v).trim().length<n?{valid:false,error:`${name} must be at least ${n} characters.`}:{valid:true},
  minWords:(v,n,name)=>v.trim().split(/\s+/).filter(Boolean).length<n?{valid:false,error:`${name} must be at least ${n} words.`}:{valid:true},
  price:(v)=>{const n=Number(v);if(isNaN(n)||n<=0)return {valid:false,error:"Price must be a positive number."};if(n>1000000)return {valid:false,error:"Max R1,000,000."};return {valid:true};},
  fundingGoal:(v)=>{const n=Number(v);if(isNaN(n)||n<1000)return {valid:false,error:"Minimum funding goal is R1,000."};if(n>5000000)return {valid:false,error:"Maximum is R5,000,000."};return {valid:true};},
};

const hashContent = async (content) => {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(content+Date.now()));
  return Array.from(new Uint8Array(buf)).map(b=>b.toString(16).padStart(2,"0")).join("");
};

const C = {
  forest:"#1B4332", primary:"#2D6A4F", mid:"#40916C", light:"#52B788",
  pale:"#B7E4C7", mint:"#D8F3DC", cream:"#F8FAF8", white:"#FFFFFF",
  dark:"#0D1F16", soil:"#5C4033", muted:"rgba(27,67,50,0.5)",
  border:"rgba(45,106,79,0.12)", shadow:"rgba(27,67,50,0.08)",
  error:"#c0392b", errorBg:"rgba(192,57,43,0.06)",
  successBg:"rgba(45,106,79,0.07)",
};

const GS = `
@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@500;600;700;800&family=Plus+Jakarta+Sans:ital,wght@0,300;0,400;0,500;0,600;1,400&display=swap');
*,*::before,*::after{margin:0;padding:0;box-sizing:border-box}
body{font-family:'Plus Jakarta Sans',sans-serif;background:#F8FAF8;color:#0D1F16;-webkit-font-smoothing:antialiased}
::-webkit-scrollbar{width:5px}::-webkit-scrollbar-thumb{background:#52B788;border-radius:3px}
@keyframes up{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)}}
@keyframes spin{to{transform:rotate(360deg)}}
@keyframes sway{0%,100%{transform:rotate(-2deg)}50%{transform:rotate(2deg)}}
input:focus,select:focus,textarea:focus{outline:none;border-color:#52B788!important;box-shadow:0 0 0 3px rgba(82,183,136,0.12)}
button{font-family:'Plus Jakarta Sans',sans-serif}
`;

const Logo = ({size=32}) => (
  <div style={{display:"flex",alignItems:"center",gap:10}}>
    <svg width={size} height={size} viewBox="0 0 44 44" fill="none">
      <ellipse cx="22" cy="38" rx="13" ry="4.5" fill={C.soil} opacity=".6"/>
      <path d="M22 36 Q22 26 22 15" stroke={C.primary} strokeWidth="2.5" strokeLinecap="round"/>
      <path d="M22 26 Q14 21 11 13 Q17 14 22 20" fill={C.mid} opacity=".9"/>
      <path d="M22 20 Q30 13 33 5 Q27 8 22 15" fill={C.forest}/>
    </svg>
    <span style={{fontFamily:"Playfair Display",fontWeight:800,fontSize:size*0.72,color:C.forest}}>Hluma</span>
  </div>
);

const Spin = ({color=C.white,size=15}) => (
  <div style={{width:size,height:size,border:`2px solid ${color}`,borderTopColor:"transparent",borderRadius:"50%",animation:"spin 1s linear infinite",flexShrink:0}}/>
);

const Btn = ({children,onClick,variant="primary",disabled,style={},...rest}) => {
  const vs = {
    primary:{background:C.primary,color:C.white,border:"none"},
    outline:{background:C.white,color:C.primary,border:`1.5px solid ${C.primary}`},
    ghost:{background:"transparent",color:C.muted,border:`1px solid ${C.border}`},
    dark:{background:C.forest,color:C.white,border:"none"},
  };
  return <button onClick={onClick} disabled={disabled} style={{...vs[variant],padding:"11px 24px",borderRadius:100,fontWeight:600,fontSize:13,cursor:disabled?"not-allowed":"pointer",opacity:disabled?0.55:1,display:"inline-flex",alignItems:"center",gap:8,transition:"all .2s",...style}} {...rest}>{children}</button>;
};

const Tag = ({children,color=C.primary}) => (
  <span style={{background:`${color}14`,color,border:`1px solid ${color}28`,padding:"3px 12px",borderRadius:100,fontSize:11,fontWeight:600}}>{children}</span>
);

const Card = ({children,style={},hover=true,...rest}) => {
  const [hov,setHov]=useState(false);
  return <div onMouseEnter={()=>hover&&setHov(true)} onMouseLeave={()=>setHov(false)} style={{background:C.white,border:`1px solid ${C.border}`,borderRadius:20,boxShadow:hov?`0 12px 40px ${C.shadow}`:`0 2px 12px ${C.shadow}`,transform:hov?"translateY(-3px)":"translateY(0)",transition:"all .25s",...style}} {...rest}>{children}</div>;
};

function Field({label,required,error,hint,children}) {
  return (
    <div style={{marginBottom:4}}>
      {label&&<label style={{fontSize:12,color:error?C.error:C.muted,marginBottom:6,display:"flex",alignItems:"center",gap:4,fontWeight:500}}>{label}{required&&<span style={{color:C.error}}>*</span>}</label>}
      {children}
      {error&&<p style={{fontSize:11,color:C.error,marginTop:5}}>⚠ {error}</p>}
      {hint&&!error&&<p style={{fontSize:11,color:C.muted,marginTop:5}}>{hint}</p>}
    </div>
  );
}

const iStyle = (err) => ({
  background:err?C.errorBg:C.cream, border:`1px solid ${err?C.error:C.border}`,
  borderRadius:10, padding:"12px 16px", color:C.dark, fontSize:14, width:"100%",
  fontFamily:"Plus Jakarta Sans", transition:"all .2s",
});

function VInput({label,required,error,hint,verified,verifying,value,onChange,...props}) {
  return (
    <Field label={label} required={required} error={error} hint={hint}>
      <div style={{position:"relative"}}>
        <input value={value} onChange={onChange} style={{...iStyle(error),paddingRight:40}} {...props}/>
        <div style={{position:"absolute",right:12,top:"50%",transform:"translateY(-50%)"}}>
          {verifying&&<Spin color={C.primary} size={14}/>}
          {!verifying&&verified&&<span style={{color:C.primary,fontWeight:800,fontSize:16}}>✓</span>}
          {!verifying&&error&&<span style={{color:C.error,fontWeight:800,fontSize:16}}>✕</span>}
        </div>
      </div>
    </Field>
  );
}

function FileUpload({label,accept,multiple=false,files=[],onChange,hint,maxMB=5,required}) {
  const ref=useRef();
  const [dragging,setDragging]=useState(false);
  const add=(raw)=>{
    const next=Array.from(raw).filter(f=>{
      if(f.size>maxMB*1024*1024){alert(`${f.name} exceeds ${maxMB}MB limit.`);return false;}
      return true;
    });
    onChange(multiple?[...files,...next]:next.slice(0,1));
  };
  const remove=(i)=>{const n=[...files];n.splice(i,1);onChange(n);};
  return (
    <div>
      {label&&<label style={{fontSize:12,color:C.muted,marginBottom:6,display:"block",fontWeight:500}}>{label}{required&&<span style={{color:C.error}}> *</span>}</label>}
      <div onClick={()=>ref.current.click()} onDragOver={e=>{e.preventDefault();setDragging(true);}} onDragLeave={()=>setDragging(false)} onDrop={e=>{e.preventDefault();setDragging(false);add(e.dataTransfer.files);}}
        style={{border:`2px dashed ${dragging?C.primary:C.border}`,borderRadius:12,padding:"22px 18px",textAlign:"center",cursor:"pointer",background:dragging?C.mint:C.cream,transition:"all .2s"}}>
        <input ref={ref} type="file" accept={accept} multiple={multiple} style={{display:"none"}} onChange={e=>add(e.target.files)}/>
        <div style={{fontSize:28,marginBottom:6}}>📎</div>
        <p style={{fontSize:13,color:C.primary,fontWeight:600}}>Click or drag & drop</p>
        <p style={{fontSize:11,color:C.muted,marginTop:4}}>{hint||`Max ${maxMB}MB per file`}</p>
      </div>
      {files.length>0&&(
        <div style={{marginTop:10,display:"flex",flexDirection:"column",gap:6}}>
          {files.map((f,i)=>(
            <div key={i} style={{display:"flex",alignItems:"center",gap:10,background:C.white,border:`1px solid ${C.border}`,borderRadius:8,padding:"8px 12px"}}>
              <span style={{fontSize:16}}>{f.type.startsWith("image")?"🖼️":"📄"}</span>
              <div style={{flex:1,minWidth:0}}>
                <p style={{fontSize:12,fontWeight:600,color:C.dark,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{f.name}</p>
                <p style={{fontSize:10,color:C.muted}}>{(f.size/1024).toFixed(0)} KB</p>
              </div>
              {f.type.startsWith("image")&&<img src={URL.createObjectURL(f)} alt="" style={{width:40,height:40,objectFit:"cover",borderRadius:6}}/>}
              <button onClick={e=>{e.stopPropagation();remove(i);}} style={{background:"none",border:"none",color:C.muted,cursor:"pointer",fontSize:18,lineHeight:1,flexShrink:0}}>x</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function Toast({msg,type,onClose}) {
  useEffect(()=>{const t=setTimeout(onClose,5000);return()=>clearTimeout(t);},[onClose]);
  const bdr={success:C.primary,error:C.error,info:C.primary,warn:"#d97706"};
  const icn={success:"🌱",error:"❌",info:"💚",warn:"⚠️"};
  return (
    <div style={{position:"fixed",bottom:28,right:28,zIndex:9999,background:C.white,border:`1.5px solid ${bdr[type]||bdr.info}`,borderRadius:16,padding:"16px 22px",maxWidth:420,boxShadow:"0 8px 40px rgba(0,0,0,0.13)",animation:"up .3s ease",display:"flex",gap:12,alignItems:"flex-start"}}>
      <span style={{fontSize:20}}>{icn[type]||icn.info}</span>
      <span style={{fontSize:13,color:C.dark,lineHeight:1.55,flex:1}}>{msg}</span>
      <button onClick={onClose} style={{background:"none",border:"none",color:C.muted,cursor:"pointer",fontSize:20,lineHeight:1}}>x</button>
    </div>
  );
}

function Nav({page,setPage}) {
  const links=[["Marketplace","market"],["Fund a Biz","fund"],["Get Funded","apply"],["Dashboard","dash"]];
  return (
    <nav style={{position:"fixed",top:0,left:0,right:0,zIndex:200,background:"rgba(248,250,248,0.97)",backdropFilter:"blur(20px)",borderBottom:`1px solid ${C.border}`,height:66}}>
      <div style={{maxWidth:1200,margin:"0 auto",padding:"0 32px",height:"100%",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
        <div onClick={()=>setPage("home")} style={{cursor:"pointer"}}><Logo size={28}/></div>
        <div style={{display:"flex",gap:4,alignItems:"center",flexWrap:"wrap"}}>
          {links.map(([l,p])=>(
            <button key={p} onClick={()=>setPage(p)} style={{background:page===p?"rgba(45,106,79,0.1)":"transparent",color:page===p?C.primary:C.muted,border:page===p?"1px solid rgba(45,106,79,0.2)":"1px solid transparent",padding:"7px 16px",borderRadius:100,fontSize:13,cursor:"pointer",transition:"all .2s"}}>{l}</button>
          ))}
          <Btn onClick={()=>setPage("sell")} variant="outline" style={{padding:"8px 18px",fontSize:12}}>Sell on Hluma</Btn>
          <Btn onClick={()=>setPage("home")} variant="dark" style={{padding:"8px 18px",fontSize:12}}>Join Now</Btn>
        </div>
      </div>
    </nav>
  );
}

function Home({setPage,businesses,products,onSelectProduct}) {
  const totalRaised=businesses.reduce((s,b)=>s+(b.amount_raised||0),0);
  const totalRepaid=businesses.reduce((s,b)=>s+(b.total_repaid||0),0);
  return (
    <div style={{paddingTop:66}}>
      <div style={{background:"linear-gradient(155deg,#F0FAF4 0%,#E0F5E9 50%,#D0EDD9 100%)",padding:"90px 32px 80px",textAlign:"center"}}>
        <div style={{maxWidth:800,margin:"0 auto",animation:"up .6s ease"}}>
          <div style={{marginBottom:20}}><Logo size={48}/></div>
          <div style={{display:"inline-block",background:"rgba(45,106,79,0.08)",border:"1px solid rgba(45,106,79,0.18)",color:C.primary,padding:"6px 20px",borderRadius:100,fontSize:11,marginBottom:24,fontWeight:600,letterSpacing:2}}>SA - Buy - Sell - Fund</div>
          <h1 style={{fontFamily:"Playfair Display",fontWeight:800,fontSize:"clamp(38px,6vw,76px)",lineHeight:1.05,color:C.dark,marginBottom:20}}>
            Where SA entrepreneurs<br/><span style={{color:C.primary}}>sell, grow</span> & get funded.
          </h1>
          <p style={{fontSize:16,color:C.muted,maxWidth:520,margin:"0 auto 36px",lineHeight:1.8}}>
            One platform. Buy from SA businesses. Fund them with revenue sharing. Or list your own products.
          </p>
          <div style={{display:"flex",gap:14,justifyContent:"center",flexWrap:"wrap"}}>
            <Btn onClick={()=>setPage("market")} variant="dark" style={{padding:"15px 34px",fontSize:15}}>Shop the Marketplace</Btn>
            <Btn onClick={()=>setPage("fund")} variant="outline" style={{padding:"15px 34px",fontSize:15}}>Fund a Business</Btn>
            <Btn onClick={()=>setPage("sell")} variant="ghost" style={{padding:"15px 34px",fontSize:15}}>Start Selling</Btn>
          </div>
        </div>
      </div>
      <div style={{background:C.forest,padding:"28px 32px"}}>
        <div style={{maxWidth:960,margin:"0 auto",display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(150px,1fr))"}}>
          {[
            [`R${totalRaised.toLocaleString("en-ZA")}`, "Funding Raised"],
            [`R${totalRepaid.toLocaleString("en-ZA")}`, "Repaid"],
            [businesses.length+"", "Businesses"],
            [products.length+"", "Products"],
            ["R50","Min. Investment"],
            ["150%","Target Return"],
          ].map(([v,l],i)=>(
            <div key={i} style={{textAlign:"center",padding:"0 20px",borderRight:i<5?"1px solid rgba(255,255,255,0.1)":"none"}}>
              <div style={{fontFamily:"Playfair Display",fontWeight:700,fontSize:22,color:C.pale}}>{v}</div>
              <div style={{fontSize:11,color:"rgba(255,255,255,0.45)",marginTop:4}}>{l}</div>
            </div>
          ))}
        </div>
      </div>
      <div style={{padding:"72px 32px",background:C.white}}>
        <div style={{maxWidth:1000,margin:"0 auto",display:"grid",gridTemplateColumns:"1fr 1fr",gap:24}}>
          <div style={{background:`linear-gradient(135deg,${C.mint},#E8F8ED)`,border:`1px solid ${C.border}`,borderRadius:24,padding:"44px 36px"}}>
            <div style={{fontSize:44,marginBottom:20}}>🛍️</div>
            <h2 style={{fontFamily:"Playfair Display",fontWeight:800,fontSize:30,marginBottom:12}}>The Marketplace</h2>
            <p style={{color:C.muted,lineHeight:1.8,marginBottom:28}}>Shop directly from SA youth entrepreneurs.</p>
            <Btn onClick={()=>setPage("market")} variant="primary">Browse Marketplace</Btn>
          </div>
          <div style={{background:"linear-gradient(135deg,#1B4332,#2D6A4F)",borderRadius:24,padding:"44px 36px"}}>
            <div style={{fontSize:44,marginBottom:20}}>🌱</div>
            <h2 style={{fontFamily:"Playfair Display",fontWeight:800,fontSize:30,marginBottom:12,color:C.white}}>Revenue Sharing</h2>
            <p style={{color:"rgba(255,255,255,0.7)",lineHeight:1.8,marginBottom:28}}>Fund SA businesses and earn monthly revenue payments.</p>
            <Btn onClick={()=>setPage("fund")} variant="outline" style={{borderColor:C.pale,color:C.pale}}>Fund a Business</Btn>
          </div>
        </div>
      </div>
      {products.length>0&&(
        <div style={{padding:"64px 32px",background:C.cream}}>
          <div style={{maxWidth:1100,margin:"0 auto"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:32}}>
              <h2 style={{fontFamily:"Playfair Display",fontWeight:800,fontSize:34}}>Latest Products</h2>
              <Btn onClick={()=>setPage("market")} variant="outline">View All</Btn>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(240px,1fr))",gap:20}}>
              {products.slice(0,4).map(p=><ProductCard key={p.id} p={p} onSelect={onSelectProduct}/>)}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ProductCard({p, onSelect}) {
  const typeIcons={Physical:"📦",Digital:"💻",Service:"🛠️",Food:"🍽️"};
  const typeColors={Physical:C.primary,Digital:"#6366f1",Service:"#e67e22",Food:"#e91e8c"};
  const tc=typeColors[p.type]||C.primary;
  return (
    <Card onClick={()=>onSelect&&onSelect(p)} style={{borderRadius:16,overflow:"hidden",cursor:"pointer"}}>
      <div style={{height:180,background:`linear-gradient(135deg,${tc}18,${tc}08)`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:56,position:"relative"}}>
        {p.image_url?<img src={p.image_url} alt={p.name} style={{width:"100%",height:"100%",objectFit:"cover"}}/>:<span>{typeIcons[p.type]||"🛍️"}</span>}
        <div style={{position:"absolute",top:12,left:12}}><Tag color={tc}>{p.type}</Tag></div>
      </div>
      <div style={{padding:"18px 20px"}}>
        <h3 style={{fontFamily:"Playfair Display",fontWeight:700,fontSize:16,marginBottom:4}}>{p.name}</h3>
        <p style={{fontSize:11,color:C.muted,marginBottom:10}}>by {p.seller_name}{p.location?` · ${p.location}`:""}</p>
        <p style={{fontSize:12,color:"rgba(13,31,22,0.65)",lineHeight:1.6,marginBottom:12}}>{(p.description||"").slice(0,80)}{(p.description||"").length>80?"...":""}</p>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <div style={{fontFamily:"Playfair Display",fontWeight:800,fontSize:20,color:C.primary}}>R{Number(p.price).toLocaleString("en-ZA")}</div>
          <span style={{fontSize:12,color:C.primary,fontWeight:600}}>View →</span>
        </div>
      </div>
    </Card>
  );
}

// ── PRODUCT DETAIL PAGE ───────────────────────────────────
function ProductDetail({p, setPage}) {
  const typeColors={Physical:C.primary,Digital:"#6366f1",Service:"#e67e22",Food:"#e91e8c"};
  const tc=typeColors[p.type]||C.primary;
  const docList=p.doc_urls?p.doc_urls.split(",").filter(Boolean):[];

  const handleWhatsApp=()=>{
    const msg=encodeURIComponent(`Hi ${p.seller_name}, I saw your listing on Hluma and I am interested in: *${p.name}* (R${Number(p.price).toLocaleString("en-ZA")}). Please send me more details.`);
    const num=(p.whatsapp||p.phone||"").replace(/[\s\-()]/g,"").replace(/^0/,"+27");
    window.open(`https://wa.me/${num}?text=${msg}`,"_blank");
  };

  const handlePayFast=()=>{
    const pf=CONFIG.payfast;
    const params={
      merchant_id:pf.merchantId, merchant_key:pf.merchantKey,
      return_url:window.location.href, cancel_url:window.location.href,
      notify_url:pf.notifyUrl, name_first:"Buyer", name_last:".",
      m_payment_id:`HL-${Date.now()}`,
      amount:Number(p.price).toFixed(2),
      item_name:`Hluma: ${p.name}`,
      custom_str1:String(p.id),
    };
    const host=pf.sandbox?"https://sandbox.payfast.co.za":"https://www.payfast.co.za";
    const form=document.createElement("form");
    form.method="POST"; form.action=`${host}/eng/process`;
    Object.entries(params).forEach(([k,v])=>{
      const i=document.createElement("input");
      i.type="hidden"; i.name=k; i.value=v; form.appendChild(i);
    });
    document.body.appendChild(form); form.submit();
  };

  return (
    <div style={{paddingTop:66,background:C.cream,minHeight:"100vh"}}>
      <div style={{maxWidth:1100,margin:"0 auto",padding:"24px 32px 0"}}>
        <button onClick={()=>setPage("market")} style={{background:"none",border:"none",color:C.primary,fontSize:13,fontWeight:600,cursor:"pointer",display:"flex",alignItems:"center",gap:6}}>
          ← Back to Marketplace
        </button>
      </div>
      <div style={{maxWidth:1100,margin:"0 auto",padding:"24px 32px 60px",display:"grid",gridTemplateColumns:"1fr 1fr",gap:40}}>

        {/* LEFT — Image + Docs */}
        <div style={{display:"flex",flexDirection:"column",gap:16}}>
          <div style={{borderRadius:20,overflow:"hidden",background:`linear-gradient(135deg,${tc}18,${tc}08)`,height:380,display:"flex",alignItems:"center",justifyContent:"center",border:`1px solid ${C.border}`}}>
            {p.image_url
              ?<img src={p.image_url} alt={p.name} style={{width:"100%",height:"100%",objectFit:"cover"}}/>
              :<span style={{fontSize:80}}>{{Physical:"📦",Digital:"💻",Service:"🛠️",Food:"🍽️"}[p.type]||"🛍️"}</span>
            }
          </div>
          {docList.length>0&&(
            <div style={{background:C.white,border:`1px solid ${C.border}`,borderRadius:16,padding:20}}>
              <h3 style={{fontFamily:"Playfair Display",fontWeight:700,fontSize:16,color:C.dark,marginBottom:14}}>📎 Catalogues & Documents</h3>
              <div style={{display:"flex",flexDirection:"column",gap:10}}>
                {docList.map((url,i)=>{
                  const filename=decodeURIComponent(url.split("/").pop()).replace(/^\d+-/,"").replace(/-/g," ");
                  const isImage=/\.(jpg|jpeg|png|webp|gif)$/i.test(url);
                  return (
                    <a key={i} href={url} target="_blank" rel="noreferrer"
                      style={{display:"flex",alignItems:"center",gap:12,background:C.cream,border:`1px solid ${C.border}`,borderRadius:10,padding:"12px 16px",textDecoration:"none",transition:"all .2s"}}
                      onMouseEnter={e=>e.currentTarget.style.borderColor=C.primary}
                      onMouseLeave={e=>e.currentTarget.style.borderColor=C.border}
                    >
                      <span style={{fontSize:24}}>{isImage?"🖼️":"📄"}</span>
                      <div style={{flex:1}}>
                        <p style={{fontSize:13,fontWeight:600,color:C.dark}}>{filename||`Document ${i+1}`}</p>
                        <p style={{fontSize:11,color:C.muted}}>Click to view / download</p>
                      </div>
                      <span style={{fontSize:18,color:C.primary}}>↓</span>
                    </a>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* RIGHT — Details + Actions */}
        <div style={{display:"flex",flexDirection:"column",gap:20}}>
          <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
            <Tag color={tc}>{p.type}</Tag>
            {p.category&&<Tag color={C.mid}>{p.category}</Tag>}
            {p.status==="live"&&<Tag color={C.primary}>✓ Verified Listing</Tag>}
          </div>

          <div>
            <h1 style={{fontFamily:"Playfair Display",fontWeight:800,fontSize:34,color:C.dark,lineHeight:1.15,marginBottom:8}}>{p.name}</h1>
            <p style={{fontSize:13,color:C.muted}}>Listed by <strong style={{color:C.dark}}>{p.seller_name}</strong>{p.business_name?` · ${p.business_name}`:""}{p.location?` · ${p.location}`:""}</p>
          </div>

          <div style={{background:`linear-gradient(135deg,${C.mint},#E8F8ED)`,border:`1px solid ${C.border}`,borderRadius:16,padding:"20px 24px"}}>
            <p style={{fontSize:12,color:C.muted,marginBottom:4}}>Price</p>
            <div style={{fontFamily:"Playfair Display",fontWeight:800,fontSize:40,color:C.primary}}>R{Number(p.price).toLocaleString("en-ZA")}</div>
            {p.type==="Service"&&<p style={{fontSize:12,color:C.muted,marginTop:4}}>per session</p>}
            {p.delivery&&<p style={{fontSize:12,color:C.primary,marginTop:6,fontWeight:600}}>✓ Delivery available</p>}
          </div>

          <div style={{background:C.white,border:`1px solid ${C.border}`,borderRadius:16,padding:"20px 24px"}}>
            <h3 style={{fontFamily:"Playfair Display",fontWeight:700,fontSize:17,color:C.dark,marginBottom:12}}>About this product</h3>
            <p style={{fontSize:14,color:"rgba(13,31,22,0.75)",lineHeight:1.8,whiteSpace:"pre-wrap"}}>{p.description}</p>
          </div>

          <div style={{background:C.white,border:`1px solid ${C.border}`,borderRadius:16,padding:"20px 24px"}}>
            <h3 style={{fontFamily:"Playfair Display",fontWeight:700,fontSize:17,color:C.dark,marginBottom:14}}>Seller Information</h3>
            <div style={{display:"flex",flexDirection:"column",gap:8}}>
              {[["👤 Name",p.seller_name],["🏢 Business",p.business_name],["📍 Location",p.location],["📧 Email",p.email]].filter(([,v])=>v).map(([l,v])=>(
                <div key={l} style={{display:"flex",gap:12,fontSize:13}}>
                  <span style={{color:C.muted,minWidth:100}}>{l}</span>
                  <span style={{color:C.dark,fontWeight:500}}>{v}</span>
                </div>
              ))}
            </div>
          </div>

          <div style={{display:"flex",flexDirection:"column",gap:12}}>
            <button onClick={handleWhatsApp}
              style={{background:"#25D366",color:C.white,border:"none",borderRadius:14,padding:"16px 24px",fontSize:15,fontWeight:700,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:10,fontFamily:"Plus Jakarta Sans"}}>
              <span style={{fontSize:20}}>💬</span> WhatsApp Seller to Order
            </button>
            <button onClick={handlePayFast}
              style={{background:C.primary,color:C.white,border:"none",borderRadius:14,padding:"16px 24px",fontSize:15,fontWeight:700,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:10,fontFamily:"Plus Jakarta Sans"}}>
              <span style={{fontSize:20}}>💳</span> Buy Now via PayFast — R{Number(p.price).toLocaleString("en-ZA")}
            </button>
            <p style={{fontSize:11,color:C.muted,textAlign:"center",lineHeight:1.6}}>
              PayFast is a secure SA payment gateway. Or WhatsApp the seller to arrange EFT / cash on delivery.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function BizCard({b,setPage}) {
  const pct=Math.min(Math.round(((b.amount_raised||0)/b.funding_goal)*100),100);
  return (
    <Card style={{padding:26}}>
      <Tag color={C.primary}>{b.category}</Tag>
      <h3 style={{fontFamily:"Playfair Display",fontWeight:700,fontSize:19,margin:"12px 0 4px"}}>{b.project_title}</h3>
      <p style={{fontSize:13,color:"rgba(13,31,22,0.62)",marginBottom:16,lineHeight:1.6}}>{(b.description||b.biz_desc||"").slice(0,120)}...</p>
      <div style={{marginBottom:16}}>
        <div style={{display:"flex",justifyContent:"space-between",marginBottom:6}}>
          <span style={{fontWeight:700,color:C.primary}}>R{(b.amount_raised||0).toLocaleString("en-ZA")}</span>
          <span style={{fontSize:12,color:C.muted}}>{pct}% of R{Number(b.funding_goal).toLocaleString("en-ZA")}</span>
        </div>
        <div style={{background:"rgba(45,106,79,0.1)",height:6,borderRadius:100}}>
          <div style={{width:`${pct}%`,height:"100%",background:C.primary,borderRadius:100}}/>
        </div>
      </div>
      <Btn onClick={()=>setPage&&setPage("fund")} style={{width:"100%",justifyContent:"center"}}>Fund from R50</Btn>
    </Card>
  );
}

function Marketplace({products,loading,setPage,onSelect}) {
  const [filter,setFilter]=useState("All");
  const [search,setSearch]=useState("");
  const types=["All","Physical","Digital","Service","Food"];
  const filtered=products.filter(p=>(filter==="All"||p.type===filter)&&(!search||p.name?.toLowerCase().includes(search.toLowerCase())));
  return (
    <div style={{paddingTop:66,background:C.cream,minHeight:"100vh"}}>
      <div style={{background:`linear-gradient(135deg,${C.mint},#EAF7EE)`,padding:"48px 32px 40px"}}>
        <div style={{maxWidth:1100,margin:"0 auto"}}>
          <h1 style={{fontFamily:"Playfair Display",fontWeight:800,fontSize:42,marginBottom:16}}>Shop from SA Sellers</h1>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search products, services..." style={{background:C.white,border:`1px solid ${C.border}`,borderRadius:12,padding:"14px 20px",width:"100%",maxWidth:500,fontSize:14,color:C.dark}}/>
        </div>
      </div>
      <div style={{maxWidth:1100,margin:"0 auto",padding:"32px"}}>
        <div style={{display:"flex",gap:8,marginBottom:28,flexWrap:"wrap",alignItems:"center",justifyContent:"space-between"}}>
          <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
            {types.map(t=><button key={t} onClick={()=>setFilter(t)} style={{background:filter===t?C.primary:C.white,color:filter===t?C.white:C.muted,border:`1px solid ${filter===t?C.primary:C.border}`,padding:"8px 18px",borderRadius:100,fontSize:13,cursor:"pointer",transition:"all .15s"}}>{t}</button>)}
          </div>
          <Btn onClick={()=>setPage("sell")} variant="outline" style={{fontSize:12}}>+ List a Product</Btn>
        </div>
        {loading?<div style={{display:"flex",justifyContent:"center",padding:"80px 0"}}><Spin size={36} color={C.primary}/></div>
          :filtered.length===0?<div style={{textAlign:"center",padding:"80px 0"}}>
            <div style={{fontSize:56,marginBottom:16}}>🛍️</div>
            <p style={{fontFamily:"Playfair Display",fontSize:22,marginBottom:8}}>No products yet</p>
            <Btn onClick={()=>setPage("sell")}>List Your Product</Btn>
          </div>
          :<div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(240px,1fr))",gap:22}}>
            {filtered.map(p=><ProductCard key={p.id} p={p} onSelect={onSelect}/>)}
          </div>
        }
      </div>
    </div>
  );
}

function SellForm({addToast,setPage}) {
  const [tab,setTab]=useState("product");
  const [step,setStep]=useState(1);
  const [loading,setLoading]=useState(false);
  const [done,setDone]=useState(false);
  const [errs,setErrs]=useState({});
  const [idResult,setIdResult]=useState(null);
  const [idVerifying,setIdVerifying]=useState(false);
  const [cipcResult,setCipcResult]=useState(null);

  const [pForm,setPForm]=useState({
    seller_name:"",email:"",phone:"",sa_id:"",business_name:"",location:"",
    name:"",type:"Physical",category:"",price:"",description:"",whatsapp:"",
  });
  const [fForm,setFForm]=useState({
    seller_name:"",email:"",phone:"",sa_id:"",business_name:"",location:"",cipc_number:"",
    project_title:"",biz_desc:"",category:"",monthly_revenue:"",
    funding_goal:"",revenue_share_pct:"",repayment_multiple:"1.5",use_of_funds:"",agreed:false,
  });
  const [productImages,setProductImages]=useState([]);
  const [productDocs,setProductDocs]=useState([]);
  const [businessDocs,setBusinessDocs]=useState([]);
  const [projectImages,setProjectImages]=useState([]);

  const form=tab==="product"?pForm:fForm;
  const setF=tab==="product"?(k,v)=>setPForm(f=>({...f,[k]:v})):(k,v)=>setFForm(f=>({...f,[k]:v}));

  const handleIdChange=(v)=>{
    setF("sa_id",v);setIdResult(null);setErrs(e=>({...e,sa_id:null}));
    if(v.replace(/\D/g,"").length===13){
      setIdVerifying(true);
      setTimeout(()=>{const r=V.saId(v);setIdResult(r);setErrs(e=>({...e,sa_id:r.valid?null:r.error}));setIdVerifying(false);},400);
    }
  };

  const handleCipcChange=(v)=>{
    setFForm(f=>({...f,cipc_number:v}));
    if(v.length>=14){const r=V.cipc(v);setCipcResult(r);setErrs(e=>({...e,cipc_number:r.valid?null:r.error}));}
  };

  const validateStep=()=>{
    const e={};
    if(step===1){
      const rn=V.required(form.seller_name,"Full name");if(!rn.valid)e.seller_name=rn.error;
      const re=V.email(form.email);if(!re.valid)e.email=re.error;
      const rp=V.phone(form.phone);if(!rp.valid)e.phone=rp.error;
      const ri=V.saId(form.sa_id);if(!ri.valid)e.sa_id=ri.error;
      const rb=V.required(form.business_name,"Business name");if(!rb.valid)e.business_name=rb.error;
    }
    if(tab==="product"&&step===2){
      const rn=V.required(pForm.name,"Product name");if(!rn.valid)e.name=rn.error;
      const rp=V.price(pForm.price);if(!rp.valid)e.price=rp.error;
      const rd=V.minLength(pForm.description||"",20,"Description");if(!rd.valid)e.description=rd.error;
      const rw=V.phone(pForm.whatsapp);if(!rw.valid)e.whatsapp=rw.error;
    }
    if(tab==="funding"&&step===2){
      const rt=V.required(fForm.project_title,"Project title");if(!rt.valid)e.project_title=rt.error;
      const rb=V.minWords(fForm.biz_desc||"",30,"Description");if(!rb.valid)e.biz_desc=rb.error;
      const rc=V.required(fForm.category,"Category");if(!rc.valid)e.category=rc.error;
    }
    if(tab==="funding"&&step===3){
      const rg=V.fundingGoal(fForm.funding_goal);if(!rg.valid)e.funding_goal=rg.error;
      const rr=V.required(fForm.revenue_share_pct,"Revenue share");if(!rr.valid)e.revenue_share_pct=rr.error;
      else{const p=Number(fForm.revenue_share_pct);if(p<1||p>30)e.revenue_share_pct="Must be between 1% and 30%.";}
      if(!fForm.agreed)e.agreed="You must agree to the terms.";
    }
    setErrs(e);return Object.keys(e).length===0;
  };

  const handleNext=()=>{if(validateStep())setStep(s=>s+1);};

  const uploadFiles=async(files,folder)=>{
    const urls=[];
    for(const f of files){
      const path=`${folder}/${Date.now()}-${f.name.replace(/\s+/g,"-")}`;
      const url=await db.uploadFile("hluma-uploads",path,f);
      urls.push(url);
    }
    return urls;
  };

  const handleSubmitProduct=async()=>{
    if(!validateStep())return;
    setLoading(true);
    try{
      let image_url=null,doc_urls=[];
      if(productImages.length>0){const urls=await uploadFiles(productImages,"products");image_url=urls[0];}
      if(productDocs.length>0){doc_urls=await uploadFiles(productDocs,"product-docs");}
      await db.from("products").insert({
        seller_name:pForm.seller_name, email:pForm.email, phone:pForm.phone,
        sa_id:pForm.sa_id, business_name:pForm.business_name, location:pForm.location,
        name:pForm.name, type:pForm.type, category:pForm.category,
        price:Number(pForm.price), description:pForm.description,
        whatsapp:pForm.whatsapp, image_url, doc_urls:doc_urls.join(","), status:"pending",
      });
      setDone("product");addToast("Product listed! Under review. 🛍️","success");
    }catch(err){addToast("Failed: "+err.message,"error");}
    finally{setLoading(false);}
  };

  const handleSubmitFunding=async()=>{
    if(!validateStep())return;
    setLoading(true);
    try{
      let doc_urls=[],image_urls=[];
      if(businessDocs.length>0){doc_urls=await uploadFiles(businessDocs,"funding-docs");}
      if(projectImages.length>0){image_urls=await uploadFiles(projectImages,"funding-images");}
      const hash=await hashContent(`${fForm.project_title}|${fForm.biz_desc}|${fForm.email}`);
      const estMonths=fForm.monthly_revenue&&fForm.revenue_share_pct&&fForm.funding_goal
        ?Math.ceil(Number(fForm.funding_goal)*Number(fForm.repayment_multiple)/(Number(fForm.monthly_revenue)*Number(fForm.revenue_share_pct)/100)):null;
      await db.from("founders").insert({
        full_name:fForm.seller_name, email:fForm.email, phone:fForm.phone,
        sa_id:fForm.sa_id, business_name:fForm.business_name, location:fForm.location,
        cipc_number:fForm.cipc_number, project_title:fForm.project_title,
        description:fForm.biz_desc, category:fForm.category,
        funding_goal:Number(fForm.funding_goal), revenue_share_pct:Number(fForm.revenue_share_pct),
        repayment_multiple:Number(fForm.repayment_multiple), monthly_revenue:Number(fForm.monthly_revenue),
        use_of_funds:fForm.use_of_funds, estimated_repayment_months:estMonths,
        ip_hash:hash, doc_urls:doc_urls.join(","), image_urls:image_urls.join(","), status:"pending",
        campaign_end_date:new Date(Date.now()+30*24*60*60*1000).toISOString().split("T")[0],
      });
      setDone("funding");addToast("Application submitted! 🌱","success");
    }catch(err){addToast("Failed: "+err.message,"error");}
    finally{setLoading(false);}
  };

  if(done) return (
    <div style={{paddingTop:66,minHeight:"100vh",background:C.cream,display:"flex",alignItems:"center",justifyContent:"center",padding:"80px 24px"}}>
      <Card style={{padding:"52px 44px",maxWidth:500,textAlign:"center"}}>
        <div style={{fontSize:52,marginBottom:20,animation:"sway 3s ease-in-out infinite"}}>{done==="product"?"🛍️":"🌱"}</div>
        <h2 style={{fontFamily:"Playfair Display",fontWeight:800,fontSize:28,marginBottom:12}}>{done==="product"?"Product Listed!":"Application Submitted!"}</h2>
        <p style={{color:C.muted,lineHeight:1.8,marginBottom:28}}>{done==="product"?"Your product is under review. We will notify you once it is live.":"Your funding application is under review. We will be in touch within 48 hours."}</p>
        <Btn onClick={()=>setPage("market")}>Browse Marketplace</Btn>
      </Card>
    </div>
  );

  const pSteps=["Your Details","Product Info","Review & Submit"];
  const fSteps=["Your Details","Business Info","Funding Terms"];
  const steps=tab==="product"?pSteps:fSteps;
  const sBox={background:C.white,border:`1px solid ${C.border}`,borderRadius:20,padding:"32px 28px"};

  return (
    <div style={{paddingTop:66,background:C.cream,minHeight:"100vh"}}>
      <div style={{maxWidth:720,margin:"0 auto",padding:"52px 24px 60px"}}>
        <h1 style={{fontFamily:"Playfair Display",fontWeight:800,fontSize:40,color:C.dark,marginBottom:6}}>Sell & Get Funded</h1>
        <p style={{color:C.muted,fontSize:14,marginBottom:32}}>One account. List products. Apply for funding.</p>
        <div style={{display:"flex",background:C.white,border:`1px solid ${C.border}`,borderRadius:14,padding:4,marginBottom:28}}>
          {[["List a Product","product"],["Apply for Funding","funding"]].map(([l,t])=>(
            <button key={t} onClick={()=>{setTab(t);setStep(1);setErrs({});}} style={{flex:1,background:tab===t?C.primary:"transparent",color:tab===t?C.white:C.muted,padding:"12px",borderRadius:11,fontWeight:600,fontSize:13,cursor:"pointer",border:"none",transition:"all .2s"}}>{l}</button>
          ))}
        </div>
        <div style={{display:"flex",gap:8,marginBottom:28}}>
          {steps.map((s,i)=>(
            <div key={i} style={{flex:1}}>
              <div style={{height:3,borderRadius:100,background:step>i+1?C.primary:step===i+1?C.light:C.border,marginBottom:5,transition:"background .3s"}}/>
              <span style={{fontSize:10,color:step===i+1?C.primary:C.muted,fontWeight:500}}>{s}</span>
            </div>
          ))}
        </div>

        {step===1&&(
          <div style={sBox}>
            <h3 style={{fontFamily:"Playfair Display",fontWeight:700,fontSize:18,color:C.dark,marginBottom:20}}>Your Details</h3>
            <div style={{display:"flex",flexDirection:"column",gap:16}}>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}>
                <Field label="Full Name" required error={errs.seller_name}>
                  <input value={form.seller_name} onChange={e=>setF("seller_name",e.target.value)} placeholder="Thabo Nkosi" style={iStyle(errs.seller_name)}/>
                </Field>
                <VInput label="Email" required error={errs.email} verified={!errs.email&&form.email.includes("@")&&form.email.length>5} value={form.email} onChange={e=>{setF("email",e.target.value);setErrs(x=>({...x,email:V.email(e.target.value).error}));}} placeholder="you@email.com" type="email"/>
              </div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}>
                <VInput label="Phone" required error={errs.phone} verified={!errs.phone&&form.phone.length>=10} value={form.phone} onChange={e=>{setF("phone",e.target.value);setErrs(x=>({...x,phone:V.phone(e.target.value).error}));}} placeholder="071 234 5678"/>
                <VInput label="SA ID Number" required error={errs.sa_id} verified={idResult?.valid} verifying={idVerifying} value={form.sa_id} onChange={e=>handleIdChange(e.target.value)} placeholder="9001015800082" maxLength={13}/>
              </div>
              {idResult?.valid&&(
                <div style={{background:C.successBg,border:"1px solid rgba(45,106,79,0.2)",borderRadius:10,padding:"10px 14px",fontSize:12,color:C.primary,display:"flex",gap:12,flexWrap:"wrap"}}>
                  <span>✓ Valid SA ID</span><span>· {idResult.gender}</span><span>· Born {idResult.dob}</span><span>· Age {idResult.age}</span><span>· {idResult.citizen}</span>
                </div>
              )}
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}>
                <Field label="Business / Brand Name" required error={errs.business_name}>
                  <input value={form.business_name} onChange={e=>setF("business_name",e.target.value)} placeholder="My Brand SA" style={iStyle(errs.business_name)}/>
                </Field>
                <Field label="Location">
                  <input value={form.location} onChange={e=>setF("location",e.target.value)} placeholder="Johannesburg, GP" style={iStyle(false)}/>
                </Field>
              </div>
              {tab==="funding"&&(
                <VInput label="CIPC Registration Number" hint="Format: YYYY/NNNNNN/07" error={errs.cipc_number} verified={cipcResult?.valid&&fForm.cipc_number} value={fForm.cipc_number} onChange={e=>handleCipcChange(e.target.value)} placeholder="2024/123456/07"/>
              )}
              {cipcResult?.valid&&fForm.cipc_number&&(
                <div style={{background:C.successBg,border:"1px solid rgba(45,106,79,0.2)",borderRadius:10,padding:"10px 14px",fontSize:12,color:C.primary}}>
                  ✓ Valid CIPC number · {cipcResult.companyType}
                </div>
              )}
              <div style={{background:"rgba(45,106,79,0.04)",border:`1px solid ${C.border}`,borderRadius:10,padding:"12px 14px",fontSize:12,color:C.muted,lineHeight:1.6}}>
                Protected under POPIA. Your data is encrypted and never shared without your consent.
              </div>
            </div>
            <div style={{display:"flex",justifyContent:"flex-end",marginTop:24}}>
              <Btn onClick={handleNext}>Continue</Btn>
            </div>
          </div>
        )}

        {tab==="product"&&step===2&&(
          <div style={sBox}>
            <h3 style={{fontFamily:"Playfair Display",fontWeight:700,fontSize:18,color:C.dark,marginBottom:20}}>Product Information</h3>
            <div style={{display:"flex",flexDirection:"column",gap:16}}>
              <Field label="Product / Service Name" required error={errs.name}>
                <input value={pForm.name} onChange={e=>setPForm(f=>({...f,name:e.target.value}))} placeholder="e.g. Handmade Soy Candles" style={iStyle(errs.name)}/>
              </Field>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}>
                <Field label="Product Type" required>
                  <select value={pForm.type} onChange={e=>setPForm(f=>({...f,type:e.target.value}))} style={iStyle(false)}>
                    {["Physical","Digital","Service","Food"].map(t=><option key={t}>{t}</option>)}
                  </select>
                </Field>
                <Field label="Category">
                  <select value={pForm.category} onChange={e=>setPForm(f=>({...f,category:e.target.value}))} style={iStyle(false)}>
                    <option value="">Select category</option>
                    {["Fashion & Clothing","Food & Beverages","Crafts & Art","Health & Beauty","Tech & Digital","Education","Services","Other"].map(c=><option key={c}>{c}</option>)}
                  </select>
                </Field>
              </div>
              <Field label="Price (R)" required error={errs.price}>
                <input type="number" value={pForm.price} onChange={e=>setPForm(f=>({...f,price:e.target.value}))} placeholder="250" style={iStyle(errs.price)}/>
              </Field>
              <Field label="Description" required error={errs.description} hint={`${(pForm.description||"").length} chars — min 20`}>
                <textarea value={pForm.description} onChange={e=>setPForm(f=>({...f,description:e.target.value}))} placeholder="Describe your product — what it is, who it is for, what makes it special..." style={{...iStyle(errs.description),height:110,resize:"vertical"}}/>
              </Field>
              <VInput label="WhatsApp Contact Number" required error={errs.whatsapp} hint="Buyers will contact you here" verified={!errs.whatsapp&&pForm.whatsapp.length>=10} value={pForm.whatsapp} onChange={e=>{setPForm(f=>({...f,whatsapp:e.target.value}));setErrs(x=>({...x,whatsapp:V.phone(e.target.value).error}));}} placeholder="071 234 5678"/>
              <FileUpload label="Product Images" accept="image/*" multiple files={productImages} onChange={setProductImages} hint="JPG, PNG, WEBP — max 5MB each" maxMB={5}/>
              <FileUpload label="Supporting Documents (optional)" accept=".pdf,.doc,.docx" multiple files={productDocs} onChange={setProductDocs} hint="Price list, certificates, proofs — PDF/DOC max 10MB" maxMB={10}/>
            </div>
            <div style={{display:"flex",justifyContent:"space-between",marginTop:24}}>
              <Btn onClick={()=>setStep(1)} variant="ghost">Back</Btn>
              <Btn onClick={handleNext}>Continue</Btn>
            </div>
          </div>
        )}

        {tab==="product"&&step===3&&(
          <div style={sBox}>
            <h3 style={{fontFamily:"Playfair Display",fontWeight:700,fontSize:18,color:C.dark,marginBottom:20}}>Review & Submit</h3>
            <div style={{background:`linear-gradient(135deg,${C.mint},#EAF7EE)`,border:`1px solid ${C.border}`,borderRadius:14,padding:20,marginBottom:20}}>
              <p style={{fontFamily:"Playfair Display",fontWeight:700,fontSize:16,color:C.dark,marginBottom:14}}>Summary</p>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
                {[["Seller",pForm.seller_name],["Email",pForm.email],["Phone",pForm.phone],["Product",pForm.name],["Type",pForm.type],["Price","R"+Number(pForm.price||0).toLocaleString("en-ZA")],["Images",productImages.length+" file(s)"],["Docs",productDocs.length+" file(s)"]].map(([l,v])=>(
                  <div key={l} style={{background:C.white,borderRadius:8,padding:"10px 12px"}}>
                    <div style={{fontSize:10,color:C.muted,fontWeight:500,marginBottom:2}}>{l}</div>
                    <div style={{fontSize:13,fontWeight:600,color:C.dark}}>{v||"—"}</div>
                  </div>
                ))}
              </div>
            </div>
            <div style={{background:"rgba(45,106,79,0.04)",border:`1px solid ${C.border}`,borderRadius:10,padding:"12px 14px",fontSize:12,color:C.muted,lineHeight:1.6,marginBottom:20}}>
              Hluma charges a 5% commission on sales. Your listing will go live after review (usually within 24 hours).
            </div>
            <div style={{display:"flex",justifyContent:"space-between"}}>
              <Btn onClick={()=>setStep(2)} variant="ghost">Back</Btn>
              <Btn onClick={handleSubmitProduct} disabled={loading}>{loading?<><Spin/>Uploading...</>:"Submit Listing"}</Btn>
            </div>
          </div>
        )}

        {tab==="funding"&&step===2&&(
          <div style={sBox}>
            <h3 style={{fontFamily:"Playfair Display",fontWeight:700,fontSize:18,color:C.dark,marginBottom:20}}>Business Information</h3>
            <div style={{display:"flex",flexDirection:"column",gap:16}}>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}>
                <Field label="Business / Project Title" required error={errs.project_title}>
                  <input value={fForm.project_title} onChange={e=>setFForm(f=>({...f,project_title:e.target.value}))} placeholder="AgroLink SA" style={iStyle(errs.project_title)}/>
                </Field>
                <Field label="Category" required error={errs.category}>
                  <select value={fForm.category} onChange={e=>setFForm(f=>({...f,category:e.target.value}))} style={iStyle(errs.category)}>
                    <option value="">Select category</option>
                    {["AgriTech","EdTech","FinTech","HealthTech","CleanEnergy","Retail","Social Impact","Other"].map(c=><option key={c}>{c}</option>)}
                  </select>
                </Field>
              </div>
              <Field label="Business Description" required error={errs.biz_desc} hint={`${fForm.biz_desc.trim().split(/\s+/).filter(Boolean).length} words — min 30`}>
                <textarea value={fForm.biz_desc} onChange={e=>setFForm(f=>({...f,biz_desc:e.target.value}))} placeholder="Describe the problem you solve, your solution, current traction, and why you are the right team..." style={{...iStyle(errs.biz_desc),height:130,resize:"vertical"}}/>
              </Field>
              <Field label="Current Monthly Revenue (R)">
                <input type="number" value={fForm.monthly_revenue} onChange={e=>setFForm(f=>({...f,monthly_revenue:e.target.value}))} placeholder="15000" style={iStyle(false)}/>
              </Field>
              <FileUpload label="Project Images" accept="image/*" multiple files={projectImages} onChange={setProjectImages} hint="Photos of your business, products, team, premises — JPG/PNG max 5MB each" maxMB={5}/>
              <FileUpload label="Business Documents" accept=".pdf,.doc,.docx" multiple files={businessDocs} onChange={setBusinessDocs} hint="CIPC certificate, financials, business plan, ID — PDF/DOC max 10MB each" maxMB={10}/>
            </div>
            <div style={{display:"flex",justifyContent:"space-between",marginTop:24}}>
              <Btn onClick={()=>setStep(1)} variant="ghost">Back</Btn>
              <Btn onClick={handleNext}>Continue</Btn>
            </div>
          </div>
        )}

        {tab==="funding"&&step===3&&(
          <div style={sBox}>
            <h3 style={{fontFamily:"Playfair Display",fontWeight:700,fontSize:18,color:C.dark,marginBottom:20}}>Funding Terms</h3>
            <div style={{display:"flex",flexDirection:"column",gap:16}}>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}>
                <Field label="Funding Goal (R)" required error={errs.funding_goal}>
                  <input type="number" value={fForm.funding_goal} onChange={e=>setFForm(f=>({...f,funding_goal:e.target.value}))} placeholder="50000" style={iStyle(errs.funding_goal)}/>
                </Field>
                <Field label="Monthly Revenue Share %" required error={errs.revenue_share_pct} hint="1 to 30">
                  <input type="number" min="1" max="30" value={fForm.revenue_share_pct} onChange={e=>setFForm(f=>({...f,revenue_share_pct:e.target.value}))} placeholder="10" style={iStyle(errs.revenue_share_pct)}/>
                </Field>
              </div>
              <Field label="Repayment Target">
                <select value={fForm.repayment_multiple} onChange={e=>setFForm(f=>({...f,repayment_multiple:e.target.value}))} style={iStyle(false)}>
                  <option value="1.5">1.5x — Investors get 150% back</option>
                  <option value="2">2x — Investors get 200% back</option>
                </select>
              </Field>
              {fForm.funding_goal&&fForm.revenue_share_pct&&fForm.monthly_revenue&&(
                <div style={{background:`linear-gradient(135deg,${C.primary},${C.forest})`,borderRadius:14,padding:20}}>
                  <p style={{fontSize:11,color:C.pale,fontWeight:600,marginBottom:14,letterSpacing:2,textTransform:"uppercase"}}>Projection</p>
                  <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
                    {[
                      ["Monthly pool","R"+Math.round(Number(fForm.monthly_revenue)*(Number(fForm.revenue_share_pct)/100)).toLocaleString("en-ZA")],
                      ["Est. payback",Math.ceil(Number(fForm.funding_goal)*Number(fForm.repayment_multiple)/(Number(fForm.monthly_revenue)*Number(fForm.revenue_share_pct)/100))+" months"],
                    ].map(([l,v])=>(
                      <div key={l} style={{background:"rgba(255,255,255,0.1)",borderRadius:10,padding:"12px 14px"}}>
                        <div style={{fontSize:10,color:C.pale,marginBottom:2}}>{l}</div>
                        <div style={{fontFamily:"Playfair Display",fontWeight:700,fontSize:15,color:C.white}}>{v}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              <Field label="Use of Funds">
                <textarea value={fForm.use_of_funds} onChange={e=>setFForm(f=>({...f,use_of_funds:e.target.value}))} placeholder="e.g. 40% stock, 30% marketing, 20% equipment, 10% ops" style={{...iStyle(false),height:80,resize:"vertical"}}/>
              </Field>
              <label style={{display:"flex",gap:12,cursor:"pointer",background:errs.agreed?C.errorBg:"rgba(45,106,79,0.04)",border:`1px solid ${errs.agreed?C.error:C.border}`,borderRadius:10,padding:"14px 16px"}}>
                <input type="checkbox" checked={fForm.agreed} onChange={e=>setFForm(f=>({...f,agreed:e.target.checked}))} style={{marginTop:2,accentColor:C.primary}}/>
                <span style={{fontSize:12,color:C.muted,lineHeight:1.7}}>I agree to Hluma's Terms and Funding Policy. I confirm all information provided is accurate and truthful.</span>
              </label>
              {errs.agreed&&<p style={{fontSize:11,color:C.error}}>⚠ {errs.agreed}</p>}
            </div>
            <div style={{display:"flex",justifyContent:"space-between",marginTop:24}}>
              <Btn onClick={()=>setStep(2)} variant="ghost">Back</Btn>
              <Btn onClick={handleSubmitFunding} disabled={loading}>{loading?<><Spin/>Submitting...</>:"Submit Application"}</Btn>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function FundPage({businesses,loading,setPage}) {
  const [filter,setFilter]=useState("All");
  const cats=["All",...new Set(businesses.map(b=>b.category).filter(Boolean))];
  const filtered=filter==="All"?businesses:businesses.filter(b=>b.category===filter);
  return (
    <div style={{paddingTop:66,background:C.cream,minHeight:"100vh"}}>
      <div style={{background:`linear-gradient(135deg,${C.forest},${C.primary})`,padding:"52px 32px 44px"}}>
        <div style={{maxWidth:1100,margin:"0 auto"}}>
          <h1 style={{fontFamily:"Playfair Display",fontWeight:800,fontSize:42,color:C.white,marginBottom:12}}>Fund a Business</h1>
          <p style={{color:"rgba(255,255,255,0.7)",fontSize:15}}>Earn monthly revenue share payments. Get 150%+ back over time.</p>
        </div>
      </div>
      <div style={{maxWidth:1100,margin:"0 auto",padding:"32px 32px 60px"}}>
        <div style={{display:"flex",gap:8,marginBottom:28,flexWrap:"wrap"}}>
          {cats.map(c=><button key={c} onClick={()=>setFilter(c)} style={{background:filter===c?C.primary:C.white,color:filter===c?C.white:C.muted,border:`1px solid ${filter===c?C.primary:C.border}`,padding:"8px 18px",borderRadius:100,fontSize:13,cursor:"pointer",transition:"all .15s"}}>{c}</button>)}
        </div>
        {loading?<div style={{display:"flex",justifyContent:"center",padding:"80px 0"}}><Spin size={36} color={C.primary}/></div>
          :filtered.length===0?<div style={{textAlign:"center",padding:"80px 0"}}>
            <div style={{fontSize:56,marginBottom:16}}>🌱</div>
            <p style={{fontFamily:"Playfair Display",fontSize:22,marginBottom:8}}>No businesses yet</p>
            <Btn onClick={()=>setPage("apply")}>Apply for Funding</Btn>
          </div>
          :<div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(320px,1fr))",gap:22}}>
            {filtered.map(b=><BizCard key={b.id} b={b} setPage={setPage}/>)}
          </div>
        }
      </div>
    </div>
  );
}

function Dashboard({businesses,products,investments}) {
  const [tab,setTab]=useState("overview");
  const totalRaised=businesses.reduce((s,b)=>s+(b.amount_raised||0),0);
  const totalRepaid=businesses.reduce((s,b)=>s+(b.total_repaid||0),0);
  return (
    <div style={{paddingTop:66,background:C.cream,minHeight:"100vh"}}>
      <div style={{padding:"52px 40px 60px",maxWidth:1040,margin:"0 auto"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:32,flexWrap:"wrap",gap:16}}>
          <div>
            <p style={{fontSize:12,color:C.muted,fontWeight:500,marginBottom:4}}>Admin Overview</p>
            <h1 style={{fontFamily:"Playfair Display",fontWeight:800,fontSize:34,color:C.dark}}>Dashboard</h1>
          </div>
          <div style={{display:"flex",gap:8}}>
            {["overview","businesses","products"].map(t=>(
              <button key={t} onClick={()=>setTab(t)} style={{background:tab===t?C.primary:C.white,color:tab===t?C.white:C.muted,border:`1px solid ${tab===t?C.primary:C.border}`,padding:"7px 16px",borderRadius:100,fontSize:13,cursor:"pointer",textTransform:"capitalize",transition:"all .15s"}}>{t}</button>
            ))}
          </div>
        </div>
        {tab==="overview"&&(
          <div style={{animation:"up .3s ease"}}>
            <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(160px,1fr))",gap:16,marginBottom:28}}>
              {[["Total Funded","R"+totalRaised.toLocaleString("en-ZA"),C.primary],["Total Repaid","R"+totalRepaid.toLocaleString("en-ZA"),C.mid],["Businesses",businesses.length,C.forest],["Products",products.length,"#6366f1"]].map(([l,v,color])=>(
                <Card key={l} style={{padding:"20px 18px",borderRadius:14}} hover={false}>
                  <div style={{fontSize:11,color:C.muted,marginBottom:8,fontWeight:500}}>{l}</div>
                  <div style={{fontFamily:"Playfair Display",fontWeight:700,fontSize:26,color}}>{v}</div>
                </Card>
              ))}
            </div>
          </div>
        )}
        {tab==="businesses"&&(
          <div style={{display:"flex",flexDirection:"column",gap:14}}>
            {businesses.length===0?<p style={{color:C.muted}}>No businesses yet.</p>:businesses.map(b=>(
              <Card key={b.id} style={{padding:"22px 26px",borderRadius:14}} hover={false}>
                <div style={{display:"flex",justifyContent:"space-between",flexWrap:"wrap",gap:12}}>
                  <div>
                    <h3 style={{fontFamily:"Playfair Display",fontWeight:700,fontSize:17,color:C.dark}}>{b.project_title}</h3>
                    <p style={{fontSize:12,color:C.muted,marginTop:3}}>{b.full_name} · {b.email} · {b.category}</p>
                  </div>
                  <div style={{textAlign:"right"}}>
                    <div style={{fontFamily:"Playfair Display",fontWeight:800,fontSize:20,color:C.primary}}>R{Number(b.funding_goal||0).toLocaleString("en-ZA")}</div>
                    <Tag color={b.status==="live"?C.primary:"#e67e22"}>{b.status||"pending"}</Tag>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
        {tab==="products"&&(
          <div style={{display:"flex",flexDirection:"column",gap:14}}>
            {products.length===0?<p style={{color:C.muted}}>No products yet.</p>:products.map(p=>(
              <Card key={p.id} style={{padding:"20px 24px",borderRadius:14}} hover={false}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:12}}>
                  <div style={{display:"flex",gap:12,alignItems:"center"}}>
                    {p.image_url&&<img src={p.image_url} alt={p.name} style={{width:48,height:48,objectFit:"cover",borderRadius:8}}/>}
                    <div>
                      <h3 style={{fontFamily:"Playfair Display",fontWeight:700,fontSize:16,color:C.dark}}>{p.name}</h3>
                      <p style={{fontSize:12,color:C.muted,marginTop:2}}>{p.seller_name} · {p.type}</p>
                    </div>
                  </div>
                  <div style={{display:"flex",gap:10,alignItems:"center"}}>
                    <div style={{fontFamily:"Playfair Display",fontWeight:700,fontSize:18,color:C.primary}}>R{Number(p.price||0).toLocaleString("en-ZA")}</div>
                    <Tag color={p.status==="live"?C.primary:"#e67e22"}>{p.status||"pending"}</Tag>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function App() {
  const [page,setPage]=useState("home");
  const [businesses,setBusinesses]=useState([]);
  const [products,setProducts]=useState([]);
  const [investments,setInvestments]=useState([]);
  const [loading,setLoading]=useState(true);
  const [toast,setToast]=useState(null);
  const [selectedProduct,setSelectedProduct]=useState(null);

  const addToast=(msg,type="info")=>setToast({msg,type});

  const handleSelectProduct=(p)=>{
    setSelectedProduct(p);
    setPage("product");
  };

  useEffect(()=>{
    const load=async()=>{
      try{
        const [biz,prod,inv]=await Promise.all([
          db.from("founders").select("*","&order=created_at.desc"),
          db.from("products").select("*","&order=created_at.desc"),
          db.from("investments").select("*","&order=created_at.desc&limit=50"),
        ]);
        setBusinesses(Array.isArray(biz)?biz:[]);
        setProducts(Array.isArray(prod)?prod:[]);
        setInvestments(Array.isArray(inv)?inv:[]);
      }catch(err){console.warn("DB:",err.message);}
      finally{setLoading(false);}
    };
    load();
  },[]);

  const renderPage=()=>{
    switch(page){
      case "product": return selectedProduct ? <ProductDetail p={selectedProduct} setPage={setPage}/> : <Marketplace products={products} loading={loading} setPage={setPage} onSelect={handleSelectProduct}/>;
      case "market": return <Marketplace products={products} loading={loading} setPage={setPage} onSelect={handleSelectProduct}/>;
      case "fund":   return <FundPage businesses={businesses} loading={loading} setPage={setPage}/>;
      case "sell":   return <SellForm addToast={addToast} setPage={setPage}/>;
      case "apply":  return <SellForm addToast={addToast} setPage={setPage}/>;
      case "dash":   return <Dashboard businesses={businesses} products={products} investments={investments}/>;
      default:       return <Home setPage={setPage} businesses={businesses} products={products} onSelectProduct={handleSelectProduct}/>;
    }
  };

  return (
    <>
      <style>{GS}</style>
      <Nav page={page} setPage={setPage}/>
      <div style={{minHeight:"100vh"}}>{renderPage()}</div>
      <footer style={{background:C.forest,padding:"40px 32px",display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:16}}>
        <Logo size={24}/>
        <div style={{fontSize:12,color:"rgba(255,255,255,0.4)"}}>Marketplace · Revenue Sharing · SA Registered · POPIA · 2026</div>
        <div style={{display:"flex",gap:20}}>
          {["Privacy","Terms","Contact"].map(l=><span key={l} style={{fontSize:12,color:"rgba(255,255,255,0.4)",cursor:"pointer"}}>{l}</span>)}
        </div>
      </footer>
      {toast&&<Toast msg={toast.msg} type={toast.type} onClose={()=>setToast(null)}/>}
    </>
  );
}
