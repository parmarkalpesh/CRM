const express = require('express');
const router = express.Router();
const {
    createComplaint,
    getComplaints,
    updateComplaintStatus,
} = require('../controllers/complaintController');
const { protect } = require('../middlewares/authMiddleware');

router.route('/').post(protect, createComplaint).get(protect, getComplaints);
router.route('/:id').put(protect, updateComplaintStatus);

module.exports = router;
