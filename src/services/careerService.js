const mongoose = require('mongoose');
const Career = require('../models/Career');
const ContentMigration = require('../models/ContentMigration');
const recruitmentData = require('../data/recruitmentData');
const { sanitizeHtml } = require('../utils/sanitizeHtml');

let seedPromise;
const MIGRATION_KEY = 'careers-recruitment-data-v1';

const slugify = (value) => String(value || '')
  .normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd')
  .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 180);

const normalize = (value) => {
  if (!value) return null;
  const job = typeof value?.toObject === 'function' ? value.toObject() : { ...value };
  const image = job.thumbnail || job.image || '/images/banner-tuyendung.png';
  return { ...job, id: job.legacyId || job.slug || String(job._id), image, thumbnail: image };
};

const normalizeInput = (data = {}, partial = false) => {
  const input = { ...data };
  if (input.title !== undefined) input.title = String(input.title || '').trim();
  if (!partial && !input.title) throw Object.assign(new Error('Tiêu đề tuyển dụng không được để trống.'), { status: 400 });
  if (input.slug !== undefined || (!partial && input.title)) input.slug = slugify(input.slug || input.title);
  if (input.fullHtmlContent !== undefined) input.fullHtmlContent = sanitizeHtml(input.fullHtmlContent);
  if (input.summary !== undefined) input.summary = String(input.summary || '').trim();
  ['isHot', 'isPublished', 'isClosed'].forEach(field => {
    if (input[field] !== undefined) input[field] = input[field] === true || input[field] === 'true' || input[field] === '1' || input[field] === 1;
  });
  if (input.status !== undefined && !['published', 'draft', 'private', 'trash'].includes(input.status)) {
    throw Object.assign(new Error('Trạng thái tin tuyển dụng không hợp lệ.'), { status: 400 });
  }
  if (input.isPublished !== undefined && input.status === undefined) input.status = input.isPublished ? 'published' : 'draft';
  if (input.status !== undefined && input.isPublished === undefined) input.isPublished = input.status === 'published';
  if (input.thumbnail !== undefined && input.image === undefined) input.image = input.thumbnail;
  if (input.image !== undefined && input.thumbnail === undefined) input.thumbnail = input.image;
  return input;
};

async function ensureSeeded() {
  if (!seedPromise) {
    seedPromise = (async () => {
      if (await ContentMigration.exists({ key: MIGRATION_KEY })) return;
      for (const item of recruitmentData) {
        const legacyId = String(item.id);
        const existing = await Career.findOne({ $or: [{ legacyId }, { slug: legacyId }] }).select('_id legacyId').lean();
        if (!existing) {
          const row = normalizeInput({ ...item, legacyId, slug: legacyId }, false);
          await Career.create(row);
        } else if (!existing.legacyId) {
          await Career.updateOne({ _id: existing._id }, { $set: { legacyId } });
        }
      }
      await ContentMigration.updateOne({ key: MIGRATION_KEY }, { $setOnInsert: { key: MIGRATION_KEY, completedAt: new Date() } }, { upsert: true });
    })().catch(error => {
      seedPromise = null;
      if (error?.code === 11000) return;
      throw error;
    });
  }
  await seedPromise;
}

class CareerService {
  async list(options = {}) {
    await ensureSeeded();
    const page = Math.max(1, Number.parseInt(options.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, Number.parseInt(options.limit, 10) || 12));
    const filter = {};
    if (options.status && options.status !== 'all') filter.status = options.status;
    else if (options.public) { filter.status = 'published'; filter.isPublished = true; filter.isClosed = { $ne: true }; }
    if (options.search) filter.$or = ['title', 'summary', 'location', 'category', 'slug'].map(field => ({ [field]: new RegExp(String(options.search).trim(), 'i') }));
    if (options.category) filter.category = options.category;
    const [rows, totalItems] = await Promise.all([
      Career.find(filter).sort({ isHot: -1, updatedAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
      Career.countDocuments(filter)
    ]);
    return { rows: rows.map(normalize), page, limit, totalItems, totalPages: Math.ceil(totalItems / limit) || 0 };
  }

  async find(idOrSlug, { public: publicOnly = false } = {}) {
    await ensureSeeded();
    const query = mongoose.Types.ObjectId.isValid(idOrSlug)
      ? { $or: [{ _id: idOrSlug }, { slug: idOrSlug }, { legacyId: idOrSlug }] }
      : { $or: [{ slug: idOrSlug }, { legacyId: idOrSlug }] };
    if (publicOnly) { query.status = 'published'; query.isPublished = true; query.isClosed = { $ne: true }; }
    return normalize(await Career.findOne(query).lean());
  }

  async create(data) {
    await ensureSeeded();
    const input = normalizeInput(data);
    if (await Career.exists({ slug: input.slug })) throw Object.assign(new Error('Slug tuyển dụng đã tồn tại.'), { status: 409 });
    const isPublished = input.isPublished !== undefined ? input.isPublished : input.status === undefined || input.status === 'published';
    return normalize(await Career.create({ ...input, isPublished, status: isPublished ? 'published' : (input.status || 'draft') }));
  }

  async update(id, data) {
    await ensureSeeded();
    const input = normalizeInput(data, true);
    const current = await Career.findOne(this._idOrSlugQuery(id));
    if (!current) throw Object.assign(new Error('Tin tuyển dụng không tồn tại.'), { status: 404 });
    if (input.slug && await Career.exists({ slug: input.slug, _id: { $ne: current._id } })) throw Object.assign(new Error('Slug tuyển dụng đã tồn tại.'), { status: 409 });
    if (input.status !== undefined && input.isPublished === undefined) input.isPublished = input.status === 'published';
    if (input.isPublished !== undefined && input.status === undefined) input.status = input.isPublished ? 'published' : 'draft';
    const row = await Career.findByIdAndUpdate(current._id, input, { new: true, runValidators: true }).lean();
    if (!row) throw Object.assign(new Error('Tin tuyển dụng không tồn tại.'), { status: 404 });
    return normalize(row);
  }

  async remove(id) {
    await ensureSeeded();
    const row = await Career.findOneAndDelete(this._idOrSlugQuery(id)).lean();
    if (!row) throw Object.assign(new Error('Tin tuyển dụng không tồn tại.'), { status: 404 });
    return normalize(row);
  }

  _idOrSlugQuery(idOrSlug) {
    if (mongoose.Types.ObjectId.isValid(idOrSlug)) return { _id: idOrSlug };
    return { $or: [{ slug: idOrSlug }, { legacyId: idOrSlug }] };
  }
}

module.exports = new CareerService();
