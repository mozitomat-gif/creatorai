import { useState, useEffect } from "react";

const GROQ_API = "https://api.groq.com/openai/v1/chat/completions";
const GROQ_KEY = import.meta.env.VITE_GROQ_API_KEY;
const MODEL = "llama-3.3-70b-versatile";
const STORAGE_KEY = "creatorai_videos_v1";

const SYSTEM_VIDEO = `Tu es un expert en stratégie de contenu TikTok et Instagram Reels pour un créateur qui vit en van aménagé, est télépilote FPV drone freestyle, et filme ses voyages.
Types : 🚐 Van/Camion, 🏔️ Paysages, 🚁 FPV Drone (Run / Multiclip / Montage).

RÈGLES ABSOLUES :
1. Tu reçois des infos contextuelles. Tu NE recopies JAMAIS ce que le créateur a écrit. Tu digères, tu réinterprètes, tu crées quelque chose de nouveau.
2. Le caption doit sembler écrit par un humain, pas généré par une IA. Naturel, authentique, direct.
3. Varie TOUJOURS le style — jamais deux fois le même format.

CAPTION (le seul texte publié, pas de titre séparé sur TikTok/Reels) :
- Naturel, comme si tu parlais à tes abonnés
- Style varié : parfois une question, parfois une phrase courte mystérieuse, parfois POV, parfois factuel, parfois une émotion brute, parfois un chiffre ou détail concret
- Adjectifs modérés OK, jamais de superlatifs exagérés
- Accroche forte sur la première ligne
- JAMAIS un résumé ou récit de la description fournie — digère et réinterprète

HASHTAGS :
- 20-25 hashtags ciblés et variés
- Le drone utilisé peut apparaître subtilement et rarement, jamais systématiquement
- Priorité aux hashtags de niche performants

Réponds UNIQUEMENT en JSON pur sans backticks :
{
  "captionOption1": "<caption style court/mystérieux/question — max 2 lignes>",
  "captionOption2": "<caption style lifestyle/POV/factuel — 3-4 lignes>",
  "caption": "<le meilleur des deux selon le contenu>",
  "contentType": "<Van/Camion 🚐|Paysages 🏔️|FPV Drone 🚁>",
  "fpvSubtype": "<Run|Multiclip|Montage|null>",
  "thread": "<fil rouge détecté ex: FPV Chronicles|Build Van Serie|Road Trip Alps|Vie en Van>",
  "score": <0-100>,
  "viralScore": <0-100>,
  "verdict": "<emoji + verdict court>",
  "bestDay": "<Lundi|Mardi|Mercredi|Jeudi|Vendredi|Samedi|Dimanche>",
  "bestTime": "<HH:MM>",
  "priority": <1-10>,
  "hashtags": "<20-25 hashtags optimisés>",
  "tip": "<conseil algo court>",
  "monetizationTip": "<conseil monétisation court>"
}`

const SYSTEM_SCHEDULE = `Tu es un expert en stratégie éditoriale TikTok et Instagram Reels pour un créateur van/FPV/paysages.
Tu reçois une liste de vidéos analysées. Programme de publication optimal EN JSON pur sans backticks :
{
  "strategy": "<stratégie globale courte>",
  "threads": [{"name":"<fil rouge>","color":"<hex>","count":<nb>}],
  "week": [{"day":"<jour>","posts":[{"videoId":"<id>","platform":"<TikTok|Instagram Reels>","time":"<HH:MM>","reason":"<pourquoi>"}]}]
}
Trie par priorité, alterne les types, plus de paysages. Max 7 posts/semaine.`;

const SYSTEM_AI = `Tu es expert TikTok/Instagram Reels pour créateur van/FPV/paysages.
JSON pur sans backticks :
{
  "score":<0-100>,"verdict":"<emoji verdict>","contentType":"<Van/Camion 🚐|Paysages 🏔️|FPV Drone 🚁>",
  "points":[{"icon":"<e>","label":"<l>","text":"<t>"}],
  "actions":[{"priority":"haute|moyenne|basse","action":"<a>"}],
  "viralScore":<0-100>,"monetizationTip":"<conseil>",
  "suggestedCaption":"<caption>","suggestedHashtags":"<hashtags>"
}`;

const TABS = [
  {id:"videos",label:"Mes Vidéos",icon:"🎬"},
  {id:"schedule",label:"Programme",icon:"📅"},
  {id:"analyze",label:"Analyser",icon:"🔍"},
  {id:"viral",label:"Idées",icon:"🔥"},
  {id:"monetize",label:"Monétisation",icon:"💰"},
];

const TYPE_COLORS = {
  "Van/Camion 🚐":"#a78bfa",
  "Paysages 🏔️":"#38bdf8",
  "FPV Drone 🚁":"#f472b6",
};
const FPV_SUBTYPES = ["Run","Multiclip","Montage"];
const STATUS_CFG = {
  "en attente":{color:"#fbbf24",label:"⏳ En attente"},
  "programmé":{color:"#38bdf8",label:"📅 Programmé"},
  "publié":{color:"#4ade80",label:"✅ Publié"},
};
const DAYS = ["Lundi","Mardi","Mercredi","Jeudi","Vendredi","Samedi","Dimanche"];

// Guided description fields per type
const DESC_FIELDS = {
  "Paysages 🏔️": [
    {key:"lieu",label:"Lieu",placeholder:"Ex: Gorges de l'Ardèche, Col du Galibier..."},
    {key:"ambiance",label:"Ambiance / Lumière",placeholder:"Ex: coucher de soleil, brume matinale, ciel étoilé..."},
    {key:"emotion",label:"Émotion / Moment",placeholder:"Ex: sentiment de liberté, silence total, réveil dans le van..."},
  ],
  "Van/Camion 🚐": [
    {key:"sujet",label:"Sujet principal",placeholder:"Ex: installation du toit ouvrant, aménagement cuisine..."},
    {key:"etape",label:"Étape / Épisode",placeholder:"Ex: épisode 3 du build, semaine 2 sur la route..."},
    {key:"lieu",label:"Lieu",placeholder:"Ex: parking en montagne, bord de mer..."},
    {key:"ambiance",label:"Ambiance / Moment",placeholder:"Ex: vie quotidienne, travaux, détente, réveil..."},
    {key:"message",label:"Message / Anecdote",placeholder:"Ex: astuce gain de place, moment inattendu, galère du jour..."},
  ],
  "FPV Drone 🚁": [
    {key:"lieu",label:"Lieu / Spot",placeholder:"Ex: forêt de pins Ardèche, falaises Verdon, montagne..."},
    {key:"ambiance",label:"Ambiance / Lumière",placeholder:"Ex: golden hour, ombre et lumière, brume, nuit..."},
    {key:"drone",label:"Drone utilisé",placeholder:"Ex: 5 pouces freestyle, cinewhoop, drone stabilisé..."},
  ],
}

