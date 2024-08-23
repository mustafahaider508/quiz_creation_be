import axios from "axios";
const generateQuiz = async (prompt) => {
  try {
    const response = await axios.post(
      "https://api.openai.com/v1/chat/completions",
      {
        model: "gpt-3.5-turbo",
        messages: [
          { role: "system", content: "You are a quiz generator." },
          { role: "user", content: prompt },
        ],
        max_tokens: 150,
        n: 1,
        stop: null,
        temperature: 0.7,
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
          "Content-Type": "application/json",
        },
      }
    );
    console.log("res", response.data.choices);
    return response.data.choices;
  } catch (error) {
    console.error("Error generating quiz:", error);
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
};
export default quizService;
