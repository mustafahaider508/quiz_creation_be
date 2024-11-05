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
import prisma from "../../../config/db.js";

export const generatePdfWithInjectedData = async (quizData, email) => {
  const auth = await authorize();
  const injectResponse = await injectDataIntoSlide(auth, quizData);
  console.log("injectResponse++", injectResponse);

  if (injectResponse) {
    // Create an array to store the buffers for each PDF
    const buffer = await Promise.all(
      injectResponse.map((ele) => {
        return new Promise((resolve, reject) => {
          const pdfFilePath = path.join(process.cwd(), `/uploads/${ele}.pdf`);

          // Check if the file exists before reading
          fs.access(pdfFilePath, fs.constants.F_OK, (err) => {
            if (err) {
              console.log(`File not found: ${pdfFilePath}`);
              return reject(new Error(`File not found: ${pdfFilePath}`));
            }

            // Read the file if it exists
            fs.readFile(pdfFilePath, (err, pdfData) => {
              if (err) {
                console.log("Error reading PDF file:", err);
                return reject(err);
              }

              // Log only if data is present
              if (pdfData && pdfData.length > 0) {
                console.log("Reading PDF File...", pdfData);
                resolve(pdfData); // Resolve with the PDF data buffer
              } else {
                console.log(`Empty PDF buffer for file: ${pdfFilePath}`);
                reject(new Error(`Empty buffer for file: ${pdfFilePath}`));
              }
            });
          });
        });
      })
    ).catch((err) => {
      console.error("Error collecting PDF buffers:", err);
      return [];
    });

    // Proceed only if all buffers are correctly read
    if (buffer.length > 0) {
      const emailData = {
        to: email,
        subject: "Quiz",
        html: "",
        pdfFilePath: buffer,
      };
      console.log("buffer++++>>", buffer?.length);
      await sendEmail(emailData);
    } else {
      console.error("No valid PDF buffers found; email not sent.");
    }
  }
};

export const makeQuizDataFormate = (quizData) => {
  const data = quizData["QUIZ QUESTIONS & ANSWERS"]?.map((ele, index) => {
    const question = ele[`Question ${index + 1}`];
    const options = ele["Options"] ? Object.values(ele["Options"]) : [];
    return [(index + 1).toString(), question, ...options];
  });
  return data;
};

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

const getQuizByUserId = (userId) => {
  return prisma.quiz.findFirst({
    where: {
      userId,
    },
  });
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

const editQuiz = ({ quizId, userId, quiz }) => {
  return prisma.quiz.update({
    where: {
      id: quizId,
    },
    data: {
      userId,
      quizData: quiz?.data,
    },
  });
};

const saveFile = async (downloadLink) => {
  // try {
  // Extract the MP3 link from the response
  console.log("downloadLink", downloadLink);
  const mp3Link = downloadLink;
  if (!mp3Link) {
    throw new Error("No valid MP3 link received from the API.");
  }

  // Download the MP3 file using the link
  const mp3Response = await axios.get(mp3Link, { responseType: "stream" });

  // Define the path to save the MP3 file
  const filePath = path.resolve("uploads", `${Date.now()}.mp3`);

  // Create a write stream to save the file
  const writer = fs.createWriteStream(filePath);

  // Pipe the response data into the write stream
  mp3Response.data.pipe(writer);

  // Return a promise to handle the download completion
  return new Promise((resolve, reject) => {
    writer.on("finish", () => {
      console.log("File downloaded successfully:", filePath);
      resolve(filePath); // Resolve with the file path
    });
    writer.on("error", reject);
  });
  // } catch (error) {
  //   console.log("Error occurs");
  // }
};

const convertVideoToMp3 = async ({ youtubeUrl, formate }) => {
  try {
    const fullUrl = `https://youtube-to-mp315.p.rapidapi.com/download?url=${youtubeUrl}&format=${formate}`;

    const response = await axios.post(
      fullUrl,
      {},
      {
        headers: {
          "Content-Type": "application/json",
          "x-RapidAPI-Key": process.env.RAPIDAPI_KEY,
          "x-RapidAPI-Host": "youtube-to-mp315.p.rapidapi.com",
        },
      }
    );
    return response.data;
  } catch (error) {
    console.log("Error occurs", error);
  }
};

const quizService = {
  generateQuiz,
  createCanvaDesign,
  generateQuizbyFile,
  getQuizByUserId,
  editQuiz,
  convertVideoToMp3,
  saveFile,
};
export default quizService;
