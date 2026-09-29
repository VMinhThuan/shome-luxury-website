const express = require("express");
const router = express.Router();
const homeController = require("../controllers/homeController");
const recruitmentController = require("../controllers/recruitmentController");
const uploadController = require("../controllers/uploadController");
const categoryController = require("../controllers/categoryController");
const projectController = require("../controllers/projectController");
const projectShowcaseController = require("../controllers/projectShowcaseController");
const authController = require("../controllers/authController");
const { authenticateAdmin } = require("../middleware/auth");

// Page Routes - Homepage & Recruitment
router.get("/", homeController.getHomePage);
router.get("/tuyen-dung", recruitmentController.getRecruitmentPage);
router.get("/tuyen-dung/:id", recruitmentController.getRecruitmentPage);

// Frontend Page Routes - Public Showcase & Category Pages
const createShowcaseHandler = (categoryCode) => (req, res, next) => {
  req.params.categoryCode = categoryCode;
  return projectShowcaseController.renderShowcasePage(req, res, next);
};

// Overview Showcase Route
router.get("/thiet-ke-cong-trinh", createShowcaseHandler("thiet-ke-cong-trinh"));

// Architecture Showcase Routes
router.get("/thiet-ke-kien-truc", createShowcaseHandler("thiet-ke-kien-truc"));
router.get("/thiet-ke-kien-truc/nha-cap-4", createShowcaseHandler("tk-kt-nha-cap-4"));
router.get("/thiet-ke-kien-truc/nha-pho", createShowcaseHandler("tk-kt-nha-pho"));
router.get("/thiet-ke-kien-truc/biet-thu", createShowcaseHandler("tk-kt-biet-thu"));
router.get("/thiet-ke-kien-truc/villa", createShowcaseHandler("tk-kt-villa"));

// Interior Showcase Routes
router.get("/thiet-ke-noi-that", createShowcaseHandler("thiet-ke-noi-that"));
router.get("/thiet-ke-noi-that/chung-cu", createShowcaseHandler("tk-nt-chung-cu"));
router.get("/thiet-ke-noi-that/nha-pho", createShowcaseHandler("tk-nt-nha-pho"));
router.get("/thiet-ke-noi-that/biet-thu", createShowcaseHandler("tk-nt-biet-thu"));
router.get("/thiet-ke-noi-that/van-phong", createShowcaseHandler("tk-nt-van-phong"));

// Construction Route
router.get("/thi-cong-cong-trinh", createShowcaseHandler("thi-cong-cong-trinh"));

// Project Detail Page Routes (support both /cong-trinh/:slug and /san-pham/:slug)
router.get("/cong-trinh/:slug", projectShowcaseController.renderDetailPage.bind(projectShowcaseController));
router.get("/san-pham/:slug", projectShowcaseController.renderDetailPage.bind(projectShowcaseController));

// Auth Route
router.post("/api/auth/login", authController.login.bind(authController));

// Public Category API Endpoints
router.get("/api/categories", categoryController.getCategories.bind(categoryController));
router.get("/api/categories/:idOrSlug", categoryController.getCategoryByIdOrSlug.bind(categoryController));

// Admin Category CRUD API Endpoints
router.post("/api/admin/categories", authenticateAdmin, categoryController.createCategory.bind(categoryController));
router.put("/api/admin/categories/:id", authenticateAdmin, categoryController.updateCategory.bind(categoryController));
router.delete("/api/admin/categories/:id", authenticateAdmin, categoryController.deleteCategory.bind(categoryController));

// Public Project API Endpoints (Search, Pagination, Descendant Filtering, Status & Featured Filtering, Sorting)
router.get("/api/projects", projectController.getProjects.bind(projectController));
router.get("/api/projects/:idOrSlug", projectController.getProjectByIdOrSlug.bind(projectController));

// Admin Project CRUD & Gallery API Endpoints
router.post("/api/admin/projects", authenticateAdmin, projectController.createProject.bind(projectController));
router.put("/api/admin/projects/:id", authenticateAdmin, projectController.updateProject.bind(projectController));
router.delete("/api/admin/projects/:id", authenticateAdmin, projectController.deleteProject.bind(projectController));
router.put("/api/admin/projects/:id/thumbnail", authenticateAdmin, projectController.updateThumbnail.bind(projectController));
router.post("/api/admin/projects/:id/gallery", authenticateAdmin, projectController.addToGallery.bind(projectController));
router.delete("/api/admin/projects/:id/gallery", authenticateAdmin, projectController.removeFromGallery.bind(projectController));

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
