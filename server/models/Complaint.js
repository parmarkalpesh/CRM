const mongoose = require('mongoose');

const complaintSchema = mongoose.Schema(
    {
        complaintId: {
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
        services: [{
            type: String,
            required: true,
            enum: ['AC', 'Fridge', 'CCTV', 'Other'],
        }],
        description: {
            type: String,
            required: true,
        },
        status: {
            type: String,
            required: true,
            enum: ['Pending', 'Working', 'Completed'],
            default: 'Pending',
        },
    },
    {
        timestamps: true,
    }
);

const Complaint = mongoose.model('Complaint', complaintSchema);

module.exports = Complaint;
