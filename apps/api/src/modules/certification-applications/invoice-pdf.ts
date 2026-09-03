import PDFDocument from 'pdfkit';

type InvoicePdfData = {
  applicationNumber: string;
  producerName: string;
  commodityName: string;
  invoiceNumber: string;
  amount: number;
  dueDate: Date;
  issuedAt: Date;
  paymentInstructions?: string | null;
  status: string;
};

const rupiah = new Intl.NumberFormat('id-ID', {
  style: 'currency',
  currency: 'IDR',
  maximumFractionDigits: 0,
});

export function createInvoicePdf(data: InvoicePdfData) {
  return new Promise<Buffer>((resolve, reject) => {
    const document = new PDFDocument({ size: 'A4', margin: 54, info: { Title: `Invoice ${data.invoiceNumber}` } });
    const chunks: Buffer[] = [];
    document.on('data', (chunk: Buffer) => chunks.push(chunk));
    document.on('end', () => resolve(Buffer.concat(chunks)));
    document.on('error', reject);

    document.fillColor('#0b5d2a').fontSize(18).font('Helvetica-Bold')
      .text('UPTD BALAI PENGAWASAN SERTIFIKASI BENIH', { align: 'center' });
    document.fontSize(11).text('DAN PROTEKSI TANAMAN PERKEBUNAN', { align: 'center' });
    document.fillColor('#4b5563').font('Helvetica').fontSize(9)
      .text('PROVINSI KALIMANTAN SELATAN', { align: 'center' });
    document.moveDown(1.4).strokeColor('#0b5d2a').lineWidth(1.5)
      .moveTo(54, document.y).lineTo(541, document.y).stroke();
    document.moveDown(1.6).fillColor('#111827').font('Helvetica-Bold').fontSize(20)
      .text('INVOICE', { align: 'right' });
    document.font('Helvetica').fontSize(10)
      .text(data.invoiceNumber, { align: 'right' })
      .text(`Terbit: ${data.issuedAt.toLocaleDateString('id-ID')}`, { align: 'right' })
      .text(`Jatuh tempo: ${data.dueDate.toLocaleDateString('id-ID')}`, { align: 'right' });

    document.moveDown(2).font('Helvetica-Bold').text('DITAGIHKAN KEPADA');
    document.font('Helvetica').text(data.producerName);
    document.text(`Nomor pengajuan: ${data.applicationNumber}`);
    document.text(`Komoditas: ${data.commodityName}`);

    const tableY = document.y + 26;
    document.rect(54, tableY, 487, 34).fill('#e8f3ec');
    document.fillColor('#0b5d2a').font('Helvetica-Bold').fontSize(10)
      .text('URAIAN', 66, tableY + 12)
      .text('JUMLAH', 390, tableY + 12, { width: 137, align: 'right' });
    document.fillColor('#111827').font('Helvetica').text('Biaya layanan sertifikasi benih', 66, tableY + 54)
      .text(rupiah.format(data.amount), 390, tableY + 54, { width: 137, align: 'right' });
    document.moveTo(54, tableY + 80).lineTo(541, tableY + 80).strokeColor('#d1d5db').lineWidth(0.8).stroke();
    document.font('Helvetica-Bold').fontSize(12).text('TOTAL', 300, tableY + 98, { width: 90, align: 'right' })
      .fillColor('#0b5d2a').fontSize(14).text(rupiah.format(data.amount), 390, tableY + 96, { width: 137, align: 'right' });

    document.y = tableY + 150;
    document.fillColor('#111827').font('Helvetica-Bold').fontSize(10).text('Instruksi Pembayaran');
    document.font('Helvetica').fontSize(9).fillColor('#374151')
      .text(data.paymentInstructions?.trim() || 'Silakan mengikuti petunjuk pembayaran dari petugas balai.', { width: 487 });
    document.moveDown(2).font('Helvetica-Bold').fillColor('#111827').text(`Status: ${data.status === 'PAID' ? 'LUNAS' : 'MENUNGGU PEMBAYARAN'}`);
    document.moveDown(4).font('Helvetica').fontSize(8).fillColor('#6b7280')
      .text('Dokumen ini dibuat secara elektronik oleh sistem SiPerbun.', { align: 'center' });
    document.end();
  });
}
