import type { Request, Response, NextFunction } from "express";
import { HttpStatusCode } from "axios";
import { Types } from "mongoose";
import { models } from "../models";
import { TeachableCoursesService, TeachableUsersService } from "../services/teachable";

function parsePositiveNumber(value: any): number | undefined {
  const n = Number(value);
  if (Number.isNaN(n) || n <= 0) return undefined;
  return n;
}



export async function createCareer(
  req: Request,
  res: Response,
  _next: NextFunction,
): Promise<void> {
  try {
    const { name, slogan, description, imageUrl, courseIds } = (req.body || {}) as Record<string, any>;
    const valueName = typeof name === "string" ? name.trim() : "";
    if (!valueName) {
      res.status(HttpStatusCode.BadRequest).send({ message: "Invalid payload. Name is required." });
      return;
    }

    const existing = await models.careers.findOne({ name: valueName }).lean();
    if (existing) {
      res.status(HttpStatusCode.Conflict).send({ message: "Career already exists." });
      return;
    }

    const parsedCourseIds: number[] = Array.isArray(courseIds)
      ? courseIds.map((v: any) => Number(v)).filter((n: number) => Number.isFinite(n) && n > 0)
      : [];

    const created = await models.careers.create({ name: valueName, slogan: slogan ?? null, description: description ?? null, imageUrl: imageUrl ?? null, courseIds: parsedCourseIds, isActive: true });

    res.status(HttpStatusCode.Created).send({ message: "Career created successfully.", career: created });
    return;
  } catch (error: any) {
    console.error("Error creating career", error);
    res.status(error?.status || HttpStatusCode.InternalServerError).send({ message: error?.message || "Internal server error." });
    return;
  }
}

export async function getCareers(
  _req: Request,
  res: Response,
  _next: NextFunction,
): Promise<void> {
  try {
    const careers = await models.careers.find({}).lean();
    res.status(HttpStatusCode.Ok).send({ message: "Careers retrieved successfully.", careers });
    return;
  } catch (error: any) {
    console.error("Error fetching careers", error);
    res.status(error?.status || HttpStatusCode.InternalServerError).send({ message: error?.message || "Internal server error." });
    return;
  }
}

export async function createDefaultCareer(
  _req: Request,
  res: Response,
  _next: NextFunction,
): Promise<void> {
  try {
    const name = "FudMasters Growth Essentials";
    const description = "A cohesive path covering Meta Ads setup, differentiated cost fundamentals, brand humanization basics, and lean validation for new products.";
    const courseIds = [2916425, 2917269, 2917339, 2917848];

    const existing = await models.careers.findOne({ name });
    if (existing) {
      const set = new Set<number>([...((existing as any).courseIds || []), ...courseIds]);
      (existing as any).courseIds = Array.from(set);
      (existing as any).description = description;
      (existing as any).isActive = true;
      await (existing as any).save();
      res.status(HttpStatusCode.Ok).send({ message: "Career updated successfully.", career: existing });
      return;
    }

    const created = await models.careers.create({ name, description, imageUrl: null, courseIds, isActive: true });
    res.status(HttpStatusCode.Created).send({ message: "Career created successfully.", career: created });
    return;
  } catch (error: any) {
    console.error("Error creating default career", error);
    res.status(error?.status || HttpStatusCode.InternalServerError).send({ message: error?.message || "Internal server error." });
    return;
  }
}

export async function getCareerById(
  req: Request,
  res: Response,
  _next: NextFunction,
): Promise<void> {
  try {
    const { careerId } = req.params;
    if (!careerId || !Types.ObjectId.isValid(careerId)) {
      res.status(HttpStatusCode.BadRequest).send({ message: "Invalid parameter. A valid careerId is required." });
      return;
    }

    const career = await models.careers.findById(careerId).lean();
    if (!career) {
      res.status(HttpStatusCode.NotFound).send({ message: "Career not found." });
      return;
    }

    const service = new TeachableCoursesService();
    const results = await Promise.all(
      (career.courseIds || []).map(async (cid: number) => {
        try {
          const { data } = await service.showCourse({ course_id: cid } as any);
          return data;
        } catch (_err) {
          return null as any;
        }
      }),
    );
    const courses = results.filter((r: any) => r != null);

    res.status(HttpStatusCode.Ok).send({ message: "Career retrieved successfully.", career, courses });
    return;
  } catch (error: any) {
    console.error("Error fetching career", error);
    res.status(error?.status || HttpStatusCode.InternalServerError).send({ message: error?.message || "Internal server error." });
    return;
  }
}

