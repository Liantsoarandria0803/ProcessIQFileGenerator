import mongoose from 'mongoose';

// Avoid silent query buffering when MongoDB is unavailable.
mongoose.set('bufferCommands', false);

export const connectDB = async (): Promise<void> => {
  try {
    const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/processiq';

    await mongoose.connect(mongoURI, {
      dbName: process.env.MONGODB_DATABASE || 'processiq',
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
