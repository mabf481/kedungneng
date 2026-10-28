const SUPABASE_URL="https://ujyavhuwuardqgmwjpra.supabase.co";
const SUPABASE_KEY="sb_publishable_KlaOcV4hclifU1-sr2hyYQ_WDO8C1Ck";
const ADMIN_EMAIL="admin@kedungneng.com";
const SOURCE_SHEET="https://docs.google.com/spreadsheets/d/10SkQb6MYH-9DhDVLL5NJMZk4Y-k_NnUVF-hBGgSslhc/edit?gid=560048510#gid=560048510";
const rupiah=n=>new Intl.NumberFormat("id-ID",{style:"currency",currency:"IDR",maximumFractionDigits:0}).format(Number(n||0));
const dateId=v=>v?new Date(v+"T00:00:00").toLocaleDateString("id-ID"):"-";
const esc=v=>String(v??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[m]));
const monthName=n=>["","Jan","Feb","Mar","Apr","Mei","Jun","Jul","Ags","Sep","Okt","Nov","Des"][Number(n)]||"-";
const timeout=async(promise,ms,label)=>{let timer;const fail=new Promise((_,reject)=>{timer=setTimeout(()=>reject(new Error(label+" timeout setelah "+Math.round(ms/1000)+" detik")),ms)});try{return await Promise.race([promise,fail])}finally{clearTimeout(timer)}};
const showError=message=>{document.body.innerHTML=`<main class="container"><section class="card"><p class="eyebrow">Koperasi Kedungneng</p><h1>Dashboard</h1><p class="message">${esc(message)}</p><p><a href="/">Kembali ke Login</a></p></section></main>`};

