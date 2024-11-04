import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import session from "express-session";

dotenv.config({ silent: process.env.NODE_ENV === "production" });

const app = express();
const PORT = process.env.PORT;

// === Middleware Setup === //

// Parse JSON bodies
app.use(express.json());

// Parse URL-encoded bodies
app.use(express.urlencoded({ extended: true }));

// === CORS Configuration === //

// Configure CORS middleware to allow all origins without credentials
const corsOptions = {
  origin: "*", // Allows requests from any origin
};

app.use(cors(corsOptions));

// === Session Configuration === //

// Since credentials are not allowed, session cookies will not be sent
// Adjust your session handling accordingly if necessary
app.use(
  session({
    secret: process.env.SHOPIFY_API_SECRET, // Replace with your secret key
    resave: false,
    saveUninitialized: true,
    cookie: {
      secure: process.env.NODE_ENV === "production",
      httpOnly: true,
      sameSite: "lax",
    },
  })
);

// === Route Definitions === //

app.get("/api", (req, res) => {
  res.send("Server is running ...!");
});

// Import routes
import shopifyRouter from "./src/app/auth/auth.routes.js";
import quizRouter from "./src/app/quiz/quiz.routes.js";
import authRouter from "./src/app/auth/auth.routes.js";

// Use routes
app.use("/api/auth", authRouter);
app.use("/shopify", shopifyRouter);
app.use("/api/quiz", quizRouter);

// === Start Server === //

app.listen(PORT, () => console.log(`Server Started on PORT => ${PORT}`));

export default app;
