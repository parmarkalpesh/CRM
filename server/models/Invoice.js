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
                quantity: { type: Number, required: true },
                unitPrice: { type: Number, required: true },
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
    },
    {
        timestamps: true,
    }
);

const Invoice = mongoose.model('Invoice', invoiceSchema);

module.exports = Invoice;
