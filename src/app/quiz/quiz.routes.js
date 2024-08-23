import express from "express";
import { generatingQuiz } from "./quiz.controller.js";

const router = express.Router();

// @route    POST /quiz
// @desc     generating  quiz
// @access   private
router.post("/generate", generatingQuiz);
router.post("/generate-template", generatingQuiz);



export default router;
