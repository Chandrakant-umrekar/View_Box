import { v2 as cloudinary } from "cloudinary";
import fs from "fs";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET, // Click 'View API Keys' above to copy your API secret
});

const uploadOnCloudinary = async (localFilePath) => {
  try {
    if (!localFilePath) return null;

    const uploadResponse = await cloudinary.uploader.upload(localFilePath, {
      resource_type: "auto",
    });
    fs.unlinkSync(localFilePath);
    return uploadResponse;
  } catch (err) {
    fs.unlinkSync(localFilePath); //remove locally saved file due to error (synchronously)
    console.log("Cloudinary file uploading error :", err);
    return null;
  }
};

const deleteFromCloudinary = async (publicId, type) => {
  try {
    if (!publicId) return null;

    const deleteResponse = await cloudinary.uploader.destroy(publicId, {
      resource_type: type,
    });

    return deleteResponse;
  } catch (err) {
    console.log("Cloudinary file deletion error :", err);
    return null;
  }
};

export { uploadOnCloudinary, deleteFromCloudinary };
