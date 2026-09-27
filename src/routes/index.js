const express = require("express");
const router = express.Router();
const homeController = require("../controllers/homeController");
const recruitmentController = require("../controllers/recruitmentController");
const uploadController = require("../controllers/uploadController");

// Page Routes
router.get("/", homeController.getHomePage);
router.get("/tuyen-dung", recruitmentController.getRecruitmentPage);
router.get("/tuyen-dung/:id", recruitmentController.getRecruitmentPage); // Direct deep link support

// Backend API Routes for Recruitment Data
router.get("/api/recruitment", recruitmentController.getAllJobsApi);
router.get("/api/recruitment/:id", recruitmentController.getJobByIdApi);
router.get("/api/jobs", recruitmentController.getAllJobsApi);
router.get("/api/jobs/:id", recruitmentController.getJobByIdApi);

// Cloudinary Image Upload Endpoints (POST /api/upload & POST /api/recruitment/upload)
router.post("/api/upload", uploadController.uploadSingleMiddleware, uploadController.handleImageUpload);
router.post("/api/recruitment/upload", uploadController.uploadSingleMiddleware, uploadController.handleImageUpload);

// API endpoint for contact form submission
router.post("/api/contact", (req, res) => {
  const { fullname, phone, service, message } = req.body;
  console.log("Contact Request Received:", { fullname, phone, service, message });
  return res.json({
    success: true,
    message: "Cảm ơn quý khách! LUXURY HOME đã nhận thông tin tư vấn và sẽ liên hệ trong 15 phút."
  });
});

module.exports = router;
