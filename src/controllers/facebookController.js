const facebookService = require("../services/facebookService");

exports.getPosts = async (req, res) => {
  try {
    const result = await facebookService.getPosts();
    const response = {
      success: true,
      data: result.posts,
      meta: {
        count: result.posts.length,
        cachedAt: result.cachedAt,
        stale: Boolean(result.stale),
        source: result.source,
        page: result.page || {
          id: facebookService.getConfig().pageId,
          name: "Shome Luxury"
        }
      }
    };

    if (result.warning) response.warning = result.warning;
    return res.json(response);
  } catch (error) {
    return res.status(error.statusCode || 503).json({
      success: false,
      data: [],
      error: facebookService.serializeError(error),
      meta: {
        page: { id: facebookService.getConfig().pageId, name: "Shome Luxury" },
        cacheAvailable: false
      }
    });
  }
};
