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

// export async function injectDataIntoSlideAnswers(auth) {
//   // const presentationId = "1KDw6XIUJ7L6wxGt-WfCP8RjMkMf8_t6DelkfgUCp03k";
//   const presentationId = "16AIM3vZltZfiRLdVdafa9oIfylkRujf8DVBy9UxnHOA";
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

//   console.log("IDs...........", textBoxIds);
//   if (!textBoxIds || textBoxIds.length === 0) {
//     console.log("No text boxes found on the slide.");
//     return;
//   }

//   let slidesArray = [];
//   const quizData = [
//     ["1"],
//     ["2"],
//   ];

//   // Process each question in `quizData`
//   for (let i = 0; i < quizData.length; i++) {
//     const rowData = quizData[i];
//     const requests = [];

//     // Clear existing text in all text boxes
//     textBoxIds.forEach((id) => {
//       requests.push({
//         deleteText: {
//           objectId: id,
//           textRange: {
//             type: "ALL",
//           },
//         },
//       });
//     });
//     console.log("rowData", rowData);

//     // Insert new text into text boxes
//     rowData.forEach((text, index) => {
//       if (index < textBoxIds.length) {
//         console.log(
//           `Inserting text "${text}" into TextBox ID: ${textBoxIds[index]}`
//         );
//         requests.push({
//           insertText: {
//             objectId: textBoxIds[index],
//             text,
//           },
//         });
//       }
//     });

//     // Apply text styling after inserting
//     requests.push(
//       ...textBoxIds.map((id) => ({
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
//       resource: { requests },
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

export async function injectDataIntoSlideAnswers(auth) {
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

  console.log("slides", slides);
  // Filter and map text boxes
  const textBoxIds = slide.pageElements
    .filter((el) => el.shape && el.shape.shapeType === "TEXT_BOX") // Ensure it's a text box
    .map((el) => el.objectId);

  console.log("IDs...........", textBoxIds);
  if (!textBoxIds || textBoxIds.length === 0) {
    console.log("No text boxes found on the slide.");
    return;
  }

  const quizData = [
    ["What is the most expensive women's football transfer of all time?", "c"],
    ["Who was the top scorer in the 2022/23 Premier League season?", "b"],
  ];

  const requests = [];

  // Clear existing text in all text boxes
  textBoxIds.forEach((id) => {
    requests.push({
      deleteText: {
        objectId: id,
        textRange: {
          type: "ALL",
        },
      },
    });
  });

  // Insert data into text boxes dynamically
  quizData.forEach((data, index) => {
    const firstText = data[0];
    const secondText = data[1];

    // Insert the first string into the current box
    if (index * 2 < textBoxIds.length) {
      requests.push({
        insertText: {
          objectId: textBoxIds[index * 2],
          text: firstText,
          insertionIndex: 0, // Insert at the beginning
        },
      });

      // Apply text styling for the first string
      requests.push({
        updateTextStyle: {
          objectId: textBoxIds[index * 2],
          style: {
            fontSize: {
              magnitude: 6,
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
      });
    }

    // Insert the second string into the next box
    if (index * 2 + 1 < textBoxIds.length) {
      requests.push({
        insertText: {
          objectId: textBoxIds[index * 2 + 1],
          text: secondText,
          insertionIndex: 0, // Insert at the beginning
        },
      });

      // Apply text styling for the second string
      requests.push({
        updateTextStyle: {
          objectId: textBoxIds[index * 2 + 1],
          style: {
            fontSize: {
              magnitude: 6,
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
      });
    }
  });

  // Execute the request for Google Slides API
  await slidesService.presentations.batchUpdate({
    presentationId,
    resource: { requests },
  });

  console.log("Quiz data added dynamically to text boxes.");
  const pdfResponse = await exportSlidesToPDF(auth);
  console.log("pdfResponse",pdfResponse)
  return requests
}




export async function exportSlidesToPDF(auth) {
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

authorize().then(injectDataIntoSlideAnswers).catch(console.error);
