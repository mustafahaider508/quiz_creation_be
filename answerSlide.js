import fs from "fs/promises";
import path from "path";
import process from "process";
import { authenticate } from "@google-cloud/local-auth";
import { google } from "googleapis";
import { createWriteStream } from "fs"; // For writeStream

// If modifying these scopes, delete token.json.
const SCOPES = [
  "https://www.googleapis.com/auth/presentations",
  "https://www.googleapis.com/auth/presentations.readonly",
  "https://www.googleapis.com/auth/userinfo.email",
  "https://www.googleapis.com/auth/userinfo.profile",
  "https://www.googleapis.com/auth/spreadsheets.readonly",
  "https://www.googleapis.com/auth/drive",
];
// The file token.json stores the user's access and refresh tokens, and is
// created automatically when the authorization flow completes for the first
// time.
const TOKEN_PATH = path.join(process.cwd(), "token.json");
const CREDENTIALS_PATH = path.join(process.cwd(), "credentials.json");

export const loadSavedCredentialsIfExist = async () => {
  try {
    const content = await fs.readFile(TOKEN_PATH, "utf-8");
    const credentials = JSON.parse(content);
    return google.auth.fromJSON(credentials);
  } catch (err) {
    return null;
  }
};

export const saveCredentials = async (client) => {
  const content = await fs.readFile(CREDENTIALS_PATH, "utf-8");
  const keys = JSON.parse(content);
  const key = keys.installed || keys.web;
  const payload = JSON.stringify({
    type: "authorized_user",
    client_id: key.client_id,
    client_secret: key.client_secret,
    refresh_token: client.credentials.refresh_token,
  });
  await fs.writeFile(TOKEN_PATH, payload);
};

export const authorize = async () => {
  let client = await loadSavedCredentialsIfExist();
  if (client) {
    return client;
  }
  client = await authenticate({
    scopes: SCOPES,
    keyfilePath: CREDENTIALS_PATH,
  });
  if (client.credentials) {
    await saveCredentials(client);
  }
  return client;
};

export const listSlides = async (auth) => {
  const slidesApi = google.slides({ version: "v1", auth });
  const res = await slidesApi.presentations.get({
    // presentationId: "1KDw6XIUJ7L6wxGt-WfCP8RjMkMf8_t6DelkfgUCp03k",
    presentationId: "16AIM3vZltZfiRLdVdafa9oIfylkRujf8DVBy9UxnHOA",
  });
  const slides = res.data.slides;
  console.log("slides", slides?.length);

  if (!slides || slides.length === 0) {
    console.log("No slides found.");
    return;
  }

  return slides;
};

//Get TEXT BOX ID OF PREVIOUS QUIZ
async function getTextBoxIdsWithText(slideId, auth) {
  try {
    const presentationId = "16AIM3vZltZfiRLdVdafa9oIfylkRujf8DVBy9UxnHOA";
    const slides = await listSlides(auth, presentationId);
    if (!slides || slides.length === 0) {
      console.error("No slides found in the presentation.");
      return [];
    }

    const slide = slides[0];

    const textBoxIds = [];

    // Iterate through page elements to find text boxes with text
    slide.pageElements.forEach((element) => {
      if (element.shape && element.shape.text) {
        const textContent = element.shape.text.textElements
          .map((textElement) =>
            textElement.textRun ? textElement.textRun.content : ""
          )
          .join("");

        if (textContent.trim() !== "") {
          textBoxIds.push(element.objectId);
        }
      }
    });
    console.log("injecting.....");
    return textBoxIds;
  } catch (error) {
    console.error("Error retrieving text box IDs:", error);
    return [];
  }
}

