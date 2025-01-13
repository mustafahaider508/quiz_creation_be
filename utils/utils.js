import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import nodemailer from "nodemailer";
// import fs from 'fs';
import axios from "axios";
import { v4 as uuidv4 } from "uuid";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import s3Client from "../config/s3.js";
import fs from "fs";
import path from "path";
import { PDFDocument } from "pdf-lib";

// Get Password Hash
export const getPasswordHash = async (password) => {
  try {
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);
    return passwordHash;
  } catch (err) {
    console.log(err.message);
  }
};

// GET Token
export const getToken = async ({ payload, expiresIn }) => {
  try {
    const token = await new Promise((resolve, reject) => {
      jwt.sign(
        payload,
        process.env.JWT_SECRET,
        { expiresIn: expiresIn },
        (err, token) => {
          if (err) reject(err);
          resolve(token);
        }
      );
    });

    return token;
  } catch (err) {
    console.log(err.message);
  }
};

//Verify Token
export const verifyToken = async (payload) => {
  try {
    const token = await new Promise((resolve, reject) => {
      jwt.verify(payload, process.env.JWT_SECRET, (err, token) => {
        if (err) reject(err);
        resolve(token);
      });
    });
    return token;
  } catch (error) {
    console.log(error.message);
    return error.message;
  }
};

// Match Pasword Hash
export const matchPassword = async (password, hashedPassword) => {
  try {
    const isMatch = await bcrypt.compare(password, hashedPassword);
    return isMatch;
  } catch (err) {
    console.log(err.message);
  }
};

const generatePassword = (length) => {
  return Array.from(
    { length },
    () =>
      "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()-_=+"[
        Math.floor(Math.random() * 72)
      ]
  ).join("");
};

export const sendEmail = (data) => {
  return new Promise((resolve, reject) => {
    // Create a SMTP transporter object
    const transporter = nodemailer.createTransport({
      service: "Gmail",
      host: process.env.GMAILHOST,
      port: process.env.GMAILPORT,
      auth: {
        user: process.env.SENDER,
        pass: process.env.GMAILPASS,
      },
    });

    const pdfs = data?.pdfFilePath?.map((filePath, index) => {
      return {
        filename: `pre${index + 1}.pdf`,
        path: filePath, // Use the file path directly to read it as an attachment
        contentType: "application/pdf",
      };
    });

    // Message object
    let mailOptions = {
      from: `${process.env.FROM}`,
      to: data?.to,
      subject: data?.subject,
      text: "",
      html: data?.html,
      attachments: pdfs,
    };

    transporter.sendMail(mailOptions, (error, info) => {
      if (error) {
        console.log(error);
        reject(error);
      } else {
        console.log("Message sent: %s", info.messageId);
        resolve();
      }
    });
  });
};

export const sendAnswerSheetEmail = (data) => {
  return new Promise((resolve, reject) => {
    // Create a SMTP transporter object
    const transporter = nodemailer.createTransport({
      service: "Gmail",
      host: process.env.GMAILHOST,
      port: process.env.GMAILPORT,
      auth: {
        user: process.env.SENDER,
        pass: process.env.GMAILPASS,
      },
    });

    // Message object
    let mailOptions = {
      from: `${process.env.FROM}`,
      to: data?.to,
      subject: data?.subject,
      text: "",
      html: data?.html,
      attachments: [
        {
          filename: `AnswerSheet.pdf`,
          content: data?.pdfFilePath, // Use the file path directly to read it as an attachment
          contentType: "application/pdf",
        },
      ],
    };

    transporter.sendMail(mailOptions, (error, info) => {
      if (error) {
        console.log(error);
        reject(error);
      } else {
        console.log("Message sent: %s", info.messageId);
        resolve();
      }
    });
  });
};

