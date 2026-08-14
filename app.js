const API="https://worthhit-api.onrender.com";
let products=[],categories=[],cart=[],currentCategory="";
let customer=JSON.parse(localStorage.getItem("worthhit_customer")||"null");

const $=id=>document.getElementById(id);
$("year").textContent=new Date().getFullYear();

async function api(path,options={}){
  const r=await fetch(API+path,{headers:{"Content-Type":"application/json",...(options.headers||{})},...options});
  const data=await r.json().catch(()=>({}));
  if(!r.ok) throw new Error(data.error||"Request failed");
  return data;
}
function toast(msg){$("toast").textContent=msg;$("toast").classList.add("show");setTimeout(()=>$("toast").classList.remove("show"),2200)}
function showSection(id){document.querySelectorAll(".section").forEach(x=>x.classList.remove("active"));$(id).classList.add("active");if(id==="cart")renderCart();if(id==="orders")loadOrders();if(id==="account")renderAccount();window.scrollTo({top:0,behavior:"smooth"})}
function money(n){return "₹"+Number(n||0).toLocaleString("en-IN")}
function imgSrc(v){return v?(v.startsWith("http")?v:API+v):""}

async function loadCategories(){
  try{categories=await api("/api/categories");$("categories").innerHTML='<button class="active" onclick="filterCat(\'\')">All</button>'+categories.map(c=>`<button onclick="filterCat(${JSON.stringify(c.name)})">${c.name}</button>`).join("")}catch(e){console.error(e)}
}
async function loadProducts(){
  try{products=await api("/api/products");renderProducts()}catch(e){toast(e.message)}
}
function filterCat(cat){currentCategory=cat;document.querySelectorAll(".cats button").forEach(b=>b.classList.remove("active"));event?.target?.classList.add("active");renderProducts()}
function renderProducts(){
  const q=($("search").value||"").toLowerCase();
  const list=products.filter(p=>(!currentCategory||p.category===currentCategory)&&(!q||p.name.toLowerCase().includes(q)||p.category.toLowerCase().includes(q)));
  $("products").innerHTML=list.length?list.map(p=>`<article class="product">
    <div class="product-img">${p.image?`<img src="${imgSrc(p.image)}" alt="">`:`<div class="placeholder">🛍️</div>`}</div>
    <div class="product-body"><div class="category">${p.category}</div><h3>${escapeHtml(p.name)}</h3>
    <div class="price">${money(p.price)} ${p.old_price?`<span class="old">${money(p.old_price)}</span>`:""}</div>
    <div class="stock">${p.stock>0?`${p.stock} in stock`:"Out of stock"}</div>
    <button class="add" ${p.stock<1?"disabled":""} onclick="addCart(${p.id})">${p.stock<1?"Out of stock":"Add to Cart"}</button></div></article>`).join(""):`<div class="empty" style="grid-column:1/-1">No products found.</div>`;
}
function escapeHtml(s){return String(s).replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m]))}
async function addCart(id){
  if(!customer){openLogin();return}
  try{await api("/api/cart/"+encodeURIComponent(customer.phone),{method:"POST",body:JSON.stringify({product_id:id,quantity:1})});toast("Added to cart");loadCart()}catch(e){toast(e.message)}
}
async function loadCart(){if(!customer){cart=[];updateCartCount();return}try{cart=await api("/api/cart/"+encodeURIComponent(customer.phone));updateCartCount()}catch(e){console.error(e)}}
function updateCartCount(){$("cartCount").textContent=cart.reduce((a,x)=>a+Number(x.quantity),0)}
async function renderCart(){
  await loadCart();
  if(!customer){$("cartBox").innerHTML='<div class="empty">Please login to use your cart.<br><br><button class="checkout" onclick="openLogin()">Login</button></div>';return}
  if(!cart.length){$("cartBox").innerHTML='<div class="empty">Your cart is empty.<br><br><button class="checkout" onclick="showSection(\'home\')">Shop now</button></div>';return}
  const total=cart.reduce((a,x)=>a+x.price*x.quantity,0);
  $("cartBox").innerHTML=`<div class="cart-card">${cart.map(x=>`<div class="cart-row">
    <img class="cart-thumb" src="${imgSrc(x.image)}" onerror="this.style.display='none'" alt="">
    <div><b>${escapeHtml(x.name)}</b><div class="category">${x.category}</div><div>${money(x.price)} each</div></div>
    <div class="qty"><button onclick="changeQty(${x.product_id},${x.quantity-1})">−</button><b>${x.quantity}</b><button onclick="changeQty(${x.product_id},${x.quantity+1})">+</button></div>
    <button onclick="removeCart(${x.product_id})">🗑️</button>
  </div>`).join("")}
  <div class="total">Total: ${money(total)}</div><button class="checkout" onclick="openCheckout()">Place Order</button></div>`;
}
async function changeQty(id,q){try{await api(`/api/cart/${encodeURIComponent(customer.phone)}/${id}`,{method:"PATCH",body:JSON.stringify({quantity:q})});renderCart()}catch(e){toast(e.message)}}
async function removeCart(id){try{await api(`/api/cart/${encodeURIComponent(customer.phone)}/${id}`,{method:"DELETE"});renderCart()}catch(e){toast(e.message)}}

