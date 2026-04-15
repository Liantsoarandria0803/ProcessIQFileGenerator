import mongoose from 'mongoose';
import type { Db } from 'mongodb';

export const getMongoDb = (): Db => {
  const db = mongoose.connection.db;
  if (!db) {
    throw new Error('MongoDB not connected: call connectDB() before using getMongoDb()');
  }
  // Mongoose can bring its own `mongodb` dependency, so cast to the app's `mongodb` types.
  return db as unknown as Db;
};
