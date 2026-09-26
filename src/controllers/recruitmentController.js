const navigationData = require("../data/navigationData");
const recruitmentData = require("../data/recruitmentData");

exports.getRecruitmentPage = (req, res) => {
  const pageData = {
    title: "Tuyển Dụng | SHOME LUXURY - Cùng Kiến Tạo Giá Trị",
    navigation: navigationData,
    jobs: recruitmentData
  };

  res.render("tuyen-dung", pageData);
};
