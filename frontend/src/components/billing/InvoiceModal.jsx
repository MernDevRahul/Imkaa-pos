import { useRef, useState } from 'react';
import Modal from '@/components/ui/Modal';
import { fmt, fmtDateTime } from '@/utils';

export default function InvoiceModal({ open, onClose, sale }) {
  const printRef = useRef();
    const [storeDetails, setStoreDetails] = useState(() => {
      try {
        return JSON.parse(localStorage.getItem("axispos_store") || "{}");
      } catch {
        return {};
      }
    });

  const handleWhatsApp = () => {
    if (!sale?.customerPhone) return;
    
    let msg = `*Invoice: ${sale.invoiceNo}*\n`;
    msg += `Date: ${fmtDateTime(sale.createdAt)}\n`;
    msg += `--------------------------\n`;
    sale.items.forEach(item => {
      msg += `${item.nameSnapshot} x ${item.qty} = ${fmt(item.lineTotal)}\n`;
    });
    msg += `--------------------------\n`;
    msg += `*Grand Total: ${fmt(sale.grandTotal)}*\n`;
    msg += `Payment: ${sale.paymentMode}\n\n`;
    msg += `Thank you for shopping with ${storeDetails.storeName || 'us'}!`;

    const encodedMsg = encodeURIComponent(msg);
    const phone = sale.customerPhone.replace(/\D/g, ''); 
    const finalPhone = phone.length === 10 ? `91${phone}` : phone;
    
    window.open(`https://wa.me/${finalPhone}?text=${encodedMsg}`, '_blank');
  };

  const handleDownloadPDF = () => {
    const query = new URLSearchParams({
      storeName:   storeDetails.storeName || '',
      address:     storeDetails.address || '',
      phone:       storeDetails.phone || '',
      invoiceNote: storeDetails.invoiceNote || '',
    }).toString();
    
    // Open in new tab which will trigger the 'attachment' download from backend
    window.open(`${import.meta.env.VITE_API_BASE_URL || '/api/v1'}/sales/${sale.id}/pdf?${query}`, '_blank');
  };

  const handlePrint = () => {
    const content = printRef.current?.innerHTML;
    const w = window.open('', '_blank');
    w.document.write(`
      <!DOCTYPE html><html><head>
      <title>${sale?.invoiceNo}</title>
      <style>
        :root {
          --text-muted: #666;
          --accent: #000;
          --border: #ccc;
          --danger: #000;
          --info: #000;
          --success: #000;
          --sp-4: 12px;
          --sp-5: 16px;
          --font-mono: 'Courier New', monospace;
        }
        @page { 
          size: 80mm auto; 
          margin: 0; 
        }
        html, body {
          width: 80mm !important;
          margin: 0 !important;
          padding: 0 !important;
          background: #fff;
          -webkit-print-color-adjust: exact;
        }
        body {
          font-family: var(--font-mono);
          font-size: 11px;
          line-height: 1.2;
          color: #000;
        }
        .print-container {
          width: 80mm !important;
          padding: 4mm;
          box-sizing: border-box;
          overflow: hidden;
        }
        table {
          width: 100% !important;
          border-collapse: collapse;
          margin-bottom: 8px;
          table-layout: fixed;
        }
        th, td {
          padding: 4px 2px;
          text-align: left;
          vertical-align: top;
          word-wrap: break-word;
        }
        th{border-bottom:1px solid #000;font-weight:700;text-transform: uppercase;font-size: 10px}
        td{border-bottom:1px dotted #ccc}
        .right{text-align:right}
        .center{text-align:center}
        .bold{font-weight:700}
        .divider{border:none;border-top:1px dashed #000;margin:8px 0}
        
        /* Ensure table columns wrap properly */
        th:nth-child(1), td:nth-child(1) { width: 40%; }
        th:nth-child(2), td:nth-child(2) { width: 10%; text-align: center; }
        th:nth-child(3), td:nth-child(3) { width: 15%; text-align: right; }
        th:nth-child(4), td:nth-child(4) { width: 15%; text-align: right; }
        th:nth-child(5), td:nth-child(5) { width: 20%; text-align: right; }

        @media print {
          body { width: 80mm; margin: 0; padding: 4mm; }
          .no-print { display: none; }
        }
      </style>
      </head><body><div class="print-container">${content}</div></body></html>
    `);
    w.document.close();
    w.focus();
    // Wait a bit for images/fonts if any
    setTimeout(() => {
      w.print();
      w.close();
    }, 250);
  };

  if (!sale) return null;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`Invoice — ${sale.invoiceNo}`}
      size="modal-lg"
      footer={
        <>
          <button className="btn btn-ghost" onClick={onClose}>Close</button>
          <div style={{ display: 'flex', gap: 'var(--sp-2)', flex: 1 }}>
            {sale.customerPhone && (
              <button className="btn btn-success flex-1" onClick={handleWhatsApp} title="Send Text Summary">
                📱 WhatsApp
              </button>
            )}
            <button className="btn btn-ghost flex-1" onClick={handleDownloadPDF} style={{ border: '1px solid var(--border)' }}>
              📄 PDF
            </button>
            <button className="btn btn-primary flex-1" onClick={handlePrint}>
              ⎙ Print
            </button>
          </div>
        </>
      }
    >
      {/* Printable area */}
      <div ref={printRef} style={{ fontFamily: 'var(--font-mono)', fontSize: '0.82rem' }}>
        {/* Store header */}
        <div className="center" style={{ marginBottom: 'var(--sp-4)', textAlign: 'center' }}>
          <div style={{ fontSize: '1.1rem', fontWeight: 700, letterSpacing: '0.08em' }}>
            {
              storeDetails?.storeName ? 
              storeDetails?.storeName : 
              "Imkaa Store"
            }
          </div>
          <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem', marginTop: 2 }}>
            {
              storeDetails.address ? 
              storeDetails.address : 
              "10E, 1084 Ramphal Chowk, behind Kali Ghata , New Delhi – 110075"
            }
          </div>
          {/* <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>
            GSTIN: 07ABCDE1234F1Z5
          </div> */}
        </div>

        <hr className="divider" />

        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 'var(--sp-4)', fontSize: '0.78rem' }}>
          <div>
            <div style={{ color: 'var(--text-muted)' }}>INVOICE NO</div>
            <div style={{ fontWeight: 700, color: 'var(--accent)' }}>{sale.invoiceNo}</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ color: 'var(--text-muted)' }}>DATE & TIME</div>
            <div style={{ fontWeight: 600 }}>{fmtDateTime(sale.createdAt)}</div>
            {sale.customerPhone && (
              <div style={{ marginTop: 4 }}>
                <span style={{ color: 'var(--text-muted)', fontSize: '0.68rem' }}>CUSTOMER:</span>{' '}
                <span style={{ fontWeight: 600 }}>{sale.customerPhone}</span>
              </div>
            )}
          </div>
        </div>

        <hr className="divider" />

        {/* Items table */}
        <table style={{ marginBottom: 'var(--sp-4)' }}>
          <thead>
            <tr>
              <th>Item</th>
              <th style={{ textAlign: 'right' }}>Qty</th>
              <th style={{ textAlign: 'right' }}>Rate</th>
              <th style={{ textAlign: 'right' }}>GST%</th>
              <th style={{ textAlign: 'right' }}>Total</th>
            </tr>
          </thead>
          <tbody>
            {sale.items?.map((item, i) => (
              <tr key={i}>
                <td>
                  <div style={{ fontWeight: 600 }}>{item.nameSnapshot}</div>
                  <div style={{ color: 'var(--text-muted)', fontSize: '0.7rem' }}>{item.skuSnapshot}</div>
                </td>
                <td style={{ textAlign: 'right' }}>{item.qty}</td>
                <td style={{ textAlign: 'right' }}>{fmt(item.unitPrice)}</td>
                <td style={{ textAlign: 'right' }}>{item.gstRateSnapshot}%</td>
                <td style={{ textAlign: 'right', fontWeight: 600 }}>{fmt(item.lineTotal)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <hr className="divider" />

        {/* Totals */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr auto',
          gap: '3px 24px',
          fontSize: '0.82rem',
          marginBottom: 'var(--sp-4)',
          borderTop: '1px dashed #000',
          paddingTop: '8px'
        }}>
          <span style={{ color: 'var(--text-muted)' }}>Subtotal</span>
          <span style={{ textAlign: 'right' }}>{fmt(sale.subTotal)}</span>
          {Number(sale.discountTotal) > 0 && <>
            <span style={{ color: 'var(--text-muted)' }}>Discount</span>
            <span style={{ textAlign: 'right', color: 'var(--danger)' }}>−{fmt(sale.discountTotal)}</span>
          </>}
          <span style={{ color: 'var(--text-muted)' }}>GST (incl.)</span>
          <span style={{ textAlign: 'right', color: 'var(--info)' }}>{fmt(sale.taxTotal)}</span>
          <span style={{ fontWeight: 700, fontSize: '1rem', paddingTop: 4, borderTop: '1px solid var(--border)' }}>
            Grand Total
          </span>
          <span style={{
            textAlign: 'right', fontWeight: 700, fontSize: '1rem',
            color: 'var(--accent)', paddingTop: 4, borderTop: '1px solid var(--border)',
          }}>
            {fmt(sale.grandTotal)}
          </span>
        </div>

        <hr className="divider" />

        {/* Payment */}
        <div style={{
          display: 'grid', gridTemplateColumns: '1fr auto',
          gap: '4px 24px', fontSize: '0.8rem',
        }}>
          <span style={{ color: 'var(--text-muted)' }}>Payment Mode</span>
          <span style={{ textAlign: 'right', fontWeight: 600 }}>{sale.paymentMode}</span>
          <span style={{ color: 'var(--text-muted)' }}>Paid Amount</span>
          <span style={{ textAlign: 'right' }}>{fmt(sale.paidAmount)}</span>
          {sale.paymentMode === 'CASH' && (
            <>
              <span style={{ color: 'var(--text-muted)' }}>Change</span>
              <span style={{ textAlign: 'right', color: 'var(--success)', fontWeight: 600 }}>
                {fmt(Number(sale.paidAmount) - Number(sale.grandTotal))}
              </span>
            </>
          )}
        </div>

        <div style={{
          textAlign: 'center', marginTop: 'var(--sp-5)',
          color: 'var(--text-muted)', fontSize: '0.75rem', letterSpacing: '0.06em',
        }}>
          — 
          {
            storeDetails.invoiceNote ? storeDetails.invoiceNote : "Thank you for your purchase!" 
          }
           —
        </div>
      </div>
    </Modal>
  );
}