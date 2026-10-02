module.exports = [
  {
    id: "home",
    label: "Trang chủ",
    href: "/"
  },
  {
    id: "thiet-ke-cong-trinh",
    label: "Thiết kế công trình",
    href: "/thiet-ke-cong-trinh",
    categoryCode: "thiet-ke-cong-trinh",
    children: [
      {
        id: "thiet-ke-kien-truc",
        label: "Thiết kế kiến trúc",
        href: "/thiet-ke-kien-truc",
        categoryCode: "thiet-ke-kien-truc",
        children: [
          { id: "tk-kt-nha-cap-4", label: "Thiết kế kiến trúc nhà cấp 4", href: "/thiet-ke-kien-truc/nha-cap-4", categoryCode: "tk-kt-nha-cap-4" },
          { id: "tk-kt-nha-pho", label: "Thiết kế kiến trúc nhà phố", href: "/thiet-ke-kien-truc/nha-pho", categoryCode: "tk-kt-nha-pho" },
          { id: "tk-kt-biet-thu", label: "Thiết kế kiến trúc biệt thự", href: "/thiet-ke-kien-truc/biet-thu", categoryCode: "tk-kt-biet-thu" },
          { id: "tk-kt-villa", label: "Thiết kế kiến trúc villa", href: "/thiet-ke-kien-truc/villa", categoryCode: "tk-kt-villa" }
        ]
      },
      {
        id: "thiet-ke-noi-that",
        label: "Thiết kế nội thất",
        href: "/thiet-ke-noi-that",
        categoryCode: "thiet-ke-noi-that",
        children: [
          { id: "tk-nt-chung-cu", label: "Thiết kế nội thất chung cư", href: "/thiet-ke-noi-that/chung-cu", categoryCode: "tk-nt-chung-cu" },
          { id: "tk-nt-nha-pho", label: "Thiết kế nội thất nhà phố", href: "/thiet-ke-noi-that/nha-pho", categoryCode: "tk-nt-nha-pho" },
          { id: "tk-nt-biet-thu", label: "Thiết kế nội thất biệt thự", href: "/thiet-ke-noi-that/biet-thu", categoryCode: "tk-nt-biet-thu" },
          { id: "tk-nt-van-phong", label: "Thiết kế nội thất văn phòng", href: "/thiet-ke-noi-that/van-phong", categoryCode: "tk-nt-van-phong" }
        ]
      }
    ]
  },
  {
    id: "thi-cong-cong-trinh",
    label: "Thi công công trình",
    href: "/thi-cong-cong-trinh",
    categoryCode: "thi-cong-cong-trinh"
  },
  {
    id: "xuong-san-xuat",
    label: "Xưởng sản xuất",
    href: "/#xuong-san-xuat"
  },
  {
    id: "bao-gia",
    label: "Báo giá",
    href: "/dat-lich-ngay"
  },
  {
    id: "tuyen-dung",
    label: "Tuyển dụng",
    href: "/tuyen-dung"
  },
  {
    id: "tin-tuc",
    label: "Tin tức",
    href: "/tin-tuc"
  }
];
