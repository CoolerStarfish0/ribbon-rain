import { firebaseReady, db, auth, googleProvider, storage } from "./firebase-client.js";
import { onAuthStateChanged, signInWithPopup, getIdTokenResult } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js";
import { addDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";
import { ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-storage.js";
import { collection, getDocs, query, where, orderBy } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";
const sampleProducts = [
{id:"sample-labels",name:"Little School Labels",category:"labels",price:249,description:"A happy set of labels for notebooks, bottles and school-day essentials.",colours:["Rose pink","Lavender","Mint"],symbol:"✿",artTitle:"little<br>things",badge:"BEST LOVED",published:true},
{id:"sample-name",name:"Name Day Stickers",category:"stickers",price:179,description:"Personalise your everyday things with these cheerful name stickers.",colours:["Rose pink","Sky blue","Butter yellow"],symbol:"♡",artTitle:"that's<br>mine!",badge:"A LITTLE FAVOURITE",published:true},
{id:"sample-flower",name:"Daisy Days",category:"stickers",price:149,description:"A tiny bunch of happy daisies for your favourite things.",colours:["Lavender","Butter yellow","Mint"],symbol:"✿",artTitle:"daisy<br>days",badge:"",published:true},
{id:"sample-bundle",name:"The Happy School Bundle",category:"bundles",price:399,description:"A sweet little bundle to get school things ready for the year.",colours:["Rose pink","Lavender"],symbol:"✳",artTitle:"school<br>but cute",badge:"BUNDLE & SAVE",published:true}];
const state={products:sampleProducts,category:"all",search:"",cart:readCart(),selected:null};
const $=s=>document.querySelector(s), grid=$("#product-grid"),count=$("#cart-count"),drawerCount=$("#drawer-count"),cartItems=$("#cart-items"),subtotal=$("#cart-subtotal"),overlay=$("#overlay"),drawer=$("#cart-drawer");
$("#year").textContent=new Date().getFullYear();
function readCart(){try{return JSON.parse(localStorage.getItem("ribbonRainCart")||"[]")}catch{return[]}}
function saveCart(){localStorage.setItem("ribbonRainCart",JSON.stringify(state.cart));renderCart()}
function escapeHTML(v=""){return String(v).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]))}
function money(n){return new Intl.NumberFormat("en-IN",{style:"currency",currency:"INR",maximumFractionDigits:0}).format(Number(n)||0)}
function art(p){if(p.imageUrl)return '<img src="'+escapeHTML(p.imageUrl)+'" alt="'+escapeHTML(p.name)+'" style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover">';return '<div class="product-illustration"><span class="illustration-small">A LITTLE SOMETHING</span><span class="illustration-big">'+escapeHTML(p.symbol||"✿")+'</span><span class="illustration-title">'+String(p.artTitle||escapeHTML(p.name)).replace(/<br\s*\/?>/gi,"<br>")+'</span><span class="illustration-small">MADE WITH LOVE</span></div>'}
function renderProducts(){const list=state.products.filter(p=>p.published!==false&&(state.category==="all"||p.category===state.category)&&((p.name||"")+" "+(p.description||"")).toLowerCase().includes(state.search.toLowerCase()));if(!list.length){grid.innerHTML='<div class="empty-results">Nothing here just yet. Try another search. ♡</div>';return}grid.innerHTML=list.map(p=>'<article class="product-card" data-product="'+escapeHTML(p.id)+'"><div class="product-image">'+(p.badge?'<span class="product-badge">'+escapeHTML(p.badge)+'</span>':"")+art(p)+'<button class="quick-add" data-quick="'+escapeHTML(p.id)+'" type="button">Choose your colours +</button></div><div class="product-info"><div class="product-category">'+escapeHTML((p.category||"little things").replace(/s$/,""))+'</div><h3 class="product-name">'+escapeHTML(p.name)+'</h3><div class="product-bottom"><span class="product-price">'+money(p.price)+'</span><span class="product-colours">'+(p.colours||[]).slice(0,5).map((c,i)=>'<i class="colour-dot" title="'+escapeHTML(c)+'" style="background:'+({"Rose pink":"#e9b7c5","Lavender":"#c9bce8","Mint":"#b9d4c2","Sky blue":"#b7d7e9","Butter yellow":"#f0d994"}[c]||["#e9b7c5","#c9bce8","#b9d4c2","#f0d994","#b7d7e9"][i%5])+'"></i>').join("")+'</span></div></div></article>').join("")}
function findProduct(id){return state.products.find(p=>p.id===id)}
function openProduct(id){const p=findProduct(id);if(!p)return;state.selected=p;const options=(p.colours||[]),photos=Array.isArray(p.imageUrls)&&p.imageUrls.length?p.imageUrls:(p.imageUrl?[p.imageUrl]:[]);$("#product-detail").innerHTML='<div class="product-detail-layout"><div><div class="detail-art" id="detail-main-art">'+art(p)+'</div>'+(photos.length>1?'<div class="detail-gallery">'+photos.map((url,i)=>'<button type="button" data-gallery-index="'+i+'" aria-label="View product photo '+(i+1)+'" class="'+(i===0?"active":"")+'"><img src="'+escapeHTML(url)+'" alt=""></button>').join("")+'</div>':"")+'</div><div class="detail-copy"><p class="eyebrow">'+escapeHTML((p.category||"little things").toUpperCase())+'</p><h2>'+escapeHTML(p.name)+'</h2><div class="detail-price">'+money(p.price)+'</div><p>'+escapeHTML(p.description||"A little something made with love.")+'</p><label for="detail-colour">Choose an available colour</label><select id="detail-colour">'+options.map(c=>'<option value="'+escapeHTML(c)+'">'+escapeHTML(c)+'</option>').join("")+'</select><label for="detail-quantity">Quantity</label><input id="detail-quantity" type="number" min="1" max="50" value="1"><p>Artwork stays as shown; only the listed colour options can be changed.</p><button class="button button-dark" id="add-detail" type="button">Add to bag · '+money(p.price)+' <span>→</span></button></div></div>';$("#add-detail").addEventListener("click",()=>{const colour=$("#detail-colour").value;const quantity=Math.max(1,Math.min(50,Number($("#detail-quantity").value)||1));addToCart(p,colour,quantity);$("#product-dialog").close()});$("#product-dialog").showModal()}
$("#product-detail").addEventListener("click",e=>{const b=e.target.closest("[data-gallery-index]");if(!b||!state.selected)return;const photos=state.selected.imageUrls||[state.selected.imageUrl];const url=photos[Number(b.dataset.galleryIndex)];if(!url)return;$("#detail-main-art").innerHTML='<img src="'+escapeHTML(url)+'" alt="'+escapeHTML(state.selected.name)+'" style="width:100%;height:100%;object-fit:contain">';document.querySelectorAll(".detail-gallery button").forEach(x=>x.classList.toggle("active",x===b))});
function addToCart(p,colour,quantity=1){if(!p||!colour){openProduct(p?.id);return}const key=p.id+"::"+colour;const existing=state.cart.find(x=>x.key===key);if(existing)existing.quantity=Math.min(50,existing.quantity+quantity);else state.cart.push({key,id:p.id,name:p.name,price:Number(p.price)||0,colour,quantity,imageUrl:p.imageUrl||"",symbol:p.symbol||"♡"});saveCart();openCart()}
function renderCart(){state.cart=state.cart.filter(x=>x.quantity>0);const qty=state.cart.reduce((n,x)=>n+x.quantity,0);count.textContent=qty;drawerCount.textContent="("+qty+")";subtotal.textContent=money(state.cart.reduce((n,x)=>n+x.price*x.quantity,0));if(!state.cart.length){cartItems.innerHTML='<p class="empty-cart">Your bag is waiting for something lovely. ♡</p>';return}cartItems.innerHTML=state.cart.map(x=>'<div class="cart-item"><div class="cart-thumb">'+(x.imageUrl?'<img src="'+escapeHTML(x.imageUrl)+'" alt="" style="width:100%;height:100%;object-fit:cover">':escapeHTML(x.symbol))+'</div><div><h3>'+escapeHTML(x.name)+'</h3><p>Colour: '+escapeHTML(x.colour)+'</p><div class="quantity-control"><button data-qty="'+escapeHTML(x.key)+'" data-delta="-1" aria-label="Decrease quantity">−</button><span>'+x.quantity+'</span><button data-qty="'+escapeHTML(x.key)+'" data-delta="1" aria-label="Increase quantity">+</button></div><button class="remove-item" data-remove="'+escapeHTML(x.key)+'">Remove</button></div><div class="cart-item-price">'+money(x.price*x.quantity)+'</div></div>').join("")}
function openCart(){overlay.hidden=false;requestAnimationFrame(()=>drawer.classList.add("open"));drawer.setAttribute("aria-hidden","false");document.body.style.overflow="hidden"}
function closeCart(){drawer.classList.remove("open");drawer.setAttribute("aria-hidden","true");overlay.hidden=true;document.body.style.overflow=""}
$("#open-cart").addEventListener("click",openCart);$("#close-cart").addEventListener("click",closeCart);overlay.addEventListener("click",closeCart);
grid.addEventListener("click",e=>{const quick=e.target.closest("[data-quick]");if(quick){e.stopPropagation();openProduct(quick.dataset.quick);return}const card=e.target.closest("[data-product]");if(card)openProduct(card.dataset.product)});
$("#close-product").addEventListener("click",()=>$("#product-dialog").close());$("#close-checkout").addEventListener("click",()=>$("#checkout-dialog").close());
$("#category-tabs").addEventListener("click",e=>{const b=e.target.closest("[data-category]");if(!b)return;state.category=b.dataset.category;document.querySelectorAll(".category-tab").forEach(x=>x.classList.toggle("active",x===b));renderProducts()});
$("#product-search").addEventListener("input",e=>{state.search=e.target.value.trim();renderProducts()});
$(".search-toggle").addEventListener("click",()=>{$("#product-search").focus();$("#shop").scrollIntoView({behavior:"smooth"})});
cartItems.addEventListener("click",e=>{const q=e.target.closest("[data-qty]"),rem=e.target.closest("[data-remove]");if(q){const item=state.cart.find(x=>x.key===q.dataset.qty);if(item)item.quantity=Math.max(0,Math.min(50,item.quantity+Number(q.dataset.delta)));saveCart()}if(rem){state.cart=state.cart.filter(x=>x.key!==rem.dataset.remove);saveCart()}});
$("#checkout-button").addEventListener("click",()=>{if(!state.cart.length)return;closeCart();$("#checkout-dialog").showModal()});
function loadRazorpay(){return new Promise((resolve,reject)=>{if(window.Razorpay){resolve();return}const s=document.createElement("script");s.src="https://checkout.razorpay.com/v1/checkout.js";s.onload=resolve;s.onerror=()=>reject(new Error("Could not load the secure payment window. Please try again."));document.head.appendChild(s)})}
$("#checkout-form").addEventListener("submit",async e=>{e.preventDefault();const form=e.currentTarget,msg=$("#checkout-message"),button=form.querySelector('button[type="submit"]');button.disabled=true;msg.textContent="Preparing your delivery quote and secure checkout…";try{const values=Object.fromEntries(new FormData(form).entries());const address={name:values.name,email:values.email,phone:values.phone,address:values.address,city:values.city,pincode:values.pincode,state:values.state};const response=await fetch("/api/create-order",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({address,items:state.cart.map(x=>({productId:x.id,colour:x.colour,quantity:x.quantity}))})});const order=await response.json();if(!response.ok)throw new Error(order.error||"Checkout is not available yet.");await loadRazorpay();msg.textContent="Shipping: "+money(order.shippingInr)+" · Total: "+money(order.totalInr)+". Complete payment in the secure window.";const payment=new window.Razorpay({key:order.keyId,amount:order.amount,currency:order.currency,name:"Ribbon Rain",description:"Made with love, wrapped in ribbons.",order_id:order.razorpayOrderId,prefill:order.customer,theme:{color:"#c98ba0"},modal:{ondismiss:()=>{msg.textContent="Payment window closed. Your order has not been confirmed as paid."}},handler:async result=>{msg.textContent="Verifying your payment securely…";try{const verify=await fetch("/api/verify-payment",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({...result,internalOrderId:order.internalOrderId})});const checked=await verify.json();if(!verify.ok||!checked.ok)throw new Error(checked.error||"Payment verification is still pending.");state.cart=[];saveCart();form.reset();msg.textContent="Payment confirmed — thank you! Your order reference is "+checked.orderId+". Please keep this reference for your records."}catch(error){msg.textContent=error.message+" If money was deducted, keep your Razorpay payment reference and contact the shop."}}});payment.open()}catch(error){msg.textContent=error.message+" No payment has been taken by this page."}finally{button.disabled=false}});
async function loadProducts(){if(!firebaseReady||!db){$("#demo-note").hidden=false;renderProducts();return}try{const q=query(collection(db,"products"),where("published","==",true),orderBy("name"));const snap=await getDocs(q);const remote=snap.docs.map(d=>({id:d.id,...d.data()}));if(remote.length){state.products=remote;$("#demo-note").hidden=true}else{state.products=[];$("#demo-note").textContent="No published products yet. Add products in the admin dashboard.";$("#demo-note").hidden=false}renderProducts()}catch(err){console.error("Could not load Firebase products:",err);state.products=[];$("#demo-note").textContent="Could not load the live catalogue. Check Firebase configuration and Firestore rules.";$("#demo-note").hidden=false;renderProducts()}}
renderCart();loadProducts();

