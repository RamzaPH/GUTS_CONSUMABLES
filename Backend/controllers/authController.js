const jwt = require('jsonwebtoken');
const User = require('../models/User');

const generateToken = (user) => {
  return jwt.sign(
    { id: user.id, username: user.username, role: user.role },
    process.env.JWT_SECRET || 'your-secret-key-change-in-production',
    { expiresIn: '7d' }
  );
};

// Login user
const login = async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required.' });
  }

  try {
    const user = await User.findOne({ where: { username, isActive: true } });

    if (!user) {
      return res.status(401).json({ error: 'Invalid username or password.' });
    }

    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      return res.status(401).json({ error: 'Invalid username or password.' });
    }

    const token = generateToken(user);

    return res.json({
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        fullName: user.fullName,
        role: user.role,
      },
    });
  } catch (err) {
    console.error('[login]', err);
    return res.status(500).json({ error: 'Login failed.' });
  }
};

// Register new user (admin only)
const register = async (req, res) => {
  const { username, email, password, fullName, role } = req.body;

  if (!username || !email || !password || !fullName) {
    return res.status(400).json({ error: 'All fields are required.' });
  }

  if (!['admin', 'staff'].includes(role)) {
    return res.status(400).json({ error: 'Role must be admin or staff.' });
  }

  try {
    const existingUser = await User.findOne({
      where: { [require('sequelize').Op.or]: [{ username }, { email }] },
    });

    if (existingUser) {
      return res.status(409).json({ error: 'Username or email already exists.' });
    }

    const newUser = await User.create({
      username,
      email,
      password,
      fullName,
      role,
    });

    const token = generateToken(newUser);

    return res.status(201).json({
      token,
      user: {
        id: newUser.id,
        username: newUser.username,
        email: newUser.email,
        fullName: newUser.fullName,
        role: newUser.role,
      },
    });
  } catch (err) {
    console.error('[register]', err);
    return res.status(500).json({ error: 'Registration failed.' });
  }
};

// Get current user profile
const getProfile = async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id, {
      attributes: { exclude: ['password'] },
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found.' });
    }

    return res.json({ user });
  } catch (err) {
    console.error('[getProfile]', err);
    return res.status(500).json({ error: 'Failed to fetch profile.' });
  }
};

// Admin: Create a new user
const adminCreateUser = async (req, res) => {
  const { username, email, password, fullName, role } = req.body;

  // Verify requester is admin (done via middleware)
  if (!username || !email || !password || !fullName) {
    return res.status(400).json({ error: 'All fields are required.' });
  }

  if (!['admin', 'staff'].includes(role)) {
    return res.status(400).json({ error: 'Role must be admin or staff.' });
  }

  try {
    const existingUser = await User.findOne({
      where: { [require('sequelize').Op.or]: [{ username }, { email }] },
    });

    if (existingUser) {
      return res.status(409).json({ error: 'Username or email already exists.' });
    }

    const newUser = await User.create({
      username,
      email,
      password,
      fullName,
      role,
    });

    return res.status(201).json({
      message: 'User created successfully.',
      user: {
        id: newUser.id,
        username: newUser.username,
        email: newUser.email,
        fullName: newUser.fullName,
        role: newUser.role,
      },
    });
  } catch (err) {
    console.error('[adminCreateUser]', err);
    return res.status(500).json({ error: 'Failed to create user.' });
  }
};

// Admin: Get all users
const listUsers = async (req, res) => {
  try {
    const users = await User.findAll({
      attributes: { exclude: ['password'] },
      order: [['createdAt', 'DESC']],
    });

    return res.json({
      message: 'Users fetched successfully.',
      users,
    });
  } catch (err) {
    console.error('[listUsers]', err);
    return res.status(500).json({ error: 'Failed to fetch users.' });
  }
};

// Admin: Update user
const updateUser = async (req, res) => {
  const { id } = req.params;
  const { username, email, fullName, role, isActive, password } = req.body;

  if (!username && !email && !fullName && !role && isActive === undefined && !password) {
    return res.status(400).json({ error: 'At least one field must be provided for update.' });
  }

  try {
    const user = await User.findByPk(id);

    if (!user) {
      return res.status(404).json({ error: 'User not found.' });
    }

    // Check if new username or email already exists (excluding current user)
    if (username && username !== user.username) {
      const existingUser = await User.findOne({ where: { username } });
      if (existingUser) {
        return res.status(409).json({ error: 'Username already exists.' });
      }
    }

    if (email && email !== user.email) {
      const existingUser = await User.findOne({ where: { email } });
      if (existingUser) {
        return res.status(409).json({ error: 'Email already exists.' });
      }
    }

    // Update fields
    if (username) user.username = username;
    if (email) user.email = email;
    if (fullName) user.fullName = fullName;
    if (role && ['admin', 'staff'].includes(role)) user.role = role;
    if (isActive !== undefined) user.isActive = isActive;
    if (password) user.password = password; // Will be hashed by beforeUpdate hook

    await user.save();

    return res.json({
      message: 'User updated successfully.',
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        fullName: user.fullName,
        role: user.role,
        isActive: user.isActive,
      },
    });
  } catch (err) {
    console.error('[updateUser]', err);
    return res.status(500).json({ error: 'Failed to update user.' });
  }
};

// Admin: Archive user (soft delete via isActive flag)
const deleteUser = async (req, res) => {
  const { id } = req.params;

  try {
    const user = await User.findByPk(id);

    if (!user) {
      return res.status(404).json({ error: 'User not found.' });
    }

    // Prevent deleting the admin who initiated the request
    if (user.id === req.user.id) {
      return res.status(400).json({ error: 'You cannot delete your own account.' });
    }

    // Soft delete by setting isActive to false
    user.isActive = false;
    await user.save();

    return res.json({
      message: 'User archived successfully.',
      user: {
        id: user.id,
        username: user.username,
        fullName: user.fullName,
        isActive: user.isActive,
      },
    });
  } catch (err) {
    console.error('[deleteUser]', err);
    return res.status(500).json({ error: 'Failed to archive user.' });
  }
};

// Admin: Restore archived user
const restoreUser = async (req, res) => {
  const { id } = req.params;

  try {
    const user = await User.findByPk(id);

    if (!user) {
      return res.status(404).json({ error: 'User not found.' });
    }

    if (user.isActive) {
      return res.status(400).json({ error: 'User is already active.' });
    }

    user.isActive = true;
    await user.save();

    return res.json({
      message: 'User restored successfully.',
      user: {
        id: user.id,
        username: user.username,
        fullName: user.fullName,
        isActive: user.isActive,
      },
    });
  } catch (err) {
    console.error('[restoreUser]', err);
    return res.status(500).json({ error: 'Failed to restore user.' });
  }
};

module.exports = {
  login,
  register,
  getProfile,
  adminCreateUser,
  listUsers,
  updateUser,
  deleteUser,
  restoreUser,
};
