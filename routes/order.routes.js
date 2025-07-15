const express = require('express');
const { body, param } = require('express-validator');
const { authenticate } = require('../middleware/auth.middleware');
const { authorizeAdmin } = require('../middleware/role.middleware');
const {
  createOrder,
  getOrders,
  getOrderById,
  cancelOrder,
  getAllOrders,
  updateOrderStatus
} = require('../controllers/order.controller');

const router = express.Router();

// Validation rules
const orderCreationValidation = [
  body('shippingAddress.street').notEmpty().withMessage('Street is required'),
  body('shippingAddress.city').notEmpty().withMessage('City is required'),
  body('shippingAddress.state').notEmpty().withMessage('State is required'),
  body('shippingAddress.zipCode').notEmpty().withMessage('Zip Code is required'),
  body('shippingAddress.country').optional().isString()
];

const updateOrderStatusValidation = [
  body('status')
    .isIn(['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled'])
    .withMessage('Invalid order status')
];

const orderIdParamValidation = [
  param('orderId').isMongoId().withMessage('Invalid order ID')
];

// 🔒 All routes require authentication
router.use(authenticate);

// 👤 Customer routes
router.post('/', orderCreationValidation, createOrder);
router.get('/', getOrders);
router.get('/:orderId', orderIdParamValidation, getOrderById);
router.patch('/:orderId/cancel', orderIdParamValidation, cancelOrder);

// 🛡️ Admin routes
router.get('/admin/all', authorizeAdmin, getAllOrders);
router.patch('/admin/:orderId/status', authorizeAdmin, orderIdParamValidation, updateOrderStatusValidation, updateOrderStatus);

module.exports = router;
