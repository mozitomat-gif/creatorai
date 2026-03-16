import { useState } from "react";

const ANTHROPIC_API_URL = "https://api.anthropic.com/v1/messages";

const AI_SYSTEM = `Tu es un expert en stratégie de contenu TikTok et Instagram spécialisé vlog/lifestyle.
Réponds UNIQUEMENT en JSON pur, sans backticks, sans markdown. Structure exacte :
{
  "score": <0-100>,
  "verdict": "<emoji + verdict court>",
  "points": [{"icon":"<emoji>","label":"<titre>","text":"<explication>"}],
  "actions": [{"priority":"haute|moyenne|basse","action":"<action concrète>"}],
  "viralScore": <0-100>,
  "monetizationTip": "<conseil monétisation>",
  "suggestedCaption": "<caption optimisé si applicable>",
  "suggestedHashtags": "<hashtags optimisés si applicable>"
}
Maximum 4 points, 3 actions. Sois très concret pour vlog/lifestyle TikTok & Instagram.`;

const TABS = [
  { id: "calendar", label: "Calendrier", icon: "📅" },
  { id: "analyze", label: "Analyser", icon: "🔍" },
  { id: "viral", label: "Idées Virales", icon: "🔥" },
  { id: "optimize", label: "Titre & Miniature", icon: "✨" },
  { id: "monetize", label: "Monétisation", icon: "💰" },
];

const HOURS = Array.from({length:24},(_,i)=>`${String(i).padStart(2,"0")}:00`);
const PLATFORMS_POST = ["TikTok","Instagram Reels","Instagram Post","Instagram Story"];
const PLATFORM_COLORS = { TikTok:"#fe2c55", "Instagram Reels":"#833ab4", "Instagram Post":"#fcb045", "Instagram Story":"#25f4ee" };
const MONTHS_FR = ["Janvier","Février","Mars","Avril","Mai","Juin","Juillet","Août","Septembre","Octobre","Novembre","Décembre"];
const DAYS_FR = ["Dim","Lun","Mar","Mer","Jeu","Ven","Sam"];

function getDaysInMonth(y,m){ return new Date(y,m+1,0).getDate(); }
function getFirstDay(y,m){ return new Date(y,m,1).getDay(); }
function fmtDate(y,m,d){ return `${y}-${String(m+1).padStart(2,"0")}-${String(d).padStart(2,"0")}`; }

function ScoreRing({score,size=80,color="#fe2c55"}){
  const r=(size-10)/2,circ=2*Math.PI*r,offset=circ-(score/100)*circ;
  return(<svg width={size} height={size} style={{transform:"rotate(-90deg)"}}>
    <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="6"/>
    <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth="6" strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round" style={{transition:"stroke-dashoffset 1s ease"}}/>
    <text x="50%" y="50%" textAnchor="middle" dominantBaseline="middle" style={{transform:"rotate(90deg)",transformOrigin:"center",fill:"white",fontSize:size*0.22,fontWeight:700,fontFamily:"inherit"}}>{score}</text>
  </svg>);
}

function Badge({priority}){
  const m={haute:["#fe2c55","URGENT"],moyenne:["#fcb045","MOYEN"],basse:["#25f4ee","OK"]};
  const [c,l]=m[priority]||["#aaa",priority];
  return <span style={{background:c+"22",color:c,border:`1px solid ${c}44`,borderRadius:4,padding:"2px 8px",fontSize:10,fontWeight:700,letterSpacing:1}}>{l}</span>;
}

function Dots(){
  return <div style={{display:"flex",gap:6,alignItems:"center",justifyContent:"center",padding:"36px 0"}}>
    {[0,1,2].map(i=><div key={i} style={{width:10,height:10,borderRadius:"50%",background:"#fe2c55",animation:`bounce 1.2s ease-in-out ${i*0.2}s infinite`}}/>)}
  </div>;
}

