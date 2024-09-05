import quizServive from "./quiz.service.js";
import axios from "axios";
import fs from "fs";
import prisma from "../../../config/db.js";
import { authorize, listSlides } from "../../../utils/slide.js";

const { generateQuiz, createCanvaDesign, generateQuizbyFile } = quizServive;

//Upload
export const getCanvaTemplate = async (req, res) => {
  try {
    const { quizQuestions } = req.body;
    let templateId = "";
    const template = await createCanvaDesign(templateId, quizQuestions);
    res.status(200).json({ template });
  } catch (error) {
    console.error("Error creating Canva design:", error);
    throw error;
  }
};
export const generatingQuizByText = async (req, res, next) => {
  try {
    const { userId, text, no_of_questions, difficulty_level } = req.body;
    const url = `http://100.27.81.124/quiz_creation_text?text=${text}&no_of_questions=${no_of_questions}&difficulty_level=${difficulty_level}`;
    const quiz = await generateQuiz(url, userId);
    const saveQuiz = await prisma.quiz.create({
      data: {
        userId,
        quizData: quiz?.data,
      },
    });
    if(saveQuiz){
      authorize().then(listSlides).catch(console.error);
    }
    return res.status(200).json({
      message: "Quiz generated Successfully ",
      data: saveQuiz,
    });
  } catch (error) {
    res.status(500).json({ error: "Internal Server Error" });
  }
};

export const generatingQuizByLink = async (req, res, next) => {
  try {
    const { userId, quiz_creation_youtube, no_of_questions, difficulty_level } =
      req.body;
    const url = `http://100.27.81.124/quiz_creation_youtube?youtube_url=${quiz_creation_youtube}&no_of_questions=${no_of_questions}&difficulty_level=${difficulty_level}`;
    const quiz = await generateQuiz(url, userId);
    console.log("quiz link",quiz)
    const saveQuiz = await prisma.quiz.create({
      data: {
        userId,
        quizData: quiz?.data,
      },
    });
    return res.status(200).json({
      message: "Quiz generated Successfully",
      data: saveQuiz,
    });
  } catch (error) {
    console.error("Error in generating quiz:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

export const generatingQuizByFile = async (req, res, next) => {
  try {
    const { userId, data } = req.body;
    const quiz = await prisma.quiz.create({
      data: {
        quizData: data,
        userId,
      },
    });

    return res.status(200).json({
      message: "Quiz generated",
      data: quiz,
    });
  } catch (error) {
    console.error("Error in generating quiz:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};
