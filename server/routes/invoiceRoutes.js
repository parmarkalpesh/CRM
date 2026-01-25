const express = require('express');
const router = express.Router();
const {
    createInvoice,
    getInvoices,
    getInvoiceById,
    downloadInvoicePDF,
} = require('../controllers/invoiceController');
const { protect } = require('../middlewares/authMiddleware');

router.route('/').post(protect, createInvoice).get(protect, getInvoices);
router.route('/:id').get(protect, getInvoiceById);
router.route('/:id/download-pdf').get(protect, downloadInvoicePDF);

module.exports = router;
