const { body, validationResult } = require("express-validator");

const validateQuery = [
  body("prompt").isString().isLength({ min: 3, max: 500 }),
  body("user_location").optional().isObject(),
  body("user_location.lat").optional().isFloat({ min: -90, max: 90 }),
  body("user_location.lng").optional().isFloat({ min: -180, max: 180 }),
  body("max_results").optional().isInt({ min: 1, max: 10 }),
  body("use_cache").optional().isBoolean(),
];

const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  next();
};

module.exports = {
  validateQuery,
  handleValidationErrors,
};
