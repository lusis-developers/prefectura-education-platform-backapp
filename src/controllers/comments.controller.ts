import type { Request, Response, NextFunction } from "express";
import { HttpStatusCode } from "axios";
import { Types } from "mongoose";
import { models } from "../models";
import { PointsService } from "../services/points";

function isValidObjectId(id: unknown): id is string {
  return typeof id === "string" && Types.ObjectId.isValid(id);
}

export async function createComment(
  req: Request,
  res: Response,
  _next: NextFunction,
): Promise<void> {
  try {
    const { userId, content, parentId, courseId, lectureId, videoId } = (req.body || {}) as Record<string, any>;

    if (!isValidObjectId(userId) || typeof content !== "string" || !content.trim()) {
      res.status(HttpStatusCode.BadRequest).send({ message: "Invalid payload. Valid userId and non-empty content are required." });
      return;
    }

    let parent: string | null = null;
    if (parentId !== undefined && parentId !== null) {
      if (!isValidObjectId(parentId)) {
        res.status(HttpStatusCode.BadRequest).send({ message: "Invalid payload. A valid parentId is required." });
        return;
      }
      parent = parentId;
    }

    const comment = await models.comments.create({
      user: new Types.ObjectId(userId),
      content: String(content).trim(),
      parent: parent ? new Types.ObjectId(parent) : null,
      courseId: typeof courseId === "number" ? courseId : undefined,
      lectureId: typeof lectureId === "number" ? lectureId : undefined,
      videoId: typeof videoId === "number" ? videoId : undefined,
    });

    const pointsService = new PointsService();
    await pointsService.awardCommentPoint(userId);

    const user = await models.users.findById(userId).lean();
    const points = Number((user as any)?.points || 0);
    res.setHeader("X-User-Points", String(points));
    res.status(HttpStatusCode.Created).send({ message: "Comment created successfully.", comment });
    return;
  } catch (error: any) {
    const err = error as { status?: number; message?: string };
    console.error("Error creating comment", err);
    res.status(err?.status || HttpStatusCode.InternalServerError).send({ message: err?.message || "Internal server error." });
    return;
  }
}

export async function replyToComment(
  req: Request,
  res: Response,
  _next: NextFunction,
): Promise<void> {
  try {
    const { commentId } = req.params;
    const { userId, content } = (req.body || {}) as Record<string, any>;

    if (!isValidObjectId(commentId) || !isValidObjectId(userId) || typeof content !== "string" || !content.trim()) {
      res.status(HttpStatusCode.BadRequest).send({ message: "Invalid payload. Valid commentId, userId and non-empty content are required." });
      return;
    }

    const parentExists = await models.comments.findById(commentId).lean();
    if (!parentExists) {
      res.status(HttpStatusCode.NotFound).send({ message: "Parent comment not found." });
      return;
    }

    const reply = await models.comments.create({
      user: new Types.ObjectId(userId),
      content: String(content).trim(),
      parent: new Types.ObjectId(commentId),
      courseId: parentExists.courseId ?? undefined,
      lectureId: parentExists.lectureId ?? undefined,
      videoId: parentExists.videoId ?? undefined,
    } as any);

    const pointsService = new PointsService();
    await pointsService.awardCommentPoint(userId);

    const user = await models.users.findById(userId).lean();
    const points = Number((user as any)?.points || 0);
    res.setHeader("X-User-Points", String(points));
    res.status(HttpStatusCode.Created).send({ message: "Reply created successfully.", reply });
    return;
  } catch (error: any) {
    console.error("Error creating reply", error);
    res.status(error?.status || HttpStatusCode.InternalServerError).send({ message: error?.message || "Internal server error." });
    return;
  }
}

export async function likeComment(
  req: Request,
  res: Response,
  _next: NextFunction,
): Promise<void> {
  try {
    const { commentId } = req.params;
    const { userId } = (req.body || {}) as Record<string, any>;

    if (!isValidObjectId(commentId) || !isValidObjectId(userId)) {
      res.status(HttpStatusCode.BadRequest).send({ message: "Invalid payload. Valid commentId and userId are required." });
      return;
    }

    const updated = await models.comments.updateOne(
      { _id: commentId, likes: { $ne: new Types.ObjectId(userId) } },
      { $push: { likes: new Types.ObjectId(userId) } },
    );

    if (updated.modifiedCount === 0) {
      res.status(HttpStatusCode.Ok).send({ message: "Comment already liked by the user." });
      return;
    }

    const userDoc = await models.users.findById(userId).lean().catch(() => null);
    if (userDoc) {
      const points = Number((userDoc as any)?.points || 0);
      res.setHeader("X-User-Points", String(points));
    }
    res.status(HttpStatusCode.NoContent).send({ message: "Comment liked successfully." });
    return;
  } catch (error: any) {
    console.error("Error liking comment", error);
    res.status(error?.status || HttpStatusCode.InternalServerError).send({ message: error?.message || "Internal server error." });
    return;
  }
}

