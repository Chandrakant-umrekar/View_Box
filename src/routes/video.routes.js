import { Router } from "express";
import {
  uploadVideo,
  getVideoById,
  updateVideo,
  deleteVideo,
  getVideosFeed,
  searchVideos,
  togglePublishStatus,
} from "../controllers/video.controller.js";
import { verifyJwt } from "../middlewares/auth.middleware.js";
import { upload } from "../middlewares/multer.middleware.js";

const router = Router();

router.route("/video-upload").post(
  verifyJwt,
  upload.fields([
    {
      name: "video",
      maxCount: 1,
    },
    {
      name: "thumbnail",
      maxCount: 1,
    },
  ]),
  uploadVideo
);

router
  .route("/video/:videoId")
  .get(getVideoById)
  .patch(verifyJwt, upload.single("thumbnail"), updateVideo)
  .delete(verifyJwt, deleteVideo);

router.route("/feed").get(getVideosFeed);

router.route("/search").get(searchVideos);

router.route("/toggle-publish/:videoId").patch(verifyJwt, togglePublishStatus);

export default router;
