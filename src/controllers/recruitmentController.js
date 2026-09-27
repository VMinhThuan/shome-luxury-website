const navigationData = require("../data/navigationData");
const recruitmentData = require("../data/recruitmentData");

// Helper to normalize job data with both 'image' and 'thumbnail' fields
const formatJobItem = (job) => {
  const imageUrl = job.thumbnail || job.image || job.imageUrl || "/images/banner-tuyendung.png";
  return {
    ...job,
    image: imageUrl,
    thumbnail: imageUrl
  };
};

// Render recruitment page
exports.getRecruitmentPage = (req, res) => {
  const formattedJobs = recruitmentData.map(formatJobItem);
  const pageData = {
    title: "Tuyển Dụng | SHOME LUXURY - Cùng Kiến Tạo Giá Trị",
    headerSlogan: "Kiến tạo không gian sống đẳng cấp",
    navigation: navigationData,
    jobs: formattedJobs
  };

  res.render("tuyen-dung", pageData);
};

// API: Get all recruitment posts
exports.getAllJobsApi = (req, res) => {
  const formattedJobs = recruitmentData.map(formatJobItem);
  res.json({
    success: true,
    count: formattedJobs.length,
    data: formattedJobs
  });
};

// API: Get 1 recruitment post by ID (Full detailed info)
exports.getJobByIdApi = (req, res) => {
  const jobId = req.params.id;
  const rawJob = recruitmentData.find(j => j.id === jobId);

  if (!rawJob) {
    return res.status(404).json({
      success: false,
      message: "Bài tuyển dụng không tồn tại."
    });
  }

  const job = formatJobItem(rawJob);

  res.json({
    success: true,
    data: job
  });
};