export const sendTextEmail = (data) => {
  return new Promise((resolve, reject) => {
    const transporter = nodemailer.createTransport({
      service: "Gmail",
      host: process.env.GMAILHOST,
      port: process.env.GMAILPORT,
      auth: {
        user: process.env.SENDER,
        pass: process.env.GMAILPASS,
      },
    });

    const pdfs = data?.pdfFilePath?.map((pdfItem, index) => {
      // Handle both Buffer and file path cases
      if (Buffer.isBuffer(pdfItem)) {
        return {
          filename: `Quiz${index + 1}.pdf`,
          content: pdfItem, // Use Buffer content for attachments
          contentType: "application/pdf",
        };
      } else if (typeof pdfItem === "string") {
        // Assume it's a file path and use the `path` key
        return {
          filename: `Quiz${index + 1}.pdf`,
          path: pdfItem, // Use the file path directly for attachments
          contentType: "application/pdf",
        };
      } else {
        console.error(`Invalid PDF item at index ${index}:`, pdfItem);
        throw new Error(`Invalid PDF item at index ${index}`);
      }
    });

    const mailOptions = {
      from: `${process.env.FROM}`,
      to: data?.to,
      subject: data?.subject,
      text: "",
      html: data?.html,
      attachments: pdfs,
    };

    transporter.sendMail(mailOptions, (error, info) => {
      if (error) {
        console.log(error);
        reject(error);
      } else {
        console.log("Message sent: %s", info.messageId);
        resolve();
      }
    });
  });
};

export const sendResponse = (req, res, status, message, data) => {
  return res.status(status).json({
    status,
    message,
    data,
  });
};

export const sendError = (req, res, status, message) => {
  return res.status(status).json({
    status,
    message,
    data: 0,
  });
};

export const sendServerResponse = (req, res, status, error) => {
  return res.status(status).json({
    message: "server Error",
    error: error.message,
  });
};

export const handleAxiosError = (error) => {
  if (axios.isAxiosError(error)) {
    if (error.response) {
      console.error(
        `Error: HTTP ${error.response.status} - ${error.response.data}`
      );
      throw new Error(
        `Quiz generation failed with status ${error.response.status}: ${error.response.data}`
      );
    } else if (error.request) {
      console.error("No response received from the server");
      throw new Error(
        "No response received from the server. Please try again."
      );
    } else if (error.code === "ECONNABORTED") {
      console.error("Request timed out");
      throw new Error("The request timed out. Please try again later.");
    }
    console.error("Axios error:", error.message);
    throw new Error(
      "An error occurred while generating the quiz. Please try again."
    );
  } else {
    console.error("Unexpected error:", error.message);
    throw new Error("An unexpected error occurred. Please try again.");
  }
};

export const uploadPDFeToS3 = async (file) => {
  try {
    const fileExtension = file.originalname.split(".").pop();
    const fileName = `${uuidv4()}.${fileExtension}`;
    const folderName = "files";

    const params = {
      Bucket: process.env.S3_BUCKET,
      Key: `${folderName}/${fileName}`,
      Body: file.buffer,
      ContentType: file.mimetype,
    };

    const command = new PutObjectCommand(params);
    const response = await s3Client.send(command);

    return `https://${process.env.S3_BUCKET}.s3.amazonaws.com/${folderName}/${fileName}`;
  } catch (error) {
    console.error("Error uploading file to S3:", error);
    throw new Error("Failed to upload file to S3");
  }
};

export const mergeAndSendPDFs = async (email) => {
  try {
    const staticFilePaths = [
      path.join(process.cwd(), "uploads", "merged_quiz.pdf"),
      path.join(process.cwd(), "uploads", "presentation_answerSheet.pdf"),
    ];

    const mergedPdf = await PDFDocument.create();

    const standardWidth = 595.28; // A4 width in points
    const standardHeight = 841.89; // A4 height in points

    const templateWidth = 1260; // Desired static width for the template content
    const templateHeight = 870; // Desired static height for the template content

    for (const pdfFilePath of staticFilePaths) {
      await fs.promises.access(pdfFilePath, fs.constants.F_OK);

      const pdfBytes = await fs.promises.readFile(pdfFilePath);
      const pdfDoc = await PDFDocument.load(pdfBytes);

      const pages = pdfDoc.getPages();

      for (let i = 0; i < pages.length; i++) {
        const [copiedPage] = await mergedPdf.copyPages(pdfDoc, [i]);

        const { width: originalWidth, height: originalHeight } =
          pages[i].getSize();

        // Maintain standard A4 page size for all pages
        const targetWidth = standardWidth;
        const targetHeight = standardHeight;

        if (pdfFilePath.includes("presentation_answerSheet.pdf")) {
          // Custom scaling and adjustments for presentation_answerSheet.pdf
          const xScale = templateWidth / targetWidth;
          const yScale = targetHeight / originalHeight;
          const scale = Math.min(xScale, yScale);

          copiedPage.setWidth(targetWidth);
          copiedPage.setHeight(targetHeight);

          copiedPage.scaleContent(xScale, yScale);

          // Center the scaled content on the page
          copiedPage.translateContent(
            (templateWidth - originalWidth * scale) / 2, // Horizontal centering
            (templateHeight - originalHeight * scale) / 2 // Vertical centering
          );
        } else {
          // Standard scaling for other PDFs
          const xScale = targetWidth / originalWidth;
          const yScale = targetHeight / originalHeight;
          const scale = Math.min(xScale, yScale);

          copiedPage.setWidth(targetWidth);
          copiedPage.setHeight(targetHeight);

          copiedPage.translateContent(
            (targetWidth - originalWidth * scale) / 2,
            (targetHeight - originalHeight * scale) / 2
          );

          copiedPage.scaleContent(scale, scale);
        }

        mergedPdf.addPage(copiedPage);
      }
    }

    const mergedPdfPath = path.join(process.cwd(), "uploads", "merged.pdf");
    const mergedPdfBytes = await mergedPdf.save();
    await fs.promises.writeFile(mergedPdfPath, mergedPdfBytes);

    const emailData = {
      to: email,
      subject: "Quiz and Answer Sheet",
      html: "",
      pdfFilePath: [mergedPdfPath],
    };

    console.log("Merged PDF path:", mergedPdfPath);

    await sendTextEmail(emailData);
  } catch (error) {
    console.error("Error merging PDFs or sending email:", error);
    throw error;
  }
};

