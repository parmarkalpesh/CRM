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

    const colors = {
        black: '#000000',
        gray600: '#4b5563',
        gray500: '#6b7280',
    };

    // Header
    doc.fontSize(28).font('Helvetica-Bold').text('Vikalp Electronics', { align: 'left' });
    doc.fontSize(10).font('Helvetica').text('SALES & SERVICE SPECIALIST', { align: 'left', textOptions: { letterSpacing: 2 } });

    // Invoice title - right aligned
    doc.fontSize(40).font('Helvetica-Bold').text('INVOICE', { align: 'right' });

    doc.moveTo(50, 110).lineTo(545, 110).stroke();

    // Bill to and Invoice Details section
    doc.fontSize(10).font('Helvetica-Bold').text('BILL TO:', 50, 130);
    doc.fontSize(12).font('Helvetica-Bold').text(invoice.customer?.name || 'N/A', 50, 150);
    doc.fontSize(10).font('Helvetica').text(invoice.customer?.address || '', 50, 170);
    doc.fontSize(10).font('Helvetica-Bold').text(`Phone: ${invoice.mobile}`, 50, 190);

    // Invoice details - right side
    doc.fontSize(10).font('Helvetica').text(`Invoice #: ${invoice.invoiceNumber}`, 350, 130);
    doc.fontSize(10)
        .font('Helvetica')
        .text(`Date: ${new Date(invoice.invoiceDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}`, 350, 150);

    // Amount Due Box
    doc.rect(350, 185, 195, 35).stroke();
    doc.fontSize(9).font('Helvetica-Bold').text('AMOUNT DUE:', 360, 193);
    doc.fontSize(16).font('Helvetica-Bold').text(`₹ ${invoice.grandTotal?.toLocaleString()}`, 360, 210);

    // Table Header
    const tableTop = 250;
    const col1X = 50;
    const col2X = 380;
    const col3X = 430;
    const col4X = 500;

    doc.fontSize(9).font('Helvetica-Bold').text('SERVICE DESCRIPTION', col1X, tableTop);
    doc.text('QTY', col2X, tableTop);
    doc.text('UNIT PRICE', col3X, tableTop);
    doc.text('TOTAL', col4X, tableTop, { align: 'right' });

    // Table line
    doc.moveTo(50, tableTop + 15).lineTo(545, tableTop + 15).stroke();

    // Table rows
    let yPosition = tableTop + 25;
    invoice.items?.forEach((item) => {
        doc.fontSize(10).font('Helvetica').text(item.serviceName, col1X, yPosition, { width: 300 });
        doc.text(item.quantity.toString(), col2X, yPosition);
        doc.text(`₹ ${item.unitPrice?.toLocaleString()}`, col3X, yPosition);
        doc.text(`₹ ${item.lineTotal?.toLocaleString()}`, col4X, yPosition, { align: 'right' });
        yPosition += 25;
    });

    // Summary section
    const summaryStartY = yPosition + 10;
    doc.moveTo(50, summaryStartY).lineTo(545, summaryStartY).stroke();

    yPosition = summaryStartY + 15;
    doc.fontSize(10).font('Helvetica');
    doc.text('Subtotal:', 350, yPosition);
    doc.text(`₹ ${invoice.subtotal?.toLocaleString()}`, 500, yPosition, { align: 'right' });

    yPosition += 20;
    doc.text('Tax (GST):', 350, yPosition);
    doc.text(`₹ ${invoice.gstTotal?.toLocaleString()}`, 500, yPosition, { align: 'right' });

    yPosition += 25;
    doc.fontSize(12).font('Helvetica-Bold');
    doc.text('GRAND TOTAL:', 350, yPosition);
    doc.text(`₹ ${invoice.grandTotal?.toLocaleString()}`, 500, yPosition, { align: 'right' });

    // Footer section
    const footerY = 720;
    doc.fontSize(9).font('Helvetica-Bold').text('NOTES & INSTRUCTIONS:', 50, footerY);
    doc.fontSize(9)
        .font('Helvetica')
        .text('1. This is a computer generated invoice and does not require a physical signature.', 50, footerY + 18, { width: 480 });
    doc.fontSize(9)
        .font('Helvetica')
        .text('2. Service warranty applies as per company policy from the date of invoice.', 50, footerY + 36, { width: 480 });
    doc.fontSize(9)
        .font('Helvetica')
        .text('3. Please quote the invoice number for any future correspondence.', 50, footerY + 54, { width: 480 });

    // Contact info
    doc.fontSize(10).font('Helvetica-Bold').text('Payment via UPI: 9374170929@ybl', 50, footerY + 80);
    doc.fontSize(9)
        .font('Helvetica')
        .text('GokulNagar, Jamnagar | +91 9374170929 | vikalp.electronics@gmail.com', 50, footerY + 100, { align: 'center', width: 495 });

    doc.end();
});

module.exports = {
    createInvoice,
    getInvoices,
    getInvoiceById,
    downloadInvoicePDF,
};
