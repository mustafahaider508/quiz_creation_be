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
    // presentationId: "1EAYk18WDjIG-zp_0vLm3CsfQh_i8eXc67Jo2O9C6Vuc",
    presentationId: "1BI345Zel1tdPoLEApARJhOM83pSB2lOLrwT_2v_DaRM",
  });
  const slides = res.data.slides;
  console.log("slides", slides?.length);

  if (!slides || slides.length === 0) {
    console.log("No slides found.");
    return;
  }

  return slides;
};

export async function getTextBoxContent(auth) {
  const presentationId = "1BI345Zel1tdPoLEApARJhOM83pSB2lOLrwT_2v_DaRM";
  // Fetch slides from the presentation
  const slides = await listSlides(auth, presentationId);
  if (!slides || slides.length === 0) {
    console.log("No slides found in the presentation.");
    return;
  }

  for (const slide of slides) {
    const textBox = slide.pageElements.find(
      (element) => element.objectId === "g2a4cd3316e7_0_0"
    );

    if (textBox && textBox.shape && textBox.shape.text) {
      const textContent = textBox.shape.text.textElements
        .map((element) => element.textRun?.content || "")
        .join(""); // Combine all text runs
      return textContent.trim(); // Return the text content
    }
  }

  return null; // Return null if the text box is not found
}

// export async function injectDataIntoSlide(auth, quizData, subject) {
//   const presentationId = "1BI345Zel1tdPoLEApARJhOM83pSB2lOLrwT_2v_DaRM";
//   const sheetId = "1kKZA3fqjK5tbg0iFhfq6Fh3CAUFpfg1WYGUm9b9y-w0";
//   const sheetName = "Ark1";
//   const sheetsService = google.sheets({ version: "v4", auth });
//   const slidesService = google.slides({ version: "v1", auth });

//   // Fetch data from Google Sheets
//   const sheetResponse = await sheetsService.spreadsheets.values.get({
//     spreadsheetId: sheetId,
//     range: `${sheetName}!A1:Z1000`,
//   });

//   const data = sheetResponse.data.values;

//   if (!data || data.length === 0) {
//     console.log("No data found in the sheet.");
//     return;
//   }

//   // Fetch slides from the presentation
//   const slides = await listSlides(auth, presentationId);
//   if (!slides || slides.length === 0) {
//     console.log("No slides found in the presentation.");
//     return;
//   }

//   const slide = slides[0]; // Use the first slide for all questions

//   console.log("slides", slides);
//   // Filter and map text boxes
//   const textBoxIds = slide.pageElements
//     .filter((el) => el.shape && el.shape.shapeType === "TEXT_BOX") // Ensure it's a text box
//     .map((el) => el.objectId);

//   const updatedTextBoxIds = textBoxIds?.filter(
//     (ele) => ele !== "g2a4cd3316e7_0_0"
//   );

//   console.log("IDs...........", textBoxIds);
//   if (!textBoxIds || textBoxIds.length === 0) {
//     console.log("No text boxes found on the slide.");
//     return;
//   }

//   let slidesArray = [];

//   // Requests array to hold batch requests
//   const requests = [];

//   const subjectData =  getTextBoxContent(auth).then((res) => {
//     return res
//   });

//   console.log("subjectData",subjectData)
  

//   if (subjectData !== null) {
//     requests.push({
//       deleteText: {
//         objectId: "g2a4cd3316e7_0_0",
//         textRange: { type: "ALL" },
//       },
//     });
//   }

//   //SubjectTitle Delete
//   if (subject !== "") {
//     // Insert subject text only once
//     requests.push({
//       insertText: {
//         objectId: "g2a4cd3316e7_0_0",
//         text: subject,
//         insertionIndex: 0,
//       },
//     });
//   }

//   // Execute the request for the subject text before processing quiz data
//   await slidesService.presentations.batchUpdate({
//     presentationId,
//     resource: { requests },
//   });

//   console.log("Subject inserted.");

//   // Process each question in `quizData`
//   for (let i = 0; i < quizData.length; i++) {
//     const rowData = quizData[i];
//     const questionRequests = [];

//     // Clear existing text in all text boxes
//     updatedTextBoxIds.forEach((id) => {
//       questionRequests.push({
//         deleteText: {
//           objectId: id,
//           textRange: {
//             type: "ALL",
//           },
//         },
//       });
//     });

//     // Insert new text into text boxes
//     rowData.forEach((text, index) => {
//       if (index < updatedTextBoxIds.length) {
//         console.log(
//           `Inserting text "${text}" into TextBox ID: ${updatedTextBoxIds[index]}`
//         );
//         questionRequests.push({
//           insertText: {
//             objectId: updatedTextBoxIds[index],
//             text,
//           },
//         });
//       }
//     });

//     // Apply text styling after inserting
//     questionRequests.push(
//       ...updatedTextBoxIds.map((id) => ({
//         updateTextStyle: {
//           objectId: id,
//           style: {
//             fontSize: {
//               magnitude: 48,
//               unit: "PT",
//             },
//             foregroundColor: {
//               opaqueColor: {
//                 rgbColor: {
//                   red: 0,
//                   green: 0,
//                   blue: 0,
//                 },
//               },
//             },
//             bold: true,
//             fontFamily: "Trade Gothic",
//           },
//           fields: "fontSize,foregroundColor,bold,fontFamily",
//         },
//       }))
//     );

