// services/airtable/student.service.ts
import { AirtableBaseService } from './base.service';
import { Student, StudentCreateDto, StudentUpdateDto, StudentFilters } from '../types/candidate.types';
import { config } from '../config/index';
import { AirtableRecord } from './type'; 

export class StudentService extends AirtableBaseService {
  private tableName = config.airtable.tables.etudiants;

  constructor() {
    // Passe le baseId depuis la config
    super(config.airtable.baseId);
  }


  

  // Générer un ID étudiant unique
  private generateStudentId(): string {
    const year = new Date().getFullYear();
    const random = Math.floor(10000 + Math.random() * 90000);
    return `STU${year}${random}`;
  }

  // Trouver tous les étudiants avec filtres
  async findAll(filters?: StudentFilters): Promise<Student[]> {
    let filterFormula = '';
    const formulaParts = [];

    if (filters?.program) {
      formulaParts.push(`{program} = '${filters.program}'`);
    }
    if (filters?.enrollmentYear) {
      formulaParts.push(`{enrollmentYear} = ${filters.enrollmentYear}`);
    }
    if (filters?.status) {
      formulaParts.push(`{status} = '${filters.status}'`);
    }
    if (filters?.search) {
      formulaParts.push(`OR(
        FIND('${filters.search}', LOWER({firstName})) > 0,
        FIND('${filters.search}', LOWER({lastName})) > 0,
        FIND('${filters.search}', LOWER({email})) > 0
      )`);
    }

    if (formulaParts.length > 0) {
      filterFormula = `AND(${formulaParts.join(', ')})`;
    }

    const records = await this.findRecords<Student>(this.tableName, {
      filterByFormula: filterFormula || undefined,
      sort: [{ field: 'lastName', direction: 'asc' }],
      view: 'Grid view',
    });

    // CORRIGE LE TYPE ICI
    return records.map((record: AirtableRecord<Student>) => ({
      id: record.id,
      ...record.fields,
    }));
  }

  // Trouver par ID
  async findById(id: string): Promise<Student | null> {
    const records = await this.findRecords<Student>(this.tableName, {
      filterByFormula: `{studentId} = '${id}' OR RECORD_ID() = '${id}'`,
      maxRecords: 1,
    });

    if (records.length === 0) return null;

    return {
      id: records[0].id,
      ...records[0].fields,
    };
  }

  // Créer un étudiant
  async create(studentData: StudentCreateDto): Promise<Student> {
    const studentId = this.generateStudentId();
    const now = new Date().toISOString();

    const record = await this.createRecord<Student>(this.tableName, {
      studentId,
      ...studentData,
      enrollmentDate: now.split('T')[0], // Juste la date
      status: 'active',
      currentYear: 1,
      createdAt: now,
      updatedAt: now,
    });

    return {
      id: record.id,
      ...record.fields,
    };
  }

  // Mettre à jour un étudiant
  async update(id: string, updateData: StudentUpdateDto): Promise<Student> {
    const record = await this.updateRecord<Student>(this.tableName, id, {
      ...updateData,
      updatedAt: new Date().toISOString(),
    });

    return {
      id: record.id,
      ...record.fields,
    };
  }

  // Supprimer un étudiant (soft delete)
  async deactivate(id: string): Promise<Student> {
    return this.update(id, { status: 'inactive' });
  }

  // Compter les étudiants par statut
  async countByStatus(): Promise<Record<string, number>> {
    const students = await this.findAll();
    
    return students.reduce((acc, student) => {
      acc[student.status] = (acc[student.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
  }
}