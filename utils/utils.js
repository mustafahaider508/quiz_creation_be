import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import nodemailer from "nodemailer";


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

    // Message object
    let mailOptions = {
      from: `${process.env.FROM}`,
      to: data?.to,
      subject: data?.subject,
      text: "",
      html: data?.html,
      attachments: [
        {
          filename: "quiz.pdf", 
          content: data?.pdfFilePath,
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

export const sendResponse = (req, res, status, message, data) => {
  return res.status(status).json({
    status,
    message,
    data,
  });
};

export const sendError = (req,res,status,message) => {
  return res.status(status).json({
    status,
    message,
    data:0
  })

}

export const sendServerResponse = (req,res,status,error) => {
  return res.status(status).json({
    message:"server Error",
    error:error.message
  })
}

const authUtils = {
  getToken,
  getPasswordHash,
  matchPassword,
  sendEmail,
  verifyToken,
  generatePassword,

};

export default authUtils;
