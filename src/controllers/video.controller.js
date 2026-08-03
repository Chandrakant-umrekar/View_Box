import { ApiError } from "../utils/apiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { deleteFromCloudinary, uploadOnCloudinary } from "../utils/cloudinary";
import { Video } from "../models/video.model.js";
import mongooseAggregatePaginate from "mongoose-aggregate-paginate-v2";
import mongoose, { isValidObjectId } from "mongoose";
import { ApiResponse } from "../utils/ApiResponse.js";
import { User } from "../models/user.model.js";
import { Like } from "../models/like.model.js";
import { Comment } from "../models/comment.model.js";

// homepage video feed
const getVideosFeed = asyncHandler(async (req, res) => {
  const {
    page = 1,
    limit = 10,
    sortBy = "createdAt",
    sortType = "desc",
  } = req.query;

  const pipeline = [
    {
      $match: {
        isPublished: true,
      },
    },
    {
      $sort: {
        [sortBy]: sortType === "asc" ? 1 : -1,
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
  ];

  const videoAggregate = Video.aggregate(pipeline);

  const options = {
    page: parseInt(page, 10),
    limit: parseInt(limit, 10),
  };

  const feedResults = await Video.aggregatePaginate(videoAggregate, options);

  if (!feedResults) {
    throw new ApiError(500, "Error while fetching videos feed");
  }

  return res
    .status(200)
    .json(
      new ApiResponse(200, feedResults, "Videos feed fetched successfully")
    );
});

// for user text search querying
const searchVideos = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10, query } = req.query;

  if (!query?.trim()) {
    throw new ApiError(400, "Search query text is required");
  }

  // case-insensitive regex matching for title/description
  const searchQuery = {
    isPublished: true,
    $or: [
      { title: { $regex: query.trim(), $options: "i" } },
      { description: { $regex: query.trim(), $options: "i" } },
    ],
  };

  const searchPipeline = Video.aggregate([
    {
      $match: searchQuery,
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
  ]);

  const options = {
    page: parseInt(page, 10),
    limit: parseInt(limit, 10),
  };

  const searchResults = await Video.aggregatePaginate(searchPipeline, options);

  if (!searchResults) {
    throw new ApiError(500, "Error while processing video search");
  }

  return res
    .status(200)
    .json(
      new ApiResponse(200, searchResults, "Search results fetched successfully")
    );
});

const uploadVideo = asyncHandler(async (req, res) => {
  const { title, description } = req.body;

  if ([title, description].some((field) => field?.trim() === "")) {
    throw new ApiError(400, "Title and Description are required");
  }

  const videoLocalFilePath = req.files?.video?.[0]?.path;
  const thumbnailLocalFilePath = req.files?.thumbnail?.[0]?.path;

  if (!videoLocalFilePath) {
    throw new ApiError(400, "Video file is required");
  }

  const video = await uploadOnCloudinary(videoLocalFilePath);
  const thumbnail = await uploadOnCloudinary(thumbnailLocalFilePath);

  if (!video?.url || !thumbnail?.url) {
    throw new ApiError(500, "Error while uploading video and thumbnail file");
  }

  const createdVideo = await Video.create({
    title,
    description,
    videoFile: {
      url: video.url,
      public_id: video.public_id,
    },
    thumbnail: {
      url: thumbnail.url,
      public_id: thumbnail.public_id,
    },
    duration: video.duration,
  });

  if (!createdVideo) {
    throw new ApiError(500, "Error uploading video");
  }

  res
    .status(201)
    .json(new ApiResponse(201, createdVideo, "Video uploaded successfully"));
});

const getVideoById = asyncHandler(async (req, res) => {
  const { videoId } = req.params;

  if (!isValidObjectId(videoId)) {
    throw new ApiError(400, "Invalid video id");
  }

  const video = await Video.aggregate([
    {
      $match: {
        _id: new mongoose.Types.ObjectId(videoId),
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
            $lookup: {
              from: "subscriptions",
              localField: "_id",
              foreignField: "channel",
              as: "subscribers",
            },
          },
          {
            $addFields: {
              isSubscribed: {
                $cond: {
                  if: {
                    $in: [
                      new mongoose.Types.ObjectId(req.user?._id),
                      "$subscribers.subscriber",
                    ],
                  },
                  then: true,
                  else: false,
                },
              },
              subscriberCount: {
                $size: "$subscribers",
              },
            },
          },
          {
            $project: {
              username: 1,
              avatar: 1,
              isSubscribed,
              subscriberCount,
            },
          },
        ],
      },
    },
    {
      $lookup: {
        from: "likes",
        localField: "_id",
        foreignField: "video",
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
              $in: [req.user?._id, "$likes.likedBy"],
            },
            then: true,
            else: false,
          },
        },
        owner: {
          $first: "$owner",
        },
      },
    },
    {
      $project: {
        videoFile: 1,
        title: 1,
        description: 1,
        views: 1,
        createdAt: 1,
        duration: 1,
        owner: 1,
        likesCount: 1,
        isLiked: 1,
      },
    },
  ]);

  if (!video || video.length === 0) {
    throw new ApiError(500, "Error while fetching video");
  }

  //increment views
  await Video.findByIdAndUpdate(videoId, {
    $inc: {
      views: 1,
    },
  });

  //add this video to user's watch history
  await User.findByIdAndUpdate(req.user?._id, {
    $addToSet: {
      watchHistory: videoId,
    },
  });

  res
    .status(200)
    .json(
      new ApiResponse(200, video[0], "Video and details fetched successfully")
    );
});