async function renderDashboard(){
 try{
  if(!window.supabase)throw new Error("Library Supabase tidak termuat.");
  const supabase=window.supabase.createClient(SUPABASE_URL,SUPABASE_KEY);
  const sessionResult=await timeout(supabase.auth.getSession(),10000,"Pemeriksaan sesi");
  if(sessionResult.error)throw sessionResult.error;
  const session=sessionResult.data?.session;
  if(!session){location.replace("/");return}
  if(session.user?.email?.toLowerCase()!==ADMIN_EMAIL){await supabase.auth.signOut();showError("Akses ditolak. Akun ini bukan admin.");return}

  document.body.innerHTML=`<div class="app-shell">
    <aside class="sidebar">
      <div class="brand"><p class="eyebrow">Koperasi Kedungneng</p><h2>Admin Panel</h2></div>
      <nav class="nav">
        <button data-menu="dashboard" class="active">Dashboard</button>
        <button data-menu="anggota">Anggota</button>
        <button data-menu="pokok">Simpanan Pokok</button>
        <button data-menu="wajib">Simpanan Wajib</button>
        <button data-menu="sukarela">Simpanan Sukarela</button>
      </nav>
      <div class="sidebar-footer"><button id="logout" class="logout">Keluar</button></div>
    </aside>
    <section class="main-area">
      <header class="topbar"><div><p class="eyebrow">Koperasi Kedungneng</p><h1 id="pageTitle">Dashboard</h1></div><span id="status" class="muted status">Memuat data...</span></header>
      <main class="container" id="content"></main>
    </section>
  </div>`;

  document.getElementById("logout").onclick=async()=>{await supabase.auth.signOut();location.replace("/")};

  const [aRes,wRes]=await Promise.all([
    timeout(supabase.from("koperasi_anggota").select("id,no_anggota,nama,jenis_kelamin,tanggal_masuk,simpanan_pokok,simpanan_sukarela").order("no_anggota"),15000,"Pengambilan anggota"),
    timeout(supabase.from("koperasi_simpanan_wajib").select("id,anggota_id,tahun,bulan,jumlah").order("tahun",{ascending:false}).order("bulan",{ascending:false}),15000,"Pengambilan simpanan wajib")
  ]);
  if(aRes.error)throw aRes.error;if(wRes.error)throw wRes.error;
  const anggota=aRes.data||[], wajib=wRes.data||[];
  const byId=new Map(anggota.map(a=>[a.id,a]));

  const totalPokok=anggota.reduce((s,a)=>s+Number(a.simpanan_pokok||0),0);
  const totalSukarela=anggota.reduce((s,a)=>s+Number(a.simpanan_sukarela||0),0);
  const totalWajib=wajib.reduce((s,a)=>s+Number(a.jumlah||0),0);
  const setStatus=t=>document.getElementById("status").textContent=t;
  const setTitle=t=>document.getElementById("pageTitle").textContent=t;
  const content=document.getElementById("content");

  const stats=()=>`<section class="stats">
    <article class="stat-card"><span>Total Anggota</span><strong>${anggota.length}</strong></article>
    <article class="stat-card"><span>Simpanan Pokok</span><strong>${rupiah(totalPokok)}</strong></article>
    <article class="stat-card"><span>Simpanan Wajib</span><strong>${rupiah(totalWajib)}</strong></article>
    <article class="stat-card"><span>Simpanan Sukarela</span><strong>${rupiah(totalSukarela)}</strong></article>
  </section>`;

  const anggotaTable=(list,extraTitle="Daftar Anggota")=>`<section class="card"><div class="section-head"><div><p class="eyebrow">Data Anggota</p><h2>${extraTitle}</h2></div><input id="search" class="search" type="search" placeholder="Cari nomor atau nama..."></div><div class="table-wrap"><table><thead><tr><th>No. Anggota</th><th>Nama</th><th>L/P</th><th>Tanggal Masuk</th><th>Simpanan Pokok</th><th>Simpanan Sukarela</th></tr></thead><tbody id="rows"></tbody></table></div></section>`;

  const renderAnggotaRows=list=>{const el=document.getElementById("rows");if(!el)return;el.innerHTML=list.map(a=>`<tr><td><b>${esc(a.no_anggota)}</b></td><td>${esc(a.nama)}</td><td>${esc(a.jenis_kelamin||"-")}</td><td>${dateId(a.tanggal_masuk)}</td><td>${rupiah(a.simpanan_pokok)}</td><td>${rupiah(a.simpanan_sukarela)}</td></tr>`).join("")||'<tr><td colspan="6" class="empty">Tidak ditemukan.</td></tr>'};

  function pageDashboard(){
   setTitle("Dashboard");setStatus("Data tersinkron di Supabase");content.innerHTML=stats()+`<section class="card"><div class="section-head"><div><p class="eyebrow">Sumber Data</p><h2>DATA_ANGGOTA</h2></div><a class="source-link" href="${SOURCE_SHEET}" target="_blank" rel="noopener">Buka Google Sheet ↗</a></div><p class="muted">Dashboard menggunakan data yang telah diimpor dari spreadsheet sumber. Menu simpanan wajib memakai rincian per anggota, tahun, dan bulan.</p></section>`;}

  function pageAnggota(){setTitle("Anggota");setStatus(anggota.length+" anggota");content.innerHTML=anggotaTable(anggota);renderAnggotaRows(anggota);document.getElementById("search").oninput=e=>{const q=e.target.value.toLowerCase();renderAnggotaRows(anggota.filter(a=>String(a.no_anggota).toLowerCase().includes(q)||String(a.nama).toLowerCase().includes(q)))};}

  function pagePokok(){setTitle("Simpanan Pokok");setStatus(rupiah(totalPokok));content.innerHTML=stats()+anggotaTable(anggota,"Daftar Simpanan Pokok");document.getElementById("search").oninput=e=>{const q=e.target.value.toLowerCase();const list=anggota.filter(a=>String(a.no_anggota).toLowerCase().includes(q)||String(a.nama).toLowerCase().includes(q));document.getElementById("rows").innerHTML=list.map(a=>`<tr><td><b>${esc(a.no_anggota)}</b></td><td>${esc(a.nama)}</td><td>${esc(a.jenis_kelamin||"-")}</td><td>${dateId(a.tanggal_masuk)}</td><td><b>${rupiah(a.simpanan_pokok)}</b></td><td>-</td></tr>`).join("")||'<tr><td colspan="6" class="empty">Tidak ditemukan.</td></tr>'};document.getElementById("rows").innerHTML=anggota.map(a=>`<tr><td><b>${esc(a.no_anggota)}</b></td><td>${esc(a.nama)}</td><td>${esc(a.jenis_kelamin||"-")}</td><td>${dateId(a.tanggal_masuk)}</td><td><b>${rupiah(a.simpanan_pokok)}</b></td><td>-</td></tr>`).join("")}

  function pageSukarela(){setTitle("Simpanan Sukarela");setStatus(rupiah(totalSukarela));content.innerHTML=stats()+anggotaTable(anggota,"Daftar Simpanan Sukarela");const render=list=>document.getElementById("rows").innerHTML=list.map(a=>`<tr><td><b>${esc(a.no_anggota)}</b></td><td>${esc(a.nama)}</td><td>${esc(a.jenis_kelamin||"-")}</td><td>${dateId(a.tanggal_masuk)}</td><td>-</td><td><b>${rupiah(a.simpanan_sukarela)}</b></td></tr>`).join("")||'<tr><td colspan="6" class="empty">Tidak ditemukan.</td></tr>';render(anggota);document.getElementById("search").oninput=e=>{const q=e.target.value.toLowerCase();render(anggota.filter(a=>String(a.no_anggota).toLowerCase().includes(q)||String(a.nama).toLowerCase().includes(q)))}}

  function pageWajib(){setTitle("Simpanan Wajib");setStatus(rupiah(totalWajib));content.innerHTML=stats()+`<section class="card"><div class="section-head"><div><p class="eyebrow">Transaksi Wajib</p><h2>Rincian Bulanan</h2></div><input id="search" class="search" type="search" placeholder="Cari anggota..."></div><div class="table-wrap"><table><thead><tr><th>No. Anggota</th><th>Nama</th><th>Tahun</th><th>Bulan</th><th>Jumlah</th></tr></thead><tbody id="rows"></tbody></table></div></section>`;const render=list=>document.getElementById("rows").innerHTML=list.map(w=>{const a=byId.get(w.anggota_id)||{};return`<tr><td><b>${esc(a.no_anggota||"-")}</b></td><td>${esc(a.nama||"-")}</td><td>${w.tahun}</td><td>${monthName(w.bulan)}</td><td><b>${rupiah(w.jumlah)}</b></td></tr>`}).join("")||'<tr><td colspan="5" class="empty">Tidak ditemukan.</td></tr>';render(wajib);document.getElementById("search").oninput=e=>{const q=e.target.value.toLowerCase();render(wajib.filter(w=>{const a=byId.get(w.anggota_id)||{};return String(a.no_anggota||"").toLowerCase().includes(q)||String(a.nama||"").toLowerCase().includes(q)||String(w.tahun).includes(q)||monthName(w.bulan).toLowerCase().includes(q)}))}}

  const pages={dashboard:pageDashboard,anggota:pageAnggota,pokok:pagePokok,wajib:pageWajib,sukarela:pageSukarela};
  document.querySelectorAll("[data-menu]").forEach(btn=>btn.onclick=()=>{document.querySelectorAll("[data-menu]").forEach(b=>b.classList.remove("active"));btn.classList.add("active");pages[btn.dataset.menu]();});
  pageDashboard();
 }catch(error){console.error("[Kedungneng Dashboard]",error);showError("Dashboard gagal dimuat: "+(error?.message||String(error)));}
}
window.addEventListener("error",e=>showError("Aplikasi gagal dimuat: "+(e.message||"kesalahan JavaScript")));
renderDashboard();