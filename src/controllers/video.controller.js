import { ApiError } from "../utils/apiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { deleteFromCloudinary, uploadOnCloudinary } from "../utils/cloudinary";
import { Video } from "../models/video.model.js";
import mongooseAggregatePaginate from "mongoose-aggregate-paginate-v2";
import mongoose, { isValidObjectId } from "mongoose";
import { ApiResponse } from "../utils/ApiResponse.js";

const uploadVideo = asyncHandler(async (req, res) => {
  const { title, description } = req.body;

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
    .status(200)
    .json(new ApiResponse(200, createdVideo, "Video uploaded successfully"));
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
            $project: {
              fullName: 1,
              username: 1,
              email: 1,
              avatar: 1,
            },
          },
        ],
      },
    },
    {
      $addFields: {
        owner: {
          $first: "owner",
        },
      },
    },
  ]);

  if (video.length === 0) {
    throw new ApiError(500, "Error while fetching video");
  }

  res
    .status(200)
    .json(new ApiResponse(200, video[0], "Video fetched successfully"));
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
    {
      new: true,
    }
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

  const deleteResponse = await Video.findByIdAndDelete(videoId);

  if (!deleteResponse) {
    throw new ApiError(500, "Error while deleting video");
  }

  if (deleteResponse.videoFile?.public_id) {
    await deleteFromCloudinary(deleteResponse.videoFile.public_id, "video");
  }
  if (deleteResponse.thumbnail?.public_id) {
    await deleteFromCloudinary(deleteResponse.thumbnail.public_id, "image");
  }

  res.status(200).json(new ApiResponse(200, {}, "Video deleted successfully"));
});

export { uploadVideo, getVideoById, updateVideo };
