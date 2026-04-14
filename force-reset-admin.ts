import mongoose from 'mongoose';
import crypto from 'crypto';
import dotenv from 'dotenv';
import path from 'path';

// Load .env
dotenv.config();

const hashPassword = (plain: string): string => {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(plain, salt, 64).toString('hex');
  return `scrypt$${salt}$${hash}`;
};

const MONGO_URI = process.env.MONGO_URI || 'mongodb+srv://ProcessIQ:processIQ@processiq.e1iwrik.mongodb.net/?appName=ProcessIQ';

async function resetPassword() {
  console.log('Connecting to MongoDB...');
  await mongoose.connect(MONGO_URI);
  console.log('Connected.');

  const email = 'superadmin@processiq.fr';
  const newPass = '8xK#mZ2P!qL5vW1y';
  const hashedPassword = hashPassword(newPass);

  const User = mongoose.connection.collection('users');

  const result = await User.updateOne(
    { email: email.toLowerCase() },
    { 
      $set: { 
        password: hashedPassword,
        name: 'Super Admin ProcessIQ',
        role: 'admin'
      } 
    },
    { upsert: true }
  );

  if (result.matchedCount > 0) {
    console.log(`Updated password for ${email}`);
  } else {
    // If not found, create it
    await User.insertOne({
        email: email.toLowerCase(),
        password: hashedPassword,
        name: 'Super Admin ProcessIQ',
        role: 'admin',
        createdAt: new Date(),
        updatedAt: new Date()
    });
    console.log(`Created new user ${email} with the secure password.`);
  }

  await mongoose.disconnect();
  console.log('Done.');
}

resetPassword().catch(err => {
    console.error('Error:', err);
    process.exit(1);
});
