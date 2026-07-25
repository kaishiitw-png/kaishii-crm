import { useState, useEffect, useMemo } from "react";

const now_iso = () => new Date().toISOString();
function toISO(d) { return d.toISOString().slice(0, 10); }
function fmtDate(s) { return (s || "").replace(/-/g, "/"); }
function fmtDT(s) { if (!s) return "—"; const d = new Date(s); return `${d.getFullYear()}/${String(d.getMonth()+1).padStart(2,"0")}/${String(d.getDate()).padStart(2,"0")} ${String(d.getHours()).padStart(2,"0")}:${String(d.getMinutes()).padStart(2,"0")}`; }
function fmtShort(s) { if (!s) return "—"; const d = new Date(s); return `${d.getFullYear()}/${String(d.getMonth()+1).padStart(2,"0")}/${String(d.getDate()).padStart(2,"0")}`; }
function pct(c, p) { return c > 0 && p > 0 ? Math.round((1 - c / p) * 100) : 0; }
function statusObj(v) { return STATUSES.find(s => s.value === v) || STATUSES[0]; }

const DEFAULT_PRODUCTS = [
  { id:"p1", name:"璽·滿盈·中秋極選 (奶蛋素)", cost:680, price:1480, desc:"綜合米果酥12入 / 烏豆沙蛋黃酥三入 / 貴妃荔枝酥一盒 / 一口鳳梨酥六入", size:"33.0×21.0×16.5cm", category:"中秋禮盒", image:"", notes:"", createdAt:now_iso(), history:[{date:now_iso(),cost:680,price:1480,note:"初始建立"}] },
  { id:"p2", name:"好事蛋黃酥 (全素)", cost:260, price:600, desc:"好事蛋黃酥六入", size:"27.8×20.2×4.8cm", category:"中秋禮盒", image:"", notes:"", createdAt:now_iso(), history:[{date:now_iso(),cost:260,price:600,note:"初始建立"}] },
  { id:"p3", name:"好事松露綠豆椪 (五辛素)", cost:300, price:700, desc:"好事松露綠豆椪六入", size:"27.8×20.2×4.8cm", category:"中秋禮盒", image:"", notes:"", createdAt:now_iso(), history:[{date:now_iso(),cost:300,price:700,note:"初始建立"}] },
];
const DEFAULT_COMBOS = [{id:"c1",name:"中秋經典組合 A",items:["p1","p2"],extraCost:50,price:1980,desc:"極選 + 好事蛋黃酥",createdAt:now_iso(),history:[{date:now_iso(),price:1980,note:"初始建立"}]}];
const DISCOUNTS_TEXT = ["10-29盒：96折","30-99盒：92折","100-199盒：88折","200+盒：85折"];
const SHIPPING = ["滿 $4,000 → 一個地址免運","每滿 $10,000 再可享 1 個免費配送點"];
const TERMS = ["於收到報價單後，有效期限內簽署並回傳。","訂金：簽署後 10 日內支付總金額 30%。","尾款：請於出貨前 3 日付清剩餘 70% 尾款。","出貨方式：一次出貨，出貨前結清。","付款方式：現金匯款。","以上報價，皆含稅"];
const STATUSES = [{value:"draft",label:"草稿",color:"#888"},{value:"sent",label:"已寄出",color:"#2563eb"},{value:"followed",label:"已跟進",color:"#f59e0b"},{value:"signed",label:"已簽回",color:"#16a34a"},{value:"rejected",label:"未成交",color:"#dc2626"}];
const DEFAULT_TAGS = ["中秋","喜餅","企業","VIP","日本","素食","客製化","年節"];
const ACTIVITY_TYPES = [{value:"quote",label:"📄 報價單",color:"#2563eb"},{value:"call",label:"📞 電話聯繫",color:"#16a34a"},{value:"email",label:"✉️ Email",color:"#8b5cf6"},{value:"meeting",label:"🤝 拜訪/會議",color:"#f59e0b"},{value:"sample",label:"🎁 寄送樣品",color:"#ec4899"},{value:"event",label:"🎪 活動邀請",color:"#06b6d4"},{value:"order",label:"✅ 成交訂單",color:"#16a34a"},{value:"note",label:"📝 備註",color:"#888"}];

const DEFAULT_SETTINGS = { logoUrl: "", companyName: "開 璽", address: "新北市板橋區陽明街104號", phone: "+886-2-22586156", website: "www.kaishii.com.tw", email: "kaishii.tw@gmail.com" };

const GCIS_BASE = "https://data.gcis.nat.gov.tw/od/data/api/236BF29E-BD41-43FC-BFA4-5E7E1DC292C0";
const PROXY = "https://corsproxy.io/?url=";
async function lookupTaxId(tid){try{const url=`${GCIS_BASE}?$format=json&$filter=Business_Accounting_NO eq ${tid}&$skip=0&$top=1`;const r=await fetch(PROXY+encodeURIComponent(url));if(!r.ok)return null;const d=await r.json();if(d?.length)return{company:d[0].Company_Name,address:d[0].Company_Location||""}}catch{}return null}
async function lookupName(name){try{const url=`${GCIS_BASE}?$format=json&$filter=Company_Name like ${name}&$skip=0&$top=5`;const r=await fetch(PROXY+encodeURIComponent(url));if(!r.ok)return[];const d=await r.json();return(d||[]).map(x=>({company:x.Company_Name,taxId:x.Business_Accounting_NO,address:x.Company_Location||""}))}catch{return[]}}
async function getAIPricing(items,tq){try{const s=items.map(i=>`${i.name}:成本$${i.cost},報價$${i.price},數量${i.qty||1}`).join("\n");const r=await fetch("https://api.anthropic.com/v1/messages",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({model:"claude-sonnet-4-6",max_tokens:1000,messages:[{role:"user",content:`你是開璽糕餅的定價顧問。簡短建議（繁體中文、3-5點）：\n${s}\n總量：${tq}盒\n折扣：10-29盒96折,30-99盒92折,100-199盒88折,200+盒85折\n分析利潤率、折扣策略、搭配建議。直接給建議。`}]})});const data=await r.json();return data.content?.map(c=>c.text).join("")||"無法取得"}catch{return"AI 暫時無法使用"}}

function load(k,fb){try{const r=localStorage.getItem(k);return r?JSON.parse(r):fb}catch{return fb}}
function save(k,v){try{localStorage.setItem(k,JSON.stringify(v))}catch{}}