function renderAccount(){
 if(customer){$("accountBox").innerHTML=`<p><b>${escapeHtml(customer.name)}</b></p><p>${escapeHtml(customer.phone)}</p><p>${escapeHtml(customer.email||"")}</p><textarea id="address" placeholder="Delivery address">${escapeHtml(customer.address||"")}</textarea><br><br><button class="checkout" onclick="saveAddress()">Save Address</button> <button onclick="logout()">Logout</button>`}
 else $("accountBox").innerHTML=`<div class="form"><p>Login or create your WORTHHIT account.</p><button onclick="openLogin()">Login</button><button onclick="openSignup()">Create account</button></div>`;
}
async function saveAddress(){try{const c=await api(`/api/customers/${customer.id}/address`,{method:"PUT",body:JSON.stringify({address:$("address").value})});customer={...customer,...c};localStorage.setItem("worthhit_customer",JSON.stringify(customer));toast("Address saved")}catch(e){toast(e.message)}}
function logout(){customer=null;localStorage.removeItem("worthhit_customer");loadCart();renderAccount();updateAccountButton();toast("Logged out")}
function updateAccountButton(){$("accountBtn").textContent=customer?"👤 "+customer.name.split(" ")[0]:"👤 Account"}
function openModal(html){$("modalBody").innerHTML=html;$("modal").classList.remove("hidden")}
function closeModal(){$("modal").classList.add("hidden")}
function openLogin(){openModal(`<h2>Login</h2><form class="form" onsubmit="login(event)"><input id="lphone" placeholder="Phone" required><input id="lpass" type="password" placeholder="Password" required><button>Login</button><p>New customer? <span class="switch" onclick="openSignup()">Create account</span></p></form>`)}
function openSignup(){openModal(`<h2>Create account</h2><form class="form" onsubmit="signup(event)"><input id="sname" placeholder="Full name" required><input id="sphone" placeholder="Phone" required><input id="semail" type="email" placeholder="Email"><input id="spass" type="password" placeholder="Password" required><button>Create account</button><p>Already registered? <span class="switch" onclick="openLogin()">Login</span></p></form>`)}
async function login(e){e.preventDefault();try{customer=await api("/api/auth/login",{method:"POST",body:JSON.stringify({phone:$("lphone").value,password:$("lpass").value})});localStorage.setItem("worthhit_customer",JSON.stringify(customer));closeModal();loadCart();renderAccount();updateAccountButton();toast("Welcome back!")}catch(x){toast(x.message)}}
async function signup(e){e.preventDefault();try{customer=await api("/api/auth/signup",{method:"POST",body:JSON.stringify({name:$("sname").value,phone:$("sphone").value,email:$("semail").value,password:$("spass").value})});localStorage.setItem("worthhit_customer",JSON.stringify(customer));closeModal();loadCart();renderAccount();updateAccountButton();toast("Account created")}catch(x){toast(x.message)}}
function openCheckout(){
 if(!customer){openLogin();return}
 openModal(`<h2>Checkout</h2><form class="form" onsubmit="checkout(event)"><textarea id="caddress" placeholder="Full delivery address" required>${escapeHtml(customer.address||"")}</textarea><p class="category">Payment method: <b>Online Payment (Razorpay)</b></p><button>Continue to Payment</button></form>`)
}
async function checkout(e){e.preventDefault();const address=$("caddress").value;
 try{
   const o=await api("/api/payments/create-order",{method:"POST",body:JSON.stringify({customer:customer.name,phone:customer.phone,address})});
   customer.address=address;localStorage.setItem("worthhit_customer",JSON.stringify(customer));
   closeModal();await startRazorpay(o,address);
 }catch(x){toast(x.message)}
}
async function startRazorpay(o,address){
 if(!window.Razorpay){await loadScript("https://checkout.razorpay.com/v1/checkout.js")}
 const r=new Razorpay({key:o.key_id,amount:o.amount*100,currency:o.currency,name:"WORTHHIT",description:"WORTHHIT Order",order_id:o.razorpay_order_id,handler:async function(resp){
   try{await api("/api/payments/verify",{method:"POST",body:JSON.stringify({local_order_id:o.local_order_id,razorpay_payment_id:resp.razorpay_payment_id,razorpay_order_id:resp.razorpay_order_id,razorpay_signature:resp.razorpay_signature})});await loadCart();showSection("orders");toast("Payment successful")}catch(e){toast(e.message)}
 },prefill:{name:customer.name,contact:customer.phone,email:customer.email||""},theme:{color:"#6d28d9"}});
 r.open();
}
function loadScript(src){return new Promise((res,rej)=>{const s=document.createElement("script");s.src=src;s.onload=res;s.onerror=rej;document.head.appendChild(s)})}
async function loadOrders(){
 if(!customer){$("ordersBox").innerHTML='<div class="empty">Login to see your orders.</div>';return}
 try{const orders=await api("/api/orders/customer/"+encodeURIComponent(customer.phone));$("ordersBox").innerHTML=orders.length?orders.map(o=>`<div class="order-card"><b>Order #${o.id}</b><p>${money(o.amount)} · <b>${o.status}</b></p><p>${escapeHtml(o.address)}</p><small>${o.created_at}</small><br><br><button onclick="showTracking(${o.id})">Track Order</button></div>`).join(""):'<div class="empty">No orders yet.</div>'}catch(e){toast(e.message)}
}
async function showTracking(id){try{const t=await api(`/api/orders/${id}/tracking`);openModal(`<h2>Order #${id}</h2><p><b>${t.status}</b></p>${t.steps.map(x=>`<p>${x.done?"✅":"⭕"} ${x.name}</p>`).join("")}`)}catch(e){toast(e.message)}}

$("search").addEventListener("input",renderProducts);
updateAccountButton();
loadCategories();loadProducts();loadCart();