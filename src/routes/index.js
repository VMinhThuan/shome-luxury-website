const express = require("express");
const router = express.Router();
const homeController = require("../controllers/homeController");
const recruitmentController = require("../controllers/recruitmentController");
const uploadController = require("../controllers/uploadController");
const categoryController = require("../controllers/categoryController");
const projectController = require("../controllers/projectController");
const constructionVideoController = require('../controllers/constructionVideoController');
const projectShowcaseController = require("../controllers/projectShowcaseController");
const authController = require("../controllers/authController");
const quotePageController = require("../controllers/quotePageController");
const homeImageController = require('../controllers/homeImageController');
const { authenticateAdmin, requireAdminPage } = require("../middleware/auth");

// Admin Routes (Unified under /admin/*, server-authenticated, no subdomain needed)
router.get(["/admin", "/admin/"], (req, res) => res.redirect("/admin/images"));
router.get("/admin/login", quotePageController.renderAdminLoginPage.bind(quotePageController));
router.get("/admin/images", requireAdminPage, (req, res) => res.render('admin-images', { title: 'Quản lý ảnh các trang | SHOME LUXURY' }));
router.get("/admin/thiet-ke-cong-trinh", requireAdminPage, (req, res) => res.render('admin-projects', {
  title: 'Quản lý thiết kế công trình | SHOME LUXURY',
  currentSection: 'thiet-ke-cong-trinh',
  currentSectionTitle: 'Thiết kế công trình'
}));
router.get("/admin/thi-cong-cong-trinh", requireAdminPage, (req, res) => res.render('admin-projects', {
  title: 'Quản lý thi công công trình | SHOME LUXURY',
  currentSection: 'thi-cong-cong-trinh',
  currentSectionTitle: 'Thi công công trình'
}));
router.get("/admin/projects", requireAdminPage, (req, res) => {
  const isConstruction = req.query.type === 'thi-cong' || req.query.type === 'thi-cong-cong-trinh';
  const section = isConstruction ? 'thi-cong-cong-trinh' : 'thiet-ke-cong-trinh';
  const sectionTitle = isConstruction ? 'Thi công công trình' : 'Thiết kế công trình';
  res.render('admin-projects', {
    title: `Quản lý ${sectionTitle.toLowerCase()} | SHOME LUXURY`,
    currentSection: section,
    currentSectionTitle: sectionTitle
  });
});
router.get("/admin/bao-gia", requireAdminPage, quotePageController.renderAdminPage.bind(quotePageController));

// Page Routes - Homepage, Workshop & Recruitment
router.get("/", homeController.getHomePage);
router.get("/xuong-san-xuat", homeController.getFactoryPage);
router.get("/dat-lich-ngay", homeController.getBookingPage);
router.get("/ho-so-nang-luc", homeController.getCompanyProfilePage);
router.get("/bao-gia", quotePageController.renderPage.bind(quotePageController));
router.get("/tin-tuc", homeController.getNewsPage);
router.get("/tin-tuc/:id", homeController.getNewsDetailPage);
router.get("/tin-tuc-chi-tiet/:id", homeController.getNewsDetailPage);
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
router.get("/thi-cong-cong-trinh/kien-truc/nha-cap-4", createShowcaseHandler("tc-kt-nha-cap-4"));
router.get("/thi-cong-cong-trinh/kien-truc/nha-pho", createShowcaseHandler("tc-kt-nha-pho"));
router.get("/thi-cong-cong-trinh/kien-truc/biet-thu", createShowcaseHandler("tc-kt-biet-thu"));
router.get("/thi-cong-cong-trinh/kien-truc/villa", createShowcaseHandler("tc-kt-villa"));
router.get("/thi-cong-cong-trinh/noi-that/chung-cu", createShowcaseHandler("tc-nt-chung-cu"));
router.get("/thi-cong-cong-trinh/noi-that/nha-pho", createShowcaseHandler("tc-nt-nha-pho"));
router.get("/thi-cong-cong-trinh/noi-that/biet-thu", createShowcaseHandler("tc-nt-biet-thu"));
router.get("/thi-cong-cong-trinh/noi-that/van-phong", createShowcaseHandler("tc-nt-van-phong"));