// export const mergeAndSendPDFs = async (email) => {
//   try {
//     // File paths for merging
//     const staticFilePaths = [
//       path.join(process.cwd(), "uploads", "merged_quiz.pdf"),
//       path.join(process.cwd(), "uploads", "presentation_answerSheet.pdf"),
//     ];

//     // Create a new PDF document
//     const mergedPdf = await PDFDocument.create();

//     // Define standard A4 page size
//     const standardWidth = 595.28; // A4 width in points
//     const standardHeight = 841.89; // A4 height in points

//     // Define static scaling for the last page's template (content)
//     const templateWidth = 600; // Desired static width for the template content
//     const templateHeight = 700; // Desired static height for the template content

//     for (let fileIndex = 0; fileIndex < staticFilePaths.length; fileIndex++) {
//       const pdfFilePath = staticFilePaths[fileIndex];

//       // Check if the file exists
//       await fs.promises.access(pdfFilePath, fs.constants.F_OK);

//       // Load the current PDF file
//       const pdfBytes = await fs.promises.readFile(pdfFilePath);
//       const pdfDoc = await PDFDocument.load(pdfBytes);

//       const pages = pdfDoc.getPages();

//       for (let i = 0; i < pages.length; i++) {
//         const [copiedPage] = await mergedPdf.copyPages(pdfDoc, [i]);

//         // Keep the page size fixed to A4
//         copiedPage.setWidth(standardWidth);
//         copiedPage.setHeight(standardHeight);

//         // Check if it's the last page (Answer Sheet)
//         if (fileIndex === staticFilePaths.length - 1 && i === pages.length - 1) {
//           // Scale the template (content inside the page) to static dimensions
//           const { width: originalWidth, height: originalHeight } =
//             pages[i].getSize();

//           const xScale = templateWidth / originalWidth; // Static width scaling
//           const yScale = templateHeight / originalHeight; // Static height scaling

//           // Apply scaling to the content (template)
//           copiedPage.scaleContent(xScale, yScale);

//           // Center the scaled content on the page
//           copiedPage.translateContent(
//             (standardWidth - templateWidth) / 2, // Horizontal centering
//             (standardHeight - templateHeight) / 2 // Vertical centering
//           );
//         }

//         // Add the page to the merged PDF
//         mergedPdf.addPage(copiedPage);
//       }
//     }

//     // Save the merged PDF to a new file
//     const mergedPdfPath = path.join(process.cwd(), "uploads", "merged.pdf");
//     const mergedPdfBytes = await mergedPdf.save();
//     await fs.promises.writeFile(mergedPdfPath, mergedPdfBytes);

//     // Send the merged PDF via email
//     const emailData = {
//       to: email,
//       subject: "Quiz and Answer Sheet",
//       html: "",
//       pdfFilePath: [mergedPdfPath],
//     };

//     console.log("Merged PDF path:", mergedPdfPath);

//     // Use your existing email sending function
//     await sendTextEmail(emailData);
//   } catch (error) {
//     console.error("Error merging PDFs or sending email:", error);
//     throw error;
//   }
// };

const authUtils = {
  getToken,
  getPasswordHash,
  matchPassword,
  sendEmail,
  sendTextEmail,
  verifyToken,
  generatePassword,
};

export default authUtils;
