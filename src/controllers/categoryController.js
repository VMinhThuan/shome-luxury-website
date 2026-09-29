const categoryService = require('../services/categoryService');

class CategoryController {
  // GET /api/categories
  async getCategories(req, res, next) {
    try {
      const tree = await categoryService.getCategoryTree();
      return res.json({
        success: true,
        data: tree
      });
    } catch (err) {
      next(err);
    }
  }

  // GET /api/categories/:idOrSlug
  async getCategoryByIdOrSlug(req, res, next) {
    try {
      const category = await categoryService.getCategoryByIdOrSlug(req.params.idOrSlug);
      if (!category) {
        return res.status(404).json({
          success: false,
          message: 'Category not found'
        });
      }
      return res.json({
        success: true,
        data: category
      });
    } catch (err) {
      next(err);
    }
  }

  // POST /api/admin/categories
  async createCategory(req, res, next) {
    try {
      const category = await categoryService.createCategory(req.body);
      return res.status(201).json({
        success: true,
        message: 'Category created successfully',
        data: category
      });
    } catch (err) {
      next(err);
    }
  }

  // PUT /api/admin/categories/:id
  async updateCategory(req, res, next) {
    try {
      const category = await categoryService.updateCategory(req.params.id, req.body);
      return res.json({
        success: true,
        message: 'Category updated successfully',
        data: category
      });
    } catch (err) {
      next(err);
    }
  }

  // DELETE /api/admin/categories/:id
  async deleteCategory(req, res, next) {
    try {
      await categoryService.deleteCategory(req.params.id);
      return res.json({
        success: true,
        message: 'Category deleted successfully'
      });
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new CategoryController();
