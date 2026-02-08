const asyncHandler = require('express-async-handler');
const Invoice = require('../models/Invoice');
const Customer = require('../models/Customer');
const PDFDocument = require('pdfkit');

// @desc    Create new invoice
// @route   POST /api/invoices
// @access  Private/Admin
const createInvoice = asyncHandler(async (req, res) => {
    const {
        customerId,
        items,
        paymentStatus,
        deliveryNote,
        modeTermsOfPayment,
        referenceNoAndDate,
        otherReferences,
        dispatchDocNo,
        deliveryNoteDate,
        dispatchedThrough,
        destination,
        termsOfDelivery
    } = req.body;

    const customer = await Customer.findById(customerId);

    if (!customer) {
        res.status(404);
        throw new Error('Customer not found');
    }

    // Calculate totals
    let subtotal = 0;
    let gstTotal = 0;

    const processedItems = items.map((item) => {
        const itemSubtotal = item.quantity * item.unitPrice;
        const discountAmount = (itemSubtotal * (item.discount || 0)) / 100;
        const lineSubtotal = itemSubtotal - discountAmount;
        const lineGst = (lineSubtotal * item.gstPercent) / 100;

        subtotal += lineSubtotal;
        gstTotal += lineGst;

        return {
            ...item,
            lineTotal: lineSubtotal,
        };
    });

    const grandTotal = subtotal + gstTotal;

    // Generate Invoice Number
    const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const count = await Invoice.countDocuments({
        createdAt: { $gte: new Date().setHours(0, 0, 0, 0) },
    });
    const invoiceNumber = `INV-${date}-${(count + 1).toString().padStart(3, '0')}`;

    const invoice = await Invoice.create({
        invoiceNumber,
        customer: customerId,
        mobile: customer.mobile,
        items: processedItems,
        subtotal,
        gstTotal,
        grandTotal,
        paymentStatus,
        deliveryNote,
        modeTermsOfPayment,
        referenceNoAndDate,
        otherReferences,
        dispatchDocNo,
        deliveryNoteDate,
        dispatchedThrough,
        destination,
        termsOfDelivery
    });

    res.status(201).json(invoice);
});

// @desc    Get all invoices
// @route   GET /api/invoices
// @access  Private/Admin
const getInvoices = asyncHandler(async (req, res) => {
    const invoices = await Invoice.find({}).populate('customer', 'name mobile address').sort('-createdAt');
    res.json(invoices);
});

// @desc    Get invoice by ID
// @route   GET /api/invoices/:id
// @access  Private/Admin
const getInvoiceById = asyncHandler(async (req, res) => {
    const invoice = await Invoice.findById(req.params.id).populate('customer', 'name mobile address');

    if (invoice) {
        res.json(invoice);
    } else {
        res.status(404);
        throw new Error('Invoice not found');
    }
});

