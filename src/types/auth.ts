export type UserRole = 'admin' | 'student' | 'staff';

export interface AuthPayload {
  username: string;
  sub: string;
  role: UserRole;
  studentId?: string | null;
  iat: number;
  exp: number;
}

