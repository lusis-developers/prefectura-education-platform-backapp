import { Router } from "express";
import { seedMockData, getAdminStats } from "../controllers/user.controller";
import { seedCareers } from "../controllers/careers.controller";

const adminRouter = Router();

adminRouter.post("/seed", seedMockData);
adminRouter.post("/careers/seed", seedCareers);
adminRouter.get("/stats", getAdminStats);

export default adminRouter;
