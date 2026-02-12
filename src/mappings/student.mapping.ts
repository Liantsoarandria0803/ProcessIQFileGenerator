// Pour mapper entre différents formats (Airtable ↔ Frontend ↔ PDF)
import { Student } from '../types/candidate.types';

export class StudentMapper {
  static toFullName(student: Student): string {
    return `${student.firstName} ${student.lastName}`.toUpperCase();
  }

  static toAge(birthDate: string): number {
    const birth = new Date(birthDate);
    const today = new Date();
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    
    return age;
  }

  static toPdfData(student: Student) {
    return {
      identite: {
        nom: student.lastName,
        prenom: student.firstName,
        dateNaissance: new Date(student.birthDate).toLocaleDateString('fr-FR'),
        lieuNaissance: student.birthPlace,
      },
      contact: {
        email: student.email,
        telephone: student.phone || 'Non renseigné',
        adresse: `${student.address}, ${student.postalCode} ${student.city}`,
      },
      academique: {
        numeroEtudiant: student.studentId,
        programme: student.program,
        anneeInscription: student.enrollmentYear,
        anneeCourante: student.currentYear,
        statut: this.mapStatus(student.status),
      }
    };
  }

  private static mapStatus(status: Student['status']): string {
    const statusMap = {
      active: 'Actif',
      inactive: 'Inactif',
      graduated: 'Diplômé',
      suspended: 'Suspendu',
    };
    return statusMap[status] || status;
  }
}