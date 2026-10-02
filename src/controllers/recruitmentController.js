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

// Render recruitment page or recruitment detail page
exports.getRecruitmentPage = (req, res) => {
  const jobId = req.params.id;

  if (jobId) {
    const rawJob = recruitmentData.find(j => j.id === jobId);
    if (rawJob) {
      const job = formatJobItem(rawJob);
      const otherJobs = recruitmentData.filter(j => j.id !== jobId).slice(0, 4).map(formatJobItem);
      return res.render("tuyen-dung-detail", {
        title: `${job.title} | SHOME LUXURY`,
        headerSlogan: "Nâng tầm cuộc sống",
        navigation: navigationData,
        job: job,
        otherJobs: otherJobs
      });
    }
  }

  const formattedJobs = recruitmentData.map(formatJobItem);
  const pageData = {
    title: "Tuyển Dụng | SHOME LUXURY - Cùng Kiến Tạo Giá Trị",
    headerSlogan: "Nâng tầm cuộc sống",
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
