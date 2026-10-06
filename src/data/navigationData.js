module.exports = [
  {
    id: "home",
    label: "Trang chủ",
    href: "/"
  },
  {
    id: "thiet-ke-cong-trinh",
    label: "Thiết kế công trình",
    href: "javascript:void(0)",
    categoryCode: "thiet-ke-cong-trinh",
    children: [
      {
        id: "thiet-ke-kien-truc",
        label: "Thiết kế kiến trúc",
        href: "javascript:void(0)",
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
        href: "javascript:void(0)",
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
    href: "/bao-gia",
    children: [
      {
        id: "bao-gia-thiet-ke-noi-that",
        label: "Báo giá thiết kế nội thất",
        href: "javascript:void(0)",
        children: [
          { id: "bg-nt-chung-cu", label: "Báo giá nội thất chung cư", href: "/bao-gia#bao-gia-tham-khao" },
          { id: "bg-nt-nha-pho", label: "Báo giá nội thất nhà phố", href: "/bao-gia#bao-gia-tham-khao" },
          { id: "bg-nt-biet-thu", label: "Báo giá nội thất biệt thự", href: "/bao-gia#bao-gia-tham-khao" },
          { id: "bg-nt-van-phong", label: "Báo giá nội thất văn phòng", href: "/bao-gia#bao-gia-tham-khao" }
        ]
      },
      {
        id: "bao-gia-thiet-ke-kien-truc",
        label: "Báo giá thiết kế kiến trúc",
        href: "javascript:void(0)",
        children: [
          { id: "bg-kt-nha-cap-4", label: "Báo giá kiến trúc nhà cấp 4", href: "/bao-gia#bao-gia-tham-khao" },
          { id: "bg-kt-nha-pho", label: "Báo giá kiến trúc nhà phố", href: "/bao-gia#bao-gia-tham-khao" },
          { id: "bg-kt-biet-thu", label: "Báo giá kiến trúc biệt thự", href: "/bao-gia#bao-gia-tham-khao" },
          { id: "bg-kt-villa", label: "Báo giá kiến trúc villa", href: "/bao-gia#bao-gia-tham-khao" }
        ]
      }
    ]
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
