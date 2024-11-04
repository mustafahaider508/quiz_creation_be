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

// app.use(cors({
//   origin: '*',
//   methods: ['GET', 'POST', 'DELETE', 'UPDATE', 'PUT', 'PATCH'],
//   allowedHeaders: 'Content-Type,Authorization'
// }));

const whitelist = ['https://skilltrack.fun']; // List of allowed domains
const corsOptions = {
    origin: (origin, callback) => {
      console.log('origin',origin)
        if (whitelist.indexOf(origin) !== -1 || !origin) {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true, // Reflect the requested origin if it's on the whitelist or no origin is provided
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
app.use("/api/quiz", quizRouter);

// ==== Error Handling ==== //

// ==== Start Server on PORT ==== //
app.listen(PORT, () => console.log(`Server Started on PORT => ${PORT}`));

export default app;


