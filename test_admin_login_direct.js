const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('./backend/models/User');
require('dotenv').config();

async function testAdminLogin() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB');

    // Find admin user
    const admin = await User.findOne({ email: 'admin@hackthon.com' });
    if (!admin) {
      console.log('Admin user not found');
      return;
    }

    console.log('Admin user found:', admin.email);
    console.log('isAdmin:', admin.isAdmin);
    console.log('Password hash exists:', !!admin.password);

    // Test password comparison
    const isValidPassword = await bcrypt.compare('admin123', admin.password);
    console.log('Password valid:', isValidPassword);

    await mongoose.disconnect();
  } catch (error) {
    console.error('Error:', error);
  }
}

testAdminLogin();
