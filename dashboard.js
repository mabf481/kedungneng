const SUPABASE_URL="https://ujyavhuwuardqgmwjpra.supabase.co";
const SUPABASE_KEY="sb_publishable_KlaOcV4hclifU1-sr2hyYQ_WDO8C1Ck";
const ADMIN_EMAIL="admin@kedungneng.com";
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
  document.body.innerHTML=`<div class="app-shell"><aside class="sidebar"><div class="brand"><p class="eyebrow">Koperasi Kedungneng</p><h2>Admin Panel</h2></div><nav class="nav"><button data-menu="dashboard" class="active">Dashboard</button><button data-menu="anggota">Anggota</button><button data-menu="pokok">Simpanan Pokok</button><button data-menu="wajib">Simpanan Wajib</button><button data-menu="sukarela">Simpanan Sukarela</button><button data-menu="aksesbot">Akses Bot WA</button></nav><div class="sidebar-footer"><button id="logout" class="logout">Keluar</button></div></aside><section class="main-area"><header class="topbar"><div><p class="eyebrow">Koperasi Kedungneng</p><h1 id="pageTitle">Dashboard</h1></div><span id="status" class="muted status">Memuat data...</span></header><main class="container" id="content"></main></section></div>`;
  document.getElementById("logout").onclick=async()=>{await supabase.auth.signOut();location.replace("/")};
  const [aRes,wRes,sRes,waRes]=await Promise.all([timeout(supabase.from("koperasi_anggota").select("id,no_anggota,nama,jenis_kelamin,tanggal_masuk,simpanan_pokok,simpanan_sukarela").order("no_anggota"),15000,"Pengambilan anggota"),timeout(supabase.from("koperasi_simpanan_wajib").select("id,anggota_id,tahun,bulan,jumlah").order("tahun",{ascending:false}).order("bulan",{ascending:false}),15000,"Pengambilan simpanan wajib"),timeout(supabase.from("koperasi_simpanan_sukarela").select("id,anggota_id,tanggal,jumlah,keterangan").order("tanggal",{ascending:false}),15000,"Pengambilan simpanan sukarela"),timeout(supabase.from("wa_allowed_numbers").select("id,phone,name,active,created_at").order("created_at",{ascending:false}),15000,"Pengambilan akses bot WA")]);
  if(aRes.error)throw aRes.error;if(wRes.error)throw wRes.error;if(sRes.error)throw sRes.error;if(waRes.error)throw waRes.error;
  const anggota=aRes.data||[],wajib=wRes.data||[],sukarela=sRes.data||[],waAllowed=waRes.data||[],byId=new Map(anggota.map(a=>[a.id,a]));
  const totalPokok=anggota.reduce((s,a)=>s+Number(a.simpanan_pokok||0),0),totalSukarela=sukarela.reduce((s,a)=>s+Number(a.jumlah||0),0),totalWajib=wajib.reduce((s,a)=>s+Number(a.jumlah||0),0);
  const setStatus=t=>document.getElementById("status").textContent=t,setTitle=t=>document.getElementById("pageTitle").textContent=t,content=document.getElementById("content");
  const stats=()=>`<section class="stats"><article class="stat-card"><span>Total Anggota</span><strong>${anggota.length}</strong></article><article class="stat-card"><span>Simpanan Pokok</span><strong>${rupiah(totalPokok)}</strong></article><article class="stat-card"><span>Simpanan Wajib</span><strong>${rupiah(totalWajib)}</strong></article><article class="stat-card"><span>Simpanan Sukarela</span><strong>${rupiah(totalSukarela)}</strong></article></section>`;
  const anggotaTable=(list,extraTitle="Daftar Anggota")=>`<section class="card"><div class="section-head"><div><p class="eyebrow">Data Anggota</p><h2>${extraTitle}</h2></div><input id="search" class="search" type="search" placeholder="Cari nomor atau nama..."></div><div class="table-wrap"><table><thead><tr><th>No. Anggota</th><th>Nama</th><th>L/P</th><th>Tanggal Masuk</th><th>Simpanan Pokok</th><th>Aksi</th></tr></thead><tbody id="rows"></tbody></table></div></section>`;
  const renderAnggotaRows=list=>{const el=document.getElementById("rows");if(!el)return;el.innerHTML=list.map(a=>`<tr><td><b>${esc(a.no_anggota)}</b></td><td>${esc(a.nama)}</td><td>${esc(a.jenis_kelamin||"-")}</td><td>${dateId(a.tanggal_masuk)}</td><td>${rupiah(a.simpanan_pokok)}</td><td><button type="button" class="detail-btn" data-member="${esc(a.id)}">Detail</button> <button type="button" class="detail-btn" data-edit-name="${esc(a.id)}">Edit Nama</button></td></tr>`).join("")||'<tr><td colspan="6" class="empty">Tidak ditemukan.</td></tr>';el.querySelectorAll("[data-member]").forEach(btn=>btn.onclick=()=>pageAnggotaDetail(btn.dataset.member));el.querySelectorAll("[data-edit-name]").forEach(btn=>btn.onclick=()=>editMemberName(btn.dataset.editName))};
  const renderAnggotaSearch=()=>{const input=document.getElementById("search");if(!input)return;input.oninput=e=>{const q=e.target.value.toLowerCase();renderAnggotaRows(anggota.filter(a=>String(a.no_anggota).toLowerCase().includes(q)||String(a.nama).toLowerCase().includes(q)))}};
  async function editMemberName(id){
    const a=anggota.find(x=>String(x.id)===String(id));if(!a)return;
    const namaBaru=prompt("Edit nama anggota:",a.nama||"");
    if(namaBaru===null)return;
    const nama=namaBaru.replace(/\s+/g," ").trim();
    if(nama.length<2||nama.length>100){alert("Nama harus 2-100 karakter.");return}
    if(nama===String(a.nama||"").trim())return;
    try{
      const {error}=await supabase.from("koperasi_anggota").update({nama}).eq("id",a.id);
      if(error)throw error;
      a.nama=nama;
      setStatus(a.no_anggota+" • "+a.nama);
      const activeSearch=document.getElementById("search");
      if(activeSearch)renderAnggotaRows(anggota.filter(x=>String(x.no_anggota).toLowerCase().includes(activeSearch.value.toLowerCase())||String(x.nama).toLowerCase().includes(activeSearch.value.toLowerCase())));
      alert("Nama anggota berhasil diubah.");
      if(document.getElementById("backAnggota"))pageAnggotaDetail(a.id);
    }catch(err){alert("Gagal mengubah nama: "+(err?.message||String(err)))}
  };
  async function pageDashboard(){
    setTitle("Dashboard Admin");setStatus("Data tersinkron di Supabase");
    const now=new Date(),monthNames=["Jan","Feb","Mar","Apr","Mei","Jun","Jul","Ags","Sep","Okt","Nov","Des"];
    const todayKey=now.toISOString().slice(0,10);
    const pinjamanRes=await supabase.from("koperasi_pinjaman").select("*");
    const pinjaman=pinjamanRes.error?[]:(pinjamanRes.data||[]);
    const totalSimpanan=totalPokok+totalWajib+totalSukarela;
    const totalPinjaman=pinjaman.reduce((s,p)=>s+Number(p.sisa_pinjaman??p.sisa??p.jumlah??p.nominal??0),0);
    const todayWajib=wajib.filter(w=>String(w.tanggal||"").slice(0,10)===todayKey),todaySukarela=sukarela.filter(s=>String(s.tanggal||"").slice(0,10)===todayKey);
    const transaksiHariIni=todayWajib.length+todaySukarela.length;
    const activeMonths=Array.from({length:now.getMonth()+1},(_,m)=>{const w=wajib.filter(x=>Number(x.tahun)===now.getFullYear()&&Number(x.bulan)===m+1).reduce((s,x)=>s+Number(x.jumlah||0),0);const sv=sukarela.filter(x=>{const d=new Date(String(x.tanggal||"")+"T00:00:00");return d.getFullYear()===now.getFullYear()&&d.getMonth()===m}).reduce((s,x)=>s+Number(x.jumlah||0),0);return{label:monthNames[m],masuk:w+sv}});
    const maxChart=Math.max(1,...activeMonths.map(x=>x.masuk));
    const chartPoints=activeMonths.map((x,i)=>{const xp=8+i*(84/Math.max(1,activeMonths.length-1));const yp=92-(x.masuk/maxChart*70);return xp+","+yp}).join(" ");
    const pokokCount=anggota.filter(a=>Number(a.simpanan_pokok||0)>0).length,totalTx=pokokCount+wajib.length,wajibPct=totalTx?Math.round(wajib.length/totalTx*100):0,pokokPct=totalTx?100-wajibPct:0;
    const recent=[...wajib.map(w=>({date:w.tanggal||String(w.tahun)+"-"+String(w.bulan).padStart(2,"0")+"-01",id:"SW-"+String(w.id).slice(0,8),member:byId.get(w.anggota_id)?.nama||"-",category:"Simpanan Wajib",amount:Number(w.jumlah||0)})),...sukarela.map(s=>({date:s.tanggal,id:"SS-"+String(s.id).slice(0,8),member:byId.get(s.anggota_id)?.nama||"-",category:"Simpanan Sukarela",amount:Number(s.jumlah||0)}))].sort((a,b)=>String(b.date).localeCompare(String(a.date))).slice(0,6);
    const monthLabels=activeMonths.map(x=>"<span>"+x.label+"</span>").join(""),recentRows=recent.map(r=>"<tr><td>"+dateId(r.date)+"</td><td>"+esc(r.id)+"</td><td>"+esc(r.member)+"</td><td>"+esc(r.category)+"</td><td><b>"+rupiah(r.amount)+"</b></td><td><span class=\"status-pill success\">Berhasil</span></td></tr>").join("");
    content.innerHTML=      "<section class=\"dashboard-head\"><div><h2>Selamat pagi, Admin</h2><p>Pantau aktivitas koperasi hari ini dengan ringkas.</p></div><div class=\"period-tools\"><div class=\"period\"><span>▣</span> 01-"+String(now.getDate()).padStart(2,"0")+" "+monthNames[now.getMonth()]+" "+now.getFullYear()+" <span>⌄</span></div><button class=\"apply-btn\" type=\"button\">Terapkan</button></div></section>"+
      "<section class=\"stats dashboard-stats\"><article class=\"stat-card modern\"><div class=\"stat-icon\">♙</div><div><span>Anggota Aktif</span><strong>"+anggota.length.toLocaleString("id-ID")+"</strong><small class=\"trend up\">↑ Aktif <em>anggota</em></small></div></article>"+
      "<article class=\"stat-card modern\"><div class=\"stat-icon\">▣</div><div><span>Jumlah Simpanan Pokok</span><strong>"+rupiah(totalPokok)+"</strong><small class=\"trend up\">↑ <em>total simpanan pokok</em></small></div></article>"+
      "<article class=\"stat-card modern\"><div class=\"stat-icon\">◉</div><div><span>Jumlah Simpanan Wajib</span><strong>"+rupiah(totalWajib)+"</strong><small class=\"trend up\">↑ <em>total simpanan wajib</em></small></div></article>"+
      "<article class=\"stat-card modern\"><div class=\"stat-icon\">▤</div><div><span>Transaksi Hari Ini</span><strong>"+transaksiHariIni+"</strong><small class=\"trend up\">↑ <em>"+todayWajib.length+" wajib • "+todaySukarela.length+" sukarela</em></small></div></article></section>"+
      "<section class=\"dashboard-grid\"><article class=\"card chart-card\"><div class=\"section-head\"><h3>Arus Kas &amp; Simpanan Bulanan</h3><button class=\"more-btn\" type=\"button\">⋮</button></div><div class=\"chart\"><svg viewBox=\"0 0 100 115\" preserveAspectRatio=\"none\"><line x1=\"8\" y1=\"22\" x2=\"92\" y2=\"22\" class=\"gridline\"/><line x1=\"8\" y1=\"45\" x2=\"92\" y2=\"45\" class=\"gridline\"/><line x1=\"8\" y1=\"68\" x2=\"92\" y2=\"68\" class=\"gridline\"/><line x1=\"8\" y1=\"92\" x2=\"92\" y2=\"92\" class=\"gridline\"/><polyline points=\""+chartPoints+"\" class=\"line teal\" fill=\"none\"/><polyline points=\""+chartPoints+"\" class=\"line red\" fill=\"none\" opacity=\".35\"/></svg><div class=\"xlabels\">"+monthLabels+"</div></div><div class=\"legend\"><span><i class=\"dot teal\"></i>Arus Kas Masuk</span><span><i class=\"dot navy\"></i>Arus Kas Keluar</span><span><i class=\"dot red\"></i>Simpanan</span></div></article>"+
      "<article class=\"card chart-card composition\"><div class=\"section-head\"><h3>Komposisi Transaksi</h3><button class=\"more-btn\" type=\"button\">⋮</button></div><div class=\"donut-wrap\"><div class=\"donut\" style=\"--p1:"+wajibPct+";--p2:"+(wajibPct+sukarelaPct)+";\"><div class=\"donut-center\">"+totalTx+"<small>transaksi</small></div></div><div class=\"comp-list\"><div><i class=\"dot teal\"></i><span>Simpanan Wajib</span><b>"+wajibPct+"%</b></div><div><i class=\"dot orange\"></i><span>Simpanan Pokok</span><b>"+pokokPct+"%</b></div></div></div></article></section>"+
      "<section class=\"card recent-card\"><div class=\"section-head\"><h3>Aktivitas Terbaru</h3><button class=\"more-btn\" type=\"button\">⋮</button></div><div class=\"table-wrap\"><table><thead><tr><th>Tanggal</th><th>No. Transaksi</th><th>Anggota</th><th>Kategori</th><th>Nominal</th><th>Status</th></tr></thead><tbody>"+(recentRows||"<tr><td colspan=\"6\" class=\"empty\">Belum ada aktivitas.</td></tr>")+"</tbody></table></div></section>";
  }
  function pageAnggota(){setTitle("Anggota");setStatus(anggota.length+" anggota");content.innerHTML=anggotaTable(anggota);renderAnggotaRows(anggota);renderAnggotaSearch()}
  function pageAnggotaDetail(id){
    const a=anggota.find(x=>String(x.id)===String(id));if(!a){pageAnggota();return}
    const rows=wajib.filter(w=>String(w.anggota_id)===String(a.id));
    const sRows=sukarela.filter(s=>String(s.anggota_id)===String(a.id)).sort((x,y)=>String(y.tanggal).localeCompare(String(x.tanggal)));
    const totalW=rows.reduce((s,w)=>s+Number(w.jumlah||0),0),pokok=Number(a.simpanan_pokok||0),sukarelaTotal=sRows.reduce((s,x)=>s+Number(x.jumlah||0),0);
    const total=pokok+totalW+sukarelaTotal;
    const years=[...new Set(rows.map(w=>Number(w.tahun)).filter(Boolean))].sort((x,y)=>y-x);
    const today=new Date();const defaultYear=today.getFullYear(),defaultMonth=today.getMonth()+1;
    setTitle("Detail Anggota");setStatus(a.no_anggota+" • "+a.nama);
    const yearBlocks=years.map(year=>{
      const yearRows=rows.filter(w=>Number(w.tahun)===year).sort((x,y)=>Number(x.bulan)-Number(y.bulan));
      const yearTotal=yearRows.reduce((s,w)=>s+Number(w.jumlah||0),0);
      return`<section class="card"><div class="section-head"><div><p class="eyebrow">Simpanan Wajib</p><h3>${year}</h3></div><strong>${rupiah(yearTotal)}</strong></div><div class="table-wrap"><table><thead><tr><th>Bulan</th><th>Jumlah</th></tr></thead><tbody>${yearRows.map(w=>`<tr><td>${monthName(w.bulan)}</td><td><b>${rupiah(w.jumlah)}</b></td></tr>`).join("")||'<tr><td colspan="2" class="empty">Belum ada transaksi.</td></tr>'}</tbody></table></div></section>`
    }).join("");
    content.innerHTML=`<section class="card"><div class="section-head"><div><p class="eyebrow">Profil Anggota</p><h2>${esc(a.nama)}</h2><p class="muted">No. Anggota: <b>${esc(a.no_anggota)}</b></p></div><div><button id="editNameDetail" type="button" class="detail-btn">Edit Nama</button> <button id="backAnggota" type="button" class="detail-btn">← Kembali</button></div></div><div class="table-wrap"><table><tbody><tr><th style="width:220px">Tanggal Bergabung</th><td>${dateId(a.tanggal_masuk)}</td></tr><tr><th>Jenis Kelamin</th><td>${esc(a.jenis_kelamin||"-")}</td></tr></tbody></table></div></section><section class="stats"><article class="stat-card"><span>Simpanan Pokok</span><strong>${rupiah(pokok)}</strong></article><article class="stat-card"><span>Simpanan Wajib</span><strong>${rupiah(totalW)}</strong></article><article class="stat-card"><span>Simpanan Sukarela</span><strong>${rupiah(sukarelaTotal)}</strong></article><article class="stat-card"><span>Jumlah Simpanan Pokok</span><strong>${rupiah(total)}</strong></article></section>${yearBlocks||'<section class="card"><p class="empty">Belum ada rincian simpanan wajib.</p></section>'}<section class="card"><div class="section-head"><div><p class="eyebrow">Setoran Simpanan Wajib</p><h3>Tambah Setoran Bulanan</h3></div><strong>Rp10.000 / bulan</strong></div><form id="wajibForm" style="display:grid;grid-template-columns:150px 150px 1fr auto;gap:10px;align-items:end;margin-bottom:16px"><label>Tahun<select id="wTahun" required>${[...new Set([...years,defaultYear])].sort((x,y)=>y-x).map(y=>`<option value="${y}" ${Number(y)===defaultYear?"selected":""}>${y}</option>`).join("")}</select></label><label>Bulan<select id="wBulan" required>${["Januari","Februari","Maret","April","Mei","Juni","Juli","Agustus","September","Oktober","November","Desember"].map((m,i)=>`<option value="${i+1}" ${i+1===defaultMonth?"selected":""}>${m}</option>`).join("")}</select></label><label>Jumlah Setoran<input id="wJumlah" type="number" min="1" step="1000" value="10000" required></label><button type="submit" class="detail-btn">+ Simpan</button></form><p class="muted">Jika bulan tersebut sudah memiliki setoran, setoran baru akan ditambahkan ke saldo bulan itu.</p></section><section class="card"><div class="section-head"><div><p class="eyebrow">Simpanan Sukarela</p><h3>Riwayat Transaksi</h3></div><strong>${rupiah(sukarelaTotal)}</strong></div><form id="sukarelaForm" style="display:grid;grid-template-columns:160px 1fr 2fr auto;gap:10px;align-items:end;margin-bottom:16px"><label>Tanggal<input id="sTanggal" type="date" value="${new Date().toISOString().slice(0,10)}" required></label><label>Jumlah<input id="sJumlah" type="number" min="0" step="1000" placeholder="10000" required></label><label>Keterangan<input id="sKet" type="text" placeholder="Setoran sukarela"></label><button type="submit" class="detail-btn">+ Simpan</button></form><div class="table-wrap"><table><thead><tr><th>Tanggal</th><th>Jumlah</th><th>Keterangan</th><th>Aksi</th></tr></thead><tbody>${sRows.map(s=>`<tr><td>${dateId(s.tanggal)}</td><td><b>${rupiah(s.jumlah)}</b></td><td>${esc(s.keterangan||"-")}</td><td><button type="button" class="detail-btn" data-delete-sukarela="${esc(s.id)}">Hapus</button></td></tr>`).join("")||'<tr><td colspan="4" class="empty">Belum ada transaksi simpanan sukarela.</td></tr>'}</tbody></table></div></section>`;
    document.getElementById("backAnggota").onclick=pageAnggota;
    document.getElementById("editNameDetail").onclick=()=>editMemberName(a.id);
    document.getElementById("wajibForm").onsubmit=async e=>{
      e.preventDefault();const btn=e.target.querySelector("button[type=submit]");btn.disabled=true;btn.textContent="Menyimpan...";
      try{const tahun=Number(document.getElementById("wTahun").value),bulan=Number(document.getElementById("wBulan").value),jumlah=Number(document.getElementById("wJumlah").value||0);if(jumlah<=0)throw new Error("Jumlah setoran harus lebih dari 0.");const existing=rows.find(w=>Number(w.tahun)===tahun&&Number(w.bulan)===bulan);let result=existing?await supabase.from("koperasi_simpanan_wajib").update({jumlah:Number(existing.jumlah||0)+jumlah}).eq("id",existing.id):await supabase.from("koperasi_simpanan_wajib").insert({anggota_id:a.id,tahun,bulan,jumlah});if(result.error)throw result.error;location.reload();}catch(err){alert("Gagal menyimpan setoran wajib: "+(err?.message||String(err)));btn.disabled=false;btn.textContent="+ Simpan"}
    };
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
  function pageAksesBot(){
    setTitle("Akses Bot WA");
    setStatus(waAllowed.filter(x=>x.active).length+" nomor aktif");
    const render=()=>{
      content.innerHTML="<section class=\"card\"><div class=\"section-head\"><div><p class=\"eyebrow\">WhatsApp Bot</p><h2>Nomor yang Diizinkan</h2><p class=\"muted\">Hanya nomor aktif di daftar ini yang boleh menggunakan bot.</p></div></div><form id=\"waAccessForm\" style=\"display:grid;grid-template-columns:1fr 1fr auto;gap:10px;align-items:end;margin-bottom:20px\"><label>Nomor WhatsApp<input id=\"waPhone\" type=\"text\" placeholder=\"62812xxxxxxxx\" required></label><label>Nama/Keterangan<input id=\"waName\" type=\"text\" placeholder=\"Contoh: Pengurus\"></label><button type=\"submit\" class=\"detail-btn\">+ Tambah</button></form><div class=\"table-wrap\"><table><thead><tr><th>Nomor WhatsApp</th><th>Nama</th><th>Status</th><th>Dibuat</th><th>Aksi</th></tr></thead><tbody>"+waAllowed.map(x=>"<tr><td><b>"+esc(x.phone)+"</b></td><td>"+esc(x.name||"-")+"</td><td><b>"+(x.active?"Aktif":"Nonaktif")+"</b></td><td>"+new Date(x.created_at).toLocaleDateString("id-ID")+"</td><td><button type=\"button\" class=\"detail-btn\" data-wa-toggle=\""+esc(x.id)+"\">"+(x.active?"Nonaktifkan":"Aktifkan")+"</button> <button type=\"button\" class=\"detail-btn\" data-wa-delete=\""+esc(x.id)+"\">Hapus</button></td></tr>").join("")||"<tr><td colspan=\"5\" class=\"empty\">Belum ada nomor yang diizinkan.</td></tr>"+"</tbody></table></div></section>";
      document.getElementById("waAccessForm").onsubmit=async e=>{e.preventDefault();const btn=e.target.querySelector("button[type=submit]");btn.disabled=true;btn.textContent="Menyimpan...";try{let phone=document.getElementById("waPhone").value.trim().replace(/[^0-9]/g,"");if(phone.startsWith("0"))phone="62"+phone.slice(1);if(!phone.startsWith("62")||phone.length<10)throw new Error("Nomor harus menggunakan format 628xxxxxxxxxx.");const name=document.getElementById("waName").value.trim()||null;const {error}=await supabase.from("wa_allowed_numbers").insert({phone,name,active:true});if(error)throw error;location.reload()}catch(err){alert("Gagal menambah nomor: "+(err?.message||String(err)));btn.disabled=false;btn.textContent="+ Tambah"}};
      document.querySelectorAll("[data-wa-toggle]").forEach(btn=>btn.onclick=async()=>{const item=waAllowed.find(x=>String(x.id)===String(btn.dataset.waToggle));if(!item)return;const {error}=await supabase.from("wa_allowed_numbers").update({active:!item.active}).eq("id",item.id);if(error)alert("Gagal mengubah status: "+error.message);else location.reload()});
      document.querySelectorAll("[data-wa-delete]").forEach(btn=>btn.onclick=async()=>{if(!confirm("Hapus nomor ini dari daftar akses bot?"))return;const {error}=await supabase.from("wa_allowed_numbers").delete().eq("id",btn.dataset.waDelete);if(error)alert("Gagal menghapus: "+error.message);else location.reload()});
    };
    render();
  }
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
  const pages={dashboard:pageDashboard,anggota:pageAnggota,pokok:pagePokok,wajib:pageWajib,sukarela:pageSukarela,aksesbot:pageAksesBot};document.querySelectorAll("[data-menu]").forEach(btn=>btn.onclick=()=>{document.querySelectorAll("[data-menu]").forEach(b=>b.classList.remove("active"));btn.classList.add("active");pages[btn.dataset.menu]()});pageDashboard();
 }catch(error){console.error("[Kedungneng Dashboard]",error);showError("Dashboard gagal dimuat: "+(error?.message||String(error)));}}
window.addEventListener("error",e=>showError("Aplikasi gagal dimuat: "+(e.message||"kesalahan JavaScript")));renderDashboard();