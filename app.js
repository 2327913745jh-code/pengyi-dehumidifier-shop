const $=(s,r=document)=>r.querySelector(s), $$=(s,r=document)=>[...r.querySelectorAll(s)];
const money=n=>`¥${Number(n).toFixed(2)}`;
const safe=s=>String(s).replace(/[<>&"']/g,c=>({'<':'&lt;','>':'&gt;','&':'&amp;','"':'&quot;',"'":'&#39;'}[c]));
const read=(key,fallback)=>{try{return JSON.parse(localStorage.getItem(key))??fallback}catch{return fallback}};
const save=(key,value)=>localStorage.setItem(key,JSON.stringify(value));

let selected={sku:3,price:19.9,compare:29.9};
let skuQty=1, orderQty=1, orderContext=null, toastTimer;
let cart=read('pengyi_cart_v2',[]), orders=read('pengyi_orders_v2',[]);

const cartDrawer=$('#cartDrawer'), drawerMask=$('#drawerMask');
const orderDialog=$('#orderDialog'), receiptDialog=$('#receiptDialog'), archiveDialog=$('#archiveDialog');
const orderForm=$('#orderForm');

function toast(message){const el=$('#toast');el.textContent=message;el.classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>el.classList.remove('show'),2200)}
function updateSelected(){
  $('#selectedSkuLabel').textContent=`500g × ${selected.sku}袋装`;
  $('#skuQty').textContent=skuQty; $('#heroPrice').textContent=money(selected.price); $('#heroCompare').textContent=money(selected.compare);
  $('#addCartPrice').textContent=money(selected.price*skuQty); $('#mobileSku').textContent=`${selected.sku}袋装`; $('#mobilePrice').textContent=money(selected.price);
}
$$('.sku-card').forEach(card=>card.addEventListener('click',()=>{
  $$('.sku-card').forEach(x=>x.classList.remove('selected'));card.classList.add('selected');
  selected={sku:+card.dataset.sku,price:+card.dataset.price,compare:+card.dataset.compare};skuQty=1;updateSelected();
}));
$('[data-sku-minus]').addEventListener('click',()=>{skuQty=Math.max(1,skuQty-1);updateSelected()});
$('[data-sku-plus]').addEventListener('click',()=>{skuQty=Math.min(9,skuQty+1);updateSelected()});
$$('[data-scroll-sku]').forEach(b=>b.addEventListener('click',()=>$('#sku').scrollIntoView({behavior:'smooth'})));

function openCart(){cartDrawer.classList.add('open');drawerMask.classList.add('open');cartDrawer.setAttribute('aria-hidden','false')}
function closeCart(){cartDrawer.classList.remove('open');drawerMask.classList.remove('open');cartDrawer.setAttribute('aria-hidden','true')}
$$('[data-open-cart]').forEach(b=>b.addEventListener('click',openCart));
$$('[data-close-cart]').forEach(b=>b.addEventListener('click',closeCart));drawerMask.addEventListener('click',closeCart);

$('#addCartBtn').addEventListener('click',()=>{
  const existing=cart.find(x=>x.sku===selected.sku);
  if(existing)existing.qty=Math.min(99,existing.qty+skuQty);else cart.push({sku:selected.sku,price:selected.price,qty:skuQty});
  save('pengyi_cart_v2',cart);renderCart();toast(`${selected.sku}袋装已加入购物车`);openCart();
});
function removeCart(sku){cart=cart.filter(x=>x.sku!==sku);save('pengyi_cart_v2',cart);renderCart()}
function renderCart(){
  const count=cart.reduce((s,x)=>s+x.qty,0),total=cart.reduce((s,x)=>s+x.price*x.qty,0);
  $('#cartCount').textContent=count;$('#mobileCartCount').textContent=count;$('#cartTotal').textContent=money(total);
  $('#emptyCart').style.display=cart.length?'none':'flex';$('#cartFooter').style.display=cart.length?'block':'none';
  const wrap=$('#cartItems');wrap.innerHTML='';
  cart.forEach(item=>{const row=document.createElement('div');row.className='cart-item';row.innerHTML=`<div class="mini-bag">朋意</div><div><b>${item.sku}袋装</b><small>500g × ${item.sku}袋 · 数量 ${item.qty}</small><button type="button">移除</button></div><strong>${money(item.price*item.qty)}</strong>`;row.querySelector('button').addEventListener('click',()=>removeCart(item.sku));wrap.appendChild(row)});
}

function contextFromSelection(){return{spec:`500g × ${selected.sku}袋装`,detail:`${selected.sku}袋装`,unitPrice:selected.price,qty:skuQty,items:[{sku:selected.sku,price:selected.price,qty:skuQty}]}}
function contextFromCart(){const detail=cart.map(x=>`${x.sku}袋装×${x.qty}`).join('；');return{spec:`购物车组合：${detail}`,detail:'多规格组合',unitPrice:cart.reduce((s,x)=>s+x.price*x.qty,0),qty:1,items:cart.map(x=>({...x}))}}
function openOrder(context=contextFromSelection()){
  orderContext=context;orderQty=context.qty||1;
  $('#orderSkuName').textContent=context.detail==='多规格组合'?'朋意除湿袋购物车组合':'朋意衣柜除湿袋';
  $('#orderSkuMeta').textContent=context.spec;updateOrder();orderDialog.showModal();
}
$$('[data-open-order]').forEach(b=>b.addEventListener('click',()=>openOrder()));
$('[data-close-order]').addEventListener('click',()=>orderDialog.close());
$('[data-order-minus]').addEventListener('click',()=>{orderQty=Math.max(1,orderQty-1);updateOrder()});
$('[data-order-plus]').addEventListener('click',()=>{orderQty=Math.min(9,orderQty+1);updateOrder()});
function updateOrder(){if(!orderContext)return;$('#orderQty').textContent=orderQty;$('#orderLinePrice').textContent=money(orderContext.unitPrice);$('#orderTotal').textContent=money(orderContext.unitPrice*orderQty)}
$('[data-cart-checkout]').addEventListener('click',()=>{if(!cart.length)return;const c=contextFromCart();closeCart();openOrder(c)});

function orderRows(order){return[['订单编号',order.id],['成交状态',order.status],['商品','朋意衣柜除湿袋'],['规格',order.spec],['数量',`${order.qty}件`],['收货人',order.name],['联系电话',order.phone],['模拟地址',order.address],['下单时间',order.time],['订单备注','课程实训模拟，不发生真实履约']]}
function showReceipt(order){
  $('#receiptData').innerHTML=orderRows(order).map(([k,v])=>`<div><dt>${safe(k)}</dt><dd>${safe(v)}</dd></div>`).join('');
  $('#receiptTotal').textContent=money(order.amount);receiptDialog.showModal();
}
orderForm.addEventListener('submit',e=>{
  e.preventDefault();if(!orderForm.reportValidity())return;
  const fd=new FormData(orderForm),now=new Date();
  const id=`PY${now.getFullYear()}${String(now.getMonth()+1).padStart(2,'0')}${String(now.getDate()).padStart(2,'0')}-${String(Math.floor(Math.random()*100000)).padStart(5,'0')}`;
  const order={id,status:'模拟付款成功',spec:orderContext.spec,qty:orderQty,amount:orderContext.unitPrice*orderQty,name:String(fd.get('name')),phone:String(fd.get('phone')).replace(/(\d{3})\d{4}(\d{4})/,'$1****$2'),address:String(fd.get('address')),time:now.toLocaleString('zh-CN',{hour12:false}),timestamp:now.toISOString()};
  orders.unshift(order);save('pengyi_orders_v2',orders);orderDialog.close();orderForm.reset();
  if(orderContext.detail==='多规格组合'){cart=[];save('pengyi_cart_v2',cart);renderCart()}
  renderArchive();showReceipt(order);toast('模拟订单已保存到订单档案');
});
$('[data-close-receipt]').addEventListener('click',()=>receiptDialog.close());
$('[data-print]').addEventListener('click',()=>window.print());
$('[data-new]').addEventListener('click',()=>{receiptDialog.close();openOrder()});

function openArchive(){renderArchive();archiveDialog.showModal()}
$$('[data-open-archive]').forEach(b=>b.addEventListener('click',openArchive));
$('[data-close-archive]').addEventListener('click',()=>archiveDialog.close());
function renderArchive(query=''){
  const q=query.trim().toLowerCase(),filtered=orders.filter(o=>`${o.id} ${o.name} ${o.spec}`.toLowerCase().includes(q));
  $('#statOrders').textContent=orders.length;$('#statRevenue').textContent=money(orders.reduce((s,o)=>s+o.amount,0));$('#statLatest').textContent=orders[0]?orders[0].time.split(' ')[0]:'暂无';
  const body=$('#archiveRows');body.innerHTML='';$('#archiveEmpty').style.display=filtered.length?'none':'block';
  filtered.forEach(order=>{const tr=document.createElement('tr');for(const value of [order.id,order.spec,order.qty,money(order.amount),order.name,order.time]){const td=document.createElement('td');td.textContent=value;tr.appendChild(td)}const action=document.createElement('td'),btn=document.createElement('button');btn.type='button';btn.textContent='查看凭证';btn.addEventListener('click',()=>{archiveDialog.close();showReceipt(order)});action.appendChild(btn);tr.appendChild(action);body.appendChild(tr)});
}
$('#orderSearch').addEventListener('input',e=>renderArchive(e.target.value));
$('#exportCsv').addEventListener('click',()=>{
  if(!orders.length){toast('暂无可导出的订单');return}
  const rows=[['订单编号','规格','数量','金额','收货人','脱敏手机号','模拟地址','成交时间','状态'],...orders.map(o=>[o.id,o.spec,o.qty,o.amount.toFixed(2),o.name,o.phone,o.address,o.time,o.status])];
  const csv='\ufeff'+rows.map(r=>r.map(v=>`"${String(v).replace(/"/g,'""')}"`).join(',')).join('\r\n');const url=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8'}));const a=document.createElement('a');a.href=url;a.download=`朋意除湿袋_模拟订单台账_${new Date().toISOString().slice(0,10)}.csv`;a.click();URL.revokeObjectURL(url);toast('订单台账已导出');
});

$('#progressRange').addEventListener('input',e=>{const v=+e.target.value;$('#progressValue').textContent=`${v}%`;$('#demoWater').style.height=`${Math.max(5,v)}%`;$('#levelLabel').textContent=v<25?'开始吸湿':v<70?'持续集水':'建议观察更换'});
$('#shareBtn').addEventListener('click',async()=>{try{if(navigator.share)await navigator.share({title:document.title,url:location.href});else{await navigator.clipboard.writeText(location.href);toast('网页链接已复制')}}catch(e){if(e.name!=='AbortError')toast('可从浏览器地址栏复制链接')}});
$$('details').forEach(d=>d.addEventListener('toggle',()=>{if(d.open)$$('details').filter(x=>x!==d).forEach(x=>x.open=false)}));
const observer=new IntersectionObserver(entries=>entries.forEach(e=>{if(e.isIntersecting){e.target.classList.add('visible');observer.unobserve(e.target)}}),{threshold:.12});
$$('.reveal').forEach(el=>{if(el.getBoundingClientRect().top<innerHeight*1.08)el.classList.add('visible');else observer.observe(el)});
updateSelected();renderCart();renderArchive();
