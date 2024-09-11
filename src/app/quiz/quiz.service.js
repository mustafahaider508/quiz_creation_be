import axios from "axios";
import {
  authorize,
  injectDataIntoSlide,
  exportSlidesToPDF,
} from "../../../utils/slide.js";
import { sendEmail } from "../../../utils/utils.js";
import path from "path";
import fs from "fs";
import process from "process";

export const generatePdfWithInjectedData = async (quizData,email) => {
  const auth = await authorize();
  const injectResponse = await injectDataIntoSlide(auth, quizData);
  if (injectResponse) {
    const pdfResponse = await exportSlidesToPDF(auth);
    console.log("pdfResponse", pdfResponse);
    if (pdfResponse?.message) {
      setTimeout(() => {
        const pdfFilePath = path.join(process.cwd(), "presentation.pdf");
        fs.readFile(pdfFilePath, async (err, pdfData) => {
          if (err) {
            console.log("Error reading PDF file:", err);
            return;
          }
          console.log("reading Pdf File....", pdfData);
          const emailData = {
            to: email,
            subject: "Quiz",
            html: "",
            pdfFilePath: pdfData,
          };
          await sendEmail(emailData);
        });
      }, 1000);
    }
  }
};


export const makeQuizDataFormate = (quizData) => {
  const data = quizData["QUIZ QUESTIONS & ANSWERS"]?.map(
    (ele, index) => {
      const question = ele[`Question ${index + 1}`];
      const options = ele["Options"] ? Object.values(ele["Options"]) : [];
      return [(index + 1).toString(), question, ...options];
    }
  );
  return data
}

const generateQuiz = async (url) => {
  try {
    const response = await axios.post(url, {
      headers: {
        "Content-Type": "application/json",
      },
    });
    return response.data;
  } catch (error) {
    console.error("Error generating quiz:", error);
    throw error;
  }
};

const generateQuizbyFile = async (url, formData) => {
  try {
    const response = await axios.post(url, formData, {
      headers: {
        "Content-Type": "multipart/form-data",
        "Content-Type": "application/json",
      },
    });
    return response.data;
  } catch (error) {
    console.error("Error generating quiz:", error.message);
    throw error;
  }
};

const createCanvaDesign = async (templateId, quizQuestions) => {
  try {
    const response = await axios.post(
      `https://api.canva.com/v1/designs/${templateId}/elements`,
      {
        elements: quizQuestions.map((question, index) => ({
          type: "TEXT",
          text: question,
          x: 0,
          y: index * 100,
        })),
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.CANVA_API_KEY}`,
          "Content-Type": "application/json",
        },
      }
    );
    return response.data;
  } catch (error) {
    console.error("Error creating Canva design:", error);
    throw error;
  }
};

const quizService = {
  generateQuiz,
  createCanvaDesign,
  generateQuizbyFile,
};
export default quizService;
