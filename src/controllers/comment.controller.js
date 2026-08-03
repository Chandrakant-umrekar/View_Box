import mongoose, { isValidObjectId } from "mongoose";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/apiError.js";
import { Comment } from "../models/comment.model.js";
import { Like } from "../models/like.model.js";
import { ApiResponse } from "../utils/ApiResponse.js";

const getVideoComments = asyncHandler(async (req, res) => {
  const { videoId } = req.params;
  const { page = 1, limit = 10 } = req.query;

  if (!isValidObjectId(videoId)) {
    throw new ApiError(400, "Invalid video id");
  }

  const pipeline = [
    {
      $match: {
        video: new mongoose.Types.ObjectId(videoId),
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
        foreignField: "comment",
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
        content: 1,
        owner: 1,
        likesCount: 1,
        isLiked: 1,
        createdAt: 1,
      },
    },
    {
      $sort: {
        createdAt: -1,
      },
    },
  ];

  const options = {
    page: parseInt(page, 10),
    limit: parseInt(limit, 10),
  };

  const commentsList = await Comment.aggregatePaginate(
    Comment.aggregate(pipeline),
    options
  );

  if (!commentsList) {
    throw new ApiError(
      500,
      "Something went wrong while getting video comments"
    );
  }

  res
    .status(200)
    .json(new ApiResponse(200, commentsList, "comments fetched successfully"));
});

const addComment = asyncHandler(async (req, res) => {
  const { content } = req.body;
  const { videoId } = req.query;

  if (!isValidObjectId(videoId)) {
    throw new ApiError(400, "Invalid video id");
  }

  if (!content?.trim() || typeof content !== "string") {
    throw new ApiError(400, "content is required and must be text");
  }

  if (content.length > 280) {
    throw new ApiError(400, "Comment content cannot exceed 280 characters");
  }

  const newComment = await Comment.create({
    content,
    owner: req.user?._id,
    video: videoId,
  });

  if (!newComment) {
    throw new ApiError(500, "Something went wrong while adding comment");
  }

  res
    .status(201)
    .json(new ApiResponse(201, newComment, "Comment added successfully"));
});

const updateComment = asyncHandler(async (req, res) => {
  const { commentId } = req.params;
  const { content } = req.body;

  if (!isValidObjectId(commentId)) {
    throw new ApiError(400, "Invalid comment id");
  }

  if (typeof content !== "string" || !content?.trim()) {
    throw new ApiError(400, "content is required and must be text");
  }

  const updatedComment = await Comment.findOneAndUpdate(
    {
      _id: commentId,
      owner: req.user?._id,
    },
    {
      $set: { content },
    },
    {
      returnDocument: "after",
    }
  );

  if (!updatedComment) {
    throw new ApiError(404, "Comment not found or unauthorized");
  }

  res
    .status(200)
    .json(new ApiResponse(200, updatedComment, "Comment updated successfully"));
});

const deleteComment = asyncHandler(async (req, res) => {
  const { commentId } = req.params;

  if (!isValidObjectId(commentId)) {
    throw new ApiError(400, "Invalid comment id");
  }

  const deletedComment = await Comment.findOneAndDelete({
    _id: commentId,
    owner: req.user?._id,
  });

  if (!deletedComment) {
    throw new ApiError(
      404,
      "Comment not found or your not authorized to delete it"
    );
  }

  await Like.deleteMany({
    comment: commentId,
  });

  res
    .status(200)
    .json(new ApiResponse(200, {}, "Comment deleted successfully"));
});

export { addComment, getVideoComments, updateComment, deleteComment };
