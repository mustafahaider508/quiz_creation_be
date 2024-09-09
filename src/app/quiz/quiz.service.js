import axios from "axios";
import prisma from "../../../config/db.js";
const generateQuiz = async (url) => {
  console.log("url",url)
  try {
    const response = await axios.post(
      url,
      {
        headers: {
          "Content-Type": "application/json",
        },
      }
      
    );
    return response.data;
  } catch (error) {
    console.error("Error generating quiz:", error);
    throw error;
  }
};

const generateQuizbyFile = async (url, formData) => {
  try {
    const response = await axios.post(url,formData ,{
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

const saveQuiz = async(req,res) => {
  return prisma

}

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
  generateQuizbyFile
};
export default quizService;
