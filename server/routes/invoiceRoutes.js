const express = require('express');
const router = express.Router();
const {
    createInvoice,
    getInvoices,
    getInvoiceById,
    downloadInvoicePDF,
    deleteInvoice,
} = require('../controllers/invoiceController');
const { protect } = require('../middlewares/authMiddleware');

router.route('/').post(protect, createInvoice).get(protect, getInvoices);
router.route('/:id').get(protect, getInvoiceById).delete(protect, deleteInvoice);
router.route('/:id/download-pdf').get(protect, downloadInvoicePDF);
router.route('/public/download-pdf/:id').get(downloadInvoicePDF);

module.exports = router;
