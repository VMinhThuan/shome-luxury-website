const Category = require('../models/Category');
const mongoose = require('mongoose');

class CategoryService {
  /**
   * Get all categories as a hierarchical tree structure
   */
  async getCategoryTree() {
    const categories = await Category.find().sort({ createdAt: 1 }).lean();
    const map = {};
    const roots = [];

    categories.forEach(cat => {
      cat.children = [];
      map[cat._id.toString()] = cat;
    });

    categories.forEach(cat => {
      if (cat.parentId) {
        const parent = map[cat.parentId.toString()];
        if (parent) {
          parent.children.push(cat);
        } else {
          roots.push(cat);
        }
      } else {
        roots.push(cat);
      }
    });

    return roots;
  }

  /**
   * Get Category by ObjectId, Slug, or Code
   */
  async getCategoryByIdOrSlug(idOrSlug) {
    if (!idOrSlug) return null;
    let category = null;

    if (mongoose.Types.ObjectId.isValid(idOrSlug)) {
      category = await Category.findById(idOrSlug).lean();
    }
    if (!category) {
      category = await Category.findOne({
        $or: [{ slug: idOrSlug }, { code: idOrSlug }]
      }).lean();
    }
    if (category) {
      const children = await Category.find({ parentId: category._id }).lean();
      category.children = children;
    }
    return category;
  }

  /**
   * Get category ID and all descendant category IDs in a single DB query (In-memory tree traversal).
   * Enables Descendant Category Filtering with maximum performance!
   */
  async getAllDescendantCategoryIds(idOrSlug) {
    const allCategories = await Category.find().select('_id parentId slug code').lean();
    if (!allCategories || allCategories.length === 0) return [];

    const rootCat = allCategories.find(c =>
      c._id.toString() === idOrSlug ||
      c.slug === idOrSlug ||
      c.code === idOrSlug
    );
    if (!rootCat) return [];

    const childrenMap = {};
    allCategories.forEach(cat => {
      if (cat.parentId) {
        const pId = cat.parentId.toString();
        if (!childrenMap[pId]) childrenMap[pId] = [];
        childrenMap[pId].push(cat._id);
      }
    });

    const resultIds = [rootCat._id];
    const queue = [rootCat._id.toString()];

    while (queue.length > 0) {
      const parentIdStr = queue.shift();
      const children = childrenMap[parentIdStr] || [];
      for (const childId of children) {
        resultIds.push(childId);
        queue.push(childId.toString());
      }
    }

    return resultIds;
  }

  /**
   * Create category
   */
  async createCategory(data) {
    if (data.parentId) {
      // Check parent exists
      const parent = await Category.findById(data.parentId);
      if (!parent) throw new Error('Parent category not found');
      // Set parent's isLeaf to false if needed
      if (parent.isLeaf) {
        await Category.findByIdAndUpdate(data.parentId, { isLeaf: false });
      }
    }
    const category = new Category(data);
    return await category.save();
  }

  /**
   * Update category
   */
  async updateCategory(id, data) {
    const category = await Category.findByIdAndUpdate(id, data, { new: true, runValidators: true });
    if (!category) throw new Error('Category not found');
    return category;
  }

  /**
   * Delete category
   */
  async deleteCategory(id) {
    const hasChildren = await Category.exists({ parentId: id });
    if (hasChildren) {
      throw new Error('Cannot delete category that has subcategories');
    }
    const category = await Category.findByIdAndDelete(id);
    if (!category) throw new Error('Category not found');
    return category;
  }

  /**
   * Build category breadcrumbs hierarchy for a given set of categoryIds or primary category
   */
  async getCategoryBreadcrumbs(categoryIds) {
    const CATEGORY_URL_MAP = {
      'thiet-ke-cong-trinh': '/thiet-ke-cong-trinh',
      'thiet-ke-kien-truc': '/thiet-ke-kien-truc',
      'tk-kt-nha-cap-4': '/thiet-ke-kien-truc/nha-cap-4',
      'tk-kt-nha-pho': '/thiet-ke-kien-truc/nha-pho',
      'tk-kt-biet-thu': '/thiet-ke-kien-truc/biet-thu',
      'tk-kt-villa': '/thiet-ke-kien-truc/villa',
      'thiet-ke-noi-that': '/thiet-ke-noi-that',
      'tk-nt-chung-cu': '/thiet-ke-noi-that/chung-cu',
      'tk-nt-nha-pho': '/thiet-ke-noi-that/nha-pho',
      'tk-nt-biet-thu': '/thiet-ke-noi-that/biet-thu',
      'tk-nt-van-phong': '/thiet-ke-noi-that/van-phong',
      'thi-cong-cong-trinh': '/thi-cong-cong-trinh'
    };

    const breadcrumbs = [{ label: 'Trang chủ', href: '/' }];

    if (!categoryIds || !categoryIds.length) {
      breadcrumbs.push({ label: 'Công trình', href: '/thiet-ke-cong-trinh' });
      return breadcrumbs;
    }

    const allCats = await Category.find().lean();
    const catMap = {};
    allCats.forEach(c => { catMap[c._id.toString()] = c; });

    let mainCat = categoryIds[0];
    let catObj = typeof mainCat === 'object' ? mainCat : catMap[mainCat ? mainCat.toString() : ''];

    if (catObj) {
      const path = [];
      let curr = catObj;
      while (curr) {
        path.unshift(curr);
        if (curr.parentId && catMap[curr.parentId.toString()]) {
          curr = catMap[curr.parentId.toString()];
        } else {
          curr = null;
        }
      }

      // Filter out root container 'thiet-ke-cong-trinh' if there are sub-categories to avoid redundant breadcrumbs
      const filteredPath = path.filter(c => c.code !== 'thiet-ke-cong-trinh' || path.length === 1);

      filteredPath.forEach(c => {
        const url = CATEGORY_URL_MAP[c.code] || `/${c.slug}`;
        breadcrumbs.push({ label: c.name, href: url });
      });
    } else {
      breadcrumbs.push({ label: 'Công trình', href: '/thiet-ke-cong-trinh' });
    }

    return breadcrumbs;
  }
}

module.exports = new CategoryService();
