const ALTAPROP_URL = 'https://www.loginaltaprop.cl';
let extractedData = null;

document.addEventListener('DOMContentLoaded', async () => {
  const statusEl = document.getElementById('status');
  const previewEl = document.getElementById('preview');
  const actionsEl = document.getElementById('actions');

  try {
    // Get current tab
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

    if (!tab.url?.includes('portalinmobiliario.com') && !tab.url?.includes('mercadolibre')) {
      statusEl.textContent = 'Navega a una propiedad en Portal Inmobiliario para importarla.';
      statusEl.className = 'status';
      return;
    }

    statusEl.textContent = 'Extrayendo datos de la propiedad...';

    // Send message to content script to extract data
    const response = await chrome.tabs.sendMessage(tab.id, { action: 'extract' });

    if (!response || !response.title) {
      statusEl.textContent = 'No se pudo extraer datos. Asegúrate de estar en una publicación de Portal Inmobiliario.';
      statusEl.className = 'status error';
      return;
    }

    extractedData = response;

    // Show preview
    statusEl.style.display = 'none';
    previewEl.style.display = 'block';
    actionsEl.style.display = 'block';

    previewEl.innerHTML = `
      <div class="preview">
        <h3>${response.title}</h3>
        <p class="price">$${response.price?.toLocaleString('es-CL')} ${response.currency}</p>
        <p>📍 ${response.city || ''} ${response.sector ? '- ' + response.sector : ''}</p>
        <p>🛏 ${response.bedrooms} dorm · 🚿 ${response.bathrooms} baños · 📐 ${response.sqm}m²</p>
        <p>🏠 ${response.type} en ${response.operation}</p>
        <p>📷 ${response.images?.length || 0} fotos</p>
        ${response.images?.length ? `<div class="imgs">${response.images.slice(0, 5).map(u => `<img src="${u}" />`).join('')}</div>` : ''}
      </div>
    `;
  } catch (err) {
    statusEl.textContent = 'Error: ' + err.message;
    statusEl.className = 'status error';
  }
});

// Import button
document.getElementById('importBtn')?.addEventListener('click', async () => {
  if (!extractedData) return;

  const btn = document.getElementById('importBtn');
  btn.textContent = 'Publicando...';
  btn.disabled = true;

  try {
    const res = await fetch(ALTAPROP_URL + '/api/import-property', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(extractedData),
    });

    const result = await res.json();

    if (result.success || result.propertyId) {
      btn.textContent = '✓ Publicada exitosamente';
      btn.style.background = '#16a34a';
      btn.style.color = 'white';
      setTimeout(() => {
        chrome.tabs.create({ url: ALTAPROP_URL + '/dashboard/propiedades' });
      }, 1000);
    } else {
      // Fallback: open with data
      chrome.tabs.create({
        url: ALTAPROP_URL + '/dashboard/propiedades?import=' + encodeURIComponent(JSON.stringify(extractedData))
      });
    }
  } catch (err) {
    btn.textContent = 'Error - Reintentar';
    btn.style.background = '#dc2626';
    btn.style.color = 'white';
    btn.disabled = false;
  }
});

// Preview button
document.getElementById('previewBtn')?.addEventListener('click', () => {
  if (!extractedData) return;
  chrome.tabs.create({
    url: ALTAPROP_URL + '/dashboard/propiedades?import=' + encodeURIComponent(JSON.stringify(extractedData))
  });
});
