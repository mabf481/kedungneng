const SUPABASE_URL="https://ujyavhuwuardqgmwjpra.supabase.co";
const SUPABASE_KEY="sb_publishable_KlaOcV4hclifU1-sr2hyYQ_WDO8C1Ck";
const ADMIN_PHONE="6289653639580";
const ADMIN_EMAIL="admin@kedungneng.com";
const supabase=window.supabase.createClient(SUPABASE_URL,SUPABASE_KEY);
function normalizePhone(v){return String(v||"").replace(/[^0-9]/g,"").replace(/^0/,"62")}
async function login(){
 const form=document.getElementById("loginForm"); if(!form)return;
 const msg=document.getElementById("loginMessage");
 form.addEventListener("submit",async e=>{
  e.preventDefault();
  const phone=normalizePhone(document.getElementById("phone").value);
  const password=document.getElementById("password").value;
  if(phone!==ADMIN_PHONE){msg.textContent="Nomor HP bukan nomor admin.";return}
  msg.textContent="Memproses...";
  const {error}=await supabase.auth.signInWithPassword({email:ADMIN_EMAIL,password});
  if(error){msg.textContent="Login gagal. Periksa password.";return}
  const {data:{user}}=await supabase.auth.getUser();
  if(!user||user.email?.toLowerCase()!==ADMIN_EMAIL){await supabase.auth.signOut();msg.textContent="Akses ditolak.";return}
  location.href="./dashboard.html";
 });
}
supabase.auth.getSession().then(({data})=>{if(data.session&&data.session.user?.email?.toLowerCase()===ADMIN_EMAIL)location.href="./dashboard.html";else login()});