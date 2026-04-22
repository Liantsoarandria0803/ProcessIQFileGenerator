import mongoose from 'mongoose';
import crypto from 'crypto';
import dotenv from 'dotenv';
import path from 'path';

// Load .env from current directory
dotenv.config();

const MONGO_URI = process.env.MONGO_URI || 'mongodb+srv://ProcessIQ:processIQ@processiq.e1iwrik.mongodb.net/?appName=ProcessIQ';
const DB_NAME = process.env.DB_NAME || 'processiq';

const hashPassword = (plain: string): string => {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(plain, Buffer.from(salt, 'hex'), 64, { N: 16384, r: 8, p: 1 }).toString('hex');
  return `scrypt$${salt}$${hash}`;
};

const getUsersFromEnv = () => {
  const users = [
    {
      email: process.env.DEFAULT_ADMIN_EMAIL,
      password: process.env.DEFAULT_ADMIN_PASSWORD,
      name: 'Super Admin ProcessIQ',
      role: 'admin'
    },
    {
      email: process.env.DEFAULT_ADMISSION_EMAIL,
      password: process.env.DEFAULT_ADMISSION_PASSWORD,
      name: 'Admission ProcessIQ',
      role: 'admission'
    },
    {
      email: process.env.DEFAULT_COMMERCIAL_EMAIL,
      password: process.env.DEFAULT_COMMERCIAL_PASSWORD,
      name: 'Commercial ProcessIQ',
      role: 'commercial'
    },
    {
      email: process.env.DEFAULT_RH_EMAIL,
      password: process.env.DEFAULT_RH_PASSWORD,
      name: 'RH ProcessIQ',
      role: 'rh'
    }
  ].filter(u => u.email && u.password);
  
  return users;
};

async function syncAllUsers() {
  const usersToSync = getUsersFromEnv();
  
  if (usersToSync.length === 0) {
    console.error('Error: No users found in .env. Please check DEFAULT_ADMIN_EMAIL/PASSWORD etc.');
    process.exit(1);
  }

  console.log(`Connecting to MongoDB Atlas (database: ${DB_NAME})...`);
  try {
    await mongoose.connect(MONGO_URI, { dbName: DB_NAME });
    const User = mongoose.connection.collection('users');

    for (const user of usersToSync) {
      const hashedPassword = hashPassword(user.password!);
      await User.updateOne(
        { email: user.email!.toLowerCase() },
        { 
          $set: { 
            password: hashedPassword,
            name: user.name,
            role: user.role
          } 
        },
        { upsert: true }
      );
      console.log(`✓ Synchronized: ${user.email}`);
    }
    
    console.log('\nAll users successfully synchronized with credentials from .env.');
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

syncAllUsers();
