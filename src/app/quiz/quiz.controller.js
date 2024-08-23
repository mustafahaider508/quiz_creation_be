import quizServive from "./quiz.service.js";

const { generateQuiz, createCanvaDesign } = quizServive;

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
export const generatingQuiz = async (req, res, next) => {
  try {
    const { topic, numQuestions } = req.body;

    if (!topic || !numQuestions) {
      return res
        .status(400)
        .json({ error: "Please provide topic and number of questions." });
    }
    let templateId =
      "EAFn8wt0TqQ-blue-yellow-and-white-playful-illustrative-quiz-time-instagram-post";
    const prompt = `Generate ${numQuestions} quiz questions on the topic of ${topic}.`;
    const quizQuestions = await generateQuiz(prompt);
    // const canvaDesign = await createCanvaDesign(templateId, quizQuestions);
    //    return  res.json({ canvaDesign });
    return res.json({ quizQuestions });
  } catch (error) {
    if (
      error?.response &&
      error?.response?.data?.error?.code === "insufficient_quota"
    ) {
      return res.status(429).json({
        error:
          "You have exceeded your quota. Please check your OpenAI plan and billing details.",
      });
    } else {
      res.status(500).json({ error: "Internal Server Error" });
    }
  }
};