//     // Execute the request for Google Slides API
//     await slidesService.presentations.batchUpdate({
//       presentationId,
//       resource: { requests: questionRequests },
//     });

//     let index = i;

//     console.log(`Question #${i + 1} inserted.`);
//     const pdfResponse = await exportSlidesToPDF(auth, index);

//     if (pdfResponse) {
//       slidesArray.push(`presentation_${index + 1}`);
//       console.log("pdfResponse", pdfResponse);
//     }
//   }

//   console.log("All questions processed.", slidesArray);
//   return slidesArray;
// }

export async function injectDataIntoSlide(auth, quizData, subject) {
  const presentationId = "1BI345Zel1tdPoLEApARJhOM83pSB2lOLrwT_2v_DaRM";
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
    console.log("No data found in the sheet.");
    return;
  }

  // Fetch slides from the presentation
  const slides = await listSlides(auth, presentationId);
  if (!slides || slides.length === 0) {
    console.log("No slides found in the presentation.");
    return;
  }

  const slide = slides[0]; // Use the first slide for all questions

  // Filter and map text boxes
  const textBoxIds = slide.pageElements
    .filter((el) => el.shape && el.shape.shapeType === "TEXT_BOX") // Ensure it's a text box
    .map((el) => el.objectId);

  const updatedTextBoxIds = textBoxIds?.filter(
    (ele) => ele !== "g2a4cd3316e7_0_0"
  );

  if (!textBoxIds || textBoxIds.length === 0) {
    console.log("No text boxes found on the slide.");
    return;
  }

  let slidesArray = [];

  // Requests array to hold batch requests
  const requests = [];

  // Fetch the current text content of the subject text box
  const subjectData = await getTextBoxContent(auth, presentationId, "g2a4cd3316e7_0_0");
  console.log("Current Subject Text:", subjectData);

  // If the text box has existing content, delete it
  if (subjectData !== null) {
    requests.push({
      deleteText: {
        objectId: "g2a4cd3316e7_0_0",
        textRange: { type: "ALL" },
      },
    });
  }

  // Insert the new subject text
  if (subject !== "") {
    requests.push({
      insertText: {
        objectId: "g2a4cd3316e7_0_0",
        text: subject,
        insertionIndex: 0,
      },
    });
  }

  // Check if there are any requests to process before making the API call
  if (requests.length > 0) {
    await slidesService.presentations.batchUpdate({
      presentationId,
      resource: { requests },
    });
    console.log("Subject processed successfully.");
  } else {
    console.log("No requests for the subject to process.");
  }

  // Process each question in `quizData`
  for (let i = 0; i < quizData.length; i++) {
    const rowData = quizData[i];
    const questionRequests = [];

    // Clear existing text in all text boxes
    updatedTextBoxIds.forEach((id) => {
      questionRequests.push({
        deleteText: {
          objectId: id,
          textRange: {
            type: "ALL",
          },
        },
      });
    });

    // Insert new text into text boxes
    rowData.forEach((text, index) => {
      if (index < updatedTextBoxIds.length) {
        console.log(
          `Inserting text "${text}" into TextBox ID: ${updatedTextBoxIds[index]}`
        );
        questionRequests.push({
          insertText: {
            objectId: updatedTextBoxIds[index],
            text,
          },
        });
      }
    });

    // Apply text styling after inserting
    questionRequests.push(
      ...updatedTextBoxIds.map((id) => ({
        updateTextStyle: {
          objectId: id,
          style: {
            fontSize: {
              magnitude: 48,
              unit: "PT",
            },
            foregroundColor: {
              opaqueColor: {
                rgbColor: {
                  red: 0,
                  green: 0,
                  blue: 0,
                },
              },
            },
            bold: true,
            fontFamily: "Trade Gothic",
          },
          fields: "fontSize,foregroundColor,bold,fontFamily",
        },
      }))
    );

    // Check if there are any requests to process before making the API call
    if (questionRequests.length > 0) {
      await slidesService.presentations.batchUpdate({
        presentationId,
        resource: { requests: questionRequests },
      });
      console.log(`Question #${i + 1} processed successfully.`);
    } else {
      console.log(`No requests for Question #${i + 1} to process.`);
    }

    const pdfResponse = await exportSlidesToPDF(auth, i);

    if (pdfResponse) {
      slidesArray.push(`presentation_${i + 1}`);
      console.log("pdfResponse", pdfResponse);
    }
  }

  console.log("All questions processed.", slidesArray);
  return slidesArray;
}



export async function exportSlidesToPDF(auth, index) {
  try {
    const presentationId = "1BI345Zel1tdPoLEApARJhOM83pSB2lOLrwT_2v_DaRM";
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
      `/uploads/presentation_${index + 1}.pdf`
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

// Usage example:
// You would call this function from your main script
// authorize().then(listSlides).catch(console.error);
// authorize().then(injectDataIntoSlide).catch(console.error);
