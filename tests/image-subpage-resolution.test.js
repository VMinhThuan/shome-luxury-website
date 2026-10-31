const assert = require('node:assert/strict');
const HomeImage = require('../src/models/HomeImage');
const { getPageImages } = require('../src/services/imageService');

const parentKey = 'quote_hero_banner_1';
const childKey = 'subpage_quote_tk-kt-nha-cap-4_quote_hero_banner_1';
const parentRef = {
  page_key: 'quote',
  section_key: 'hero',
  image_key: parentKey
};
const childRef = {
  page_key: 'quote:tk-kt-nha-cap-4',
  section_key: 'hero',
  image_key: childKey
};

const parentImage = 'https://res.cloudinary.com/demo/image/upload/quote-parent.webp';
const updatedParentImage = 'https://res.cloudinary.com/demo/image/upload/quote-parent-updated.webp';
const childImage = 'https://res.cloudinary.com/demo/image/upload/quote-child.webp';

const originalFind = HomeImage.find;
let records = [];
HomeImage.find = () => ({ lean: async () => records });

async function run() {
  records = [{
    image_key: parentKey,
    mode: 'custom',
    image_url: parentImage,
    custom_image_reference: { image_url: parentImage }
  }];
  const fallback = await getPageImages('quote', 'tk-kt-nha-cap-4');
  assert.equal(fallback[parentKey], parentImage, 'quote subpage falls back to parent custom image');

  records.push({
    image_key: childKey,
    mode: 'shared',
    image_url: parentImage,
    shared_image_reference: parentRef,
    custom_image_reference: { image_url: childImage }
  });
  const shared = await getPageImages('quote', 'tk-kt-nha-cap-4');
  assert.equal(shared[parentKey], parentImage, 'shared quote subpage resolves its configured source');

  records[0].image_url = updatedParentImage;
  records[0].custom_image_reference.image_url = updatedParentImage;
  const updated = await getPageImages('quote', 'tk-kt-nha-cap-4');
  assert.equal(updated[parentKey], updatedParentImage, 'shared quote subpage follows source updates');

  records[1] = {
    image_key: childKey,
    mode: 'custom',
    image_url: childImage,
    custom_image_reference: { image_url: childImage }
  };
  const custom = await getPageImages('quote', 'tk-kt-nha-cap-4');
  assert.equal(custom[parentKey], childImage, 'custom quote subpage uses its own override');

  records = [
    { image_key: parentKey, mode: 'shared', image_url: parentImage, shared_image_reference: childRef },
    { image_key: childKey, mode: 'shared', image_url: childImage, shared_image_reference: parentRef }
  ];
  const circular = await getPageImages('quote', 'tk-kt-nha-cap-4');
  assert.ok(circular[parentKey], 'circular references safely return a fallback image');

  console.log('Image subpage resolution checks passed: fallback, shared updates, custom override, and circular safety.');
}

run().catch(error => {
  console.error(error);
  process.exitCode = 1;
}).finally(() => {
  HomeImage.find = originalFind;
});
