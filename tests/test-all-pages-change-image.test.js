const http = require('http');
const mongoose = require('mongoose');
const app = require('../app');
const HomeImage = require('../src/models/HomeImage');
const { getPageImages } = require('../src/services/imageService');

async function testAllPagesCanChangeImage() {
  console.log('\n======================================================');
  console.log(' TESTING IMAGE REPLACEMENT & RESTORE ACROSS ALL 6 PAGES');
  console.log('======================================================\n');

  const server = http.createServer(app);
  await new Promise(res => server.listen(0, res));
  const port = server.address().port;

  const fetchHtml = (path) => new Promise((resolve, reject) => {
    http.get(`http://localhost:${port}${path}`, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({ status: res.statusCode, html: data }));
    }).on('error', reject);
  });

  const testPages = [
    {
      pageName: 'Trang chủ',
      pageKey: 'home',
      slotKey: 'hero_banner_1',
      pageUrl: '/',
      testImageUrl: 'https://res.cloudinary.com/demo/image/upload/v123456/test_home_hero.webp',
      defaultSnippet: '/images/home-hero-banner.jpg'
    },
    {
      pageName: 'Xưởng sản xuất',
      pageKey: 'factory',
      slotKey: 'factory_hero_banner_1',
      pageUrl: '/xuong-san-xuat',
      testImageUrl: 'https://res.cloudinary.com/demo/image/upload/v123456/test_factory_hero.webp',
      defaultSnippet: '/images/factory_cnc.jpg'
    },
    {
      pageName: 'Báo giá',
      pageKey: 'quote',
      slotKey: 'quote_hero_banner_1',
      pageUrl: '/bao-gia?category=tk-nt-chung-cu',
      testImageUrl: 'https://res.cloudinary.com/demo/image/upload/v123456/test_quote_hero.webp',
      defaultSnippet: '/images/banner-bao-gia.png'
    },
    {
      pageName: 'Tin tức',
      pageKey: 'news',
      slotKey: 'news_hero_banner',
      pageUrl: '/tin-tuc',
      testImageUrl: 'https://res.cloudinary.com/demo/image/upload/v123456/test_news_banner.webp',
      defaultSnippet: '/images/hero_sofa_sharp.jpg'
    },
    {
      pageName: 'Tuyển dụng',
      pageKey: 'recruitment',
      slotKey: 'recruitment_hero_banner',
      pageUrl: '/tuyen-dung',
      testImageUrl: 'https://res.cloudinary.com/demo/image/upload/v123456/test_recruitment_banner.webp',
      defaultSnippet: '/images/recruitment-hero-clean.png'
    },
    {
      pageName: 'Đặt lịch tư vấn',
      pageKey: 'booking',
      slotKey: 'booking_hero_banner_1',
      pageUrl: '/dat-lich-ngay',
      testImageUrl: 'https://res.cloudinary.com/demo/image/upload/v123456/test_booking_hero.webp',
      defaultSnippet: '/images/booking-luxury-interior.png'
    }
  ];

  let passed = 0;
  let total = 0;

  for (const item of testPages) {
    console.log(`\n--- [PAGE: ${item.pageName.toUpperCase()} (${item.pageKey})] ---`);

    // STEP 1: Verify initial/default render
    total++;
    const initialRes = await fetchHtml(item.pageUrl);
    if (initialRes.status === 200) {
      console.log(` [PASS] Initial GET ${item.pageUrl} returns 200 OK`);
      passed++;
    } else {
      console.error(` [FAIL] Initial GET ${item.pageUrl} failed with status ${initialRes.status}`);
    }

    // STEP 2: Update replacement image in database (simulating upload)
    total++;
    await HomeImage.findOneAndUpdate(
      { image_key: item.slotKey },
      {
        $set: {
          page_key: item.pageKey,
          image_url: item.testImageUrl,
          cloudinary_public_id: `test_${item.slotKey}`
        }
      },
      { upsert: true, new: true }
    );

    // Verify service reads it
    const imagesMap = await getPageImages(item.pageKey);
    if (imagesMap[item.slotKey] === item.testImageUrl) {
      console.log(` [PASS] imageService.getPageImages('${item.pageKey}') returned replacement URL`);
      passed++;
    } else {
      console.error(` [FAIL] imageService failed: expected ${item.testImageUrl}, got ${imagesMap[item.slotKey]}`);
    }

    // STEP 3: Verify the public page renders the updated replacement image!
    total++;
    const updatedRes = await fetchHtml(item.pageUrl);
    if (updatedRes.status === 200 && updatedRes.html.includes(item.testImageUrl)) {
      console.log(` [PASS] Public page HTML contains updated image URL: ${item.testImageUrl}`);
      passed++;
    } else {
      console.error(` [FAIL] Updated page does not contain replacement image URL in HTML`);
    }

    // STEP 4: Delete the replacement image (revert to default)
    total++;
    await HomeImage.deleteOne({ image_key: item.slotKey });
    const revertedMap = await getPageImages(item.pageKey);
    const revertedRes = await fetchHtml(item.pageUrl);

    if (revertedMap[item.slotKey] === item.defaultSnippet && revertedRes.status === 200 && revertedRes.html.includes(item.defaultSnippet)) {
      console.log(` [PASS] Reverted to default successfully. HTML contains default image: ${item.defaultSnippet}`);
      passed++;
    } else {
      console.error(` [FAIL] Revert check failed for ${item.pageName}: got URL "${revertedMap[item.slotKey]}"`);
    }
  }

  server.close();
  console.log('\n======================================================');
  console.log(` TEST COMPLETED: ${passed}/${total} assertions PASSED`);
  console.log('======================================================\n');

  process.exit(passed === total ? 0 : 1);
}

testAllPagesCanChangeImage().catch(err => {
  console.error('Test execution error:', err);
  process.exit(1);
});