function ResultCard({result}){
  if(!result) return null;
  return(<div style={{marginTop:22,animation:"fadeIn 0.5s ease"}}>
    <div style={{background:"rgba(254,44,85,0.1)",border:"1px solid rgba(254,44,85,0.2)",borderRadius:16,padding:"18px",display:"flex",alignItems:"center",gap:14,marginBottom:12}}>
      <ScoreRing score={result.score||0}/>
      <div style={{flex:1}}>
        <div style={{fontSize:16,fontWeight:800,marginBottom:5}}>{result.verdict}</div>
        {result.monetizationTip&&<div style={{background:"rgba(252,176,69,0.1)",border:"1px solid rgba(252,176,69,0.2)",borderRadius:8,padding:"7px 11px",fontSize:12,color:"#fcb045",lineHeight:1.5}}>💰 {result.monetizationTip}</div>}
      </div>
      {result.viralScore!==undefined&&<div style={{textAlign:"center"}}><ScoreRing score={result.viralScore} size={56} color="#25f4ee"/><div style={{fontSize:10,color:"rgba(255,255,255,0.4)",marginTop:2}}>VIRAL</div></div>}
    </div>
    {result.suggestedCaption&&<div style={{background:"rgba(37,244,238,0.07)",border:"1px solid rgba(37,244,238,0.15)",borderRadius:10,padding:"10px 13px",marginBottom:10,fontSize:12,color:"rgba(255,255,255,0.8)",lineHeight:1.5}}><span style={{color:"#25f4ee",fontWeight:700}}>✍️ Caption suggéré :</span><br/>{result.suggestedCaption}</div>}
    {result.suggestedHashtags&&<div style={{background:"rgba(131,58,180,0.1)",border:"1px solid rgba(131,58,180,0.2)",borderRadius:10,padding:"9px 12px",marginBottom:10,fontSize:12,color:"#c084fc",lineHeight:1.7}}><span style={{fontWeight:700}}>🏷️ Hashtags :</span> {result.suggestedHashtags}</div>}
    {result.points?.length>0&&<div style={{display:"flex",flexDirection:"column",gap:9,marginBottom:12}}>
      {result.points.map((p,i)=>(
        <div key={i} style={{background:"rgba(255,255,255,0.04)",border:"1px solid rgba(255,255,255,0.08)",borderRadius:11,padding:"12px 14px",animation:`fadeIn 0.4s ease ${i*0.1}s both`}}>
          <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:4}}><span style={{fontSize:17}}>{p.icon}</span><span style={{fontWeight:700,fontSize:13}}>{p.label}</span></div>
          <p style={{margin:0,color:"rgba(255,255,255,0.5)",fontSize:12,lineHeight:1.6}}>{p.text}</p>
        </div>
      ))}
    </div>}
    {result.actions?.length>0&&<div style={{background:"rgba(255,255,255,0.03)",border:"1px solid rgba(255,255,255,0.07)",borderRadius:12,overflow:"hidden"}}>
      <div style={{padding:"11px 14px",borderBottom:"1px solid rgba(255,255,255,0.07)",fontSize:11,fontWeight:700,color:"rgba(255,255,255,0.35)",letterSpacing:1}}>⚡ ACTIONS À FAIRE</div>
      {result.actions.map((a,i)=>(
        <div key={i} style={{padding:"11px 14px",borderBottom:i<result.actions.length-1?"1px solid rgba(255,255,255,0.05)":"none",display:"flex",alignItems:"flex-start",gap:9,animation:`fadeIn 0.4s ease ${0.2+i*0.1}s both`}}>
          <Badge priority={a.priority}/><span style={{fontSize:12,color:"rgba(255,255,255,0.75)",lineHeight:1.6,flex:1}}>{a.action}</span>
        </div>
      ))}
    </div>}
  </div>);
}

