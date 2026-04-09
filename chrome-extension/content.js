// Content script - runs on Portal Inmobiliario listing pages
// Extracts all property data from the DOM

function extractPropertyData() {
  const data = {
    title: '', price: 0, currency: 'CLP', operation: 'arriendo',
    type: 'departamento', bedrooms: 0, bathrooms: 0, sqm: 0,
    address: '', city: '', sector: '', description: '',
    images: [], gastos_comunes: '', estacionamientos: 0,
    bodegas: 0, antiguedad: '', piso: '', orientacion: '',
    amoblado: false, ascensor: false, mascotas: false,
    sourceUrl: window.location.href,
  };

  // === TITLE ===
  data.title = document.querySelector('h1')?.textContent?.trim() || '';

  // === PRICE ===
  const priceEl = document.querySelector('.ui-pdp-price__second-line .andes-money-amount__fraction');
  if (priceEl) data.price = parseInt(priceEl.textContent.replace(/\./g, '')) || 0;
  const currSym = document.querySelector('.ui-pdp-price__second-line .andes-money-amount__currency-symbol');
  if (currSym?.textContent?.includes('UF')) data.currency = 'UF';

  // === OPERATION ===
  const crumbs = Array.from(document.querySelectorAll('.andes-breadcrumb__link')).map(e => e.textContent.toLowerCase());
  data.operation = crumbs.some(b => b.includes('arriendo')) ? 'arriendo' : 'venta';

  // === SPECS ===
  document.querySelectorAll('.andes-table__row').forEach(row => {
    const th = row.querySelector('.andes-table__header__container');
    const td = row.querySelector('.andes-table__column--value');
    if (!th || !td) return;
    const key = th.textContent.trim();
    const val = td.textContent.trim();

    switch (key) {
      case 'Dormitorios': data.bedrooms = parseInt(val) || 0; break;
      case 'Baños': data.bathrooms = parseInt(val) || 0; break;
      case 'Superficie útil': data.sqm = parseFloat(val) || 0; break;
      case 'Superficie total': if (!data.sqm) data.sqm = parseFloat(val) || 0; break;
      case 'Estacionamientos': data.estacionamientos = parseInt(val) || 0; break;
      case 'Bodegas': data.bodegas = parseInt(val) || 0; break;
      case 'Antigüedad': data.antiguedad = val; break;
      case 'Orientación': data.orientacion = val; break;
      case 'Gastos comunes': data.gastos_comunes = val; break;
      case 'Amoblado': data.amoblado = val === 'Sí'; break;
      case 'Ascensor': data.ascensor = val === 'Sí'; break;
      case 'Admite mascotas': data.mascotas = val === 'Sí'; break;
      case 'Tipo de departamento':
      case 'Tipo de propiedad':
      case 'Tipo de casa':
        const l = val.toLowerCase();
        if (l.includes('casa')) data.type = 'casa';
        else if (l.includes('oficina')) data.type = 'oficina';
        else if (l.includes('local')) data.type = 'local';
        else if (l.includes('terreno')) data.type = 'terreno';
        break;
      default:
        if (key.includes('piso de la unidad')) data.piso = val;
    }
  });

  // === LOCATION ===
  const locSubtitle = document.querySelector('.ui-vip-location__subtitle')?.textContent?.trim() || '';
  if (locSubtitle) {
    const parts = locSubtitle.split(',').map(p => p.trim());
    data.address = parts[0] || '';
    // Find comuna
    const comunas = ['Ñuñoa','Providencia','Las Condes','Santiago','Vitacura','La Florida','Maipú','Puente Alto','San Miguel','Macul','La Reina','Peñalolén','Lo Barnechea','Huechuraba','Quilicura','San Bernardo','Independencia','Recoleta','Estación Central'];
    for (const part of parts) {
      if (comunas.some(c => part.includes(c))) { data.city = part; break; }
    }
    // Sector from breadcrumbs
    const lastCrumb = document.querySelector('.andes-breadcrumb__link:last-child')?.textContent?.trim();
    if (lastCrumb && !comunas.includes(lastCrumb)) data.sector = lastCrumb;
  }

  // === DESCRIPTION ===
  data.description = document.querySelector('.ui-pdp-description__content')?.textContent?.trim()?.substring(0, 2000) || '';

  // === IMAGES (comprehensive) ===
  const imgSet = new Set();
  // Gallery images
  document.querySelectorAll('.ui-pdp-gallery__figure img').forEach(img => {
    const src = img.src || img.dataset?.src || img.dataset?.zoom || '';
    if (src.includes('D_NQ_NP')) imgSet.add(src.replace(/-[A-Z]\.(jpg|webp|png)/gi, '-F.$1').split('?')[0]);
  });
  // All mlstatic images
  document.querySelectorAll('img').forEach(img => {
    if (img.src?.includes('D_NQ_NP') && img.src?.includes('mlstatic')) {
      imgSet.add(img.src.replace(/-[A-Z]\.(jpg|webp|png)/gi, '-F.$1').split('?')[0]);
    }
  });
  // Source srcsets
  document.querySelectorAll('source[srcset*="mlstatic"]').forEach(s => {
    s.srcset.split(',').forEach(part => {
      const url = part.trim().split(' ')[0];
      if (url.includes('D_NQ_NP')) imgSet.add(url.replace(/-[A-Z]\.(jpg|webp|png)/gi, '-F.$1').split('?')[0]);
    });
  });
  data.images = Array.from(imgSet).slice(0, 20);

  // Fallback: og:image
  if (!data.images.length) {
    const ogImg = document.querySelector('meta[property="og:image"]')?.content;
    if (ogImg) data.images.push(ogImg);
  }

  return data;
}

