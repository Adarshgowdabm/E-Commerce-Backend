const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please provide product name'],
    trim: true,
    maxlength: [100, 'Product name cannot exceed 100 characters']
  },
  description: {
    type: String,
    required: [true, 'Please provide product description'],
    maxlength: [500, 'Description cannot exceed 500 characters']
  },
  price: {
    type: Number,
    required: [true, 'Please provide product price'],
    min: [0, 'Price cannot be negative']
  },
  category: {
    type: String,
    required: [true, 'Please provide product category'],
    enum: ['electronics', 'clothing', 'books', 'home', 'sports', 'beauty', 'other'],
    default: 'other'
  },
  stock: {
    type: Number,
    required: [true, 'Please provide stock quantity'],
    min: [0, 'Stock cannot be negative'],
    default: 0
  },
  image: {
    type: String,
    default: 'https://via.placeholder.com/300x200?text=No+Image'
  },
  isActive: {
    type: Boolean,
    default: true
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, {
  timestamps: true
});

// Add text index for search functionality
productSchema.index({ name: 'text', description: 'text', category: 'text' });

// Add compound index for better query performance
productSchema.index({ category: 1, isActive: 1 });
productSchema.index({ price: 1 });

module.exports = mongoose.model('Product', productSchema);