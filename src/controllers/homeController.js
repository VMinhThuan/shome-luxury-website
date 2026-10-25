const navigationData = require("../data/navigationData");
const newsData = require("../data/newsData");
const { getPageImages } = require("../services/imageService");

exports.getHomePage = async (req, res, next) => {
  try {
  const pageData = {
    title: "LUXURY HOME | Thiết Kế & Thi Công Nội Thất, Kiến Trúc Cao Cấp",
    headerSlogan: "Nâng tầm cuộc sống",
    navigation: navigationData,
    usps: [
      {
        id: "01",
        title: "Sản xuất trực tiếp",
        description: "Sở hữu xưởng sản xuất quy mô lớn với máy móc CNC hiện đại, tối ưu chi phí không qua trung gian."
      },
      {
        id: "02",
        title: "Chất lượng thực tế",
        description: "Cam kết thi công chuẩn 99% so với bản vẽ 3D, kiểm soát chặt chẽ từng đường nét và vật liệu."
      },
      {
        id: "03",
        title: "Đồng hành & cam kết uy tín",
        description: "Bảo hành dài hạn, tiến độ chuẩn xác và đồng hành trọn đời cùng công trình của quý khách."
      }
    ],
    services: [
      {
        id: "arch",
        title: "Thiết kế kiến trúc",
        image: "/images/service_arch.jpg",
        description: "Sáng tạo giải pháp kiến trúc độc bản, tối ưu ánh sáng tự nhiên và công năng sử dụng theo phong cách Modern Luxury.",
        link: "#thiet-ke-kien-truc"
      },
      {
        id: "interior",
        title: "Thiết kế nội thất",
        image: "/images/service_interior.jpg",
        description: "Kiến tạo không gian sống tinh tế với vật liệu gỗ công nghiệp cao cấp, tinh xảo trong từng chi tiết thi công.",
        link: "#thiet-ke-noi-that"
      },
      {
        id: "construction",
        title: "Thi công nội thất",
        image: "/images/hero_interior.jpg",
        description: "Quy trình thi công trọn gói chuyên nghiệp, đúng tiến độ, bàn giao không gian sống hoàn hảo cho gia chủ.",
        link: "#thi-cong-noi-that"
      }
    ],
    projects: [
      {
        id: "p1",
        title: "Villa Grand Manor",
        category: "Biệt thự",
        categorySlug: "biet-thu",
        area: "450m²",
        location: "KĐT Ciputra, Hà Nội",
        image: "/images/project_villa.jpg"
      },
      {
        id: "p2",
        title: "Penthouse Horizon Sky",
        category: "Chung cư",
        categorySlug: "chung-cu",
        area: "280m²",
        location: "Vinhomes Metropolis",
        image: "/images/project_apartment.jpg"
      },
      {
        id: "p3",
        title: "Heritage Townhouse",
        category: "Nhà phố",
        categorySlug: "nha-pho",
        area: "320m²",
        location: "KĐT Starlake, Hà Nội",
        image: "/images/hero_interior.jpg"
      },
      {
        id: "p4",
        title: "Executive Office Suite",
        category: "Văn phòng",
        categorySlug: "van-phong",
        area: "500m²",
        location: "Keangnam Landmark",
        image: "/images/service_interior.jpg"
      }
    ],
    capacityItems: [
      {
        number: "01",
        title: "Máy cắt CNC hiện đại",
        description: "Gia công chính xác cao, đáp ứng đa dạng nhu cầu sản xuất.",
        image: "/images/cnc_machine.jpg"
      },
      {
        number: "02",
        title: "Dây chuyền tự động",
        description: "Tối ưu năng suất, đảm bảo chất lượng ổn định.",
        image: "/images/auto_line.jpg"
      },
      {
        number: "03",
        title: "Máy khoan – phay chính xác",
        description: "Phục vụ các công đoạn yêu cầu độ chính xác cao.",
        image: "/images/drill_machine.jpg"
      },
      {
        number: "04",
        title: "Máy dán cạnh tự động",
        description: "Đường dán nẹp tinh xảo, chống ẩm tuyệt đối và thẩm mỹ hoàn hảo.",
        image: "/images/edge_banding.jpg"
      }
    ],
    processSteps: [
      { step: "01", title: "Tiếp nhận nhu cầu", desc: "Lắng nghe mong muốn và tư vấn định hướng phong cách" },
      { step: "02", title: "Khảo sát & tư vấn", desc: "Đo đạc hiện trạng thực tế và đánh giá mặt bằng" },
      { step: "03", title: "Thiết kế", desc: "Triển khai bản vẽ 2D, 3D chi tiết kỹ thuật" },
      { step: "04", title: "Báo giá", desc: "Lập dự toán chi tiết không phát sinh" },
      { step: "05", title: "Sản xuất", desc: "Gia công trực tiếp tại xưởng quy chuẩn ISO" },
      { step: "06", title: "Thi công & bàn giao", desc: "Lắp đặt hoàn thiện và nghiệm thu bảo hành" }
    ],
    news: newsData.slice(0, 3).map(item => ({
      id: item.id,
      title: item.title,
      date: item.date,
      category: item.category,
      image: item.thumbnail,
      excerpt: item.summary
    }))
  };

    pageData.homeImages = await getPageImages('home');
    res.render("index", pageData);
  } catch (error) { next(error); }
};

