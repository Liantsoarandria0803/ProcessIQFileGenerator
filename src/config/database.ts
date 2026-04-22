import mongoose from 'mongoose';
import config from './index';
import dns from 'dns';

// Avoid silent query buffering when MongoDB is unavailable.
mongoose.set('bufferCommands', false);

const dnsServers = String(process.env.DNS_SERVERS || '')
  .split(',')
  .map((value) => value.trim())
  .filter(Boolean);

if (dnsServers.length > 0) {
  try {
    dns.setServers(dnsServers);
    console.log(`DNS resolvers override enabled: ${dnsServers.join(', ')}`);
  } catch (error) {
    console.warn('Invalid DNS_SERVERS value, fallback to system resolver:', error);
  }
}

export const connectDB = async (): Promise<void> => {
  try {
    const mongoURI = config.database.uri;

    await mongoose.connect(mongoURI, {
      dbName: config.database.dbName,
      // Keep API failures short when Atlas/network is down.
      serverSelectionTimeoutMS: 8000,
      socketTimeoutMS: 20000,
      maxPoolSize: 20,
      minPoolSize: 1
    });

    console.log('MongoDB connected');
    console.log(`Database: ${mongoose.connection.db?.databaseName}`);
  } catch (error) {
    console.error('MongoDB connection error:', error);
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
