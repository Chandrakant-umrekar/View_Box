import { isValidObjectId } from "mongoose";
import { asyncHandler } from "../utils/asyncHandler";
import { ApiError } from "../utils/apiError";
import { Like } from "../models/like.model.js";
import { ApiResponse } from "../utils/ApiResponse";

const toggleVideoLike = asyncHandler(async (req, res) => {
  const { videoId } = req.params;

  if (!isValidObjectId(videoId)) {
    throw new ApiError(400, "Invalid video id");
  }

  const alreadyLiked = await Like.findOne({
    video: videoId,
    likedBy: req.user?._id,
  });

  if (alreadyLiked) {
    await alreadyLiked.deleteOne();

    return res
      .status(200)
      .json(
        new ApiResponse(200, { isLiked: false }, "Like removed from the video")
      );
  }

  const newLike = await Like.create({
    video: videoId,
    likedBy: req.user?._id,
  });

  if (!newLike) {
    throw new ApiError(
      500,
      "Something went wrong while adding the like to video"
    );
  }

  res
    .status(201)
    .json(new ApiResponse(201, { isLiked: true }, "Like added to the video"));
});

const toggleCommentLike = asyncHandler(async (req, res) => {
  const { commentId } = req.params;

  if (!isValidObjectId(commentId)) {
    throw new ApiError(400, "Invalid comment id");
  }

  const alreadyLiked = await Like.findOne({
    comment: commentId,
    likedBy: req.user?._id,
  });

  if (alreadyLiked) {
    await alreadyLiked.deleteOne();

    return res
      .status(200)
      .json(
        new ApiResponse(
          200,
          { isLiked: false },
          "Like removed from the comment"
        )
      );
  }

  const newLike = await Like.create({
    comment: commentId,
    likedBy: req.user?._id,
  });

  if (!newLike) {
    throw new ApiError(
      500,
      "Something went wrong while adding the like to comment"
    );
  }

  res
    .status(201)
    .json(new ApiResponse(201, { isLiked: true }, "Like added to the comment"));
});

const toggleTweetLike = asyncHandler(async (req, res) => {
  const { tweetId } = req.params;

  if (!isValidObjectId(tweetId)) {
    throw new ApiError(400, "Invalid tweet id");
  }

  const alreadyLiked = await Like.findOne({
    tweet: tweetId,
    likedBy: req.user?._id,
  });

  if (alreadyLiked) {
    await alreadyLiked.deleteOne();

    return res
      .status(200)
      .json(
        new ApiResponse(200, { isLiked: false }, "Like removed from the tweet")
      );
  }

  const newLike = await Like.create({
    tweet: tweetId,
    likedBy: req.user?._id,
  });

  if (!newLike) {
    throw new ApiError(
      500,
      "Something went wrong while adding the like to tweet"
    );
  }

  res
    .status(201)
    .json(new ApiResponse(201, { isLiked: true }, "Like added to the tweet"));
});

const getLikedVideos = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10 } = req.query;

  const pipeline = [
    {
      $match: {
        likedBy: new mongoose.Types.ObjectId(req.user?._id),
      },
    },
    {
      $lookup: {
        from: "videos",
        localField: "video",
        foreignField: "_id",
        as: "video",
        pipeline: [
          {
            $lookup: {
              from: "users",
              localField: "owner",
              foreignField: "_id",
              as: "owner",
              pipeline: [
                {
                  $project: {
                    username: 1,
                    avatar: 1,
                  },
                },
              ],
            },
          },
          {
            $unwind: "$owner",
          },
          {
            $project: {
              title: 1,
              thumbnail: 1,
              owner: 1,
              views: 1,
              duration: 1,
              createdAt: 1,
            },
          },
        ],
      },
    },
    {
      $unwind: "$video",
    },
    {
      $project: {
        _id: "$video._id",
        title: "$video.title",
        thumbnail: "$video.thumbnail",
        owner: "$video.owner",
        views: "$video.views",
        duration: "$video.duration",
        createdAt: "$video.createdAt",
      },
    },
  ];

  const options = {
    page: parseInt(page, 10),
    limit: parseInt(limit, 10),
  };

  const likedVideos = await Like.aggregatePaginate(
    Like.aggregate(pipeline),
    options
  );

  if (!likedVideos) {
    throw new ApiError(500, "Something went wrong while getting liked videos");
  }

  res
    .status(200)
    .json(
      new ApiResponse(200, likedVideos, "liked videos fetched successfully")
    );
});

export { toggleCommentLike, toggleTweetLike, toggleVideoLike, getLikedVideos };
