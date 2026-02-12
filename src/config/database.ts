// src/config/database.ts
import mongoose from 'mongoose';
import { config } from './index';

export const connectDB = async (): Promise<void> => {
  try {
    const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/processiq';
    
    await mongoose.connect(mongoURI, {
      dbName: process.env.MONGODB_DATABASE || 'processiq',
    });
    
    console.log(' MongoDB connecté avec succès');
    console.log(` Base de données: ${mongoose.connection.db?.databaseName}`);
    
  } catch (error) {
    console.error(' Erreur de connexion MongoDB:', error);
    process.exit(1);
  }
};

// Gestion des événements de connexion
mongoose.connection.on('error', (err) => {
  console.error(' Erreur MongoDB:', err);
});

mongoose.connection.on('disconnected', () => {
  console.log('  MongoDB déconnecté');
});

export const disconnectDB = async (): Promise<void> => {
  await mongoose.disconnect();
};