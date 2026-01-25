const asyncHandler = require('express-async-handler');
const Complaint = require('../models/Complaint');
const Customer = require('../models/Customer');

// @desc    Create new complaint
// @route   POST /api/complaints
// @access  Private/Admin
const createComplaint = asyncHandler(async (req, res) => {
    const { customerId, services, description } = req.body;

    const customer = await Customer.findById(customerId);

    if (!customer) {
        res.status(404);
        throw new Error('Customer not found');
    }

    // Generate a simple complaint ID: VE-YYYYMMDD-XXXX
    const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const count = await Complaint.countDocuments({
        createdAt: { $gte: new Date().setHours(0, 0, 0, 0) },
    });
    const complaintId = `VE-${date}-${(count + 1).toString().padStart(3, '0')}`;

    const complaint = await Complaint.create({
        complaintId,
        customer: customerId,
        mobile: customer.mobile,
        services,
        description,
    });

    res.status(201).json(complaint);
});

// @desc    Get all complaints
// @route   GET /api/complaints
// @access  Private/Admin
const getComplaints = asyncHandler(async (req, res) => {
    const complaints = await Complaint.find({}).populate('customer', 'name mobile').sort('-createdAt');
    res.json(complaints);
});

// @desc    Update complaint status
// @route   PUT /api/complaints/:id
// @access  Private/Admin
const updateComplaintStatus = asyncHandler(async (req, res) => {
    const { status } = req.body;
    const complaint = await Complaint.findById(req.params.id);

    if (complaint) {
        complaint.status = status || complaint.status;
        const updatedComplaint = await complaint.save();
        res.json(updatedComplaint);
    } else {
        res.status(404);
        throw new Error('Complaint not found');
    }
});

module.exports = {
    createComplaint,
    getComplaints,
    updateComplaintStatus,
};
