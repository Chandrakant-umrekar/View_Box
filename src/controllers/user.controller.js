import { ApiError } from "../utils/apiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { User } from "../models/user.model.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import fs from "fs";

const registerUser = asyncHandler(async (req, res) => {
  const { username, email, fullName, password } = req.body;

  const avatarLocalPath = req.files?.avatar?.[0]?.path;
  const coverImageLocalPath = req.files?.coverImage?.[0]?.path;

  const cleanLocalFiles = () => {
    if (avatarLocalPath && fs.existsSync(avatarLocalPath))
      fs.unlinkSync(avatarLocalPath);
    if (coverImageLocalPath && fs.existsSync(coverImageLocalPath))
      fs.unlinkSync(coverImageLocalPath);
  };

  if (
    [username, email, fullName, password].some((field) => field?.trim() === "")
  ) {
    cleanLocalFiles();
    throw new ApiError(400, "All fields are required");
  }

  const existedUser = await User.findOne({
    $or: [{ username }, { email }],
  });

  if (existedUser) {
    cleanLocalFiles();
    throw new ApiError(409, "User with this email or username already exists");
  }

  if (!avatarLocalPath) {
    throw new ApiError(400, "Avatar file is required ");
  }

  const avatar = await uploadOnCloudinary(avatarLocalPath);

  let coverImage = null;
  if (coverImageLocalPath) {
    coverImage = await uploadOnCloudinary(coverImageLocalPath);
  }

  if (!avatar) {
    throw new ApiError(500, "Error in file uploading");
  }

  const user = await User.create({
    fullName,
    email,
    password,
    username: username.toLowerCase(),
    avatar: {
      url: avatar.url,
      public_id: avatar.public_id,
    },
    coverImage: coverImage
      ? {
          url: coverImage?.url,
          public_id: coverImage?.public_id,
        }
      : undefined,
  });

  const createdUser = await User.findById(user._id).select(
    "-password -refreshToken"
  );

  if (!createdUser) {
    throw new ApiError(500, "Error in registering user");
  }

  return res
    .status(201)
    .json(new ApiResponse(201, createdUser, "User registered Successfully"));
});

export { registerUser };