// Axon shopping helper: product discovery, navigation, cart help, and claim-gated listing creation.
const axonLauncher = document.querySelector("#axon-launcher");
const axonPanel = document.querySelector("#axon-panel");
const axonMessages = document.querySelector("#axon-messages");
const axonForm = document.querySelector("#axon-form");
const axonInput = document.querySelector("#axon-input");
const axonClose = document.querySelector("#axon-close");
let axonIsAdmin = false;
let axonUser = null;

if (auth) {
  onAuthStateChanged(auth, async user => {
    axonUser = user;
    axonIsAdmin = false;
    if (!user) return;
    try {
      const token = await getIdTokenResult(user, true);
      axonIsAdmin = token.claims.admin === true;
    } catch (error) {
      console.warn("Axon could not verify admin status.", error);
    }
  });
}

function axonSay(text, type = "bot") {
  const message = document.createElement("div");
  message.className = "axon-message " + (type === "user" ? "axon-user" : "axon-bot");
  message.textContent = text;
  axonMessages.appendChild(message);
  axonMessages.scrollTop = axonMessages.scrollHeight;
  return message;
}
function axonOpen() {
  axonPanel.hidden = false;
  axonLauncher.setAttribute("aria-expanded", "true");
  axonInput.focus();
}
function axonHide() {
  axonPanel.hidden = true;
  axonLauncher.setAttribute("aria-expanded", "false");
}
axonLauncher?.addEventListener("click", () => axonPanel.hidden ? axonOpen() : axonHide());
axonClose?.addEventListener("click", axonHide);

