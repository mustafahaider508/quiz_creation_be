import axios from "axios";
import {
  authorize,
  injectDataIntoSlide,
  exportSlidesToPDF
} from "../../../utils/slide.js";
import {
  handleAxiosError,
  sendAnswerSheetEmail,
  sendEmail,
  sendTextEmail,
  uploadPDFeToS3,
} from "../../../utils/utils.js";
import path from "path";
import fs from "fs";
import process from "process";
import prisma from "../../../config/db.js";
import FormData from "form-data";
import { PDFDocument } from "pdf-lib";
import { injectDataIntoSlideAnswers } from "../../../answerSlide.js";

export const generatePdfWithInjectedTextDataYoutube = async (
  quizData,
  email,
  subject
) => {
  const auth = await authorize();
  const injectResponse = await injectDataIntoSlide(auth, quizData,subject);
  console.log("injectResponse++", injectResponse);

  if (injectResponse) {
    // Generate an array of file paths for the PDFs
    const pdfFilePaths = injectResponse.map((ele) =>
      path.join(process.cwd(), `/uploads/${ele}.pdf`)
    );

    try {
      // Merge all PDFs into a single PDF
      const mergedPdf = await PDFDocument.create();

      for (const pdfFilePath of pdfFilePaths) {
        // Ensure the file exists before reading
        await fs.promises.access(pdfFilePath, fs.constants.F_OK);

        // Load the PDF to merge
        const pdfBytes = await fs.promises.readFile(pdfFilePath);
        const pdfDoc = await PDFDocument.load(pdfBytes);

        // Copy each page from the current PDF into the merged PDF
        const copiedPages = await mergedPdf.copyPages(
          pdfDoc,
          pdfDoc.getPageIndices()
        );
        copiedPages.forEach((page) => mergedPdf.addPage(page));
      }

      // Write the merged PDF to a new file
      const mergedPdfPath = path.join(
        process.cwd(),
        `/uploads/merged_quiz.pdf`
      );
      const mergedPdfBytes = await mergedPdf.save();
      await fs.promises.writeFile(mergedPdfPath, mergedPdfBytes);

      // Send the merged PDF via email
      const emailData = {
        to: email,
        subject: "Quiz",
        html: "",
        pdfFilePath: [mergedPdfPath], // Send the merged PDF only
      };
      console.log("Merged PDF path:", mergedPdfPath);
      // await sendTextEmail(emailData);

      const pdfFile = {
        originalname: "merged_quiz.pdf",
        buffer: mergedPdfBytes,
        mimetype: "application/pdf",
      };
      const pdfURL = await uploadPDFeToS3(pdfFile);
      console.log("File Uploded succesfully", pdfURL);
      return pdfURL;
    } catch (error) {
      console.error("Error merging PDFs or sending email:", error);
    }
  }
};


export const generatePdfWithInjectedDataYoutube = async (quizData, email,subject) => {
  const auth = await authorize();
  const injectResponse = await injectDataIntoSlide(auth, quizData,subject);
  console.log("injectResponse++", injectResponse);

  if (injectResponse) {
    // Generate an array of file paths for the PDFs
    const pdfFilePaths = injectResponse.map((ele) =>
      path.join(process.cwd(), `/uploads/${ele}.pdf`)
    );

    try {
      // Merge all PDFs into a single PDF
      const mergedPdf = await PDFDocument.create();

      for (const pdfFilePath of pdfFilePaths) {
        // Ensure the file exists before reading
        await fs.promises.access(pdfFilePath, fs.constants.F_OK);

        // Load the PDF to merge
        const pdfBytes = await fs.promises.readFile(pdfFilePath);
        const pdfDoc = await PDFDocument.load(pdfBytes);

        // Copy each page from the current PDF into the merged PDF
        const copiedPages = await mergedPdf.copyPages(
          pdfDoc,
          pdfDoc.getPageIndices()
        );
        copiedPages.forEach((page) => mergedPdf.addPage(page));
      }

      // Write the merged PDF to a new file
      const mergedPdfPath = path.join(
        process.cwd(),
        `/uploads/merged_quiz.pdf`
      );
      const mergedPdfBytes = await mergedPdf.save();
      await fs.promises.writeFile(mergedPdfPath, mergedPdfBytes);

      // Send the merged PDF via email
      const emailData = {
        to: email,
        subject: "Quiz",
        html: "",
        pdfFilePath: [mergedPdfPath], // Send the merged PDF only
      };
      console.log("Merged PDF path:", mergedPdfPath);
      // await sendEmail(emailData);

      const pdfFile = {
        originalname: "merged_quiz.pdf",
        buffer: mergedPdfBytes,
        mimetype: "application/pdf",
      };
      const pdfURL = await uploadPDFeToS3(pdfFile);
      console.log("File Uploded succesfully", pdfURL);
      return pdfURL;
    } catch (error) {
      console.error("Error merging PDFs or sending email:", error);
    }
  }
};