const updateVideo = asyncHandler(async (req, res) => {
  const { videoId } = req.params;
  const { title, description } = req.body;
  const newThumbnailPath = req.file?.path;

  if (!isValidObjectId(videoId)) {
    throw new ApiError(400, "Invalid video id");
  }

  const existingVideo = await Video.findById(videoId);
  if (!existingVideo) {
    throw new ApiError(404, "Video not found");
  }

  if (!newThumbnailPath && !title && !description) {
    throw new ApiError(400, "At least one field must be provided");
  }

  const updateFields = {};

  if (title) updateFields.title = title;
  if (description) updateFields.description = description;

  if (newThumbnailPath) {
    const thumbnail = await uploadOnCloudinary(newThumbnailPath);

    if (!thumbnail?.url) {
      throw new ApiError(500, "Error while uploading thumbnail to cloudinary");
    }

    if (existingVideo.thumbnail?.public_id) {
      await deleteFromCloudinary(existingVideo.thumbnail.public_id, "image");
    }

    updateFields.thumbnail = {
      url: thumbnail.url,
      public_id: thumbnail.public_id,
    };
  }

  const updatedVideo = await Video.findByIdAndUpdate(
    videoId,
    { $set: updateFields },
    { returnDocument: "after" }
  );

  if (!updatedVideo) {
    throw new ApiError(500, "Error while updating video");
  }

  res
    .status(200)
    .json(new ApiResponse(200, updatedVideo, "Video updated successfully"));
});

const deleteVideo = asyncHandler(async (req, res) => {
  const { videoId } = req.params;

  if (!isValidObjectId(videoId)) {
    throw new ApiError(400, "Invalid video id");
  }

  const deletedVideo = await Video.findOneAndDelete({
    _id: videoId,
    owner: req.user?._id,
  });

  if (!deletedVideo) {
    throw new ApiError(
      404,
      "Video not found or you are not authorized to delete it"
    );
  }

  if (deletedVideo.videoFile?.public_id) {
    await deleteFromCloudinary(deletedVideo.videoFile.public_id, "video");
  }
  if (deletedVideo.thumbnail?.public_id) {
    await deleteFromCloudinary(deletedVideo.thumbnail.public_id, "image");
  }

  //delete video like documents
  await Like.deleteMany({
    video: videoId,
  });

  //delete video comments documents
  await Comment.deleteMany({
    video: videoId,
  });

  res.status(200).json(new ApiResponse(200, {}, "Video deleted successfully"));
});

const togglePublishStatus = asyncHandler(async (req, res) => {
  const { videoId } = req.params;

  if (!isValidObjectId(videoId)) {
    throw new ApiError(400, "Invalid video id");
  }

  const video = await Video.findById(videoId);

  if (!video) {
    throw new ApiError(404, "Video not found");
  }

  if (video.owner?.toString() !== req.user?._id.toString()) {
    throw new ApiError(403, "Your not permmited for this action");
  }

  const updatedVideo = await findByIdAndUpdate(
    videoId,
    {
      $set: {
        isPublished: !video.isPublished,
      },
    },
    { returnDocument: "after" }
  );

  if (!updateVideo) {
    throw new ApiError(500, "Error while toggling video publish status");
  }

  res
    .status(200)
    .json(
      new ApiResponse(
        200,
        { isPublished: updatedVideo.isPublished },
        `Video status changed to ${updateVideo.isPublished ? "Published" : "Unpublished"}`
      )
    );
});

export {
  uploadVideo,
  getVideoById,
  updateVideo,
  deleteVideo,
  getVideosFeed,
  togglePublishStatus,
  searchVideos,
};
