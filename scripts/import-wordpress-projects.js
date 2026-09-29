/**
 * WordPress XML Data Migration Script for S-Home Luxury Backend
 * 
 * Usage:
 *   1. Dry Run (Analysis & Report only, NO MongoDB writes):
 *      node scripts/import-wordpress-projects.js <PATH_TO_XML> --dry-run
 * 
 *   2. Real Import (Writes to MongoDB):
 *      node scripts/import-wordpress-projects.js <PATH_TO_XML>
 */

const fs = require('fs');
const path = require('path');
const readline = require('readline');
const { MongoClient, ObjectId } = require('mongodb');

// The 8 approved leaf categories definition
const APPROVED_LEAF_CATEGORIES = {
  'kien-truc-nha-cap-4': { id: 'tk-kt-nha-cap-4', group: 'architecture', name: 'Thiết kế kiến trúc nhà cấp 4' },
  'kien-truc-nha-pho': { id: 'tk-kt-nha-pho', group: 'architecture', name: 'Thiết kế kiến trúc nhà phố' },
  'kien-truc-biet-thu': { id: 'tk-kt-biet-thu', group: 'architecture', name: 'Thiết kế kiến trúc biệt thự' },
  'kien-truc-villa': { id: 'tk-kt-villa', group: 'architecture', name: 'Thiết kế kiến trúc villa' },
  'noi-that-chung-cu-1': { id: 'tk-nt-chung-cu', group: 'interior', name: 'Thiết kế nội thất chung cư' },
  'noi-that-nha-pho': { id: 'tk-nt-nha-pho', group: 'interior', name: 'Thiết kế nội thất nhà phố' },
  'noi-that-biet-thu-1': { id: 'tk-nt-biet-thu', group: 'interior', name: 'Thiết kế nội thất biệt thự' },
  'noi-that-van-phong': { id: 'tk-nt-van-phong', group: 'interior', name: 'Thiết kế nội thất văn phòng' }
};

const CATEGORY_TREE_DATA = [
  {
    name: "Thiết kế công trình",
    slug: "thiet-ke-cong-trinh",
    code: "thiet-ke-cong-trinh",
    parentCode: null,
    isLeaf: false,
    children: [
      {
        name: "Thiết kế kiến trúc",
        slug: "thiet-ke-kien-truc",
        code: "thiet-ke-kien-truc",
        isLeaf: false,
        children: [
          { name: "Thiết kế kiến trúc nhà cấp 4", slug: "thiet-ke-kien-truc-nha-cap-4", code: "tk-kt-nha-cap-4", isLeaf: true },
          { name: "Thiết kế kiến trúc nhà phố", slug: "thiet-ke-kien-truc-nha-pho", code: "tk-kt-nha-pho", isLeaf: true },
          { name: "Thiết kế kiến trúc biệt thự", slug: "thiet-ke-kien-truc-biet-thu", code: "tk-kt-biet-thu", isLeaf: true },
          { name: "Thiết kế kiến trúc villa", slug: "thiet-ke-kien-truc-villa", code: "tk-kt-villa", isLeaf: true }
        ]
      },
      {
        name: "Thiết kế nội thất",
        slug: "thiet-ke-noi-that",
        code: "thiet-ke-noi-that",
        isLeaf: false,
        children: [
          { name: "Thiết kế nội thất chung cư", slug: "thiet-ke-noi-that-chung-cu", code: "tk-nt-chung-cu", isLeaf: true },
          { name: "Thiết kế nội thất nhà phố", slug: "thiet-ke-noi-that-nha-pho", code: "tk-nt-nha-pho", isLeaf: true },
          { name: "Thiết kế nội thất biệt thự", slug: "thiet-ke-noi-that-biet-thu", code: "tk-nt-biet-thu", isLeaf: true },
          { name: "Thiết kế nội thất văn phòng", slug: "thiet-ke-noi-that-van-phong", code: "tk-nt-van-phong", isLeaf: true }
        ]
      }
    ]
  },
  {
    name: "Thi công công trình",
    slug: "thi-cong-cong-trinh",
    code: "thi-cong-cong-trinh",
    parentCode: null,
    isLeaf: false,
    children: [
      {
        name: "Thi công kiến trúc",
        slug: "thi-cong-kien-truc",
        code: "thi-cong-kien-truc",
        isLeaf: false,
        children: [
          { name: "Thi công kiến trúc biệt thự", slug: "thi-cong-kien-truc-biet-thu", code: "tc-kt-biet-thu", isLeaf: true },
          { name: "Thi công kiến trúc nhà phố", slug: "thi-cong-kien-truc-nha-pho", code: "tc-kt-nha-pho", isLeaf: true }
        ]
      },
      {
        name: "Thi công nội thất",
        slug: "thi-cong-noi-that",
        code: "thi-cong-noi-that",
        isLeaf: false,
        children: [
          { name: "Thi công nội thất chung cư", slug: "thi-cong-noi-that-chung-cu", code: "tc-nt-chung-cu", isLeaf: true },
          { name: "Thi công nội thất nhà phố", slug: "thi-cong-noi-that-nha-pho", code: "tc-nt-nha-pho", isLeaf: true },
          { name: "Thi công nội thất biệt thự", slug: "thi-cong-noi-that-biet-thu", code: "tc-nt-biet-thu", isLeaf: true },
          { name: "Thi công nội thất văn phòng", slug: "thi-cong-noi-that-van-phong", code: "tc-nt-van-phong", isLeaf: true }
        ]
      }
    ]
  }
];