export async function addCourseToCareer(
  req: Request,
  res: Response,
  _next: NextFunction,
): Promise<void> {
  try {
    const { careerId, courseId } = req.params;
    if (!careerId || !Types.ObjectId.isValid(careerId)) {
      res.status(HttpStatusCode.BadRequest).send({ message: "Invalid parameter. A valid careerId is required." });
      return;
    }
    const courseIdNum = parsePositiveNumber(courseId);
    if (!courseIdNum) {
      res.status(HttpStatusCode.BadRequest).send({ message: "Invalid parameter. A valid courseId is required." });
      return;
    }

    const career = await models.careers.findById(careerId);
    if (!career) {
      res.status(HttpStatusCode.NotFound).send({ message: "Career not found." });
      return;
    }

    const exists = (career.courseIds || []).some((cid: number) => Number(cid) === Number(courseIdNum));
    if (!exists) {
      career.courseIds.push(courseIdNum);
      await career.save();
    }

    res.status(HttpStatusCode.Ok).send({ message: "Course assigned to career successfully.", career });
    return;
  } catch (error: any) {
    console.error("Error assigning course to career", error);
    res.status(error?.status || HttpStatusCode.InternalServerError).send({ message: error?.message || "Internal server error." });
    return;
  }
}

export async function removeCourseFromCareer(
  req: Request,
  res: Response,
  _next: NextFunction,
): Promise<void> {
  try {
    const { careerId, courseId } = req.params;
    if (!careerId || !Types.ObjectId.isValid(careerId)) {
      res.status(HttpStatusCode.BadRequest).send({ message: "Invalid parameter. A valid careerId is required." });
      return;
    }
    const courseIdNum = parsePositiveNumber(courseId);
    if (!courseIdNum) {
      res.status(HttpStatusCode.BadRequest).send({ message: "Invalid parameter. A valid courseId is required." });
      return;
    }

    const career = await models.careers.findById(careerId);
    if (!career) {
      res.status(HttpStatusCode.NotFound).send({ message: "Career not found." });
      return;
    }

    career.courseIds = (career.courseIds || []).filter((cid: number) => Number(cid) !== Number(courseIdNum));
    await career.save();

    res.status(HttpStatusCode.Ok).send({ message: "Course removed from career successfully.", career });
    return;
  } catch (error: any) {
    console.error("Error removing course from career", error);
    res.status(error?.status || HttpStatusCode.InternalServerError).send({ message: error?.message || "Internal server error." });
    return;
  }
}

async function resolveTeachableUserId(userId?: string, teachableUserId?: any): Promise<number | undefined> {
  const n = Number(teachableUserId);
  if (Number.isFinite(n) && n > 0) return n;
  if (userId && Types.ObjectId.isValid(userId)) {
    const user = await models.users.findById(userId).lean();
    const id = Number((user as any)?.teachableUserId);
    if (Number.isFinite(id) && id > 0) return id;
  }
  return undefined;
}

