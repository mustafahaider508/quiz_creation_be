import quizServive, {
  generatePdfWithInjectedData,
  makeQuizDataFormate,
} from './quiz.service.js';
import prisma from '../../../config/db.js';
import quizService from './quiz.service.js';
import axios from 'axios';
import path from 'path';
import fs from 'fs';
import { uploadPDFeToS3 } from '../../../utils/utils.js';
// import process from 'process';
const { generateQuiz, generateQuizfromYoutube, createCanvaDesign } =
  quizServive;

export const getCanvaTemplate = async (req, res) => {
  try {
    const { quizQuestions } = req.body;
    let templateId = '';
    const template = await createCanvaDesign(templateId, quizQuestions);
    res.status(200).json({ template });
  } catch (error) {
    console.error('Error creating Canva design:', error);
    throw error;
  }
};
export const generatingQuizByText = async (req, res, next) => {
  try {
    const { userId, text, no_of_questions, difficulty_level, email } = req.body;
    const url = `https://quiz.codistandemos.org/quiz_creation_text?text=${text}&no_of_questions=${no_of_questions}&difficulty_level=${difficulty_level}`;
    const quiz = await generateQuiz(url);
    const saveQuiz = await prisma.quiz.create({
      data: {
        userId,
        quizData: quiz?.data,
      },
    });
    const quizData = await makeQuizDataFormate(quiz?.data);
    if (quizData) {
      await generatePdfWithInjectedData(quizData, email);
      return res.status(200).json({
        message: 'Quiz generated Successfully ',
        data: saveQuiz,
      });
    }
  } catch (error) {
    res.status(500).json({ error: error, message: 'Internal Server Error' });
  }
};