// ═══════════════════
// APP
// ═══════════════════
export default function App(){
  const [tab,setTab]=useState("quotes");
  const [quotes,setQuotes]=useState([]);const [products,setProducts]=useState([]);const [combos,setCombos]=useState([]);const [customers,setCustomers]=useState([]);const [settings,setSettings]=useState(DEFAULT_SETTINGS);
  const [current,setCurrent]=useState(null);const [ready,setReady]=useState(false);

  useEffect(()=>{
    const q=load("k7-q",[]),p=load("k7-p",DEFAULT_PRODUCTS),c=load("k7-c",DEFAULT_COMBOS),cu=load("k7-cu",[]),s=load("k7-s",DEFAULT_SETTINGS);
    setQuotes(q);setProducts(p.length?p:DEFAULT_PRODUCTS);setCombos(c.length?c:DEFAULT_COMBOS);setCustomers(cu);setSettings({...DEFAULT_SETTINGS,...s});setReady(true);
  },[]);
  useEffect(()=>{if(ready)save("k7-q",quotes)},[quotes,ready]);
  useEffect(()=>{if(ready)save("k7-p",products)},[products,ready]);
  useEffect(()=>{if(ready)save("k7-c",combos)},[combos,ready]);
  useEffect(()=>{if(ready)save("k7-cu",customers)},[customers,ready]);
  useEffect(()=>{if(ready)save("k7-s",settings)},[settings,ready]);

  function syncCustomer(q){if(!q.client.company)return;setCustomers(prev=>{const ex=prev.find(c=>c.unified===q.client.unified&&q.client.unified)||prev.find(c=>c.company===q.client.company);if(ex)return prev.map(c=>c.id===ex.id?{...c,company:q.client.company||c.company,address:q.client.address||c.address,unified:q.client.unified||c.unified,contact:q.client.contact||c.contact,phone:q.client.phone||c.phone,updatedAt:now_iso()}:c);return[...prev,{id:"cu"+Date.now(),company:q.client.company,address:q.client.address,unified:q.client.unified,contact:q.client.contact,phone:q.client.phone,tags:[],activities:[],notes:"",createdAt:now_iso(),updatedAt:now_iso()}]})}
  function saveQuote(q){setQuotes(prev=>{const i=prev.findIndex(x=>x.id===q.id);if(i>=0){const n=[...prev];n[i]=q;return n}return[q,...prev]});setCurrent(q);syncCustomer(q)}

  if(!ready)return<div style={{padding:48,textAlign:"center",color:"#aaa",fontFamily:"sans-serif"}}>載入中...</div>;
  if(tab==="preview"&&current)return<Preview quote={current} settings={settings} products={products} onBack={()=>setTab("edit")}/>;
  if(tab==="edit"&&current)return<EditQuote quote={current} products={products} combos={combos} customers={customers} onChange={q=>{saveQuote(q);setCurrent(q)}} onPreview={()=>{saveQuote(current);setTab("preview")}} onBack={()=>setTab("quotes")}/>;

  return(
    <Shell tab={tab} setTab={setTab}>
      {tab==="quotes"&&<QuoteList quotes={quotes} setQuotes={setQuotes} onNew={()=>{const n=new Date(),e=new Date();e.setDate(e.getDate()+30);setCurrent({id:Date.now().toString(),client:{company:"",address:"",unified:"",contact:"",phone:"",email:""},dates:{quote:toISO(n),delivery:"",validity:toISO(e)},items:[],status:"draft",notes:"",createdAt:n.toISOString()});setTab("edit")}} onEdit={q=>{setCurrent(q);setTab("edit")}}/>}
      {tab==="customers"&&<CustomerManager customers={customers} setCustomers={setCustomers} quotes={quotes}/>}
      {tab==="products"&&<ProductManager products={products} setProducts={setProducts}/>}
      {tab==="combos"&&<ComboManager combos={combos} setCombos={setCombos} products={products}/>}
      {tab==="settings"&&<SettingsPage settings={settings} setSettings={setSettings}/>}
    </Shell>
  );
}

function Shell({tab,setTab,children}){
  const tabs=[["quotes","📋 報價單"],["customers","👥 客戶"],["products","📦 產品"],["combos","🎁 組合"],["settings","⚙️ 設定"]];
  return(<div style={{fontFamily:"'Noto Sans TC',sans-serif",maxWidth:880,margin:"0 auto",padding:"14px 16px",color:"#1a1a1a"}}>
    <div style={{display:"flex",alignItems:"center",borderBottom:"3px solid #c41818",paddingBottom:10,marginBottom:14,gap:3,flexWrap:"wrap"}}>
      <span style={{fontSize:20,fontWeight:900,letterSpacing:4,marginRight:10}}>開璽</span>
      {tabs.map(([k,l])=><button key={k} onClick={()=>setTab(k)} style={{padding:"6px 11px",borderRadius:6,border:"none",background:tab===k?"#c41818":"transparent",color:tab===k?"#fff":"#666",fontWeight:700,fontSize:11,cursor:"pointer"}}>{l}</button>)}
    </div>{children}</div>);
}

// ═══════════════════
// SETTINGS
// ═══════════════════
function SettingsPage({settings:s,setSettings}){
  const set=(k,v)=>setSettings(p=>({...p,[k]:v}));
  return(
    <div style={sectionStyle}>
      <h2 style={{...secTitle,fontSize:14}}>⚙️ 報價單設定（PDF 輸出用）</h2>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
        <div style={{gridColumn:"1/-1"}}>
          <Field label="Logo 圖片網址（留空則顯示文字 Logo）" value={s.logoUrl} onChange={v=>set("logoUrl",v)} placeholder="https://example.com/logo.png"/>
          {s.logoUrl&&<img src={s.logoUrl} alt="Logo preview" style={{maxHeight:60,marginTop:6,borderRadius:4}} onError={e=>{e.target.style.display="none"}}/>}
        </div>
        <Field label="公司名稱（文字 Logo）" value={s.companyName} onChange={v=>set("companyName",v)}/>
        <Field label="地址" value={s.address} onChange={v=>set("address",v)}/>
        <Field label="電話" value={s.phone} onChange={v=>set("phone",v)}/>
        <Field label="網站" value={s.website} onChange={v=>set("website",v)}/>
        <Field label="Email" value={s.email} onChange={v=>set("email",v)}/>
      </div>
      <p style={{fontSize:11,color:"#999",marginTop:12}}>💡 Logo 建議使用透明背景 PNG，高度建議 60-80px</p>
    </div>
  );
}

// ═══════════════════
// QUOTE LIST
// ═══════════════════
function QuoteList({quotes,setQuotes,onNew,onEdit}){
  const [filter,setFilter]=useState("all");
  const filtered=filter==="all"?quotes:quotes.filter(q=>q.status===filter);
  return(<>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12,flexWrap:"wrap",gap:8}}>
      <div style={{display:"flex",gap:4,flexWrap:"wrap"}}>
        <Chip label="全部" c={quotes.length} active={filter==="all"} color="#333" onClick={()=>setFilter("all")}/>
        {STATUSES.map(s=><Chip key={s.value} label={s.label} c={quotes.filter(q=>q.status===s.value).length} active={filter===s.value} color={s.color} onClick={()=>setFilter(s.value)}/>)}
      </div>
      <button onClick={onNew} style={primaryBtn}>+ 新報價單</button>
    </div>
    {filtered.length===0&&<Empty msg={quotes.length===0?"按上方新增":"此分類無報價單"}/>}
    {filtered.map(q=>{const st=statusObj(q.status);const tp=q.items.reduce((s,i)=>s+(i.price||0)*(i.qty||1),0);const tc=q.items.reduce((s,i)=>s+(i.cost||0)*(i.qty||1),0);const mg=pct(tc,tp);return(
      <div key={q.id} style={{...cardStyle,borderLeft:`4px solid ${st.color}`}}>
        <div style={{flex:1,cursor:"pointer",minWidth:0}} onClick={()=>onEdit(q)}>
          <div style={{fontWeight:700,fontSize:14}}>{q.client.company||"（未填公司）"}</div>
          <div style={{fontSize:11,color:"#999",marginTop:2}}>{fmtDate(q.dates.quote)} ｜ {q.items.length} 項 ｜ {q.client.contact||"—"}</div>
          {q.items.length>0&&<div style={{fontSize:11,marginTop:3}}>報價 ${tp.toLocaleString()} <span style={{color:mg>=25?"#16a34a":mg>=15?"#f59e0b":"#dc2626",marginLeft:6,fontWeight:600}}>利潤{mg}%</span></div>}
        </div>
        <div style={{display:"flex",alignItems:"center",gap:6}}>
          <select value={q.status} onChange={e=>setQuotes(p=>p.map(x=>x.id===q.id?{...x,status:e.target.value}:x))} style={{padding:"3px 6px",borderRadius:4,border:`2px solid ${st.color}`,fontWeight:600,fontSize:11,color:st.color,background:"#fff",cursor:"pointer"}}>{STATUSES.map(s=><option key={s.value} value={s.value}>{s.label}</option>)}</select>
          <button onClick={()=>{if(confirm("刪除？"))setQuotes(p=>p.filter(x=>x.id!==q.id))}} style={iconBtn}>🗑</button>
        </div>
      </div>
    )})}
  </>);
}

