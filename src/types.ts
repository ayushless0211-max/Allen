export type UserRole = "student" | "admin";

export interface UserProfile {
  uid: string;
  displayName: string;
  email: string;
  photoURL?: string;
  role: UserRole;
  purchasedCourseIds?: string[];
  adAccess?: Record<string, number>;
  createdAt?: string;
  username?: string;
}

export interface Teacher {
  name: string;
  avatar?: string;
  qualification?: string;
}

export interface VideoLecture {
  id: string;
  title: string;
  videoUrl: string; // Google Drive Video URL
  duration?: string;
  description?: string;
}

export interface NoteItem {
  id: string;
  title: string;
  pdfUrl?: string; // or content text
  content?: string; // Markdown or plain text instructions
}

export interface PracticeQuestion {
  question: string;
  options: string[]; // 4 options
  correctOption: number; // 0, 1, 2, 3 corresponding to options index
  explanation?: string;
}

export interface PracticeTest {
  id: string;
  title: string;
  description?: string;
  questions: PracticeQuestion[];
}

export interface RevisionResource {
  id: string;
  title: string;
  summary: string; // High-yield key points
  formulas?: string[]; // Mathematical equations / Physics rules
}

export interface Chapter {
  id: string;
  name: string;
  lectures: VideoLecture[];
  notes: NoteItem[];
  tests: PracticeTest[];
  revision: RevisionResource[];
}

export interface Subject {
  id: string;
  name: string; // e.g. "Physics", "Chemistry", "Mathematics"
  chapters: Chapter[];
}

export interface CourseBatch {
  id: string;
  name: string;
  description: string;
  price: number; // in INR
  image: string; // Image URL/placeholder
  subjects: Subject[]; // List of subjects taught
  teachers?: Teacher[];
  highlights?: string[]; // e.g. ["100+ Hours Live", "Full PDF Notes", "JEE Main & Advanced High-Yield Quizzes"]
  createdAt?: string;
}

export interface PurchaseLog {
  id: string;
  userId: string;
  userEmail: string;
  batchId: string;
  batchName: string;
  price: number;
  method: "razorpay" | "bypass_test";
  timestamp: string;
}
