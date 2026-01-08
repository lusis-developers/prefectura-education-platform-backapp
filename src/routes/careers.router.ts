import { Router } from "express";
import { createCareer, getCareers, getCareerById, addCourseToCareer, removeCourseFromCareer, assignCareerToUser, enrollUserToCareerCourses, getUserCareers } from "../controllers/careers.controller";

const careersRouter = Router();

careersRouter.post("/", createCareer);
careersRouter.get("/", getCareers);
careersRouter.get("/:careerId", getCareerById);
careersRouter.post("/:careerId/courses/:courseId", addCourseToCareer);
careersRouter.delete("/:careerId/courses/:courseId", removeCourseFromCareer);

export default careersRouter;
careersRouter.post("/:careerId/assign/:userId", assignCareerToUser);
careersRouter.post("/:careerId/enroll/:userId", enrollUserToCareerCourses);
careersRouter.post("/:careerId/join/:userId", enrollUserToCareerCourses);
careersRouter.get("/user/:userId", getUserCareers);