// ═══════════════════
// CUSTOMER MANAGER
// ═══════════════════
function CustomerManager({customers,setCustomers,quotes}){
  const [search,setSearch]=useState("");const [tagFilter,setTagFilter]=useState("");const [detail,setDetail]=useState(null);const [addAct,setAddAct]=useState(null);const [newAct,setNewAct]=useState({type:"call",content:"",date:toISO(new Date())});const [showExport,setShowExport]=useState(false);
  const allTags=useMemo(()=>{const s=new Set(DEFAULT_TAGS);customers.forEach(c=>(c.tags||[]).forEach(t=>s.add(t)));return[...s]},[customers]);
  const filtered=customers.filter(c=>{if(search&&!c.company?.includes(search)&&!c.contact?.includes(search)&&!c.unified?.includes(search))return false;if(tagFilter&&!(c.tags||[]).includes(tagFilter))return false;return true});
  function updCust(id,fn){setCustomers(prev=>prev.map(c=>c.id===id?fn(c):c))}
  function toggleTag(cid,tag){updCust(cid,c=>{const t=c.tags||[];return{...c,tags:t.includes(tag)?t.filter(x=>x!==tag):[...t,tag],updatedAt:now_iso()}})}
  function addActivityLog(cid){updCust(cid,c=>({...c,activities:[...(c.activities||[]),{...newAct,id:"a"+Date.now(),createdAt:now_iso()}],updatedAt:now_iso()}));setNewAct({type:"call",content:"",date:toISO(new Date())});setAddAct(null)}

  if(detail){
    const c=customers.find(x=>x.id===detail);if(!c){setDetail(null);return null}
    const cQ=quotes.filter(q=>(q.client.unified&&q.client.unified===c.unified)||q.client.company===c.company);
    const rev=cQ.filter(q=>q.status==="signed").reduce((s,q)=>s+q.items.reduce((ss,i)=>ss+(i.price||0)*(i.qty||1),0),0);
    const allAct=[...(c.activities||[]).map(a=>({...a,src:"m"})),...cQ.map(q=>({type:"quote",content:`報價 ${q.items.length}項 $${q.items.reduce((s,i)=>s+(i.price||0)*(i.qty||1),0).toLocaleString()} [${statusObj(q.status).label}]`,date:q.dates.quote,createdAt:q.createdAt,src:"a"}))].sort((a,b)=>new Date(b.date||b.createdAt)-new Date(a.date||a.createdAt));
    return(<div>
      <button onClick={()=>setDetail(null)} style={{background:"none",border:"none",cursor:"pointer",color:"#888",fontSize:13,marginBottom:12}}>← 返回</button>
      <div style={{background:"#fff",border:"1px solid #e8e8e8",borderRadius:10,padding:20,marginBottom:12}}>
        <div style={{display:"flex",justifyContent:"space-between"}}><div><h2 style={{margin:0,fontSize:18,fontWeight:800}}>{c.company}</h2><div style={{fontSize:12,color:"#888",marginTop:4,lineHeight:1.8}}>{c.unified&&`統編 ${c.unified} ｜ `}{c.contact&&`${c.contact} ｜ `}{c.phone&&`📞 ${c.phone}`}</div>{c.address&&<div style={{fontSize:12,color:"#888"}}>📍 {c.address}</div>}<div style={{fontSize:11,color:"#bbb",marginTop:4}}>建立 {fmtShort(c.createdAt)}</div></div><div style={{textAlign:"right"}}>{rev>0&&<div style={{fontSize:20,fontWeight:800,color:"#16a34a"}}>${rev.toLocaleString()}</div>}<div style={{fontSize:11,color:"#888"}}>{cQ.length} 張報價</div></div></div>
        <div style={{marginTop:12,display:"flex",gap:4,flexWrap:"wrap"}}><span style={{fontSize:11,color:"#999"}}>標籤：</span>{allTags.map(t=>{const a=(c.tags||[]).includes(t);return<button key={t} onClick={()=>toggleTag(c.id,t)} style={{padding:"3px 10px",borderRadius:12,border:`1px solid ${a?"#c41818":"#ddd"}`,background:a?"#c4181814":"#fff",color:a?"#c41818":"#aaa",fontSize:11,cursor:"pointer",fontWeight:a?700:400}}>{a?"✓ ":""}{t}</button>})}</div>
        <textarea value={c.notes||""} onChange={e=>updCust(c.id,cc=>({...cc,notes:e.target.value}))} placeholder="備註..." style={{...taStyle,marginTop:10,minHeight:36}}/>
        <div style={{display:"flex",gap:8,marginTop:10}}><button onClick={()=>setAddAct(c.id)} style={{...primaryBtn,fontSize:12,padding:"7px 14px"}}>+ 互動記錄</button><button onClick={()=>{if(confirm("刪除？")){setCustomers(p=>p.filter(x=>x.id!==c.id));setDetail(null)}}} style={{...secBtn,fontSize:12,color:"#ccc"}}>🗑 刪除</button></div>
      </div>
      {addAct===c.id&&<div style={{...sectionStyle,borderLeft:"4px solid #2563eb"}}><h3 style={{margin:"0 0 10px",fontSize:13,fontWeight:700}}>新增互動</h3><div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}><label><span style={{fontSize:11,color:"#888"}}>類型</span><select value={newAct.type} onChange={e=>setNewAct(p=>({...p,type:e.target.value}))} style={{width:"100%",padding:"7px",borderRadius:4,border:"1px solid #ccc",fontSize:13}}>{ACTIVITY_TYPES.map(a=><option key={a.value} value={a.value}>{a.label}</option>)}</select></label><Field label="日期" type="date" value={newAct.date} onChange={v=>setNewAct(p=>({...p,date:v}))}/><div style={{gridColumn:"1/-1"}}><Field label="內容" value={newAct.content} onChange={v=>setNewAct(p=>({...p,content:v}))} placeholder="如：寄了中秋DM"/></div></div><div style={{display:"flex",gap:8,marginTop:10}}><button onClick={()=>addActivityLog(c.id)} style={primaryBtn}>儲存</button><button onClick={()=>setAddAct(null)} style={secBtn}>取消</button></div></div>}
      <div style={sectionStyle}><h3 style={{margin:"0 0 12px",fontSize:13,fontWeight:700,color:"#888"}}>📅 互動時間軸</h3>
        {allAct.length===0&&<div style={{color:"#ccc",fontSize:12,padding:16,textAlign:"center"}}>尚無記錄</div>}
        <div style={{position:"relative",paddingLeft:20}}><div style={{position:"absolute",left:6,top:0,bottom:0,width:2,background:"#e2e8f0"}}/>
          {allAct.map((a,i)=>{const at=ACTIVITY_TYPES.find(x=>x.value===a.type)||ACTIVITY_TYPES[7];return(<div key={i} style={{position:"relative",marginBottom:14,paddingLeft:16}}><div style={{position:"absolute",left:-2,top:4,width:10,height:10,borderRadius:"50%",background:at.color,border:"2px solid #fff"}}/><div style={{display:"flex",justifyContent:"space-between"}}><span style={{fontSize:12,fontWeight:600,color:at.color}}>{at.label}</span><span style={{fontSize:10,color:"#bbb"}}>{fmtShort(a.date)}</span></div><div style={{fontSize:12,color:"#444",marginTop:2}}>{a.content}</div>{a.src==="a"&&<span style={{fontSize:9,color:"#ccc"}}>自動</span>}</div>)})}
        </div>
      </div>
    </div>);
  }

  if(showExport){const el=filtered.map(c=>`${c.company}\t${c.unified||""}\t${c.contact||""}\t${c.phone||""}\t${(c.tags||[]).join(",")}`).join("\n");return(<div><button onClick={()=>setShowExport(false)} style={{background:"none",border:"none",cursor:"pointer",color:"#888",fontSize:13,marginBottom:12}}>← 返回</button><div style={sectionStyle}><h3 style={{margin:"0 0 8px",fontSize:14,fontWeight:700}}>匯出 ({filtered.length} 筆)</h3><textarea readOnly value={`公司\t統編\t窗口\t電話\t標籤\n${el}`} style={{width:"100%",minHeight:180,padding:10,fontFamily:"monospace",fontSize:11,border:"1px solid #ccc",borderRadius:6,boxSizing:"border-box"}}/><button onClick={()=>{navigator.clipboard?.writeText(`公司\t統編\t窗口\t電話\t標籤\n${el}`);alert("已複製！")}} style={{...primaryBtn,marginTop:8}}>📋 複製</button></div></div>)}

  return(<>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10,flexWrap:"wrap",gap:8}}>
      <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="🔍 搜尋..." style={{padding:"8px 12px",borderRadius:6,border:"1px solid #ccc",fontSize:13,width:220}}/>
      <div style={{display:"flex",gap:6}}><button onClick={()=>setShowExport(true)} style={{...secBtn,fontSize:12}}>📤 匯出</button><button onClick={()=>setCustomers(p=>[...p,{id:"cu"+Date.now(),company:"",address:"",unified:"",contact:"",phone:"",tags:[],activities:[],notes:"",createdAt:now_iso(),updatedAt:now_iso()}])} style={{...primaryBtn,fontSize:12}}>+ 新增客戶</button></div>
    </div>
    <div style={{display:"flex",gap:4,marginBottom:12,flexWrap:"wrap"}}><span style={{fontSize:11,color:"#999"}}>篩選：</span><button onClick={()=>setTagFilter("")} style={{...chipStyle,border:!tagFilter?"2px solid #333":"1px solid #ddd",color:!tagFilter?"#333":"#999"}}>全部 {customers.length}</button>{allTags.map(t=>{const cnt=customers.filter(c=>(c.tags||[]).includes(t)).length;if(!cnt)return null;return<button key={t} onClick={()=>setTagFilter(tagFilter===t?"":t)} style={{...chipStyle,border:tagFilter===t?"2px solid #c41818":"1px solid #ddd",color:tagFilter===t?"#c41818":"#999"}}>{t} {cnt}</button>})}</div>
    {filtered.length===0&&<Empty msg="無客戶"/>}
    {filtered.map(c=>{const cQ=quotes.filter(q=>(q.client.unified&&q.client.unified===c.unified)||q.client.company===c.company);const last=[...(c.activities||[])].sort((a,b)=>new Date(b.date||b.createdAt)-new Date(a.date||a.createdAt))[0];return(
      <div key={c.id} style={{...cardStyle,cursor:"pointer",flexDirection:"column",alignItems:"stretch",gap:4}} onClick={()=>setDetail(c.id)}>
        <div style={{display:"flex",justifyContent:"space-between"}}><div><span style={{fontWeight:700,fontSize:14}}>{c.company||"（未填）"}</span>{c.contact&&<span style={{fontSize:12,color:"#888",marginLeft:8}}>{c.contact}</span>}</div><span style={{fontSize:11,color:"#bbb"}}>{cQ.length} 報價</span></div>
        <div style={{display:"flex",justifyContent:"space-between"}}><div style={{display:"flex",gap:4,flexWrap:"wrap"}}>{(c.tags||[]).map(t=><span key={t} style={{fontSize:10,padding:"2px 8px",borderRadius:10,background:"#c4181814",color:"#c41818",fontWeight:600}}>{t}</span>)}</div><span style={{fontSize:10,color:"#bbb"}}>{last?`最近 ${fmtShort(last.date)}`:`建立 ${fmtShort(c.createdAt)}`}</span></div>
      </div>
    )})}
  </>);
}

