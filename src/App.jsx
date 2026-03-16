import { useState } from "react";

const GROQ_API = "https://api.groq.com/openai/v1/chat/completions";
const GROQ_KEY = "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";
const MODEL = "llama-3.3-70b-versatile";

const SYSTEM = `Tu es un expert en stratégie de contenu TikTok et Instagram Reels. 
Tu travailles avec un créateur qui vit en van aménagé, est télépilote FPV drone, et filme ses voyages.
Ses 3 types de contenu : 🚐 Van/Camion (build, aménagement, vie en van), 🏔️ Paysages (beaux endroits traversés, vidéos courtes), 🚁 FPV Drone (runs fpv, spots, figures).
Les paysages performent le mieux actuellement.
Réponds UNIQUEMENT en JSON pur sans backticks ni markdown :
{
  "score": <0-100>,
  "verdict": "<emoji + verdict court>",
  "contentType": "<Van/Camion 🚐|Paysages 🏔️|FPV Drone 🚁>",
  "points": [{"icon":"<emoji>","label":"<titre>","text":"<explication>"}],
  "actions": [{"priority":"haute|moyenne|basse","action":"<action concrète>"}],
  "viralScore": <0-100>,
  "monetizationTip": "<conseil monétisation spécifique à son univers>",
  "suggestedCaption": "<caption optimisé>",
  "suggestedHashtags": "<hashtags optimisés pour TikTok/Reels>"
}
Maximum 4 points, 3 actions. Sois très concret et adapté à son univers van/drone/voyage.`;

const SCHEDULE_SYSTEM = `Tu es un expert en stratégie éditoriale pour TikTok et Instagram Reels.
Un créateur vit en van, filme des paysages, fait du FPV drone, et documente son van aménagé.
Les paysages performent le mieux. Il publie 5 à 7 fois par semaine.
Génère un programme hebdomadaire optimal EN JSON pur sans backticks :
{
  "strategy": "<explication courte de la stratégie>",
  "week": [
    {
      "day": "<Lundi|Mardi|Mercredi|Jeudi|Vendredi|Samedi|Dimanche>",
      "posts": [
        {
          "platform": "<TikTok|Instagram Reels>",
          "type": "<Van/Camion 🚐|Paysages 🏔️|FPV Drone 🚁>",
          "time": "<HH:MM>",
          "idea": "<idée concrète de vidéo>",
          "caption": "<caption suggéré>",
          "hashtags": "<hashtags>",
          "tip": "<conseil algo court>"
        }
      ]
    }
  ]
}
Répartis intelligemment : plus de paysages (car performent mieux), alterner les types, privilégier les heures de pointe TikTok/Instagram (7h, 12h, 18h, 21h).`;

const TABS = [
  { id: "schedule", label: "Programme", icon: "📅" },
  { id: "analyze", label: "Analyser", icon: "🔍" },
  { id: "viral", label: "Idées Virales", icon: "🔥" },
  { id: "optimize", label: "Titre & Caption", icon: "✨" },
  { id: "monetize", label: "Monétisation", icon: "💰" },
];

const TYPE_COLORS = {
  "Van/Camion 🚐": "#fcb045",
  "Paysages 🏔️": "#25f4ee",
  "FPV Drone 🚁": "#fe2c55",
};

const PLATFORM_COLORS = {
  "TikTok": "#fe2c55",
  "Instagram Reels": "#833ab4",
};

function ScoreRing({ score, size = 80, color = "#fe2c55" }) {
  const r = (size - 10) / 2, circ = 2 * Math.PI * r, offset = circ - (score / 100) * circ;
  return (
    <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="6"/>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth="6"
        strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round"
        style={{ transition: "stroke-dashoffset 1s ease" }}/>
      <text x="50%" y="50%" textAnchor="middle" dominantBaseline="middle"
        style={{ transform: "rotate(90deg)", transformOrigin: "center", fill: "white", fontSize: size * 0.22, fontWeight: 700, fontFamily: "inherit" }}>
        {score}
      </text>
    </svg>
  );
}

