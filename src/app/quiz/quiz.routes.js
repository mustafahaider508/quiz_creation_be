import express from "express";
import {
  generatingQuizByText,
  generatingQuizByLink,
  generatingQuizByFile,
  getUserQuiz
} from "./quiz.controller.js";


const router = express.Router();

// @route    POST /quizv
// @desc     generating  quiz
// @access   private
router.post("/generate-quiz-text", generatingQuizByText);
router.post("/generate-quiz-link", generatingQuizByLink);
router.post("/generate-quiz-file",generatingQuizByFile);
router.get("/users",getUserQuiz);

export default router;
