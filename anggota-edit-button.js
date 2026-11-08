(()=>{
  function apply(){
    document.querySelectorAll("#rows tr").forEach(row=>{
      const detail=row.querySelector("[data-member]");
      const editName=row.querySelector("[data-edit-name]");
      if(detail) detail.remove();
      if(editName){
        editName.textContent="Edit";
        editName.title="Edit nama anggota";
      }
    });
  }
  const observer=new MutationObserver(apply);
  observer.observe(document.body,{childList:true,subtree:true});
  setTimeout(apply,100);
  setTimeout(apply,500);
  setTimeout(apply,1500);
})();