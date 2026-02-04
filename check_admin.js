const mongoose = require('mongoose');
const User = require('./backend/models/User');
require('dotenv').config();

async function checkAdmin() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    const admin = await User.findOne({ email: 'admin@hackthon.com' });
    if (admin) {
      console.log('Admin user exists:', admin.email, 'isAdmin:', admin.isAdmin);
      console.log('Password hash:', admin.password);
    } else {
      console.log('Admin user does not exist');
    }
    await mongoose.disconnect();
  } catch (error) {
    console.error('Error:', error);
  }
}
checkAdmin();
