import axios from "axios";
import querystring from "querystring";
import crypto from "crypto";
import authUtils, {
  getPasswordHash,
  getToken,
  matchPassword,
  sendError,
  sendResponse,
  sendServerResponse,
} from "../../../utils/utils.js";
import service from "./auth.service.js";

//Updated
const getShopify = async (req, res) => {
  try {
    const redirectUri = process.env.SHOPIFY_REDIRECT_URI;
    const apiKey = process.env.SHOPIFY_API_KEY;
    const scopes = "read_products,write_products";

    const nonce = crypto.randomBytes(16).toString("hex");

    // Construct the URL for the Shopify login with the response_type parameter
    const authUrl = `https://shopify.com/admin/oauth/authorize?client_id=${apiKey}&scope=${scopes}&redirect_uri=${redirectUri}&state=${nonce}&response_type=code`;
    console.log("authUrl++", authUrl);

    res.redirect(authUrl);
  } catch (error) {
    res.status(500).json({
      message: "Server Error",
    });
  }
};

const getShopInfo = async (shop, accessToken) => {
  try {
    const response = await axios.get(
      `https://${shop}/admin/api/2023-07/shop.json`,
      {
        headers: {
          "X-Shopify-Access-Token": accessToken,
        },
      }
    );
    return response.data.shop;
  } catch (error) {
    throw new Error("Error fetching shop information");
  }
};

const shopifyCallBack = async (req, res, next) => {
  try {
    const { shop, hmac, code } = req.query;
    if (shop && hmac && code) {
      const params = {
        client_id: process.env.SHOPIFY_API_KEY,
        client_secret: process.env.SHOPIFY_API_SECRET,
        code,
      };

      const queryString = querystring.stringify(params);

      try {
        const tokenResponse = await axios.post(
          `https://${shop}/admin/oauth/access_token`,
          queryString,
          {
            headers: {
              "Content-Type": "application/x-www-form-urlencoded",
            },
          }
        );
        const accessToken = tokenResponse.data.access_token;

        // Fetch shop information
        const shopInfo = await getShopInfo(shop, accessToken);
        console.log("shopInfo+++", shopInfo);

        // Save accessToken in session or database
        // You can now use the accessToken to make authenticated requests to Shopify's Admin API

        res.redirect(`/shopify/success?shop=${shop}`);
      } catch (error) {
        console.error(
          "Error exchanging code for access token:",
          error.response ? error.response.data : error.message
        );
        res.status(500).send("Error exchanging code for access token");
      }
    } else {
      res
        .status(400)
        .send("Required parameters missing or HMAC validation failed");
    }
  } catch (error) {
    console.error("Server Error:", error);
    return res.status(500).json({
      message: "Server Error",
    });
  }
};

const logoutShopify = async (req, res) => {
  try {
    // Destroy the session or any authentication-related data
    req.session.destroy((err) => {
      if (err) {
        return res.status(500).send("Failed to log out from the app");
      }

      // Redirect to the main Shopify logout URL
      const logoutUrl = `https://accounts.shopify.com/logout`;
      res.redirect(logoutUrl);
    });
  } catch (error) {
    res.status(500).json({
      message: "Server Error",
    });
  }
};

export const Signup = async (req, res, next) => {
  try {
    const { firstName, surname, email, password } = req.body;
    const findUserByEmail = await service.findUser(email);
    if (findUserByEmail) {
      return sendError(req, res, 400, "User already exit");
    }
    const passwordHash = await getPasswordHash(password);
    const user = await service.createUser({
      firstName,
      surname,
      email,
      passwordHash,
    });
    // Delete password field from user object
    delete user.password;

    return sendResponse(req, res, 200, "User Signup Successfully", user);
  } catch (error) {
    return sendServerResponse(req, res, 500 ,error);
  }
};

//Login
export const SignIn = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    console.log("req",req.body)

    // Check if user exists
    const findUser = await service.findUser(email);
    if (!findUser) {
      return sendError(req, res, 400, "User Not Found");
    }

    // Match password
    const isMatch = await matchPassword(password, findUser.password);
    if (!isMatch) {
      return sendError(req, res, 400, "Invalid credentials ");
    }

    // Generate token
    const payload = {
      user: {
        userId: findUser.id,
        email: findUser.email,
        role: findUser.role,
      },
    };
    const token = await getToken({ payload, expiresIn: "5 days" });

    // Remove password from user object
    delete findUser.password;

    const data = {
      token: token,
      user: findUser,
    };

  

    return sendResponse(req, res, 200, "User Login Successfully", data);
  } catch (error) {
    return sendServerResponse(req, res, 500 ,error);
  }
};

export const auth = {
  getShopify,
  shopifyCallBack,
  getShopInfo,
  logoutShopify,
  Signup,
  SignIn,
};
