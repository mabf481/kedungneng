const SUPABASE_URL="https://ujyavhuwuardqgmwjpra.supabase.co";
const SUPABASE_KEY="sb_publishable_KlaOcV4hclifU1-sr2hyYQ_WDO8C1Ck";
const ADMIN_EMAIL="admin@kedungneng.com";

const msg=document.getElementById("loginMessage");
const show=(text)=>{if(msg)msg.textContent=text;console.error("[Kedungneng]",text)};

window.addEventListener("error",e=>{
  if(e?.message) show("Aplikasi gagal dimuat: "+e.message);
});
window.addEventListener("unhandledrejection",e=>{
  const reason=e?.reason?.message||String(e?.reason||"Kesalahan tidak diketahui");
  show("Terjadi kesalahan: "+reason);
});

async function start(){
  if(!window.supabase){
    show("Library Supabase gagal dimuat. Silakan refresh halaman.");
    return;
  }

  const supabase=window.supabase.createClient(SUPABASE_URL,SUPABASE_KEY);
  const form=document.getElementById("loginForm");
  if(!form){
    show("Form login tidak ditemukan.");
    return;
  }

  try{
    const {data,error}=await supabase.auth.getSession();
    if(error) throw error;
    if(data.session&&data.session.user?.email?.toLowerCase()===ADMIN_EMAIL){
      location.href="./dashboard.html";
      return;
    }
  }catch(error){
    show("Gagal memeriksa sesi: "+(error.message||String(error)));
    return;
  }

  form.addEventListener("submit",async e=>{
    e.preventDefault();
    const email=document.getElementById("email").value.trim().toLowerCase();
    const password=document.getElementById("password").value;

    if(email!==ADMIN_EMAIL){
      show("Email bukan akun admin.");
      return;
    }
    if(!password){
      show("Password wajib diisi.");
      return;
    }

    show("Memproses login...");
    try{
      const {data,error}=await supabase.auth.signInWithPassword({email,password});
      if(error){
        show("Login gagal: "+(error.message||"email atau password salah"));
        return;
      }

      if(!data?.user||data.user.email?.toLowerCase()!==ADMIN_EMAIL){
        await supabase.auth.signOut();
        show("Akses ditolak: akun bukan admin.");
        return;
      }

      show("Login berhasil. Membuka dashboard...");
      location.href="./dashboard.html";
    }catch(error){
      show("Kesalahan login: "+(error.message||String(error)));
    }
  });
}

start().catch(error=>show("Aplikasi gagal dimulai: "+(error.message||String(error))));
