import { Router } from "express";
import {
  getTweetsFeed,
  addTweet,
  updateTweet,
  deleteTweet,
} from "../controllers/tweet.controller.js";
import { verifyJwt } from "../middlewares/auth.middleware.js";

const router = Router();

router.route("/feed").get(getTweetsFeed);

router.route("/add-tweet").post(verifyJwt, addTweet);

router
  .route("/tweet/:tweetId")
  .patch(verifyJwt, updateTweet)
  .delete(verifyJwt, deleteTweet);

export default router;
