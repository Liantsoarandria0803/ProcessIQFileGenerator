import dns from 'dns';
import mongoose from 'mongoose';

// ⚡ Forcer la résolution DNS en IPv4 AVANT toute connexion
// Résout les ETIMEDOUT / "Could not connect to any servers" sur Atlas
dns.setDefaultResultOrder('ipv4first');

// Avoid silent query buffering when MongoDB is unavailable.
mongoose.set('bufferCommands', false);

export const connectDB = async (): Promise<void> => {
  try {
    const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/processiq';
    const dbName = process.env.MONGODB_DATABASE || 'processiq';

    console.log(`🔌 Connexion MongoDB Atlas → base: ${dbName}...`);

    await mongoose.connect(mongoURI, {
      dbName,
      // Force IPv4 au niveau du driver MongoDB natif
      family: 4,
      // Timeout plus généreux pour Atlas (la résolution DNS SRV peut être lente)
      serverSelectionTimeoutMS: 15000,
      socketTimeoutMS: 30000,
      connectTimeoutMS: 15000,
      maxPoolSize: 20,
      minPoolSize: 1,
      // Retry automatique sur déconnexion
      retryWrites: true,
      retryReads: true,
    });

    console.log('✅ MongoDB connected');
    console.log(`   Database: ${mongoose.connection.db?.databaseName}`);
  } catch (error) {
    console.error('❌ MongoDB connection error:', error);
    throw error;
  }
};

mongoose.connection.on('error', (err) => {
  console.error('MongoDB error:', err);
});

mongoose.connection.on('disconnected', () => {
  console.log('MongoDB disconnected');
});

mongoose.connection.on('reconnected', () => {
  console.log('MongoDB reconnected');
});

export const disconnectDB = async (): Promise<void> => {
  await mongoose.disconnect();
};

export const isMongoConnected = (): boolean => mongoose.connection.readyState === 1;
