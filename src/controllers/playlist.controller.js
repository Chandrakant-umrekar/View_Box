import mongoose, { isValidObjectId } from "mongoose";
import { Playlist } from "../models/playlist.model.js";
import { ApiError } from "../utils/apiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { Video } from "../models/video.model.js";

const getPlaylistBYId = asyncHandler(async (req, res) => {
  const { playlistId } = req.params;

  if (!isValidObjectId(playlistId)) {
    throw new ApiError(400, "Invalid playlist id");
  }

  const playlist = await Playlist.aggregate([
    {
      $match: {
        _id: new mongoose.Types.ObjectId(playlistId),
      },
    },
    {
      $lookup: {
        from: "videos",
        localField: "videos",
        foreignField: "_id",
        as: "videos",
        pipeline: [
          {
            $match: {
              isPublished: true,
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
            $project: {
              thumbnail: 1,
              title: 1,
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
      $project: {
        name: 1,
        description: 1,
        videos: 1,
        owner: 1,
      },
    },
  ]);

  if (!playlist?.length) {
    throw new ApiError(404, "Playlist not found or has been deleted");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, playlist[0], "Playlist fetched successfully"));
});

const getUserPlaylists = asyncHandler(async (req, res) => {
  const { userId } = req.params;

  if (!isValidObjectId(userId)) {
    throw new ApiError(400, "Invalid user id");
  }

  const playlists = await Playlist.find(
    {
      owner: userId,
    },
    "name description" //only fetch this fields
  );

  if (!playlists) {
    throw new ApiError(500, "Something went wrong while fetching playlists");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, playlists, "Playlists fetched successfully"));
});

const addVideoToPlaylist = asyncHandler(async (req, res) => {
  const { videoId, playlistId } = req.params;

  if (!isValidObjectId(videoId) || !isValidObjectId(playlistId)) {
    throw new ApiError(400, "Invalid video id or playlist id");
  }

  const existingVideo = await Video.findById(videoId);

  if (!existingVideo) {
    throw new ApiError(404, "Video not found");
  }

  if (!existingVideo.isPublished) {
    throw new ApiError(400, "Cannot add a private video to a playlist");
  }

  const updatedPlaylist = await Playlist.findOneAndUpdate(
    {
      _id: playlistId,
      owner: req.user?._id,
    },
    {
      $addToSet: { videos: videoId }, //add video if it doesn't already exists
    },
    {
      returnDocument: "after",
    }
  );

  if (!updatedPlaylist) {
    throw new ApiError(
      404,
      "Playlist not found or you are unauthorized to modify it"
    );
  }

  return res
    .status(200)
    .json(new ApiResponse(200, updatedPlaylist, "Video added to playlist"));
});

const removeVideoFromPlaylist = asyncHandler(async (req, res) => {
  const { videoId, playlistId } = req.params;

  if (!isValidObjectId(videoId) || !isValidObjectId(playlistId)) {
    throw new ApiError(400, "Invalid videoId or playlistId");
  }

  const updatedPlaylist = await Playlist.findOneAndUpdate(
    {
      _id: playlistId,
      owner: req.user?._id,
    },
    {
      $pull: { videos: videoId },
    },
    {
      returnDocument: "after",
    }
  );

  if (!updatedPlaylist) {
    throw new ApiError(
      404,
      "Playlist not found or you are unauthorized to modify it"
    );
  }

  return res
    .status(200)
    .json(new ApiResponse(200, updatePlaylist, "Video removed from playlist"));
});

const createPlaylist = asyncHandler(async (req, res) => {
  const { name, description } = req.body;

  if (!name?.trim() && !description?.trim()) {
    throw new ApiError(400, "name and description are required");
  }

  const playlist = await Playlist.create({
    name: name.trim(),
    description,
    owner: req.user?._id,
  });

  if (!playlist) {
    throw new ApiError(500, "Something went wrong while creating playlist");
  }

  return res
    .status(201)
    .json(new ApiResponse(201, playlist, "Playlist created successfully"));
});

const deletePlaylist = asyncHandler(async (req, res) => {
  const { playlistId } = req.params;

  if (!isValidObjectId(playlistId)) {
    throw new ApiError(400, "Invalid playlist id");
  }

  const deletedPlaylist = await Playlist.findOneAndDelete({
    _id: playlistId,
    owner: req.user?._id,
  });

  if (!deletedPlaylist) {
    throw new ApiError(
      404,
      "Playlist not found or your unauthorized for this action"
    );
  }

  return res
    .status(200)
    .json(new ApiResponse(200, {}, "Playlist deleted successfully"));
});

const updatePlaylist = asyncHandler(async (req, res) => {
  const { playlistId } = req.params;
  const { name, description } = req.body;

  if (!isValidObjectId(playlistId)) {
    throw new ApiError(400, "Invalid playlist id");
  }

  if (!name?.trim() && !description?.trim()) {
    throw new ApiError(400, "Both fields cannot be empty");
  }

  let updateFields = {};

  if (name?.trim()) updateFields.name = name;
  if (description?.trim()) updateFields.description = description;

  const updatedPlaylist = await Playlist.findOneAndUpdate(
    { _id: playlistId, owner: req.user?._id },
    { $set: updateFields },
    { returnDocument: "after" }
  );

  if (!updatedPlaylist) {
    throw new ApiError(
      404,
      "Playlist not found or your unauthorized for this action"
    );
  }
  return res
    .status(200)
    .json(
      new ApiResponse(200, updatedPlaylist, "Playlist updated successfully")
    );
});

export {
  getPlaylistBYId,
  getUserPlaylists,
  createPlaylist,
  deletePlaylist,
  updatePlaylist,
};
