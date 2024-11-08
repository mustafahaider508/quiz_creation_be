import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import nodemailer from 'nodemailer';
// import fs from 'fs';
import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';

import { PutObjectCommand } from '@aws-sdk/client-s3';
import s3Client from '../config/s3.js';

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
      'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()-_=+'[
        Math.floor(Math.random() * 72)
      ]
  ).join('');
};

export const sendEmail = (data) => {
  return new Promise((resolve, reject) => {
    // Create a SMTP transporter object
    const transporter = nodemailer.createTransport({
      service: 'Gmail',
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
        contentType: 'application/pdf',
      };
    });

    // Message object
    let mailOptions = {
      from: `${process.env.FROM}`,
      to: data?.to,
      subject: data?.subject,
      text: '',
      html: data?.html,
      attachments: pdfs,
    };

    transporter.sendMail(mailOptions, (error, info) => {
      if (error) {
        console.log(error);
        reject(error);
      } else {
        console.log('Message sent: %s', info.messageId);
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
    message: 'server Error',
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
      console.error('No response received from the server');
      throw new Error(
        'No response received from the server. Please try again.'
      );
    } else if (error.code === 'ECONNABORTED') {
      console.error('Request timed out');
      throw new Error('The request timed out. Please try again later.');
    }
    console.error('Axios error:', error.message);
    throw new Error(
      'An error occurred while generating the quiz. Please try again.'
    );
  } else {
    console.error('Unexpected error:', error.message);
    throw new Error('An unexpected error occurred. Please try again.');
  }
};

export const uploadPDFeToS3 = async (file) => {
  try {
    const fileExtension = file.originalname.split('.').pop();
    const fileName = `${uuidv4()}.${fileExtension}`;
    const folderName = 'files';

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
    console.error('Error uploading file to S3:', error);
    throw new Error('Failed to upload file to S3');
  }
};

const authUtils = {
  getToken,
  getPasswordHash,
  matchPassword,
  sendEmail,
  verifyToken,
  generatePassword,
};

export default authUtils;
