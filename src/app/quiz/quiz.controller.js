import quizServive, {
  generatePdfWithInjectedData,
  makeQuizDataFormate,
} from "./quiz.service.js";
import prisma from "../../../config/db.js";

const { generateQuiz, createCanvaDesign } = quizServive;

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
    const { userId, text, no_of_questions, difficulty_level ,email,subject } = req.body;
    const url = `https://quiz.codistan.org/quiz_creation_text?text=${text}&no_of_questions=${no_of_questions}&difficulty_level=${difficulty_level}`;
    const quiz = await generateQuiz(url, userId);
    const saveQuiz = await prisma.quiz.create({  
      data: {
        userId,
        quizData: quiz?.data,
      },
    });
    const quizData = await makeQuizDataFormate(quiz?.data);
    if (quizData) {
      await generatePdfWithInjectedData(quizData,email);
      return res.status(200).json({
        message: "Quiz generated Successfully ",
        data: saveQuiz,
      });
    }
  } catch (error) {
    res.status(500).json({ error: "Internal Server Error" });
  }
};

export const generatingQuizByLink = async (req, res, next) => {
  try {
    const { userId, quiz_creation_youtube, no_of_questions, difficulty_level,email,subject } =
      req.body;
    const url = `https://quiz.codistan.org/quiz_creation_youtube?youtube_url=${quiz_creation_youtube}&no_of_questions=${no_of_questions}&difficulty_level=${difficulty_level}`;
    const quiz = await generateQuiz(url, userId);
    console.log("quiz?.data+++", quiz?.data);
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
    const { userId, data,email,subject } = req.body;
    const quiz = await prisma.quiz.create({
      data: {
        quizData: data,
        userId,
      },
    });
    const quizData = await makeQuizDataFormate(quiz?.quizData);
    if (quizData) {
      await generatePdfWithInjectedData(quizData,email);
    }
    return res.status(200).json({
      message: "Quiz generated Successfully",
      data: quiz,
    });
  } catch (error) {
    console.error("Error in generating quiz:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};