/**
 * Safely parse title to extract investor and location
 */
function parseTitle(title) {
  if (!title) return { investor: null, location: null, parsedCleanly: false };
  const parts = title.split(/\s*[\u2013\u2014\-]\s*/);
  if (parts.length >= 2) {
    const investor = parts[0].trim();
    const location = parts.slice(1).join(' – ').trim();
    return { investor, location, parsedCleanly: true };
  }
  return { investor: title.trim(), location: null, parsedCleanly: false };
}

/**
 * Parse an <item> XML string block
 */
function parseItemBlock(itemXml) {
  const getCdataOrText = (tag, src = itemXml) => {
    const regex = new RegExp(`<${tag}><!\\[CDATA\\[([\\s\\S]*?)\\]\\]><\\/${tag}>|<${tag}>([\\s\\S]*?)<\\/${tag}>`);
    const match = src.match(regex);
    if (!match) return '';
    return (match[1] !== undefined ? match[1] : match[2] || '').trim();
  };

  const postType = getCdataOrText('wp:post_type');
  const wordpressId = parseInt(getCdataOrText('wp:post_id'), 10) || null;
  const originalTitle = getCdataOrText('title');
  const slug = getCdataOrText('wp:post_name');
  const oldUrl = getCdataOrText('link');
  const content = getCdataOrText('content:encoded');
  const excerpt = getCdataOrText('excerpt:encoded');
  const postDate = getCdataOrText('wp:post_date');
  const postModified = getCdataOrText('wp:post_modified');
  const wpStatus = getCdataOrText('wp:status') || 'unknown';

  // Parse categories
  const categoryIdsSet = new Set();
  const rawCategories = [];
  const catRegex = /<category domain="(.*?)" nicename="(.*?)"><!\[CDATA\[([\s\S]*?)\]\]><\/category>/g;
  let m;
  while ((m = catRegex.exec(itemXml)) !== null) {
    const domain = m[1];
    const catSlug = m[2];
    const catName = m[3];
    rawCategories.push({ domain, slug: catSlug, name: catName });
    if (domain === 'product_cat' && APPROVED_LEAF_CATEGORIES[catSlug]) {
      categoryIdsSet.add(APPROVED_LEAF_CATEGORIES[catSlug].id);
    }
  }

  // Parse postmeta
  const metas = {};
  const metaRegex = /<wp:postmeta>[\s\S]*?<wp:meta_key><!\[CDATA\[(.*?)\]\]><\/wp:meta_key>[\s\S]*?<wp:meta_value><!\[CDATA\[([\s\S]*?)\]\]><\/wp:meta_value>[\s\S]*?<\/wp:postmeta>/g;
  while ((m = metaRegex.exec(itemXml)) !== null) {
    metas[m[1]] = m[2];
  }

  // Area and Style
  const area = metas['dien-tich'] || metas['info_dien-tich'] || metas['_info_dien-tich'] || null;
  const style = metas['phong-cach'] || metas['info_phong-cach'] || metas['_info_phong-cach'] || null;

  // Investor & Location
  const { investor, location, parsedCleanly } = parseTitle(originalTitle);

  // Status mapping
  const status = wpStatus === 'publish' ? 'published' : wpStatus;
  const categoryIds = Array.from(categoryIdsSet);

  return {
    postType,
    wordpressId,
    originalTitle,
    wpStatus,
    rawCategories,
    metas,
    parsedCleanly,
    transformed: {
      title: originalTitle,
      slug,
      investor,
      location,
      area,
      style,
      categoryIds,
      excerpt,
      content,
      thumbnail: null,
      gallery: [],
      status,
      featured: false,
      createdAt: postDate ? new Date(postDate).toISOString() : null,
      updatedAt: postModified ? new Date(postModified).toISOString() : null,
      legacy: {
        wordpressId,
        oldUrl,
        originalTitle
      }
    }
  };
}