export async function unlikeComment(
  req: Request,
  res: Response,
  _next: NextFunction,
): Promise<void> {
  try {
    const { commentId, userId } = req.params as Record<string, string>;

    if (!isValidObjectId(commentId) || !isValidObjectId(userId)) {
      res.status(HttpStatusCode.BadRequest).send({ message: "Invalid parameter. Valid commentId and userId are required." });
      return;
    }

    await models.comments.updateOne(
      { _id: commentId },
      { $pull: { likes: new Types.ObjectId(userId) } },
    );

    const userDoc = await models.users.findById(userId).lean().catch(() => null);
    if (userDoc) {
      const points = Number((userDoc as any)?.points || 0);
      res.setHeader("X-User-Points", String(points));
    }
    res.status(HttpStatusCode.NoContent).send({ message: "Comment unliked successfully." });
    return;
  } catch (error: any) {
    console.error("Error unliking comment", error);
    res.status(error?.status || HttpStatusCode.InternalServerError).send({ message: error?.message || "Internal server error." });
    return;
  }
}

export async function getComments(
  req: Request,
  res: Response,
  _next: NextFunction,
): Promise<void> {
  try {
    const { parentId, courseId, lectureId, videoId, page, per } = (req.query || {}) as Record<string, any>;

    const filter: any = {};
    if (parentId === undefined || parentId === null || parentId === "null") {
      filter.parent = null;
    } else if (isValidObjectId(parentId)) {
      filter.parent = new Types.ObjectId(parentId);
    }
    if (courseId) filter.courseId = Number(courseId);
    if (lectureId) filter.lectureId = Number(lectureId);
    if (videoId) filter.videoId = Number(videoId);

    const pageNum = page ? Math.max(Number(page), 1) : 1;
    const perNum = per ? Math.max(Number(per), 1) : 20;

    const [items, total] = await Promise.all([
      models.comments
        .find(filter)
        .sort({ createdAt: -1 })
        .skip((pageNum - 1) * perNum)
        .limit(perNum)
        .lean(),
      models.comments.countDocuments(filter),
    ]);

    res.status(HttpStatusCode.Ok).send({ message: "Comments retrieved successfully.", items, total, page: pageNum, per: perNum });
    return;
  } catch (error: any) {
    console.error("Error fetching comments", error);
    res.status(error?.status || HttpStatusCode.InternalServerError).send({ message: error?.message || "Internal server error." });
    return;
  }
}

export async function getCommentById(
  req: Request,
  res: Response,
  _next: NextFunction,
): Promise<void> {
  try {
    const { commentId } = req.params;
    if (!isValidObjectId(commentId)) {
      res.status(HttpStatusCode.BadRequest).send({ message: "Invalid parameter. A valid commentId is required." });
      return;
    }

    const comment = await models.comments.findById(commentId).lean();
    if (!comment) {
      res.status(HttpStatusCode.NotFound).send({ message: "Comment not found." });
      return;
    }

    res.status(HttpStatusCode.Ok).send({ message: "Comment retrieved successfully.", comment });
    return;
  } catch (error: any) {
    console.error("Error fetching comment", error);
    res.status(error?.status || HttpStatusCode.InternalServerError).send({ message: error?.message || "Internal server error." });
    return;
  }
}

export async function getCommentReplies(
  req: Request,
  res: Response,
  _next: NextFunction,
): Promise<void> {
  try {
    const { commentId } = req.params;
    const { page, per } = (req.query || {}) as Record<string, any>;

    if (!isValidObjectId(commentId)) {
      res.status(HttpStatusCode.BadRequest).send({ message: "Invalid parameter. A valid commentId is required." });
      return;
    }

    const pageNum = page ? Math.max(Number(page), 1) : 1;
    const perNum = per ? Math.max(Number(per), 1) : 20;

    const [items, total] = await Promise.all([
      models.comments
        .find({ parent: new Types.ObjectId(commentId) })
        .sort({ createdAt: -1 })
        .skip((pageNum - 1) * perNum)
        .limit(perNum)
        .lean(),
      models.comments.countDocuments({ parent: new Types.ObjectId(commentId) }),
    ]);

    res.status(HttpStatusCode.Ok).send({ message: "Replies retrieved successfully.", items, total, page: pageNum, per: perNum });
    return;
  } catch (error: any) {
    console.error("Error fetching replies", error);
    res.status(error?.status || HttpStatusCode.InternalServerError).send({ message: error?.message || "Internal server error." });
    return;
  }
}
