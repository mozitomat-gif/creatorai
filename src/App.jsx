import { useState, useEffect } from "react";

const GROQ_API = "https://api.groq.com/openai/v1/chat/completions";
const GROQ_KEY = import.meta.env.VITE_GROQ_API_KEY;
const MODEL = "llama-3.3-70b-versatile";

// ─── PROMPTS ──────────────────────────────────────────────────────────────────
const SYSTEM_VIDEO = `Tu es un expert en stratégie de contenu TikTok et Instagram Reels pour un créateur qui vit en van aménagé, est télépilote FPV drone, et filme ses voyages.
Types de contenu : 🚐 Van/Camion, 🏔️ Paysages, 🚁 FPV Drone. Les paysages performent le mieux.
Réponds UNIQUEMENT en JSON pur sans backticks :
{
  "improvedTitle": "<titre amélioré accrocheur>",
  "improvedDescription": "<description améliorée>",
  "contentType": "<Van/Camion 🚐|Paysages 🏔️|FPV Drone 🚁>",
  "thread": "<nom du fil rouge détecté, ex: Build Van Serie|FPV Chronicles|Road Trip Alps|Vie en Van>",
  "score": <0-100>,
  "viralScore": <0-100>,
  "verdict": "<emoji + verdict court>",
  "bestDay": "<Lundi|Mardi|Mercredi|Jeudi|Vendredi|Samedi|Dimanche>",
  "bestTime": "<HH:MM>",
  "priority": <1-10>,
  "caption": "<caption optimisé prêt à copier>",
  "hashtags": "<hashtags optimisés>",
  "tip": "<conseil algo en 1 phrase>",
  "monetizationTip": "<conseil monétisation court>"
}`;

const SYSTEM_SCHEDULE = `Tu es un expert en stratégie éditoriale TikTok et Instagram Reels pour un créateur van/FPV/paysages.
Tu reçois une liste de vidéos analysées. Tu génères un programme de publication optimal EN JSON pur sans backticks :
{
  "strategy": "<stratégie globale courte>",
  "threads": [{"name":"<nom fil rouge>","color":"<hex couleur>","count":<nb>}],
  "week": [
    {
      "day": "<Lundi|Mardi|Mercredi|Jeudi|Vendredi|Samedi|Dimanche>",
      "posts": [
        {
          "videoId": "<id de la vidéo>",
          "platform": "<TikTok|Instagram Reels>",
          "time": "<HH:MM>",
          "reason": "<pourquoi ce jour/heure>"
        }
      ]
    }
  ]
}
Trie par priorité, alterne les types, mets plus de paysages. Max 7 posts/semaine.`;

const SYSTEM_AI = `Tu es un expert en stratégie de contenu TikTok et Instagram Reels pour un créateur van/FPV/paysages.
Réponds UNIQUEMENT en JSON pur sans backticks :
{
  "score": <0-100>,
  "verdict": "<emoji + verdict>",
  "contentType": "<Van/Camion 🚐|Paysages 🏔️|FPV Drone 🚁>",
  "points": [{"icon":"<emoji>","label":"<titre>","text":"<explication>"}],
  "actions": [{"priority":"haute|moyenne|basse","action":"<action>"}],
  "viralScore": <0-100>,
  "monetizationTip": "<conseil>",
  "suggestedCaption": "<caption optimisé>",
  "suggestedHashtags": "<hashtags>"
}`;

// ─── CONSTANTS ────────────────────────────────────────────────────────────────
const TABS = [
  { id: "videos", label: "Mes Vidéos", icon: "🎬" },
  { id: "schedule", label: "Programme", icon: "📅" },
  { id: "analyze", label: "Analyser", icon: "🔍" },
  { id: "viral", label: "Idées", icon: "🔥" },
  { id: "monetize", label: "Monétisation", icon: "💰" },
];

const TYPE_COLORS = {
  "Van/Camion 🚐": "#a78bfa",
  "Paysages 🏔️": "#38bdf8",
  "FPV Drone 🚁": "#f472b6",
};

const STATUS_CONFIG = {
  "en attente": { color: "#fbbf24", label: "⏳ En attente" },
  "programmé": { color: "#38bdf8", label: "📅 Programmé" },
  "publié": { color: "#4ade80", label: "✅ Publié" },
};

const DAYS = ["Lundi","Mardi","Mercredi","Jeudi","Vendredi","Samedi","Dimanche"];

// ─── COMPONENTS ───────────────────────────────────────────────────────────────
function ScoreRing({ score, size = 72, color = "#a78bfa" }) {
  const r = (size-8)/2, circ = 2*Math.PI*r, offset = circ-(score/100)*circ;
  return (
    <svg width={size} height={size} style={{transform:"rotate(-90deg)",flexShrink:0}}>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="5"/>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth="5"
        strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round"
        style={{transition:"stroke-dashoffset 1s ease"}}/>
      <text x="50%" y="50%" textAnchor="middle" dominantBaseline="middle"
        style={{transform:"rotate(90deg)",transformOrigin:"center",fill:"white",fontSize:size*0.24,fontWeight:800,fontFamily:"inherit"}}>
        {score}
      </text>
    </svg>
  );
}

function CopyBtn({ text }) {
  const [ok, setOk] = useState(false);
  return (
    <button onClick={() => { navigator.clipboard?.writeText(text); setOk(true); setTimeout(()=>setOk(false),2000); }}
      style={{padding:"3px 9px",borderRadius:6,border:"1px solid rgba(167,139,250,0.3)",background:"rgba(167,139,250,0.08)",color:ok?"#4ade80":"rgba(167,139,250,0.8)",cursor:"pointer",fontSize:10,fontFamily:"inherit",transition:"all 0.2s",whiteSpace:"nowrap"}}>
      {ok?"✅":"📋"}
    </button>
  );
}

