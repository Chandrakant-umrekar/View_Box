import { Router } from "express";
import {
  addComment,
  getVideoComments,
  updateComment,
  deleteComment,
} from "../controllers/comment.controller.js";
import { verifyJwt } from "../middlewares/auth.middleware.js";

const router = Router();

router.route("/v/:videoId").get(getVideoComments);

//secured routes
router.use(verifyJwt);

router.route("/v/:videoId").post(addComment);

router.route("/c/:commentId").patch(updateComment).delete(deleteComment);

export default router;
