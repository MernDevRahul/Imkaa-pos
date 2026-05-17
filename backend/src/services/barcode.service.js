'use strict';

/**
 * POS Barcode Service
 * ─────────────────────────────────────────────────────────────────────────────
 * Generates CODE-128B barcodes as SVG strings — zero external dependencies.
 * CODE-128B covers all ASCII printable chars (SKUs like "BEV001" encode perfectly).
 *
 * PRD refs:
 *   FR-11 — Generate barcode for each product (based on SKU)
 *   FR-12 — Scan barcode and resolve to product reliably even if productId changes (SKU stable)
 *
 * Endpoints produced:
 *   GET /api/v1/barcodes/:productId          → single barcode (SVG or PNG-base64)
 *   GET /api/v1/barcodes/sku/:sku            → single barcode by SKU
 *   POST /api/v1/barcodes/sheet              → printable sheet (multi-product HTML)
 *   GET /api/v1/barcodes/:productId/validate → verify barcode is scannable
 */

// ─── CODE-128B ENCODING TABLE ─────────────────────────────────────────────────
// Each value is an 11-bit bar/space pattern (1=bar, 0=space) + checksum weight
const CODE128B_TABLE = [
  // value : [ bars (11 bits as string), char ]
  // index = code value (32–126 are ASCII printable via Code128B)
];

// Code128B patterns indexed by code value (0–106 are the standard codes)
// Patterns are standard Code128 bar widths: each symbol = 11 modules
const PATTERNS = [
  '11011001100','11001101100','11001100110','10010011000','10010001100',
  '10001001100','10011001000','10011000100','10001100100','11001001000',
  '11001000100','11000100100','10110011100','10011011100','10011001110',
  '10111001100','10011101100','10011100110','11001110010','11001011100',
  '11001001110','11011100100','11001110100','11101101110','11101001100',
  '11100101100','11100100110','11101100100','11100110100','11100110010',
  '11011011000','11011000110','11000110110','10100011000','10001011000',
  '10001000110','10110001000','10001101000','10001100010','11010001000',
  '11000101000','11000100010','10110111000','10110001110','10001101110',
  '10111011000','10111000110','10001110110','11101110110','11010001110',
  '11000101110','11011101000','11011100010','11011101110','11101011000',
  '11101000110','11100010110','11101101000','11101100010','11100011010',
  '11101111010','11001000010','11110001010','10100110000','10100001100',
  '10010110000','10010000110','10000101100','10000100110','10110010000',
  '10110000100','10011010000','10011000010','10000110100','10000110010',
  '11000010010','11001010000','11110111010','11000010100','10001111010',
  '10100111100','10010111100','10010011110','10111100100','10011110100',
  '10011110010','11110100100','11110010100','11110010010','11011011110',
  '11011110110','11110110110','10101111000','10100011110','10001011110',
  '10111101000','10111100010','11110101000','11110100010','10111011110',
  '10111101110','11101011110','11110101110','11010000100','11010010000',
  '11010011100','1100011101011',  // stop pattern (last one, 13 modules)
];

// START_B code value = 104, STOP = 106
const START_B  = 104;
const STOP     = 106;

/**
 * Encode a string into Code128B bar pattern string.
 * Returns array of module widths: alternating bar/space starting with bar.
 */
function encode128B(text) {
  const codes = [START_B];

  for (let i = 0; i < text.length; i++) {
    const charCode = text.charCodeAt(i);
    if (charCode < 32 || charCode > 126) {
      throw new Error(`Character "${text[i]}" (code ${charCode}) is not supported in Code128B`);
    }
    codes.push(charCode - 32); // Code128B: value = ASCII - 32
  }

  // Checksum: (startValue + sum(value * position)) % 103
  let checksum = START_B;
  for (let i = 1; i < codes.length; i++) {
    checksum = (checksum + codes[i] * i) % 103;
  }
  codes.push(checksum);
  codes.push(STOP);

  // Convert to module string (each code = 11 modules, stop = 13)
  return codes.map((c, idx) => {
    if (idx === codes.length - 1) return PATTERNS[106]; // stop
    return PATTERNS[c];
  }).join('') + '11'; // trailing quiet zone marker (2 modules)
}

/**
 * Generate a Code128B barcode as an SVG string.
 *
 * @param {string} sku         The SKU string to encode (e.g. "BEV001")
 * @param {string} label       Human-readable text shown below barcode (name + price)
 * @param {object} opts
 * @param {number} opts.moduleWidth  Width of one bar module in px (default 2)
 * @param {number} opts.height       Bar height in px (default 60)
 * @param {number} opts.fontSize     Label font size (default 11)
 * @param {number} opts.quietZone    Quiet zone modules each side (default 10)
 * @returns {string} SVG markup
 */
