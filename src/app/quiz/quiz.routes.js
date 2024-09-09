import express from "express";
import {
  generatingQuizByText,
  generatingQuizByLink,
  generatingQuizByFile,
} from "./quiz.controller.js";
import multer from "multer";

const router = express.Router();

// @route    POST /quizv
// @desc     generating  quiz
// @access   private
router.post("/generate-quiz-text", generatingQuizByText);
router.post("/generate-quiz-link", generatingQuizByLink);
router.post("/generate-quiz-file",generatingQuizByFile);

export default router;