// Project Detail Page Routes (support both /cong-trinh/:slug and /san-pham/:slug)
router.get("/cong-trinh/:slug", projectShowcaseController.renderDetailPage.bind(projectShowcaseController));
router.get("/san-pham/:slug", projectShowcaseController.renderDetailPage.bind(projectShowcaseController));

// Auth Route
router.post("/api/auth/login", authController.login.bind(authController));
router.post("/api/auth/logout", authController.logout.bind(authController));

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
router.get("/api/admin/projects", authenticateAdmin, projectController.getAdminProjects.bind(projectController));
router.get('/api/construction-videos', constructionVideoController.getVideos.bind(constructionVideoController));
router.get("/api/quote-page", quotePageController.getPublicContent.bind(quotePageController));
router.put("/api/admin/quote-page", authenticateAdmin, quotePageController.updateContent.bind(quotePageController));
router.get('/api/home-images', homeImageController.getPublicImages);
router.get('/api/admin/home-images', authenticateAdmin, homeImageController.getAdminImages);
router.get('/api/admin/home-images/:imageKey/download', authenticateAdmin, homeImageController.downloadImage);
router.post('/api/admin/home-images/preview', authenticateAdmin, homeImageController.uploadMiddleware, homeImageController.previewImage);
router.put('/api/admin/home-images/:imageKey/mode', authenticateAdmin, homeImageController.setImageMode);
router.put('/api/admin/home-images/:imageKey', authenticateAdmin, homeImageController.uploadMiddleware, homeImageController.updateImage);
router.delete('/api/admin/home-images/:imageKey', authenticateAdmin, homeImageController.deleteImage);

// Admin Project CRUD & Gallery API Endpoints
router.post("/api/admin/projects", authenticateAdmin, projectController.createProject.bind(projectController));
router.put("/api/admin/projects/:id", authenticateAdmin, projectController.updateProject.bind(projectController));
router.delete("/api/admin/projects/:id", authenticateAdmin, projectController.deleteProject.bind(projectController));
router.put("/api/admin/projects/:id/thumbnail", authenticateAdmin, projectController.updateThumbnail.bind(projectController));
router.post("/api/admin/projects/:id/gallery", authenticateAdmin, projectController.addToGallery.bind(projectController));
router.put("/api/admin/projects/:id/gallery", authenticateAdmin, projectController.reorderGallery.bind(projectController));
router.delete("/api/admin/projects/:id/gallery", authenticateAdmin, projectController.removeFromGallery.bind(projectController));
router.post('/api/admin/construction-videos', authenticateAdmin, constructionVideoController.createVideo.bind(constructionVideoController));
router.put('/api/admin/construction-videos/:id', authenticateAdmin, constructionVideoController.updateVideo.bind(constructionVideoController));
router.delete('/api/admin/construction-videos/:id', authenticateAdmin, constructionVideoController.deleteVideo.bind(constructionVideoController));

// Backend API Routes for Recruitment Data
router.get("/api/recruitment", recruitmentController.getAllJobsApi);
router.get("/api/recruitment/:id", recruitmentController.getJobByIdApi);
router.get("/api/jobs", recruitmentController.getAllJobsApi);
router.get("/api/jobs/:id", recruitmentController.getJobByIdApi);

// Cloudinary Image Upload Endpoints (POST /api/upload & POST /api/recruitment/upload)
router.post("/api/upload", authenticateAdmin, uploadController.uploadSingleMiddleware, uploadController.handleImageUpload);
router.post("/api/recruitment/upload", authenticateAdmin, uploadController.uploadSingleMiddleware, uploadController.handleImageUpload);

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
