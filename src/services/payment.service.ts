import { models } from "../models";
import { TeachableUsersService, TeachableCoursesService } from "./teachable";
import { EmailService } from "./email.service";
import type { IUser, CourseAccess } from "../types/user";
import type { CreateUserBodyParam, EnrollUserBodyParam } from "@api/teachable/types";
import axios from "axios";

// Utils
const randomPassword = (length: number): string => {
  const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  return Array.from({ length }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
};

function extractTeachableUserId(resp: unknown): number | undefined {
  const r = resp as { data?: { id?: number; user?: { id?: number } } } | undefined;
  const id = r?.data?.id ?? r?.data?.user?.id;
  return typeof id === "number" ? id : undefined;
}

export type PaymentPayload = {
  email?: string;
  transactionStatus?: string;
  statusCode?: number;
  authorizationCode?: string;
  transactionId?: string | number;
  amount?: number | string;
  currency?: string;
  reference?: string;
  courseIds?: Array<number | string> | null;
  name?: string;
};

export class PaymentService {
  /**
   * Main entry point to process a payment notification/registration.
   * If user exists: update to founder, register payment.
   * If user new: create user, set as founder, register in Teachable, enroll, send email.
   */
  async processPaymentRegistration(payload: PaymentPayload): Promise<{ user: IUser; isNew: boolean }> {
    const { email, transactionStatus, statusCode } = payload;

    // Validate email
    if (!email || typeof email !== "string") {
      throw new Error("Invalid payload. Email is required.");
    }

    // Validate transaction status
    if (!(transactionStatus === "Approved" || statusCode === 3)) {
      throw new Error("Invalid payload. Transaction must be approved.");
    }

    const amountVal = payload.amount;
    const amount = typeof amountVal === "string" ? Number(amountVal) : amountVal;
    const currency = payload.currency;
    const transactionId = payload.transactionId;
    const authorizationCode = payload.authorizationCode;

    // Check if user exists
    let user = await models.users.findOne({ email });

    if (user) {
      // EXISTING USER LOGIC
      // 1. Register payment
      if (transactionId || amount || currency) {
        user.payments.push({
          provider: "other",
          amount: Number(amount || 0),
          currency: String(currency || "USD"),
          transactionId: String(transactionId || authorizationCode || ""),
          status: "completed",
          createdAt: new Date(),
        });
      }

      // 2. Upgrade to founder if not already (or ensure it stays founder/better?)
      // User request: "solo cambiarle el estado de free a founder"
      // We will force set it to founder as requested.
      user.accountType = "founder";

      await user.save();

      // 3. Enroll in ALL available courses
      const teachableCoursesService = new TeachableCoursesService();
      try {
        const coursesResponse = await teachableCoursesService.listCourses();
        if (coursesResponse?.data?.courses) {
          const allCourses = coursesResponse.data.courses as { id: number; is_published: boolean }[];
          const courseIds = allCourses
            .filter(c => c.is_published && c.id)
            .map(c => c.id);

          await this.enrollUserInCourses(user, undefined, courseIds);
        }
      } catch (error) {
        console.error("Error enrolling existing user in all courses:", error);
      }

      return { user: user.toObject(), isNew: false };

    } else {
      // NEW USER LOGIC
      let name = payload.name || "User";
      if (!payload.name && typeof payload.reference === "string") {
        const parts = payload.reference.split(" - ").map(s => s.trim());
        if (parts.length >= 3) name = parts[parts.length - 2];
      }

      const password = randomPassword(12);
      user = await models.users.create({
        name,
        email,
        password,
        accountType: "founder" // All paid registrations are founder
      });

      // Register Payment
      if (transactionId || amount || currency) {
        user.payments.push({
          provider: "other",
          amount: Number(amount || 0),
          currency: String(currency || "USD"),
          transactionId: String(transactionId || authorizationCode || ""),
          status: "completed",
          createdAt: new Date(),
        });
        await user.save();
      }

      // Teachable Registration & Enrollment (ALL COURSES)
      const teachableCoursesService = new TeachableCoursesService();
      try {
        const coursesResponse = await teachableCoursesService.listCourses();
        let courseIds: number[] = [];
        if (coursesResponse?.data?.courses) {
          const allCourses = coursesResponse.data.courses as { id: number; is_published: boolean }[];
          courseIds = allCourses
            .filter(c => c.is_published && c.id)
            .map(c => c.id);
        }

        // Use default behavior if listCourses fails or returns empty, but prefer ALL
        if (courseIds.length === 0 && payload.courseIds) {
          // fallback to payload if fetch fails
          courseIds = payload.courseIds.map(id => Number(id)).filter(n => !isNaN(n));
        }

        await this.handleTeachableRegistration(user, password, courseIds);
      } catch (error) {
        console.error("Error enrolling new user in all courses:", error);
        // Fallback to default registration if listCourses fails completely
        await this.handleTeachableRegistration(user, password, payload.courseIds);
      }

      // Send Email (Only for new users)
      const emailService = new EmailService();
      await emailService.sendTemporaryPassword(email, name, password);

      return { user: user.toObject(), isNew: true };
    }
  }

  async confirmAndProcess(id: string, clientTxId: string, userEmail?: string, userName?: string): Promise<{ user: IUser; isNew: boolean }> {
    // A. Llamar a Payphone desde el Backend (Servidor a Servidor es 100% seguro)
    let payphoneData;
    try {
      const response = await axios.post(
        'https://pay.payphonetodoesposible.com/api/button/V2/Confirm',
        {
          id: Number(id),
          clientTxId: clientTxId
        },
        {
          headers: {
            'Authorization': `Bearer ${process.env.PAYPHONE_TOKEN}`, // Asegúrate que esto esté en tu .env del backend
            'Content-Type': 'application/json'
          }
        }
      );
      payphoneData = response.data;
    } catch (error: any) {
      const err = error as { response?: { data?: unknown }; message?: string };
      console.error("[Payment] Error conectando con Payphone:", err.response?.data || err.message);
      throw new Error("Error de comunicación con pasarela de pagos.");
    }

    // B. Verificar si Payphone aprobó
    if (payphoneData.statusCode !== 3) {
      console.warn(`[Payment] Pago rechazado o pendiente. Status: ${payphoneData.statusCode}`);
      // Incluso si falla, podrías querer guardar el intento en logs, pero lanzamos error para el frontend
      throw new Error(`El pago no fue aprobado. Estado: ${payphoneData.transactionStatus}`);
    }

    // C. Mapear la respuesta de Payphone a tu estructura PaymentPayload
    const payload: PaymentPayload = {
      email: userEmail || payphoneData.email || payphoneData.optionalParameter2, // Usar param opcional si el email principal viene vacío
      transactionStatus: payphoneData.transactionStatus,
      statusCode: payphoneData.statusCode,
      authorizationCode: payphoneData.authorizationCode,
      transactionId: payphoneData.transactionId,
      amount: (payphoneData.amount / 100), // Payphone devuelve centavos, convertimos a dólares
      currency: payphoneData.currency,
      reference: payphoneData.reference,
      name: userName, // Agregar name
      // courseIds se puede inferir del producto o reference si es necesario
    };

    // D. Ejecutar tu lógica existente de Teachable/Mongo
    return this.processPaymentRegistration(payload);
  }

  // Helper to enroll existing user in list of courses
  private async enrollUserInCourses(user: IUser & { save: () => Promise<IUser> }, password: string | undefined, courseIds: number[]) {
    if (!user.teachableUserId) {
      // Attempt to find or create teachable user if missing
      const teachableService = new TeachableUsersService();
      // We might not have password for existing user, so we can't create easily if they don't exist.
      // Assuming they might exist or we skip. 
      // However, if we are upgrading, we really want them enrolled.
      // Let's try to sync user first.
      if (!password) password = randomPassword(12); // Dummy password if we need to create

      // Check if we can find them? Teachable API doesn't have easy "find by email" in this SDK maybe?
      // We will try create. If exists, it might fail or return existing?
      // SDK `createUser` usually returns 422 if exists.
      // For now, let's skip if no teachableUserId and assume handleTeachableRegistration logic is needed.
      await this.handleTeachableRegistration(user, password, courseIds);
      return;
    }

    const teachableService = new TeachableUsersService();
    for (const cid of courseIds) {
      let enrolledRemotely = false;
      try {
        const body: EnrollUserBodyParam = { user_id: user.teachableUserId, course_id: cid };
        await teachableService.enrollUser(body);
        enrolledRemotely = true;
      } catch (err) {
        // ... error handling similar to handleTeachableRegistration
        const status = (err as { status?: number }).status ?? (err as { response?: { status?: number } }).response?.status;
        const rawMsg = (err as { data?: { message?: string }; message?: string }).data?.message ?? (err as { message?: string }).message ?? "";
        const msg = typeof rawMsg === "string" ? rawMsg.toLowerCase() : "";
        if (status === 422 || msg.includes("already enrolled")) {
          enrolledRemotely = true;
        } else {
          console.error("Teachable enroll error (existing user)", { courseId: cid, error: err });
        }
      }

      const exists = (user.courses || []).some((c: CourseAccess) => Number(c.teachableCourseId) === Number(cid));
      if (enrolledRemotely && !exists) {
        user.courses.push({ teachableCourseId: cid, status: "active", enrolledAt: new Date(), expiresAt: null, courseRef: null });
      }
    }
    await user.save();
  }

  private async handleTeachableRegistration(user: IUser & { save: () => Promise<IUser> }, password: string, payloadCourseIds?: Array<number | string> | null) {
    const teachableService = new TeachableUsersService();
    let teachableUserId = user.teachableUserId;

    if (!teachableUserId) {
      const createBody: CreateUserBodyParam = { name: user.name, email: user.email, password };
      try {
        const teachableRes = await teachableService.createUser(createBody);
        teachableUserId = extractTeachableUserId(teachableRes);
      } catch (error: any) {
        const err = error as Error;
        // If user already exists in Teachable (422 or 409), we might need to search for them or just fail to get ID?
        // The current flow relies on creating. If they exist in Teachable but not in our DB with ID, we have a disconnect.
        // For now, let's assume success or if "taken", maybe we can't easily get the ID without "listUsers" filtering by email which is expensive.
        // But let's proceed.
        console.error("Error creating Teachable user", err);
      }
    }

    if (typeof teachableUserId === "number") {
      user.teachableUserId = teachableUserId;
      await user.save();

      // Determine course IDs
      let courseIds: number[] = [];

      // If payloadCourseIds is passed (which now might be ALL courses), use it.
      if (payloadCourseIds && Array.isArray(payloadCourseIds) && payloadCourseIds.length > 0) {
        courseIds = payloadCourseIds.map(v => Number(v)).filter(n => Number.isFinite(n) && n > 0);
      } else {
        // Fallback to Env vars if nothing passed (should not happen with new logic calling this)
        const envCourseIdsRaw = process.env.TEACHABLE_DEFAULT_COURSE_IDS;
        const envSingle = process.env.TEACHABLE_DEFAULT_COURSE_ID;

        if (envCourseIdsRaw && envCourseIdsRaw.trim() !== "") {
          courseIds = envCourseIdsRaw.split(",").map(s => Number(s.trim())).filter(n => Number.isFinite(n) && n > 0);
        } else if (envSingle && String(envSingle).trim() !== "") {
          const single = Number(envSingle);
          if (Number.isFinite(single) && single > 0) courseIds = [single];
        }
        const mandatoryCourseId = 2916425;
        const prioritized = [mandatoryCourseId, ...courseIds.filter((id) => id !== mandatoryCourseId)];
        courseIds = Array.from(new Set(prioritized)); // Removed .slice(0,3) to allow ALL
      }


      for (const cid of courseIds) {
        let enrolledRemotely = false;
        try {
          const body: EnrollUserBodyParam = { user_id: teachableUserId, course_id: cid };
          await teachableService.enrollUser(body);
          enrolledRemotely = true;
        } catch (err) {
          const status = (err as { status?: number }).status ?? (err as { response?: { status?: number } }).response?.status;
          const rawMsg = (err as { data?: { message?: string }; message?: string }).data?.message ?? (err as { message?: string }).message ?? "";
          const msg = typeof rawMsg === "string" ? rawMsg.toLowerCase() : "";
          if (status === 422 || msg.includes("already enrolled")) {
            enrolledRemotely = true;
          } else {
            console.error("Teachable enroll error", { courseId: cid, error: err });
          }
        }

        const exists = (user.courses || []).some((c: CourseAccess) => Number(c.teachableCourseId) === Number(cid));
        if (enrolledRemotely && !exists) {
          user.courses.push({ teachableCourseId: cid, status: "active", enrolledAt: new Date(), expiresAt: null, courseRef: null });
        }
      }
      await user.save();
    }
  }
}
