import { Router } from "express";
import { seedMockData, getAdminStats } from "../controllers/user.controller";

const adminRouter = Router();

adminRouter.post("/seed", seedMockData);
adminRouter.get("/stats", getAdminStats);

export default adminRouter;
