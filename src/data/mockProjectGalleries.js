// Temporary local gallery data for UI testing when project galleries are not
// populated from the CMS yet. Remove this fallback once real galleries exist.
const MOCK_GALLERY_POOLS = [
  [
    '/images/mock-gallery/living-room-walnut.png',
    '/images/mock-gallery/double-height-lounge.png',
    '/images/mock-gallery/dining-room.png',
    '/images/mock-gallery/bedroom-sunrise.png'
  ],
  [
    '/images/mock-gallery/open-kitchen.png',
    '/images/mock-gallery/home-office.png',
    '/images/mock-gallery/spa-bathroom.png',
    '/images/mock-gallery/villa-lounge.png'
  ],
  [
    '/images/mock-gallery/double-height-lounge.png',
    '/images/mock-gallery/open-kitchen.png',
    '/images/mock-gallery/living-room-walnut.png',
    '/images/mock-gallery/home-office.png'
  ],
  [
    '/images/mock-gallery/dining-room.png',
    '/images/mock-gallery/bedroom-sunrise.png',
    '/images/mock-gallery/villa-lounge.png',
    '/images/mock-gallery/spa-bathroom.png'
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