function Dots() {
  return (
    <div style={{display:"flex",gap:6,alignItems:"center",justifyContent:"center",padding:"32px 0"}}>
      {[0,1,2].map(i=><div key={i} style={{width:8,height:8,borderRadius:"50%",background:"#a78bfa",animation:`bounce 1.2s ease-in-out ${i*0.2}s infinite`}}/>)}
    </div>
  );
}

function Tag({ label, color }) {
  return <span style={{background:color+"18",color,border:`1px solid ${color}35`,borderRadius:5,padding:"2px 8px",fontSize:10,fontWeight:700,whiteSpace:"nowrap"}}>{label}</span>;
}

function AIResult({ result }) {
  if (!result) return null;
  const tc = TYPE_COLORS[result.contentType] || "#a78bfa";
  return (
    <div style={{marginTop:20,animation:"fadeIn 0.5s ease"}}>
      <div style={{background:"rgba(167,139,250,0.07)",border:"1px solid rgba(167,139,250,0.15)",borderRadius:14,padding:16,display:"flex",gap:14,alignItems:"center",marginBottom:12}}>
        <ScoreRing score={result.score||0}/>
        <div style={{flex:1}}>
          <div style={{fontSize:15,fontWeight:800,marginBottom:5}}>{result.verdict}</div>
          {result.contentType && <Tag label={result.contentType} color={tc}/>}
          {result.monetizationTip && <div style={{marginTop:8,background:"rgba(251,191,36,0.08)",border:"1px solid rgba(251,191,36,0.2)",borderRadius:7,padding:"6px 10px",fontSize:11,color:"#fbbf24",lineHeight:1.5}}>💰 {result.monetizationTip}</div>}
        </div>
        {result.viralScore!==undefined && <div style={{textAlign:"center"}}><ScoreRing score={result.viralScore} size={52} color="#38bdf8"/><div style={{fontSize:9,color:"rgba(255,255,255,0.3)",marginTop:2}}>VIRAL</div></div>}
      </div>
      {result.suggestedCaption && (
        <div style={{background:"rgba(56,189,248,0.06)",border:"1px solid rgba(56,189,248,0.15)",borderRadius:10,padding:"10px 12px",marginBottom:10}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:5}}>
            <span style={{color:"#38bdf8",fontWeight:700,fontSize:11}}>✍️ Caption</span>
            <CopyBtn text={result.suggestedCaption}/>
          </div>
          <div style={{fontSize:12,color:"rgba(255,255,255,0.7)",lineHeight:1.6}}>{result.suggestedCaption}</div>
        </div>
      )}
      {result.suggestedHashtags && (
        <div style={{background:"rgba(167,139,250,0.06)",border:"1px solid rgba(167,139,250,0.15)",borderRadius:10,padding:"9px 12px",marginBottom:10}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:4}}>
            <span style={{color:"#a78bfa",fontWeight:700,fontSize:11}}>🏷️ Hashtags</span>
            <CopyBtn text={result.suggestedHashtags}/>
          </div>
          <div style={{fontSize:11,color:"#a78bfa",lineHeight:1.7}}>{result.suggestedHashtags}</div>
        </div>
      )}
      {result.points?.map((p,i) => (
        <div key={i} style={{background:"rgba(255,255,255,0.03)",border:"1px solid rgba(255,255,255,0.07)",borderRadius:10,padding:"11px 13px",marginBottom:8}}>
          <div style={{display:"flex",gap:8,alignItems:"center",marginBottom:3}}><span style={{fontSize:16}}>{p.icon}</span><span style={{fontWeight:700,fontSize:12}}>{p.label}</span></div>
          <p style={{margin:0,color:"rgba(255,255,255,0.45)",fontSize:11,lineHeight:1.6}}>{p.text}</p>
        </div>
      ))}
      {result.actions?.length>0 && (
        <div style={{background:"rgba(255,255,255,0.02)",border:"1px solid rgba(255,255,255,0.06)",borderRadius:10,overflow:"hidden"}}>
          <div style={{padding:"10px 13px",borderBottom:"1px solid rgba(255,255,255,0.06)",fontSize:10,fontWeight:700,color:"rgba(255,255,255,0.3)",letterSpacing:1}}>⚡ ACTIONS</div>
          {result.actions.map((a,i) => {
            const pc = {haute:"#f472b6",moyenne:"#fbbf24",basse:"#4ade80"}[a.priority]||"#aaa";
            return (
              <div key={i} style={{padding:"10px 13px",borderBottom:i<result.actions.length-1?"1px solid rgba(255,255,255,0.04)":"none",display:"flex",gap:8,alignItems:"flex-start"}}>
                <span style={{background:pc+"18",color:pc,border:`1px solid ${pc}35`,borderRadius:4,padding:"1px 7px",fontSize:9,fontWeight:700,letterSpacing:0.5,whiteSpace:"nowrap",marginTop:1}}>{a.priority.toUpperCase()}</span>
                <span style={{fontSize:12,color:"rgba(255,255,255,0.7)",lineHeight:1.6}}>{a.action}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── MAIN APP ─────────────────────────────────────────────────────────────────
export default function App() {
  const [tab, setTab] = useState("videos");
  const [videos, setVideos] = useState([]);
  const [analyzingId, setAnalyzingId] = useState(null);
  const [expandedId, setExpandedId] = useState(null);
  const [scheduleData, setScheduleData] = useState(null);
  const [schedLoading, setSchedLoading] = useState(false);
  const [expandedDay, setExpandedDay] = useState(null);
  const [aiResult, setAiResult] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newVideo, setNewVideo] = useState({ title:"", description:"", type:"Paysages 🏔️" });
  const [filterType, setFilterType] = useState("Tous");
  const [filterThread, setFilterThread] = useState("Tous");
  const [fd, setFd] = useState({ title:"", desc:"", hashtags:"", url:"", type:"Paysages 🏔️", ctx:"", mFoll:"", mViews:"", mGoal:"brand deals" });

  const f = (k,v) => setFd(p=>({...p,[k]:v}));

  async function groq(system, user, maxTokens=1000) {
    const res = await fetch(GROQ_API, {
      method:"POST", headers:{"Content-Type":"application/json","Authorization":`Bearer ${GROQ_KEY}`},
      body:JSON.stringify({model:MODEL,max_tokens:maxTokens,messages:[{role:"system",content:system},{role:"user",content:user}]})
    });
    const data = await res.json();
    const text = data.choices?.[0]?.message?.content||"";
    return JSON.parse(text.replace(/```json|```/g,"").trim());
  }

  async function addVideo() {
    if (!newVideo.title) return;
    const id = Date.now();
    const vid = { id, title:newVideo.title, description:newVideo.description, type:newVideo.type, status:"en attente", analysis:null, createdAt:new Date().toISOString() };
    setVideos(p=>[vid,...p]);
    setNewVideo({title:"",description:"",type:"Paysages 🏔️"});
    setShowAddForm(false);
    // Auto-analyze
    analyzeVideo(id, vid);
  }

  async function analyzeVideo(id, vid) {
    setAnalyzingId(id);
    try {
      const analysis = await groq(SYSTEM_VIDEO, `Analyse cette vidéo :\nTitre : "${vid.title}"\nDescription : "${vid.description}"\nType : ${vid.type}`);
      setVideos(p=>p.map(v=>v.id===id?{...v,analysis,title:analysis.improvedTitle||v.title,description:analysis.improvedDescription||v.description,type:analysis.contentType||v.type}:v));
      setExpandedId(id);
    } catch(e) {}
    setAnalyzingId(null);
  }

  async function generateSchedule() {
    const analyzed = videos.filter(v=>v.analysis);
    if (!analyzed.length) { setAiError("Ajoute d'abord des vidéos dans 'Mes Vidéos' !"); return; }
    setSchedLoading(true); setScheduleData(null);
    try {
      const videoList = analyzed.map(v=>({id:v.id,title:v.title,type:v.type,thread:v.analysis?.thread,priority:v.analysis?.priority,bestDay:v.analysis?.bestDay,bestTime:v.analysis?.bestTime,status:v.status}));
      const data = await groq(SYSTEM_SCHEDULE, `Vidéos disponibles : ${JSON.stringify(videoList)}\nGénère le programme optimal.`, 2000);
      setScheduleData(data);
    } catch(e) { setAiError("Erreur génération programme."); }
    setSchedLoading(false);
  }

  async function callAI(prompt) {
    setAiLoading(true); setAiResult(null); setAiError(null);
    try { setAiResult(await groq(SYSTEM_AI, prompt)); }
    catch(e) { setAiError("Erreur IA. Réessaie !"); }
    setAiLoading(false);
  }

  // Derived
  const threads = [...new Set(videos.filter(v=>v.analysis?.thread).map(v=>v.analysis.thread))];
  const filteredVideos = videos.filter(v => {
    if (filterType !== "Tous" && v.type !== filterType) return false;
    if (filterThread !== "Tous" && v.analysis?.thread !== filterThread) return false;
    return true;
  }).sort((a,b) => (b.analysis?.priority||0)-(a.analysis?.priority||0));

  const inp = {width:"100%",background:"rgba(255,255,255,0.05)",border:"1px solid rgba(167,139,250,0.2)",borderRadius:10,padding:"11px 13px",color:"white",fontSize:13,outline:"none",boxSizing:"border-box",fontFamily:"inherit",transition:"border-color 0.2s"};
  const lbl = {color:"rgba(167,139,250,0.7)",fontSize:10,fontWeight:700,letterSpacing:1,marginBottom:5,display:"block"};

  function PrimaryBtn({ label, onClick, disabled, color="#a78bfa" }) {
    return <button onClick={onClick} disabled={disabled} style={{width:"100%",padding:"13px",borderRadius:11,border:"none",cursor:disabled?"not-allowed":"pointer",background:disabled?"rgba(255,255,255,0.06)":`linear-gradient(135deg,${color},${color}99)`,color:"white",fontSize:13,fontWeight:700,fontFamily:"inherit",opacity:disabled?0.5:1,transition:"all 0.2s"}}>{label}</button>;
  }

  return (
    <div style={{minHeight:"100vh",background:"#0d0f1a",color:"white",fontFamily:"'Barlow Condensed','Sora',sans-serif",paddingBottom:70}}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@400;600;700;800;900&family=Barlow:wght@400;500;600&display=swap');
        *{box-sizing:border-box;}
        @keyframes bounce{0%,80%,100%{transform:scale(0)}40%{transform:scale(1)}}
        @keyframes fadeIn{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}
        @keyframes shimmer{0%{background-position:-200% center}100%{background-position:200% center}}
        input:focus,textarea:focus,select:focus{border-color:rgba(167,139,250,0.5)!important;}
        textarea{resize:vertical;}
        ::-webkit-scrollbar{width:3px;}
        ::-webkit-scrollbar-thumb{background:#a78bfa;border-radius:2px;}
        .vcard{transition:all 0.2s;}
        .vcard:hover{background:rgba(167,139,250,0.07)!important;border-color:rgba(167,139,250,0.25)!important;}
        .tab-btn{transition:all 0.2s;}
      `}</style>

      {/* ── HEADER ── */}
      <div style={{background:"linear-gradient(180deg,#1a1030 0%,#0d0f1a 100%)",borderBottom:"1px solid rgba(167,139,250,0.12)",padding:"16px 16px 0",position:"sticky",top:0,zIndex:100,backdropFilter:"blur(20px)"}}>
        <div style={{maxWidth:720,margin:"0 auto"}}>
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:14}}>
            <div style={{display:"flex",alignItems:"center",gap:10}}>
              <div style={{width:36,height:36,borderRadius:9,background:"linear-gradient(135deg,#7c3aed,#2563eb)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:18,fontWeight:900,letterSpacing:-1,boxShadow:"0 0 20px rgba(124,58,237,0.4)"}}>C</div>
              <div>
                <div style={{fontSize:18,fontWeight:900,letterSpacing:0.5,lineHeight:1}}>
                  <span style={{color:"#a78bfa"}}>Creator</span><span style={{color:"white"}}>AI</span>
                  <span style={{fontSize:9,background:"rgba(167,139,250,0.15)",color:"#a78bfa",borderRadius:20,padding:"2px 6px",marginLeft:6,fontWeight:700,letterSpacing:1}}>BETA</span>
                </div>
                <div style={{color:"rgba(255,255,255,0.25)",fontSize:10,letterSpacing:0.5}}>🚐 VAN · 🏔️ PAYSAGES · 🚁 FPV</div>
              </div>
            </div>
            <div style={{display:"flex",gap:5}}>
              <div style={{padding:"4px 9px",borderRadius:6,background:"rgba(244,114,182,0.12)",color:"#f472b6",fontSize:9,fontWeight:700,letterSpacing:0.5,border:"1px solid rgba(244,114,182,0.2)"}}>TIKTOK</div>
              <div style={{padding:"4px 9px",borderRadius:6,background:"rgba(167,139,250,0.12)",color:"#a78bfa",fontSize:9,fontWeight:700,letterSpacing:0.5,border:"1px solid rgba(167,139,250,0.2)"}}>REELS</div>
            </div>
          </div>

          {/* Stats bar */}
          {videos.length > 0 && (
            <div style={{display:"flex",gap:10,marginBottom:12,overflowX:"auto",paddingBottom:2}}>
              {Object.entries(STATUS_CONFIG).map(([s,c]) => {
                const n = videos.filter(v=>v.status===s).length;
                return <div key={s} style={{background:c.color+"12",border:`1px solid ${c.color}25`,borderRadius:7,padding:"4px 10px",fontSize:10,color:c.color,fontWeight:700,whiteSpace:"nowrap",flexShrink:0}}>{c.label} {n}</div>;
              })}
              <div style={{background:"rgba(167,139,250,0.1)",border:"1px solid rgba(167,139,250,0.2)",borderRadius:7,padding:"4px 10px",fontSize:10,color:"#a78bfa",fontWeight:700,whiteSpace:"nowrap",flexShrink:0}}>🧵 {threads.length} fil{threads.length>1?"s":""}</div>
            </div>
          )}

          {/* Tabs */}
          <div style={{display:"flex",gap:2,overflowX:"auto"}}>
            {TABS.map(t=>(
              <button key={t.id} className="tab-btn" onClick={()=>{setTab(t.id);setAiResult(null);setAiError(null);}} style={{padding:"9px 12px",borderRadius:"8px 8px 0 0",border:"none",cursor:"pointer",background:tab===t.id?"rgba(167,139,250,0.12)":"transparent",color:tab===t.id?"#a78bfa":"rgba(255,255,255,0.35)",fontWeight:tab===t.id?800:500,fontSize:11,whiteSpace:"nowrap",borderBottom:tab===t.id?"2px solid #a78bfa":"2px solid transparent",fontFamily:"inherit",letterSpacing:0.3}}>
                {t.icon} {t.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div style={{maxWidth:720,margin:"0 auto",padding:"20px 14px 0"}}>

        {/* ═══════════════ MES VIDÉOS ═══════════════ */}
        {tab==="videos" && (
          <div style={{animation:"fadeIn 0.4s ease"}}>
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:16}}>
              <div>
                <h2 style={{fontSize:20,fontWeight:900,margin:"0 0 2px",letterSpacing:0.5}}>🎬 Mes Vidéos</h2>
                <p style={{color:"rgba(255,255,255,0.3)",fontSize:11,margin:0}}>{videos.length} vidéo{videos.length>1?"s":""} · L'IA améliore et planifie</p>
              </div>
              <button onClick={()=>setShowAddForm(p=>!p)} style={{padding:"9px 16px",borderRadius:9,border:"none",cursor:"pointer",background:"linear-gradient(135deg,#7c3aed,#2563eb)",color:"white",fontSize:12,fontWeight:700,fontFamily:"inherit",boxShadow:"0 4px 15px rgba(124,58,237,0.3)"}}>
                {showAddForm?"✕ Annuler":"+ Ajouter"}
              </button>
            </div>

            {/* Add form */}
            {showAddForm && (
              <div style={{background:"rgba(167,139,250,0.06)",border:"1px solid rgba(167,139,250,0.18)",borderRadius:14,padding:16,marginBottom:16,animation:"fadeIn 0.3s ease"}}>
                <div style={{fontSize:12,fontWeight:800,color:"#a78bfa",marginBottom:12,letterSpacing:0.5}}>NOUVELLE VIDÉO</div>
                <div style={{display:"flex",flexDirection:"column",gap:10}}>
                  <div>
                    <label style={lbl}>TITRE DE LA VIDÉO</label>
                    <input style={inp} placeholder="Ex: Run FPV Gorges de l'Ardèche" value={newVideo.title} onChange={e=>setNewVideo(p=>({...p,title:e.target.value}))}/>
                  </div>
                  <div>
                    <label style={lbl}>DESCRIPTION COURTE (2-3 mots)</label>
                    <input style={inp} placeholder="Ex: vol technique, forêt de pins, coucher de soleil" value={newVideo.description} onChange={e=>setNewVideo(p=>({...p,description:e.target.value}))}/>
                  </div>
                  <div>
                    <label style={lbl}>TYPE</label>
                    <select style={{...inp,cursor:"pointer"}} value={newVideo.type} onChange={e=>setNewVideo(p=>({...p,type:e.target.value}))}>
                      <option>Paysages 🏔️</option>
                      <option>Van/Camion 🚐</option>
                      <option>FPV Drone 🚁</option>
                    </select>
                  </div>
                  <PrimaryBtn label="🤖 Ajouter & Analyser avec l'IA" onClick={addVideo} disabled={!newVideo.title}/>
                </div>
              </div>
            )}

            {/* Filters */}
            {videos.length > 0 && (
              <div style={{display:"flex",gap:6,marginBottom:14,overflowX:"auto",paddingBottom:2}}>
                {["Tous","Paysages 🏔️","Van/Camion 🚐","FPV Drone 🚁"].map(t=>(
                  <button key={t} onClick={()=>setFilterType(t)} style={{padding:"5px 11px",borderRadius:7,border:`1px solid ${filterType===t?"rgba(167,139,250,0.5)":"rgba(255,255,255,0.08)"}`,background:filterType===t?"rgba(167,139,250,0.12)":"transparent",color:filterType===t?"#a78bfa":"rgba(255,255,255,0.35)",cursor:"pointer",fontSize:10,fontWeight:700,fontFamily:"inherit",whiteSpace:"nowrap",flexShrink:0}}>
                    {t}
                  </button>
                ))}
                {threads.map(th=>(
                  <button key={th} onClick={()=>setFilterThread(filterThread===th?"Tous":th)} style={{padding:"5px 11px",borderRadius:7,border:`1px solid ${filterThread===th?"rgba(56,189,248,0.5)":"rgba(255,255,255,0.08)"}`,background:filterThread===th?"rgba(56,189,248,0.12)":"transparent",color:filterThread===th?"#38bdf8":"rgba(255,255,255,0.35)",cursor:"pointer",fontSize:10,fontWeight:700,fontFamily:"inherit",whiteSpace:"nowrap",flexShrink:0}}>
                    🧵 {th}
                  </button>
                ))}
              </div>
            )}

            {/* Video list */}
            {filteredVideos.length === 0 && !showAddForm && (
              <div style={{textAlign:"center",padding:"40px 20px",color:"rgba(255,255,255,0.15)"}}>
                <div style={{fontSize:40,marginBottom:12}}>🎬</div>
                <div style={{fontSize:14,fontWeight:700,marginBottom:6}}>Aucune vidéo pour l'instant</div>
                <div style={{fontSize:12}}>Clique sur "+ Ajouter" pour commencer</div>
              </div>
            )}

            <div style={{display:"flex",flexDirection:"column",gap:10}}>
              {filteredVideos.map(video => {
                const tc = TYPE_COLORS[video.type] || "#a78bfa";
                const sc = STATUS_CONFIG[video.status]?.color || "#fbbf24";
                const isExpanded = expandedId === video.id;
                const isAnalyzing = analyzingId === video.id;
                return (
                  <div key={video.id} className="vcard" style={{background:"rgba(255,255,255,0.03)",border:"1px solid rgba(255,255,255,0.07)",borderRadius:13,overflow:"hidden"}}>
                    <div style={{padding:"13px 14px"}}>
                      {/* Header */}
                      <div style={{display:"flex",alignItems:"flex-start",gap:10,marginBottom:10}}>
                        <div style={{width:44,height:44,borderRadius:9,background:`linear-gradient(135deg,${tc}22,${tc}11)`,border:`1px solid ${tc}30`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:20,flexShrink:0}}>
                          {video.type?.split(" ")[1]||"🎬"}
                        </div>
                        <div style={{flex:1,minWidth:0}}>
                          <div style={{fontSize:13,fontWeight:800,marginBottom:4,lineHeight:1.3}}>{video.title}</div>
                          <div style={{display:"flex",gap:5,flexWrap:"wrap"}}>
                            <Tag label={video.type} color={tc}/>
                            <Tag label={STATUS_CONFIG[video.status]?.label||video.status} color={sc}/>
                            {video.analysis?.thread && <Tag label={`🧵 ${video.analysis.thread}`} color="#38bdf8"/>}
                            {video.analysis?.priority && <Tag label={`⚡ ${video.analysis.priority}/10`} color="#f472b6"/>}
                          </div>
                        </div>
                        {video.analysis && <ScoreRing score={video.analysis.score||0} size={44} color={tc}/>}
                      </div>

                      {/* Description */}
                      {video.description && <div style={{fontSize:11,color:"rgba(255,255,255,0.35)",marginBottom:10,lineHeight:1.5}}>{video.description}</div>}

                      {/* Best time */}
                      {video.analysis?.bestDay && (
                        <div style={{background:"rgba(56,189,248,0.07)",border:"1px solid rgba(56,189,248,0.15)",borderRadius:7,padding:"6px 10px",marginBottom:10,fontSize:11,color:"#38bdf8",fontWeight:600}}>
                          📅 Poster : <strong>{video.analysis.bestDay} à {video.analysis.bestTime}</strong>
                          {video.analysis.tip && <span style={{color:"rgba(255,255,255,0.4)",marginLeft:8}}>· {video.analysis.tip}</span>}
                        </div>
                      )}

                      {/* Actions */}
                      <div style={{display:"flex",gap:7,flexWrap:"wrap"}}>
                        <select value={video.status} onChange={e=>setVideos(p=>p.map(v=>v.id===video.id?{...v,status:e.target.value}:v))}
                          style={{padding:"7px 9px",borderRadius:8,border:`1px solid ${sc}30`,background:`${sc}10`,color:sc,cursor:"pointer",fontSize:10,fontWeight:700,fontFamily:"inherit",flex:1}}>
                          {Object.entries(STATUS_CONFIG).map(([k,v])=><option key={k} value={k}>{v.label}</option>)}
                        </select>
                        {isAnalyzing ? (
                          <div style={{padding:"7px 14px",borderRadius:8,background:"rgba(167,139,250,0.1)",color:"#a78bfa",fontSize:11,fontWeight:700,display:"flex",alignItems:"center",gap:5}}>
                            <span style={{animation:"bounce 1s infinite"}}>⏳</span> IA...
                          </div>
                        ) : (
                          <button onClick={()=>analyzeVideo(video.id,video)} style={{padding:"7px 12px",borderRadius:8,border:"none",background:"rgba(167,139,250,0.15)",color:"#a78bfa",cursor:"pointer",fontSize:11,fontWeight:700,fontFamily:"inherit"}}>🔄 Ré-analyser</button>
                        )}
                        {video.analysis && (
                          <button onClick={()=>setExpandedId(isExpanded?null:video.id)} style={{padding:"7px 12px",borderRadius:8,border:"1px solid rgba(255,255,255,0.08)",background:"transparent",color:"rgba(255,255,255,0.4)",cursor:"pointer",fontSize:11,fontFamily:"inherit"}}>
                            {isExpanded?"▲ Fermer":"▼ Voir analyse"}
                          </button>
                        )}
                        <button onClick={()=>setVideos(p=>p.filter(v=>v.id!==video.id))} style={{padding:"7px 10px",borderRadius:8,border:"1px solid rgba(244,114,182,0.15)",background:"transparent",color:"rgba(244,114,182,0.5)",cursor:"pointer",fontSize:11,fontFamily:"inherit"}}>🗑️</button>
                      </div>
                    </div>

                    {/* Expanded analysis */}
                    {isExpanded && video.analysis && (
                      <div style={{borderTop:"1px solid rgba(255,255,255,0.06)",padding:"14px",animation:"fadeIn 0.3s ease"}}>
                        <div style={{fontSize:10,fontWeight:800,color:"rgba(167,139,250,0.6)",letterSpacing:1,marginBottom:10}}>ANALYSE IA</div>
                        <div style={{fontSize:14,fontWeight:800,marginBottom:4}}>{video.analysis.verdict}</div>
                        {video.analysis.monetizationTip && <div style={{background:"rgba(251,191,36,0.07)",border:"1px solid rgba(251,191,36,0.15)",borderRadius:7,padding:"6px 10px",fontSize:11,color:"#fbbf24",marginBottom:10}}>💰 {video.analysis.monetizationTip}</div>}
                        {video.analysis.caption && (
                          <div style={{background:"rgba(56,189,248,0.06)",border:"1px solid rgba(56,189,248,0.12)",borderRadius:8,padding:"9px 11px",marginBottom:8}}>
                            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:4}}>
                              <span style={{fontSize:10,fontWeight:700,color:"#38bdf8"}}>✍️ CAPTION</span>
                              <CopyBtn text={video.analysis.caption}/>
                            </div>
                            <div style={{fontSize:11,color:"rgba(255,255,255,0.7)",lineHeight:1.5}}>{video.analysis.caption}</div>
                          </div>
                        )}
                        {video.analysis.hashtags && (
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

        {/* ═══════════════ PROGRAMME ═══════════════ */}
        {tab==="schedule" && (
          <div style={{animation:"fadeIn 0.4s ease"}}>
            <h2 style={{fontSize:20,fontWeight:900,margin:"0 0 4px",letterSpacing:0.5}}>📅 Programme</h2>
            <p style={{color:"rgba(255,255,255,0.3)",fontSize:11,margin:"0 0 14px"}}>Basé sur tes vidéos analysées · {videos.filter(v=>v.analysis&&v.status==="en attente").length} vidéo{videos.filter(v=>v.analysis&&v.status==="en attente").length>1?"s":""} en attente</p>

            {videos.filter(v=>v.analysis).length===0 ? (
              <div style={{textAlign:"center",padding:"40px 20px",background:"rgba(167,139,250,0.04)",border:"1px solid rgba(167,139,250,0.12)",borderRadius:14}}>
                <div style={{fontSize:32,marginBottom:10}}>📁</div>
                <div style={{fontSize:13,fontWeight:700,marginBottom:6}}>Ajoute d'abord des vidéos</div>
                <div style={{fontSize:11,color:"rgba(255,255,255,0.3)",marginBottom:14}}>Va dans "Mes Vidéos" et ajoute tes vidéos montées</div>
                <button onClick={()=>setTab("videos")} style={{padding:"10px 20px",borderRadius:9,border:"none",background:"linear-gradient(135deg,#7c3aed,#2563eb)",color:"white",fontSize:12,fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}>→ Mes Vidéos</button>
              </div>
            ) : (
              <>
                <PrimaryBtn label={schedLoading?"Génération...":scheduleData?"🔄 Regénérer le programme":"✨ Générer le programme"} onClick={generateSchedule} disabled={schedLoading}/>
                {schedLoading && <Dots/>}
                {aiError && <div style={{marginTop:12,padding:11,background:"rgba(244,114,182,0.08)",border:"1px solid rgba(244,114,182,0.2)",borderRadius:9,color:"#f472b6",fontSize:12,textAlign:"center"}}>⚠️ {aiError}</div>}

                {scheduleData && (
                  <div style={{marginTop:16,animation:"fadeIn 0.5s ease"}}>
                    <div style={{background:"linear-gradient(135deg,rgba(124,58,237,0.12),rgba(37,99,235,0.12))",border:"1px solid rgba(167,139,250,0.15)",borderRadius:12,padding:"12px 14px",marginBottom:14,fontSize:12,color:"rgba(255,255,255,0.75)",lineHeight:1.6}}>
                      💡 {scheduleData.strategy}
                    </div>

                    {/* Threads */}
                    {scheduleData.threads?.length>0 && (
                      <div style={{display:"flex",gap:7,marginBottom:14,flexWrap:"wrap"}}>
                        {scheduleData.threads.map((t,i)=>(
                          <div key={i} style={{background:t.color+"15",border:`1px solid ${t.color}30`,borderRadius:8,padding:"5px 11px",fontSize:10,color:t.color||"#a78bfa",fontWeight:700}}>
                            🧵 {t.name} · {t.count}x
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Days */}
                    <div style={{display:"flex",flexDirection:"column",gap:8}}>
                      {DAYS.map(day => {
                        const dayData = scheduleData.week?.find(d=>d.day===day);
                        if (!dayData?.posts?.length) return (
                          <div key={day} style={{background:"rgba(255,255,255,0.02)",border:"1px solid rgba(255,255,255,0.04)",borderRadius:10,padding:"10px 14px",display:"flex",gap:10,alignItems:"center"}}>
                            <span style={{fontSize:11,fontWeight:800,color:"rgba(255,255,255,0.15)",minWidth:80}}>{day}</span>
                            <span style={{fontSize:10,color:"rgba(255,255,255,0.12)"}}>Repos 😴</span>
                          </div>
                        );
                        const isOpen = expandedDay===day;
                        return (
                          <div key={day} style={{background:"rgba(255,255,255,0.03)",border:"1px solid rgba(255,255,255,0.07)",borderRadius:11,overflow:"hidden"}}>
                            <div onClick={()=>setExpandedDay(isOpen?null:day)} style={{padding:"11px 14px",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
                              <div style={{display:"flex",alignItems:"center",gap:10}}>
                                <span style={{fontSize:12,fontWeight:900,minWidth:80}}>{day}</span>
                                <div style={{display:"flex",gap:5,flexWrap:"wrap"}}>
                                  {dayData.posts.map((p,i)=>{
                                    const vid = videos.find(v=>v.id==p.videoId);
                                    const tc = TYPE_COLORS[vid?.type]||"#a78bfa";
                                    return <span key={i} style={{background:tc+"18",color:tc,border:`1px solid ${tc}30`,borderRadius:4,padding:"2px 7px",fontSize:9,fontWeight:700}}>{vid?.type?.split(" ")[1]||"🎬"} {p.time}</span>;
                                  })}
                                </div>
                              </div>
                              <span style={{color:"rgba(255,255,255,0.3)",fontSize:11}}>{isOpen?"▲":"▼"}</span>
                            </div>
                            {isOpen && (
                              <div style={{borderTop:"1px solid rgba(255,255,255,0.06)",padding:"12px 14px",display:"flex",flexDirection:"column",gap:10}}>
                                {dayData.posts.map((post,i)=>{
                                  const vid = videos.find(v=>v.id==post.videoId);
                                  if (!vid) return null;
                                  const tc = TYPE_COLORS[vid.type]||"#a78bfa";
                                  const pc = post.platform==="TikTok"?"#f472b6":"#a78bfa";
                                  return (
                                    <div key={i} style={{background:`${tc}08`,border:`1px solid ${tc}18`,borderRadius:10,padding:"11px 12px"}}>
                                      <div style={{display:"flex",gap:6,marginBottom:7,flexWrap:"wrap"}}>
                                        <Tag label={vid.type} color={tc}/>
                                        <Tag label={post.platform} color={pc}/>
                                        <span style={{fontSize:10,color:"rgba(255,255,255,0.35)"}}>🕐 {post.time}</span>
                                      </div>
                                      <div style={{fontSize:13,fontWeight:800,marginBottom:4}}>{vid.title}</div>
                                      {post.reason && <div style={{fontSize:10,color:"rgba(255,255,255,0.3)",marginBottom:7}}>💡 {post.reason}</div>}
                                      {vid.analysis?.caption && (
                                        <div style={{background:"rgba(56,189,248,0.06)",border:"1px solid rgba(56,189,248,0.12)",borderRadius:7,padding:"7px 10px",marginBottom:6}}>
                                          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:3}}>
                                            <span style={{fontSize:9,fontWeight:700,color:"#38bdf8"}}>CAPTION</span>
                                            <CopyBtn text={vid.analysis.caption}/>
                                          </div>
                                          <div style={{fontSize:10,color:"rgba(255,255,255,0.65)",lineHeight:1.5}}>{vid.analysis.caption}</div>
                                        </div>
                                      )}
                                      {vid.analysis?.hashtags && (
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

        {/* ═══════════════ ANALYSER ═══════════════ */}
        {tab==="analyze" && (
          <div style={{animation:"fadeIn 0.4s ease"}}>
            <h2 style={{fontSize:20,fontWeight:900,margin:"0 0 4px"}}>🔍 Analyser une vidéo</h2>
            <p style={{color:"rgba(255,255,255,0.3)",fontSize:11,margin:"0 0 16px"}}>Analyse approfondie + optimisation complète</p>
            <div style={{display:"flex",flexDirection:"column",gap:11}}>
              <div><label style={lbl}>URL TIKTOK / INSTAGRAM</label><input style={inp} placeholder="https://www.tiktok.com/@toi/video/..." value={fd.url} onChange={e=>f("url",e.target.value)}/></div>
              <div><label style={lbl}>TITRE</label><input style={inp} placeholder="Ex: Run FPV Ardèche 🚁" value={fd.title} onChange={e=>f("title",e.target.value)}/></div>
              <div><label style={lbl}>CAPTION UTILISÉ</label><textarea style={{...inp,minHeight:68}} placeholder="Ton texte de publication…" value={fd.desc} onChange={e=>f("desc",e.target.value)}/></div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:9}}>
                <div><label style={lbl}>HASHTAGS</label><input style={inp} placeholder="#fpv #drone…" value={fd.hashtags} onChange={e=>f("hashtags",e.target.value)}/></div>
                <div><label style={lbl}>TYPE</label>
                  <select style={{...inp,cursor:"pointer"}} value={fd.type} onChange={e=>f("type",e.target.value)}>
                    <option>Paysages 🏔️</option><option>Van/Camion 🚐</option><option>FPV Drone 🚁</option>
                  </select>
                </div>
              </div>
              <PrimaryBtn label={aiLoading?"Analyse…":"⚡ Analyser"} onClick={()=>callAI(`Analyse cette vidéo ${fd.type} :\nURL : "${fd.url}"\nTitre : "${fd.title}"\nCaption : "${fd.desc}"\nHashtags : "${fd.hashtags}"`)} disabled={aiLoading||!(fd.title||fd.url)}/>
            </div>
            {aiLoading&&<Dots/>}{aiError&&<div style={{marginTop:12,padding:11,background:"rgba(244,114,182,0.08)",border:"1px solid rgba(244,114,182,0.2)",borderRadius:9,color:"#f472b6",fontSize:12,textAlign:"center"}}>⚠️ {aiError}</div>}
            <AIResult result={aiResult}/>
          </div>
        )}

        {/* ═══════════════ IDÉES ═══════════════ */}
        {tab==="viral" && (
          <div style={{animation:"fadeIn 0.4s ease"}}>
            <h2 style={{fontSize:20,fontWeight:900,margin:"0 0 4px"}}>🔥 Idées Virales</h2>
            <p style={{color:"rgba(255,255,255,0.3)",fontSize:11,margin:"0 0 16px"}}>Idées taillées pour ton univers</p>
            <div style={{display:"flex",flexDirection:"column",gap:11}}>
              <div><label style={lbl}>TYPE DE CONTENU</label>
                <select style={{...inp,cursor:"pointer"}} value={fd.type} onChange={e=>f("type",e.target.value)}>
                  <option>Paysages 🏔️</option><option>Van/Camion 🚐</option><option>FPV Drone 🚁</option>
                </select>
              </div>
              <div><label style={lbl}>CONTEXTE</label><input style={inp} placeholder="Ex: je suis dans les Alpes, il neige…" value={fd.ctx} onChange={e=>f("ctx",e.target.value)}/></div>
              <PrimaryBtn label={aiLoading?"Génération…":"🔥 Générer des idées"} onClick={()=>callAI(`Génère des idées virales pour ${fd.type} TikTok/Reels.\nContexte : "${fd.ctx||"van aménagé, voyage Europe"}"\nIdées concrètes + caption + hashtags.`)} disabled={aiLoading} color="#f472b6"/>
            </div>
            {aiLoading&&<Dots/>}{aiError&&<div style={{marginTop:12,padding:11,background:"rgba(244,114,182,0.08)",border:"1px solid rgba(244,114,182,0.2)",borderRadius:9,color:"#f472b6",fontSize:12,textAlign:"center"}}>⚠️ {aiError}</div>}
            <AIResult result={aiResult}/>
          </div>
        )}

        {/* ═══════════════ MONÉTISATION ═══════════════ */}
        {tab==="monetize" && (
          <div style={{animation:"fadeIn 0.4s ease"}}>
            <h2 style={{fontSize:20,fontWeight:900,margin:"0 0 4px"}}>💰 Monétisation</h2>
            <p style={{color:"rgba(255,255,255,0.3)",fontSize:11,margin:"0 0 16px"}}>Transforme ton univers en revenus</p>
            <div style={{display:"flex",flexDirection:"column",gap:11}}>
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
              <PrimaryBtn label={aiLoading?"Analyse…":"💰 Obtenir ma stratégie"} onClick={()=>callAI(`Monétisation créateur van/FPV/paysages TikTok/Reels :\nFollowers : ${fd.mFoll}\nVues : ${fd.mViews}\nObjectif : ${fd.mGoal}\nPlan d'action concret.`)} disabled={aiLoading} color="#fbbf24"/>
            </div>
            {aiLoading&&<Dots/>}{aiError&&<div style={{marginTop:12,padding:11,background:"rgba(244,114,182,0.08)",border:"1px solid rgba(244,114,182,0.2)",borderRadius:9,color:"#f472b6",fontSize:12,textAlign:"center"}}>⚠️ {aiError}</div>}
            <AIResult result={aiResult}/>
          </div>
        )}
      </div>
    </div>
  );
}
