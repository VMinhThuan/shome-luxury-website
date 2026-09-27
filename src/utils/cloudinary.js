const cloudinary = require("cloudinary").v2;

// Configure Cloudinary from environment variables
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME || "demo",
  api_key: process.env.CLOUDINARY_API_KEY || "",
  api_secret: process.env.CLOUDINARY_API_SECRET || "",
  secure: true
});

/**
 * Upload a file buffer to Cloudinary
 * @param {Buffer} fileBuffer - Image buffer from multer memoryStorage
 * @param {String} folderName - Cloudinary folder name (e.g. 'shome-luxury/recruitment')
 * @returns {Promise<Object>} Cloudinary upload result
 */
const uploadToCloudinary = (fileBuffer, folderName = "shome-luxury/recruitment") => {
  return new Promise((resolve, reject) => {
    // If Cloudinary keys are missing, reject with helpful message
    if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
      return reject(new Error("Thiếu cấu hình Cloudinary (CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET) trong biến môi trường."));
    }

    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: folderName,
        resource_type: "auto"
      },
      (error, result) => {
        if (error) return reject(error);
        resolve(result);
      }
    );

    uploadStream.end(fileBuffer);
  });
};

module.exports = {
  cloudinary,
  uploadToCloudinary
};
