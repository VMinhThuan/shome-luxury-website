const navigationData = require("../data/navigationData");
const { getPageImages } = require("../services/imageService");
const careerService = require('../services/careerService');

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
exports.getRecruitmentPage = async (req, res, next) => {
  try {
    const jobId = req.params.id;

    if (jobId) {
      const rawJob = await careerService.find(jobId, { public: true });
      if (rawJob) {
        const job = formatJobItem(rawJob);
        const otherResult = await careerService.list({ public: true, limit: 5 });
        const otherJobs = otherResult.rows.filter(item => item.id !== job.id).slice(0, 4).map(formatJobItem);
        return res.render("tuyen-dung-detail", {
          title: `${job.title} | SHOME LUXURY`,
          headerSlogan: "Nâng tầm cuộc sống",
          navigation: navigationData,
          job: job,
          otherJobs: otherJobs
        });
      }
      return res.status(404).render('404', { title: 'Không tìm thấy vị trí tuyển dụng | SHOME LUXURY', navigation: navigationData });
    }

    const recruitmentImages = await getPageImages('recruitment');
    const result = await careerService.list({ public: true, limit: 100 });
    const formattedJobs = result.rows.map(formatJobItem);
    const pageData = {
      title: "Tuyển Dụng | SHOME LUXURY - Cùng Kiến Tạo Giá Trị",
      headerSlogan: "Nâng tầm cuộc sống",
      navigation: navigationData,
      jobs: formattedJobs,
      recruitmentImages
    };

    res.render("tuyen-dung", pageData);
  } catch (error) { next(error); }
};

// API: Get all recruitment posts
exports.getAllJobsApi = async (req, res, next) => {
  try {
    const result = await careerService.list({ public: true, limit: 100 });
    const formattedJobs = result.rows.map(formatJobItem);
    return res.json({ success: true, count: formattedJobs.length, data: formattedJobs });
  } catch (error) { return next(error); }
};

// API: Get 1 recruitment post by ID (Full detailed info)
exports.getJobByIdApi = async (req, res, next) => {
  try {
    const jobId = req.params.id;
    const rawJob = await careerService.find(jobId, { public: true });

    if (!rawJob) return res.status(404).json({ success: false, message: "Bài tuyển dụng không tồn tại." });

    const job = formatJobItem(rawJob);

    return res.json({ success: true, data: job });
  } catch (error) { return next(error); }
};
