'use strict';
/**
 * All prices are GST-INCLUSIVE (tax is embedded in sellingPrice).
 * To show taxable value and GST on invoice we back-calculate.
 *
 *   taxableValue = lineTotal / (1 + rate/100)
 *   gstAmount    = lineTotal - taxableValue
 *   cgst         = gstAmount / 2     (intra-state)
 *   sgst         = gstAmount / 2
 */

/**
 * Calculate per-line totals.
 * @param {number} unitPrice   Selling price (inclusive of GST)
 * @param {number} qty
 * @param {number} discount    Line discount (flat ₹ amount)
 * @param {number} gstRate     Percentage: 0 | 5 | 12 | 18 | 28
 * @returns {{ lineTotal, taxableValue, taxAmount, cgst, sgst }}
 */
function calcLine(unitPrice, qty, discount, gstRate) {
  const gross      = round2(unitPrice * qty);
  const lineTotal  = round2(gross - (discount || 0));
  const rate       = gstRate / 100;

  const taxableValue = rate > 0 ? round2(lineTotal / (1 + rate)) : lineTotal;
  const taxAmount    = round2(lineTotal - taxableValue);
  const cgst         = round2(taxAmount / 2);
  const sgst         = round2(taxAmount / 2);

  return { lineTotal, taxableValue, taxAmount, cgst, sgst };
}

/**
 * Aggregate bill totals from an array of line results.
 * @param {Array<{lineTotal, taxAmount}>} lines
 * @param {number} billDiscount   Bill-level flat discount
 * @returns {{ subTotal, billDiscount, taxTotal, grandTotal }}
 */
function calcBill(lines, billDiscount = 0) {
  const subTotal   = round2(lines.reduce((s, l) => s + l.lineTotal, 0));
  const taxTotal   = round2(lines.reduce((s, l) => s + l.taxAmount, 0));
  const grandTotal = round2(subTotal - billDiscount + taxTotal);
  // Note: billDiscount is subtracted BEFORE taxTotal since tax is inclusive
  // Adjust if your store uses exclusive pricing (change calcLine accordingly)
  return { subTotal, billDiscount: round2(billDiscount), taxTotal, grandTotal };
}

function round2(n) {
  return Math.round(n * 100) / 100;
}

module.exports = { calcLine, calcBill, round2 };