function axonProductMatches(term) {
  const words = term.toLowerCase().split(/[^a-z0-9]+/).filter(w => w.length > 2 && !["show","find","some","with","for","the","please","want","need","products","product","cheapest","available"].includes(w));
  const active = state.products.filter(p => p.published !== false);
  let results = active.filter(p => words.some(w => ((p.name || "") + " " + (p.description || "") + " " + (p.category || "")).toLowerCase().includes(w)));
  if (!results.length && /cheap|lowest|least expensive/.test(term.toLowerCase())) results = active.slice().sort((a,b) => Number(a.price)-Number(b.price)).slice(0,3);
  if (!results.length && /sticker/.test(term.toLowerCase())) results = active.filter(p => p.category === "stickers");
  if (!results.length && /label/.test(term.toLowerCase())) results = active.filter(p => p.category === "labels");
  return results.slice(0,4);
}
function axonShowProductResults(products) {
  if (!products.length) {
    axonSay("I couldn't find a matching published product in the catalogue. Try another search or browse the shop below. ♡");
    return;
  }
  const intro = document.createElement("div");
  intro.className = "axon-message axon-bot";
  intro.textContent = "Here are matching items from the current catalogue:";
  axonMessages.appendChild(intro);
  const list = document.createElement("div");
  list.className = "axon-product-results";
  for (const product of products) {
    const card = document.createElement("article");
    card.className = "axon-product-result";
    const title = document.createElement("strong");
    title.textContent = product.name;
    const price = document.createElement("span");
    price.textContent = money(product.price);
    const choose = document.createElement("button");
    choose.type = "button";
    choose.textContent = "Choose colours";
    choose.addEventListener("click", () => { axonHide(); openProduct(product.id); });
    card.append(title, price, choose);
    list.appendChild(card);
  }
  axonMessages.appendChild(list);
  axonMessages.scrollTop = axonMessages.scrollHeight;
}
function axonShowListingForm() {
  if (!auth || !db || !storage) {
    axonSay("Listing tools aren't connected yet. Please use the admin dashboard once Firebase services are configured.");
    return;
  }
  if (!axonUser) {
    axonSay("Listing creation is only for your mum's authorised admin account. Sign in with Google to check your permissions.");
    const signIn = document.createElement("button");
    signIn.type = "button";
    signIn.className = "axon-action-button";
    signIn.textContent = "Sign in with Google";
    signIn.addEventListener("click", async () => {
      try {
        await signInWithPopup(auth, googleProvider);
        axonSay("Signed in. I'm checking the account's admin permission now. If this is the authorised shop-owner account, ask me to create a listing again.");
      } catch (error) {
        axonSay("Sign-in didn't complete. Please try again or use the admin page.");
      }
    });
    axonMessages.appendChild(signIn);
    return;
  }
  if (!axonIsAdmin) {
    axonSay("I can't create listings from this account. Only the shop's authorised admin account can do that. ♡");
    return;
  }
  const wrap = document.createElement("form");
  wrap.className = "axon-listing-form";
  wrap.innerHTML = '<strong>New product listing</strong><label>Product name<input name="name" required maxlength="100"></label><label>Category<select name="category"><option value="stickers">Stickers</option><option value="labels">School labels</option><option value="bundles">Bundles</option></select></label><label>Price (₹)<input name="price" type="number" min="1" max="100000" step="1" required></label><label>Description<textarea name="description" maxlength="500" required rows="2"></textarea></label><label>Allowed colours (comma-separated)<input name="colours" placeholder="Rose pink, Lavender" required></label><label>Product photo (JPG, PNG or WebP; max 5 MB)<input name="image" type="file" accept="image/jpeg,image/png,image/webp" required></label><label class="axon-publish-check"><input name="published" type="checkbox" checked> Publish after confirmation</label><button type="submit">Review listing</button><p class="axon-listing-status" role="status"></p>';
  wrap.addEventListener("submit", async event => {
    event.preventDefault();
    const form = event.currentTarget;
    const submit = form.querySelector('button[type="submit"]');
    const status = form.querySelector(".axon-listing-status");
    if (!auth.currentUser || !db || !storage) { status.textContent = "Please sign in again."; return; }
    submit.disabled = true;
    try {
      const values = Object.fromEntries(new FormData(form).entries());
      const name = String(values.name || "").trim();
      const price = Number(values.price);
      const description = String(values.description || "").trim();
      const colours = String(values.colours || "").split(",").map(c => c.trim()).filter(Boolean);
      const file = form.elements.image.files[0];
      if (!name || !description || !Number.isSafeInteger(price) || price < 1 || !colours.length) throw new Error("Fill in the name, description, valid price, and at least one colour.");
      if (new Set(colours.map(c => c.toLowerCase())).size !== colours.length) throw new Error("Please remove duplicate colour options.");
      if (!file || file.size > 5 * 1024 * 1024 || !["image/jpeg","image/png","image/webp"].includes(file.type)) throw new Error("Choose a JPG, PNG or WebP photo smaller than 5 MB.");
      const publish = Boolean(values.published);
      const summary = name + " — " + money(price) + "; colours: " + colours.join(", ") + ". " + (publish ? "Publish now" : "Save as draft") + "?";
      if (!window.confirm("Please review this listing before saving:\n\n" + summary)) { status.textContent = "Nothing was saved."; return; }
      const token = await getIdTokenResult(auth.currentUser, true);
      if (token.claims.admin !== true) throw new Error("Admin permission was not verified. No listing was saved.");
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "-");
      const path = "product-images/" + auth.currentUser.uid + "/" + Date.now() + "-" + safeName;
      const imageRef = ref(storage, path);
      await uploadBytes(imageRef, file, { contentType: file.type });
      const imageUrl = await getDownloadURL(imageRef);
      await addDoc(collection(db, "products"), {
        name, price, category: String(values.category), description, colours,
        imageUrl, imageUrls: [imageUrl], symbol: "♡", badge: "",
        published: publish, createdAt: serverTimestamp(), updatedAt: serverTimestamp()
      });
      status.textContent = publish ? "Listing published successfully. ♡" : "Draft saved successfully. ♡";
      form.reset();
      if (typeof loadProducts === "function") await loadProducts();
      axonSay("Your listing was saved. You can find it in the catalogue/admin dashboard. ♡");
    } catch (error) {
      status.textContent = error.message || "The listing could not be saved.";
    } finally {
      submit.disabled = false;
    }
  });
  axonMessages.appendChild(wrap);
  axonMessages.scrollTop = axonMessages.scrollHeight;
}
function axonRespond(raw) {
  const text = raw.trim();
  const lower = text.toLowerCase();
  if (/\b(create|add|make|new)\b.*\b(listing|product|item)\b|\b(listing|product)\b.*\b(create|add|make)\b/.test(lower)) {
    if (axonIsAdmin) axonSay("Of course! Let's prepare the listing. I'll ask you to review it before saving.");
    axonShowListingForm();
    return;
  }
  if (/\b(cart|bag|basket)\b/.test(lower) || /\b(checkout|buy now)\b/.test(lower)) {
    if (/checkout|buy now/.test(lower)) {
      axonSay(state.cart.length ? "I'll open your bag so you can review the items and continue to checkout. Please check everything before placing an order." : "Your bag is empty right now. Let's find something lovely first.");
    } else axonSay("Opening your shopping bag. ♡");
    if (state.cart.length || !/checkout|buy now/.test(lower)) openCart();
    else { document.querySelector("#shop").scrollIntoView({behavior:"smooth"}); }
    return;
  }
  if (/\b(home|homepage|top)\b/.test(lower)) {
    window.scrollTo({top:0,behavior:"smooth"}); axonSay("Taking you back to the top of Ribbon Rain. ♡"); return;
  }
  if (/\b(faq|question|shipping|deliver|delivery)\b/.test(lower)) {
    document.querySelector("#faq").scrollIntoView({behavior:"smooth"}); axonSay("Here are the shop FAQs. Shipping prices and live delivery quotes still need to be configured at checkout."); return;
  }
  if (/\b(story|about|who are you|our story)\b/.test(lower)) {
    document.querySelector("#story").scrollIntoView({behavior:"smooth"}); axonSay("Here's the little story behind Ribbon Rain. ♡"); return;
  }
  if (/\b(shop|browse|catalogue|catalog|products|stickers|labels|bundle|bundles|cheap|price|find|looking for|need|want)\b/.test(lower)) {
    const products = axonProductMatches(text);
    axonShowProductResults(products);
    document.querySelector("#shop").scrollIntoView({behavior:"smooth"});
    return;
  }
  if (/\b(colou?r|custom|personal|design)\b/.test(lower)) {
    axonSay("Each design stays as shown, but you can choose from the colours offered for that product. Tap “Choose colours” on a product to see its available options. ♡");
    return;
  }
  axonSay("I can help you find stickers, school labels, or bundles; open your bag; navigate to the FAQs or story; and help the authorised shop owner prepare listings. Try “show me stickers” or “open my bag”. ♡");
}
axonForm?.addEventListener("submit", event => {
  event.preventDefault();
  const text = axonInput.value.trim();
  if (!text) return;
  axonSay(text, "user");
  axonInput.value = "";
  axonRespond(text);
});
document.querySelectorAll("[data-axon-prompt]").forEach(button => button.addEventListener("click", () => {
  const prompt = button.dataset.axonPrompt;
  axonSay(prompt, "user");
  axonRespond(prompt);
}));
