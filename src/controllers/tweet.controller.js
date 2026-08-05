import mongoose, { isValidObjectId } from "mongoose";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/apiError.js";
import { Tweet } from "../models/tweet.model.js";
import { ApiResponse } from "../utils/ApiResponse.js";

const getTweetsFeed = asyncHandler(async (req, res) => {
  const {
    page = 1,
    limit = 10,
    sortBy = "createdAt",
    sortType = "desc",
  } = req.query;

  const pipeline = [
    {
      $sort: {
        [sortBy]: sortType === "desc" ? -1 : 1,
      },
    },
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
      $lookup: {
        from: "likes",
        localField: "_id",
        foreignField: "tweet",
        as: "likes",
      },
    },
    {
      $addFields: {
        likesCount: {
          $size: "$likes",
        },
        isLiked: {
          $cond: {
            if: {
              $in: [
                new mongoose.Types.ObjectId(req.user?._id),
                "$likes.likedBy",
              ],
            },
            then: true,
            else: false,
          },
        },
      },
    },
    {
      $project: {
        owner: 1,
        content: 1,
        likesCount: 1,
        isLiked: 1,
        createdAt: 1,
      },
    },
  ];

  const options = {
    page: parseInt(page, 10),
    limit: parseInt(limit, 10),
  };

  const tweets = await Tweet.aggregatePaginate(
    Tweet.aggregate(pipeline),
    options
  );

  if (!tweets) {
    throw new ApiError(500, "Something went wrong while fetching tweets");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, tweets, "Tweets fetched successfully"));
});

const addTweet = asyncHandler(async (req, res) => {
  const { content } = req.body;

  if (!content?.trim() || typeof content !== "string") {
    throw new ApiError(400, "content is required and must be text");
  }

  if (content.length > 280) {
    throw new ApiError(400, "Tweet content cannot exceed 280 characters");
  }

  const tweet = await Tweet.create({
    content: content.trim(),
    owner: req.user?._id,
  });

  if (!tweet) {
    throw new ApiError(500, "Something went wrong while adding tweet");
  }

  res.status(201).json(new ApiResponse(201, tweet, "Tweet added successfully"));
});

const updateTweet = asyncHandler(async (req, res) => {
  const { content } = req.body;
  const { tweetId } = req.params;

  if (!isValidObjectId(tweetId)) {
    throw new ApiError(400, "Invalid tweet id");
  }

  if (!content?.trim() || typeof content !== "string") {
    throw new ApiError(400, "content is required and must be text");
  }

  if (content.length > 280) {
    throw new ApiError(400, "Tweet content cannot exceed 280 characters");
  }

  const updatedTweet = await Tweet.findOneAndUpdate(
    {
      _id: tweetId,
      owner: req.user?._id,
    },
    {
      $set: { content },
    },
    {
      returnDocument: "after",
    }
  );

  if (!updatedTweet) {
    throw new ApiError(404, "Tweet not found or your unauthorized");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, updatedTweet, "Tweet updated successfully"));
});

const deleteTweet = asyncHandler(async (req, res) => {
  const { tweetId } = req.params;

  if (!isValidObjectId(tweetId)) {
    throw new ApiError(400, "Invalid tweet id");
  }

  const deletedTweet = await Tweet.findOneAndDelete({
    _id: tweetId,
    owner: req.user?._id,
  });

  if (!deletedTweet) {
    throw new ApiError(
      404,
      "Tweet not found or your not authorized to delete it"
    );
  }

  await Like.deleteMany({
    tweet: tweetId,
  });

  return res
    .status(200)
    .json(new ApiResponse(200, {}, "Tweet deleted successfully"));
});

export { getTweetsFeed, addTweet, updateTweet, deleteTweet };
