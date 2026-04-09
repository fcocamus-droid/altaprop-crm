const express = require('express');
const cors = require('cors');
const puppeteer = require('puppeteer');

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3001;
const ALTAPROP_API = process.env.ALTAPROP_API || 'https://www.loginaltaprop.cl';

let browser = null;

async function getBrowser() {
  if (!browser || !browser.isConnected()) {
    browser = await puppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
    });
  }
  return browser;
}

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', uptime: process.uptime() });
});

// Scrape a Portal Inmobiliario listing
app.post('/scrape', async (req, res) => {
  const { url } = req.body;

  if (!url || !url.includes('portalinmobiliario.com')) {
    return res.status(400).json({ error: 'URL de Portal Inmobiliario requerida' });
  }

  let page = null;
  try {
    const browser = await getBrowser();
    page = await browser.newPage();

    // Set viewport and user agent
    await page.setViewport({ width: 1280, height: 800 });
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/134.0.0.0 Safari/537.36');

    // Navigate with timeout
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });

    // Wait for content to load
    await page.waitForSelector('h1', { timeout: 10000 }).catch(() => {});

    // Extract data from page
    const data = await page.evaluate(() => {
      const d = {
        title: '', price: 0, currency: 'CLP', operation: 'arriendo',
        type: 'departamento', bedrooms: 0, bathrooms: 0, sqm: 0,
        address: '', city: '', sector: '', description: '',
        images: [], gastos_comunes: '', estacionamientos: 0,
        bodegas: 0, antiguedad: '', piso: '', orientacion: '',
        amoblado: false, ascensor: false, mascotas: false,
      };

      // Title
      d.title = document.querySelector('h1')?.textContent?.trim() || '';

      // Price
      const priceEl = document.querySelector('.ui-pdp-price__second-line .andes-money-amount__fraction');
      if (priceEl) d.price = parseInt(priceEl.textContent.replace(/\./g, '')) || 0;
      const currSym = document.querySelector('.ui-pdp-price__second-line .andes-money-amount__currency-symbol');
      if (currSym?.textContent?.includes('UF')) d.currency = 'UF';

      // Operation
      const crumbs = Array.from(document.querySelectorAll('.andes-breadcrumb__link')).map(e => e.textContent.toLowerCase());
      d.operation = crumbs.some(b => b.includes('arriendo')) ? 'arriendo' : 'venta';

      // Specs
      document.querySelectorAll('.andes-table__row').forEach(row => {
        const th = row.querySelector('.andes-table__header__container');
        const td = row.querySelector('.andes-table__column--value');
        if (!th || !td) return;
        const k = th.textContent.trim(), v = td.textContent.trim();
        if (k === 'Dormitorios') d.bedrooms = parseInt(v) || 0;
        else if (k === 'Baños') d.bathrooms = parseInt(v) || 0;
        else if (k === 'Superficie útil') d.sqm = parseFloat(v) || 0;
        else if (k === 'Superficie total' && !d.sqm) d.sqm = parseFloat(v) || 0;
        else if (k === 'Estacionamientos') d.estacionamientos = parseInt(v) || 0;
        else if (k === 'Bodegas') d.bodegas = parseInt(v) || 0;
        else if (k === 'Antigüedad') d.antiguedad = v;
        else if (k === 'Orientación') d.orientacion = v;
        else if (k === 'Gastos comunes') d.gastos_comunes = v;
        else if (k === 'Amoblado') d.amoblado = v === 'Sí';
        else if (k === 'Ascensor') d.ascensor = v === 'Sí';
        else if (k === 'Admite mascotas') d.mascotas = v === 'Sí';
        else if (k.includes('Tipo de')) {
          const l = v.toLowerCase();
          if (l.includes('casa')) d.type = 'casa';
          else if (l.includes('oficina')) d.type = 'oficina';
          else if (l.includes('local')) d.type = 'local';
          else if (l.includes('terreno')) d.type = 'terreno';
        }
        else if (k.includes('piso de la unidad')) d.piso = v;
      });

      // Location
      const loc = document.querySelector('.ui-vip-location__subtitle')?.textContent?.trim() || '';
      if (loc) {
        const parts = loc.split(',').map(p => p.trim());
        d.address = parts[0] || '';
        const comunas = ['Ñuñoa','Providencia','Las Condes','Santiago','Vitacura','La Florida','Maipú','Puente Alto','San Miguel','Macul','La Reina','Peñalolén','Lo Barnechea','Huechuraba','Quilicura','San Bernardo','Independencia','Recoleta','Estación Central'];
        for (const part of parts) {
          if (comunas.some(c => part.includes(c))) { d.city = part; break; }
        }
        const lastCrumb = document.querySelector('.andes-breadcrumb__link:last-child')?.textContent?.trim();
        if (lastCrumb && !comunas.includes(lastCrumb)) d.sector = lastCrumb;
      }

      // Description
      d.description = document.querySelector('.ui-pdp-description__content')?.textContent?.trim()?.substring(0, 2000) || '';

      // Images
      const imgSet = new Set();
      document.querySelectorAll('img').forEach(img => {
        if (img.src?.includes('D_NQ_NP') && img.src?.includes('mlstatic')) {
          imgSet.add(img.src.replace(/-[A-Z]\.(jpg|webp|png)/gi, '-F.$1').split('?')[0]);
        }
      });
      document.querySelectorAll('source[srcset*="mlstatic"]').forEach(s => {
        s.srcset.split(',').forEach(part => {
          const url = part.trim().split(' ')[0];
          if (url.includes('D_NQ_NP')) imgSet.add(url.replace(/-[A-Z]\.(jpg|webp|png)/gi, '-F.$1').split('?')[0]);
        });
      });
      d.images = Array.from(imgSet).slice(0, 20);

      return d;
    });

    // Scroll through gallery to load all images
    const allImages = await page.evaluate(async () => {
      const imgs = new Set();
      // Click through gallery to load all images
      const nextBtn = document.querySelector('.ui-pdp-gallery__chevron--next, [aria-label="Siguiente"]');
      if (nextBtn) {
        for (let i = 0; i < 20; i++) {
          nextBtn.click();
          await new Promise(r => setTimeout(r, 300));
          document.querySelectorAll('img').forEach(img => {
            if (img.src?.includes('D_NQ_NP') && img.src?.includes('mlstatic')) {
              imgs.add(img.src.replace(/-[A-Z]\.(jpg|webp|png)/gi, '-F.$1').split('?')[0]);
            }
          });
        }
      }
      return Array.from(imgs);
    });

    // Merge images
    const mergedImages = [...new Set([...data.images, ...allImages])].slice(0, 20);
    data.images = mergedImages;

    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  } finally {
    if (page) await page.close().catch(() => {});
  }
});

// Scrape and auto-publish to Altaprop
app.post('/scrape-and-publish', async (req, res) => {
  const { url } = req.body;

  try {
    // First scrape
    const scrapeRes = await fetch(`http://localhost:${PORT}/scrape`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url }),
    });
    const data = await scrapeRes.json();

    if (data.error) return res.json(data);

    // Then publish to Altaprop
    const publishRes = await fetch(`${ALTAPROP_API}/api/import-property`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    const result = await publishRes.json();

    res.json({ ...data, published: result.success, propertyId: result.propertyId });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`🏠 Altaprop Scraper running on port ${PORT}`);
  console.log(`   POST /scrape - Extract property data`);
  console.log(`   POST /scrape-and-publish - Extract and publish to Altaprop`);
});

// Graceful shutdown
process.on('SIGINT', async () => {
  if (browser) await browser.close();
  process.exit();
});
