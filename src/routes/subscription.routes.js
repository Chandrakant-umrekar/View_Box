import { Router } from "express";
import {
  toggleSubscription,
  getSubscribedChannels,
  getUserChannelSubscribers,
} from "../controllers/subscription.controller.js";
import { verifyJwt } from "../middlewares/auth.middleware.js";

const router = Router();

router.use(verifyJwt);

router.route("/toggle-subscription/:channelId").post(toggleSubscription);

router.route("/subscribed-channels/:subscriberId").get(getSubscribedChannels);

router.route("/channel-subscriber/:channelId").get(getUserChannelSubscribers);

export default router;
