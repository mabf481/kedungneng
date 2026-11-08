        const nama=document.getElementById("memberNama").value.replace(/\s+/g," ").trim();
        const nik=document.getElementById("memberNik").value.replace(/\D/g,"");
        const tempatLahir=document.getElementById("memberTempatLahir").value.replace(/\s+/g," ").trim();
        const tanggalLahir=document.getElementById("memberTanggalLahir").value;
        const jenisKelamin=document.getElementById("memberGender").value;
        const alamat=document.getElementById("memberAlamat").value.trim();
        const noHp=document.getElementById("memberNoHp").value.trim();
        if(nama.length<2||nama.length>100)throw new Error("Nama lengkap harus 2-100 karakter.");
        if(nik.length!==16)throw new Error("NIK harus tepat 16 digit.");
        if(!tempatLahir||!tanggalLahir||!jenisKelamin||!alamat||!noHp)throw new Error("Semua isian wajib diisi.");
        const noAnggota=nextNoAnggota();
        const {data,error}=await supabase.from("koperasi_anggota").insert({
          no_anggota:noAnggota,nama,no_induk_kependudukan:nik,tempat_lahir:tempatLahir,tanggal_lahir: tanggalLahir,
          jenis_kelamin:jenisKelamin,alamat,no_hp:noHp,tanggal_masuk:new Date().toISOString().slice(0,10),simpanan_pokok:0,simpanan_sukarela:0
        }).select("id,no_anggota,nama,no_induk_kependudukan,tempat_lahir,tanggal_lahir,jenis_kelamin,alamat,no_hp,tanggal_masuk,simpanan_pokok,simpanan_sukarela,created_at").single();
        if(error)throw error;
        anggota.push(data);anggota.sort((a,b)=>String(a.no_anggota).localeCompare(String(b.no_anggota),undefined,{numeric:true}));
        panel.hidden=true;form.reset();alert("Anggota berhasil ditambahkan dengan nomor "+noAnggota+"."); cetakFormPendaftaran(data); pageAnggota();
      }catch(err){alert("Gagal menambah anggota: "+(err?.message||String(err)))}finally{btn.disabled=false;btn.textContent="+ Simpan Anggota"}
    };
    const render=list=>{
      const el=document.getElementById("rows");
      el.innerHTML=list.map(a=>{const pokok=Number(a.simpanan_pokok||0),status=pokok>=100000?"LUNAS":"BELUM LUNAS";return `<tr><td><b>${esc(a.no_anggota)}</b></td><td><b>${esc(a.nama)}</b></td><td>${esc(a.jenis_kelamin||"-")}</td><td>${dateId(a.tanggal_masuk)}</td><td><b>${rupiah(pokok)}</b></td><td><span class="status-pill ${pokok>=100000?"success":"pending"}">${status}</span></td><td><div class="table-actions"><button type="button" class="detail-btn" data-edit-name="${esc(a.id)}">Edit</button><button type="button" class="detail-btn" data-view-form="${esc(a.id)}">Lihat Formulir</button><button type="button" class="detail-btn" data-delete-member="${esc(a.id)}">Hapus</button></div></td></tr>`}).join("")||'<tr><td colspan="7" class="empty">Tidak ditemukan.</td></tr>';
      el.querySelectorAll("[data-edit-name]").forEach(btn=>btn.onclick=()=>editMemberName(btn.dataset.editName));
      el.querySelectorAll("[data-view-form]").forEach(btn=>btn.onclick=()=>lihatFormPendaftaran(btn.dataset.viewForm));
      el.querySelectorAll("[data-delete-member]").forEach(btn=>btn.onclick=()=>deleteMember(btn.dataset.deleteMember));
    };
    const apply=()=>{const q=String(document.getElementById("search").value||"").toLowerCase(),gender=document.getElementById("genderFilter").value;render(anggota.filter(a=>(!q||String(a.no_anggota||"").toLowerCase().includes(q)||String(a.nama||"").toLowerCase().includes(q))&&(!gender||String(a.jenis_kelamin||"").toUpperCase().startsWith(gender))))};
    document.getElementById("search").oninput=apply;document.getElementById("genderFilter").onchange=apply;render(anggota);
  }
  function cetakFormPendaftaran(a){
    const fmtDate=(v)=>{
      if(!v)return "-";
      const d=new Date(v+"T00:00:00");
      return d.toLocaleDateString("id-ID",{day:"numeric",month:"long",year:"numeric"});
    };
    const hariIni=fmtDate(new Date().toISOString().slice(0,10));
    const gender=String(a.jenis_kelamin||"").toUpperCase().startsWith("L")?"Laki - Laki":"Perempuan";
    const alamat=esc(a.alamat||"-").replace(/\n/g,"<br>");
    const html=`<!doctype html><html lang="id"><head><meta charset="utf-8"><title>Formulir Pendaftaran - ${esc(a.nama)}</title>
      <style>
        @page{size:A4;margin:18mm 18mm 15mm 18mm}*{box-sizing:border-box}body{font-family:"Times New Roman",serif;color:#111;margin:0;font-size:12pt;line-height:1.35}
        .kop{text-align:center}.kop .title{font-weight:bold;font-size:15pt;letter-spacing:.2px}.kop .name{font-weight:bold;font-size:14pt}.kop .ahu{font-size:11pt;margin-top:2px}.kop .addr{font-size:10.5pt}.line{border-top:1.5px solid #111;margin-top:8px}
        h1{text-align:center;font-size:14pt;margin:25px 0 25px;font-weight:bold}.data{margin-left:5mm}.row{display:grid;grid-template-columns:47mm 6mm 1fr;margin:5px 0}.label{white-space:nowrap}.value{min-height:18px}.statement{margin-top:26px;text-align:justify}.signature{margin-top:36px;text-align:center;margin-left:55%}.signature .date{margin-bottom:28px}.signature .role{margin-bottom:42px}.signature .name{font-weight:bold;text-decoration:underline}.note{margin-top:38px;font-size:10.5pt}
        @media print{body{print-color-adjust:exact;-webkit-print-color-adjust:exact}}
      </style></head><body>
      <div class="kop"><div class="title">KOPERASI PERTANIAN</div><div class="name">LANGENG LUMBUNG PANGAN KEDUNGNENG</div><div class="ahu">AHU-0005273.AH.01.29.Tahun 2023</div><div class="addr">Jl. Lapangan Bola Andalas, RT 01 RW 03 Desa Kedunngneng</div><div class="addr">Kec. Losari Kab. Brebed Jawa Tengah 52255</div><div class="addr">e-mail : koptanllpkedungneng@gmail.com</div><div class="line"></div></div>
      <h1>Formulir Pendaftaran Anggota Baru</h1>
      <div class="data">
        <div class="row"><div class="label">Nama Lengkap</div><div>:</div><div class="value">${esc(a.nama)}</div></div>
        <div class="row"><div class="label">Nomor Induk Kependudukan</div><div>:</div><div class="value">${esc(a.no_induk_kependudukan||"-")}</div></div>
        <div class="row"><div class="label">Tempat, Tanggal Lahir</div><div>:</div><div class="value">${esc(a.tempat_lahir||"-")}, ${fmtDate(a.tanggal_lahir)}</div></div>
        <div class="row"><div class="label">Jenis Kelamin</div><div>:</div><div class="value">${gender}</div></div>
        <div class="row"><div class="label">Alamat</div><div>:</div><div class="value">${alamat}</div></div>
        <div class="row"><div class="label">No HP</div><div>:</div><div class="value">${esc(a.no_hp||"-")}</div></div>
      </div>
      <div class="statement">Saya menyatakan untuk di daftar sebagai anggota Koperasi Produsen Pertanian Langgeng Lumbung Pangan dengan sukarela dan bersedia memenuhi / mematuhi segala hak dan kewajiban sebagai anggota sebagaimana tersebut dalam Angaran Dasar (AD) dan Anggaran Rumah Tangga (ART) serta ketentuan Koperasi Produsen Pertanian Langgeng Lumbung Pangan.</div>
      <div class="signature"><div class="date">Brebes, ${hariIni}</div><div class="role">Pemohon</div><div class="name">${esc(a.nama)}</div><div>___________________________</div></div>
      <div class="note">Note : Lampirkan foto copy KTP yang masih berlaku</div>
      <script>window.onload=()=>setTimeout(()=>window.print(),350);window.onafterprint=()=>window.close();</script>
      </body></html>`;
    const w=window.open("","_blank","width=900,height=1100");
    if(!w){alert("Form pendaftaran sudah dibuat, tetapi browser memblokir jendela cetak. Izinkan pop-up untuk dashboard ini lalu coba simpan lagi.");return}
    w.document.open();w.document.write(html);w.document.close();
  }

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
    content.innerHTML=`<section class="card"><div class="section-head"><div><p class="eyebrow">Profil Anggota</p><h2>${esc(a.nama)}</h2><p class="muted">No. Anggota: <b>${esc(a.no_anggota)}</b></p></div><div><button id="editNameDetail" type="button" class="detail-btn">Edit Nama</button> <button id="backAnggota" type="button" class="detail-btn">← Kembali</button></div></div><div class="table-wrap"><table><tbody><tr><th style="width:220px">No. Anggota</th><td>${esc(a.no_anggota)}</td></tr><tr><th>No. Induk Kependudukan</th><td>${esc(a.no_induk_kependudukan||"-")}</td></tr><tr><th>Tempat, Tanggal Lahir</th><td>${esc(a.tempat_lahir||"-")}, ${dateId(a.tanggal_lahir)}</td></tr><tr><th>Jenis Kelamin</th><td>${esc(a.jenis_kelamin||"-")}</td></tr><tr><th>Alamat</th><td>${esc(a.alamat||"-")}</td></tr><tr><th>No HP</th><td>${esc(a.no_hp||"-")}</td></tr><tr><th>Tanggal Bergabung</th><td>${dateId(a.tanggal_masuk)}</td></tr></tbody></table></div></section><section class="stats"><article class="stat-card"><span>Simpanan Pokok</span><strong>${rupiah(pokok)}</strong></article><article class="stat-card"><span>Simpanan Wajib</span><strong>${rupiah(totalW)}</strong></article><article class="stat-card"><span>Simpanan Sukarela</span><strong>${rupiah(sukarelaTotal)}</strong></article><article class="stat-card"><span>Jumlah Simpanan Pokok</span><strong>${rupiah(total)}</strong></article></section>${yearBlocks||'<section class="card"><p class="empty">Belum ada rincian simpanan wajib.</p></section>'}<section class="card"><div class="section-head"><div><p class="eyebrow">Setoran Simpanan Wajib</p><h3>Tambah Setoran Bulanan</h3></div><strong>Rp10.000 / bulan</strong></div><form id="wajibForm" style="display:grid;grid-template-columns:150px 150px 1fr auto;gap:10px;align-items:end;margin-bottom:16px"><label>Tahun<select id="wTahun" required>${[...new Set([...years,defaultYear])].sort((x,y)=>y-x).map(y=>`<option value="${y}" ${Number(y)===defaultYear?"selected":""}>${y}</option>`).join("")}</select></label><label>Bulan<select id="wBulan" required>${["Januari","Februari","Maret","April","Mei","Juni","Juli","Agustus","September","Oktober","November","Desember"].map((m,i)=>`<option value="${i+1}" ${i+1===defaultMonth?"selected":""}>${m}</option>`).join("")}</select></label><label>Jumlah Setoran<input id="wJumlah" type="number" min="1" step="1000" value="10000" required></label><button type="submit" class="detail-btn">+ Simpan</button></form><p class="muted">Jika bulan tersebut sudah memiliki setoran, setoran baru akan ditambahkan ke saldo bulan itu.</p></section><section class="card"><div class="section-head"><div><p class="eyebrow">Simpanan Sukarela</p><h3>Riwayat Transaksi</h3></div><strong>${rupiah(sukarelaTotal)}</strong></div><form id="sukarelaForm" style="display:grid;grid-template-columns:160px 1fr 2fr auto;gap:10px;align-items:end;margin-bottom:16px"><label>Tanggal<input id="sTanggal" type="date" value="${new Date().toISOString().slice(0,10)}" required></label><label>Jumlah<input id="sJumlah" type="number" min="0" step="1000" placeholder="10000" required></label><label>Keterangan<input id="sKet" type="text" placeholder="Setoran sukarela"></label><button type="submit" class="detail-btn">+ Simpan</button></form><div class="table-wrap"><table><thead><tr><th>Tanggal</th><th>Jumlah</th><th>Keterangan</th><th>Aksi</th></tr></thead><tbody>${sRows.map(s=>`<tr><td>${dateId(s.tanggal)}</td><td><b>${rupiah(s.jumlah)}</b></td><td>${esc(s.keterangan||"-")}</td><td><button type="button" class="detail-btn" data-delete-sukarela="${esc(s.id)}">Hapus</button></td></tr>`).join("")||'<tr><td colspan="4" class="empty">Belum ada transaksi simpanan sukarela.</td></tr>'}</tbody></table></div></section>`;
    document.getElementById("backAnggota").onclick=pageAnggota;
    document.getElementById("editNameDetail").onclick=()=>editMemberName(a.id);
    document.getElementById("wajibForm").onsubmit=async e=>{
      e.preventDefault();const btn=e.target.querySelector("button[type=submit]");btn.disabled=true;btn.textContent="Menyimpan...";
      try{const tahun=Number(document.getElementById("wTahun").value),bulan=Number(document.getElementById("wBulan").value),jumlah=Number(document.getElementById("wJumlah").value||0);if(jumlah<=0)throw new Error("Jumlah setoran harus lebih dari 0.");const existing=rows.find(w=>Number(w.tahun)===tahun&&Number(w.bulan)===bulan);let result=existing?await supabase.from("koperasi_simpanan_wajib").update({jumlah:Number(existing.jumlah||0)+jumlah,sumber_transaksi:"WEB"}).eq("id",existing.id):await supabase.from("koperasi_simpanan_wajib").insert({anggota_id:a.id,tahun,bulan,jumlah,sumber_transaksi:"WEB"});if(result.error)throw result.error;location.reload();}catch(err){alert("Gagal menyimpan setoran wajib: "+(err?.message||String(err)));btn.disabled=false;btn.textContent="+ Simpan"}
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
    const activeCount=waAllowed.filter(x=>x.active).length;
    const inactiveCount=waAllowed.length-activeCount;
    setStatus(activeCount+" nomor aktif");
    let editingId=null;
    const render=()=>{
      const q=String(document.getElementById("waSearch")?.value||"").toLowerCase();
      const statusFilter=document.getElementById("waStatusFilter")?.value||"all";
      const list=waAllowed.filter(x=>(!q||String(x.phone||"").toLowerCase().includes(q)||String(x.name||"").toLowerCase().includes(q))&&(statusFilter==="all"||(statusFilter==="active"&&x.active)||(statusFilter==="inactive"&&!x.active)));
      const rows=list.map(x=>"<tr><td><b>"+esc(x.phone)+"</b></td><td>"+esc(x.name||"-")+"</td><td><span class=\"status-pill "+(x.active?"success":"pending")+"\">"+(x.active?"Aktif":"Nonaktif")+"</span></td><td>"+dateId(x.created_at)+"</td><td><div class=\"table-actions\"><button type=\"button\" class=\"detail-btn\" data-wa-edit=\""+esc(x.id)+"\">Edit</button><button type=\"button\" class=\"detail-btn\" data-wa-toggle=\""+esc(x.id)+"\">"+(x.active?"Nonaktifkan":"Aktifkan")+"</button><button type=\"button\" class=\"detail-btn\" data-wa-delete=\""+esc(x.id)+"\">Hapus</button></div></td></tr>").join("")||"<tr><td colspan=\"5\" class=\"empty\">Tidak ditemukan.</td></tr>";
      content.innerHTML=`<section class="dashboard-head anggota-head"><div><h2>Akses Bot WA</h2><p>Kelola nomor WhatsApp yang diizinkan menggunakan bot koperasi.</p></div><div class="period-tools"><div class="period"><span>◉</span> ${activeCount} aktif <span>•</span> ${inactiveCount} nonaktif</div></div></section>
      <section class="stats anggota-stats"><article class="stat-card modern"><div class="stat-icon">◉</div><div><span>Total Nomor</span><strong>${waAllowed.length}</strong><small class="trend neutral"><em>terdaftar</em></small></div></article><article class="stat-card modern"><div class="stat-icon">✓</div><div><span>Nomor Aktif</span><strong>${activeCount}</strong><small class="trend up">↑ <em>boleh akses bot</em></small></div></article><article class="stat-card modern"><div class="stat-icon">!</div><div><span>Nomor Nonaktif</span><strong>${inactiveCount}</strong><small class="trend neutral"><em>akses dibatasi</em></small></div></article><article class="stat-card modern"><div class="stat-icon">WA</div><div><span>Status Bot</span><strong>${activeCount>0?"Aktif":"Tidak Aktif"}</strong><small class="trend ${activeCount>0?"up":"neutral"}"><em>berdasarkan akses</em></small></div></article></section>
      <section class="transaction-grid"><article class="card transaction-form-card"><div class="section-head"><div><p class="eyebrow">Data Akses Baru</p><h2>Tambah Nomor</h2></div></div><form id="waAccessForm" class="transaction-form"><div class="form-grid"><label>Nomor WhatsApp<input id="waPhone" type="text" placeholder="62812xxxxxxxx" required><small>Format: 628xxxxxxxxxx</small></label><label>Nama / Keterangan<input id="waName" type="text" placeholder="Contoh: Pengurus"></label></div><div class="transaction-actions"><button type="submit" class="detail-btn primary">+ Tambah Akses</button><button type="button" id="waReset" class="detail-btn">↻ Reset</button></div></form></article><article class="card transaction-summary"><div class="section-head"><div><p class="eyebrow">Ringkasan Akses</p><h2>Status</h2></div></div><div class="summary-list"><div><span>Total Nomor</span><b>${waAllowed.length}</b></div><div><span>Aktif</span><b class="accent">${activeCount}</b></div><div><span>Nonaktif</span><b>${inactiveCount}</b></div><div><span>Akses Baru</span><b class="accent">Siap ditambahkan</b></div></div></article></section>
      <section class="card anggota-list-card"><div class="section-head anggota-list-head"><div><p class="eyebrow">Data Akses Bot</p><h2>Daftar Nomor WhatsApp</h2></div><div class="anggota-tools"><select id="waStatusFilter" class="year-select"><option value="all">Semua status</option><option value="active">Aktif</option><option value="inactive">Nonaktif</option></select><input id="waSearch" class="search" type="search" placeholder="Cari nomor atau nama..." value="${esc(q)}"></div></div><div class="table-wrap"><table><thead><tr><th>Nomor WhatsApp</th><th>Nama / Keterangan</th><th>Status</th><th>Dibuat</th><th>Aksi</th></tr></thead><tbody>${rows}</tbody></table></div></section>`;
      document.getElementById("waAccessForm").onsubmit=async e=>{e.preventDefault();const btn=e.target.querySelector("button[type=submit)");};
      const form=document.getElementById("waAccessForm");form.onsubmit=async e=>{e.preventDefault();const btn=e.target.querySelector("button[type=submit]");btn.disabled=true;btn.textContent="Menyimpan...";try{let phone=document.getElementById("waPhone").value.trim().replace(/[^0-9]/g,"");if(phone.startsWith("0"))phone="62"+phone.slice(1);if(!phone.startsWith("62")||phone.length<10)throw new Error("Nomor harus menggunakan format 628xxxxxxxxxx.");const name=document.getElementById("waName").value.replace(/\s+/g," ").trim()||null;const {error}=await supabase.from("wa_allowed_numbers").insert({phone,name,active:true});if(error)throw error;location.reload()}catch(err){alert("Gagal menambah nomor: "+(err?.message||String(err)));btn.disabled=false;btn.textContent="+ Tambah Akses"}};
      document.getElementById("waReset").onclick=()=>{document.getElementById("waPhone").value="";document.getElementById("waName").value="";document.getElementById("waPhone").focus()};
      document.getElementById("waSearch").oninput=()=>render();document.getElementById("waStatusFilter").onchange=()=>render();
      document.querySelectorAll("[data-wa-edit]").forEach(btn=>btn.onclick=async()=>{const item=waAllowed.find(x=>String(x.id)===String(btn.dataset.waEdit));if(!item)return;const phoneInput=prompt("Edit nomor WhatsApp:",item.phone||"");if(phoneInput===null)return;let phone=phoneInput.trim().replace(/[^0-9]/g,"");if(phone.startsWith("0"))phone="62"+phone.slice(1);if(!phone.startsWith("62")||phone.length<10){alert("Nomor harus menggunakan format 628xxxxxxxxxx.");return}const nameInput=prompt("Edit nama/keterangan:",item.name||"");if(nameInput===null)return;const name=nameInput.replace(/\s+/g," ").trim()||null;const {error}=await supabase.from("wa_allowed_numbers").update({phone,name}).eq("id",item.id);if(error)alert("Gagal mengedit akses: "+error.message);else location.reload()});
      document.querySelectorAll("[data-wa-toggle]").forEach(btn=>btn.onclick=async()=>{const item=waAllowed.find(x=>String(x.id)===String(btn.dataset.waToggle));if(!item)return;const {error}=await supabase.from("wa_allowed_numbers").update({active:!item.active}).eq("id",item.id);if(error)alert("Gagal mengubah status: "+error.message);else location.reload()});
      document.querySelectorAll("[data-wa-delete]").forEach(btn=>btn.onclick=async()=>{if(!confirm("Hapus nomor ini dari daftar akses bot?"))return;const {error}=await supabase.from("wa_allowed_numbers").delete().eq("id",btn.dataset.waDelete);if(error)alert("Gagal menghapus: "+error.message);else location.reload()});
    };
    render();
  }
  async function pageAdmin(){
    if(!canManageAdmins){alert("Akses hanya untuk super admin.");return}
    setTitle("Admin");setStatus("Kelola akun admin");
    const adminApi=async payload=>{const {data:{session:currentSession}}=await supabase.auth.getSession();if(!currentSession)throw new Error("Sesi login berakhir.");const res=await fetch(SUPABASE_URL+"/functions/v1/admin-management",{method:"POST",headers:{"Authorization":"Bearer "+currentSession.access_token,"Content-Type":"application/json"},body:JSON.stringify(payload)});const data=await res.json();if(!res.ok)throw new Error(data.error||"Permintaan gagal.");return data};
    const draw=async()=>{try{