// @desc    Generate and download PDF for invoice
// @route   GET /api/invoices/:id/download-pdf
// @access  Private
const downloadInvoicePDF = asyncHandler(async (req, res) => {
    const invoice = await Invoice.findById(req.params.id).populate('customer', 'name mobile address');

    if (!invoice) {
        res.status(404);
        throw new Error('Invoice not found');
    }

    // Create PDF document
    const doc = new PDFDocument({
        size: 'A4',
        margin: 30,
        bufferPages: true,
    });

    // Set response headers
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="Invoice_${invoice.invoiceNumber}.pdf"`);
    doc.pipe(res);

    const numberToWords = (num) => {
        const a = ['', 'One ', 'Two ', 'Three ', 'Four ', 'Five ', 'Six ', 'Seven ', 'Eight ', 'Nine ', 'Ten ', 'Eleven ', 'Twelve ', 'Thirteen ', 'Fourteen ', 'Fifteen ', 'Sixteen ', 'Seventeen ', 'Eighteen ', 'Nineteen '];
        const b = ['', '', 'Twenty ', 'Thirty ', 'Forty ', 'Fifty ', 'Sixty ', 'Seventy ', 'Eighty ', 'Ninety '];
        const format = (n) => {
            if (n < 20) return a[n];
            const digit = n % 10;
            if (n < 100) return b[Math.floor(n / 10)] + (digit ? a[digit] : '');
            if (n < 1000) return a[Math.floor(n / 100)] + 'Hundred ' + (n % 100 ? 'and ' + format(n % 100) : '');
            if (n < 100000) return format(Math.floor(n / 1000)) + 'Thousand ' + (n % 1000 ? format(n % 1000) : '');
            if (n < 10000000) return format(Math.floor(n / 100000)) + 'Lakh ' + (n % 100000 ? format(n % 100000) : '');
            return format(Math.floor(n / 10000000)) + 'Crore ' + (n % 10000000 ? format(n % 10000000) : '');
        };
        const split = Math.abs(num).toFixed(2).split('.');
        let words = format(parseInt(split[0])) + 'Rupees ';
        if (split[1] && parseInt(split[1]) > 0) {
            words += 'and ' + format(parseInt(split[1])) + 'Paise ';
        }
        return words + 'Only';
    };

    const formatDate = (date) => {
        if (!date) return '-';
        return new Date(date).toLocaleDateString('en-GB', {
            day: '2-digit',
            month: 'short',
            year: '2-digit'
        }).replace(/ /g, '-');
    };

    // Header Structure
    doc.fontSize(12).font('Helvetica-Bold').text('Tax invoice', 30, 30, { align: 'center' });
    doc.rect(30, 45, 535, 110).stroke(); // Header frame

    // Left: Seller Info
    doc.fontSize(14).text('Vikalp Electric & Refrigeration', 35, 55);
    doc.fontSize(9).font('Helvetica').text('Street No.3, Murlidhar Nagar 1,', 35, 70);
    doc.text('Gokul Nagar,', 35, 80);
    doc.text('Jamnagar - 361004.', 35, 90);
    doc.text('MO : 9374170929 / 7016223029', 35, 100);
    doc.font('Helvetica-Bold').text('GSTIN/UIN: 24AHWPB8203B1ZP', 35, 115);
    doc.font('Helvetica').text('State Name : Gujarat, Code : 24', 35, 125);
    doc.text('E-Mail : vikalpelectronicofficial@gmail.com', 35, 135);

    // Right: Metadata Grid
    doc.moveTo(280, 45).lineTo(280, 155).stroke(); // Divider
    doc.moveTo(280, 67).lineTo(565, 67).stroke();
    doc.moveTo(280, 89).lineTo(565, 89).stroke();
    doc.moveTo(280, 111).lineTo(565, 111).stroke();
    doc.moveTo(280, 133).lineTo(565, 133).stroke();
    doc.moveTo(422, 45).lineTo(422, 133).stroke(); // Sub-divider

    const gridX1 = 285;
    const gridX2 = 427;

    doc.fontSize(7).font('Helvetica').text('Invoice No.', gridX1, 50);
    doc.fontSize(9).font('Helvetica-Bold').text(invoice.invoiceNumber, gridX1, 57);
    doc.fontSize(7).font('Helvetica').text('Dated', gridX2, 50);
    doc.fontSize(9).font('Helvetica-Bold').text(formatDate(invoice.invoiceDate), gridX2, 57);

    doc.fontSize(7).font('Helvetica').text('Delivery Note', gridX1, 72);
    doc.fontSize(9).font('Helvetica-Bold').text(invoice.deliveryNote || '-', gridX1, 79);
    doc.fontSize(7).font('Helvetica').text('Mode/Terms of Payment', gridX2, 72);
    doc.fontSize(9).font('Helvetica-Bold').text(invoice.modeTermsOfPayment || '-', gridX2, 79);

    doc.fontSize(7).font('Helvetica').text('Reference No. & Date.', gridX1, 94);
    doc.fontSize(9).font('Helvetica-Bold').text(invoice.referenceNoAndDate || '-', gridX1, 101);
    doc.fontSize(7).font('Helvetica').text('Other References', gridX2, 94);
    doc.fontSize(9).font('Helvetica-Bold').text(invoice.otherReferences || '-', gridX2, 101);

    doc.fontSize(7).font('Helvetica').text('Dispatch Doc No.', gridX1, 116);
    doc.fontSize(9).font('Helvetica-Bold').text(invoice.dispatchDocNo || '-', gridX1, 123);
    doc.fontSize(7).font('Helvetica').text('Delivery Note Date', gridX2, 116);
    doc.fontSize(9).font('Helvetica-Bold').text(formatDate(invoice.deliveryNoteDate), gridX2, 123);

    doc.fontSize(7).font('Helvetica').text('Dispatched through', gridX1, 138);
    doc.fontSize(9).font('Helvetica-Bold').text(invoice.dispatchedThrough || '-', gridX1, 145);
    doc.fontSize(7).font('Helvetica').text('Destination', gridX2, 138);
    doc.fontSize(9).font('Helvetica-Bold').text(invoice.destination || '-', gridX2, 145);

    // Buyer Information Section
    doc.rect(30, 155, 535, 60).stroke();
    doc.fontSize(8).font('Helvetica').text('Buyer (Bill to)', 35, 160);
    doc.fontSize(12).font('Helvetica-Bold').text(invoice.customer?.name || 'N/A', 35, 172);
    doc.fontSize(10).font('Helvetica').text(invoice.customer?.address || 'Jamnagar', 35, 187, { width: 520 });
    doc.text('State Name : Gujarat, Code : 24', 35, 202);

    // Items Table
    const tableTop = 215;
    const tableBottom = 580;
    doc.rect(30, tableTop, 535, tableBottom - tableTop).stroke();
    doc.moveTo(30, tableTop + 20).lineTo(565, tableTop + 20).stroke(); // Header bottom

    /** 
     * Uniform Column Configuration for Production Standards 
     * Rate and Amount columns adjusted to have equal visual importance
     **/
    const colX = {
        sl: 30,
        desc: 60,
        hsn: 215,
        gst: 265,
        qty: 310,
        rate: 375,  // Increased width
        per: 435,
        disc: 465,
        amount: 495 // Equal width to Rate
    };

    doc.fontSize(8).font('Helvetica-Bold');
    doc.text('Sl No', colX.sl + 5, tableTop + 7);
    doc.text('Description of Goods', colX.desc + 5, tableTop + 7);
    doc.text('HSN/SAC', colX.hsn + 5, tableTop + 7);
    doc.text('GST %', colX.gst + 5, tableTop + 7);
    doc.text('Quantity', colX.qty + 5, tableTop + 7);
    doc.text('Rate', colX.rate, tableTop + 7, { width: colX.per - colX.rate - 2, align: 'right' });
    doc.text('per', colX.per + 5, tableTop + 7);
    doc.text('Disc %', colX.disc + 2, tableTop + 7);
    doc.text('Amount', colX.amount, tableTop + 7, { width: 565 - colX.amount - 5, align: 'right' });

    // Draw vertical column separators
    Object.values(colX).slice(1).forEach(x => {
        doc.moveTo(x, tableTop).lineTo(x, tableBottom).stroke();
    });

    let y = tableTop + 25;
    invoice.items.forEach((item, i) => {
        const rowHeight = 25;
        doc.fontSize(9).font('Helvetica');
        doc.text((i + 1).toString(), colX.sl, y, { width: 30, align: 'center' });
        doc.font('Helvetica-Bold').text(item.serviceName, colX.desc + 5, y, { width: 150 });
        doc.font('Helvetica').text(item.hsnCode || '-', colX.hsn + 5, y);
        doc.text(`${item.gstPercent}%`, colX.gst + 5, y);
        doc.font('Helvetica-Bold').text(`${item.quantity} ${item.per || 'Pcs'}`, colX.qty + 5, y);
        doc.font('Helvetica').text(item.unitPrice.toFixed(2), colX.rate, y, { width: colX.per - colX.rate - 2, align: 'right' });
        doc.text(item.per || 'Pcs', colX.per + 5, y);
        doc.text(item.discount ? `${item.discount}%` : '-', colX.disc + 5, y);
        doc.font('Helvetica-Bold').text(item.lineTotal.toFixed(2), colX.amount, y, { width: 565 - colX.amount - 5, align: 'right' });
        y += rowHeight;
    });

    // Space for Tax Breakdown
    y = tableBottom - 60;
    const gstRate = invoice.items[0]?.gstPercent || 18;
    const splitGstRate = (gstRate / 2).toFixed(1);

    doc.fontSize(9).font('Helvetica-Bold');
    doc.text(`CGST Output @ ${splitGstRate}%`, colX.desc + 5, y);
    doc.text(`${splitGstRate}%`, colX.rate, y, { width: colX.per - colX.rate - 2, align: 'right' });
    doc.text((invoice.gstTotal / 2).toFixed(2), colX.amount, y, { width: 565 - colX.amount - 5, align: 'right' });

    y += 15;
    doc.text(`SGST Output @ ${splitGstRate}%`, colX.desc + 5, y);
    doc.text(`${splitGstRate}%`, colX.rate, y, { width: colX.per - colX.rate - 2, align: 'right' });
    doc.text((invoice.gstTotal / 2).toFixed(2), colX.amount, y, { width: 565 - colX.amount - 5, align: 'right' });

    // Summary Total Row
    doc.rect(30, tableBottom, 535, 20).stroke();
    doc.fontSize(10).font('Helvetica-Bold').text('Total', colX.desc + 5, tableBottom + 5);
    const totalQty = invoice.items.reduce((acc, i) => acc + i.quantity, 0);
    doc.text(`${totalQty} Pcs`, colX.qty + 5, tableBottom + 5);
    doc.fontSize(12).text(`₹ ${invoice.grandTotal.toFixed(2)}`, colX.amount, tableBottom + 4, { width: 565 - colX.amount - 5, align: 'right' });

    // Footer Implementation
    y = tableBottom + 30;
    doc.fontSize(9).font('Helvetica-Bold').text('Amount Chargeable (in words)', 35, y);
    doc.fontSize(10).text(numberToWords(invoice.grandTotal), 35, y + 15);

    y += 45;
    doc.fontSize(9).font('Helvetica-Bold').text('Declaration', 35, y);
    doc.moveTo(35, y + 10).lineTo(85, y + 10).stroke();
    doc.fontSize(8).font('Helvetica').text('We declare that this invoice shows the actual price of the goods described and that all particulars are true and correct.', 35, y + 15, { width: 250 });

    // Signatory Area
    const sigY = 650;
    doc.fontSize(10).font('Helvetica-Bold').text('for Vikalp Electric & Refrigeration', 400, sigY, { align: 'right', width: 160 });
    doc.fontSize(9).text('Authorised Signatory', 400, sigY + 50, { align: 'right', width: 160 });

    doc.fontSize(9).font('Helvetica-Bold').text('SUBJECT TO JAMNAGAR JURISDICTION', 30, 780, { align: 'center', width: 535 });
    doc.fontSize(8).font('Helvetica').text('This is a Computer Generated Invoice', 30, 792, { align: 'center', width: 535 });

    doc.end();
});

// @desc    Delete invoice
// @route   DELETE /api/invoices/:id
// @access  Private/Admin
const deleteInvoice = asyncHandler(async (req, res) => {
    const invoice = await Invoice.findById(req.params.id);

    if (invoice) {
        await invoice.deleteOne();
        res.json({ message: 'Invoice removed' });
    } else {
        res.status(404);
        throw new Error('Invoice not found');
    }
});

module.exports = {
    createInvoice,
    getInvoices,
    getInvoiceById,
    downloadInvoicePDF,
    deleteInvoice,
};
