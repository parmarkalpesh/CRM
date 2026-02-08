const mongoose = require('mongoose');

const invoiceSchema = mongoose.Schema(
    {
        invoiceNumber: {
            type: String,
            required: true,
            unique: true,
        },
        customer: {
            type: mongoose.Schema.Types.ObjectId,
            required: true,
            ref: 'Customer',
        },
        mobile: {
            type: String,
            required: true,
        },
        items: [
            {
                serviceName: { type: String, required: true },
                hsnCode: { type: String, default: '' },
                quantity: { type: Number, required: true },
                unitPrice: { type: Number, required: true },
                per: { type: String, default: 'Pcs' },
                discount: { type: Number, default: 0 },
                gstPercent: { type: Number, required: true },
                lineTotal: { type: Number, required: true },
            },
        ],
        subtotal: {
            type: Number,
            required: true,
        },
        gstTotal: {
            type: Number,
            required: true,
        },
        grandTotal: {
            type: Number,
            required: true,
        },
        paymentStatus: {
            type: String,
            required: true,
            enum: ['Paid', 'Unpaid', 'Partial'],
            default: 'Unpaid',
        },
        invoiceDate: {
            type: Date,
            default: Date.now,
        },
        deliveryNote: { type: String, default: '-' },
        modeTermsOfPayment: { type: String, default: '-' },
        referenceNoAndDate: { type: String, default: '-' },
        otherReferences: { type: String, default: '-' },
        dispatchDocNo: { type: String, default: '-' },
        deliveryNoteDate: { type: Date },
        dispatchedThrough: { type: String, default: '-' },
        destination: { type: String, default: '-' },
        termsOfDelivery: { type: String, default: '-' },
    },
    {
        timestamps: true,
    }
);

const Invoice = mongoose.model('Invoice', invoiceSchema);

module.exports = Invoice;