// ═══════════════════
// PRODUCT MANAGER
// ═══════════════════
function ProductManager({products,setProducts}){
  const [editing,setEditing]=useState(null);const [histView,setHistView]=useState(null);const [changeNote,setChangeNote]=useState("");
  const cats=[...new Set(products.map(p=>p.category).filter(Boolean))];
  function saveP(p,note){setProducts(prev=>{const i=prev.findIndex(x=>x.id===p.id);if(i>=0){const old=prev[i];const ch=old.cost!==p.cost||old.price!==p.price;const u={...p};if(ch)u.history=[...(old.history||[]),{date:now_iso(),cost:p.cost,price:p.price,note:note||"價格更新"}];const n=[...prev];n[i]=u;return n}return[...prev,{...p,createdAt:now_iso(),history:[{date:now_iso(),cost:p.cost,price:p.price,note:"初始建立"}]}]});setEditing(null);setChangeNote("")}
  if(editing)return(<div style={sectionStyle}><h2 style={secTitle}>{editing.name?"編輯":"新增"}產品</h2><ProductForm p={editing} setP={setEditing} cats={cats}/><div style={{marginTop:10}}><Field label="異動原因" value={changeNote} onChange={setChangeNote} placeholder="如：原料漲價"/></div><div style={{display:"flex",gap:8,marginTop:14}}><button onClick={()=>saveP(editing,changeNote)} style={primaryBtn}>儲存</button><button onClick={()=>{setEditing(null);setChangeNote("")}} style={secBtn}>取消</button></div></div>);
  return(<>
    <div style={{display:"flex",justifyContent:"space-between",marginBottom:12}}><span style={{fontSize:12,color:"#888"}}>{products.length} 個產品</span><button onClick={()=>setEditing({id:"p"+Date.now(),name:"",cost:0,price:0,desc:"",size:"",category:"",image:"",notes:""})} style={primaryBtn}>+ 新增</button></div>
    {products.map(p=>{const mg=pct(p.cost,p.price);const hist=p.history||[];const sh=histView===p.id;return(
      <div key={p.id} style={{background:"#fff",border:"1px solid #e8e8e8",borderRadius:8,marginBottom:8,overflow:"hidden"}}>
        <div style={{padding:"12px 14px",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <div style={{display:"flex",gap:10,alignItems:"center",flex:1,minWidth:0}}>
            {p.image?<img src={p.image} alt="" style={{width:44,height:44,objectFit:"cover",borderRadius:6}}/>:<div style={{width:44,height:44,background:"#f0f0f0",borderRadius:6,display:"flex",alignItems:"center",justifyContent:"center",color:"#ccc"}}>📦</div>}
            <div><div style={{fontWeight:700,fontSize:13}}>{p.name}</div><div style={{fontSize:11,color:"#888",marginTop:2}}>成本 <span style={{color:"#c41818",fontWeight:600}}>${p.cost.toLocaleString()}</span> → ${p.price.toLocaleString()} <span style={{color:mg>=25?"#16a34a":"#f59e0b",fontWeight:600}}>利潤{mg}%</span></div><div style={{fontSize:10,color:"#bbb"}}>建立 {fmtShort(p.createdAt)} ｜ {hist.length} 筆記錄</div></div>
          </div>
          <div style={{display:"flex",gap:4}}><SmBtn label={sh?"收起":`📊(${hist.length})`} onClick={()=>setHistView(sh?null:p.id)} color="#2563eb"/><SmBtn label="編輯" onClick={()=>setEditing({...p})}/><SmBtn label="🗑" onClick={()=>{if(confirm("刪除？"))setProducts(prev=>prev.filter(x=>x.id!==p.id))}} color="#ccc"/></div>
        </div>
        {sh&&<div style={{background:"#f8fafc",borderTop:"1px solid #e8e8e8",padding:"12px 16px"}}><div style={{fontSize:12,fontWeight:700,color:"#2563eb",marginBottom:8}}>📊 價格歷史</div>{hist.length>1&&<PriceChart history={hist}/>}<div style={{position:"relative",paddingLeft:20,marginTop:6}}><div style={{position:"absolute",left:6,top:0,bottom:0,width:2,background:"#e2e8f0"}}/>{[...hist].reverse().map((h,i)=>{const prev2=hist.length>1&&i<hist.length-1?[...hist].reverse()[i+1]:null;const cd=prev2?h.cost-prev2.cost:0;const pd=prev2?h.price-prev2.price:0;return(<div key={i} style={{position:"relative",marginBottom:10,paddingLeft:16}}><div style={{position:"absolute",left:-2,top:4,width:10,height:10,borderRadius:"50%",background:i===0?"#2563eb":"#cbd5e1",border:"2px solid #fff"}}/><div style={{fontSize:11,color:"#888"}}>{fmtDT(h.date)}</div><div style={{fontSize:12,marginTop:2}}>成本 ${(h.cost||0).toLocaleString()}{cd!==0&&<span style={{fontSize:11,color:cd>0?"#dc2626":"#16a34a",marginLeft:4}}>{cd>0?"▲":"▼"}${Math.abs(cd)}</span>} | 售價 ${(h.price||0).toLocaleString()}{pd!==0&&<span style={{fontSize:11,color:pd>0?"#16a34a":"#dc2626",marginLeft:4}}>{pd>0?"▲":"▼"}${Math.abs(pd)}</span>} | <span style={{color:pct(h.cost,h.price)>=25?"#16a34a":"#f59e0b"}}>{pct(h.cost,h.price)}%</span></div>{h.note&&<div style={{fontSize:11,color:"#666",marginTop:1}}>📝 {h.note}</div>}</div>)})}</div></div>}
      </div>
    )})}
  </>);
}
function PriceChart({history:h}){const W=300,H=70,P=8;const mn=Math.min(...h.map(x=>x.cost||0),...h.map(x=>x.price||0))*0.9;const mx=Math.max(...h.map(x=>x.cost||0),...h.map(x=>x.price||0))*1.05;const rng=mx-mn||1;const tX=i=>P+(i/Math.max(h.length-1,1))*(W-P*2);const tY=v=>H-P-((v-mn)/rng)*(H-P*2);return<svg width={W} height={H} style={{background:"#fff",borderRadius:6,border:"1px solid #e2e8f0"}}><path d={h.map((x,i)=>`${i===0?"M":"L"}${tX(i)},${tY(x.cost||0)}`).join(" ")} fill="none" stroke="#dc2626" strokeWidth="2"/><path d={h.map((x,i)=>`${i===0?"M":"L"}${tX(i)},${tY(x.price||0)}`).join(" ")} fill="none" stroke="#2563eb" strokeWidth="2"/>{h.map((x,i)=><circle key={"c"+i} cx={tX(i)} cy={tY(x.cost||0)} r="3" fill="#dc2626"/>)}{h.map((x,i)=><circle key={"p"+i} cx={tX(i)} cy={tY(x.price||0)} r="3" fill="#2563eb"/>)}<text x={W-P} y={12} textAnchor="end" fontSize="8" fill="#2563eb">●售價</text><text x={W-P} y={22} textAnchor="end" fontSize="8" fill="#dc2626">●成本</text></svg>}
function ProductForm({p,setP,cats}){const set=(k,v)=>setP(prev=>({...prev,[k]:v}));const mg=pct(p.cost,p.price);return<div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}><Field label="產品名稱" value={p.name} onChange={v=>set("name",v)} span={2}/><Field label="成本" type="number" value={p.cost} onChange={v=>set("cost",Number(v))}/><Field label="售價" type="number" value={p.price} onChange={v=>set("price",Number(v))}/><div style={{gridColumn:"1/-1",background:mg>=25?"#f0fdf4":mg>=15?"#fffbeb":"#fef2f2",borderRadius:6,padding:"8px 12px",fontSize:13}}>利潤 <strong style={{color:mg>=25?"#16a34a":mg>=15?"#f59e0b":"#dc2626",fontSize:18}}>{mg}%</strong></div><Field label="分類" value={p.category} onChange={v=>set("category",v)} list="pcats"/><Field label="規格" value={p.size} onChange={v=>set("size",v)}/><Field label="說明" value={p.desc} onChange={v=>set("desc",v)} span={2}/><Field label="圖片網址" value={p.image} onChange={v=>set("image",v)} span={2}/>{p.image&&<div style={{gridColumn:"1/-1"}}><img src={p.image} alt="" style={{maxHeight:80,borderRadius:6}} onError={e=>{e.target.style.display="none"}}/></div>}<div style={{gridColumn:"1/-1"}}><label><span style={{fontSize:11,color:"#888"}}>注意事項</span><textarea value={p.notes||""} onChange={e=>set("notes",e.target.value)} style={taStyle}/></label></div><datalist id="pcats">{cats.map(c=><option key={c} value={c}/>)}</datalist></div>}

// ═══════════════════
// COMBO MANAGER
// ═══════════════════
function ComboManager({combos,setCombos,products}){
  const [editing,setEditing]=useState(null);
  const comboCost=c=>c.items.reduce((s,pid)=>{const p=products.find(x=>x.id===pid);return s+(p?.cost||0)},0)+(c.extraCost||0);
  function saveC(c){setCombos(prev=>{const i=prev.findIndex(x=>x.id===c.id);if(i>=0){const old=prev[i];const u={...c};if(old.price!==c.price)u.history=[...(old.history||[]),{date:now_iso(),price:c.price,note:"更新"}];const n=[...prev];n[i]=u;return n}return[...prev,{...c,createdAt:now_iso(),history:[{date:now_iso(),price:c.price,note:"初始建立"}]}]});setEditing(null)}
  if(editing){const ec=editing,set=(k,v)=>setEditing(p=>({...p,[k]:v}));const cost=ec.items.reduce((s,pid)=>{const p=products.find(x=>x.id===pid);return s+(p?.cost||0)},0)+(ec.extraCost||0);const mg=pct(cost,ec.price);return(<div style={sectionStyle}><h2 style={secTitle}>{ec.name?"編輯":"新增"}組合</h2><div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}><Field label="名稱" value={ec.name} onChange={v=>set("name",v)} span={2}/><Field label="說明" value={ec.desc} onChange={v=>set("desc",v)} span={2}/><div style={{gridColumn:"1/-1"}}><span style={{fontSize:11,color:"#888"}}>包含產品</span><div style={{display:"flex",gap:6,flexWrap:"wrap",marginTop:4}}>{products.map(p=>{const inc=ec.items.includes(p.id);return<button key={p.id} onClick={()=>set("items",inc?ec.items.filter(x=>x!==p.id):[...ec.items,p.id])} style={{padding:"5px 12px",borderRadius:4,border:`1px solid ${inc?"#16a34a":"#ddd"}`,background:inc?"#f0fdf4":"#fff",fontSize:12,cursor:"pointer"}}>{inc?"✓ ":""}{p.name}</button>})}</div></div><Field label="額外成本" type="number" value={ec.extraCost||0} onChange={v=>set("extraCost",Number(v))}/><Field label="售價" type="number" value={ec.price} onChange={v=>set("price",Number(v))}/><div style={{gridColumn:"1/-1",background:"#f8f8f8",borderRadius:6,padding:"8px 12px",fontSize:13}}>成本 ${cost.toLocaleString()} → 售價 ${ec.price.toLocaleString()} <span style={{color:mg>=25?"#16a34a":"#f59e0b",fontWeight:700}}>利潤{mg}%</span></div></div><div style={{display:"flex",gap:8,marginTop:14}}><button onClick={()=>saveC(ec)} style={primaryBtn}>儲存</button><button onClick={()=>setEditing(null)} style={secBtn}>取消</button></div></div>)}
  return(<><div style={{display:"flex",justifyContent:"space-between",marginBottom:12}}><span style={{fontSize:12,color:"#888"}}>{combos.length} 個</span><button onClick={()=>setEditing({id:"c"+Date.now(),name:"",items:[],extraCost:0,price:0,desc:""})} style={primaryBtn}>+ 新增</button></div>{combos.map(c=>{const cost=comboCost(c),mg=pct(cost,c.price);return<div key={c.id} style={cardStyle}><div style={{flex:1}}><div style={{fontWeight:700,fontSize:13}}>🎁 {c.name}</div><div style={{fontSize:11,color:"#888",marginTop:2}}>{c.items.map(pid=>products.find(x=>x.id===pid)?.name||pid).join(" + ")}</div><div style={{fontSize:11,marginTop:2}}>成本 ${cost.toLocaleString()} → ${c.price.toLocaleString()} <span style={{color:mg>=25?"#16a34a":"#f59e0b",fontWeight:600}}>利潤{mg}%</span></div></div><div style={{display:"flex",gap:4}}><SmBtn label="編輯" onClick={()=>setEditing({...c})}/><SmBtn label="🗑" onClick={()=>{if(confirm("刪除？"))setCombos(p=>p.filter(x=>x.id!==c.id))}} color="#ccc"/></div></div>})}</>);
}