// Listen for messages from popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'extract') {
    const data = extractPropertyData();
    sendResponse(data);
  }
  return true;
});

// Also inject a floating button on the page
const btn = document.createElement('div');
btn.innerHTML = `
  <div id="altaprop-import-btn" style="position:fixed;bottom:20px;right:20px;z-index:99999;background:#1B2A4A;color:white;padding:12px 20px;border-radius:12px;cursor:pointer;font-family:Arial;font-size:14px;font-weight:bold;box-shadow:0 4px 15px rgba(0,0,0,0.3);display:flex;align-items:center;gap:8px;transition:transform 0.2s">
    <span style="background:#C4A962;color:#1B2A4A;width:24px;height:24px;border-radius:6px;display:flex;align-items:center;justify-content:center;font-weight:bold;font-size:12px">A</span>
    Importar a Altaprop
  </div>
`;
document.body.appendChild(btn);

document.getElementById('altaprop-import-btn').addEventListener('click', async () => {
  const button = document.getElementById('altaprop-import-btn');
  button.innerHTML = '<span style="background:#C4A962;color:#1B2A4A;width:24px;height:24px;border-radius:6px;display:flex;align-items:center;justify-content:center;font-weight:bold;font-size:12px">A</span> Extrayendo...';

  const data = extractPropertyData();

  button.innerHTML = '<span style="background:#C4A962;color:#1B2A4A;width:24px;height:24px;border-radius:6px;display:flex;align-items:center;justify-content:center;font-weight:bold;font-size:12px">A</span> Publicando...';

  try {
    // Send via background script (bypasses page CSP)
    const importResult = await new Promise((resolve) => {
      chrome.runtime.sendMessage({ action: 'importProperty', data }, resolve);
    });

    if (importResult.success || importResult.propertyId) {
      button.style.background = '#16a34a';
      button.innerHTML = '<span style="background:white;color:#16a34a;width:24px;height:24px;border-radius:6px;display:flex;align-items:center;justify-content:center;font-weight:bold;font-size:14px">✓</span> ¡Publicada en Altaprop!';
      setTimeout(() => {
        window.open('https://www.loginaltaprop.cl/dashboard/propiedades', '_blank');
      }, 1500);
    } else {
      // Fallback: open Altaprop with data in URL
      const params = new URLSearchParams({ data: JSON.stringify(data) });
      window.open('https://www.loginaltaprop.cl/dashboard/propiedades?import=' + encodeURIComponent(JSON.stringify(data)), '_blank');
    }
  } catch (err) {
    button.style.background = '#dc2626';
    button.innerHTML = '<span style="background:white;color:#dc2626;width:24px;height:24px;border-radius:6px;display:flex;align-items:center;justify-content:center;font-weight:bold;font-size:14px">✗</span> Error - Click para reintentar';
  }
});

document.getElementById('altaprop-import-btn').addEventListener('mouseover', function() {
  this.style.transform = 'scale(1.05)';
});
document.getElementById('altaprop-import-btn').addEventListener('mouseout', function() {
  this.style.transform = 'scale(1)';
});
