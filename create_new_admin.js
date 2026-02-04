const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('./backend/models/User');
require('dotenv').config();

async function createNewAdmin() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB');

    // Delete existing admin if exists
    await User.deleteMany({ email: 'admin@hackthon.com' });
    console.log('Deleted old admin user');

    // Create new admin user
    const hashedPassword = await bcrypt.hash('admin123', 10);
    const newAdmin = new User({
      name: 'Platform Administrator',
      email: 'admin@hackthon.com', // Fixed to match other files
      password: hashedPassword,
      isAdmin: true,
      roles: ['admin'],
      bio: 'Platform Administrator',
      roleInFilm: 'Administrator',
      skills: 'Platform Management, User Support, Content Moderation'
    });

    await newAdmin.save();
    console.log('New admin user created successfully!');
    console.log('Email: admin@hackthon.com');
    console.log('Password: admin123');

    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  } catch (error) {
    console.error('Error creating admin:', error);
  }
}

createNewAdmin();
