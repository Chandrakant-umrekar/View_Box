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

//secured routes
router.use(verifyJwt);

router.route("/add-tweet").post(addTweet);

router.route("/tweet/:tweetId").patch(updateTweet).delete(deleteTweet);

export default router;
