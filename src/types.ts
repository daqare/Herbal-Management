export interface Client {
  id: string;
  name: string;
  sex: "Male" | "Female" | "Other";
  phone: string;
  userId: string;
  createdAt: any; // Firestore Timestamp
  lastVisitAt?: any;
  tags?: string[];
  allergies?: string[];
  cautions?: string[];
  emergencyContact?: string;
  intakeSummary?: string;
}

export interface Visit {
  id: string;
  clientId: string;
  date: any;
  supplements: string[];
  payment: number;
  notes?: string;
  protocol?: string;
  userId: string;
  createdAt: any;
}

export interface SoapNotes {
  subjective: string;
  objective: string;
  assessment: string;
  plan: string;
}

export interface Appointment {
  id: string;
  clientId: string;
  clientName: string;
  date: any;
  notes?: string;
  status: "scheduled" | "completed" | "cancelled";
  userId: string;
  createdAt: any;
}

export interface Metric {
  id: string;
  clientId: string;
  type: "Weight" | "Blood Pressure" | "Heart Rate" | "Blood Sugar" | "Temperature";
  value: string;
  unit: string;
  date: any;
  userId: string;
  createdAt: any;
}

export interface MedicalDocument {
  id: string;
  clientId: string;
  title: string;
  type: "Lab Report" | "Prescription" | "Image" | "Other";
  fileUrl?: string;
  contentSummary?: string;
  date: any;
  userId: string;
  createdAt: any;
}

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
  }
}
