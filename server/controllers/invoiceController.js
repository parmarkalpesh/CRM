const asyncHandler = require('express-async-handler');
const Invoice = require('../models/Invoice');
const Customer = require('../models/Customer');
const PDFDocument = require('pdfkit');

// @desc    Create new invoice
// @route   POST /api/invoices
// @access  Private/Admin
const createInvoice = asyncHandler(async (req, res) => {
    const { customerId, items, paymentStatus } = req.body;

    const customer = await Customer.findById(customerId);

    if (!customer) {
        res.status(404);
        throw new Error('Customer not found');
    }

    // Calculate totals
    let subtotal = 0;
    let gstTotal = 0;

    const processedItems = items.map((item) => {
        // Calculate subtotal after discount
        const discountAmount = (item.quantity * item.unitPrice * (item.discount || 0)) / 100;
        const lineSubtotal = (item.quantity * item.unitPrice) - discountAmount;

        const lineGst = (lineSubtotal * item.gstPercent) / 100;
        // lineTotal should show the amount before GST as per user request
        const lineTotal = lineSubtotal;

        subtotal += lineSubtotal;
        gstTotal += lineGst;

        return {
            ...item,
            lineTotal,
        };
    });

    const grandTotal = subtotal + gstTotal;

    // Generate Invoice Number: INV-YYYYMMDD-XXXX
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
        margin: 50,
        bufferPages: true,
    });

    // Set response headers
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="Invoice_${invoice.invoiceNumber}.pdf"`);
    doc.pipe(res);

    const numberToWords = (num) => {
        const a = ['', 'One ', 'Two ', 'Three ', 'Four ', 'Five ', 'Six ', 'Seven ', 'Eight ', 'Nine ', 'Ten ', 'Eleven ', 'Twelve ', 'Thirteen ', 'Fourteen ', 'Fifteen ', 'Sixteen ', 'Seventeen ', 'Eighteen ', 'Nineteen '];
        const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
        const format = (n) => {
            if (n < 20) return a[n];
            const digit = n % 10;
            if (n < 100) return b[Math.floor(n / 10)] + (digit ? '-' + a[digit] : '');
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

    // Top Title
    doc.fontSize(10).font('Helvetica-Bold').text('Tax invoice', 50, 30, { align: 'center' });
    doc.moveTo(50, 42).lineTo(545, 42).stroke();

    // Seller Info (Left)
    doc.fontSize(11).font('Helvetica-Bold').text('Vikalp Electric & Refrigeration', 50, 50);
    doc.fontSize(8).font('Helvetica').text('Street No.3, Murlidhar Nagar 1,', 50, 65);
    doc.text('Gokul Nagar, Jamnagar - 361004', 50, 75);
    doc.text('Mo. +91 9374170929, +91 7016223029', 50, 85);
    doc.text('GSTIN/UIN: siudhfusygbeiuhfes57fs', 50, 95);
    doc.text('State Name: Gujart, Code: 24', 50, 105);
    doc.text('E-Mail: Vikalpelectronicsofficial@gmail.com', 50, 115);

    // Metadata Grid (Right)
    doc.rect(300, 50, 245, 100).stroke();
    doc.moveTo(300, 70).lineTo(545, 70).stroke();
    doc.moveTo(300, 90).lineTo(545, 90).stroke();
    doc.moveTo(300, 110).lineTo(545, 110).stroke();
    doc.moveTo(300, 130).lineTo(545, 130).stroke();
    doc.moveTo(422, 50).lineTo(422, 130).stroke();

    doc.fontSize(7).text('Invoice No.', 305, 55);
    doc.fontSize(8).font('Helvetica-Bold').text(invoice.invoiceNumber, 305, 62);
    doc.fontSize(7).font('Helvetica').text('Dated', 427, 55);
    doc.fontSize(8).font('Helvetica-Bold').text(new Date(invoice.invoiceDate).toLocaleDateString('en-GB'), 427, 62);

    doc.fontSize(7).font('Helvetica').text('Delivery Note', 305, 75);
    doc.text('Mode/Terms of Payment', 427, 75);
    doc.text('Reference No. & Date.', 305, 95);
    doc.text('Other References', 427, 95);
    doc.text('Dispatch Doc No.', 305, 115);
    doc.text('Delivery Note Date', 427, 115);

    // Buyer Section
    doc.rect(50, 150, 495, 60).stroke();
    doc.fontSize(7).font('Helvetica').text('Buyer (Bill to)', 55, 155);
    doc.fontSize(10).font('Helvetica-Bold').text(invoice.customer?.name || 'N/A', 55, 165);
    doc.fontSize(8).font('Helvetica').text(invoice.customer?.address || '', 55, 178, { width: 480 });
    doc.font('Helvetica-Bold').text('State Name: Gujart, Code: 24', 55, 195);

    // Items Table Setup
    const tableTop = 215;
    const tableBottom = 580;
    doc.rect(50, tableTop, 495, tableBottom - tableTop).stroke();

    // Horizontal header line
    doc.moveTo(50, tableTop + 15).lineTo(545, tableTop + 15).stroke();

    /** Columns Configuration for a Balanced, Professional Look **/
    const colX = {
        sl: 50,
        desc: 80,
        hsn: 215,
        gstRate: 275,
        qty: 325,
        rate: 375,
        per: 425,
        disc: 455,
        amount: 485
    };

    doc.fontSize(7).font('Helvetica-Bold');
    doc.text('Sl No', colX.sl + 2, tableTop + 5);
    doc.text('Description of Goods', colX.desc + 5, tableTop + 5);
    doc.text('HSN/SAC', colX.hsn + 5, tableTop + 5);
    doc.text('GST Rate', colX.gstRate + 5, tableTop + 5);
    doc.text('Quantity', colX.qty + 5, tableTop + 5);
    doc.text('Rate', colX.rate + 5, tableTop + 5);
    doc.text('per', colX.per + 5, tableTop + 5);
    doc.text('Disc. %', colX.disc + 2, tableTop + 5);
    doc.text('Amount', 540, tableTop + 5,tableTop + 5 );

    // Draw vertical column separators
    Object.values(colX).slice(1).forEach(x => {
        doc.moveTo(x, tableTop).lineTo(x, tableBottom).stroke();
    });

    let y = tableTop + 20;
    // Items
    invoice.items.forEach((item, i) => {
        doc.fontSize(8).font('Helvetica');
        doc.text((i + 1).toString(), colX.sl + 5, y);
        doc.font('Helvetica-Bold').text(item.serviceName, colX.desc + 5, y, { width: 125 });
        doc.font('Helvetica').text(item.hsnCode || '-', colX.hsn + 5, y);
        doc.text(`${item.gstPercent}%`, colX.gstRate + 5, y);
        doc.font('Helvetica-Bold').text(`${item.quantity} ${item.per}`, colX.qty + 5, y);
        doc.font('Helvetica').text(item.unitPrice.toFixed(2), colX.rate + 5, y);
        doc.text(item.per, colX.per + 5, y);
        doc.text(item.discount ? `${item.discount}%` : '', colX.disc + 5, y);
        doc.font('Helvetica-Bold').text(item.lineTotal.toFixed(2), 540, y, { align: 'right' });
        y += 20;
    });

    // Tax Rows (CGST/SGST)
    y += 5;
    doc.fontSize(8).font('Helvetica-Bold');
    doc.text('CGST Output @ 9%', colX.desc + 5, y);
    doc.text('9%', colX.rate + 5, y);
    doc.text((invoice.gstTotal / 2).toFixed(2), 540, y, { align: 'right' });
    y += 15;
    doc.text('SGST Output @ 9%', colX.desc + 5, y);
    doc.text('9%', colX.rate + 5, y);
    doc.text((invoice.gstTotal / 2).toFixed(2), 540, y, { align: 'right' });

    // Total Row
    doc.rect(50, tableBottom, 495, 20).stroke();
    doc.fontSize(9).font('Helvetica-Bold').text('Total', colX.desc + 5, tableBottom + 5);
    const totalQty = invoice.items.reduce((acc, i) => acc + i.quantity, 0);
    doc.text(`${totalQty} Pcs`, colX.qty + 5, tableBottom + 5);
    doc.fontSize(11).text(`₹ ${invoice.grandTotal.toFixed(2)}`, 540, tableBottom + 5, { align: 'right' });

    // Footer Area
    y = tableBottom + 30;
    doc.fontSize(8).font('Helvetica-Bold').text('Amount Chargeable (in words)', 55, y);
    doc.fontSize(9).text(numberToWords(invoice.grandTotal), 55, y + 12);

    y += 40;
    doc.fontSize(8).font('Helvetica-Bold').text('Declaration', 55, y);
    doc.moveTo(55, y + 10).lineTo(105, y + 10).stroke();
    doc.fontSize(7).font('Helvetica').text('We declare that this invoice shows the actual price of the goods described and that all particulars are true and correct.', 55, y + 15, { width: 220 });

    // Signatory Area (Bottom Right)
    const sigY = 680;
    doc.fontSize(9).font('Helvetica-Bold').text('for Vikalp Electric & Refrigeration', 350, sigY, { align: 'right', width: 195 });
    doc.fontSize(8).text('Authorised Signatory', 350, sigY + 45, { align: 'right', width: 195 });

    // Jurisdiction (Center Bottom)
    doc.fontSize(8).font('Helvetica-Bold').text('SUBJECT TO JAMNAGAR JURISDICTION.', 50, 750, { align: 'center', width: 495 });
    doc.fontSize(7).font('Helvetica').text('This is a Computer Generated Invoice', 50, 762, { align: 'center', width: 495 });

    doc.end();
});

module.exports = {
    createInvoice,
    getInvoices,
    getInvoiceById,
    downloadInvoicePDF,
};
