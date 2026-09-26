const express = require("express");
const router = express.Router();
const homeController = require("../controllers/homeController");
const recruitmentController = require("../controllers/recruitmentController");

router.get("/", homeController.getHomePage);
router.get("/tuyen-dung", recruitmentController.getRecruitmentPage);

// API endpoint for form submission if needed
router.post("/api/contact", (req, res) => {
  const { fullname, phone, service, message } = req.body;
  console.log("Contact Request Received:", { fullname, phone, service, message });
  return res.json({
    success: true,
    message: "Cảm ơn quý khách! LUXURY HOME đã nhận thông tin tư vấn và sẽ liên hệ trong 15 phút."
  });
});

module.exports = router;
