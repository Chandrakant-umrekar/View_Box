import { Router } from "express";
import {
  getPlaylistBYId,
  getUserPlaylists,
  createPlaylist,
  deletePlaylist,
  updatePlaylist,
} from "../controllers/playlist.controller.js";
import { verifyJwt } from "../middlewares/auth.middleware.js";

const router = Router();

router.route("/create").post(verifyJwt, createPlaylist);

router.route("/u/:userId").get(getUserPlaylists);

router
  .route("/p/:playlistId")
  .get(getPlaylistBYId)
  .patch(verifyJwt, updatePlaylist)
  .delete(verifyJwt, deletePlaylist);

export default router;