// ═══════════════════
// EDIT QUOTE
// ═══════════════════
function EditQuote({quote,products,combos,customers,onChange,onPreview,onBack}){
  const [q,setQ]=useState(quote);const [lookingUp,setLU]=useState(false);const [sugg,setSugg]=useState([]);const [addMode,setAddMode]=useState(null);const [aiTip,setAiTip]=useState("");const [aiL,setAiL]=useState(false);const [showCustPick,setShowCustPick]=useState(false);
  useEffect(()=>{onChange(q)},[q]);
  const setClient=fn=>setQ(p=>({...p,client:fn(p.client)}));const setDates=fn=>setQ(p=>({...p,dates:fn(p.dates)}));
  async function taxIdBlur(){const t=q.client.unified.trim();if(t.length!==8)return;setLU(true);const r=await lookupTaxId(t);setLU(false);if(r)setClient(c=>({...c,company:r.company,address:r.address||c.address}))}
  async function nameSearch(){const n=q.client.company.trim();if(n.length<2)return;setLU(true);const r=await lookupName(n);setLU(false);setSugg(r)}
  function pickCust(c){setClient(()=>({company:c.company,address:c.address||"",unified:c.unified||"",contact:c.contact||"",phone:c.phone||"",email:c.email||""}));setShowCustPick(false)}
  function addCatalog(pid){const p=products.find(x=>x.id===pid);if(!p)return;setQ(prev=>({...prev,items:[...prev.items,{...p,key:Date.now(),qty:1,type:"catalog",originalPrice:0,customNote:""}]}));setAddMode(null)}
  function addCombo(cid){const c=combos.find(x=>x.id===cid);if(!c)return;const cost=c.items.reduce((s,pid)=>{const p=products.find(x=>x.id===pid);return s+(p?.cost||0)},0)+(c.extraCost||0);setQ(prev=>({...prev,items:[...prev.items,{id:cid,key:Date.now(),qty:1,type:"combo",name:c.name,cost,price:c.price,originalPrice:0,desc:c.desc,customNote:"",image:""}]}));setAddMode(null)}
  function addCustom(){setQ(prev=>({...prev,items:[...prev.items,{id:"cust",key:Date.now(),qty:1,type:"custom",name:"客製化商品",cost:0,price:0,originalPrice:0,desc:"",customNote:"⚠ Logo 需提供 AI/EPS 原始檔\n⚠ 最終打樣確認後無法修改",image:""}]}));setAddMode(null)}
  function addAdhoc(){setQ(prev=>({...prev,items:[...prev.items,{id:"adhoc",key:Date.now(),qty:1,type:"adhoc",name:"",cost:0,price:0,originalPrice:0,desc:"",customNote:"",image:""}]}));setAddMode(null)}
  function removeItem(k){setQ(p=>({...p,items:p.items.filter(x=>x.key!==k)}))}
  function upd(k,f,v){setQ(p=>({...p,items:p.items.map(x=>x.key===k?{...x,[f]:v}:x)}))}
  function applyMargin(k,m){setQ(p=>({...p,items:p.items.map(x=>x.key===k?{...x,price:Math.round(x.cost/(1-m/100))}:x)}))}
  const tc=q.items.reduce((s,i)=>s+(i.cost||0)*(i.qty||1),0);const tp=q.items.reduce((s,i)=>s+(i.price||0)*(i.qty||1),0);const tq=q.items.reduce((s,i)=>s+(i.qty||1),0);const tm=pct(tc,tp);
  const typeBadge=t=>{if(t==="custom")return{l:"客製化",c:"#f59e0b"};if(t==="adhoc")return{l:"臨時",c:"#8b5cf6"};if(t==="combo")return{l:"組合",c:"#2563eb"};return{l:"既有",c:"#16a34a"}};

  return(<div style={{fontFamily:"'Noto Sans TC',sans-serif",maxWidth:760,margin:"0 auto",padding:"14px 20px",color:"#1a1a1a"}}>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",borderBottom:"3px solid #c41818",paddingBottom:10,marginBottom:14}}><button onClick={onBack} style={{background:"none",border:"none",cursor:"pointer",color:"#888",fontSize:13}}>← 返回</button><span style={{fontWeight:800,fontSize:16}}>編輯報價單</span><div style={{width:60}}/></div>

    <Sec title="客戶資訊">
      <button onClick={()=>setShowCustPick(!showCustPick)} style={{...secBtn,fontSize:11,marginBottom:10}}>👥 從客戶庫選</button>
      {showCustPick&&customers.length>0&&<div style={{background:"#f0f9ff",border:"1px solid #bae6fd",borderRadius:6,padding:10,marginBottom:10,maxHeight:120,overflow:"auto"}}>{customers.filter(c=>c.company).map(c=><div key={c.id} onClick={()=>pickCust(c)} style={{padding:"6px 10px",cursor:"pointer",borderBottom:"1px solid #e0f2fe",fontSize:12}}><strong>{c.company}</strong>{c.contact&&<span style={{color:"#888",marginLeft:8}}>{c.contact}</span>}</div>)}</div>}
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
        <div style={{position:"relative"}}><Field label="統編（8碼查詢）" value={q.client.unified} onChange={v=>setClient(c=>({...c,unified:v}))} onBlur={taxIdBlur}/>{lookingUp&&<small style={{color:"#c41818",position:"absolute",right:8,top:22,fontSize:10}}>查詢中...</small>}</div>
        <div style={{position:"relative"}}><Field label="公司名稱" value={q.client.company} onChange={v=>{setClient(c=>({...c,company:v}));setSugg([])}}/><button onClick={nameSearch} style={{position:"absolute",right:4,top:18,padding:"5px 8px",background:"#eee",border:"1px solid #ccc",borderRadius:4,fontSize:10,cursor:"pointer"}}>🔍</button>{sugg.length>0&&<div style={ddStyle}>{sugg.map((s,i)=><div key={i} onClick={()=>{setClient(c=>({...c,company:s.company,unified:s.taxId,address:s.address||c.address}));setSugg([])}} style={ddItem}><strong>{s.company}</strong> ({s.taxId})</div>)}</div>}</div>
        <Field label="地址" value={q.client.address} onChange={v=>setClient(c=>({...c,address:v}))} span={2}/>
        <Field label="窗口 / Email" value={q.client.contact} onChange={v=>setClient(c=>({...c,contact:v}))}/>
        <Field label="電話" value={q.client.phone} onChange={v=>setClient(c=>({...c,phone:v}))}/>
      </div>
    </Sec>

    <Sec title="日期"><div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:10}}>
      <Field label="報價日期" type="date" value={q.dates.quote} onChange={v=>setDates(d=>({...d,quote:v}))}/>
      <Field label="到貨日期" type="date" value={q.dates.delivery} onChange={v=>setDates(d=>({...d,delivery:v}))}/>
      <Field label="有效期" type="date" value={q.dates.validity} onChange={v=>setDates(d=>({...d,validity:v}))}/>
    </div></Sec>

    <Sec title="產品明細">
      <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:10}}>
        <button onClick={()=>setAddMode(addMode==="catalog"?null:"catalog")} style={{...addBtnS,borderColor:"#16a34a",color:"#16a34a"}}>📦 產品庫</button>
        <button onClick={()=>setAddMode(addMode==="combo"?null:"combo")} style={{...addBtnS,borderColor:"#2563eb",color:"#2563eb"}}>🎁 組合</button>
        <button onClick={addCustom} style={{...addBtnS,borderColor:"#f59e0b",color:"#f59e0b"}}>✏️ 客製化</button>
        <button onClick={addAdhoc} style={{...addBtnS,borderColor:"#8b5cf6",color:"#8b5cf6"}}>➕ 臨時</button>
      </div>
      {addMode==="catalog"&&<Picker label="產品" color="#16a34a" items={products.map(p=>({id:p.id,text:`${p.name} $${p.price}`}))} onPick={addCatalog} onClose={()=>setAddMode(null)}/>}
      {addMode==="combo"&&<Picker label="組合" color="#2563eb" items={combos.map(c=>({id:c.id,text:`${c.name} $${c.price}`}))} onPick={addCombo} onClose={()=>setAddMode(null)}/>}
      {q.items.length===0&&<Empty msg="尚未新增"/>}
      {q.items.map(item=>{const b=typeBadge(item.type),ed=item.type!=="catalog"&&item.type!=="combo",mg=pct(item.cost,item.price);return(
        <div key={item.key} style={{...cardStyle,borderLeft:`4px solid ${b.c}`,flexDirection:"column",gap:8,alignItems:"stretch"}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
            <div style={{display:"flex",alignItems:"center",gap:6}}><span style={{fontSize:10,padding:"2px 8px",borderRadius:10,background:b.c+"18",color:b.c,fontWeight:700}}>{b.l}</span>{ed?<input value={item.name} onChange={e=>upd(item.key,"name",e.target.value)} style={inlineInput} placeholder="品名"/>:<strong style={{fontSize:13}}>{item.name}</strong>}</div>
            <button onClick={()=>removeItem(item.key)} style={iconBtn}>✕</button>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr 1fr auto",gap:8,alignItems:"end"}}>
            <Field label="成本" type="number" value={item.cost} onChange={v=>upd(item.key,"cost",Number(v))}/>
            <Field label="原價（刪除線）" type="number" value={item.originalPrice||0} onChange={v=>upd(item.key,"originalPrice",Number(v))}/>
            <Field label="報價" type="number" value={item.price} onChange={v=>upd(item.key,"price",Number(v))}/>
            <Field label="數量" type="number" value={item.qty||1} onChange={v=>upd(item.key,"qty",Math.max(1,Number(v)))}/>
            <div style={{fontSize:13,fontWeight:700,color:mg>=25?"#16a34a":mg>=15?"#f59e0b":"#dc2626",paddingBottom:8}}>{mg}%</div>
          </div>
          <div style={{display:"flex",gap:4,alignItems:"center"}}><span style={{fontSize:10,color:"#aaa"}}>利潤：</span>{[15,20,25,30,35,40].map(m=><button key={m} onClick={()=>applyMargin(item.key,m)} style={{padding:"2px 7px",borderRadius:4,border:"1px solid #ddd",fontSize:10,cursor:"pointer",color:mg===m?"#c41818":"#666"}}>{m}%</button>)}</div>
          <Field label="說明" value={item.desc} onChange={v=>upd(item.key,"desc",v)}/>
          {item.type==="custom"&&<label><span style={{fontSize:11,color:"#f59e0b",fontWeight:600}}>⚠ 注意事項（印出）</span><textarea value={item.customNote||""} onChange={e=>upd(item.key,"customNote",e.target.value)} style={{...taStyle,borderColor:"#fcd34d",background:"#fffbeb"}}/></label>}
        </div>
      )})}
      {q.items.length>0&&<div style={{background:"#1a1a1a",color:"#fff",borderRadius:8,padding:"12px 16px",marginTop:8,display:"flex",justifyContent:"space-between",alignItems:"center",fontSize:13,flexWrap:"wrap",gap:8}}>
        <div>成本 <strong>${tc.toLocaleString()}</strong> → 報價 <strong style={{fontSize:16}}>${tp.toLocaleString()}</strong> 利潤 <strong style={{color:tm>=25?"#4ade80":tm>=15?"#fbbf24":"#f87171"}}>{tm}%</strong> ({tq}盒)</div>
        <button onClick={async()=>{setAiL(true);const t=await getAIPricing(q.items,tq);setAiTip(t);setAiL(false)}} disabled={aiL} style={{padding:"6px 14px",background:"#c41818",border:"none",borderRadius:6,color:"#fff",fontSize:12,fontWeight:700,cursor:"pointer",opacity:aiL?0.6:1}}>{aiL?"分析中...":"🤖 AI建議"}</button>
      </div>}
      {aiTip&&<div style={{background:"#f0f9ff",border:"1px solid #bae6fd",borderRadius:8,padding:14,marginTop:8,fontSize:12.5,lineHeight:1.8,whiteSpace:"pre-line"}}><strong style={{color:"#0369a1"}}>🤖 AI 建議</strong><br/>{aiTip}<button onClick={()=>setAiTip("")} style={{display:"block",marginTop:8,background:"none",border:"none",color:"#999",fontSize:11,cursor:"pointer"}}>關閉</button></div>}
    </Sec>

    <Sec title="內部備註"><textarea value={q.notes||""} onChange={e=>setQ(p=>({...p,notes:e.target.value}))} placeholder="追蹤筆記..." style={taStyle}/></Sec>
    <button onClick={onPreview} style={{width:"100%",padding:"14px 0",background:"#c41818",color:"#fff",border:"none",borderRadius:8,fontSize:15,fontWeight:700,cursor:"pointer",letterSpacing:2}}>預覽 & 列印 PDF</button>
  </div>);
}
function Picker({label,color,items,onPick,onClose}){return<div style={{background:color+"08",border:`1px solid ${color}44`,borderRadius:8,padding:10,marginBottom:10}}><div style={{fontSize:11,color,fontWeight:600,marginBottom:6}}>{label}：</div><div style={{display:"flex",flexWrap:"wrap",gap:4}}>{items.map(i=><button key={i.id} onClick={()=>onPick(i.id)} style={{padding:"5px 10px",borderRadius:4,border:`1px solid ${color}44`,background:"#fff",fontSize:11,cursor:"pointer"}}>{i.text}</button>)}</div><button onClick={onClose} style={{marginTop:6,background:"none",border:"none",color:"#999",fontSize:10,cursor:"pointer"}}>收起</button></div>}

