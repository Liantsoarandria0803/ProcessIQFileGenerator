import 'dotenv/config';
import mongoose from 'mongoose';
import { connectDB, disconnectDB, isMongoConnected } from './src/config/database';
import { Student } from './src/models/student.model';
import { User } from './src/models/user.model';
import crypto from 'crypto';

// ========== PASSWORD HASHING ==========
const hashPassword = (plain: string): string => {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(plain, salt, 64).toString('hex');
  return `scrypt$${salt}$${hash}`;
};

// ========== MAIN FUNCTION ==========
async function main(): Promise<void> {
  console.log('🔌 Connexion à MongoDB...');
  
  try {
    await connectDB();
    
    if (!isMongoConnected()) {
      throw new Error('❌ MongoDB non connectée');
    }
    
    console.log('✅ MongoDB connectée');

    // ========== ÉTAPE 1: Chercher un étudiant ==========
    console.log('\n📚 Recherche des étudiants...');
    const students = await Student.find().select('_id firstName lastName email formation').limit(5);
    
    if (students.length === 0) {
      console.log('❌ Aucun étudiant trouvé dans la base');
      console.log('   Veuillez d\'abord créer des étudiants via l\'interface d\'admission');
      await disconnectDB();
      return;
    }

    console.log(`✅ Trouvé ${students.length} étudiant(s):\n`);
    students.forEach((s, i) => {
      console.log(`   ${i + 1}. ${s.firstName} ${s.lastName} (${s.email}) - Formation: ${s.formation}`);
    });

    // ========== ÉTAPE 2: Utiliser le premier étudiant ==========
    const student = students[0];
    console.log(`\n📝 Utilisation de l'étudiant: ${student.firstName} ${student.lastName}`);

    // ========== ÉTAPE 3: Vérifier/Créer automatiquement le compte utilisateur ==========
    const studentEmail = 'jocelyn@gmail.com';
    const studentPassword = 'Student#2026';

    let user = await User.findOne({ studentId: student._id });
    
    if (user) {
      console.log(`✅ Compte utilisateur existant: ${user.email}`);
    } else {
      console.log(`\n🔐 Création du compte utilisateur...`);
      user = await User.create({
        email: studentEmail,
        password: hashPassword(studentPassword),
        name: `${student.firstName} ${student.lastName}`,
        role: 'student',
        studentId: student._id
      });
      console.log(`✅ Compte créé: ${user.email}`);
    }

    // ========== RÉSULTAT ==========
    console.log('\n' + '='.repeat(50));
    console.log('🎉 INFORMATIONS DE CONNEXION ÉTUDIANT');
    console.log('='.repeat(50));
    console.log(`📧 Email:      ${user.email}`);
    console.log(`🔐 Mot de passe: ${studentPassword}`);
    console.log(`👤 Nom:        ${student.firstName} ${student.lastName}`);
    console.log(`📚 Formation:  ${student.formation}`);
    console.log('='.repeat(50));
    console.log('\n💡 Essayez de vous connecter avec ces identifiants!');

  } catch (error) {
    console.error('❌ Erreur:', error instanceof Error ? error.message : error);
    process.exit(1);
  } finally {
    await disconnectDB();
  }
}

main();