export async function injectDataIntoSlideAnswers(auth, newQuizData, subject) {
  const presentationId = "16AIM3vZltZfiRLdVdafa9oIfylkRujf8DVBy9UxnHOA";
  const sheetId = "1kKZA3fqjK5tbg0iFhfq6Fh3CAUFpfg1WYGUm9b9y-w0";
  const sheetName = "Ark1";

  const sheetsService = google.sheets({ version: "v4", auth });
  const slidesService = google.slides({ version: "v1", auth });

  // Fetch data from Google Sheets
  const sheetResponse = await sheetsService.spreadsheets.values.get({
    spreadsheetId: sheetId,
    range: `${sheetName}!A1:Z1000`,
  });

  const data = sheetResponse.data.values;

  if (!data || data.length === 0) {
    console.error("No data found in the sheet.");
    return;
  }

  // Fetch slides from the presentation
  const slides = await listSlides(auth, presentationId);
  if (!slides || slides.length === 0) {
    console.error("No slides found in the presentation.");
    return;
  }

  const slide = slides[0];

  // Filter and map text box object IDs
  const textBoxIds = slide.pageElements
    .filter((el) => el.shape && el.shape.shapeType === "TEXT_BOX")
    .map((el) => el.objectId);

  if (!textBoxIds || textBoxIds.length === 0) {
    console.error("No text boxes found on the slide.");
    return;
  }

  console.log("textBoxIds", textBoxIds);

  const updatedTextBoxIds = textBoxIds?.filter(
    (ele) => ele !== "g321f3a02efa_0_0"
  );

  // Assign 4 text boxes per quiz item: [QuestionBox, AnswerABox, AnswerBBox, AnswerCBox]
  const quizData = newQuizData.map((row, index) => ({
    question: row.question || "",
    correctAnswer: row.correctAnswer || "",
    slides: updatedTextBoxIds.slice(index * 4, index * 4 + 4),
  }));

  const requests = [];

  console.log("newQuizData", newQuizData);

  const getSlideIdForAnswer = (quiz, answer) => {
    // Assuming the order is [Question, A, B, C]
    if (answer === "a") return quiz.slides[1];
    if (answer === "b") return quiz.slides[2];
    if (answer === "c") return quiz.slides[3];
    return null;
  };

  if (subject !== "") {
    requests.push({
      deleteText: {
        objectId: "g321f3a02efa_0_0",
        textRange: { type: "ALL" },
      },
    });
    
    requests.push({
      insertText: {
        objectId: "g321f3a02efa_0_0",
        text: subject,
        insertionIndex: 0,
      },
    });
  } 
  for (const quiz of quizData) {
    for (let index = 0; index < quiz.slides.length; index++) {
      const slideId = quiz.slides[index];
      const textBoxIDs = await getTextBoxIdsWithText(slideId, auth); // IDs of text boxes that currently have text

      // Determine the new text to insert
      let newText = "";
      let isQuestionBox = index === 0;
      if (isQuestionBox) {
        newText = quiz.question;
      } else {
        const targetSlideId = getSlideIdForAnswer(quiz, quiz.correctAnswer);
        if (slideId === targetSlideId && quiz.correctAnswer) {
          newText = quiz.correctAnswer;
        } else {
          newText = "";
        }
      }

      const hasCurrentText = textBoxIDs && textBoxIDs.includes(slideId);

      // If there's no new text to insert, but the box currently has text, delete it to make it empty.
      if (!newText && hasCurrentText) {
        requests.push({
          deleteText: {
            objectId: slideId,
            textRange: { type: "ALL" },
          },
        });
        // No insertion or style update since it's set to empty
        continue;
      }

      // If there is new text, first delete existing text if any
      if (newText) {
        if (hasCurrentText) {
          requests.push({
            deleteText: {
              objectId: slideId,
              textRange: { type: "ALL" },
            },
          });
        }

        // Insert the new Subject Title

        // Insert the new text
        requests.push({
          insertText: {
            objectId: slideId,
            text: newText,
            insertionIndex: 0,
          },
        });

        // Update text style based on question or answer
        if (isQuestionBox) {
          requests.push({
            updateTextStyle: {
              objectId: slideId,
              textRange: { type: "ALL" },
              style: {
                fontSize: { magnitude: 4, unit: "PT" },
                bold: true,
                fontFamily: "Arial",
                foregroundColor: {
                  opaqueColor: { rgbColor: { red: 0, green: 0, blue: 0 } },
                },
              },
              fields: "fontSize,foregroundColor,bold,fontFamily",
            },
          });
        } else {
          // It's an answer box
          // If it's the correct answer box we already inserted text
          // Style it only if newText was set (implies it's correct answer box)
          requests.push({
            updateTextStyle: {
              objectId: slideId,
              textRange: { type: "ALL" },
              style: {
                fontSize: { magnitude: 8, unit: "PT" },
                bold: true,
                fontFamily: "Arial",
                foregroundColor: {
                  opaqueColor: {
                    rgbColor: { red: 0.2, green: 0.2, blue: 0.8 },
                  },
                },
              },
              fields: "fontSize,foregroundColor,bold,fontFamily",
            },
          });
        }
      }

      // If there's no new text and no current text, do nothing
    }
  }

  // Execute batch update for the slide requests
  if (requests.length > 0) {
    await slidesService.presentations.batchUpdate({
      presentationId,
      resource: { requests },
    });

    console.log("Data successfully inserted into slides.");
  } else {
    console.log("No changes needed.");
  }
  await exportAnswerSlidesToPDF(auth);
  return quizData;
}

export async function exportAnswerSlidesToPDF(auth) {
  try {
    // const presentationId = "1KDw6XIUJ7L6wxGt-WfCP8RjMkMf8_t6DelkfgUCp03k";
    const presentationId = "16AIM3vZltZfiRLdVdafa9oIfylkRujf8DVBy9UxnHOA";
    const drive = google.drive({ version: "v3", auth });

    // Export the presentation as a PDF
    const pdf = await drive.files.export(
      {
        fileId: presentationId,
        mimeType: "application/pdf",
      },
      { responseType: "stream" }
    );

    // Define the file path to save the PDF on the server
    const filePath = path.join(
      path.resolve(),
      `/uploads/presentation_answerSheet.pdf`
    );
    const dest = createWriteStream(filePath);

    // Return a promise to wait until the file is completely written
    return new Promise((resolve, reject) => {
      pdf.data
        .on("error", (error) => {
          console.error("Error during PDF download stream:", error);
          reject({ message: "Error exporting PDF", error });
        })
        .pipe(dest)
        .on("finish", () => {
          console.log("PDF successfully saved to:", filePath);
          resolve({
            message: "Presentation exported as PDF and saved to the server",
          });
        })
        .on("error", (error) => {
          console.error("Error writing PDF to file:", error);
          reject({ message: "Error saving PDF to server", error });
        });
    });
  } catch (error) {
    console.error("Error exporting PDF:", error);
    return { message: "Error exporting PDF", error };
  }
}
