import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import session from "express-session";
dotenv.config({ silent: process.env.NODE_ENV === "production" });

const app = express();
const PORT = process.env.PORT;

// for parsing application/json
app.use(express.json());

// for parsing application/x-www-form-urlencoded
app.use(
  express.urlencoded({
    extended: true,
  })
);

// ==== CORS Policy ==== //
var corsOptions = {
  origin: true, // Allow requests from any domain
  allowedHeaders: ["content-type"],
  credentials: true,
};

app.use(cors(corsOptions));

// ==== Session Configuration ==== //
app.use(
  session({
    secret: process.env.SHOPIFY_API_SECRET, // Replace with your secret key
    resave: false,
    saveUninitialized: true,
    cookie: { secure: process.env.NODE_ENV === "production" },
  })
);

// ==== Server status API ==== //
app.get("/api", (req, res) => {
  res.send("Server is running ...!");
});

// ==== Defining Routes ==== //
import shopifyRouter from "./src/app/auth/auth.routes.js";
import quizRouter from "./src/app/quiz/quiz.routes.js";
import authRouter from "./src/app/auth/auth.routes.js";

// ==== Private Routes ==== //
app.use("/api/auth", authRouter);
app.use("/shopify", shopifyRouter);
app.use("/quiz", quizRouter);

// ==== Error Handling ==== //

// ==== Start Server on PORT ==== //
app.listen(PORT, () => console.log(`Server Started on PORT => ${PORT}`));

export default app;