export async function assignCareerToUser(
  req: Request,
  res: Response,
  _next: NextFunction,
): Promise<void> {
  try {
    const { careerId, userId } = req.params;
    if (!careerId || !Types.ObjectId.isValid(careerId)) {
      res.status(HttpStatusCode.BadRequest).send({ message: "Invalid parameter. A valid careerId is required." });
      return;
    }
    if (!userId || !Types.ObjectId.isValid(userId)) {
      res.status(HttpStatusCode.BadRequest).send({ message: "Invalid parameter. A valid userId is required." });
      return;
    }

    const career = await models.careers.findById(careerId).lean();
    if (!career) {
      res.status(HttpStatusCode.NotFound).send({ message: "Career not found." });
      return;
    }

    const user = await models.users.findById(userId);
    if (!user) {
      res.status(HttpStatusCode.NotFound).send({ message: "User not found." });
      return;
    }

    const exists = (user.careers || []).some((c: any) => String(c.careerId) === String(career._id));
    if (!exists) {
      user.careers.push({ careerId: String(career._id), name: career.name, courseIds: (career.courseIds || []), status: "active", enrolledAt: new Date(), careerRef: career._id });
      await user.save();
    }

    const { autoEnroll, teachableUserId } = (req.query || {}) as Record<string, any>;
    const autoEnrollFlag = String(autoEnroll || "").trim().toLowerCase() === "true";

    if (autoEnrollFlag) {
      const finalTeachableUserId = await resolveTeachableUserId(userId, teachableUserId);
      if (!finalTeachableUserId) {
        res.status(HttpStatusCode.BadRequest).send({ message: "Invalid payload. A valid teachableUserId or userId is required." });
        return;
      }
      const usersService = new TeachableUsersService();
      const courseIds = Array.from(new Set((career.courseIds || []).filter((cid: number) => Number.isFinite(cid) && cid > 0)));
      for (const cid of courseIds) {
        try {
          await usersService.enrollUser({ user_id: finalTeachableUserId, course_id: cid } as any);
        } catch (_err) { }
      }
      // reflect locally
      const freshUser = await models.users.findById(userId);
      if (freshUser) {
        for (const cid of courseIds) {
          const hasCourse = (freshUser.courses || []).some((c: any) => Number(c.teachableCourseId) === Number(cid));
          if (!hasCourse) {
            freshUser.courses.push({ teachableCourseId: cid, status: "active", enrolledAt: new Date(), expiresAt: null, courseRef: null });
          }
        }
        await freshUser.save();
        res.status(HttpStatusCode.Ok).send({ message: "Career assigned to user successfully.", user: freshUser, enrolledCourseIds: courseIds });
        return;
      }
    }

    res.status(HttpStatusCode.Ok).send({ message: "Career assigned to user successfully.", user });
    return;
  } catch (error: any) {
    console.error("Error assigning career to user", error);
    res.status(error?.status || HttpStatusCode.InternalServerError).send({ message: error?.message || "Internal server error." });
    return;
  }
}

export async function enrollUserToCareerCourses(
  req: Request,
  res: Response,
  _next: NextFunction,
): Promise<void> {
  try {
    const { careerId, userId } = req.params;
    if (!careerId || !Types.ObjectId.isValid(careerId)) {
      res.status(HttpStatusCode.BadRequest).send({ message: "Invalid parameter. A valid careerId is required." });
      return;
    }
    if (!userId || !Types.ObjectId.isValid(userId)) {
      res.status(HttpStatusCode.BadRequest).send({ message: "Invalid parameter. A valid userId is required." });
      return;
    }

    const { teachableUserId } = (req.query || {}) as Record<string, any>;
    const finalTeachableUserId = await resolveTeachableUserId(userId, teachableUserId);
    if (!finalTeachableUserId) {
      res.status(HttpStatusCode.BadRequest).send({ message: "Invalid payload. A valid teachableUserId or userId is required." });
      return;
    }

    const career = await models.careers.findById(careerId).lean();
    if (!career) {
      res.status(HttpStatusCode.NotFound).send({ message: "Career not found." });
      return;
    }

    const usersService = new TeachableUsersService();
    const courseIds = Array.from(new Set((career.courseIds || []).filter((cid: number) => Number.isFinite(cid) && cid > 0)));
    for (const cid of courseIds) {
      try {
        await usersService.enrollUser({ user_id: finalTeachableUserId, course_id: cid } as any);
      } catch (_err) { }
    }

    const user = await models.users.findById(userId);
    if (user) {
      for (const cid of courseIds) {
        const exists = (user.courses || []).some((c: any) => Number(c.teachableCourseId) === Number(cid));
        if (!exists) {
          user.courses.push({ teachableCourseId: cid, status: "active", enrolledAt: new Date(), expiresAt: null, courseRef: null });
        }
      }
      await user.save();
    }

    res.status(HttpStatusCode.Ok).send({ message: "User enrolled to career courses successfully." });
    return;
  } catch (error: any) {
    console.error("Error enrolling user to career courses", error);
    res.status(error?.status || HttpStatusCode.InternalServerError).send({ message: error?.message || "Internal server error." });
    return;
  }
}

