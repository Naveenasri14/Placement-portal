/**
 * Validation utility for student registration
 */
const validateRegisterInput = (req, res, next) => {
  const { email, password, fullName, rollNumber, branch, graduationYear, cgpa } = req.body;

  // Check required fields
  if (!email || !password || !fullName || !rollNumber || !branch || !graduationYear || !cgpa) {
    return res.status(400).json({
      status: 'error',
      message: 'All fields (email, password, fullName, rollNumber, branch, graduationYear, cgpa) are required.'
    });
  }

  // Email validation regex
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({
      status: 'error',
      message: 'Please provide a valid email address.'
    });
  }

  // Password length validation
  if (password.length < 8) {
    return res.status(400).json({
      status: 'error',
      message: 'Password must be at least 8 characters long.'
    });
  }

  // CGPA check (0 to 10 scale)
  const parsedCgpa = parseFloat(cgpa);
  if (isNaN(parsedCgpa) || parsedCgpa < 0 || parsedCgpa > 10) {
    return res.status(400).json({
      status: 'error',
      message: 'CGPA must be a valid number between 0.00 and 10.00.'
    });
  }

  // Graduation Year check (e.g. 2000 to 2100)
  const parsedYear = parseInt(graduationYear);
  if (isNaN(parsedYear) || parsedYear < 2000 || parsedYear > 2100) {
    return res.status(400).json({
      status: 'error',
      message: 'Please provide a valid graduation year.'
    });
  }

  next();
};

/**
 * Validation utility for user login
 */
const validateLoginInput = (req, res, next) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({
      status: 'error',
      message: 'Email and password are required.'
    });
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({
      status: 'error',
      message: 'Please provide a valid email format.'
    });
  }

  next();
};

module.exports = {
  validateRegisterInput,
  validateLoginInput
};
