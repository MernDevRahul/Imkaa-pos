'use strict';

const PDFDocument = require('pdfkit');

function fmt(val) {
  return 'Rs ' + Number(val || 0).toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function fmtDateTime(date) {
  return new Date(date).toLocaleString('en-IN', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

async function generateInvoicePDF(sale, storeDetails = {}) {
  const width  = 226.77; // 80mm
  const margin = 15;
  const contentWidth = width - (margin * 2);

  // ── Step 1: Measure content height ─────────────────────────────────────────
  // We use a dummy document to accurately measure text heights
  const measureDoc = new PDFDocument({ size: [width, 2000], margin });
  let h = margin;

  h += measureDoc.fontSize(12).heightOfString(storeDetails.storeName || 'Imkaa Store', { align: 'center', width: contentWidth }) + 4;
  h += measureDoc.fontSize(8).heightOfString(storeDetails.address || '', { align: 'center', width: contentWidth }) + 4;
  if (storeDetails.phone) h += 10;
  h += 20; // Spacing + Divider line

  h += 10; // Invoice No line
  h += 10; // Date line
  if (sale.customerPhone) h += 10;
  h += 20; // Spacing + Divider line

  h += 15; // Table Header
  sale.items.forEach(item => {
    const itemH = measureDoc.fontSize(7).heightOfString(item.nameSnapshot, { width: 105 });
    h += Math.max(itemH, 10) + 3;
  });
  h += 15; // Spacing + Divider line

  h += 10; // Subtotal
  if (Number(sale.discountTotal) > 0) h += 10;
  h += 10; // GST
  h += 15; // Grand Total + space
  h += 15; // Payment Mode

  h += measureDoc.fontSize(8).heightOfString(storeDetails.invoiceNote || 'Thank you!', { align: 'center', width: contentWidth }) + 30;
  h += margin;

  const finalHeight = Math.ceil(h);

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: [width, finalHeight],
      margin
    });

    const buffers = [];
    doc.on('data', buffers.push.bind(buffers));
    doc.on('end', () => resolve(Buffer.concat(buffers)));
    doc.on('error', reject);

    // ── Store Header ───────────────────────────────────────────────────────────
    doc.fontSize(12).font('Helvetica-Bold').text(storeDetails.storeName || 'Imkaa Store', { align: 'center' });
    doc.fontSize(8).font('Helvetica').text(storeDetails.address || '', { align: 'center', width: 196 });
    if (storeDetails.phone) doc.text(`Phone: ${storeDetails.phone}`, { align: 'center' });
    doc.moveDown(0.5);
    doc.moveTo(15, doc.y).lineTo(211, doc.y).stroke('#ccc');
    doc.moveDown(0.5);

    // ── Sale Info ──────────────────────────────────────────────────────────────
    doc.fontSize(8);
    doc.font('Helvetica-Bold').text('INVOICE:', { continued: true }).font('Helvetica').text(` ${sale.invoiceNo}`);
    doc.font('Helvetica-Bold').text('DATE:', { continued: true }).font('Helvetica').text(` ${fmtDateTime(sale.createdAt)}`);
    if (sale.customerPhone) {
      doc.font('Helvetica-Bold').text('CUSTOMER:', { continued: true }).font('Helvetica').text(` ${sale.customerPhone}`);
    }
    doc.moveDown(0.5);
    doc.moveTo(15, doc.y).lineTo(211, doc.y).stroke('#ccc');
    doc.moveDown(0.5);

    // ── Items Table ────────────────────────────────────────────────────────────
    const col1 = 15;
    const col2 = 120;
    const col3 = 150;
    const col4 = 180;

    doc.fontSize(7).font('Helvetica-Bold');
    const headerY = doc.y;
    doc.text('Item', col1, headerY, { width: 105 });
    doc.text('Qty',  col2, headerY, { width: 30, align: 'right' });
    doc.text('Rate', col3, headerY, { width: 30, align: 'right' });
    doc.text('Total',col4, headerY, { width: 31, align: 'right' });
    doc.moveDown(0.4);
    doc.moveTo(15, doc.y).lineTo(211, doc.y).stroke('#eee');
    doc.moveDown(0.4);

    sale.items.forEach(item => {
      doc.fontSize(7).font('Helvetica');
      const startY = doc.y;
      
      // Get height of wrapped item name to set correct Y for next row
      const nameHeight = doc.heightOfString(item.nameSnapshot, { width: 105 });
      
      doc.text(item.nameSnapshot, col1, startY, { width: 105 });
      doc.text(item.qty.toString(), col2, startY, { width: 30, align: 'right' });
      doc.text(Number(item.unitPrice).toFixed(2), col3, startY, { width: 30, align: 'right' });
      doc.text(Number(item.lineTotal).toFixed(2), col4, startY, { width: 31, align: 'right' });
      
      doc.y = startY + Math.max(nameHeight, 10) + 3; // ensure at least one line height
      if (doc.y > 800) doc.addPage();
    });

    doc.moveDown(0.5);
    doc.moveTo(15, doc.y).lineTo(211, doc.y).stroke('#ccc');
    doc.moveDown(0.5);

    // ── Totals ─────────────────────────────────────────────────────────────────
    const totalsX = 100;
    const totalsW = 111;

    const drawTotalLine = (label, value, bold = false) => {
      const currentY = doc.y;
      doc.fontSize(8).font(bold ? 'Helvetica-Bold' : 'Helvetica');
      doc.text(label, totalsX, currentY, { width: totalsW / 2 });
      doc.text(value, totalsX + totalsW / 2, currentY, { width: totalsW / 2, align: 'right' });
      doc.moveDown(0.8); // spacing between total lines
    };

    drawTotalLine('Subtotal:', fmt(sale.subTotal));
    if (Number(sale.discountTotal) > 0) {
      drawTotalLine('Discount:', `-${fmt(sale.discountTotal)}`);
    }
    drawTotalLine('GST (incl):', fmt(sale.taxTotal));
    
    doc.moveDown(0.2);
    drawTotalLine('Grand Total:', fmt(sale.grandTotal), true);
    doc.moveDown(0.5);
    
    doc.fontSize(7).font('Helvetica-Bold').text(`Payment: ${sale.paymentMode}`, { align: 'right' });

    // ── Footer ─────────────────────────────────────────────────────────────────
    doc.moveDown(1.5);
    doc.fontSize(8).font('Helvetica').text(storeDetails.invoiceNote || 'Thank you for your purchase!', { align: 'center' });
    doc.moveDown(0.5);
    doc.fontSize(6).fillColor('#999').text('Generated by Axis Media POS', { align: 'center' });

    doc.end();
  });
}

module.exports = { generateInvoicePDF };
