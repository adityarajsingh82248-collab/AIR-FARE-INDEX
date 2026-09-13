/**
 * Validates email format
 * @param {string} email
 */
export function isValidEmail(email) {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return typeof email === 'string' && re.test(email.trim());
}

/**
 * Validates registration payload
 * @param {Object} body
 */
export function validateRegister(body) {
  const errors = [];
  const { name, email, password } = body || {};

  if (!name || typeof name !== 'string' || name.trim().length < 2) {
    errors.push('Name must be at least 2 characters long.');
  }

  if (!email || !isValidEmail(email)) {
    errors.push('A valid email address is required.');
  }

  if (!password || typeof password !== 'string' || password.length < 8) {
    errors.push('Password must be at least 8 characters long.');
  }

  return {
    isValid: errors.length === 0,
    errors,
    data: {
      name: name ? name.trim() : '',
      email: email ? email.trim().toLowerCase() : '',
      password: password || '',
    },
  };
}

/**
 * Validates login payload
 * @param {Object} body
 */
export function validateLogin(body) {
  const errors = [];
  const { email, username, password } = body || {};
  const identifier = (email || username || '').trim();

  if (!identifier) {
    errors.push('Email or username is required.');
  }

  if (!password || typeof password !== 'string') {
    errors.push('Password is required.');
  }

  return {
    isValid: errors.length === 0,
    errors,
    data: {
      email: identifier.toLowerCase(),
      password: password || '',
    },
  };
}

/**
 * Validates status update payload
 * @param {Object} body
 */
export function validateStatusUpdate(body) {
  const { isActive } = body || {};
  if (typeof isActive !== 'boolean') {
    return {
      isValid: false,
      errors: ['isActive must be a boolean value (true or false).'],
    };
  }
  return { isValid: true, errors: [], data: { isActive } };
}

/**
 * Validates role update payload
 * @param {Object} body
 */
export function validateRoleUpdate(body) {
  const { role } = body || {};
  if (!['USER', 'ADMIN'].includes(role)) {
    return {
      isValid: false,
      errors: ['Role must be either USER or ADMIN.'],
    };
  }
  return { isValid: true, errors: [], data: { role } };
}
