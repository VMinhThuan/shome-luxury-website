module.exports = [
  {
    id: "home",
    label: "Trang chủ",
    href: "/"
  },
  {
    id: "architecture",
    label: "Thiết kế kiến trúc",
    href: "#thiet-ke-kien-truc",
    children: [
      { id: "arch-cap4", label: "Thiết kế kiến trúc nhà cấp 4", href: "#" },
      { id: "arch-pho", label: "Thiết kế kiến trúc nhà phố", href: "#" },
      { id: "arch-biettu", label: "Thiết kế kiến trúc biệt thự", href: "#" },
      { id: "arch-villa", label: "Thiết kế kiến trúc villa", href: "#" }
    ]
  },
  {
    id: "interior",
    label: "Thiết kế nội thất",
    href: "#thiet-ke-noi-that",
    children: [
      { id: "int-chungcu", label: "Thiết kế nội thất chung cư", href: "#" },
      { id: "int-nhapho", label: "Thiết kế nội thất nhà phố", href: "#" },
      { id: "int-biettu", label: "Thiết kế nội thất biệt thự", href: "#" },
      { id: "int-vanphong", label: "Thiết kế nội thất văn phòng", href: "#" }
    ]
  },
  {
    id: "factory",
    label: "Xưởng sản xuất",
    href: "#xuong-san-xuat"
  },
  {
    id: "pricing",
    label: "Báo giá",
    href: "#bao-gia",
    children: [
      {
        id: "pricing-interior",
        label: "Báo giá thiết kế nội thất",
        href: "#",
        children: [
          { id: "p-int-chungcu", label: "Báo giá nội thất chung cư", href: "#" },
          { id: "p-int-nhapho", label: "Báo giá nội thất nhà phố", href: "#" },
          { id: "p-int-biettu", label: "Báo giá nội thất biệt thự", href: "#" },
          { id: "p-int-vanphong", label: "Báo giá nội thất văn phòng", href: "#" }
        ]
      },
      {
        id: "pricing-architecture",
        label: "Báo giá thiết kế kiến trúc",
        href: "#",
        children: [
          { id: "p-arch-cap4", label: "Báo giá kiến trúc nhà cấp 4", href: "#" },
          { id: "p-arch-nhapho", label: "Báo giá kiến trúc nhà phố", href: "#" },
          { id: "p-arch-biettu", label: "Báo giá kiến trúc biệt thự", href: "#" },
          { id: "p-arch-villa", label: "Báo giá kiến trúc villa", href: "#" }
        ]
      }
    ]
  },
  {
    id: "careers",
    label: "Tuyển dụng",
    href: "#tuyen-dung"
  },
  {
    id: "news",
    label: "Tin tức",
    href: "#tin-tuc"
  }
];
