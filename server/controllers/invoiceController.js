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
        const lineSubtotal = item.quantity * item.unitPrice;
        const lineGst = (lineSubtotal * item.gstPercent) / 100;
        const lineTotal = lineSubtotal + lineGst;

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

    // Colors
    const colors = {
        black: '#000000',
        gray900: '#111827',
        gray600: '#4b5563',
        gray500: '#6b7280',
        gray100: '#f3f4f6',
    };

    // Header with simple branding
    doc.fillColor(colors.black)
        .fontSize(24)
        .font('Helvetica-Bold')
        .text('Vikalp Electronics', 50, 45);

    doc.fontSize(10)
        .font('Helvetica-Bold')
        .fillColor(colors.gray600)
        .text('SALES & SERVICE SPECIALIST', 50, 75, { characterSpacing: 2 });

    // Shop Details in Header
    doc.fontSize(8)
        .font('Helvetica')
        .fillColor(colors.gray500)
        .text('Murlidhar Nagar 1, Gokul Nagar, Jamnagar-361004', 50, 92)
        .text('Mo: +91 9374170929 / +91 7016223029', 50, 104);

    // Invoice Title
    doc.fontSize(36)
        .font('Helvetica-Bold')
        .fillColor(colors.gray100)
        .text('INVOICE', 350, 45, { align: 'right' });

    doc.moveTo(50, 120)
        .lineTo(545, 120)
        .lineWidth(2)
        .strokeColor(colors.black)
        .stroke();

    // Bill To & Invoice Info
    const infoY = 145;
    doc.fillColor(colors.gray600)
        .fontSize(9)
        .font('Helvetica-Bold')
        .text('BILL TO:', 50, infoY);

    doc.fillColor(colors.black)
        .fontSize(12)
        .font('Helvetica-Bold')
        .text(invoice.customer?.name || 'Customer Name', 50, infoY + 15);

    doc.fontSize(10)
        .font('Helvetica')
        .fillColor(colors.gray600)
        .text(invoice.customer?.address || '', 50, infoY + 32, { width: 250 });

    doc.fontSize(10)
        .font('Helvetica-Bold')
        .fillColor(colors.black)
        .text(`Phone: ${invoice.mobile}`, 50, infoY + 55);

    // Right side info
    doc.fillColor(colors.gray600)
        .fontSize(9)
        .font('Helvetica-Bold')
        .text('INVOICE DETAILS:', 350, infoY);

    doc.fillColor(colors.black)
        .fontSize(10)
        .font('Helvetica')
        .text(`Invoice Number:`, 350, infoY + 15)
        .font('Helvetica-Bold')
        .text(`#${invoice.invoiceNumber}`, 450, infoY + 15, { align: 'right' });

    doc.font('Helvetica')
        .text(`Invoice Date:`, 350, infoY + 30)
        .font('Helvetica-Bold')
        .text(`${new Date(invoice.invoiceDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}`, 420, infoY + 30, { align: 'right' });

    // Amount Due Box
    doc.rect(350, infoY + 55, 195, 45)
        .fillColor(colors.gray100)
        .fill();

    doc.fillColor(colors.black)
        .fontSize(9)
        .font('Helvetica-Bold')
        .text('GRAND TOTAL:', 360, infoY + 63);

    doc.fontSize(18)
        .font('Helvetica-Bold')
        .text(`INR ${invoice.grandTotal?.toLocaleString()}`, 360, infoY + 78);

    // Table Header
    const tableTop = 270; // Moved up slightly
    const col1X = 50;
    const col2X = 350;
    const col3X = 420;
    const col4X = 500;

    doc.fillColor(colors.black)
        .fontSize(9)
        .font('Helvetica-Bold');

    doc.text('SERVICE DESCRIPTION', col1X, tableTop);
    doc.text('QTY', col2X, tableTop, { width: 40, align: 'center' });
    doc.text('UNIT PRICE', col3X, tableTop, { width: 70, align: 'right' });
    doc.text('TOTAL', col4X, tableTop, { width: 45, align: 'right' });

    doc.moveTo(50, tableTop + 12)
        .lineTo(545, tableTop + 12)
        .lineWidth(1)
        .strokeColor(colors.black)
        .stroke();

    // Table Rows
    let yPosition = tableTop + 20;
    invoice.items?.forEach((item, index) => {
        const itemHeight = doc.heightOfString(item.serviceName, { width: 280 });

        doc.fontSize(9) // Smaller font for items
            .font('Helvetica-Bold')
            .fillColor(colors.black)
            .text(item.serviceName, col1X, yPosition, { width: 280 });

        doc.font('Helvetica')
            .text(item.quantity.toString(), col2X, yPosition, { width: 40, align: 'center' });

        doc.text(`${item.unitPrice?.toLocaleString()}`, col3X, yPosition, { width: 70, align: 'right' });

        doc.font('Helvetica-Bold')
            .text(`${item.lineTotal?.toLocaleString()}`, col4X, yPosition, { width: 45, align: 'right' });

        yPosition += Math.max(itemHeight, 12) + 8; // Tighter vertical spacing

        // Row separator
        doc.moveTo(50, yPosition - 4)
            .lineTo(545, yPosition - 4)
            .lineWidth(0.5)
            .strokeColor(colors.gray100)
            .stroke();
    });

    // Summary Section - Compacted
    const summaryX = 350;
    yPosition += 5;

    doc.fillColor(colors.gray600)
        .fontSize(9)
        .font('Helvetica')
        .text('Subtotal:', summaryX, yPosition);
    doc.fillColor(colors.black)
        .text(`${invoice.subtotal?.toLocaleString()}`, col4X, yPosition, { width: 45, align: 'right' });

    yPosition += 15;
    doc.fillColor(colors.gray600)
        .text('Tax (GST):', summaryX, yPosition);
    doc.fillColor(colors.black)
        .text(`${invoice.gstTotal?.toLocaleString()}`, col4X, yPosition, { width: 45, align: 'right' });

    yPosition += 20;
    doc.moveTo(summaryX, yPosition - 2)
        .lineTo(545, yPosition - 2)
        .lineWidth(1)
        .strokeColor(colors.black)
        .stroke();

    doc.fontSize(11)
        .font('Helvetica-Bold')
        .text('GRAND TOTAL:', summaryX, yPosition);
    doc.text(`INR ${invoice.grandTotal?.toLocaleString()}`, col4X, yPosition, { width: 45, align: 'right' });

    // Footer
    const footerY = 730;

    // Bottom Branding Section
    doc.rect(50, footerY - 5, 495, 0.5)
        .fillColor(colors.gray200)
        .fill();

    doc.fillColor(colors.black)
        .fontSize(9)
        .font('Helvetica-Bold')
        .text('NOTES & INSTRUCTIONS:', 50, footerY + 5);

    doc.fontSize(8)
        .font('Helvetica')
        .fillColor(colors.gray600);

    const notes = [
        '1. This is a computer generated invoice and does not require a physical signature.',
        '2. Service warranty applies as per company policy from the date of invoice.'
    ];

    notes.forEach((note, i) => {
        doc.text(note, 50, footerY + 18 + (i * 10));
    });

    // Authorized Signatory
    doc.fillColor(colors.black)
        .font('Helvetica-Bold')
        .fontSize(10)
        .text('FOR, VIKALP ELECTRONICS', 350, footerY + 35, { align: 'right' });

    doc.fontSize(8)
        .font('Helvetica')
        .text('Authorized Signatory', 350, footerY + 85, { align: 'right' });

    // Shop Info Footer - Stick to bottom
    const bottomBarY = 805;
    doc.rect(0, bottomBarY, 612, 38)
        .fillColor(colors.black)
        .fill();

    doc.fillColor('#ffffff')
        .fontSize(10)
        .font('Helvetica-Bold')
        .text('Vikalp Electronics', 0, bottomBarY + 8, { align: 'center', width: 612 });

    doc.fontSize(7.5)
        .font('Helvetica')
        .text('Murlidhar Nagar 1, Gokul Nagar, Jamnagar-361004 | Mo: +91 9374170929 / +91 7016223029', 0, bottomBarY + 22, { align: 'center', width: 612 });

    doc.end();
});

// @desc    Delete invoice
// @route   DELETE /api/invoices/:id
// @access  Private/Admin
const deleteInvoice = asyncHandler(async (req, res) => {
    const invoice = await Invoice.findById(req.params.id);

    if (invoice) {
        await Invoice.deleteOne({ _id: req.params.id });
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
