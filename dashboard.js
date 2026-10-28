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
  document.body.innerHTML=`<div class="app-shell"><aside class="sidebar"><div class="brand"><p class="eyebrow">Koperasi Kedungneng</p><h2>Admin Panel</h2></div><nav class="nav"><button data-menu="dashboard" class="active">Dashboard</button><button data-menu="anggota">Anggota</button><button data-menu="pokok">Simpanan Pokok</button><button data-menu="wajib">Simpanan Wajib</button><button data-menu="sukarela">Simpanan Sukarela</button></nav><div class="sidebar-footer"><button id="logout" class="logout">Keluar</button></div></aside><section class="main-area"><header class="topbar"><div><p class="eyebrow">Koperasi Kedungneng</p><h1 id="pageTitle">Dashboard</h1></div><span id="status" class="muted status">Memuat data...</span></header><main class="container" id="content"></main></section></div>`;
  document.getElementById("logout").onclick=async()=>{await supabase.auth.signOut();location.replace("/")};
  const [aRes,wRes,sRes]=await Promise.all([timeout(supabase.from("koperasi_anggota").select("id,no_anggota,nama,jenis_kelamin,tanggal_masuk,simpanan_pokok,simpanan_sukarela").order("no_anggota"),15000,"Pengambilan anggota"),timeout(supabase.from("koperasi_simpanan_wajib").select("id,anggota_id,tahun,bulan,jumlah").order("tahun",{ascending:false}).order("bulan",{ascending:false}),15000,"Pengambilan simpanan wajib"),timeout(supabase.from("koperasi_simpanan_sukarela").select("id,anggota_id,tanggal,jumlah,keterangan").order("tanggal",{ascending:false}),15000,"Pengambilan simpanan sukarela")]);
  if(aRes.error)throw aRes.error;if(wRes.error)throw wRes.error;if(sRes.error)throw sRes.error;
  const anggota=aRes.data||[],wajib=wRes.data||[],sukarela=sRes.data||[],byId=new Map(anggota.map(a=>[a.id,a]));
  const totalPokok=anggota.reduce((s,a)=>s+Number(a.simpanan_pokok||0),0),totalSukarela=sukarela.reduce((s,a)=>s+Number(a.jumlah||0),0),totalWajib=wajib.reduce((s,a)=>s+Number(a.jumlah||0),0);
  const setStatus=t=>document.getElementById("status").textContent=t,setTitle=t=>document.getElementById("pageTitle").textContent=t,content=document.getElementById("content");
  const stats=()=>`<section class="stats"><article class="stat-card"><span>Total Anggota</span><strong>${anggota.length}</strong></article><article class="stat-card"><span>Simpanan Pokok</span><strong>${rupiah(totalPokok)}</strong></article><article class="stat-card"><span>Simpanan Wajib</span><strong>${rupiah(totalWajib)}</strong></article><article class="stat-card"><span>Simpanan Sukarela</span><strong>${rupiah(totalSukarela)}</strong></article></section>`;
  const anggotaTable=(list,extraTitle="Daftar Anggota")=>`<section class="card"><div class="section-head"><div><p class="eyebrow">Data Anggota</p><h2>${extraTitle}</h2></div><input id="search" class="search" type="search" placeholder="Cari nomor atau nama..."></div><div class="table-wrap"><table><thead><tr><th>No. Anggota</th><th>Nama</th><th>L/P</th><th>Tanggal Masuk</th><th>Simpanan Pokok</th><th>Aksi</th></tr></thead><tbody id="rows"></tbody></table></div></section>`;
  const renderAnggotaRows=list=>{const el=document.getElementById("rows");if(!el)return;el.innerHTML=list.map(a=>`<tr><td><b>${esc(a.no_anggota)}</b></td><td>${esc(a.nama)}</td><td>${esc(a.jenis_kelamin||"-")}</td><td>${dateId(a.tanggal_masuk)}</td><td>${rupiah(a.simpanan_pokok)}</td><td><button type="button" class="detail-btn" data-member="${esc(a.id)}">Detail</button></td></tr>`).join("")||'<tr><td colspan="6" class="empty">Tidak ditemukan.</td></tr>';el.querySelectorAll("[data-member]").forEach(btn=>btn.onclick=()=>pageAnggotaDetail(btn.dataset.member))};
  const renderAnggotaSearch=()=>{const input=document.getElementById("search");if(!input)return;input.oninput=e=>{const q=e.target.value.toLowerCase();renderAnggotaRows(anggota.filter(a=>String(a.no_anggota).toLowerCase().includes(q)||String(a.nama).toLowerCase().includes(q)))}};
  function pageDashboard(){setTitle("Dashboard");setStatus("Data tersinkron di Supabase");content.innerHTML=stats()+`<section class="card"><div class="section-head"><div><p class="eyebrow">Sumber Data</p><h2>DATA_ANGGOTA</h2></div><a class="source-link" href="${SOURCE_SHEET}" target="_blank" rel="noopener">Buka Google Sheet ↗</a></div><p class="muted">Dashboard menggunakan data yang telah diimpor dari spreadsheet sumber. Menu simpanan wajib memakai rincian per anggota, tahun, dan bulan.</p></section>`;}
  function pageAnggota(){setTitle("Anggota");setStatus(anggota.length+" anggota");content.innerHTML=anggotaTable(anggota);renderAnggotaRows(anggota);renderAnggotaSearch()}
  function pageAnggotaDetail(id){
    const a=anggota.find(x=>String(x.id)===String(id));if(!a){pageAnggota();return}
    const rows=wajib.filter(w=>String(w.anggota_id)===String(a.id));
    const sRows=sukarela.filter(s=>String(s.anggota_id)===String(a.id)).sort((x,y)=>String(y.tanggal).localeCompare(String(x.tanggal)));
    const totalW=rows.reduce((s,w)=>s+Number(w.jumlah||0),0),pokok=Number(a.simpanan_pokok||0),sukarelaTotal=sRows.reduce((s,x)=>s+Number(x.jumlah||0),0);
    const total=pokok+totalW+sukarelaTotal;
    const years=[...new Set(rows.map(w=>Number(w.tahun)).filter(Boolean))].sort((x,y)=>y-x);
    setTitle("Detail Anggota");setStatus(a.no_anggota+" • "+a.nama);
    const yearBlocks=years.map(year=>{
      const yearRows=rows.filter(w=>Number(w.tahun)===year).sort((x,y)=>Number(x.bulan)-Number(y.bulan));
      const yearTotal=yearRows.reduce((s,w)=>s+Number(w.jumlah||0),0);
      return`<section class="card"><div class="section-head"><div><p class="eyebrow">Simpanan Wajib</p><h3>${year}</h3></div><strong>${rupiah(yearTotal)}</strong></div><div class="table-wrap"><table><thead><tr><th>Bulan</th><th>Jumlah</th></tr></thead><tbody>${yearRows.map(w=>`<tr><td>${monthName(w.bulan)}</td><td><b>${rupiah(w.jumlah)}</b></td></tr>`).join("")||'<tr><td colspan="2" class="empty">Belum ada transaksi.</td></tr>'}</tbody></table></div></section>`
    }).join("");
    content.innerHTML=`<section class="card"><div class="section-head"><div><p class="eyebrow">Profil Anggota</p><h2>${esc(a.nama)}</h2><p class="muted">No. Anggota: <b>${esc(a.no_anggota)}</b></p></div><button id="backAnggota" type="button" class="detail-btn">← Kembali</button></div><div class="table-wrap"><table><tbody><tr><th style="width:220px">Tanggal Bergabung</th><td>${dateId(a.tanggal_masuk)}</td></tr><tr><th>Jenis Kelamin</th><td>${esc(a.jenis_kelamin||"-")}</td></tr></tbody></table></div></section><section class="stats"><article class="stat-card"><span>Simpanan Pokok</span><strong>${rupiah(pokok)}</strong></article><article class="stat-card"><span>Simpanan Wajib</span><strong>${rupiah(totalW)}</strong></article><article class="stat-card"><span>Simpanan Sukarela</span><strong>${rupiah(sukarelaTotal)}</strong></article><article class="stat-card"><span>Total Simpanan</span><strong>${rupiah(total)}</strong></article></section>${yearBlocks||'<section class="card"><p class="empty">Belum ada rincian simpanan wajib.</p></section>'}<section class="card"><div class="section-head"><div><p class="eyebrow">Simpanan Sukarela</p><h3>Riwayat Transaksi</h3></div><strong>${rupiah(sukarelaTotal)}</strong></div><form id="sukarelaForm" style="display:grid;grid-template-columns:160px 1fr 2fr auto;gap:10px;align-items:end;margin-bottom:16px"><label>Tanggal<input id="sTanggal" type="date" value="${new Date().toISOString().slice(0,10)}" required></label><label>Jumlah<input id="sJumlah" type="number" min="0" step="1000" placeholder="10000" required></label><label>Keterangan<input id="sKet" type="text" placeholder="Setoran sukarela"></label><button type="submit" class="detail-btn">+ Simpan</button></form><div class="table-wrap"><table><thead><tr><th>Tanggal</th><th>Jumlah</th><th>Keterangan</th><th>Aksi</th></tr></thead><tbody>${sRows.map(s=>`<tr><td>${dateId(s.tanggal)}</td><td><b>${rupiah(s.jumlah)}</b></td><td>${esc(s.keterangan||"-")}</td><td><button type="button" class="detail-btn" data-delete-sukarela="${esc(s.id)}">Hapus</button></td></tr>`).join("")||'<tr><td colspan="4" class="empty">Belum ada transaksi simpanan sukarela.</td></tr>'}</tbody></table></div></section>`;
    document.getElementById("backAnggota").onclick=pageAnggota;
    document.getElementById("sukarelaForm").onsubmit=async e=>{
      e.preventDefault();const btn=e.target.querySelector("button[type=submit]");btn.disabled=true;btn.textContent="Menyimpan...";
      try{
        const {error}=await supabase.from("koperasi_simpanan_sukarela").insert({anggota_id:a.id,tanggal:document.getElementById("sTanggal").value,jumlah:Number(document.getElementById("sJumlah").value),keterangan:document.getElementById("sKet").value.trim()||null});
        if(error)throw error;location.reload();
      }catch(err){alert("Gagal menyimpan: "+(err?.message||String(err)));btn.disabled=false;btn.textContent="+ Simpan"}
    };
    document.querySelectorAll("[data-delete-sukarela]").forEach(btn=>btn.onclick=async()=>{
      if(!confirm("Hapus transaksi simpanan sukarela ini?"))return;
      const {error}=await supabase.from("koperasi_simpanan_sukarela").delete().eq("id",btn.dataset.deleteSukarela);
      if(error)alert("Gagal menghapus: "+error.message);else location.reload();
    });
  }
  function pagePokok(){setTitle("Simpanan Pokok");setStatus(rupiah(totalPokok));content.innerHTML=stats()+`<section class="card"><div class="section-head"><div><p class="eyebrow">Data Simpanan</p><h2>Daftar Simpanan Pokok</h2></div><input id="search" class="search" type="search" placeholder="Cari nomor atau nama..."></div><div class="table-wrap"><table><thead><tr><th>No. Anggota</th><th>Nama</th><th>L/P</th><th>Tanggal Masuk</th><th>Simpanan Pokok</th><th>Keterangan</th></tr></thead><tbody id="rows"></tbody></table></div></section>`;const render=list=>document.getElementById("rows").innerHTML=list.map(a=>{const jumlah=Number(a.simpanan_pokok||0),kurang=Math.max(0,100000-jumlah),keterangan=jumlah>=100000?"LUNAS":`Kurang ${rupiah(kurang)}`;return`<tr><td><b>${esc(a.no_anggota)}</b></td><td>${esc(a.nama)}</td><td>${esc(a.jenis_kelamin||"-")}</td><td>${dateId(a.tanggal_masuk)}</td><td><b>${rupiah(jumlah)}</b></td><td>${esc(keterangan)}</td></tr>`}).join("")||'<tr><td colspan="6" class="empty">Tidak ditemukan.</td></tr>';render(anggota);document.getElementById("search").oninput=e=>{const q=e.target.value.toLowerCase();render(anggota.filter(a=>String(a.no_anggota).toLowerCase().includes(q)||String(a.nama).toLowerCase().includes(q)))}}
  function pageSukarela(){setTitle("Simpanan Sukarela");setStatus(rupiah(totalSukarela));content.innerHTML=stats()+anggotaTable(anggota,"Daftar Simpanan Sukarela");const render=list=>document.getElementById("rows").innerHTML=list.map(a=>`<tr><td><b>${esc(a.no_anggota)}</b></td><td>${esc(a.nama)}</td><td>${esc(a.jenis_kelamin||"-")}</td><td>${dateId(a.tanggal_masuk)}</td><td>-</td><td><b>${rupiah(a.simpanan_sukarela)}</b></td></tr>`).join("")||'<tr><td colspan="6" class="empty">Tidak ditemukan.</td></tr>';render(anggota);document.getElementById("search").oninput=e=>{const q=e.target.value.toLowerCase();render(anggota.filter(a=>String(a.no_anggota).toLowerCase().includes(q)||String(a.nama).toLowerCase().includes(q)))}}
  function pageWajib(){
    setTitle("Simpanan Wajib");
    const years=[...new Set(wajib.map(w=>Number(w.tahun)).filter(Boolean))].sort((a,b)=>b-a);
    let selectedYear=years[0]||new Date().getFullYear();
    let selectedMonth=1;
    const months=["Januari","Februari","Maret","April","Mei","Juni","Juli","Agustus","September","Oktober","November","Desember"];
    const availableMonths=year=>new Set(wajib.filter(w=>Number(w.tahun)===Number(year)).map(w=>Number(w.bulan)));
    const render=()=>{
      const monthSet=availableMonths(selectedYear);
      if(!monthSet.has(selectedMonth)) selectedMonth=[...monthSet].sort((a,b)=>a-b)[0]||1;
      const rows=wajib.filter(w=>Number(w.tahun)===Number(selectedYear)&&Number(w.bulan)===Number(selectedMonth));
      const total=rows.reduce((s,w)=>s+Number(w.jumlah||0),0);
      setStatus(rupiah(total)+" • "+rows.length+" transaksi");
      content.innerHTML=stats()+`<section class="card"><div class="section-head"><div><p class="eyebrow">Transaksi Wajib</p><h2>Simpanan Wajib</h2></div><label class="search" style="display:flex;align-items:center;gap:8px">Tahun <select id="wajibYear" style="border:0;background:transparent;font:inherit;outline:none">${years.map(y=>`<option value="${y}" ${Number(y)===Number(selectedYear)?"selected":""}>${y}</option>`).join("")}</select></label></div><div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(110px,1fr));gap:10px;margin:16px 0">${months.map((m,i)=>{const n=i+1,has=monthSet.has(n);return`<button type="button" data-month="${n}" ${has?"":"disabled"} style="padding:12px;border:1px solid var(--border,#ddd);border-radius:10px;background:${n===selectedMonth?"var(--accent,#111)":"var(--surface,#fff)"};color:${n===selectedMonth?"#fff":"inherit"};cursor:${has?"pointer":"not-allowed"};opacity:${has?1:.45}">${m}</button>`}).join("")}</div><div class="section-head"><div><p class="eyebrow">Periode</p><h3>${months[selectedMonth-1]} ${selectedYear}</h3></div><strong>${rupiah(total)}</strong></div><div class="table-wrap"><table><thead><tr><th>No. Anggota</th><th>Nama</th><th>Jumlah</th></tr></thead><tbody>${rows.map(w=>{const a=byId.get(w.anggota_id)||{};return`<tr><td><b>${esc(a.no_anggota||"-")}</b></td><td>${esc(a.nama||"-")}</td><td><b>${rupiah(w.jumlah)}</b></td></tr>`}).join("")||'<tr><td colspan="3" class="empty">Belum ada data untuk bulan ini.</td></tr>'}</tbody></table></div></section>`;
      document.getElementById("wajibYear").onchange=e=>{selectedYear=Number(e.target.value);render()};
      document.querySelectorAll("[data-month]").forEach(btn=>btn.onclick=()=>{selectedMonth=Number(btn.dataset.month);render()});
    };
    render();
  }
  const pages={dashboard:pageDashboard,anggota:pageAnggota,pokok:pagePokok,wajib:pageWajib,sukarela:pageSukarela};document.querySelectorAll("[data-menu]").forEach(btn=>btn.onclick=()=>{document.querySelectorAll("[data-menu]").forEach(b=>b.classList.remove("active"));btn.classList.add("active");pages[btn.dataset.menu]()});pageDashboard();
 }catch(error){console.error("[Kedungneng Dashboard]",error);showError("Dashboard gagal dimuat: "+(error?.message||String(error)));}}
window.addEventListener("error",e=>showError("Aplikasi gagal dimuat: "+(e.message||"kesalahan JavaScript")));renderDashboard();