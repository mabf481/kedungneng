(()=>{
  const SUPABASE_URL="https://ujyavhuwuardqgmwjpra.supabase.co";
  const SUPABASE_KEY="sb_publishable_KlaOcV4hclifU1-sr2hyQ_WDO8C1Ck";

  function applyMemberActions(){
    const rows=document.querySelectorAll("#rows tr");
    rows.forEach(row=>{
      const oldDetail=row.querySelector("[data-member]");
      const oldEdit=row.querySelector("[data-edit-name]");
      if(!oldDetail && !oldEdit) return;

      const id=oldDetail?.dataset.member || oldEdit?.dataset.editName;
      if(!id) return;

      oldDetail?.remove();
      oldEdit?.remove();

      const actionCell=row.querySelector("td:last-child");
      if(!actionCell) return;

      let del=actionCell.querySelector("[data-delete-member]");
      if(!del){
        del=document.createElement("button");
        del.type="button";
        del.className="detail-btn";
        del.dataset.deleteMember=id;
        del.textContent="Hapus";
        actionCell.appendChild(del);
      }

      if(del.dataset.bound==="1") return;
      del.dataset.bound="1";
      del.onclick=async()=>{
        const name=row.children[1]?.textContent?.trim()||"anggota";
        const no=row.children[0]?.textContent?.trim()||"";
        if(!confirm("Hapus anggota "+name+" ("+no+")?\n\nData anggota akan dihapus dan tindakan ini tidak dapat dibatalkan.")) return;
        try{
          const client=window.supabase.createClient(SUPABASE_URL,SUPABASE_KEY);
          const {error}=await client.from("koperasi_anggota").delete().eq("id",id);
          if(error) throw error;
          alert("Anggota berhasil dihapus.");
          location.reload();
        }catch(err){
          alert("Gagal menghapus anggota: "+(err?.message||String(err)));
        }
      };
    });
  }

  const observer=new MutationObserver(applyMemberActions);
  observer.observe(document.body,{childList:true,subtree:true});
  setTimeout(applyMemberActions,100);
  setTimeout(applyMemberActions,500);
  setTimeout(applyMemberActions,1500);
})();