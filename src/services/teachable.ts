import type {
  CreateUserBodyParam,
  ShowUserMetadataParam,
  EnrollUserBodyParam,
  ShowCourseMetadataParam,
  ShowCourseEnrollmentsMetadataParam,
  ShowLectureMetadataParam,
  MarkLectureCompleteBodyParam,
  MarkLectureCompleteMetadataParam,
  CourseProgressMetadataParam,
  ListQuizzesMetadataParam,
  ShowQuizMetadataParam,
  ShowQuizResponsesMetadataParam,
  ShowVideoMetadataParam,
  ListCoursesMetadataParam
} from "@api/teachable/types";
type FetchResponse<TData = unknown> = { status: number; data: TData };

type TeachableSDK = {
  auth: (...values: (string | number)[]) => unknown;
  createUser: (body: CreateUserBodyParam) => Promise<FetchResponse<any>>;
  listUsers: (metadata?: unknown) => Promise<FetchResponse<any>>;
  showUser: (metadata: ShowUserMetadataParam) => Promise<FetchResponse<any>>;
  updateUser: (body: unknown, metadata: unknown) => Promise<FetchResponse<any>>;
  enrollUser: (body: EnrollUserBodyParam) => Promise<FetchResponse<any>>;
  unenrollUser: (body: unknown) => Promise<FetchResponse<any>>;
  listWebhooks: () => Promise<FetchResponse<any>>;
  showWebhookEvents: (metadata: unknown) => Promise<FetchResponse<any>>;
  showPricingPlans: (metadata: unknown) => Promise<FetchResponse<any>>;
  listPricingPlans: (metadata?: unknown) => Promise<FetchResponse<any>>;
  listTransactions: (metadata?: unknown) => Promise<FetchResponse<any>>;
  listCourses: (metadata?: ListCoursesMetadataParam) => Promise<FetchResponse<any>>;
  showCourse: (metadata: ShowCourseMetadataParam) => Promise<FetchResponse<any>>;
  showCourseEnrollments: (metadata: ShowCourseEnrollmentsMetadataParam) => Promise<FetchResponse<any>>;
  showLecture: (metadata: ShowLectureMetadataParam) => Promise<FetchResponse<any>>;
  markLectureComplete: (body: MarkLectureCompleteBodyParam, metadata: MarkLectureCompleteMetadataParam) => Promise<FetchResponse<any>>;
  courseProgress: (metadata: CourseProgressMetadataParam) => Promise<FetchResponse<any>>;
  listQuizzes: (metadata: ListQuizzesMetadataParam) => Promise<FetchResponse<any>>;
  showQuiz: (metadata: ShowQuizMetadataParam) => Promise<FetchResponse<any>>;
  showQuizResponses: (metadata: ShowQuizResponsesMetadataParam) => Promise<FetchResponse<any>>;
  showVideo: (metadata: ShowVideoMetadataParam) => Promise<FetchResponse<any>>;
};

const teachable: TeachableSDK = (require("@api/teachable").default ?? require("@api/teachable")) as TeachableSDK;

class ServiceError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

export class TeachableUsersService {
  private sdk = teachable;

  /**
   * Authenticate the Teachable SDK using TEACHABLE_API_KEY env var.
   * Throws ServiceError(400) if the API key is missing.
   */
  constructor() {
    const key = process.env.TEACHABLE_API_KEY?.trim();
    if (!key) {
      throw new ServiceError("Missing TEACHABLE_API_KEY env var", 400);
    }
    this.sdk.auth(key);
  }

  /**
   * Create a new user in Teachable.
   * Returns 201 with user details or 400 on validation error.
   */
  async createUser(body: CreateUserBodyParam): Promise<FetchResponse<any>> {
    return this.sdk.createUser(body);
  }

  /**
   * Fetch user details, enrollments and tags by user_id.
   * Returns 200 with user profile or 404 if not found.
   */
  async showUser(metadata: ShowUserMetadataParam): Promise<FetchResponse<any>> {
    return this.sdk.showUser(metadata);
  }