export const generatePdfAnswerSheet = async (newQuizData, email,subject) => {
  const auth = await authorize();
  const injectResponse = await injectDataIntoSlideAnswers(auth, newQuizData,subject);
  console.log("injectResponse++", injectResponse);

  if (injectResponse) {
    try {
      const pdfFilePath = path.join(
        process.cwd(),
        `/uploads/presentation_answerSheet.pdf`
      );

      // Wait for the file reading to complete
      const buffer = await new Promise((resolve, reject) => {
        fs.access(pdfFilePath, fs.constants.F_OK, (err) => {
          if (err) {
            console.log(`File not found: ${pdfFilePath}`);
            return reject(new Error(`File not found: ${pdfFilePath}`));
          }

          // File exists, read it
          fs.readFile(pdfFilePath, (err, pdfData) => {
            if (err) {
              console.log("Error reading PDF file:", err);
              return reject(err);
            }

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

      // Proceed only if the buffer is correctly read
      if (buffer && buffer.length > 0) {
        const emailData = {
          to: email,
          subject: "Quiz",
          html: "",
          pdfFilePath: buffer,
        };
        console.log("buffer++++>>", buffer.length);
        console.log("emailData+++", emailData);

        // await sendAnswerSheetEmail(emailData);
      } else {
        console.error("No valid PDF buffer found; email not sent.");
      }
    } catch (err) {
      console.error("Error while handling PDF:", err);
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

const ensureFileExists = (filePath) => {
  return new Promise((resolve, reject) => {
    const fileStream = fs.createReadStream(filePath);
    fileStream.on("open", () => resolve(filePath));
    fileStream.on("error", (err) =>
      reject(`Error reading file: ${err.message}`)
    );
  });
};

const generateQuizfromYoutube = async (url, filePath) => {
  if (!url || typeof url !== "string") {
    throw new Error("A valid URL must be provided to generate the quiz.");
  }
  if (!filePath || typeof filePath !== "string") {
    throw new Error("A valid file path must be provided.");
  }

  try {
    // Ensure the file is fully created and accessible before proceeding
    await ensureFileExists(filePath);
    console.log("File confirmed as existing:", filePath);

    // Initialize FormData and attach the file
    const formData = new FormData();
    formData.append("file", fs.createReadStream(filePath));

    console.log("Preparing request with URL:", url);
    console.log("File path:", filePath);

    // Make POST request to the given URL with FormData
    const response = await axios.post(url, formData, {
      headers: {
        ...formData.getHeaders(), // Use FormData headers
      },
      maxContentLength: Infinity,
      maxBodyLength: Infinity,
      timeout: 600000, // Increase timeout for large file uploads
    });

    console.log("asdf", response);
    if (response.status !== 200) {
      throw new Error(`Unexpected response status: ${response.status}`);
    }

    const responseData = response.data;
    if (!responseData || typeof responseData !== "object") {
      throw new Error("Received invalid response data from the server.");
    }

    return responseData;
  } catch (error) {
    console.error("Error in generateQuizfromYoutube:", error.response);
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

export const makeQuizAnswerSheetResponse = (data) => {
  //Set The Data for AnswerSheet
  const quizAnswers = data["QUIZ QUESTIONS & ANSWERS"].map((ele, index) => ({
    question: ele[`Question ${index + 1}`] || "",
    correctAnswer: ele?.Correct_answer || "",
  }));
  const limitedAnswers = quizAnswers.slice(0, 8);
  const toFill = 8 - limitedAnswers.length;
  const emptyEntries = Array.from({ length: toFill }, () => ({
    question: "",
    correctAnswer: "",
  }));
  const newQuizData = [...limitedAnswers, ...emptyEntries];
  return newQuizData;
};

const quizService = {
  generateQuiz,
  generateQuizfromYoutube,
  generatePdfWithInjectedTextDataYoutube,
  generatePdfWithInjectedDataYoutube,
  createCanvaDesign,
  generateQuizbyFile,
  getQuizByUserId,
  editQuiz,
  convertVideoToMp3,
  saveFile,
};
export default quizService;