exports.getFactoryPage = async (req, res, next) => {
  try {
    const factoryImages = await getPageImages('factory');
    const pageData = {
      title: "Xưởng Sản Xuất Nội Thất Gỗ Công Nghiệp | SHOME LUXURY",
      headerSlogan: "Nâng tầm cuộc sống",
      navigation: navigationData,
      factoryImages,
      usps: [
        {
          id: "01",
          title: "Sản xuất trực tiếp",
          description: "Sở hữu xưởng sản xuất quy mô lớn với máy móc CNC hiện đại, tối ưu chi phí không qua trung gian."
        },
        {
          id: "02",
          title: "Chất lượng thực tế",
          description: "Cam kết thi công chuẩn 99% so với bản vẽ 3D, kiểm soát chặt chẽ từng đường nét và vật liệu."
        },
        {
          id: "03",
          title: "Đồng hành & cam kết uy tín",
          description: "Bảo hành dài hạn, tiến độ chuẩn xác và đồng hành trọn đời cùng công trình của quý khách."
        }
      ],
      capacityItems: [
        {
          number: "01",
          title: "Máy cắt CNC hiện đại",
          description: "Gia công chính xác cao, đáp ứng đa dạng nhu cầu sản xuất.",
          image: factoryImages.factory_equip_1 || "/images/cnc_machine.jpg"
        },
        {
          number: "02",
          title: "Dây chuyền tự động",
          description: "Tối ưu năng suất, đảm bảo chất lượng ổn định.",
          image: factoryImages.factory_equip_2 || "/images/auto_line.jpg"
        },
        {
          number: "03",
          title: "Máy khoan – phay chính xác",
          description: "Phục vụ các công đoạn yêu cầu độ chính xác cao.",
          image: factoryImages.factory_equip_3 || "/images/drill_machine.jpg"
        },
        {
          number: "04",
          title: "Máy dán cạnh tự động",
          description: "Đường dán nẹp tinh xảo, chống ẩm tuyệt đối và thẩm mỹ hoàn hảo.",
          image: factoryImages.factory_equip_4 || "/images/edge_banding.jpg"
        }
      ],
      processSteps: [
        { step: "01", title: "Tiếp nhận nhu cầu", desc: "Lắng nghe mong muốn và tư vấn định hướng phong cách" },
        { step: "02", title: "Khảo sát & tư vấn", desc: "Đo đạc hiện trạng thực tế và đánh giá mặt bằng" },
        { step: "03", title: "Thiết kế", desc: "Triển khai bản vẽ 2D, 3D chi tiết kỹ thuật" },
        { step: "04", title: "Báo giá", desc: "Lập dự toán chi tiết không phát sinh" },
        { step: "05", title: "Sản xuất", desc: "Gia công trực tiếp tại xưởng quy chuẩn ISO" },
        { step: "06", title: "Thi công & bàn giao", desc: "Lắp đặt hoàn thiện và nghiệm thu bảo hành" }
      ]
    };

    res.render("xuong-san-xuat", pageData);
  } catch (error) { next(error); }
};

exports.getBookingPage = async (req, res, next) => {
  try {
    const bookingImages = await getPageImages('booking');
    res.render("dat-lich-ngay", {
      title: "Nhận dự toán miễn phí | LUXURY HOME",
      headerSlogan: "Nâng tầm cuộc sống",
      navigation: navigationData,
      bookingImages
    });
  } catch (error) { next(error); }
};

exports.getCompanyProfilePage = (req, res) => {
  res.render("ho-so-nang-luc", {
    title: "Hồ sơ năng lực | SHOME LUXURY",
    headerSlogan: "Nâng tầm cuộc sống",
    navigation: navigationData
  });
};

exports.getNewsPage = async (req, res, next) => {
  try {
    const newsImages = await getPageImages('news');
    const articles = newsData.map(item => ({
      id: item.id,
      category: item.category,
      title: item.title,
      excerpt: item.summary,
      date: item.date,
      image: item.thumbnail
    }));

    res.render("tin-tuc", {
      title: "Tin tức nội thất & kiến trúc | SHOME LUXURY",
      navigation: navigationData,
      articles,
      newsImages
    });
  } catch (error) { next(error); }
};

exports.getNewsDetailPage = (req, res) => {
  const articleId = req.params.id;
  const article = newsData.find(a => a.id === articleId) || newsData[0];
  const otherArticles = newsData.filter(a => a.id !== article.id).slice(0, 4);

  res.render("tin-tuc-detail", {
    title: `${article.title} | SHOME LUXURY`,
    headerSlogan: "Nâng tầm cuộc sống",
    navigation: navigationData,
    article,
    otherArticles
  });
};
