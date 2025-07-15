const express = require('express');
const { body, param } = require('express-validator');
const { authenticate } = require('../middleware/auth.middleware');
const { authorizeAdmin } = require('../middleware/role.middleware');
const {
  getAllProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
  getCategories
} = require('../controllers/product.controller');

const router = express.Router();

// Validation rules
const createProductValidation = [
  body('name')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Product name must be between 2 and 100 characters'),
  body('description')
    .trim()
    .isLength({ min: 10, max: 500 })
    .withMessage('Description must be between 10 and 500 characters'),
  body('price')
    .isFloat({ min: 0.01 })
    .withMessage('Price must be a positive number'),
  body('category')
    .isIn(['electronics', 'clothing', 'books', 'home', 'sports', 'beauty', 'other'])
    .withMessage('Invalid category'),
  body('stock')
    .isInt({ min: 0 })
    .withMessage('Stock must be a non-negative integer'),
  body('image')
    .optional()
    .isURL()
    .withMessage('Image must be a valid URL')
];

const updateProductValidation = [
  body('name')
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Product name must be between 2 and 100 characters'),
  body('description')
    .optional()
    .trim()
    .isLength({ min: 10, max: 500 })
    .withMessage('Description must be between 10 and 500 characters'),
  body('price')
    .optional()
    .isFloat({ min: 0.01 })
    .withMessage('Price must be a positive number'),
  body('category')
    .optional()
    .isIn(['electronics', 'clothing', 'books', 'home', 'sports', 'beauty', 'other'])
    .withMessage('Invalid category'),
  body('stock')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Stock must be a non-negative integer'),
  body('image')
    .optional()
    .isURL()
    .withMessage('Image must be a valid URL')
];

const productIdValidation = [
  param('id')
    .isMongoId()
    .withMessage('Invalid product ID')
];

// Public routes
router.get('/', getAllProducts);
router.get('/categories', getCategories);
router.get('/:id', productIdValidation, getProductById);

// Admin routes
router.post('/', authenticate, authorizeAdmin, createProductValidation, createProduct);
router.put('/:id', authenticate, authorizeAdmin, productIdValidation, updateProductValidation, updateProduct);
router.delete('/:id', authenticate, authorizeAdmin, productIdValidation, deleteProduct);

module.exports = router;