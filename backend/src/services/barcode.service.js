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
    moduleWidth = 2,
    height      = 60,
    fontSize    = 11,
    quietZone   = 10,
    price       = '',
  } = opts;

  const modules   = encode128B(sku);
  const barCount  = modules.length;
  const totalW    = (barCount + quietZone * 2) * moduleWidth;
  
  // Vertical layout metrics
  const barTop    = 8;
  const barBottom = barTop + height;
  
  const hasLabel  = !!(label && label.trim());
  
  // Baselines for text
  const textBaseline1 = barBottom + fontSize + 8; // 8px gap after bars
  const textBaseline2 = textBaseline1 + fontSize + 4; // 4px gap between lines

  const finalLabelY = textBaseline1;
  const finalSkuY   = hasLabel ? textBaseline2 : textBaseline1;

  const totalH = finalSkuY + 8; // 8px bottom padding

  let bars = '';
  let x    = quietZone * moduleWidth;

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

  const labelX   = totalW / 2;
  const labelSVG = hasLabel
    ? `<text x="${labelX}" y="${finalLabelY}" text-anchor="middle" font-family="monospace" font-size="${fontSize}" fill="#000">${escXml(label)}</text>`
    : '';
  const priceSVG = price
    ? `<text x="${labelX}" y="${finalSkuY}" text-anchor="middle" font-family="monospace" font-size="${fontSize}" font-weight="bold" fill="#000">${escXml(price)}</text>`
    : '';

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${totalW}" height="${totalH}" viewBox="0 0 ${totalW} ${totalH}">
  <rect width="${totalW}" height="${totalH}" fill="#fff"/>
  ${bars}
  ${labelSVG}
  ${priceSVG}
</svg>`;
}

/**
 * Generate a printable HTML sheet of barcode labels.
 * Sheet is A4-friendly; labels are arranged in a grid.
 *
 * @param {Array<{sku, name, sellingPrice, copies}>} products
 * @param {object} opts
 * @param {number} opts.cols        Labels per row (default 3)
 * @param {number} opts.moduleWidth Bar module width in px (default 1.5)
 * @param {number} opts.barHeight   Bar height in px (default 50)
 * @returns {string} Full HTML document string
 */
function generateBarcodeSheet(products, opts = {}) {
  const { cols = 3, moduleWidth = 1.5, barHeight = 50 } = opts;

  // Expand copies
  const labels = [];
  for (const p of products) {
    const copies = Math.min(parseInt(p.copies) || 1, 100); // max 100 per product
    for (let i = 0; i < copies; i++) {
      labels.push(p);
    }
  }

  const labelCells = labels.map(p => {
    let svg = '';
    try {
      const formattedPrice = p.sellingPrice ? `₹${parseFloat(p.sellingPrice).toFixed(2)}` : '';
      svg = generateBarcodeSVG(p.sku, p.name, {
        moduleWidth,
        height: barHeight,
        fontSize: 10,
        price: formattedPrice
      });
    } catch (e) {
      svg = `<div style="color:red;font-size:11px">Error: ${escXml(e.message)}</div>`;
    }
    return `
    <div class="label">
      ${svg}
    </div>`;
  }).join('');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>POS — Barcode Sheet</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: monospace; background: #fff; color: #000; }
    .header { padding: 12px 20px; border-bottom: 1px solid #ccc; display: flex; justify-content: space-between; align-items: center; }
    .header h1 { font-size: 16px; }
    .header span { font-size: 11px; color: #666; }
    .sheet { display: grid; grid-template-columns: repeat(${cols}, 1fr); gap: 8px; padding: 16px; }
    .label { border: 1px dashed #ccc; padding: 8px; display: flex; flex-direction: column; align-items: center; gap: 4px; page-break-inside: avoid; }
    .label svg { max-width: 100%; height: auto; }
    .price { font-size: 13px; font-weight: bold; }
    .no-print { }
    @media print {
      .no-print { display: none !important; }
      .label { border-color: #999; }
      body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    }
  </style>
</head>
<body>
  <div class="header no-print">
    <h1>POS — Barcode Label Sheet</h1>
    <span>${labels.length} label(s) · Generated ${new Date().toLocaleString('en-IN')}</span>
  </div>
  <div class="sheet">
    ${labelCells}
  </div>
  <script>
    // Auto-open print dialog when opened directly
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