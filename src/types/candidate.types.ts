export interface Student {
  id?: string;
  studentId: string;           // Numéro étudiant unique
  firstName: string;
  lastName: string;
  birthDate: string;           // Format: YYYY-MM-DD
  birthPlace: string;
  email: string;
  phone?: string;
  address: string;
  postalCode: string;
  city: string;
  country: string;
  
  // Informations académiques
  program: string;            // Programme d'études
  enrollmentYear: number;
  currentYear: number;
  status: 'active' | 'inactive' | 'graduated' | 'suspended';
  
  // Dates importantes
  enrollmentDate: string;
  createdAt?: string;
  updatedAt?: string;
  
  // Relations (IDs Airtable)
  admissions?: string[];      // IDs des admissions liées
  grades?: string[];          // IDs des notes liées
}

export interface StudentCreateDto {
  firstName: string;
  lastName: string;
  birthDate: string;
  birthPlace: string;
  email: string;
  phone?: string;
  address: string;
  postalCode: string;
  city: string;
  country: string;
  program: string;
  enrollmentYear: number;
}

export interface StudentUpdateDto {
  firstName?: string;
  lastName?: string;
  phone?: string;
  address?: string;
  postalCode?: string;
  city?: string;
  status?: Student['status'];
}

export interface StudentFilters {
  program?: string;
  enrollmentYear?: number;
  status?: Student['status'];
  search?: string;           // Recherche dans nom/prénom/email
}