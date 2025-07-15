const express = require('express');
const { body, param } = require('express-validator');
const { authenticate } = require('../middleware/auth.middleware');
const {
  getCart,
  addToCart,
  updateCartItem,
  removeFromCart,
  clearCart
} = require('../controllers/cart.controller');

const router = express.Router();

// Validation rules
const addToCartValidation = [
  body('productId')
    .isMongoId()
    .withMessage('Invalid product ID'),
  body('quantity')
    .isInt({ min: 1 })
    .withMessage('Quantity must be a positive integer')
];

const updateCartItemValidation = [
  param('productId')
    .isMongoId()
    .withMessage('Invalid product ID'),
  body('quantity')
    .isInt({ min: 1 })
    .withMessage('Quantity must be a positive integer')
];

const removeFromCartValidation = [
  param('productId')
    .isMongoId()
    .withMessage('Invalid product ID')
];

// All routes require authentication
router.use(authenticate);

// Routes
router.get('/', getCart);
router.post('/add', addToCartValidation, addToCart);
router.put('/item/:productId', updateCartItemValidation, updateCartItem);
router.delete('/item/:productId', removeFromCartValidation, removeFromCart);
router.delete('/clear', clearCart);

module.exports = router;