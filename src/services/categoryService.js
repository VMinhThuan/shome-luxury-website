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
   * Get category ID and all descendant category IDs recursively.
   * Enables Descendant Category Filtering!
   */
  async getAllDescendantCategoryIds(idOrSlug) {
    const rootCat = await this.getCategoryByIdOrSlug(idOrSlug);
    if (!rootCat) return [];

    const resultIds = [rootCat._id];
    const queue = [rootCat._id];

    while (queue.length > 0) {
      const parentId = queue.shift();
      const children = await Category.find({ parentId }).select('_id').lean();
      for (const child of children) {
        resultIds.push(child._id);
        queue.push(child._id);
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
}

module.exports = new CategoryService();
