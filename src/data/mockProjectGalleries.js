// Temporary local gallery data for projects that do not have enough images yet.
// Remove this fallback once the project galleries are populated from the CMS.
const MOCK_GALLERY_POOLS = [
  [
    '/images/quote-hero-banner-bedroom.png',
    '/images/quote-hero-mobile-living.png',
    '/images/quote-featured-villa-living-room.png',
    '/images/completed-project-living-room.png'
  ],
  [
    '/images/quote-hero-banner-dining.png',
    '/images/booking-luxury-interior.png',
    '/images/quote-hero-mobile-bedroom.png',
    '/images/booking-process-interior.png'
  ],
  [
    '/images/hero_sofa_light.jpg',
    '/images/hero_sofa_sharp.jpg',
    '/images/showroom-shome-luxury.jpg',
    '/images/quote-construction-interior.png'
  ],
  [
    '/images/project_apartment.jpg',
    '/images/project_villa.jpg',
    '/images/project-cat-chung-cu-v2.png',
    '/images/project-cat-nha-pho.jpg'
  ]
];

const uniqueImages = images => [...new Set(images.filter(Boolean))];

const withMockGallery = (project, index) => {
  const actualImages = uniqueImages([project.thumbnail, ...(project.gallery || [])]);
  const mockImages = MOCK_GALLERY_POOLS[index % MOCK_GALLERY_POOLS.length];
  const gallery = actualImages.length >= 4
    ? actualImages
    : uniqueImages([...actualImages, ...mockImages]).slice(0, 4);

  return {
    ...project,
    gallery,
    galleryIsMock: actualImages.length < 4
  };
};

const applyMockProjectGalleries = (projects = [], startIndex = 0) => (
  projects.map((project, index) => withMockGallery(project, startIndex + index))
);

module.exports = { applyMockProjectGalleries };
