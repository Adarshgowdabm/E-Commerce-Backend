const { validationResult } = require('express-validator');
const Order = require('../models/order.model');
const Cart = require('../models/cart.model');
const Product = require('../models/product.model');

// Create order from cart
const createOrder = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const userId = req.user._id;
    const { shippingAddress, notes } = req.body;

    // Get user's cart
    const cart = await Cart.findOne({ user: userId }).populate('items.product');
    if (!cart || cart.items.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Cart is empty'
      });
    }

    // Validate stock availability and prepare order items
    const orderItems = [];
    let totalAmount = 0;
    let totalItems = 0;

    for (const cartItem of cart.items) {
      const product = await Product.findById(cartItem.product._id);
      
      if (!product || !product.isActive) {
        return res.status(400).json({
          success: false,
          message: `Product ${cartItem.product.name} is no longer available`
        });
      }

      if (product.stock < cartItem.quantity) {
        return res.status(400).json({
          success: false,
          message: `Insufficient stock for ${product.name}. Only ${product.stock} available`
        });
      }

      const itemTotal = product.price * cartItem.quantity;
      
      orderItems.push({
        product: product._id,
        name: product.name,
        quantity: cartItem.quantity,
        price: product.price,
        total: itemTotal
      });

      totalAmount += itemTotal;
      totalItems += cartItem.quantity;
    }

    // Create order
    const orderNumber = 'ORD-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9).toUpperCase();

    const order = new Order({
      user: userId,
      items: orderItems,
      totalAmount,
      totalItems,
      shippingAddress,
      notes,
      orderNumber 
    });

    await order.save();


    // Update product stock
    for (const item of orderItems) {
      await Product.findByIdAndUpdate(
        item.product,
        { $inc: { stock: -item.quantity } }
      );
    }

    // Clear cart
    cart.items = [];
    await cart.save();

    // Populate order with product details
    await order.populate('items.product', 'name description category image');

    res.status(201).json({
      success: true,
      message: 'Order created successfully',
      data: { order }
    });
  } catch (error) {
    console.error('Create order error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error creating order',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

// Get user's orders
const getOrders = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      status,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    const userId = req.user._id;

    // Build query
    const query = { user: userId };
    if (status) {
      query.status = status;
    }

    // Calculate pagination
    const pageNumber = parseInt(page, 10);
    const pageSize = parseInt(limit, 10);
    const skip = (pageNumber - 1) * pageSize;

    // Build sort object
    const sort = {};
    sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

    // Get orders
    const orders = await Order.find(query)
      .sort(sort)
      .skip(skip)
      .limit(pageSize)
      .populate('items.product', 'name description category image');

    // Get total count
    const totalOrders = await Order.countDocuments(query);
    const totalPages = Math.ceil(totalOrders / pageSize);

    res.json({
      success: true,
      data: {
        orders,
        pagination: {
          currentPage: pageNumber,
          totalPages,
          totalOrders,
          hasNextPage: pageNumber < totalPages,
          hasPrevPage: pageNumber > 1
        }
      }
    });
  } catch (error) {
    console.error('Get orders error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching orders',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

// Get single order
const getOrderById = async (req, res) => {
  try {
    const { orderId } = req.params;
    const userId = req.user._id;

    const order = await Order.findOne({ _id: orderId, user: userId })
      .populate('items.product', 'name description category image')
      .populate('user', 'name email');

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    res.json({
      success: true,
      data: { order }
    });
  } catch (error) {
    console.error('Get order error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching order',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

// Cancel order (only if status is pending)
const cancelOrder = async (req, res) => {
  try {
    const { orderId } = req.params;
    const userId = req.user._id;

    const order = await Order.findOne({ _id: orderId, user: userId });
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    if (order.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: 'Order cannot be cancelled. Current status: ' + order.status
      });
    }

    // Update order status
    order.status = 'cancelled';
    await order.save();

    // Restore product stock
    for (const item of order.items) {
      await Product.findByIdAndUpdate(
        item.product,
        { $inc: { stock: item.quantity } }
      );
    }

    res.json({
      success: true,
      message: 'Order cancelled successfully',
      data: { order }
    });
  } catch (error) {
    console.error('Cancel order error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error cancelling order',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

// Admin: Get all orders
const getAllOrders = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      status,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    // Build query
    const query = {};
    if (status) {
      query.status = status;
    }

    // Calculate pagination
    const pageNumber = parseInt(page, 10);
    const pageSize = parseInt(limit, 10);
    const skip = (pageNumber - 1) * pageSize;

    // Build sort object
    const sort = {};
    sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

    // Get orders
    const orders = await Order.find(query)
      .sort(sort)
      .skip(skip)
      .limit(pageSize)
      .populate('user', 'name email')
      .populate('items.product', 'name description category image');

    // Get total count
    const totalOrders = await Order.countDocuments(query);
    const totalPages = Math.ceil(totalOrders / pageSize);

    res.json({
      success: true,
      data: {
        orders,
        pagination: {
          currentPage: pageNumber,
          totalPages,
          totalOrders,
          hasNextPage: pageNumber < totalPages,
          hasPrevPage: pageNumber > 1
        }
      }
    });
  } catch (error) {
    console.error('Get all orders error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching orders',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

// Admin: Update order status
const updateOrderStatus = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { orderId } = req.params;
    const { status } = req.body;

    const order = await Order.findByIdAndUpdate(
      orderId,
      { status },
      { new: true, runValidators: true }
    ).populate('user', 'name email');

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    res.json({
      success: true,
      message: 'Order status updated successfully',
      data: { order }
    });
  } catch (error) {
    console.error('Update order status error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error updating order status',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

module.exports = {
  createOrder,
  getOrders,
  getOrderById,
  cancelOrder,
  getAllOrders,
  updateOrderStatus
};