const navigationData = require("../data/navigationData");
const recruitmentData = require("../data/recruitmentData");

// Render recruitment page
exports.getRecruitmentPage = (req, res) => {
  const pageData = {
    title: "Tuyển Dụng | SHOME LUXURY - Cùng Kiến Tạo Giá Trị",
    headerSlogan: "Kiến tạo không gian sống đẳng cấp",
    navigation: navigationData,
    jobs: recruitmentData
  };

  res.render("tuyen-dung", pageData);
};

// API: Get all recruitment posts
exports.getAllJobsApi = (req, res) => {
  res.json({
    success: true,
    count: recruitmentData.length,
    data: recruitmentData
  });
};

// API: Get 1 recruitment post by ID (Full detailed info)
exports.getJobByIdApi = (req, res) => {
  const jobId = req.params.id;
  const job = recruitmentData.find(j => j.id === jobId);

  if (!job) {
    return res.status(404).json({
      success: false,
      message: "Bài tuyển dụng không tồn tại."
    });
  }

  res.json({
    success: true,
    data: job
  });
};
