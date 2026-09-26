const navigationData = require("../data/navigationData");

exports.getHomePage = (req, res) => {
  const pageData = {
    title: "LUXURY HOME | Thiết Kế & Thi Công Nội Thất, Kiến Trúc Cao Cấp",
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
        description: "Gia công chính xác cao, đáp ứng đa dạng nhu cầu sản xuất."
      },
      {
        number: "02",
        title: "Dây chuyền tự động",
        description: "Tối ưu năng suất, đảm bảo chất lượng ổn định."
      },
      {
        number: "03",
        title: "Máy khoan – phay chính xác",
        description: "Phục vụ các công đoạn yêu cầu độ chính xác cao."
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
    news: [
      {
        title: "Xu hướng thiết kế nội thất gỗ công nghiệp cao cấp 2026",
        date: "24 Tháng 09, 2026",
        category: "Xu hướng",
        image: "/images/service_interior.jpg",
        excerpt: "Khám phá sự kết hợp giữa nét tối giản hiện đại và vật liệu gỗ phủ veneer tinh tế trong kiến trúc đương đại."
      },
      {
        title: "Bí quyết tối ưu ánh sáng tự nhiên cho biệt thự hiện đại",
        date: "18 Tháng 09, 2026",
        category: "Giải pháp",
        image: "/images/project_villa.jpg",
        excerpt: "Cách sắp đặt hệ cửa kính lớn và giếng trời để tạo luồng khí đối lưu mượt mà cho không gian sống."
      },
      {
        title: "Quy trình quản lý chất lượng thi công tại xưởng sản xuất",
        date: "10 Tháng 09, 2026",
        category: "Kỹ thuật",
        image: "/images/factory_cnc.jpg",
        excerpt: "Tiêu chuẩn kiểm định khắt khe từng mối ghép CNC và sơn phủ melamine trước khi xuất xưởng."
      }
    ]
  };

  res.render("index", pageData);
};