async function seedCategoryTree(db) {
  const collection = db.collection('categories');
  const codeToIdMap = {};

  async function processNode(node, parentId = null) {
    const filter = { code: node.code };
    const update = {
      $set: {
        name: node.name,
        slug: node.slug,
        code: node.code,
        parentId,
        isLeaf: !!node.isLeaf,
        updatedAt: new Date()
      },
      $setOnInsert: {
        createdAt: new Date()
      }
    };
    const result = await collection.findOneAndUpdate(filter, update, { upsert: true, returnDocument: 'after' });
    const doc = result.value || await collection.findOne(filter);
    codeToIdMap[node.code] = doc._id;

    if (node.children && node.children.length > 0) {
      for (const child of node.children) {
        await processNode(child, doc._id);
      }
    }
  }

  for (const rootNode of CATEGORY_TREE_DATA) {
    await processNode(rootNode, null);
  }

  return codeToIdMap;
}

async function runMigration() {
  const args = process.argv.slice(2);
  const isDryRun = args.includes('--dry-run');
  const xmlPathArg = args.find(arg => !arg.startsWith('--'));

  if (!xmlPathArg) {
    console.error('ERROR: Please specify path to WordPress XML file.');
    console.error('Usage: node scripts/import-wordpress-projects.js <PATH_TO_XML> [--dry-run]');
    process.exit(1);
  }

  const xmlPath = path.resolve(process.cwd(), xmlPathArg);
  if (!fs.existsSync(xmlPath)) {
    console.error(`ERROR: XML file not found at path: ${xmlPath}`);
    process.exit(1);
  }

  console.log(`\n==================================================`);
  console.log(` WORDPRESS DATA MIGRATION SCRIPT`);
  console.log(` Mode: ${isDryRun ? '1. DRY RUN (Analysis & Report Only)' : '2. REAL IMPORT (Writing to MongoDB)'}`);
  console.log(` Target XML: ${xmlPath}`);
  console.log(`==================================================\n`);

  const fileStream = fs.createReadStream(xmlPath);
  const rl = readline.createInterface({ input: fileStream, crlfDelay: Infinity });

  let totalXmlItems = 0;
  let totalProducts = 0;

  const productStatusBreakdown = {
    publish: 0,
    draft: 0,
    private: 0,
    trash: 0,
    other: 0
  };

  const leafCategoriesBreakdown = {
    architecture: {
      'tk-kt-nha-cap-4': 0,
      'tk-kt-nha-pho': 0,
      'tk-kt-biet-thu': 0,
      'tk-kt-villa': 0
    },
    interior: {
      'tk-nt-chung-cu': 0,
      'tk-nt-nha-pho': 0,
      'tk-nt-biet-thu': 0,
      'tk-nt-van-phong': 0
    }
  };

  let areaMapped = 0;
  let areaMissing = 0;
  let styleMapped = 0;
  let styleMissing = 0;
  let investorLocationParsed = 0;
  let investorLocationNeedsReview = 0;

  const eligible = [];
  const skipped = [];
  const needsReview = [];
  const unknownCategories = {};
  const unknownMetaKeys = {};
  const errors = [];

  const knownMetaKeys = new Set(['dien-tich', 'info_dien-tich', '_info_dien-tich', 'phong-cach', 'info_phong-cach', '_info_phong-cach', '_thumbnail_id', '_product_image_gallery']);

  let inItem = false;
  let itemBuffer = '';

  for await (const line of rl) {
    if (line.includes('<item>')) {
      inItem = true;
      itemBuffer = line + '\n';
      totalXmlItems++;
      continue;
    }
    if (inItem) {
      itemBuffer += line + '\n';
      if (line.includes('</item>')) {
        inItem = false;

        const parsed = parseItemBlock(itemBuffer);
        if (parsed.postType === 'product') {
          totalProducts++;

          if (productStatusBreakdown[parsed.wpStatus] !== undefined) {
            productStatusBreakdown[parsed.wpStatus]++;
          } else {
            productStatusBreakdown.other++;
          }

          parsed.rawCategories.forEach(cat => {
            if (cat.domain === 'product_cat') {
              if (!APPROVED_LEAF_CATEGORIES[cat.slug]) {
                unknownCategories[cat.slug] = (unknownCategories[cat.slug] || 0) + 1;
              }
            }
          });

          Object.keys(parsed.metas).forEach(metaKey => {
            if (!knownMetaKeys.has(metaKey)) {
              unknownMetaKeys[metaKey] = (unknownMetaKeys[metaKey] || 0) + 1;
            }
          });

          const record = parsed.transformed;

          if (parsed.wpStatus === 'publish') {
            if (record.categoryIds.length > 0) {
              eligible.push(record);

              record.categoryIds.forEach(catId => {
                if (leafCategoriesBreakdown.architecture[catId] !== undefined) {
                  leafCategoriesBreakdown.architecture[catId]++;
                }
                if (leafCategoriesBreakdown.interior[catId] !== undefined) {
                  leafCategoriesBreakdown.interior[catId]++;
                }
              });

              if (record.area) areaMapped++;
              else areaMissing++;

              if (record.style) styleMapped++;
              else styleMissing++;

              if (parsed.parsedCleanly) investorLocationParsed++;
              else investorLocationNeedsReview++;
            } else {
              needsReview.push({
                wordpressId: parsed.wordpressId,
                title: parsed.originalTitle,
                categories: parsed.rawCategories.map(c => ({ domain: c.domain, slug: c.slug, name: c.name })),
                reason: 'Published product lacks an approved leaf category'
              });
            }
          } else {
            skipped.push({
              wordpressId: parsed.wordpressId,
              title: parsed.originalTitle,
              slug: record.slug,
              wpStatus: parsed.wpStatus,
              categories: parsed.rawCategories.map(c => c.slug),
              reason: `Product status is '${parsed.wpStatus}' (not published)`
            });
          }
        }
      }
    }
  }

  const categoryMappingRules = {};
  Object.entries(APPROVED_LEAF_CATEGORIES).forEach(([wpSlug, config]) => {
    categoryMappingRules[wpSlug] = config.id;
  });

  const report = {
    timestamp: new Date().toISOString(),
    mode: isDryRun ? 'DRY_RUN' : 'REAL_IMPORT',
    sourceFile: xmlPath,
    stats: {
      totalXmlItems,
      totalProducts,
      productStatusBreakdown,
      leafCategoriesBreakdown: {
        architecture: {
          'Nhà cấp 4 (tk-kt-nha-cap-4)': leafCategoriesBreakdown.architecture['tk-kt-nha-cap-4'],
          'Nhà phố (tk-kt-nha-pho)': leafCategoriesBreakdown.architecture['tk-kt-nha-pho'],
          'Biệt thự (tk-kt-biet-thu)': leafCategoriesBreakdown.architecture['tk-kt-biet-thu'],
          'Villa (tk-kt-villa)': leafCategoriesBreakdown.architecture['tk-kt-villa']
        },
        interior: {
          'Chung cư (tk-nt-chung-cu)': leafCategoriesBreakdown.interior['tk-nt-chung-cu'],
          'Nhà phố (tk-nt-nha-pho)': leafCategoriesBreakdown.interior['tk-nt-nha-pho'],
          'Biệt thự (tk-nt-biet-thu)': leafCategoriesBreakdown.interior['tk-nt-biet-thu'],
          'Văn phòng (tk-nt-van-phong)': leafCategoriesBreakdown.interior['tk-nt-van-phong']
        }
      },
      eligibilitySummary: {
        eligible: eligible.length,
        skipped: skipped.length,
        needsReview: needsReview.length
      },
      areaStats: {
        areaMapped,
        areaMissing
      },
      styleStats: {
        styleMapped,
        styleMissing
      },
      investorLocationStats: {
        investorLocationParsed,
        investorLocationNeedsReview
      }
    },
    categoryMappingRules,
    eligible,
    skipped,
    needsReview,
    unknownCategories,
    unknownMetaKeys,
    errors
  };

  const reportPath = path.resolve(process.cwd(), 'migration-report.json');

  if (isDryRun) {
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2), 'utf8');
    console.log(`[DRY RUN SUCCESSFUL] Report generated at: ${reportPath}`);
    console.log(`MongoDB write was SKIPPED. Awaiting user review and confirmation.\n`);
    return;
  }

  // REAL IMPORT MODE
  console.log(`[REAL IMPORT] Connecting to MongoDB...`);
  require('dotenv').config({ path: path.resolve(process.cwd(), '.env.local') });
  require('dotenv').config({ path: path.resolve(process.cwd(), '.env') });

  const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/shome_luxury';
  const client = new MongoClient(mongoUri);

  try {
    await client.connect();
    console.log(`Connected successfully to MongoDB at ${mongoUri}`);
    const db = client.db();

    // 1. Seed Category Tree and get Code -> ObjectId mapping
    console.log(`[REAL IMPORT] Seeding Category tree in MongoDB...`);
    const codeToIdMap = await seedCategoryTree(db);
    console.log(`Category tree seeded. Category ObjectIds mapped.`);

    const collection = db.collection('projects');

    let insertedCount = 0;
    let updatedCount = 0;

    for (const record of eligible) {
      // Map code categoryIds (e.g. "tk-kt-nha-cap-4") -> real MongoDB Category ObjectIds
      const objectIdCategories = record.categoryIds.map(code => codeToIdMap[code]).filter(Boolean);

      const dbRecord = {
        ...record,
        categoryIds: objectIdCategories,
        createdAt: record.createdAt ? new Date(record.createdAt) : new Date(),
        updatedAt: record.updatedAt ? new Date(record.updatedAt) : new Date()
      };

      const filter = { 'legacy.wordpressId': record.legacy.wordpressId };
      const update = { $set: dbRecord };
      const result = await collection.updateOne(filter, update, { upsert: true });

      if (result.upsertedCount > 0) {
        insertedCount++;
      } else if (result.modifiedCount > 0) {
        updatedCount++;
      }
    }

    report.importResults = {
      insertedCount,
      updatedCount,
      totalProcessed: eligible.length
    };

    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2), 'utf8');
    console.log(`\n[REAL IMPORT SUCCESSFUL]`);
    console.log(` - Inserted: ${insertedCount}`);
    console.log(` - Updated: ${updatedCount}`);
    console.log(` - Total Processed: ${eligible.length}`);
    console.log(` - Updated migration-report.json`);
  } catch (err) {
    console.error(`[REAL IMPORT ERROR] Failed writing to MongoDB:`, err);
    process.exit(1);
  } finally {
    await client.close();
  }
}

runMigration().catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
});