function generateBarcodeSVG(sku, label = '', opts = {}) {
  const {
    moduleWidth = 1.8,
    height      = 110,
    fontSize    = 16,
    quietZone   = 8,
    price       = '',
    colors      = [],
    sizes       = [],
  } = opts;

  const modules   = encode128B(sku);
  const barCount  = modules.length;
  const barcodeW  = barCount * moduleWidth;
  
  // Vertical layout metrics
  const branding      = "Imkaa Fashions";
  const brandingSize  = 24;
  const hasLabel      = !!(label && label.trim());
  const hasPrice      = !!price;
  const variantStr    = [colors.join('-'), sizes.join('-')].filter(Boolean).join(' | ');
  const hasVariant    = !!variantStr;

  // Further optimized to fill the 2x2 paper even more
  const minWidth      = 210; 
  const totalW        = Math.max(barcodeW + quietZone * 2 * moduleWidth, minWidth);
  const labelX        = totalW / 2;
  const offsetX       = (totalW - barcodeW) / 2;

  // Vertical layout metrics - Fully utilizing 2x2 inch space
  const brandingY = 28;
  const barTop    = brandingY + 15;
  const barBottom = barTop + height;
  
  let nextY = barBottom + 12 + fontSize;
  let labelY = 0, priceY = 0, variantY = 0;

  if (hasLabel) {
    labelY = nextY;
    nextY += fontSize + 5;
  }
  if (hasPrice) {
    priceY = nextY;
    nextY += fontSize + 8;
  }
  if (hasVariant) {
    variantY = nextY;
    nextY += fontSize + 4;
  }

  const totalH = nextY + 8; 

  let bars = '';
  let x    = offsetX;

  for (let i = 0; i < modules.length; i++) {
    if (modules[i] === '1') {
      let w = 0;
      while (i < modules.length && modules[i] === '1') { w++; i++; }
      i--; 
      bars += `<rect x="${x}" y="${barTop}" width="${w * moduleWidth}" height="${height}" fill="#000"/>`;
      x += w * moduleWidth;
    } else {
      x += moduleWidth;
    }
  }

  const brandingSVG = `<text x="${labelX}" y="${brandingY}" text-anchor="middle" font-family="sans-serif" font-size="${brandingSize}" font-weight="900" letter-spacing="0.2" fill="#000">${escXml(branding)}</text>`;
  
  const labelSVG = hasLabel
    ? `<text x="${labelX}" y="${labelY}" text-anchor="middle" font-family="sans-serif" font-size="${fontSize}" font-weight="600" fill="#000">${escXml(label)}</text>`
    : '';
  const priceSVG = hasPrice
    ? `<text x="${labelX}" y="${priceY}" text-anchor="middle" font-family="sans-serif" font-size="${fontSize + 4}" font-weight="900" fill="#000">${escXml(price)}</text>`
    : '';
  const variantSVG = hasVariant
    ? `<text x="${labelX}" y="${variantY}" text-anchor="middle" font-family="sans-serif" font-size="${fontSize}" fill="#444">${escXml(variantStr)}</text>`
    : '';

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${totalW} ${totalH}" preserveAspectRatio="xMidYMid meet">
  <rect width="${totalW}" height="${totalH}" fill="#fff"/>
  ${brandingSVG}
  ${bars}
  ${labelSVG}
  ${priceSVG}
  ${variantSVG}
</svg>`;
}

function generateBarcodeSheet(products, opts = {}) {
  const { cols = 2, moduleWidth = 1.5, barHeight = 100 } = opts;

  // Expand copies
  const labels = [];
  for (const p of products) {
    const copies = Math.min(parseInt(p.copies) || 1, 100); 
    for (let i = 0; i < copies; i++) {
      labels.push(p);
    }
  }

  const labelCells = [];
  for (let i = 0; i < labels.length; i += 2) {
    const p1 = labels[i];
    const p2 = labels[i + 1];

    const createLabelHTML = (p) => {
      if (!p) return '<div class="label empty"></div>';
      let svg = '';
      try {
        const formattedPrice = p.sellingPrice ? `₹${parseFloat(p.sellingPrice).toFixed(2)}` : '';
        svg = generateBarcodeSVG(p.sku, p.name, {
          moduleWidth,
          height: barHeight,
          price: formattedPrice,
          colors: p.colors,
          sizes: p.sizes
        });
      } catch (e) {
        svg = `<div style="color:red;font-size:11px">Error: ${escXml(e.message)}</div>`;
      }
      return `
      <div class="label">
        ${svg}
      </div>`;
    };

    labelCells.push(`
    <div class="row">
      ${createLabelHTML(p1)}
      ${createLabelHTML(p2)}
    </div>`);
  }

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: sans-serif; background: #fff; color: #000; width: 100mm; margin: 0 auto; }
    .sheet { 
      display: block; 
      width: 100mm;
    }
    .row {
      display: flex;
      width: 100mm;
      height: 50mm;
      page-break-after: always;
      break-after: page;
      overflow: hidden;
    }
    .label { 
      width: 50mm; 
      height: 50mm; 
      padding: 1.5mm; 
      display: flex; 
      flex-direction: column; 
      align-items: center; 
      justify-content: center; 
      overflow: hidden;
      text-align: center;
    }
    .label.empty {
      background: transparent;
    }
    .label svg { 
      width: 100%; 
      height: auto; 
      max-height: 100%;
    }
    @page {
      size: 100mm 50mm;
      margin: 0;
    }
    @media print {
      body { -webkit-print-color-adjust: exact; print-color-adjust: exact; margin: 0; padding: 0; width: 100mm; }
      .sheet { margin: 0; padding: 0; width: 100mm; }
      .row:last-child { page-break-after: avoid; break-after: auto; }
    }
  </style>
</head>
<body>
  <div class="sheet">
    ${labelCells.join('')}
  </div>
  <script>
    if (window.location.search.includes('autoprint=1')) {
      window.onload = () => window.print();
    }
  </script>
</body>
</html>`;
}

/**
 * Validate that a SKU can be encoded as Code128B without errors.
 * Returns { valid, error }.
 */
function validateSku(sku) {
  try {
    encode128B(sku);
    return { valid: true, sku, length: sku.length };
  } catch (err) {
    return { valid: false, sku, error: err.message };
  }
}

function escXml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

module.exports = { generateBarcodeSVG, generateBarcodeSheet, validateSku };