// ─── COMPONENTS ───────────────────────────────────────────────────────────────
function ScoreRing({score,size=72,color="#a78bfa"}) {
  const r=(size-8)/2,circ=2*Math.PI*r,offset=circ-(score/100)*circ;
  return (
    <svg width={size} height={size} style={{transform:"rotate(-90deg)",flexShrink:0}}>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="5"/>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth="5"
        strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round"
        style={{transition:"stroke-dashoffset 1s ease"}}/>
      <text x="50%" y="50%" textAnchor="middle" dominantBaseline="middle"
        style={{transform:"rotate(90deg)",transformOrigin:"center",fill:"#1a1a2e",fontSize:size*0.24,fontWeight:800,fontFamily:"inherit"}}>
        {score}
      </text>
    </svg>
  );
}

function CopyBtn({text}) {
  const [ok,setOk]=useState(false);
  return (
    <button onClick={()=>{navigator.clipboard?.writeText(text);setOk(true);setTimeout(()=>setOk(false),2000);}}
      style={{padding:"3px 9px",borderRadius:6,border:"1px solid rgba(167,139,250,0.3)",background:"rgba(167,139,250,0.08)",color:ok?"#16a34a":"#7c3aed",cursor:"pointer",fontSize:10,fontFamily:"inherit",transition:"all 0.2s",whiteSpace:"nowrap"}}>
      {ok?"✅":"📋"}
    </button>
  );
}

function Dots() {
  return (
    <div style={{display:"flex",gap:6,alignItems:"center",justifyContent:"center",padding:"32px 0"}}>
      {[0,1,2].map(i=><div key={i} style={{width:8,height:8,borderRadius:"50%",background:"#7c3aed",animation:`bounce 1.2s ease-in-out ${i*0.2}s infinite`}}/>)}
    </div>
  );
}

function Tag({label,color}) {
  return <span style={{background:color+"22",color,border:`1px solid ${color}55`,borderRadius:5,padding:"2px 8px",fontSize:10,fontWeight:700,whiteSpace:"nowrap"}}>{label}</span>;
}

