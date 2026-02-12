import { StudentService } from '../services/student.service';
import { Student, StudentCreateDto, StudentUpdateDto, StudentFilters } from '../types/candidate.types';

export class StudentRepository {
  private studentService: StudentService;

  constructor() {
    this.studentService = new StudentService();
  }

  async getAll(filters?: StudentFilters): Promise<Student[]> {
    return this.studentService.findAll(filters);
  }

  async getById(id: string): Promise<Student | null> {
    return this.studentService.findById(id);
  }

  async create(studentData: StudentCreateDto): Promise<Student> {
    // Validation supplémentaire si nécessaire
    if (!studentData.email.includes('@')) {
      throw new Error('Email invalide');
    }

    return this.studentService.create(studentData);
  }

  async update(id: string, updateData: StudentUpdateDto): Promise<Student> {
    const student = await this.getById(id);
    if (!student) {
      throw new Error(`Étudiant ${id} non trouvé`);
    }

    return this.studentService.update(id, updateData);
  }

  async delete(id: string): Promise<Student> {
    return this.studentService.deactivate(id);
  }

  async getDashboardStats() {
    const [students, statusCount] = await Promise.all([
      this.getAll(),
      this.studentService.countByStatus(),
    ]);

    return {
      total: students.length,
      byStatus: statusCount,
      byProgram: students.reduce((acc, student) => {
        acc[student.program] = (acc[student.program] || 0) + 1;
        return acc;
      }, {} as Record<string, number>),
      latestEnrollments: students
        .sort((a, b) => new Date(b.enrollmentDate).getTime() - new Date(a.enrollmentDate).getTime())
        .slice(0, 5),
    };
  }
}