// ═══════════════════════════════════════
// PREVIEW — matches actual quotation format
// ═══════════════════════════════════════
function Preview({quote:q,settings:s,products,onBack}){
  useEffect(()=>{setTimeout(()=>window.print(),600)},[]);
  const cust=q.items.filter(i=>i.type==="custom"&&i.customNote);
  const total=q.items.reduce((sum,i)=>sum+(i.price||0)*(i.qty||1),0);
  // Collect images from items (match to product catalog for image URL)
  const itemImages=q.items.map(i=>{
    const catalogP=products.find(p=>p.id===i.id);
    const img=i.image||catalogP?.image||"";
    const label=i.name;
    const size=i.size||catalogP?.size||"";
    return img?{img,label,size}:null;
  }).filter(Boolean);

  const P={fontFamily:"'Noto Sans TC',sans-serif",maxWidth:780,margin:"0 auto",padding:"36px 44px",color:"#1a1a1a",fontSize:13,lineHeight:1.7};

  return(
    <>
      <style>{`@media print{.np{display:none!important}body{margin:0;padding:0}@page{margin:10mm 8mm}}`}</style>
      <div className="np" style={{textAlign:"center",padding:10,background:"#f0f0f0",position:"sticky",top:0,zIndex:10}}>
        <button onClick={onBack} style={{marginRight:10,padding:"7px 16px",borderRadius:6,border:"1px solid #333",background:"#fff",cursor:"pointer",fontSize:13}}>← 返回編輯</button>
        <button onClick={()=>window.print()} style={{padding:"7px 16px",borderRadius:6,border:"none",background:"#c41818",color:"#fff",cursor:"pointer",fontWeight:700,fontSize:13}}>🖨 列印 / 存 PDF</button>
      </div>

      <div style={P}>
        {/* ─── HEADER ─── */}
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",borderBottom:"3px solid #1a1a1a",paddingBottom:12}}>
          {s.logoUrl
            ? <img src={s.logoUrl} alt="Logo" style={{maxHeight:65}} onError={e=>{e.target.style.display="none"}}/>
            : <div style={{fontSize:40,fontWeight:900,letterSpacing:10}}>{s.companyName||"開 璽"}</div>}
          <div style={{textAlign:"right",fontSize:11.5,color:"#444",lineHeight:2}}>
            <div>{s.address}</div>
            <div>📞 {s.phone}　🌐 {s.website}</div>
            <div>✉ {s.email}</div>
          </div>
        </div>

        {/* ─── TITLE ─── */}
        <h1 style={{textAlign:"center",fontSize:28,fontWeight:900,letterSpacing:16,margin:"20px 0 24px"}}>報 價 單</h1>

        {/* ─── CLIENT + DATES ─── */}
        <div style={{display:"flex",justifyContent:"space-between",marginBottom:20}}>
          <div style={{lineHeight:2.1}}>
            <div style={{fontWeight:700,fontSize:15}}>{q.client.company||"—"}</div>
            {q.client.address&&<div>地址：　{q.client.address}</div>}
            {q.client.unified&&<div>統編：　{q.client.unified}</div>}
            {q.client.contact&&<div>窗口：　{q.client.contact}</div>}
            {q.client.phone&&<div>聯繫電話：　{q.client.phone}</div>}
          </div>
          <div style={{textAlign:"right",lineHeight:2.1}}>
            <div>報價日期：　{fmtDate(q.dates.quote)}</div>
            {q.dates.delivery&&<div>到貨日期：　{fmtDate(q.dates.delivery)}</div>}
            <div style={{marginTop:8}}>報價有效期：{fmtDate(q.dates.validity)}</div>
          </div>
        </div>

        {/* ─── PRODUCT TABLE ─── */}
        <table style={{width:"100%",borderCollapse:"collapse",marginBottom:4}}>
          <thead>
            <tr style={{background:"#1a1a1a",color:"#fff"}}>
              <th style={{padding:"10px 8px",textAlign:"center",width:"28%"}}>產品名稱</th>
              <th style={{padding:"10px 8px",textAlign:"center",width:"10%"}}>數量</th>
              <th style={{padding:"10px 8px",textAlign:"center",width:"14%"}}>價格</th>
              <th style={{padding:"10px 8px",textAlign:"center"}}>說明</th>
              <th style={{padding:"10px 8px",textAlign:"center",width:"14%"}}>小計</th>
            </tr>
          </thead>
          <tbody>
            {q.items.map(i=>(
              <tr key={i.key} style={{borderBottom:"1px solid #ddd"}}>
                <td style={{padding:"12px 8px",textAlign:"center",fontWeight:600,lineHeight:1.5}}>{i.name}</td>
                <td style={{padding:"12px 8px",textAlign:"center"}}>{i.qty||1}</td>
                <td style={{padding:"12px 8px",textAlign:"center"}}>
                  {i.originalPrice>0&&i.originalPrice!==i.price&&(
                    <div style={{textDecoration:"line-through",color:"#999",fontSize:12}}>${i.originalPrice.toLocaleString()}</div>
                  )}
                  <div style={{fontWeight:600}}>${i.price.toLocaleString()}</div>
                </td>
                <td style={{padding:"12px 8px",textAlign:"center",fontSize:12,lineHeight:1.6}}>{i.desc}</td>
                <td style={{padding:"12px 8px",textAlign:"center",fontWeight:700}}>${((i.price||0)*(i.qty||1)).toLocaleString()}</td>
              </tr>
            ))}
            <tr style={{background:"#f5f5f5"}}>
              <td colSpan={4} style={{padding:"10px 8px",textAlign:"right",fontWeight:700,fontSize:14}}>合　計</td>
              <td style={{padding:"10px 8px",textAlign:"center",fontWeight:900,fontSize:16}}>${total.toLocaleString()}</td>
            </tr>
          </tbody>
        </table>

        {/* ─── DISCOUNT + SHIPPING BAR ─── */}
        <table style={{width:"100%",borderCollapse:"collapse",marginBottom:0,marginTop:16}}>
          <tbody><tr>
            <td style={{width:"50%",background:"#f5f5f5",padding:"12px 16px",verticalAlign:"top",border:"1px solid #ddd"}}>
              <div style={{fontWeight:700,marginBottom:6}}>優惠區間</div>
              {DISCOUNTS_TEXT.map((d,i)=><div key={i} style={{lineHeight:1.8}}>{d}</div>)}
            </td>
            <td style={{width:"50%",background:"#f5f5f5",padding:"12px 16px",verticalAlign:"top",border:"1px solid #ddd"}}>
              <div style={{fontWeight:700,marginBottom:6}}>運費規則</div>
              {SHIPPING.map((sh,i)=><div key={i} style={{lineHeight:1.8}}>{sh}</div>)}
            </td>
          </tr></tbody>
        </table>

        {/* ─── PRODUCT IMAGES ─── */}
        {itemImages.length>0&&(
          <div style={{marginTop:20,marginBottom:16}}>
            <div style={{display:"flex",flexWrap:"wrap",gap:16,justifyContent:"center"}}>
              {itemImages.map((im,i)=>(
                <div key={i} style={{textAlign:"center",maxWidth:itemImages.length<=2?220:180}}>
                  <img src={im.img} alt={im.label} style={{width:"100%",maxHeight:160,objectFit:"contain",borderRadius:6}} onError={e=>{e.target.parentElement.style.display="none"}}/>
                  <div style={{fontSize:12,fontWeight:600,marginTop:6}}>▶{im.label}</div>
                  {im.size&&<div style={{fontSize:11,color:"#888"}}>尺寸: {im.size}</div>}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ─── CUSTOM NOTES ─── */}
        {cust.length>0&&(
          <div style={{border:"2px solid #f59e0b",borderRadius:6,padding:14,marginBottom:16,background:"#fffbeb"}}>
            <div style={{fontWeight:700,fontSize:13,color:"#b45309",marginBottom:6}}>⚠ 客製化商品注意事項</div>
            {cust.map((it,idx)=><div key={idx} style={{fontSize:12,marginBottom:4,whiteSpace:"pre-line"}}><strong>{it.name}：</strong>{it.customNote}</div>)}
          </div>
        )}

        {/* ─── TERMS ─── */}
        <div style={{background:"#1a1a1a",color:"#fff",display:"inline-block",padding:"4px 14px",fontWeight:700,fontSize:12.5,marginTop:16}}>條款及細則</div>
        <ol style={{paddingLeft:20,lineHeight:2.2,fontSize:12.5,marginBottom:32}}>
          {TERMS.map((t,i)=><li key={i}>{t}</li>)}
        </ol>

        {/* ─── SIGNATURE ─── */}
        <div style={{display:"flex",justifyContent:"flex-end",marginTop:16}}>
          <div style={{textAlign:"center"}}>
            <div style={{borderBottom:"1px solid #1a1a1a",width:220,height:44}}/>
            <div style={{fontSize:13,marginTop:6}}>簽名/蓋章</div>
          </div>
        </div>
      </div>
    </>
  );
}

// ─── Shared ───
function Sec({title,children}){return<section style={sectionStyle}><h2 style={secTitle}>{title}</h2>{children}</section>}
function Field({label,value,onChange,type="text",placeholder,span,onBlur,list}){return<label style={{display:"block",gridColumn:span===2?"1/-1":undefined}}><span style={{fontSize:11,color:"#888",display:"block",marginBottom:2}}>{label}</span><input type={type} value={value} onChange={e=>onChange(e.target.value)} onBlur={onBlur} placeholder={placeholder} list={list} style={{width:"100%",padding:"7px 10px",borderRadius:4,border:"1px solid #ccc",fontSize:13,boxSizing:"border-box"}}/></label>}
function Chip({label,c,active,color,onClick}){return<button onClick={onClick} style={{...chipStyle,border:active?`2px solid ${color}`:"1px solid #ddd",color:active?color:"#999",background:active?color+"14":"#fff"}}>{label} {c}</button>}
function SmBtn({label,onClick,color="#c41818"}){return<button onClick={onClick} style={{padding:"4px 10px",background:"none",border:`1px solid ${color}`,borderRadius:4,color,cursor:"pointer",fontSize:11,fontWeight:600}}>{label}</button>}
function Empty({msg}){return<div style={{textAlign:"center",padding:36,color:"#ccc",fontSize:13}}>{msg}</div>}

const cardStyle={background:"#fff",border:"1px solid #e8e8e8",borderRadius:8,padding:"12px 14px",marginBottom:8,display:"flex",justifyContent:"space-between",alignItems:"center"};
const sectionStyle={background:"#f8f8f8",borderRadius:8,padding:16,marginBottom:12};
const secTitle={fontSize:12,fontWeight:700,color:"#999",marginTop:0,marginBottom:10};
const primaryBtn={padding:"9px 16px",background:"#c41818",color:"#fff",border:"none",borderRadius:6,fontWeight:700,cursor:"pointer",fontSize:13};
const secBtn={padding:"9px 16px",background:"#eee",border:"none",borderRadius:6,cursor:"pointer",fontSize:13};
const addBtnS={padding:"6px 12px",borderRadius:6,border:"1px solid",background:"#fff",cursor:"pointer",fontWeight:600,fontSize:11};
const iconBtn={background:"none",border:"none",color:"#ccc",cursor:"pointer",fontSize:15};
const inlineInput={fontWeight:700,fontSize:13,border:"none",borderBottom:"1px dashed #ccc",outline:"none",padding:"2px 4px",width:150,background:"transparent"};
const taStyle={width:"100%",padding:8,borderRadius:4,border:"1px solid #ccc",fontSize:12,minHeight:45,boxSizing:"border-box",resize:"vertical"};
const ddStyle={position:"absolute",top:54,left:0,right:0,background:"#fff",border:"1px solid #ddd",borderRadius:6,zIndex:10,maxHeight:140,overflow:"auto",boxShadow:"0 4px 12px #0002"};
const ddItem={padding:"7px 12px",cursor:"pointer",borderBottom:"1px solid #f0f0f0",fontSize:12};
const chipStyle={padding:"5px 10px",borderRadius:16,fontWeight:600,fontSize:11,cursor:"pointer"};