  /**
   * Enroll a user into a course using user_id and course_id.
   * Returns 204 on success, 404/422 on errors.
   */
  async enrollUser(body: EnrollUserBodyParam): Promise<FetchResponse<any>> {
    return this.sdk.enrollUser(body);
  }

  /**
   * Unenroll a user from a course using user_id and course_id.
   * Returns 204 on success, 404/422 on errors.
   */
  async unenrollUser(body: { user_id: number; course_id: number }): Promise<FetchResponse<any>> {
    return this.sdk.unenrollUser(body);
  }
}

export class TeachableCoursesService {
  private sdk = teachable;

  /**
   * Authenticate the Teachable SDK using TEACHABLE_API_KEY env var.
   * Throws ServiceError(400) if the API key is missing.
   */
  constructor() {
    const key = process.env.TEACHABLE_API_KEY?.trim();
    if (!key) {
      throw new ServiceError("Missing TEACHABLE_API_KEY env var", 400);
    }
    this.sdk.auth(key);
  }

  async listCourses(metadata?: ListCoursesMetadataParam): Promise<FetchResponse<any>> {
    return this.sdk.listCourses(metadata);
  }

  /**
   * Fetch a course by course_id, including lecture_sections and author_bio.
   * Returns 200 with course details or 404 if not found.
   */
  async showCourse(metadata: ShowCourseMetadataParam): Promise<FetchResponse<any>> {
    return this.sdk.showCourse(metadata);
  }

  /**
   * Fetch active enrollments and progress for a course.
   * Supports filters: enrolled_in_after, enrolled_in_before, sort_direction.
   */
  async showCourseEnrollments(metadata: ShowCourseEnrollmentsMetadataParam): Promise<FetchResponse<any>> {
    return this.sdk.showCourseEnrollments(metadata);
  }

  /**
   * Fetch lecture content by course_id and lecture_id.
   * Returns 200 with lecture details or 404 if not found.
   */
  async showLecture(metadata: ShowLectureMetadataParam): Promise<FetchResponse<any>> {
    return this.sdk.showLecture(metadata);
  }

  /**
   * Mark a lecture as complete for a user.
   * Returns 204 on success, 404 if not found, 409 on conflict.
   */
  async markLectureComplete(body: MarkLectureCompleteBodyParam, metadata: MarkLectureCompleteMetadataParam): Promise<FetchResponse<any>> {
    return this.sdk.markLectureComplete(body, metadata);
  }

  /**
   * Fetch a user's course progress by course_id and user_id.
   * Supports pagination with page and per.
   */
  async courseProgress(metadata: CourseProgressMetadataParam): Promise<FetchResponse<any>> {
    return this.sdk.courseProgress(metadata);
  }

  /**
   * Fetch an id list of quizzes in a specific course lecture.
   * Returns 200 with quiz_ids or 404 if not found.
   */
  async listQuizzes(metadata: ListQuizzesMetadataParam): Promise<FetchResponse<any>> {
    return this.sdk.listQuizzes(metadata);
  }

  /**
   * Fetch a specific quiz information by course_id, lecture_id and quiz_id.
   * Returns 200 with quiz attachment details or 404 if not found.
   */
  async showQuiz(metadata: ShowQuizMetadataParam): Promise<FetchResponse<any>> {
    return this.sdk.showQuiz(metadata);
  }

  /**
   * Fetch quiz responses by course_id, lecture_id and quiz_id.
   * Returns 200 with responses or 404 if not found.
   */
  async showQuizResponses(metadata: ShowQuizResponsesMetadataParam): Promise<FetchResponse<any>> {
    return this.sdk.showQuizResponses(metadata);
  }

  /**
   * Fetch a specific video information by course_id, lecture_id and video_id.
   * Returns 200 with video details or 404 if not found.
   */
  async showVideo(metadata: ShowVideoMetadataParam): Promise<FetchResponse<any>> {
    return this.sdk.showVideo(metadata);
  }
}
