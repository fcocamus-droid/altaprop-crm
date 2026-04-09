// BOOKMARKLET - Minified version to paste in a bookmark URL
// Drag this to your bookmarks bar or create a bookmark with this as the URL:
// javascript:(function(){...})()

// Full version (readable):
javascript:(function(){
  if(!location.hostname.includes('portalinmobiliario.com')){
    alert('Abre una propiedad en Portal Inmobiliario primero');
    return;
  }

  const d={title:'',price:0,currency:'CLP',operation:'arriendo',type:'departamento',bedrooms:0,bathrooms:0,sqm:0,address:'',city:'',sector:'',description:'',images:[],gastos_comunes:'',estacionamientos:0,bodegas:0,antiguedad:'',piso:'',orientacion:'',amoblado:false,ascensor:false,mascotas:false};

  d.title=document.querySelector('h1')?.textContent?.trim()||'';

  const p=document.querySelector('.ui-pdp-price__second-line .andes-money-amount__fraction');
  if(p)d.price=parseInt(p.textContent.replace(/\./g,''))||0;
  const c=document.querySelector('.ui-pdp-price__second-line .andes-money-amount__currency-symbol');
  if(c?.textContent?.includes('UF'))d.currency='UF';

  const cr=Array.from(document.querySelectorAll('.andes-breadcrumb__link')).map(e=>e.textContent.toLowerCase());
  d.operation=cr.some(b=>b.includes('arriendo'))?'arriendo':'venta';

  document.querySelectorAll('.andes-table__row').forEach(r=>{
    const th=r.querySelector('.andes-table__header__container');
    const td=r.querySelector('.andes-table__column--value');
    if(!th||!td)return;
    const k=th.textContent.trim(),v=td.textContent.trim();
    if(k==='Dormitorios')d.bedrooms=parseInt(v)||0;
    else if(k==='Baños')d.bathrooms=parseInt(v)||0;
    else if(k==='Superficie útil')d.sqm=parseFloat(v)||0;
    else if(k==='Superficie total'&&!d.sqm)d.sqm=parseFloat(v)||0;
    else if(k==='Estacionamientos')d.estacionamientos=parseInt(v)||0;
    else if(k==='Bodegas')d.bodegas=parseInt(v)||0;
    else if(k==='Antigüedad')d.antiguedad=v;
    else if(k==='Orientación')d.orientacion=v;
    else if(k==='Gastos comunes')d.gastos_comunes=v;
    else if(k==='Amoblado')d.amoblado=v==='Sí';
    else if(k==='Admite mascotas')d.mascotas=v==='Sí';
    else if(k.includes('Tipo de')){const l=v.toLowerCase();if(l.includes('casa'))d.type='casa';else if(l.includes('oficina'))d.type='oficina';}
    else if(k.includes('piso de la unidad'))d.piso=v;
  });

  const loc=document.querySelector('.ui-vip-location__subtitle')?.textContent?.trim()||'';
  if(loc){const ps=loc.split(',').map(p=>p.trim());d.address=ps[0]||'';
    const comunas=['Ñuñoa','Providencia','Las Condes','Santiago','Vitacura','La Florida','Maipú','Puente Alto','San Miguel','Macul','La Reina','Peñalolén'];
    for(const pt of ps){if(comunas.some(c=>pt.includes(c))){d.city=pt;break;}}
  }

  d.description=document.querySelector('.ui-pdp-description__content')?.textContent?.trim()?.substring(0,2000)||'';

  const imgs=new Set();
  document.querySelectorAll('img').forEach(i=>{if(i.src?.includes('D_NQ_NP')&&i.src?.includes('mlstatic'))imgs.add(i.src.replace(/-[A-Z]\.(jpg|webp|png)/gi,'-F.$1').split('?')[0]);});
  document.querySelectorAll('source[srcset*="mlstatic"]').forEach(s=>{s.srcset.split(',').forEach(p=>{const u=p.trim().split(' ')[0];if(u.includes('D_NQ_NP'))imgs.add(u.replace(/-[A-Z]\.(jpg|webp|png)/gi,'-F.$1').split('?')[0]);});});
  d.images=Array.from(imgs).slice(0,20);

  // Show confirmation
  const msg=`¿Importar a Altaprop?\n\n${d.title}\n$${d.price.toLocaleString()} ${d.currency}\n${d.bedrooms}D ${d.bathrooms}B ${d.sqm}m²\n${d.city}\n${d.images.length} fotos`;
  if(!confirm(msg))return;

  // Send to Altaprop
  fetch('https://www.loginaltaprop.cl/api/import-property',{
    method:'POST',
    headers:{'Content-Type':'application/json'},
    body:JSON.stringify(d)
  }).then(r=>r.json()).then(r=>{
    if(r.success){
      alert('✅ Propiedad publicada en Altaprop!');
      window.open('https://www.loginaltaprop.cl/dashboard/propiedades','_blank');
    }else{
      alert('Error: '+(r.error||'Desconocido'));
    }
  }).catch(e=>alert('Error de conexión: '+e.message));
})();