// Update The Quiz by Text
export const updatingQuizByText = async (req, res, next) => {
  try {
    const { quizId, userId, text, no_of_questions, difficulty_level, email } =
      req.body;

    const url = `https://quiz.codistandemos.org/quiz_creation_text?text=${text}&no_of_questions=${no_of_questions}&difficulty_level=${difficulty_level}`;
    const quiz = await generateQuiz(url, userId);
    const quizData = await makeQuizDataFormate(quiz?.data);
    const editQuiz = await quizService.editQuiz({ quizId, userId, quiz });
    if (quizData) {
      await generatePdfWithInjectedData(quizData, email);
      return res.status(200).json({
        message: 'Quiz generated Successfully ',
        data: editQuiz,
      });
    }
  } catch (error) {
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

export const generatingQuizByLink = async (req, res, next) => {
  try {
    const {
      userId,
      no_of_questions,
      difficulty_level,
      email,
      subject,
      youtubeUrl,
      formate,
    } = req.body;
    const quizfile = await quizService.convertVideoToMp3({
      youtubeUrl,
      formate,
    });
    console.log('quizfile++++', quizfile?.downloadUrl);
    if (quizfile) {
      const downloadLink = quizfile?.downloadUrl;

      // quizService.saveFile(downloadLink);

      try {
        // Ensure the URL is clean and properly formatted
        const validatedLink = downloadLink.trim();
        console.log('Attempting to download from:', validatedLink);

        // Set a timeout for the request (e.g., 10 seconds)
        setTimeout(async () => {
          const mp3Response = await axios.get(validatedLink, {
            responseType: 'stream',
          });
          if (mp3Response.status !== 200) {
            throw new Error(
              `Failed to download file: HTTP status ${mp3Response.status}`
            );
          }

          const contentType = mp3Response.headers['content-type'];
          if (!contentType.includes('audio')) {
            throw new Error(
              `Unexpected content type: ${contentType}. Expected an audio file.`
            );
          }

          // Ensure 'uploads' directory exists
          const uploadDir = path.resolve('uploads');
          if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
          }

          // Define file path with a unique name
          const filePath = path.join(uploadDir, `${Date.now()}.mp3`);
          const writer = fs.createWriteStream(filePath);

          mp3Response.data.pipe(writer);

          setTimeout(async () => {
            const audioFileBuffer = await fs.promises.readFile(filePath);
            const audioFile = {
              originalname: path.basename(filePath),
              buffer: audioFileBuffer,
              mimetype: 'audio/mpeg',
            };
            const audioURL = await uploadPDFeToS3(audioFile);

            console.log('audio file uploaded', audioURL);
            setTimeout(async () => {
              console.log(
                'hit',
                quizfile?.downloadUrl,
                no_of_questions,
                difficulty_level
              );
              // const url = `https://quiz.codistandemos.org/quiz_creation_youtube?youtube_url=${quizfile?.downloadUrl}&no_of_questions=${no_of_questions}&difficulty_level=${difficulty_level}`;
              const url = `https://quiz.codistandemos.org/quiz_creation_youtube?no_of_questions=${no_of_questions}&difficulty_level=${difficulty_level}`;

              const quiz = await generateQuizfromYoutube(url, filePath);

              const newQuizData = makeQuizDataFormate(quiz.data);
              const saveQuiz = await prisma.quiz.create({
                data: {
                  userId,
                  quizData: newQuizData,
                },
              });

              if (saveQuiz) {
                const pdfURL = await generatePdfWithInjectedData(
                  newQuizData,
                  email
                );

                return res.status(200).json({
                  message: 'Quiz generated Successfully',
                  pdfURL,
                  audioURL,
                  data: saveQuiz,
                });
              }
            }, 5000);
          }, 3000);

          // return new Promise((resolve, reject) => {
          //   writer.on('finish', () => {
          //     console.log('File downloaded successfully:', filePath);
          //     resolve(filePath);
          //   });
          //   writer.on('error', (error) => {
          //     console.error('Error writing file:', error.message);
          //     reject(new Error('Failed to save file.'));
          //   });
          // });
        }, 10000);
      } catch (error) {
        if (axios.isAxiosError(error)) {
          // Check if the error is a timeout or network issue
          if (error.code === 'ECONNABORTED') {
            console.error('Error: Request timed out');
          } else if (error.response) {
            console.error(
              `Error: HTTP ${error.response.status} - ${error.message}`
            );
          } else {
            console.error('Download error:', error.message);
          }
        } else {
          console.error('Unexpected error:', error.message);
        }
        throw new Error('File download failed. Please try again.');
      }
    }
  } catch (error) {
    console.error('Error in generating quiz:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

export const generatingQuizByFile = async (req, res, next) => {
  try {
    const { userId, data, email } = req.body;
    const quiz = await prisma.quiz.create({
      data: {
        quizData: data,
        userId,
      },
    });
    const quizData = await makeQuizDataFormate(quiz?.quizData);
    if (quizData) {
      await generatePdfWithInjectedData(quizData, email);
    }
    return res.status(200).json({
      message: 'Quiz generated Successfully',
      data: quiz,
    });
  } catch (error) {
    console.error('Error in generating quiz:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

//Update Quiz By File
export const updateQuizByFile = async (req, res, next) => {
  try {
    const { quizId, userId, quiz, email } = req.body;
    const editQuiz = await quizService.editQuiz({ quizId, userId, quiz });
    const quizData = await makeQuizDataFormate(quiz);
    if (quizData) {
      await generatePdfWithInjectedData(quizData, email);
    }
    return res.status(200).json({
      message: 'Quiz Re generated Successfully',
      data: editQuiz,
    });
  } catch (error) {
    console.error('Error in generating quiz:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

//Get User Quiz
export const getUserQuiz = async (req, res, next) => {
  try {
    const { userId } = req.query;
    const quiz = await quizService.getQuizByUserId(userId);
    return res.status(200).json({
      message: 'User Quiz Get  Successfully',
      data: quiz,
    });
  } catch (error) {
    console.error('Error in generating quiz:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};
