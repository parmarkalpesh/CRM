const express = require('express');
const router = express.Router();
const {
    addCustomer,
    getCustomers,
    getCustomerById,
    updateCustomer,
    lookupCustomer,
    deleteCustomer,
} = require('../controllers/customerController');
const { protect } = require('../middlewares/authMiddleware');

router.route('/').post(protect, addCustomer).get(protect, getCustomers);
router.route('/lookup/:mobile').get(lookupCustomer);
router.route('/:id')
    .get(protect, getCustomerById)
    .put(protect, updateCustomer)
    .delete(protect, deleteCustomer);

module.exports = router;
