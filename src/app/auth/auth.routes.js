import express from "express";
import { auth } from "../auth/auth.controller.js";

const { getShopify, shopifyCallBack, logoutShopify ,Signup,SignIn} = auth;

const router = express.Router();

// @route    POST /auth/signup
// @desc     shopify Customer Auth SignUp
// @access   public
router.post("/signup",Signup )
// @route    POST /auth/signin
// @desc     shopify Customer Auth SignIn
// @access   public
router.post("/login",SignIn )
// @route    POST /shopify
// @desc     shopify Auth
// @access   private
router.get("/", getShopify);
// @route    POST /shopify/callback
// @desc     shopify Callback
// @access   private
router.get("/callback", shopifyCallBack);
// @route    POST /shopify/logout
// @desc     shopify logout
// @access   private
router.get("/logout", logoutShopify);
// @route    POST /shopify/success
// @desc     shopify success
// @access   private
router.get("/success", (req, res) => {
  res.send("Shopify authentication successful!");
});



export default router;
