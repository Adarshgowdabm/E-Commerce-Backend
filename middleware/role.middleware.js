const authorizeRole = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Access denied. Please authenticate first.'
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Access denied. Required role: ${roles.join(' or ')}. Your role: ${req.user.role}`
      });
    }

    next();
  };
};

const authorizeAdmin = authorizeRole('admin');
const authorizeCustomer = authorizeRole('customer');
const authorizeAny = authorizeRole('customer', 'admin');

module.exports = {
  authorizeRole,
  authorizeAdmin,
  authorizeCustomer,
  authorizeAny
};