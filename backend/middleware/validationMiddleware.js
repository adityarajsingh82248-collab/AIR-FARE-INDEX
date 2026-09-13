/**
 * Higher-order middleware to run schema validation
 * @param {Function} validatorFn - Function that returns { isValid, errors, data }
 */
export function validate(validatorFn) {
  return (req, res, next) => {
    const result = validatorFn(req.body);
    if (!result.isValid) {
      return res.status(400).json({
        success: false,
        message: result.errors[0] || 'Validation failed',
        errors: result.errors,
      });
    }
    req.validatedData = result.data;
    next();
  };
}
