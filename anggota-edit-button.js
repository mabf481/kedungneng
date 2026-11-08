(()=>{
  function apply(){
    document.querySelectorAll("#rows tr").forEach(row=>{
      const detail=row.querySelector("[data-member]");
      const edit=row.querySelector("[data-edit-name]");
      if(detail) detail.remove();
      if(edit){
        edit.textContent="Edit";
        edit.title="Edit seluruh data anggota";
        if(edit.dataset.fullEditBound==="1") return;
        edit.dataset.fullEditBound="1";
        edit.onclick=async()=>{
          const id=edit.dataset.editName;
          const client=window.supabase.createClient("https://ujyavhuwuardqgmwjpra.supabase.co","sb_publishable_KlaOcV4hclifU1-sr2hyYQ_WDO8C1Ck");
          const {data:a,error}=await client.from("koperasi_anggota").select("id,no_anggota,nama,no_induk_kependudukan,tempat_lahir,tanggal_lahir,jenis_kelamin,alamat,no_hp,tanggal_masuk,simpanan_pokok,simpanan_sukarela").eq("id",id).single();
          if(error||!a){alert("Data anggota tidak ditemukan.");return;}
          const nama=prompt("Nama Lengkap:",a.nama||""); if(nama===null)return;
          const nik=prompt("NIK (16 digit):",a.no_induk_kependudukan||""); if(nik===null)return;
          const tempat=prompt("Tempat Lahir:",a.tempat_lahir||""); if(tempat===null)return;
          const tanggal=prompt("Tanggal Lahir (YYYY-MM-DD):",a.tanggal_lahir||""); if(tanggal===null)return;
          const gender=prompt("Jenis Kelamin (L/P):",a.jenis_kelamin||""); if(gender===null)return;
          const alamat=prompt("Alamat:",a.alamat||""); if(alamat===null)return;
          const hp=prompt("No HP:",a.no_hp||""); if(hp===null)return;
          const masuk=prompt("Tanggal Masuk (YYYY-MM-DD):",a.tanggal_masuk||""); if(masuk===null)return;
          const pokok=prompt("Simpanan Pokok:",String(a.simpanan_pokok??0)); if(pokok===null)return;
          const sukarela=prompt("Simpanan Sukarela:",String(a.simpanan_sukarela??0)); if(sukarela===null)return;
          const cleanNama=nama.replace(/\\s+/g," ").trim();
          const cleanNik=nik.replace(/\\D/g,"");
          const cleanGender=gender.trim().toUpperCase().startsWith("P")?"P":"L";
          const cleanPokok=Number(pokok.replace(/[^0-9.-]/g,""));
          const cleanSukarela=Number(sukarela.replace(/[^0-9.-]/g,""));
          if(cleanNama.length<2||cleanNama.length>100){alert("Nama harus 2-100 karakter.");return}
          if(cleanNik.length!==16){alert("NIK harus tepat 16 digit.");return}
          if(!/^\\d{4}-\\d{2}-\\d{2}$/.test(tanggal)||!/^\\d{4}-\\d{2}-\\d{2}$/.test(masuk)){alert("Tanggal harus berformat YYYY-MM-DD.");return}
          if(!Number.isFinite(cleanPokok)||cleanPokok<0||!Number.isFinite(cleanSukarela)||cleanSukarela<0){alert("Nilai simpanan tidak valid.");return}
          const result=await client.from("koperasi_anggota").update({nama:cleanNama,no_induk_kependudukan:cleanNik,tempat_lahir:tempat.trim(),tanggal_lahir:tanggal,jenis_kelamin:cleanGender,alamat:alamat.trim(),no_hp:hp.trim(),tanggal_masuk:masuk,simpanan_pokok:cleanPokok,simpanan_sukarela:cleanSukarela}).eq("id",id);
          if(result.error){alert("Gagal memperbarui data: "+result.error.message);return}
          alert("Seluruh data anggota berhasil diperbarui.");
          location.reload();
        };
      }
    });
  }
  const observer=new MutationObserver(apply);
  observer.observe(document.body,{childList:true,subtree:true});
  setTimeout(apply,100);
  setTimeout(apply,500);
  setTimeout(apply,1500);
})();