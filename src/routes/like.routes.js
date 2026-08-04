import { Router } from "express";
import {
  toggleCommentLike,
  toggleTweetLike,
  toggleVideoLike,
  getLikedVideos,
} from "../controllers/like.controller.js";
import { verifyJwt } from "../middlewares/auth.middleware.js";

const router = Router();

router.use(verifyJwt);

router.route("/videos").get(getLikedVideos);

router.route("/toggle/v/:videoId").post(toggleVideoLike);

router.route("/toggle/c/:commentId").post(toggleCommentLike);

router.route("/toggle/t/:tweetId").post(toggleTweetLike);

export default router;
