const { pool } = require('../config/db');
const { hashPassword, comparePassword, generateToken } = require('../utils/authHelpers');

/**
 * Register a new student
 */
const register = async (req, res, next) => {
  const client = await pool.connect();
  try {
    const {
      email,
      password,
      fullName,
      rollNumber,
      branch,
      graduationYear,
      cgpa,
      activeBacklogs = 0
    } = req.body;

    // Validate request inputs
    if (!email || !password || !fullName || !rollNumber || !branch || !graduationYear || !cgpa) {
      return res.status(400).json({
        status: 'error',
        message: 'Please provide all required registration fields.'
      });
    }

    // Begin Transaction
    await client.query('BEGIN');

    // 1. Check if user already exists
    const userCheck = await client.query('SELECT 1 FROM users WHERE email = $1', [email]);
    if (userCheck.rowCount > 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        status: 'error',
        message: 'A user with this email address already exists.'
      });
    }

    // 2. Check if roll number already exists
    const rollCheck = await client.query('SELECT 1 FROM student_profiles WHERE roll_number = $1', [rollNumber]);
    if (rollCheck.rowCount > 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        status: 'error',
        message: 'A student with this roll number already exists.'
      });
    }

    // 3. Hash password and insert user (role = 'student')
    const passwordHash = await hashPassword(password);
    const userInsertResult = await client.query(
      `INSERT INTO users (email, password_hash, role)
       VALUES ($1, $2, 'student')
       RETURNING id`,
      [email, passwordHash]
    );
    const userId = userInsertResult.rows[0].id;

    // 4. Insert student profile details
    await client.query(
      `INSERT INTO student_profiles (user_id, full_name, roll_number, branch, graduation_year, cgpa, active_backlogs)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [userId, fullName, rollNumber, branch, parseInt(graduationYear), parseFloat(cgpa), parseInt(activeBacklogs)]
    );

    // Commit Transaction
    await client.query('COMMIT');

    res.status(201).json({
      status: 'success',
      message: 'Student registered successfully. You can now login.'
    });

  } catch (error) {
    await client.query('ROLLBACK');
    next(error);
  } finally {
    client.release();
  }
};

/**
 * User Login (Student & Admin)
 */
const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        status: 'error',
        message: 'Please provide both email and password.'
      });
    }

    // 1. Fetch user details
    const userResult = await pool.query(
      `SELECT id, email, password_hash, role
       FROM users
       WHERE email = $1`,
      [email]
    );

    if (userResult.rowCount === 0) {
      return res.status(401).json({
        status: 'error',
        message: 'Invalid email or password.'
      });
    }

    const user = userResult.rows[0];

    // 2. Validate password
    const isMatch = await comparePassword(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({
        status: 'error',
        message: 'Invalid email or password.'
      });
    }

    // 3. Generate token
    const token = generateToken(user.id, user.role);

    // 4. Fetch profile details if the role is student
    let profile = null;
    if (user.role === 'student') {
      const profileResult = await pool.query(
        `SELECT id, full_name, roll_number, branch, graduation_year, cgpa, active_backlogs, resume_url
         FROM student_profiles
         WHERE user_id = $1`,
        [user.id]
      );
      if (profileResult.rowCount > 0) {
        profile = profileResult.rows[0];
      }
    }

    res.status(200).json({
      status: 'success',
      message: 'Logged in successfully.',
      token,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        profile
      }
    });

  } catch (error) {
    next(error);
  }
};

module.exports = {
  register,
  login
};
