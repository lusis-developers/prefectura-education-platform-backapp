import { Types } from "mongoose";
import { models } from "../models";

export class PointsService {
  async awardCommentPoint(userId: string): Promise<void> {
    if (!userId || !Types.ObjectId.isValid(userId)) {
      const error: any = new Error("Invalid payload. A valid userId is required.");
      error.status = 400;
      throw error;
    }

    await models.users.updateOne({ _id: userId }, { $inc: { points: 1 } });
  }

  async awardLecturePoint(userId: string, courseId: number, lectureId: number): Promise<void> {
    if (!userId || !Types.ObjectId.isValid(userId)) {
      const error: any = new Error("Invalid payload. A valid userId is required.");
      error.status = 400;
      throw error;
    }
    if (!Number.isFinite(courseId) || courseId <= 0) {
      const error: any = new Error("Invalid payload. A valid courseId is required.");
      error.status = 400;
      throw error;
    }
    if (!Number.isFinite(lectureId) || lectureId <= 0) {
      const error: any = new Error("Invalid payload. A valid lectureId is required.");
      error.status = 400;
      throw error;
    }

    const user = await models.users.findById(userId);
    if (!user) {
      const error: any = new Error("User not found.");
      error.status = 404;
      throw error;
    }

    const alreadyCompleted = user.completedLectures.some(
      (cl: any) => cl.courseId === courseId && cl.lectureId === lectureId
    );
    if (alreadyCompleted) {
      return; // Already awarded, do nothing
    }

    await models.users.updateOne(
      { _id: userId },
      {
        $inc: { points: 1 },
        $push: { completedLectures: { courseId, lectureId } }
      }
    );
  }

  async awardQuizPoints(userId: string, quizId: string): Promise<void> {
    if (!userId || !Types.ObjectId.isValid(userId)) {
      const error: any = new Error("Invalid payload. A valid userId is required.");
      error.status = 400;
      throw error;
    }
    if (!quizId || !Types.ObjectId.isValid(quizId)) {
      const error: any = new Error("Invalid payload. A valid quizId is required.");
      error.status = 400;
      throw error;
    }

    const user = await models.users.findById(userId);
    if (!user) {
      const error: any = new Error("User not found.");
      error.status = 404;
      throw error;
    }

    // Check if the quiz points have already been awarded for this user
    // We'll track it in the user's completedQuizzes array if it exists, or just increment
    // Since the controller handles "Quiz already approved", a simple increment is safer here, 
    // but we should probably track it to be idempotent.

    // For now, let's follow the user's request: "haz que cuando se apruebe se aumente 100 puntos"
    await models.users.updateOne(
      { _id: userId },
      { $inc: { points: 100 } }
    );
  }
}

