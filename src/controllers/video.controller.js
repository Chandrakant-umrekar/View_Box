import { ApiError } from "../utils/apiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { uploadOnCloudinary } from "../utils/cloudinary";
import { Video } from "../models/video.model.js";

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

  const video = await Video.create({
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

  if (!video) {
    throw new ApiError(500, "Error uploading video");
  }

  res.status(200, video, "Video uploaded successfully");
});

const deleteVideo;

export { uploadVideo };