export default function App(){
  const [tab,setTab]=useState("calendar");
  const [platform,setPlatform]=useState("tiktok");
  const [loading,setLoading]=useState(false);
  const [result,setResult]=useState(null);
  const [error,setError]=useState(null);

  const now=new Date();
  const [calYear,setCalYear]=useState(now.getFullYear());
  const [calMonth,setCalMonth]=useState(now.getMonth());
  const [posts,setPosts]=useState({});
  const [selectedDay,setSelectedDay]=useState(null);
  const [showModal,setShowModal]=useState(false);
  const [modalEdit,setModalEdit]=useState(null);
  const [mcToken,setMcToken]=useState("");
  const [mcUser,setMcUser]=useState("");
  const [mcBlog,setMcBlog]=useState("");
  const [showSettings,setShowSettings]=useState(false);
  const [toast,setToast]=useState(null);
  const [analyzingId,setAnalyzingId]=useState(null);

  const [form,setForm]=useState({title:"",caption:"",hashtags:"",platform:"TikTok",hour:"12:00",mediaUrl:""});
  const [fd,setFd]=useState({title:"",description:"",hashtags:"",duration:"",viralTheme:"",optTitle:"",optCtx:"",mFoll:"",mViews:"",mGoal:"brand deals"});

  const ff=(k,v)=>setForm(p=>({...p,[k]:v}));
  const f=(k,v)=>setFd(p=>({...p,[k]:v}));

  function showToast(type,msg){ setToast({type,msg}); setTimeout(()=>setToast(null),4000); }

  async function callAI(prompt){
    setLoading(true);setResult(null);setError(null);
    try{
      const res=await fetch(ANTHROPIC_API_URL,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({model:"claude-sonnet-4-20250514",max_tokens:1000,system:AI_SYSTEM,messages:[{role:"user",content:prompt}]})});
      const data=await res.json();
      const text=data.content?.map(b=>b.text||"").join("")||"";
      setResult(JSON.parse(text.replace(/```json|```/g,"").trim()));
    }catch(e){setError("Erreur IA. Réessaie !");}
    setLoading(false);
  }

  async function analyzePost(post){
    setAnalyzingId(post.id);
    try{
      const res=await fetch(ANTHROPIC_API_URL,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({model:"claude-sonnet-4-20250514",max_tokens:1000,system:AI_SYSTEM,messages:[{role:"user",content:`Analyse ce post programmé ${post.platform} vlog/lifestyle :\nTitre : "${post.title}"\nCaption : "${post.caption}"\nHashtags : "${post.hashtags}"\nHeure : ${post.hour}\nOptimise aussi caption et hashtags.`}]})});
      const data=await res.json();
      const text=data.content?.map(b=>b.text||"").join("")||"";
      const analysis=JSON.parse(text.replace(/```json|```/g,"").trim());
      setPosts(prev=>({...prev,[post.date]:prev[post.date].map(p=>p.id===post.id?{...p,analysis}:p)}));
    }catch(e){}
    setAnalyzingId(null);
  }

  async function sendToMetricool(post){
    if(!mcToken||!mcUser||!mcBlog){ showToast("error","⚙️ Configure d'abord tes identifiants Metricool dans Settings"); return; }
    showToast("loading","📡 Envoi vers Metricool...");
    const dateTime=`${post.date}T${post.hour}:00`;
    const netMap={"TikTok":"tiktok","Instagram Reels":"instagram","Instagram Post":"instagram","Instagram Story":"instagram"};
    const network=netMap[post.platform]||"tiktok";
    const body={
      publicationDate:{dateTime,timezone:"Europe/Paris"},
      text:`${post.caption}\n\n${post.hashtags}`,
      providers:[{network}],autoPublish:true,draft:false,
      userId:parseInt(mcUser),blogId:parseInt(mcBlog),
    };
    if(post.platform==="Instagram Reels"||post.platform==="Instagram Story") body.instagramData={autoPublish:true};
    if(post.platform==="TikTok") body.tiktokData={autoPublish:true};
    if(post.mediaUrl) body.mediaUrls=[post.mediaUrl];
    try{
      const res=await fetch(`https://app.metricool.com/api/v2/scheduler/posts?userId=${mcUser}&blogId=${mcBlog}`,{method:"POST",headers:{"Content-Type":"application/json","X-Mc-Auth":mcToken},body:JSON.stringify(body)});
      if(res.ok){ showToast("success","✅ Post programmé sur Metricool !"); setPosts(prev=>({...prev,[post.date]:prev[post.date].map(p=>p.id===post.id?{...p,synced:true}:p)})); }
      else { const err=await res.json(); showToast("error",`❌ Metricool : ${err.message||res.status}`); }
    }catch(e){ showToast("error","❌ Erreur réseau — vérifie tes identifiants"); }
  }

  const daysInMonth=getDaysInMonth(calYear,calMonth);
  const firstDay=getFirstDay(calYear,calMonth);
  const allPosts=Object.entries(posts).flatMap(([date,arr])=>arr.map(p=>({...p,date}))).sort((a,b)=>a.date.localeCompare(b.date)||a.hour.localeCompare(b.hour));
  const todayStr=fmtDate(now.getFullYear(),now.getMonth(),now.getDate());

  function savePost(){
    const key=selectedDay;
    const obj={id:modalEdit?modalEdit.id:Date.now(),date:key,...form,synced:false,analysis:modalEdit?.analysis||null};
    setPosts(prev=>{const ex=prev[key]||[];return{...prev,[key]:modalEdit?ex.map(p=>p.id===modalEdit.id?obj:p):[...ex,obj]};});
    setShowModal(false);setModalEdit(null);setForm({title:"",caption:"",hashtags:"",platform:"TikTok",hour:"12:00",mediaUrl:""});
  }

  function openEdit(post){ setModalEdit(post);setSelectedDay(post.date);setForm({title:post.title,caption:post.caption,hashtags:post.hashtags,platform:post.platform,hour:post.hour,mediaUrl:post.mediaUrl||""});setShowModal(true); }
  function delPost(date,id){ setPosts(prev=>({...prev,[date]:prev[date].filter(p=>p.id!==id)})); }

  const inp={width:"100%",background:"rgba(255,255,255,0.06)",border:"1px solid rgba(255,255,255,0.11)",borderRadius:10,padding:"11px 13px",color:"white",fontSize:13,outline:"none",boxSizing:"border-box",fontFamily:"inherit",transition:"border-color 0.2s"};
  const lbl={color:"rgba(255,255,255,0.45)",fontSize:11,fontWeight:700,letterSpacing:0.8,marginBottom:5,display:"block"};
  const Btn=(label,onClick,active=true,color="#fe2c55")=>(
    <button onClick={onClick} disabled={!active} style={{width:"100%",padding:"13px",borderRadius:11,border:"none",cursor:active?"pointer":"not-allowed",background:active?`linear-gradient(135deg,${color},${color}bb)`:"rgba(255,255,255,0.07)",color:"white",fontSize:13,fontWeight:700,fontFamily:"inherit",opacity:active?1:0.5,transition:"all 0.2s"}}>{label}</button>
  );

  return(
    <div style={{minHeight:"100vh",background:"#080808",color:"white",fontFamily:"'Sora','DM Sans',sans-serif",paddingBottom:60}}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Sora:wght@300;400;600;700;800&display=swap');
        *{box-sizing:border-box;}
        @keyframes bounce{0%,80%,100%{transform:scale(0)}40%{transform:scale(1)}}
        @keyframes fadeIn{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}
        input:focus,textarea:focus,select:focus{border-color:rgba(254,44,85,0.5)!important;}
        textarea{resize:vertical;}
        ::-webkit-scrollbar{width:3px;}
        ::-webkit-scrollbar-thumb{background:#fe2c55;border-radius:2px;}
        .dc:hover{background:rgba(254,44,85,0.07)!important;cursor:pointer;}
        .abtn:hover{opacity:0.8;}
      `}</style>

      {/* HEADER */}
      <div style={{background:"linear-gradient(135deg,#0c0c0c,#180a12)",borderBottom:"1px solid rgba(255,255,255,0.06)",padding:"18px 18px 0"}}>
        <div style={{maxWidth:720,margin:"0 auto"}}>
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:14}}>
            <div>
              <span style={{fontSize:19,fontWeight:800}}><span style={{color:"#fe2c55"}}>Creator</span>AI</span>
              <span style={{fontSize:10,background:"rgba(254,44,85,0.15)",color:"#fe2c55",borderRadius:20,padding:"2px 7px",marginLeft:7,fontWeight:600}}>BETA</span>
              <div style={{color:"rgba(255,255,255,0.3)",fontSize:11,marginTop:2}}>Coach algorithmique · TikTok & Instagram</div>
            </div>
            <div style={{display:"flex",gap:7,alignItems:"center"}}>
              <div style={{display:"flex",background:"rgba(255,255,255,0.05)",borderRadius:9,padding:3,gap:3}}>
                {["tiktok","instagram"].map(p=>(
                  <button key={p} onClick={()=>setPlatform(p)} style={{padding:"6px 12px",borderRadius:7,border:"none",cursor:"pointer",fontWeight:700,fontSize:10,background:platform===p?(p==="tiktok"?"#fe2c55":"#833ab4"):"transparent",color:platform===p?"white":"rgba(255,255,255,0.4)",transition:"all 0.2s",fontFamily:"inherit"}}>
                    {p==="tiktok"?"🎵 TikTok":"📸 Insta"}
                  </button>
                ))}
              </div>
              <button onClick={()=>setShowSettings(s=>!s)} style={{width:34,height:34,borderRadius:9,border:"1px solid rgba(255,255,255,0.1)",background:showSettings?"rgba(254,44,85,0.15)":"rgba(255,255,255,0.05)",color:"white",cursor:"pointer",fontSize:15,display:"flex",alignItems:"center",justifyContent:"center"}}>⚙️</button>
            </div>
          </div>

          {/* Settings */}
          {showSettings&&(
            <div style={{background:"rgba(255,255,255,0.04)",border:"1px solid rgba(255,255,255,0.09)",borderRadius:12,padding:14,marginBottom:12,animation:"fadeIn 0.3s ease"}}>
              <div style={{fontSize:11,fontWeight:700,color:"#fe2c55",marginBottom:10,letterSpacing:0.8}}>🔑 METRICOOL API — Paramètres → API dans ton compte</div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8}}>
                {[["User Token",mcToken,setMcToken],["User ID",mcUser,setMcUser],["Blog ID",mcBlog,setMcBlog]].map(([l,v,s])=>(
                  <div key={l}><label style={lbl}>{l.toUpperCase()}</label><input style={{...inp,fontSize:11}} type="text" placeholder={l} value={v} onChange={e=>s(e.target.value)}/></div>
                ))}
              </div>
              <div style={{fontSize:10,color:"rgba(255,255,255,0.25)",marginTop:7}}>Trouve ces infos dans Metricool → Compte → API. Le User Token va dans le header X-Mc-Auth.</div>
            </div>
          )}

          {/* Tabs */}
          <div style={{display:"flex",gap:3,overflowX:"auto"}}>
            {TABS.map(t=>(
              <button key={t.id} onClick={()=>{setTab(t.id);setResult(null);}} style={{padding:"9px 13px",borderRadius:"9px 9px 0 0",border:"none",cursor:"pointer",background:tab===t.id?"rgba(254,44,85,0.14)":"transparent",color:tab===t.id?"#fe2c55":"rgba(255,255,255,0.4)",fontWeight:tab===t.id?700:500,fontSize:11,whiteSpace:"nowrap",borderBottom:tab===t.id?"2px solid #fe2c55":"2px solid transparent",transition:"all 0.2s",fontFamily:"inherit"}}>
                {t.icon} {t.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* TOAST */}
      {toast&&(
        <div style={{position:"fixed",bottom:24,left:"50%",transform:"translateX(-50%)",background:toast.type==="success"?"rgba(37,244,238,0.15)":toast.type==="error"?"rgba(254,44,85,0.15)":"rgba(255,255,255,0.1)",border:`1px solid ${toast.type==="success"?"rgba(37,244,238,0.3)":toast.type==="error"?"rgba(254,44,85,0.3)":"rgba(255,255,255,0.15)"}`,borderRadius:11,padding:"11px 18px",fontSize:13,fontWeight:600,color:"white",zIndex:1000,animation:"fadeIn 0.3s ease",whiteSpace:"nowrap",backdropFilter:"blur(8px)"}}>
          {toast.msg}
        </div>
      )}

      <div style={{maxWidth:720,margin:"0 auto",padding:"22px 15px 0"}}>

        {/* ═══════ CALENDAR ═══════ */}
        {tab==="calendar"&&(
          <div style={{animation:"fadeIn 0.4s ease"}}>
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:16}}>
              <h2 style={{fontSize:17,fontWeight:800,margin:0}}>📅 Calendrier éditorial</h2>
              <div style={{display:"flex",gap:7,alignItems:"center"}}>
                <button onClick={()=>{if(calMonth===0){setCalMonth(11);setCalYear(y=>y-1);}else setCalMonth(m=>m-1);}} style={{width:28,height:28,borderRadius:7,border:"1px solid rgba(255,255,255,0.1)",background:"rgba(255,255,255,0.05)",color:"white",cursor:"pointer",fontSize:13}}>‹</button>
                <span style={{fontSize:12,fontWeight:700,minWidth:110,textAlign:"center"}}>{MONTHS_FR[calMonth]} {calYear}</span>
                <button onClick={()=>{if(calMonth===11){setCalMonth(0);setCalYear(y=>y+1);}else setCalMonth(m=>m+1);}} style={{width:28,height:28,borderRadius:7,border:"1px solid rgba(255,255,255,0.1)",background:"rgba(255,255,255,0.05)",color:"white",cursor:"pointer",fontSize:13}}>›</button>
              </div>
            </div>

            {/* Grid */}
            <div style={{background:"rgba(255,255,255,0.03)",border:"1px solid rgba(255,255,255,0.07)",borderRadius:14,overflow:"hidden",marginBottom:18}}>
              <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",borderBottom:"1px solid rgba(255,255,255,0.07)"}}>
                {DAYS_FR.map(d=><div key={d} style={{padding:"9px 0",textAlign:"center",fontSize:10,fontWeight:700,color:"rgba(255,255,255,0.3)",letterSpacing:0.5}}>{d}</div>)}
              </div>
              <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)"}}>
                {Array.from({length:firstDay}).map((_,i)=><div key={`e${i}`} style={{minHeight:65,borderRight:"1px solid rgba(255,255,255,0.04)",borderBottom:"1px solid rgba(255,255,255,0.04)"}}/>)}
                {Array.from({length:daysInMonth}).map((_,i)=>{
                  const d=i+1,key=fmtDate(calYear,calMonth,d),dp=posts[key]||[];
                  const isToday=key===todayStr;
                  return(
                    <div key={d} className="dc" onClick={()=>{setSelectedDay(key);setModalEdit(null);setForm({title:"",caption:"",hashtags:"",platform:"TikTok",hour:"12:00",mediaUrl:""});setShowModal(true);}}
                      style={{minHeight:65,padding:"5px 4px",borderRight:"1px solid rgba(255,255,255,0.04)",borderBottom:"1px solid rgba(255,255,255,0.04)",background:isToday?"rgba(254,44,85,0.04)":"transparent",transition:"background 0.15s"}}>
                      <div style={{fontSize:11,fontWeight:isToday?800:500,color:isToday?"#fe2c55":"rgba(255,255,255,0.55)",marginBottom:3,width:19,height:19,borderRadius:"50%",display:"flex",alignItems:"center",justifyContent:"center",background:isToday?"rgba(254,44,85,0.18)":"transparent"}}>{d}</div>
                      {dp.slice(0,2).map(p=>(
                        <div key={p.id} style={{background:PLATFORM_COLORS[p.platform]+"28",border:`1px solid ${PLATFORM_COLORS[p.platform]}38`,borderRadius:3,padding:"1px 4px",fontSize:8,fontWeight:600,color:PLATFORM_COLORS[p.platform],whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis",marginBottom:2}}>
                          {p.synced?"✅":"⏰"} {p.hour} {(p.title||"").slice(0,8)}{(p.title||"").length>8?"…":""}
                        </div>
                      ))}
                      {dp.length>2&&<div style={{fontSize:8,color:"rgba(255,255,255,0.3)",paddingLeft:2}}>+{dp.length-2}</div>}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Upcoming list */}
            <div style={{fontSize:11,fontWeight:700,color:"rgba(255,255,255,0.35)",letterSpacing:1,marginBottom:11}}>📋 PUBLICATIONS PROGRAMMÉES</div>
            {allPosts.length===0?(
              <div style={{textAlign:"center",padding:"28px 0",color:"rgba(255,255,255,0.2)",fontSize:13}}>Clique sur un jour pour programmer un post 👆</div>
            ):(
              <div style={{display:"flex",flexDirection:"column",gap:10}}>
                {allPosts.map(post=>(
                  <div key={post.id} style={{background:"rgba(255,255,255,0.04)",border:"1px solid rgba(255,255,255,0.08)",borderRadius:13,padding:"13px 15px",animation:"fadeIn 0.3s ease"}}>
                    <div style={{display:"flex",gap:10,alignItems:"flex-start"}}>
                      <div style={{flex:1,minWidth:0}}>
                        <div style={{display:"flex",alignItems:"center",gap:7,marginBottom:5,flexWrap:"wrap"}}>
                          <span style={{background:PLATFORM_COLORS[post.platform]+"22",color:PLATFORM_COLORS[post.platform],border:`1px solid ${PLATFORM_COLORS[post.platform]}38`,borderRadius:5,padding:"2px 7px",fontSize:10,fontWeight:700}}>{post.platform}</span>
                          <span style={{fontSize:11,color:"rgba(255,255,255,0.45)"}}>📅 {post.date} · {post.hour}</span>
                          {post.synced&&<span style={{fontSize:10,color:"#25f4ee",fontWeight:700}}>✅ Sync Metricool</span>}
                        </div>
                        <div style={{fontWeight:700,fontSize:13,marginBottom:2}}>{post.title||"Sans titre"}</div>
                        {post.caption&&<div style={{fontSize:11,color:"rgba(255,255,255,0.45)",lineHeight:1.5,marginBottom:3}}>{post.caption.slice(0,90)}{post.caption.length>90?"…":""}</div>}
                        {post.hashtags&&<div style={{fontSize:10,color:"#833ab4"}}>{post.hashtags.slice(0,55)}{post.hashtags.length>55?"…":""}</div>}
                      </div>
                      <div style={{display:"flex",flexDirection:"column",gap:5,flexShrink:0}}>
                        <button className="abtn" onClick={()=>openEdit(post)} style={{padding:"5px 10px",borderRadius:7,border:"1px solid rgba(255,255,255,0.1)",background:"rgba(255,255,255,0.05)",color:"white",cursor:"pointer",fontSize:10,fontWeight:600,fontFamily:"inherit",transition:"all 0.15s",whiteSpace:"nowrap"}}>✏️ Éditer</button>
                        <button className="abtn" onClick={()=>sendToMetricool(post)} style={{padding:"5px 10px",borderRadius:7,border:"none",background:post.synced?"rgba(37,244,238,0.15)":"rgba(254,44,85,0.75)",color:"white",cursor:"pointer",fontSize:10,fontWeight:600,fontFamily:"inherit",transition:"all 0.15s",whiteSpace:"nowrap"}}>{post.synced?"🔄 Re-sync":"📡 Metricool"}</button>
                        <button className="abtn" onClick={()=>analyzePost(post)} disabled={analyzingId===post.id} style={{padding:"5px 10px",borderRadius:7,border:"none",background:"rgba(131,58,180,0.55)",color:"white",cursor:"pointer",fontSize:10,fontWeight:600,fontFamily:"inherit",transition:"all 0.15s",opacity:analyzingId===post.id?0.5:1,whiteSpace:"nowrap"}}>{analyzingId===post.id?"⏳ IA...":"🤖 Analyser"}</button>
                        <button className="abtn" onClick={()=>delPost(post.date,post.id)} style={{padding:"5px 10px",borderRadius:7,border:"1px solid rgba(254,44,85,0.2)",background:"transparent",color:"rgba(254,44,85,0.65)",cursor:"pointer",fontSize:10,fontFamily:"inherit",transition:"all 0.15s",whiteSpace:"nowrap"}}>🗑️ Suppr</button>
                      </div>
                    </div>

                    {/* Inline AI result */}
                    {post.analysis&&(
                      <div style={{marginTop:11,borderTop:"1px solid rgba(255,255,255,0.07)",paddingTop:11,animation:"fadeIn 0.4s ease"}}>
                        <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:8}}>
                          <ScoreRing score={post.analysis.score||0} size={50}/>
                          <div style={{flex:1}}>
                            <div style={{fontWeight:700,fontSize:12,marginBottom:3}}>{post.analysis.verdict}</div>
                            {post.analysis.monetizationTip&&<div style={{fontSize:11,color:"#fcb045"}}>💰 {post.analysis.monetizationTip}</div>}
                          </div>
                          {post.analysis.viralScore!==undefined&&<div style={{textAlign:"center"}}><ScoreRing score={post.analysis.viralScore} size={42} color="#25f4ee"/><div style={{fontSize:9,color:"rgba(255,255,255,0.3)",marginTop:1}}>VIRAL</div></div>}
                        </div>
                        {post.analysis.suggestedCaption&&<div style={{background:"rgba(37,244,238,0.06)",border:"1px solid rgba(37,244,238,0.12)",borderRadius:8,padding:"7px 10px",fontSize:11,color:"rgba(255,255,255,0.7)",lineHeight:1.5,marginBottom:7}}><span style={{color:"#25f4ee",fontWeight:600}}>✍️</span> {post.analysis.suggestedCaption}</div>}
                        {post.analysis.suggestedHashtags&&<div style={{fontSize:10,color:"#c084fc",marginBottom:7}}>🏷️ {post.analysis.suggestedHashtags}</div>}
                        {post.analysis.actions?.slice(0,2).map((a,i)=>(
                          <div key={i} style={{display:"flex",gap:7,alignItems:"flex-start",marginBottom:4}}>
                            <Badge priority={a.priority}/><span style={{fontSize:11,color:"rgba(255,255,255,0.6)"}}>{a.action}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ═══════ ANALYZE ═══════ */}
        {tab==="analyze"&&(
          <div style={{animation:"fadeIn 0.4s ease"}}>
            <h2 style={{fontSize:17,fontWeight:800,margin:"0 0 3px"}}>🔍 Analyse ta vidéo</h2>
            <p style={{color:"rgba(255,255,255,0.35)",fontSize:12,margin:"0 0 16px"}}>L'IA note ta vidéo et te dit exactement ce qui cloche</p>
            <div style={{display:"flex",flexDirection:"column",gap:11}}>
              <div><label style={lbl}>TITRE</label><input style={inp} placeholder="Ex: Ma journée à Paris 🗼" value={fd.title} onChange={e=>f("title",e.target.value)}/></div>
              <div><label style={lbl}>DESCRIPTION / CAPTION</label><textarea style={{...inp,minHeight:72}} placeholder="Ta description complète…" value={fd.description} onChange={e=>f("description",e.target.value)}/></div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:9}}>
                <div><label style={lbl}>HASHTAGS</label><input style={inp} placeholder="#vlog #lifestyle…" value={fd.hashtags} onChange={e=>f("hashtags",e.target.value)}/></div>
                <div><label style={lbl}>DURÉE (sec)</label><input style={inp} type="number" placeholder="60" value={fd.duration} onChange={e=>f("duration",e.target.value)}/></div>
              </div>
              {Btn(loading?"Analyse…":"⚡ Analyser avec l'IA",()=>callAI(`Analyse cette vidéo ${platform} vlog/lifestyle :\nTitre : "${fd.title}"\nDescription : "${fd.description}"\nHashtags : "${fd.hashtags}"\nDurée : ${fd.duration}s\nOptimise aussi caption et hashtags.`),!loading&&!!fd.title)}
            </div>
            {loading&&<Dots/>}{error&&<div style={{marginTop:14,padding:12,background:"rgba(254,44,85,0.1)",border:"1px solid rgba(254,44,85,0.22)",borderRadius:9,color:"#fe2c55",fontSize:12,textAlign:"center"}}>⚠️ {error}</div>}
            <ResultCard result={result}/>
          </div>
        )}

        {/* ═══════ VIRAL ═══════ */}
        {tab==="viral"&&(
          <div style={{animation:"fadeIn 0.4s ease"}}>
            <h2 style={{fontSize:17,fontWeight:800,margin:"0 0 3px"}}>🔥 Idées virales</h2>
            <p style={{color:"rgba(255,255,255,0.35)",fontSize:12,margin:"0 0 16px"}}>L'IA génère des idées taillées pour l'algorithme {platform}</p>
            <div style={{display:"flex",flexDirection:"column",gap:11}}>
              <div><label style={lbl}>TON UNIVERS / NICHE</label><input style={inp} placeholder="Ex: lifestyle étudiant Paris, travel solo, routine matinale…" value={fd.viralTheme} onChange={e=>f("viralTheme",e.target.value)}/></div>
              {Btn(loading?"Génération…":"🔥 Générer des idées virales",()=>callAI(`Génère des idées de contenu viral pour un créateur vlog/lifestyle sur ${platform.toUpperCase()}.\nThème : "${fd.viralTheme||"vlog lifestyle quotidien"}".\nDonne les meilleures idées avec caption et hashtags pour chaque.`),!loading)}
            </div>
            {loading&&<Dots/>}{error&&<div style={{marginTop:14,padding:12,background:"rgba(254,44,85,0.1)",border:"1px solid rgba(254,44,85,0.22)",borderRadius:9,color:"#fe2c55",fontSize:12,textAlign:"center"}}>⚠️ {error}</div>}
            <ResultCard result={result}/>
          </div>
        )}

        {/* ═══════ OPTIMIZE ═══════ */}
        {tab==="optimize"&&(
          <div style={{animation:"fadeIn 0.4s ease"}}>
            <h2 style={{fontSize:17,fontWeight:800,margin:"0 0 3px"}}>✨ Titre & Miniature</h2>
            <p style={{color:"rgba(255,255,255,0.35)",fontSize:12,margin:"0 0 16px"}}>Un bon titre = 3× plus de clics</p>
            <div style={{display:"flex",flexDirection:"column",gap:11}}>
              <div><label style={lbl}>TITRE ACTUEL</label><input style={inp} placeholder="Ex: vlog quotidien #23" value={fd.optTitle} onChange={e=>f("optTitle",e.target.value)}/></div>
              <div><label style={lbl}>CONTEXTE DE LA VIDÉO</label><textarea style={{...inp,minHeight:68}} placeholder="Décris le contenu en 2-3 phrases…" value={fd.optCtx} onChange={e=>f("optCtx",e.target.value)}/></div>
              {Btn(loading?"Optimisation…":"✨ Optimiser",()=>callAI(`Optimise ce titre pour ${platform} vlog/lifestyle :\nTitre : "${fd.optTitle}"\nContexte : "${fd.optCtx}"\nDonne un score, des versions améliorées, des conseils miniature, caption et hashtags optimisés.`),!loading&&!!fd.optTitle)}
            </div>
            {loading&&<Dots/>}{error&&<div style={{marginTop:14,padding:12,background:"rgba(254,44,85,0.1)",border:"1px solid rgba(254,44,85,0.22)",borderRadius:9,color:"#fe2c55",fontSize:12,textAlign:"center"}}>⚠️ {error}</div>}
            <ResultCard result={result}/>
          </div>
        )}

        {/* ═══════ MONETIZE ═══════ */}
        {tab==="monetize"&&(
          <div style={{animation:"fadeIn 0.4s ease"}}>
            <h2 style={{fontSize:17,fontWeight:800,margin:"0 0 3px"}}>💰 Monétisation</h2>
            <p style={{color:"rgba(255,255,255,0.35)",fontSize:12,margin:"0 0 16px"}}>Transforme tes vues en revenus réels</p>
            <div style={{display:"flex",flexDirection:"column",gap:11}}>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:9}}>
                <div><label style={lbl}>FOLLOWERS</label><input style={inp} type="number" placeholder="5000" value={fd.mFoll} onChange={e=>f("mFoll",e.target.value)}/></div>
                <div><label style={lbl}>VUES MOYENNES</label><input style={inp} type="number" placeholder="10000" value={fd.mViews} onChange={e=>f("mViews",e.target.value)}/></div>
              </div>
              <div><label style={lbl}>OBJECTIF</label>
                <select style={{...inp,cursor:"pointer"}} value={fd.mGoal} onChange={e=>f("mGoal",e.target.value)}>
                  <option value="brand deals">🤝 Partenariats / Brand deals</option>
                  <option value="produits digitaux">📦 Vendre des produits</option>
                  <option value="fonds createurs">💸 Fonds créateurs TikTok/Meta</option>
                  <option value="affiliation">🔗 Affiliation</option>
                  <option value="coaching">🎓 Coaching / Services</option>
                </select>
              </div>
              {Btn(loading?"Analyse…":"💰 Obtenir ma stratégie",()=>callAI(`Stratégie de monétisation pour vlog/lifestyle sur ${platform.toUpperCase()} :\nFollowers : ${fd.mFoll}\nVues moyennes : ${fd.mViews}\nObjectif : ${fd.mGoal}\nDonne un score de monétisabilité et un plan d'action concret.`),!loading,"#fcb045")}
            </div>
            {loading&&<Dots/>}{error&&<div style={{marginTop:14,padding:12,background:"rgba(254,44,85,0.1)",border:"1px solid rgba(254,44,85,0.22)",borderRadius:9,color:"#fe2c55",fontSize:12,textAlign:"center"}}>⚠️ {error}</div>}
            <ResultCard result={result}/>
          </div>
        )}
      </div>

      {/* ═══════ MODAL Add/Edit Post ═══════ */}
      {showModal&&(
        <div onClick={()=>{setShowModal(false);setModalEdit(null);}} style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.8)",zIndex:500,display:"flex",alignItems:"flex-end",justifyContent:"center",backdropFilter:"blur(6px)"}}>
          <div onClick={e=>e.stopPropagation()} style={{background:"#111",border:"1px solid rgba(255,255,255,0.1)",borderRadius:"18px 18px 0 0",padding:"22px 18px 30px",width:"100%",maxWidth:720,animation:"fadeIn 0.3s ease",maxHeight:"88vh",overflowY:"auto"}}>
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:16}}>
              <div>
                <div style={{fontWeight:800,fontSize:15}}>{modalEdit?"✏️ Modifier le post":"➕ Nouveau post"}</div>
                <div style={{fontSize:11,color:"rgba(255,255,255,0.35)",marginTop:1}}>📅 {selectedDay}</div>
              </div>
              <button onClick={()=>{setShowModal(false);setModalEdit(null);}} style={{width:30,height:30,borderRadius:7,border:"1px solid rgba(255,255,255,0.1)",background:"rgba(255,255,255,0.05)",color:"white",cursor:"pointer",fontSize:15}}>✕</button>
            </div>
            <div style={{display:"flex",flexDirection:"column",gap:11}}>
              <div><label style={lbl}>TITRE / ACCROCHE</label><input style={inp} placeholder="Ex: Ma routine matinale 🌅" value={form.title} onChange={e=>ff("title",e.target.value)}/></div>
              <div><label style={lbl}>CAPTION</label><textarea style={{...inp,minHeight:75}} placeholder="Ton texte de publication…" value={form.caption} onChange={e=>ff("caption",e.target.value)}/></div>
              <div><label style={lbl}>HASHTAGS</label><input style={inp} placeholder="#vlog #lifestyle #fyp…" value={form.hashtags} onChange={e=>ff("hashtags",e.target.value)}/></div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:9}}>
                <div><label style={lbl}>PLATEFORME</label>
                  <select style={{...inp,cursor:"pointer"}} value={form.platform} onChange={e=>ff("platform",e.target.value)}>
                    {PLATFORMS_POST.map(p=><option key={p}>{p}</option>)}
                  </select>
                </div>
                <div><label style={lbl}>HEURE</label>
                  <select style={{...inp,cursor:"pointer"}} value={form.hour} onChange={e=>ff("hour",e.target.value)}>
                    {HOURS.map(h=><option key={h}>{h}</option>)}
                  </select>
                </div>
              </div>
              <div><label style={lbl}>URL MÉDIA (optionnel)</label><input style={inp} placeholder="https://… (image ou vidéo publique)" value={form.mediaUrl} onChange={e=>ff("mediaUrl",e.target.value)}/></div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:9,marginTop:4}}>
                {Btn("💾 Enregistrer",savePost,!!form.title)}
                {Btn("📡 Sauver + Metricool",()=>{
                  const key=selectedDay;
                  const obj={id:modalEdit?modalEdit.id:Date.now(),date:key,...form,synced:false,analysis:modalEdit?.analysis||null};
                  setPosts(prev=>{const ex=prev[key]||[];return{...prev,[key]:modalEdit?ex.map(p=>p.id===modalEdit.id?obj:p):[...ex,obj]};});
                  setShowModal(false);setModalEdit(null);
                  setTimeout(()=>sendToMetricool(obj),200);
                },!!form.title,"#25f4ee")}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