export async function getUserCareers(
  req: Request,
  res: Response,
  _next: NextFunction,
): Promise<void> {
  try {
    const { userId } = req.params;
    if (!userId || !Types.ObjectId.isValid(userId)) {
      res.status(HttpStatusCode.BadRequest).send({ message: "Invalid parameter. A valid userId is required." });
      return;
    }

    const user = await models.users.findById(userId).lean();
    if (!user) {
      res.status(HttpStatusCode.NotFound).send({ message: "User not found." });
      return;
    }

    const careers = Array.isArray(user.careers) ? user.careers : [];
    const details = await Promise.all(
      careers.map(async (c: any) => {
        try {
          const refId = c.careerRef || c.careerId;
          const doc = refId && Types.ObjectId.isValid(String(refId)) ? await models.careers.findById(refId).lean() : null;
          return { access: c, info: doc };
        } catch (_err) {
          return { access: c, info: null };
        }
      }),
    );

    res.status(HttpStatusCode.Ok).send({ message: "User careers retrieved successfully.", careers: details });
    return;
  } catch (error: any) {
    console.error("Error fetching user careers", error);
    res.status(error?.status || HttpStatusCode.InternalServerError).send({ message: error?.message || "Internal server error." });
    return;
  }
}

export async function seedCareers(
  _req: Request,
  res: Response,
  _next: NextFunction,
): Promise<void> {
  try {
    const requestedCareers = [
      {
        name: "Programa Intensivo de Dominios Científicos y Matemáticos",
        slogan: "Domina la lógica detrás de las ciencias exactas y naturales.",
        description: "Esta ruta está diseñada para estudiantes que se están preparando para pruebas de admisión, enfocándose en los dominios evaluados frecuentemente.",
        courseIds: [2927923, 2927931, 2927866, 2927928],
        imageUrl: "https://uploads.teachablecdn.com/attachments/ddee34ab49b74b2a9ea3d8a313120585.jpeg"
      },
      {
        name: "Desarrollo del Pensamiento Crítico y Razonamiento Cuantitativo",
        slogan: "Aprende a pensar, analizar y deducir, no solo a memorizar.",
        description: "Esta ruta pone el énfasis no tanto en la materia en sí, sino en cómo pensar: lógica, descarte de opciones e intuición.",
        courseIds: [2927923, 2927928, 2927931, 2927866],
        imageUrl: "https://uploads.teachablecdn.com/attachments/47828b718c6a4da889e1d19f29ea1b83.png"
      },
      {
        name: "Fundamentos STEM: Ciencias Exactas y Naturales",
        slogan: "Una visión integral del universo: desde el átomo hasta el ecosistema.",
        description: "Una ruta académica y formal, ideal como complemento al colegio o universidad, presentando las ciencias como un todo integrado.",
        courseIds: [2927866, 2927928, 2927923, 2927931],
        imageUrl: "https://uploads.teachablecdn.com/attachments/4ef1f5800d2e41c4858f55adc405abe1.png"
      }
    ];

    const results = [];
    for (const data of requestedCareers) {
      const existing = await models.careers.findOne({ name: data.name });
      if (existing) {
        existing.slogan = data.slogan;
        existing.description = data.description;
        existing.courseIds = data.courseIds;
        existing.imageUrl = data.imageUrl;
        existing.isActive = true;
        await existing.save();
        results.push({ name: data.name, action: "updated" });
      } else {
        await models.careers.create({ ...data, isActive: true });
        results.push({ name: data.name, action: "created" });
      }
    }

    res.status(HttpStatusCode.Ok).send({
      message: "Careers seeded successfully.",
      results
    });
    return;
  } catch (error: any) {
    console.error("Error seeding careers", error);
    res.status(error?.status || HttpStatusCode.InternalServerError).send({ message: error?.message || "Internal server error." });
    return;
  }
}
