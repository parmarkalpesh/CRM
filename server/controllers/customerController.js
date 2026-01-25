const asyncHandler = require('express-async-handler');
const Customer = require('../models/Customer');
const Complaint = require('../models/Complaint');
const Invoice = require('../models/Invoice');

// @desc    Register a new customer
// @route   POST /api/customers
// @access  Private/Admin
const addCustomer = asyncHandler(async (req, res) => {
    const { name, mobile, address } = req.body;

    const customerExists = await Customer.findOne({ mobile });

    if (customerExists) {
        res.status(400);
        throw new Error('Customer with this mobile number already exists');
    }

    const customer = await Customer.create({
        name,
        mobile,
        address,
    });

    if (customer) {
        res.status(201).json(customer);
    } else {
        res.status(400);
        throw new Error('Invalid customer data');
    }
});

// @desc    Get all customers
// @route   GET /api/customers
// @access  Private/Admin
const getCustomers = asyncHandler(async (req, res) => {
    const customers = await Customer.find({}).sort('-createdAt');
    res.json(customers);
});

// @desc    Get customer by ID
// @route   GET /api/customers/:id
// @access  Private/Admin
const getCustomerById = asyncHandler(async (req, res) => {
    const customer = await Customer.findById(req.params.id);

    if (customer) {
        res.json(customer);
    } else {
        res.status(404);
        throw new Error('Customer not found');
    }
});

// @desc    Update customer
// @route   PUT /api/customers/:id
// @access  Private/Admin
const updateCustomer = asyncHandler(async (req, res) => {
    const { name, mobile, address } = req.body;

    const customer = await Customer.findById(req.params.id);

    if (customer) {
        customer.name = name || customer.name;
        customer.mobile = mobile || customer.mobile;
        customer.address = address || customer.address;

        const updatedCustomer = await customer.save();
        res.json(updatedCustomer);
    } else {
        res.status(404);
        throw new Error('Customer not found');
    }
});

// @desc    Get customer data by mobile (PUBLIC LOOKUP)
// @route   GET /api/customers/lookup/:mobile
// @access  Public
const lookupCustomer = asyncHandler(async (req, res) => {
    const { mobile } = req.params;

    const customer = await Customer.findOne({ mobile });

    if (!customer) {
        res.status(404);
        throw new Error('No records found for this mobile number');
    }

    // Fetch related data
    const complaints = await Complaint.find({ mobile }).sort('-createdAt');
    const invoices = await Invoice.find({ mobile }).sort('-createdAt');

    res.json({
        customer,
        complaints,
        invoices,
    });
});

// @desc    Delete customer
// @route   DELETE /api/customers/:id
// @access  Private/Admin
const deleteCustomer = asyncHandler(async (req, res) => {
    const customer = await Customer.findById(req.params.id);

    if (customer) {
        // Also remove related data to maintain integrity
        await Complaint.deleteMany({ customer: req.params.id });
        await Invoice.deleteMany({ customer: req.params.id });
        await Customer.deleteOne({ _id: req.params.id });

        res.json({ message: 'Customer and all related records removed' });
    } else {
        res.status(404);
        throw new Error('Customer not found');
    }
});

module.exports = {
    addCustomer,
    getCustomers,
    getCustomerById,
    updateCustomer,
    lookupCustomer,
    deleteCustomer,
};
