const mongoose = require('mongoose');

const customerSchema = mongoose.Schema(
    {
        name: {
            type: String,
            required: true,
        },
        mobile: {
            type: String,
            required: true,
            unique: true,
            index: true,
        },
        address: {
            type: String,
            required: true,
        },
    },
    {
        timestamps: true,
    }
);

const Customer = mongoose.model('Customer', customerSchema);

module.exports = Customer;
