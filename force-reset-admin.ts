import mongoose from 'mongoose';
import crypto from 'crypto';

const MONGO_URI = 'mongodb+srv://ProcessIQ:processIQ@processiq.e1iwrik.mongodb.net/?appName=ProcessIQ';

const hashPassword = (plain: string): string => {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(plain, Buffer.from(salt, 'hex'), 64, { N: 16384, r: 8, p: 1 }).toString('hex');
  return `scrypt$${salt}$${hash}`;
};

const usersToSync = [
  {
    email: 'superadmin@processiq.fr',
    password: '8xK#mZ2P!qL5vW1y',
    name: 'Super Admin ProcessIQ',
    role: 'admin'
  },
  {
    email: 'admission@processiq.fr',
    password: '3nR@tY7u*X9pC4eB',
    name: 'Admission ProcessIQ',
    role: 'admission'
  },
  {
    email: 'commercial@processiq.fr',
    password: '6vS$aG1h&M0kJ8fL',
    name: 'Commercial ProcessIQ',
    role: 'commercial'
  },
  {
    email: 'rh@processiq.fr',
    password: '9wD%bN3j+Q5zK7rM',
    name: 'RH ProcessIQ',
    role: 'rh'
  }
];

async function syncAllUsers() {
  console.log('Connecting to MongoDB Atlas (database: processiq)...');
  try {
    await mongoose.connect(MONGO_URI, { dbName: 'processiq' });
    const User = mongoose.connection.collection('users');

    for (const user of usersToSync) {
      const hashedPassword = hashPassword(user.password);
      await User.updateOne(
        { email: user.email.toLowerCase() },
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
    
    console.log('\nAll users successfully synchronized with secure credentials.');
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

syncAllUsers();
