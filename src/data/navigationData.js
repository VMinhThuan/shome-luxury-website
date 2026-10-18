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
    href: "javascript:void(0)",
    categoryCode: "thi-cong-cong-trinh",
    children: [
      {
        id: "thi-cong-kien-truc",
        label: "Thi công kiến trúc",
        href: "javascript:void(0)",
        children: [
          { id: "tc-kt-nha-cap-4", label: "Thi công kiến trúc nhà cấp 4", href: "/thi-cong-cong-trinh/kien-truc/nha-cap-4" },
          { id: "tc-kt-nha-pho", label: "Thi công kiến trúc nhà phố", href: "/thi-cong-cong-trinh/kien-truc/nha-pho" },
          { id: "tc-kt-biet-thu", label: "Thi công kiến trúc biệt thự", href: "/thi-cong-cong-trinh/kien-truc/biet-thu" },
          { id: "tc-kt-villa", label: "Thi công kiến trúc villa", href: "/thi-cong-cong-trinh/kien-truc/villa" }
        ]
      },
      {
        id: "thi-cong-noi-that",
        label: "Thi công nội thất",
        href: "javascript:void(0)",
        children: [
          { id: "tc-nt-chung-cu", label: "Thi công nội thất chung cư", href: "/thi-cong-cong-trinh/noi-that/chung-cu" },
          { id: "tc-nt-nha-pho", label: "Thi công nội thất nhà phố", href: "/thi-cong-cong-trinh/noi-that/nha-pho" },
          { id: "tc-nt-biet-thu", label: "Thi công nội thất biệt thự", href: "/thi-cong-cong-trinh/noi-that/biet-thu" },
          { id: "tc-nt-van-phong", label: "Thi công nội thất văn phòng", href: "/thi-cong-cong-trinh/noi-that/van-phong" }
        ]
      }
    ]
  },
  {
    id: "xuong-san-xuat",
    label: "Xưởng sản xuất",
    href: "/xuong-san-xuat"
  },
  {
    id: "bao-gia",
    label: "Báo giá",
    href: "javascript:void(0)",
    children: [
      {
        id: "bao-gia-thiet-ke-kien-truc",
        label: "Thiết kế thi công kiến trúc",
        href: "javascript:void(0)",
        children: [
          { id: "bg-kt-nha-cap-4", label: "Kiến trúc nhà cấp 4 trọn gói", href: "/bao-gia?category=tk-kt-nha-cap-4" },
          { id: "bg-kt-nha-pho", label: "Kiến trúc nhà phố trọn gói", href: "/bao-gia?category=tk-kt-nha-pho" },
          { id: "bg-kt-biet-thu", label: "Kiến trúc biệt thự trọn gói", href: "/bao-gia?category=tk-kt-biet-thu" },
          { id: "bg-kt-villa", label: "Kiến trúc villa trọn gói", href: "/bao-gia?category=tk-kt-villa" }
        ]
      },
      {
        id: "bao-gia-thiet-ke-noi-that",
        label: "Thiết kế thi công nội thất",
        href: "javascript:void(0)",
        children: [
          { id: "bg-nt-chung-cu", label: "Nội thất chung cư trọn gói", href: "/bao-gia?category=tk-nt-chung-cu" },
          { id: "bg-nt-nha-pho", label: "Nội thất nhà phố trọn gói", href: "/bao-gia?category=tk-nt-nha-pho" },
          { id: "bg-nt-biet-thu", label: "Nội thất biệt thự trọn gói", href: "/bao-gia?category=tk-nt-biet-thu" },
          { id: "bg-nt-van-phong", label: "Nội thất văn phòng trọn gói", href: "/bao-gia?category=tk-nt-van-phong" }
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
