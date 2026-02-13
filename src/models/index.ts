// models/index.ts
export * from './student.model';
export * from './user.model';
export * from './attendance.model';
export * from './grade.model';
export * from './event.model';
export * from './appointment.model';
export * from './document.etudiant.model';
export * from './Candidate.model'
export * from './application.model';
export * from './document.model';
export * from './class-group.model'
export * from './company.model'
export * from './interview.model'
export * from './dashboard-stats.model'
export * from './test.model'


// Connexion MongoDB
import mongoose from 'mongoose';

export const connectDB = async (uri: string): Promise<void> => {
  try {
    await mongoose.connect(uri);
    console.log(' MongoDB connected');
    
    // Création des index (optionnel - mongoose le fait automatiquement)
    mongoose.connection.on('connected', () => {
      console.log(' Creating indexes...');
    });
  } catch (error) {
    console.error(' MongoDB connection error:', error);
    process.exit(1);
  }
};