function Badge({ priority }) {
  const m = { haute: ["#fe2c55","URGENT"], moyenne: ["#fcb045","MOYEN"], basse: ["#25f4ee","OK"] };
  const [c, l] = m[priority] || ["#aaa", priority];
  return <span style={{ background: c+"22", color: c, border: `1px solid ${c}44`, borderRadius: 4, padding: "2px 8px", fontSize: 10, fontWeight: 700, letterSpacing: 1 }}>{l}</span>;
}

function Dots() {
  return (
    <div style={{ display: "flex", gap: 6, alignItems: "center", justifyContent: "center", padding: "36px 0" }}>
      {[0,1,2].map(i => <div key={i} style={{ width: 10, height: 10, borderRadius: "50%", background: "#fe2c55", animation: `bounce 1.2s ease-in-out ${i*0.2}s infinite` }}/>)}
    </div>
  );
}

function CopyBtn({ text }) {
  const [copied, setCopied] = useState(false);
  return (
    <button onClick={() => { navigator.clipboard?.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
      style={{ padding: "4px 10px", borderRadius: 6, border: "1px solid rgba(255,255,255,0.15)", background: "rgba(255,255,255,0.07)", color: copied ? "#25f4ee" : "rgba(255,255,255,0.6)", cursor: "pointer", fontSize: 11, fontFamily: "inherit", transition: "all 0.2s" }}>
      {copied ? "✅ Copié" : "📋 Copier"}
    </button>
  );
}

function ResultCard({ result }) {
  if (!result) return null;
  const typeColor = TYPE_COLORS[result.contentType] || "#fe2c55";
  return (
    <div style={{ marginTop: 22, animation: "fadeIn 0.5s ease" }}>
      <div style={{ background: "rgba(254,44,85,0.08)", border: "1px solid rgba(254,44,85,0.18)", borderRadius: 16, padding: "18px", display: "flex", alignItems: "center", gap: 14, marginBottom: 12 }}>
        <ScoreRing score={result.score || 0} />
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 16, fontWeight: 800, marginBottom: 5 }}>{result.verdict}</div>
          {result.contentType && <span style={{ background: typeColor+"22", color: typeColor, border: `1px solid ${typeColor}44`, borderRadius: 6, padding: "2px 10px", fontSize: 11, fontWeight: 700 }}>{result.contentType}</span>}
          {result.monetizationTip && <div style={{ background: "rgba(252,176,69,0.1)", border: "1px solid rgba(252,176,69,0.2)", borderRadius: 8, padding: "7px 11px", fontSize: 12, color: "#fcb045", lineHeight: 1.5, marginTop: 8 }}>💰 {result.monetizationTip}</div>}
        </div>
        {result.viralScore !== undefined && <div style={{ textAlign: "center" }}><ScoreRing score={result.viralScore} size={54} color="#25f4ee"/><div style={{ fontSize: 10, color: "rgba(255,255,255,0.4)", marginTop: 2 }}>VIRAL</div></div>}
      </div>

      {result.suggestedCaption && (
        <div style={{ background: "rgba(37,244,238,0.06)", border: "1px solid rgba(37,244,238,0.15)", borderRadius: 10, padding: "11px 13px", marginBottom: 10 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
            <span style={{ color: "#25f4ee", fontWeight: 700, fontSize: 12 }}>✍️ Caption optimisé</span>
            <CopyBtn text={result.suggestedCaption} />
          </div>
          <div style={{ fontSize: 12, color: "rgba(255,255,255,0.75)", lineHeight: 1.6 }}>{result.suggestedCaption}</div>
        </div>
      )}

      {result.suggestedHashtags && (
        <div style={{ background: "rgba(131,58,180,0.08)", border: "1px solid rgba(131,58,180,0.2)", borderRadius: 10, padding: "9px 12px", marginBottom: 10 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
            <span style={{ fontWeight: 700, fontSize: 12, color: "#c084fc" }}>🏷️ Hashtags</span>
            <CopyBtn text={result.suggestedHashtags} />
          </div>
          <div style={{ fontSize: 12, color: "#c084fc", lineHeight: 1.7 }}>{result.suggestedHashtags}</div>
        </div>
      )}

      {result.points?.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 9, marginBottom: 12 }}>
          {result.points.map((p, i) => (
            <div key={i} style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 11, padding: "12px 14px", animation: `fadeIn 0.4s ease ${i*0.1}s both` }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}><span style={{ fontSize: 17 }}>{p.icon}</span><span style={{ fontWeight: 700, fontSize: 13 }}>{p.label}</span></div>
              <p style={{ margin: 0, color: "rgba(255,255,255,0.5)", fontSize: 12, lineHeight: 1.6 }}>{p.text}</p>
            </div>
          ))}
        </div>
      )}

      {result.actions?.length > 0 && (
        <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 12, overflow: "hidden" }}>
          <div style={{ padding: "11px 14px", borderBottom: "1px solid rgba(255,255,255,0.07)", fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.35)", letterSpacing: 1 }}>⚡ ACTIONS À FAIRE</div>
          {result.actions.map((a, i) => (
            <div key={i} style={{ padding: "11px 14px", borderBottom: i < result.actions.length-1 ? "1px solid rgba(255,255,255,0.05)" : "none", display: "flex", alignItems: "flex-start", gap: 9 }}>
              <Badge priority={a.priority}/><span style={{ fontSize: 12, color: "rgba(255,255,255,0.75)", lineHeight: 1.6, flex: 1 }}>{a.action}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function App() {
  const [tab, setTab] = useState("schedule");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [schedule, setSchedule] = useState(null);
  const [scheduleLoading, setScheduleLoading] = useState(false);
  const [expandedDay, setExpandedDay] = useState(null);
  const [fd, setFd] = useState({ title: "", description: "", hashtags: "", duration: "", videoUrl: "", viralType: "Paysages 🏔️", optTitle: "", optCtx: "", mFoll: "", mViews: "", mGoal: "brand deals" });

  const f = (k, v) => setFd(p => ({ ...p, [k]: v }));

  async function callGroq(systemPrompt, userPrompt, maxTokens = 1000) {
    const res = await fetch(GROQ_API, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${GROQ_KEY}` },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: maxTokens,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ]
      })
    });
    const data = await res.json();
    const text = data.choices?.[0]?.message?.content || "";
    return JSON.parse(text.replace(/```json|```/g, "").trim());
  }

  async function callAI(prompt) {
    setLoading(true); setResult(null); setError(null);
    try {
      const parsed = await callGroq(SYSTEM, prompt, 1000);
      setResult(parsed);
    } catch(e) { setError("Erreur IA. Réessaie !"); }
    setLoading(false);
  }

  async function generateSchedule() {
    setScheduleLoading(true); setSchedule(null); setError(null);
    try {
      const parsed = await callGroq(SCHEDULE_SYSTEM, "Génère mon programme hebdomadaire optimal pour 5 à 7 posts par semaine sur TikTok et Instagram Reels. Tiens compte que les paysages performent le mieux. Répartis intelligemment les 3 types de contenu.", 2000);
      setSchedule(parsed);
    } catch(e) { setError("Erreur génération programme. Réessaie !"); }
    setScheduleLoading(false);
  }

  const inp = { width: "100%", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.11)", borderRadius: 10, padding: "11px 13px", color: "white", fontSize: 13, outline: "none", boxSizing: "border-box", fontFamily: "inherit", transition: "border-color 0.2s" };
  const lbl = { color: "rgba(255,255,255,0.45)", fontSize: 11, fontWeight: 700, letterSpacing: 0.8, marginBottom: 5, display: "block" };

  function Btn(label, onClick, active = true, color = "#fe2c55") {
    return (
      <button onClick={onClick} disabled={!active} style={{ width: "100%", padding: "13px", borderRadius: 11, border: "none", cursor: active ? "pointer" : "not-allowed", background: active ? `linear-gradient(135deg,${color},${color}bb)` : "rgba(255,255,255,0.07)", color: "white", fontSize: 13, fontWeight: 700, fontFamily: "inherit", opacity: active ? 1 : 0.5, transition: "all 0.2s" }}>
        {label}
      </button>
    );
  }

  const DAYS_ORDER = ["Lundi","Mardi","Mercredi","Jeudi","Vendredi","Samedi","Dimanche"];

  return (
    <div style={{ minHeight: "100vh", background: "#080808", color: "white", fontFamily: "'Sora','DM Sans',sans-serif", paddingBottom: 60 }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Sora:wght@300;400;600;700;800&display=swap');
        * { box-sizing: border-box; }
        @keyframes bounce { 0%,80%,100%{transform:scale(0)} 40%{transform:scale(1)} }
        @keyframes fadeIn { from{opacity:0;transform:translateY(12px)} to{opacity:1;transform:translateY(0)} }
        input:focus, textarea:focus, select:focus { border-color: rgba(254,44,85,0.5) !important; }
        textarea { resize: vertical; }
        ::-webkit-scrollbar { width: 3px; }
        ::-webkit-scrollbar-thumb { background: #fe2c55; border-radius: 2px; }
        .day-card:hover { border-color: rgba(254,44,85,0.3) !important; }
        .post-card:hover { background: rgba(255,255,255,0.07) !important; }
      `}</style>

      {/* HEADER */}
      <div style={{ background: "linear-gradient(135deg,#0c0c0c,#180a12)", borderBottom: "1px solid rgba(255,255,255,0.06)", padding: "18px 18px 0" }}>
        <div style={{ maxWidth: 720, margin: "0 auto" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
            <div>
              <span style={{ fontSize: 19, fontWeight: 800 }}><span style={{ color: "#fe2c55" }}>Creator</span>AI</span>
              <span style={{ fontSize: 10, background: "rgba(254,44,85,0.15)", color: "#fe2c55", borderRadius: 20, padding: "2px 7px", marginLeft: 7, fontWeight: 600 }}>BETA</span>
              <div style={{ color: "rgba(255,255,255,0.3)", fontSize: 11, marginTop: 2 }}>🚐 Van · 🏔️ Paysages · 🚁 FPV Drone</div>
            </div>
            <div style={{ display: "flex", gap: 5 }}>
              {["TikTok","Reels"].map((p, i) => (
                <div key={p} style={{ padding: "5px 10px", borderRadius: 7, background: i===0?"rgba(254,44,85,0.15)":"rgba(131,58,180,0.15)", color: i===0?"#fe2c55":"#c084fc", fontSize: 10, fontWeight: 700 }}>{p}</div>
              ))}
            </div>
          </div>

          <div style={{ display: "flex", gap: 3, overflowX: "auto" }}>
            {TABS.map(t => (
              <button key={t.id} onClick={() => { setTab(t.id); setResult(null); }} style={{ padding: "9px 13px", borderRadius: "9px 9px 0 0", border: "none", cursor: "pointer", background: tab===t.id?"rgba(254,44,85,0.14)":"transparent", color: tab===t.id?"#fe2c55":"rgba(255,255,255,0.4)", fontWeight: tab===t.id?700:500, fontSize: 11, whiteSpace: "nowrap", borderBottom: tab===t.id?"2px solid #fe2c55":"2px solid transparent", transition: "all 0.2s", fontFamily: "inherit" }}>
                {t.icon} {t.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 720, margin: "0 auto", padding: "22px 15px 0" }}>

        {/* ═══ PROGRAMME ═══ */}
        {tab === "schedule" && (
          <div style={{ animation: "fadeIn 0.4s ease" }}>
            <div style={{ marginBottom: 18 }}>
              <h2 style={{ fontSize: 17, fontWeight: 800, margin: "0 0 4px" }}>📅 Programme hebdomadaire</h2>
              <p style={{ color: "rgba(255,255,255,0.35)", fontSize: 12, margin: "0 0 14px" }}>L'IA génère ton planning optimal 🚐🏔️🚁 pour maximiser tes vues</p>
              {Btn(scheduleLoading ? "Génération en cours..." : schedule ? "🔄 Regénérer le programme" : "✨ Générer mon programme", generateSchedule, !scheduleLoading)}
            </div>

            {scheduleLoading && <Dots />}
            {error && <div style={{ padding: 12, background: "rgba(254,44,85,0.1)", border: "1px solid rgba(254,44,85,0.22)", borderRadius: 9, color: "#fe2c55", fontSize: 12, textAlign: "center" }}>⚠️ {error}</div>}

            {schedule && (
              <div style={{ animation: "fadeIn 0.5s ease" }}>
                <div style={{ background: "linear-gradient(135deg,rgba(254,44,85,0.12),rgba(131,58,180,0.12))", border: "1px solid rgba(254,44,85,0.2)", borderRadius: 12, padding: "12px 15px", marginBottom: 16, fontSize: 13, color: "rgba(255,255,255,0.8)", lineHeight: 1.6 }}>
                  💡 <strong>Stratégie :</strong> {schedule.strategy}
                </div>

                <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
                  {["Van/Camion 🚐","Paysages 🏔️","FPV Drone 🚁"].map(type => {
                    const count = schedule.week?.flatMap(d => d.posts).filter(p => p.type === type).length || 0;
                    return (
                      <div key={type} style={{ background: TYPE_COLORS[type]+"18", border: `1px solid ${TYPE_COLORS[type]}35`, borderRadius: 8, padding: "6px 12px", fontSize: 11, color: TYPE_COLORS[type], fontWeight: 700 }}>
                        {type} · {count}x
                      </div>
                    );
                  })}
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {DAYS_ORDER.map(dayName => {
                    const dayData = schedule.week?.find(d => d.day === dayName);
                    if (!dayData || !dayData.posts?.length) return (
                      <div key={dayName} style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)", borderRadius: 11, padding: "12px 15px", display: "flex", alignItems: "center", gap: 10 }}>
                        <span style={{ fontSize: 12, fontWeight: 700, color: "rgba(255,255,255,0.2)", minWidth: 80 }}>{dayName}</span>
                        <span style={{ fontSize: 11, color: "rgba(255,255,255,0.15)" }}>Jour de repos 😴</span>
                      </div>
                    );
                    const isOpen = expandedDay === dayName;
                    return (
                      <div key={dayName} className="day-card" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.09)", borderRadius: 12, overflow: "hidden", transition: "border-color 0.2s" }}>
                        <div onClick={() => setExpandedDay(isOpen ? null : dayName)} style={{ padding: "12px 15px", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                            <span style={{ fontSize: 13, fontWeight: 800, minWidth: 80 }}>{dayName}</span>
                            <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
                              {dayData.posts.map((p, i) => (
                                <span key={i} style={{ background: TYPE_COLORS[p.type]+"22", color: TYPE_COLORS[p.type], border: `1px solid ${TYPE_COLORS[p.type]}35`, borderRadius: 5, padding: "2px 7px", fontSize: 10, fontWeight: 600 }}>
                                  {p.type?.split(" ")[1]} {p.time}
                                </span>
                              ))}
                            </div>
                          </div>
                          <span style={{ color: "rgba(255,255,255,0.4)", fontSize: 12 }}>{isOpen ? "▲" : "▼"}</span>
                        </div>

                        {isOpen && (
                          <div style={{ borderTop: "1px solid rgba(255,255,255,0.07)", padding: "12px 15px", display: "flex", flexDirection: "column", gap: 12 }}>
                            {dayData.posts.map((post, i) => {
                              const tc = TYPE_COLORS[post.type] || "#fe2c55";
                              const pc = PLATFORM_COLORS[post.platform] || "#fe2c55";
                              return (
                                <div key={i} className="post-card" style={{ background: "rgba(255,255,255,0.03)", border: `1px solid ${tc}25`, borderRadius: 10, padding: "12px 13px", transition: "background 0.15s" }}>
                                  <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 8, flexWrap: "wrap" }}>
                                    <span style={{ background: tc+"22", color: tc, border: `1px solid ${tc}44`, borderRadius: 6, padding: "2px 8px", fontSize: 10, fontWeight: 700 }}>{post.type}</span>
                                    <span style={{ background: pc+"22", color: pc, border: `1px solid ${pc}44`, borderRadius: 6, padding: "2px 8px", fontSize: 10, fontWeight: 700 }}>{post.platform}</span>
                                    <span style={{ fontSize: 11, color: "rgba(255,255,255,0.4)" }}>🕐 {post.time}</span>
                                  </div>
                                  <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 6 }}>💡 {post.idea}</div>
                                  {post.tip && <div style={{ fontSize: 11, color: "#fcb045", marginBottom: 8 }}>⚡ {post.tip}</div>}
                                  {post.caption && (
                                    <div style={{ background: "rgba(37,244,238,0.06)", border: "1px solid rgba(37,244,238,0.12)", borderRadius: 8, padding: "8px 10px", marginBottom: 7 }}>
                                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                                        <span style={{ fontSize: 10, fontWeight: 700, color: "#25f4ee" }}>✍️ CAPTION</span>
                                        <CopyBtn text={post.caption} />
                                      </div>
                                      <div style={{ fontSize: 11, color: "rgba(255,255,255,0.7)", lineHeight: 1.5 }}>{post.caption}</div>
                                    </div>
                                  )}
                                  {post.hashtags && (
                                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
                                      <div style={{ fontSize: 10, color: "#c084fc", lineHeight: 1.6, flex: 1 }}>{post.hashtags}</div>
                                      <CopyBtn text={post.hashtags} />
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
          </div>
        )}

        {/* ═══ ANALYSER ═══ */}
        {tab === "analyze" && (
          <div style={{ animation: "fadeIn 0.4s ease" }}>
            <h2 style={{ fontSize: 17, fontWeight: 800, margin: "0 0 4px" }}>🔍 Analyse ta vidéo</h2>
            <p style={{ color: "rgba(255,255,255,0.35)", fontSize: 12, margin: "0 0 16px" }}>Colle l'URL ou décris ta vidéo — l'IA t'analyse tout</p>
            <div style={{ display: "flex", flexDirection: "column", gap: 11 }}>
              <div>
                <label style={lbl}>URL DE LA VIDÉO (TikTok ou Instagram)</label>
                <input style={inp} placeholder="https://www.tiktok.com/@toi/video/..." value={fd.videoUrl} onChange={e => f("videoUrl", e.target.value)}/>
                <div style={{ fontSize: 10, color: "rgba(255,255,255,0.25)", marginTop: 4 }}>L'IA analysera le contexte pour optimiser ta prochaine vidéo similaire</div>
              </div>
              <div><label style={lbl}>TITRE / ACCROCHE</label><input style={inp} placeholder="Ex: Run FPV dans les Alpes 🏔️" value={fd.title} onChange={e => f("title", e.target.value)}/></div>
              <div><label style={lbl}>CAPTION UTILISÉ</label><textarea style={{ ...inp, minHeight: 70 }} placeholder="Ton texte de publication…" value={fd.description} onChange={e => f("description", e.target.value)}/></div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 9 }}>
                <div><label style={lbl}>HASHTAGS</label><input style={inp} placeholder="#fpv #drone #vanlife…" value={fd.hashtags} onChange={e => f("hashtags", e.target.value)}/></div>
                <div><label style={lbl}>DURÉE (sec)</label><input style={inp} type="number" placeholder="30" value={fd.duration} onChange={e => f("duration", e.target.value)}/></div>
              </div>
              <div><label style={lbl}>TYPE DE CONTENU</label>
                <select style={{ ...inp, cursor: "pointer" }} value={fd.viralType} onChange={e => f("viralType", e.target.value)}>
                  <option>Paysages 🏔️</option>
                  <option>Van/Camion 🚐</option>
                  <option>FPV Drone 🚁</option>
                </select>
              </div>
              {Btn(loading ? "Analyse…" : "⚡ Analyser avec l'IA", () => callAI(`Analyse cette vidéo ${fd.viralType} :\nURL : "${fd.videoUrl}"\nTitre : "${fd.title}"\nCaption : "${fd.description}"\nHashtags : "${fd.hashtags}"\nDurée : ${fd.duration}s\nOptimise caption et hashtags.`), !loading && !!(fd.title || fd.videoUrl))}
            </div>
            {loading && <Dots />}
            {error && <div style={{ marginTop: 14, padding: 12, background: "rgba(254,44,85,0.1)", border: "1px solid rgba(254,44,85,0.22)", borderRadius: 9, color: "#fe2c55", fontSize: 12, textAlign: "center" }}>⚠️ {error}</div>}
            <ResultCard result={result} />
          </div>
        )}

        {/* ═══ IDÉES VIRALES ═══ */}
        {tab === "viral" && (
          <div style={{ animation: "fadeIn 0.4s ease" }}>
            <h2 style={{ fontSize: 17, fontWeight: 800, margin: "0 0 4px" }}>🔥 Idées de contenu viral</h2>
            <p style={{ color: "rgba(255,255,255,0.35)", fontSize: 12, margin: "0 0 16px" }}>L'IA génère des idées taillées pour ton univers van/drone/voyage</p>
            <div style={{ display: "flex", flexDirection: "column", gap: 11 }}>
              <div><label style={lbl}>TYPE DE CONTENU</label>
                <select style={{ ...inp, cursor: "pointer" }} value={fd.viralType} onChange={e => f("viralType", e.target.value)}>
                  <option>Paysages 🏔️</option>
                  <option>Van/Camion 🚐</option>
                  <option>FPV Drone 🚁</option>
                </select>
              </div>
              <div><label style={lbl}>CONTEXTE (optionnel)</label><input style={inp} placeholder="Ex: je suis dans les Alpes en ce moment, neige…" value={fd.optCtx} onChange={e => f("optCtx", e.target.value)}/></div>
              {Btn(loading ? "Génération…" : "🔥 Générer des idées virales", () => callAI(`Génère des idées de contenu viral pour ${fd.viralType} sur TikTok et Instagram Reels.\nContexte : "${fd.optCtx || "van aménagé, voyage en France et Europe"}"\nDonne des idées très concrètes avec caption et hashtags.`), !loading)}
            </div>
            {loading && <Dots />}
            {error && <div style={{ marginTop: 14, padding: 12, background: "rgba(254,44,85,0.1)", border: "1px solid rgba(254,44,85,0.22)", borderRadius: 9, color: "#fe2c55", fontSize: 12, textAlign: "center" }}>⚠️ {error}</div>}
            <ResultCard result={result} />
          </div>
        )}

        {/* ═══ OPTIMISER ═══ */}
        {tab === "optimize" && (
          <div style={{ animation: "fadeIn 0.4s ease" }}>
            <h2 style={{ fontSize: 17, fontWeight: 800, margin: "0 0 4px" }}>✨ Titre & Caption</h2>
            <p style={{ color: "rgba(255,255,255,0.35)", fontSize: 12, margin: "0 0 16px" }}>Un bon titre + caption = 3× plus de vues</p>
            <div style={{ display: "flex", flexDirection: "column", gap: 11 }}>
              <div><label style={lbl}>TITRE ACTUEL</label><input style={inp} placeholder="Ex: Run FPV #4" value={fd.optTitle} onChange={e => f("optTitle", e.target.value)}/></div>
              <div><label style={lbl}>DE QUOI PARLE LA VIDÉO ?</label><textarea style={{ ...inp, minHeight: 68 }} placeholder="Ex: run FPV dans une forêt de pins en Ardèche, vol très technique…" value={fd.optCtx} onChange={e => f("optCtx", e.target.value)}/></div>
              <div><label style={lbl}>TYPE DE CONTENU</label>
                <select style={{ ...inp, cursor: "pointer" }} value={fd.viralType} onChange={e => f("viralType", e.target.value)}>
                  <option>Paysages 🏔️</option>
                  <option>Van/Camion 🚐</option>
                  <option>FPV Drone 🚁</option>
                </select>
              </div>
              {Btn(loading ? "Optimisation…" : "✨ Optimiser", () => callAI(`Optimise ce titre pour une vidéo ${fd.viralType} sur TikTok/Reels :\nTitre actuel : "${fd.optTitle}"\nContexte : "${fd.optCtx}"\nPropose des titres améliorés, un caption et des hashtags optimisés.`), !loading && !!fd.optTitle)}
            </div>
            {loading && <Dots />}
            {error && <div style={{ marginTop: 14, padding: 12, background: "rgba(254,44,85,0.1)", border: "1px solid rgba(254,44,85,0.22)", borderRadius: 9, color: "#fe2c55", fontSize: 12, textAlign: "center" }}>⚠️ {error}</div>}
            <ResultCard result={result} />
          </div>
        )}

        {/* ═══ MONÉTISATION ═══ */}
        {tab === "monetize" && (
          <div style={{ animation: "fadeIn 0.4s ease" }}>
            <h2 style={{ fontSize: 17, fontWeight: 800, margin: "0 0 4px" }}>💰 Monétisation</h2>
            <p style={{ color: "rgba(255,255,255,0.35)", fontSize: 12, margin: "0 0 16px" }}>Transforme ton univers van/drone en revenus réels</p>
            <div style={{ display: "flex", flexDirection: "column", gap: 11 }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 9 }}>
                <div><label style={lbl}>FOLLOWERS</label><input style={inp} type="number" placeholder="5000" value={fd.mFoll} onChange={e => f("mFoll", e.target.value)}/></div>
                <div><label style={lbl}>VUES MOYENNES</label><input style={inp} type="number" placeholder="10000" value={fd.mViews} onChange={e => f("mViews", e.target.value)}/></div>
              </div>
              <div><label style={lbl}>OBJECTIF PRINCIPAL</label>
                <select style={{ ...inp, cursor: "pointer" }} value={fd.mGoal} onChange={e => f("mGoal", e.target.value)}>
                  <option value="brand deals">🤝 Partenariats / Brand deals</option>
                  <option value="équipement drone/van">🎥 Sponsors équipement drone & van</option>
                  <option value="fonds createurs">💸 Fonds créateurs TikTok/Meta</option>
                  <option value="affiliation">🔗 Affiliation matériel FPV</option>
                  <option value="prestation video">🎬 Prestations vidéo / Pilote FPV pro</option>
                  <option value="formation">🎓 Formation FPV / Montage</option>
                </select>
              </div>
              {Btn(loading ? "Analyse…" : "💰 Obtenir ma stratégie", () => callAI(`Stratégie de monétisation pour un créateur van/FPV/paysages sur TikTok et Instagram Reels :\nFollowers : ${fd.mFoll}\nVues moyennes : ${fd.mViews}\nObjectif : ${fd.mGoal}\nDonne un score de monétisabilité et un plan d'action très concret adapté à son univers.`), !loading, "#fcb045")}
            </div>
            {loading && <Dots />}
            {error && <div style={{ marginTop: 14, padding: 12, background: "rgba(254,44,85,0.1)", border: "1px solid rgba(254,44,85,0.22)", borderRadius: 9, color: "#fe2c55", fontSize: 12, textAlign: "center" }}>⚠️ {error}</div>}
            <ResultCard result={result} />
          </div>
        )}
      </div>
    </div>
  );
}