function AIResult({result}) {
  if (!result) return null;
  const tc=TYPE_COLORS[result.contentType]||"#a78bfa";
  return (
    <div style={{marginTop:20,animation:"fadeIn 0.5s ease"}}>
      <div style={{background:"rgba(167,139,250,0.07)",border:"1px solid rgba(167,139,250,0.15)",borderRadius:14,padding:16,display:"flex",gap:14,alignItems:"center",marginBottom:12}}>
        <ScoreRing score={result.score||0}/>
        <div style={{flex:1}}>
          <div style={{fontSize:15,fontWeight:800,marginBottom:5}}>{result.verdict}</div>
          {result.contentType&&<Tag label={result.contentType} color={tc}/>}
          {result.monetizationTip&&<div style={{marginTop:8,background:"rgba(251,191,36,0.08)",border:"1px solid rgba(251,191,36,0.2)",borderRadius:7,padding:"6px 10px",fontSize:11,color:"#fbbf24",lineHeight:1.5}}>💰 {result.monetizationTip}</div>}
        </div>
        {result.viralScore!==undefined&&<div style={{textAlign:"center"}}><ScoreRing score={result.viralScore} size={52} color="#38bdf8"/><div style={{fontSize:9,color:"rgba(26,26,46,0.45)",marginTop:2}}>VIRAL</div></div>}
      </div>
      {result.suggestedCaption&&(
        <div style={{background:"rgba(56,189,248,0.06)",border:"1px solid rgba(56,189,248,0.15)",borderRadius:10,padding:"10px 12px",marginBottom:10}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:5}}>
            <span style={{color:"#38bdf8",fontWeight:700,fontSize:11}}>✍️ Caption</span>
            <CopyBtn text={result.suggestedCaption}/>
          </div>
          <div style={{fontSize:12,color:"rgba(26,26,46,0.8)",lineHeight:1.6}}>{result.suggestedCaption}</div>
        </div>
      )}
      {result.suggestedHashtags&&(
        <div style={{background:"rgba(167,139,250,0.06)",border:"1px solid rgba(167,139,250,0.15)",borderRadius:10,padding:"9px 12px",marginBottom:10}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:4}}>
            <span style={{color:"#a78bfa",fontWeight:700,fontSize:11}}>🏷️ Hashtags</span>
            <CopyBtn text={result.suggestedHashtags}/>
          </div>
          <div style={{fontSize:11,color:"#a78bfa",lineHeight:1.7}}>{result.suggestedHashtags}</div>
        </div>
      )}
      {result.points?.map((p,i)=>(
        <div key={i} style={{background:"rgba(255,255,255,0.9)",border:"1px solid rgba(26,26,46,0.1)",borderRadius:10,padding:"11px 13px",marginBottom:8}}>
          <div style={{display:"flex",gap:8,alignItems:"center",marginBottom:3}}><span style={{fontSize:16}}>{p.icon}</span><span style={{fontWeight:700,fontSize:12}}>{p.label}</span></div>
          <p style={{margin:0,color:"rgba(26,26,46,0.55)",fontSize:11,lineHeight:1.6}}>{p.text}</p>
        </div>
      ))}
      {result.actions?.length>0&&(
        <div style={{background:"rgba(26,26,46,0.03)",border:"1px solid rgba(26,26,46,0.08)",borderRadius:10,overflow:"hidden"}}>
          <div style={{padding:"10px 13px",borderBottom:"1px solid rgba(255,255,255,0.06)",fontSize:10,fontWeight:700,color:"rgba(26,26,46,0.45)",letterSpacing:1}}>⚡ ACTIONS</div>
          {result.actions.map((a,i)=>{
            const pc={haute:"#f472b6",moyenne:"#fbbf24",basse:"#4ade80"}[a.priority]||"#aaa";
            return (
              <div key={i} style={{padding:"10px 13px",borderBottom:i<result.actions.length-1?"1px solid rgba(255,255,255,0.04)":"none",display:"flex",gap:8,alignItems:"flex-start"}}>
                <span style={{background:pc+"18",color:pc,border:`1px solid ${pc}35`,borderRadius:4,padding:"1px 7px",fontSize:9,fontWeight:700,letterSpacing:0.5,whiteSpace:"nowrap",marginTop:1}}>{a.priority.toUpperCase()}</span>
                <span style={{fontSize:12,color:"rgba(26,26,46,0.8)",lineHeight:1.6}}>{a.action}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── ADD VIDEO FORM ────────────────────────────────────────────────────────────
function AddVideoForm({onAdd,onCancel}) {
  const [type,setType]=useState("Paysages 🏔️");
  const [fpvSubtype,setFpvSubtype]=useState("Run");
  const [title,setTitle]=useState("");
  const [fields,setFields]=useState({});

  const isFPV=type==="FPV Drone 🚁";
  const descFields=DESC_FIELDS[type]||[];

  function submit() {
    if (!title) return;
    const description=descFields.map(f=>`${f.label}: ${fields[f.key]||""}`).filter(l=>!l.endsWith(": ")).join(" | ");
    onAdd({title,type,fpvSubtype:isFPV?fpvSubtype:null,description,fields});
  }

  const inp={width:"100%",background:"#ffffff",border:"1px solid rgba(167,139,250,0.2)",borderRadius:9,padding:"10px 12px",color:"#1a1a2e",fontSize:12,outline:"none",boxSizing:"border-box",fontFamily:"inherit"};
  const lbl={color:"rgba(167,139,250,0.6)",fontSize:10,fontWeight:700,letterSpacing:0.8,marginBottom:4,display:"block"};

  return (
    <div style={{background:"rgba(167,139,250,0.06)",border:"1px solid rgba(167,139,250,0.18)",borderRadius:14,padding:16,marginBottom:16,animation:"fadeIn 0.3s ease"}}>
      <div style={{fontSize:12,fontWeight:800,color:"#a78bfa",marginBottom:14,letterSpacing:0.5}}>+ NOUVELLE VIDÉO</div>

      {/* Type selector */}
      <div style={{marginBottom:12}}>
        <label style={lbl}>TYPE DE CONTENU</label>
        <div style={{display:"flex",gap:7}}>
          {["Paysages 🏔️","Van/Camion 🚐","FPV Drone 🚁"].map(t=>(
            <button key={t} onClick={()=>setType(t)} style={{flex:1,padding:"9px 6px",borderRadius:8,border:`1px solid ${type===t?TYPE_COLORS[t]+"60":"rgba(255,255,255,0.08)"}`,background:type===t?TYPE_COLORS[t]+"14":"transparent",color:type===t?TYPE_COLORS[t]:"rgba(255,255,255,0.35)",cursor:"pointer",fontSize:10,fontWeight:700,fontFamily:"inherit",transition:"all 0.2s"}}>
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* FPV subtype */}
      {isFPV&&(
        <div style={{marginBottom:12}}>
          <label style={lbl}>SOUS-TYPE FPV</label>
          <div style={{display:"flex",gap:7}}>
            {FPV_SUBTYPES.map(s=>(
              <button key={s} onClick={()=>setFpvSubtype(s)} style={{flex:1,padding:"8px",borderRadius:8,border:`1px solid ${fpvSubtype===s?"rgba(244,114,182,0.5)":"rgba(255,255,255,0.08)"}`,background:fpvSubtype===s?"rgba(244,114,182,0.12)":"transparent",color:fpvSubtype===s?"#f472b6":"rgba(255,255,255,0.35)",cursor:"pointer",fontSize:11,fontWeight:700,fontFamily:"inherit",transition:"all 0.2s"}}>
                {s==="Run"?"🎯 Run":s==="Multiclip"?"🎬 Multiclip":"🎥 Montage"}
              </button>
            ))}
          </div>
          <div style={{fontSize:10,color:"rgba(26,26,46,0.35)",marginTop:5}}>
            {fpvSubtype==="Run"&&"Vol continu brut, une seule prise, sensations pures"}
            {fpvSubtype==="Multiclip"&&"Plusieurs clips montés ensemble, transitions, musique"}
            {fpvSubtype==="Montage"&&"Vidéo élaborée, storytelling, cinématique"}
          </div>
        </div>
      )}

      {/* Title */}
      <div style={{marginBottom:12}}>
        <label style={lbl}>TITRE DE LA VIDÉO</label>
        <input style={inp} placeholder="Ex: Run FPV Gorges de l'Ardèche" value={title} onChange={e=>setTitle(e.target.value)}/>
      </div>

      {/* Guided description fields */}
      <div style={{marginBottom:14}}>
        <label style={{...lbl,color:"rgba(26,26,46,0.5)",marginBottom:10}}>DESCRIPTION (pour que l'IA génère un meilleur caption)</label>
        <div style={{display:"flex",flexDirection:"column",gap:9}}>
          {descFields.map(field=>(
            <div key={field.key}>
              <label style={lbl}>{field.label.toUpperCase()}</label>
              <input style={inp} placeholder={field.placeholder} value={fields[field.key]||""} onChange={e=>setFields(p=>({...p,[field.key]:e.target.value}))}/>
            </div>
          ))}
        </div>
      </div>

      <div style={{display:"flex",gap:9}}>
        <button onClick={submit} disabled={!title} style={{flex:2,padding:"12px",borderRadius:10,border:"none",cursor:title?"pointer":"not-allowed",background:title?"linear-gradient(135deg,#7c3aed,#2563eb)":"rgba(255,255,255,0.06)",color:"#1a1a2e",fontSize:13,fontWeight:700,fontFamily:"inherit",opacity:title?1:0.5}}>
          🤖 Ajouter & Analyser
        </button>
        <button onClick={onCancel} style={{flex:1,padding:"12px",borderRadius:10,border:"1px solid rgba(26,26,46,0.12)",background:"transparent",color:"rgba(26,26,46,0.5)",cursor:"pointer",fontSize:12,fontFamily:"inherit"}}>
          Annuler
        </button>
      </div>
    </div>
  );
}

// ─── MAIN APP ──────────────────────────────────────────────────────────────────
export default function App() {
  const [tab,setTab]=useState("videos");
  const [videos,setVideos]=useState(()=>{
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY)||"[]"); } catch { return []; }
  });
  const [analyzingId,setAnalyzingId]=useState(null);
  const [expandedId,setExpandedId]=useState(null);
  const [scheduleData,setScheduleData]=useState(null);
  const [schedLoading,setSchedLoading]=useState(false);
  const [expandedDay,setExpandedDay]=useState(null);
  const [aiResult,setAiResult]=useState(null);
  const [aiLoading,setAiLoading]=useState(false);
  const [aiError,setAiError]=useState(null);
  const [showAddForm,setShowAddForm]=useState(false);
  const [filterType,setFilterType]=useState("Tous");
  const [filterThread,setFilterThread]=useState("Tous");
  const [fd,setFd]=useState({title:"",desc:"",hashtags:"",url:"",type:"Paysages 🏔️",ctx:"",mFoll:"",mViews:"",mGoal:"brand deals"});

  // Save to localStorage whenever videos change
  useEffect(()=>{
    try { localStorage.setItem(STORAGE_KEY,JSON.stringify(videos)); } catch {}
  },[videos]);

  const f=(k,v)=>setFd(p=>({...p,[k]:v}));

  async function groq(system,user,maxTokens=1000) {
    const res=await fetch(GROQ_API,{method:"POST",headers:{"Content-Type":"application/json","Authorization":`Bearer ${GROQ_KEY}`},body:JSON.stringify({model:MODEL,max_tokens:maxTokens,messages:[{role:"system",content:system},{role:"user",content:user}]})});
    const data=await res.json();
    const text=data.choices?.[0]?.message?.content||"";
    return JSON.parse(text.replace(/```json|```/g,"").trim());
  }

  async function addVideo({title,type,fpvSubtype,description,fields}) {
    const id=Date.now();
    const vid={id,title,type,fpvSubtype,description,fields,status:"en attente",analysis:null,createdAt:new Date().toISOString()};
    setVideos(p=>[vid,...p]);
    setShowAddForm(false);
    analyzeVideo(id,vid);
  }

  async function analyzeVideo(id,vid) {
    setAnalyzingId(id);
    try {
      const fieldDetails=vid.fields?Object.entries(vid.fields).map(([k,v])=>`${k}: ${v}`).join(", "):"";
      const prompt=`Analyse cette vidéo :\nType : ${vid.type}${vid.fpvSubtype?` (${vid.fpvSubtype})`:""}
Titre : "${vid.title}"
${fieldDetails?`Détails : ${fieldDetails}`:""}
Description : "${vid.description||""}"
Génère un caption complet et optimisé basé sur tous ces éléments.`;
      const analysis=await groq(SYSTEM_VIDEO,prompt,1200);
      setVideos(p=>p.map(v=>v.id===id?{...v,analysis,title:analysis.improvedTitle||v.title}:v));
      setExpandedId(id);
    } catch(e){}
    setAnalyzingId(null);
  }

  async function generateSchedule() {
    const analyzed=videos.filter(v=>v.analysis&&v.status!=="publié");
    if (!analyzed.length){setAiError("Ajoute d'abord des vidéos !");return;}
    setSchedLoading(true);setScheduleData(null);setAiError(null);
    try {
      const list=analyzed.map(v=>({id:v.id,title:v.title,type:v.type,fpvSubtype:v.fpvSubtype,thread:v.analysis?.thread,priority:v.analysis?.priority,bestDay:v.analysis?.bestDay,bestTime:v.analysis?.bestTime}));
      setScheduleData(await groq(SYSTEM_SCHEDULE,`Vidéos : ${JSON.stringify(list)}\nGénère le programme optimal.`,2000));
    } catch(e){setAiError("Erreur génération.");}
    setSchedLoading(false);
  }

  async function callAI(prompt) {
    setAiLoading(true);setAiResult(null);setAiError(null);
    try{setAiResult(await groq(SYSTEM_AI,prompt));}
    catch(e){setAiError("Erreur IA. Réessaie !");}
    setAiLoading(false);
  }

  const threads=[...new Set(videos.filter(v=>v.analysis?.thread).map(v=>v.analysis.thread))];
  const filtered=videos.filter(v=>{
    if(filterType!=="Tous"&&v.type!==filterType)return false;
    if(filterThread!=="Tous"&&v.analysis?.thread!==filterThread)return false;
    return true;
  }).sort((a,b)=>(b.analysis?.priority||0)-(a.analysis?.priority||0));

  const inp={width:"100%",background:"#ffffff",border:"1px solid rgba(167,139,250,0.2)",borderRadius:10,padding:"11px 13px",color:"#1a1a2e",fontSize:13,outline:"none",boxSizing:"border-box",fontFamily:"inherit",transition:"border-color 0.2s"};
  const lbl={color:"rgba(167,139,250,0.7)",fontSize:10,fontWeight:700,letterSpacing:1,marginBottom:5,display:"block"};

  function PrimaryBtn({label,onClick,disabled,color="#a78bfa"}) {
    return <button onClick={onClick} disabled={disabled} style={{width:"100%",padding:"13px",borderRadius:11,border:"none",cursor:disabled?"not-allowed":"pointer",background:disabled?"rgba(255,255,255,0.06)":`linear-gradient(135deg,${color},${color}99)`,color:"#1a1a2e",fontSize:13,fontWeight:700,fontFamily:"inherit",opacity:disabled?0.5:1,transition:"all 0.2s"}}>{label}</button>;
  }

  return (
    <div style={{minHeight:"100vh",background:"#f4f5f9",color:"#1a1a2e",fontFamily:"'Barlow Condensed','Sora',sans-serif",paddingBottom:70}}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@400;600;700;800;900&family=Barlow:wght@400;500;600&display=swap');
        *{box-sizing:border-box;}
        @keyframes bounce{0%,80%,100%{transform:scale(0)}40%{transform:scale(1)}}
        @keyframes fadeIn{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}
        input:focus,textarea:focus,select:focus{border-color:rgba(167,139,250,0.5)!important;}
        textarea{resize:vertical;}
        ::-webkit-scrollbar{width:3px;} ::-webkit-scrollbar-track{background:#f4f5f9;}
        ::-webkit-scrollbar-thumb{background:#7c3aed;border-radius:2px;}
        .vcard:hover{background:rgba(167,139,250,0.08)!important;border-color:rgba(167,139,250,0.3)!important;}
      `}</style>

      {/* HEADER */}
      <div style={{background:"linear-gradient(180deg,#ffffff 0%,#f4f5f9 100%)",borderBottom:"1px solid rgba(167,139,250,0.25)",padding:"16px 16px 0",position:"sticky",top:0,zIndex:100,backdropFilter:"blur(20px)"}}>
        <div style={{maxWidth:720,margin:"0 auto"}}>
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:12}}>
            <div style={{display:"flex",alignItems:"center",gap:10}}>
              <div style={{width:34,height:34,borderRadius:9,background:"linear-gradient(135deg,#7c3aed,#2563eb)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:17,fontWeight:900,boxShadow:"0 0 18px rgba(124,58,237,0.4)"}}>C</div>
              <div>
                <div style={{fontSize:17,fontWeight:900,letterSpacing:0.5,lineHeight:1}}>
                  <span style={{color:"#a78bfa"}}>Creator</span><span style={{color:"#1a1a2e"}}>AI</span>
                  <span style={{fontSize:9,background:"rgba(167,139,250,0.15)",color:"#a78bfa",borderRadius:20,padding:"2px 6px",marginLeft:6,fontWeight:700}}>BETA</span>
                </div>
                <div style={{color:"rgba(26,26,46,0.35)",fontSize:9,letterSpacing:0.5}}>🚐 VAN · 🏔️ PAYSAGES · 🚁 FPV</div>
              </div>
            </div>
            <div style={{display:"flex",gap:5,alignItems:"center"}}>
              {videos.length>0&&<div style={{fontSize:10,color:"rgba(26,26,46,0.45)",background:"#ffffff",borderRadius:6,padding:"3px 8px"}}>{videos.length} vidéo{videos.length>1?"s":""} 💾</div>}
              <div style={{padding:"4px 8px",borderRadius:6,background:"rgba(244,114,182,0.1)",color:"#f472b6",fontSize:9,fontWeight:700,border:"1px solid rgba(244,114,182,0.2)"}}>TIKTOK</div>
              <div style={{padding:"4px 8px",borderRadius:6,background:"rgba(167,139,250,0.1)",color:"#a78bfa",fontSize:9,fontWeight:700,border:"1px solid rgba(167,139,250,0.2)"}}>REELS</div>
            </div>
          </div>
          <div style={{display:"flex",gap:2,overflowX:"auto"}}>
            {TABS.map(t=>(
              <button key={t.id} onClick={()=>{setTab(t.id);setAiResult(null);setAiError(null);}} style={{padding:"9px 11px",borderRadius:"8px 8px 0 0",border:"none",cursor:"pointer",background:tab===t.id?"rgba(167,139,250,0.15)":"transparent",color:tab===t.id?"#a78bfa":"rgba(255,255,255,0.3)",fontWeight:tab===t.id?800:500,fontSize:11,whiteSpace:"nowrap",borderBottom:tab===t.id?"2px solid #a78bfa":"2px solid transparent",fontFamily:"inherit",letterSpacing:0.3,transition:"all 0.2s"}}>
                {t.icon} {t.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div style={{maxWidth:720,margin:"0 auto",padding:"20px 14px 0"}}>

        {/* ═══ MES VIDÉOS ═══ */}
        {tab==="videos"&&(
          <div style={{animation:"fadeIn 0.4s ease"}}>
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:14}}>
              <div>
                <h2 style={{fontSize:19,fontWeight:900,margin:"0 0 2px",letterSpacing:0.5}}>🎬 Mes Vidéos</h2>
                <p style={{color:"rgba(26,26,46,0.4)",fontSize:10,margin:0}}>Sauvegardées localement · {videos.filter(v=>v.status==="en attente").length} en attente</p>
              </div>
              {!showAddForm&&(
                <button onClick={()=>setShowAddForm(true)} style={{padding:"9px 16px",borderRadius:9,border:"none",cursor:"pointer",background:"linear-gradient(135deg,#7c3aed,#2563eb)",color:"#1a1a2e",fontSize:12,fontWeight:700,fontFamily:"inherit",boxShadow:"0 4px 15px rgba(124,58,237,0.3)"}}>
                  + Ajouter
                </button>
              )}
            </div>

            {showAddForm&&<AddVideoForm onAdd={addVideo} onCancel={()=>setShowAddForm(false)}/>}

            {/* Filters */}
            {videos.length>0&&(
              <div style={{display:"flex",gap:5,marginBottom:12,overflowX:"auto",paddingBottom:2}}>
                {["Tous","Paysages 🏔️","Van/Camion 🚐","FPV Drone 🚁"].map(t=>(
                  <button key={t} onClick={()=>setFilterType(t)} style={{padding:"4px 10px",borderRadius:6,border:`1px solid ${filterType===t?"rgba(167,139,250,0.4)":"rgba(255,255,255,0.07)"}`,background:filterType===t?"rgba(167,139,250,0.1)":"transparent",color:filterType===t?"#a78bfa":"rgba(255,255,255,0.3)",cursor:"pointer",fontSize:9,fontWeight:700,fontFamily:"inherit",whiteSpace:"nowrap",flexShrink:0}}>
                    {t}
                  </button>
                ))}
                {threads.map(th=>(
                  <button key={th} onClick={()=>setFilterThread(filterThread===th?"Tous":th)} style={{padding:"4px 10px",borderRadius:6,border:`1px solid ${filterThread===th?"rgba(56,189,248,0.4)":"rgba(255,255,255,0.07)"}`,background:filterThread===th?"rgba(56,189,248,0.1)":"transparent",color:filterThread===th?"#38bdf8":"rgba(255,255,255,0.3)",cursor:"pointer",fontSize:9,fontWeight:700,fontFamily:"inherit",whiteSpace:"nowrap",flexShrink:0}}>
                    🧵 {th}
                  </button>
                ))}
              </div>
            )}

            {filtered.length===0&&!showAddForm&&(
              <div style={{textAlign:"center",padding:"40px 20px",color:"rgba(26,26,46,0.25)"}}>
                <div style={{fontSize:38,marginBottom:10}}>🎬</div>
                <div style={{fontSize:13,fontWeight:700,marginBottom:5}}>Aucune vidéo</div>
                <div style={{fontSize:11}}>Clique sur "+ Ajouter" pour commencer</div>
              </div>
            )}

            <div style={{display:"flex",flexDirection:"column",gap:10}}>
              {filtered.map(video=>{
                const tc=TYPE_COLORS[video.type]||"#a78bfa";
                const sc=STATUS_CFG[video.status]?.color||"#fbbf24";
                const isExp=expandedId===video.id;
                const isAn=analyzingId===video.id;
                return (
                  <div key={video.id} className="vcard" style={{background:"rgba(255,255,255,0.9)",border:"1px solid rgba(26,26,46,0.1)",borderRadius:13,overflow:"hidden",transition:"all 0.2s"}}>
                    <div style={{padding:"13px 14px"}}>
                      <div style={{display:"flex",gap:10,alignItems:"flex-start",marginBottom:10}}>
                        <div style={{width:42,height:42,borderRadius:9,background:`${tc}14`,border:`1px solid ${tc}25`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:19,flexShrink:0}}>
                          {video.type?.split(" ")[1]||"🎬"}
                        </div>
                        <div style={{flex:1,minWidth:0}}>
                          <div style={{fontSize:13,fontWeight:800,marginBottom:5,lineHeight:1.3}}>{video.title}</div>
                          <div style={{display:"flex",gap:5,flexWrap:"wrap"}}>
                            <Tag label={video.type} color={tc}/>
                            {video.fpvSubtype&&<Tag label={`🎯 ${video.fpvSubtype}`} color="#f472b6"/>}
                            <Tag label={STATUS_CFG[video.status]?.label||video.status} color={sc}/>
                            {video.analysis?.thread&&<Tag label={`🧵 ${video.analysis.thread}`} color="#38bdf8"/>}
                            {video.analysis?.priority&&<Tag label={`⚡ ${video.analysis.priority}/10`} color="#fbbf24"/>}
                          </div>
                        </div>
                        {video.analysis&&<ScoreRing score={video.analysis.score||0} size={44} color={tc}/>}
                      </div>

                      {video.analysis?.bestDay&&(
                        <div style={{background:"rgba(56,189,248,0.06)",border:"1px solid rgba(56,189,248,0.12)",borderRadius:7,padding:"6px 10px",marginBottom:10,fontSize:11,color:"#38bdf8",fontWeight:600}}>
                          📅 <strong>{video.analysis.bestDay} à {video.analysis.bestTime}</strong>
                          {video.analysis.tip&&<span style={{color:"rgba(26,26,46,0.45)",marginLeft:8,fontWeight:400}}>· {video.analysis.tip}</span>}
                        </div>
                      )}

                      {isAn&&<div style={{display:"flex",alignItems:"center",gap:8,marginBottom:10,color:"#a78bfa",fontSize:11}}><span style={{animation:"bounce 1s infinite"}}>⏳</span> L'IA analyse ta vidéo...</div>}

                      <div style={{display:"flex",gap:7,flexWrap:"wrap"}}>
                        <select value={video.status} onChange={e=>setVideos(p=>p.map(v=>v.id===video.id?{...v,status:e.target.value}:v))}
                          style={{padding:"7px 9px",borderRadius:8,border:`1px solid ${sc}30`,background:`${sc}0e`,color:sc,cursor:"pointer",fontSize:10,fontWeight:700,fontFamily:"inherit",flex:1}}>
                          {Object.entries(STATUS_CFG).map(([k,v])=><option key={k} value={k}>{v.label}</option>)}
                        </select>
                        <button onClick={()=>analyzeVideo(video.id,video)} disabled={isAn} style={{padding:"7px 11px",borderRadius:8,border:"none",background:"rgba(167,139,250,0.12)",color:"#a78bfa",cursor:"pointer",fontSize:10,fontWeight:700,fontFamily:"inherit",opacity:isAn?0.5:1}}>🔄</button>
                        {video.analysis&&(
                          <button onClick={()=>setExpandedId(isExp?null:video.id)} style={{padding:"7px 11px",borderRadius:8,border:"1px solid rgba(26,26,46,0.1)",background:"transparent",color:"rgba(26,26,46,0.5)",cursor:"pointer",fontSize:10,fontFamily:"inherit"}}>
                            {isExp?"▲":"▼ Analyse"}
                          </button>
                        )}
                        <button onClick={()=>setVideos(p=>p.filter(v=>v.id!==video.id))} style={{padding:"7px 10px",borderRadius:8,border:"1px solid rgba(244,114,182,0.12)",background:"transparent",color:"rgba(244,114,182,0.4)",cursor:"pointer",fontSize:10,fontFamily:"inherit"}}>🗑️</button>
                      </div>
                    </div>

                    {isExp&&video.analysis&&(
                      <div style={{borderTop:"1px solid rgba(255,255,255,0.06)",padding:"14px",animation:"fadeIn 0.3s ease"}}>
                        <div style={{fontSize:10,fontWeight:800,color:"rgba(167,139,250,0.5)",letterSpacing:1,marginBottom:8}}>ANALYSE IA</div>
                        <div style={{fontSize:14,fontWeight:800,marginBottom:6}}>{video.analysis.verdict}</div>
                        {video.analysis.monetizationTip&&<div style={{background:"rgba(251,191,36,0.06)",border:"1px solid rgba(251,191,36,0.12)",borderRadius:7,padding:"6px 10px",fontSize:11,color:"#fbbf24",marginBottom:10}}>💰 {video.analysis.monetizationTip}</div>}
                        {video.analysis.captionOption1&&(
                          <div style={{marginBottom:8}}>
                            <div style={{fontSize:9,fontWeight:700,color:"rgba(26,26,46,0.45)",letterSpacing:0.8,marginBottom:6}}>2 OPTIONS DE CAPTION</div>
                            {[{label:"Option A",text:video.analysis.captionOption1},{label:"Option B",text:video.analysis.captionOption2}].map((opt,i)=>(
                              <div key={i} style={{background:"rgba(56,189,248,0.05)",border:"1px solid rgba(56,189,248,0.1)",borderRadius:8,padding:"9px 11px",marginBottom:7}}>
                                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:4}}>
                                  <span style={{fontSize:9,fontWeight:700,color:"#38bdf8",letterSpacing:0.5}}>{opt.label}</span>
                                  <CopyBtn text={opt.text}/>
                                </div>
                                <div style={{fontSize:11,color:"rgba(26,26,46,0.8)",lineHeight:1.6}}>{opt.text}</div>
                              </div>
                            ))}
                          </div>
                        )}
                        {!video.analysis.captionOption1&&video.analysis.caption&&(
                          <div style={{background:"rgba(56,189,248,0.05)",border:"1px solid rgba(56,189,248,0.12)",borderRadius:8,padding:"9px 11px",marginBottom:8}}>
                            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:4}}>
                              <span style={{fontSize:9,fontWeight:700,color:"#38bdf8",letterSpacing:0.5}}>CAPTION</span>
                              <CopyBtn text={video.analysis.caption}/>
                            </div>
                            <div style={{fontSize:11,color:"rgba(26,26,46,0.8)",lineHeight:1.6}}>{video.analysis.caption}</div>
                          </div>
                        )}
                        {video.analysis.hashtags&&(
                          <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:8}}>
                            <div style={{fontSize:10,color:"#a78bfa",lineHeight:1.7,flex:1}}>{video.analysis.hashtags}</div>
                            <CopyBtn text={video.analysis.hashtags}/>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ═══ PROGRAMME ═══ */}
        {tab==="schedule"&&(
          <div style={{animation:"fadeIn 0.4s ease"}}>
            <h2 style={{fontSize:19,fontWeight:900,margin:"0 0 4px",letterSpacing:0.5}}>📅 Programme</h2>
            <p style={{color:"rgba(26,26,46,0.4)",fontSize:10,margin:"0 0 14px"}}>Basé sur tes vidéos · {videos.filter(v=>v.analysis&&v.status==="en attente").length} en attente de publication</p>
            {videos.filter(v=>v.analysis).length===0?(
              <div style={{textAlign:"center",padding:"36px 20px",background:"rgba(167,139,250,0.04)",border:"1px solid rgba(167,139,250,0.1)",borderRadius:14}}>
                <div style={{fontSize:30,marginBottom:10}}>📁</div>
                <div style={{fontSize:13,fontWeight:700,marginBottom:5}}>Ajoute d'abord des vidéos</div>
                <div style={{fontSize:11,color:"rgba(26,26,46,0.4)",marginBottom:14}}>Va dans "Mes Vidéos" et ajoute tes vidéos montées</div>
                <button onClick={()=>setTab("videos")} style={{padding:"9px 18px",borderRadius:9,border:"none",background:"linear-gradient(135deg,#7c3aed,#2563eb)",color:"#1a1a2e",fontSize:12,fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}>→ Mes Vidéos</button>
              </div>
            ):(
              <>
                <PrimaryBtn label={schedLoading?"Génération...":scheduleData?"🔄 Regénérer":"✨ Générer mon programme"} onClick={generateSchedule} disabled={schedLoading}/>
                {schedLoading&&<Dots/>}
                {aiError&&<div style={{marginTop:10,padding:10,background:"rgba(244,114,182,0.08)",border:"1px solid rgba(244,114,182,0.15)",borderRadius:8,color:"#f472b6",fontSize:11,textAlign:"center"}}>⚠️ {aiError}</div>}
                {scheduleData&&(
                  <div style={{marginTop:14,animation:"fadeIn 0.5s ease"}}>
                    <div style={{background:"rgba(124,58,237,0.1)",border:"1px solid rgba(167,139,250,0.15)",borderRadius:11,padding:"11px 13px",marginBottom:13,fontSize:12,color:"rgba(26,26,46,0.8)",lineHeight:1.6}}>
                      💡 {scheduleData.strategy}
                    </div>
                    {scheduleData.threads?.length>0&&(
                      <div style={{display:"flex",gap:6,marginBottom:13,flexWrap:"wrap"}}>
                        {scheduleData.threads.map((t,i)=><div key={i} style={{background:(t.color||"#a78bfa")+"14",border:`1px solid ${t.color||"#a78bfa"}28`,borderRadius:7,padding:"4px 10px",fontSize:10,color:t.color||"#a78bfa",fontWeight:700}}>🧵 {t.name} · {t.count}x</div>)}
                      </div>
                    )}
                    <div style={{display:"flex",flexDirection:"column",gap:8}}>
                      {DAYS.map(day=>{
                        const dayData=scheduleData.week?.find(d=>d.day===day);
                        if(!dayData?.posts?.length)return(
                          <div key={day} style={{background:"rgba(26,26,46,0.03)",border:"1px solid rgba(26,26,46,0.06)",borderRadius:9,padding:"9px 13px",display:"flex",gap:10,alignItems:"center"}}>
                            <span style={{fontSize:11,fontWeight:800,color:"rgba(26,26,46,0.25)",minWidth:80}}>{day}</span>
                            <span style={{fontSize:9,color:"rgba(255,255,255,0.1)"}}>Repos 😴</span>
                          </div>
                        );
                        const isOpen=expandedDay===day;
                        return(
                          <div key={day} style={{background:"rgba(255,255,255,0.9)",border:"1px solid rgba(26,26,46,0.1)",borderRadius:10,overflow:"hidden"}}>
                            <div onClick={()=>setExpandedDay(isOpen?null:day)} style={{padding:"11px 13px",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
                              <div style={{display:"flex",alignItems:"center",gap:9}}>
                                <span style={{fontSize:12,fontWeight:900,minWidth:80}}>{day}</span>
                                <div style={{display:"flex",gap:4,flexWrap:"wrap"}}>
                                  {dayData.posts.map((p,i)=>{
                                    const vid=videos.find(v=>v.id==p.videoId);
                                    const tc=TYPE_COLORS[vid?.type]||"#a78bfa";
                                    return <span key={i} style={{background:tc+"18",color:tc,border:`1px solid ${tc}28`,borderRadius:4,padding:"2px 6px",fontSize:9,fontWeight:700}}>{vid?.type?.split(" ")[1]||"🎬"} {p.time}</span>;
                                  })}
                                </div>
                              </div>
                              <span style={{color:"rgba(26,26,46,0.4)",fontSize:10}}>{isOpen?"▲":"▼"}</span>
                            </div>
                            {isOpen&&(
                              <div style={{borderTop:"1px solid rgba(255,255,255,0.06)",padding:"11px 13px",display:"flex",flexDirection:"column",gap:10}}>
                                {dayData.posts.map((post,i)=>{
                                  const vid=videos.find(v=>v.id==post.videoId);
                                  if(!vid)return null;
                                  const tc=TYPE_COLORS[vid.type]||"#a78bfa";
                                  const pc=post.platform==="TikTok"?"#f472b6":"#a78bfa";
                                  return(
                                    <div key={i} style={{background:`${tc}07`,border:`1px solid ${tc}18`,borderRadius:9,padding:"11px 12px"}}>
                                      <div style={{display:"flex",gap:5,marginBottom:7,flexWrap:"wrap"}}>
                                        <Tag label={vid.type} color={tc}/>
                                        {vid.fpvSubtype&&<Tag label={vid.fpvSubtype} color="#f472b6"/>}
                                        <Tag label={post.platform} color={pc}/>
                                        <span style={{fontSize:9,color:"rgba(26,26,46,0.45)"}}>🕐 {post.time}</span>
                                      </div>
                                      <div style={{fontSize:13,fontWeight:800,marginBottom:4}}>{vid.title}</div>
                                      {post.reason&&<div style={{fontSize:10,color:"rgba(26,26,46,0.4)",marginBottom:8}}>💡 {post.reason}</div>}
                                      {vid.analysis?.caption&&(
                                        <div style={{background:"rgba(56,189,248,0.05)",border:"1px solid rgba(56,189,248,0.1)",borderRadius:7,padding:"7px 10px",marginBottom:6}}>
                                          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:3}}>
                                            <span style={{fontSize:9,fontWeight:700,color:"#38bdf8",letterSpacing:0.5}}>CAPTION</span>
                                            <CopyBtn text={vid.analysis.caption}/>
                                          </div>
                                          <div style={{fontSize:10,color:"rgba(26,26,46,0.7)",lineHeight:1.5}}>{vid.analysis.caption}</div>
                                        </div>
                                      )}
                                      {vid.analysis?.hashtags&&(
                                        <div style={{display:"flex",justifyContent:"space-between",gap:6}}>
                                          <div style={{fontSize:9,color:"#a78bfa",lineHeight:1.7,flex:1}}>{vid.analysis.hashtags}</div>
                                          <CopyBtn text={vid.analysis.hashtags}/>
                                        </div>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* ═══ ANALYSER ═══ */}
        {tab==="analyze"&&(
          <div style={{animation:"fadeIn 0.4s ease"}}>
            <h2 style={{fontSize:19,fontWeight:900,margin:"0 0 4px"}}>🔍 Analyser</h2>
            <p style={{color:"rgba(26,26,46,0.4)",fontSize:10,margin:"0 0 14px"}}>Analyse approfondie d'une vidéo existante</p>
            <div style={{display:"flex",flexDirection:"column",gap:10}}>
              <div><label style={lbl}>URL TIKTOK / INSTAGRAM</label><input style={inp} placeholder="https://www.tiktok.com/@toi/video/..." value={fd.url} onChange={e=>f("url",e.target.value)}/></div>
              <div><label style={lbl}>TITRE</label><input style={inp} placeholder="Ex: Run FPV Ardèche 🚁" value={fd.title} onChange={e=>f("title",e.target.value)}/></div>
              <div><label style={lbl}>CAPTION UTILISÉ</label><textarea style={{...inp,minHeight:65}} placeholder="Ton texte de publication…" value={fd.desc} onChange={e=>f("desc",e.target.value)}/></div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:9}}>
                <div><label style={lbl}>HASHTAGS</label><input style={inp} placeholder="#fpv #drone…" value={fd.hashtags} onChange={e=>f("hashtags",e.target.value)}/></div>
                <div><label style={lbl}>TYPE</label>
                  <select style={{...inp,cursor:"pointer"}} value={fd.type} onChange={e=>f("type",e.target.value)}>
                    <option>Paysages 🏔️</option><option>Van/Camion 🚐</option><option>FPV Drone 🚁</option>
                  </select>
                </div>
              </div>
              <PrimaryBtn label={aiLoading?"Analyse…":"⚡ Analyser"} onClick={()=>callAI(`Analyse cette vidéo ${fd.type} :\nURL:"${fd.url}"\nTitre:"${fd.title}"\nCaption:"${fd.desc}"\nHashtags:"${fd.hashtags}"`)} disabled={aiLoading||!(fd.title||fd.url)}/>
            </div>
            {aiLoading&&<Dots/>}{aiError&&<div style={{marginTop:10,padding:10,background:"rgba(244,114,182,0.08)",border:"1px solid rgba(244,114,182,0.15)",borderRadius:8,color:"#f472b6",fontSize:11,textAlign:"center"}}>⚠️ {aiError}</div>}
            <AIResult result={aiResult}/>
          </div>
        )}

        {/* ═══ IDÉES ═══ */}
        {tab==="viral"&&(
          <div style={{animation:"fadeIn 0.4s ease"}}>
            <h2 style={{fontSize:19,fontWeight:900,margin:"0 0 4px"}}>🔥 Idées Virales</h2>
            <p style={{color:"rgba(26,26,46,0.4)",fontSize:10,margin:"0 0 14px"}}>Idées taillées pour ton univers van/drone/voyage</p>
            <div style={{display:"flex",flexDirection:"column",gap:10}}>
              <div><label style={lbl}>TYPE</label>
                <select style={{...inp,cursor:"pointer"}} value={fd.type} onChange={e=>f("type",e.target.value)}>
                  <option>Paysages 🏔️</option><option>Van/Camion 🚐</option><option>FPV Drone 🚁</option>
                </select>
              </div>
              <div><label style={lbl}>CONTEXTE ACTUEL</label><input style={inp} placeholder="Ex: je suis dans les Alpes, il neige, van garé en altitude…" value={fd.ctx} onChange={e=>f("ctx",e.target.value)}/></div>
              <PrimaryBtn label={aiLoading?"Génération…":"🔥 Générer des idées"} onClick={()=>callAI(`Idées virales ${fd.type} TikTok/Reels.\nContexte:"${fd.ctx||"van aménagé, voyage Europe"}"\nIdées concrètes + caption + hashtags.`)} disabled={aiLoading} color="#f472b6"/>
            </div>
            {aiLoading&&<Dots/>}{aiError&&<div style={{marginTop:10,padding:10,background:"rgba(244,114,182,0.08)",border:"1px solid rgba(244,114,182,0.15)",borderRadius:8,color:"#f472b6",fontSize:11,textAlign:"center"}}>⚠️ {aiError}</div>}
            <AIResult result={aiResult}/>
          </div>
        )}

        {/* ═══ MONÉTISATION ═══ */}
        {tab==="monetize"&&(
          <div style={{animation:"fadeIn 0.4s ease"}}>
            <h2 style={{fontSize:19,fontWeight:900,margin:"0 0 4px"}}>💰 Monétisation</h2>
            <p style={{color:"rgba(26,26,46,0.4)",fontSize:10,margin:"0 0 14px"}}>Transforme ton univers en revenus réels</p>
            <div style={{display:"flex",flexDirection:"column",gap:10}}>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:9}}>
                <div><label style={lbl}>FOLLOWERS</label><input style={inp} type="number" placeholder="5000" value={fd.mFoll} onChange={e=>f("mFoll",e.target.value)}/></div>
                <div><label style={lbl}>VUES MOYENNES</label><input style={inp} type="number" placeholder="10000" value={fd.mViews} onChange={e=>f("mViews",e.target.value)}/></div>
              </div>
              <div><label style={lbl}>OBJECTIF</label>
                <select style={{...inp,cursor:"pointer"}} value={fd.mGoal} onChange={e=>f("mGoal",e.target.value)}>
                  <option value="brand deals">🤝 Partenariats / Brand deals</option>
                  <option value="équipement drone/van">🎥 Sponsors drone & van</option>
                  <option value="fonds createurs">💸 Fonds créateurs TikTok/Meta</option>
                  <option value="affiliation">🔗 Affiliation matériel FPV</option>
                  <option value="prestation video">🎬 Pilote FPV pro / Prestations</option>
                  <option value="formation">🎓 Formation FPV / Montage</option>
                </select>
              </div>
              <PrimaryBtn label={aiLoading?"Analyse…":"💰 Obtenir ma stratégie"} onClick={()=>callAI(`Monétisation créateur van/FPV/paysages TikTok/Reels:\nFollowers:${fd.mFoll}\nVues:${fd.mViews}\nObjectif:${fd.mGoal}\nPlan d'action concret.`)} disabled={aiLoading} color="#fbbf24"/>
            </div>
            {aiLoading&&<Dots/>}{aiError&&<div style={{marginTop:10,padding:10,background:"rgba(244,114,182,0.08)",border:"1px solid rgba(244,114,182,0.15)",borderRadius:8,color:"#f472b6",fontSize:11,textAlign:"center"}}>⚠️ {aiError}</div>}
            <AIResult result={aiResult}/>
          </div>
        )}
      </div>
    </div>
  );
}
