const SUPABASE_URL="https://ujyavhuwuardqgmwjpra.supabase.co";
const SUPABASE_KEY="sb_publishable_KlaOcV4hclifU1-sr2hyYQ_WDO8C1Ck";
const ADMIN_EMAIL="admin@kedungneng.com";
const supabase=window.supabase.createClient(SUPABASE_URL,SUPABASE_KEY);

const rupiah=n=>new Intl.NumberFormat("id-ID",{style:"currency",currency:"IDR",maximumFractionDigits:0}).format(Number(n||0));
const dateId=v=>v?new Date(v+"T00:00:00").toLocaleDateString("id-ID"):"-";
const showError=message=>{
 document.body.innerHTML=`<main class="container"><section class="card"><p class="eyebrow">Koperasi Kedungneng</p><h1>Dashboard</h1><p class="message">${message}</p><a href="/">Kembali ke Login</a></section></main>`;
};

async function renderDashboard(){
 try{
  const {data:{user},error:sessionError}=await supabase.auth.getUser();
  if(sessionError) throw sessionError;
  if(!user){ location.replace("/"); return; }
  if(user.email?.toLowerCase()!==ADMIN_EMAIL){
   await supabase.auth.signOut(); showError("Akses ditolak. Akun ini bukan admin."); return;
  }

  document.body.innerHTML=`<header class="topbar"><div><p class="eyebrow">Koperasi Kedungneng</p><h1>Dashboard</h1></div><button id="logout" style="width:auto;margin:0;padding:9px 14px">Keluar</button></header><main class="container"><section class="stats"><article class="stat-card"><span>Total Anggota</span><strong id="totalAnggota">—</strong></article><article class="stat-card"><span>Total Simpanan Pokok</span><strong id="totalPokok">—</strong></article><article class="stat-card"><span>Total Simpanan Sukarela</span><strong id="totalSukarela">—</strong></article><article class="stat-card"><span>Total Simpanan Wajib</span><strong id="totalWajib">—</strong></article></section><section class="card"><div class="section-head"><div><p class="eyebrow">Data anggota</p><h2>Daftar Anggota</h2></div><input id="search" class="search" type="search" placeholder="Cari nomor atau nama..."></div><div class="table-wrap"><table><thead><tr><th>No. Anggota</th><th>Nama</th><th>L/P</th><th>Tanggal Masuk</th><th>Pokok</th><th>Sukarela</th></tr></thead><tbody id="anggotaBody"><tr><td colspan="6" class="muted">Memuat...</td></tr></tbody></table></div></section></main>`;

  document.getElementById("logout").onclick=async()=>{await supabase.auth.signOut();location.replace("/")};

  const {data:anggota,error}=await supabase.from("koperasi_anggota").select("no_anggota,nama,jenis_kelamin,tanggal_masuk,simpanan_pokok,simpanan_sukarela").order("no_anggota");
  if(error) throw error;

  document.getElementById("totalAnggota").textContent=anggota.length;
  document.getElementById("totalPokok").textContent=rupiah(anggota.reduce((s,a)=>s+Number(a.simpanan_pokok||0),0));
  document.getElementById("totalSukarela").textContent=rupiah(anggota.reduce((s,a)=>s+Number(a.simpanan_sukarela||0),0));

  const {data:wajib,error:wajibError}=await supabase.from("koperasi_simpanan_wajib").select("jumlah");
  if(wajibError) throw wajibError;
  document.getElementById("totalWajib").textContent=rupiah((wajib||[]).reduce((s,a)=>s+Number(a.jumlah||0),0));

  const renderRows=list=>document.getElementById("anggotaBody").innerHTML=list.map(a=>`<tr><td><b>${a.no_anggota}</b></td><td>${a.nama}</td><td>${a.jenis_kelamin||"-"}</td><td>${dateId(a.tanggal_masuk)}</td><td>${rupiah(a.simpanan_pokok)}</td><td>${rupiah(a.simpanan_sukarela)}</td></tr>`).join("")||`<tr><td colspan="6" class="muted">Tidak ditemukan.</td></tr>`;
  renderRows(anggota);
  document.getElementById("search").addEventListener("input",e=>{
   const q=e.target.value.toLowerCase();
   renderRows(anggota.filter(a=>a.no_anggota.toLowerCase().includes(q)||a.nama.toLowerCase().includes(q)));
  });
 }catch(error){ showError("Dashboard gagal dimuat: "+(error.message||String(error))); }
}
window.addEventListener("error",e=>showError("Aplikasi gagal dimuat: "+(e.message||"kesalahan JavaScript")));
renderDashboard();