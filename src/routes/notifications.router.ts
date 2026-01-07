import express from 'express';
import { notificationNewCourseForUsers } from '../controllers/courses.controller';

const router = express.Router();



// courses notifications 
router.post('/courses/newCourse/:courseId', notificationNewCourseForUsers)