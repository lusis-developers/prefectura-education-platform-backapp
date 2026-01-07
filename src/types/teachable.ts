export interface TeachableCourse {
  id: number;
  name?: string;
  description?: string;
  image_url?: string;
  status?: string;
}

export interface TeachableEnrollment {
  id: number;
  user_id: number;
  course_id: number;
  teachableCourseId?: number; // Used in local objects
  status: "active" | "revoked";
  enrolledAt?: string | Date;
}

export interface TeachableUser {
  id: number;
  name: string;
  email: string;
}
