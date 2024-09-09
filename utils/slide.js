import fs from "fs/promises";
import path from "path";
import process from "process";
import { authenticate } from "@google-cloud/local-auth";
import { google } from "googleapis";

// If modifying these scopes, delete token.json.
const SCOPES = [
  "https://www.googleapis.com/auth/presentations",
  "https://www.googleapis.com/auth/presentations.readonly",
  "https://www.googleapis.com/auth/userinfo.email",
  "https://www.googleapis.com/auth/userinfo.profile",
  "https://www.googleapis.com/auth/spreadsheets.readonly",
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
  console.log("slides",slides?.length)

  if (!slides || slides.length === 0) {
    console.log("No slides found.");
    return;
  }

  return slides;
};

export async function injectDataIntoSlide(auth) {
  let presentationId = "1BI345Zel1tdPoLEApARJhOM83pSB2lOLrwT_2v_DaRM";
  let sheetId = "1kKZA3fqjK5tbg0iFhfq6Fh3CAUFpfg1WYGUm9b9y-w0";
  let sheetName = "Ark1";
  const sheetsService = google.sheets({ version: "v4", auth });
  const slidesService = google.slides({ version: "v1", auth });

  const sheetRange = `${sheetName}!A1:Z1000`;

  // Fetch data from Google Sheets
  const sheetResponse = await sheetsService.spreadsheets.values.get({
    spreadsheetId: sheetId,
    range: sheetRange,
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

  const requests = [];

  const quizData = [
    ["1", "New RowData:", "New RowData1:", "New RowData2:", "New RowData3:"],
    ["2", "What is the best music genre in the world?", "Azaz", "Ali", "Khan"],
  ];

  slides.forEach((slide, slideIndex) => {
    console.log(`Processing slide #${slideIndex + 1}`);

    if (slideIndex >= quizData.length) {
      console.log(`No corresponding row data for slide #${slideIndex + 1}`);
      return;
    }

    const rowData = quizData[slideIndex];

    // Filter and map text boxes
    const textBoxIds = slide.pageElements
      .filter((el) => el.shape && el.shape.shapeType) // Ensure it's a text box with text
      .map((el) => el.objectId);

    console.log("TextBox IDs:", textBoxIds);

    if (textBoxIds.length === 0) {
      console.log(`No text boxes found on slide #${slideIndex + 1}`);
      return;
    }

    // First clear existing text in all text boxes
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

    // Then insert new text into text boxes
    rowData?.forEach((text, index) => {
      if (index < textBoxIds.length) {
        console.log(
          `Inserting text "${text}" into TextBox ID: ${textBoxIds[index]}`
        );
        requests.push({
          insertText: {
            objectId: textBoxIds[index],
            text,
          },
        });
      }
    });

    // Optional: Style text after inserting
    requests.push(
      ...textBoxIds.map((id) => ({
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
  });

  if (requests.length === 0) {
    console.log("No valid requests generated.");
    return;
  }

  try {
    await slidesService.presentations.batchUpdate({
      presentationId,
      requestBody: {
        requests,
      },
    });
    console.log("Data injected successfully");
  } catch (err) {
    console.error("Error injecting data:", err);
  }
}

// Usage example:
// You would call this function from your main script
// authorize().then(listSlides).catch(console.error);
// authorize().then(injectDataIntoSlide).catch(console.error);
