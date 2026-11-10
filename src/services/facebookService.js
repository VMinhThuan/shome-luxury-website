const DEFAULT_PAGE_ID = "1266727566524961";
const DEFAULT_GRAPH_API_VERSION = "v21.0";
const DEFAULT_CACHE_TTL_MS = 15 * 60 * 1000;
const MAX_POSTS = 5;

const cache = {
  posts: null,
  page: null,
  cachedAt: 0,
  expiresAt: 0,
  inFlight: null
};

class FacebookServiceError extends Error {
  constructor(code, message, options = {}) {
    super(message);
    this.name = "FacebookServiceError";
    this.code = code;
    this.statusCode = options.statusCode || 503;
    this.graphCode = options.graphCode || null;
    this.graphType = options.graphType || null;
    this.graphSubcode = options.graphSubcode || null;
    this.endpoint = options.endpoint || null;
  }
}

function getConfig() {
  return {
    pageId: String(process.env.FACEBOOK_PAGE_ID || DEFAULT_PAGE_ID).trim(),
    accessToken: String(
      process.env.FACEBOOK_PAGE_ACCESS_TOKEN ||
      process.env.META_PAGE_ACCESS_TOKEN ||
      ""
    ).trim(),
    graphApiVersion: String(
      process.env.FACEBOOK_GRAPH_API_VERSION || DEFAULT_GRAPH_API_VERSION
    ).trim(),
    cacheTtlMs: Number(process.env.FACEBOOK_CACHE_TTL_MS) > 0
      ? Number(process.env.FACEBOOK_CACHE_TTL_MS)
      : DEFAULT_CACHE_TTL_MS
  };
}

function getGraphErrorMessage(error, endpoint) {
  const graphCode = Number(error?.code);
  const graphMessage = String(error?.message || "");

  if (graphCode === 190) {
    return "Meta từ chối token: Page Access Token có thể đã hết hạn, bị thu hồi hoặc không hợp lệ.";
  }

  if (graphCode === 10 || graphCode === 200 || graphCode === 283) {
    return "Page Access Token chưa có quyền đọc bài đăng của Fanpage (cần quyền đọc tương tác/nội dung Page và cấu hình ứng dụng Meta phù hợp).";
  }

  if (graphCode === 100) {
    if (/pages_read_engagement|Page Public Content Access|Page Public Metadata Access/i.test(graphMessage)) {
      return "Page Access Token chưa có quyền pages_read_engagement hoặc ứng dụng chưa được bật Page Public Content Access/Page Public Metadata Access để đọc bài đăng.";
    }
    return `Meta không tìm thấy Page ID hoặc endpoint không hợp lệ cho phiên bản API hiện tại (${endpoint}).`;
  }

  return error?.message || `Meta Graph API trả về lỗi tại ${endpoint}.`;
}

async function requestGraph(path, config, params = {}) {
  const endpoint = `/${path}`;
  const search = new URLSearchParams({
    ...params,
    access_token: config.accessToken
  });
  const url = `https://graph.facebook.com/${config.graphApiVersion}${endpoint}?${search.toString()}`;

  let response;
  let payload;
  try {
    response = await fetch(url, {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(10000)
    });
    payload = await response.json();
  } catch (error) {
    throw new FacebookServiceError(
      "GRAPH_API_UNREACHABLE",
      "Không thể kết nối tới Meta Graph API để lấy bài đăng Fanpage.",
      { statusCode: 503, endpoint }
    );
  }

  if (!response.ok || payload?.error) {
    const graphError = payload?.error || {};
    throw new FacebookServiceError(
      "GRAPH_API_ERROR",
      getGraphErrorMessage(graphError, endpoint),
      {
        statusCode: 502,
        graphCode: graphError.code,
        graphType: graphError.type,
        graphSubcode: graphError.error_subcode,
        endpoint
      }
    );
  }

  return payload;
}

function getMediaFromAttachment(attachment) {
  const media = attachment?.media || {};
  const image = media.image || {};
  const mediaType = String(
    attachment?.media_type || attachment?.type || media?.type || ""
  ).toLowerCase();

  return {
    type: mediaType || null,
    thumbnailUrl: image.src || image.url || null,
    sourceUrl: media.source || attachment?.url || null
  };
}

function getFirstAttachment(post) {
  const attachments = Array.isArray(post?.attachments?.data)
    ? post.attachments.data
    : [];
  const attachment = attachments.find(item => {
    const media = getMediaFromAttachment(item);
    return media.thumbnailUrl || media.sourceUrl;
  }) || attachments[0];

  if (!attachment && !post?.full_picture) return null;

  const media = getMediaFromAttachment(attachment || {});
  return {
    type: media.type,
    thumbnailUrl: media.thumbnailUrl || post.full_picture || null,
    sourceUrl: media.sourceUrl || post.permalink_url || null
  };
}

function normalizePost(post) {
  return {
    id: String(post.id),
    message: String(post.message || post.story || "").trim(),
    createdTime: post.created_time || null,
    permalinkUrl: post.permalink_url || null,
    media: getFirstAttachment(post)
  };
}

function normalizeFollowersCount(value) {
  if (value === null || value === undefined || value === "") return null;
  const count = Number(value);
  return Number.isFinite(count) && count >= 0 ? count : null;
}

async function fetchFreshPosts(config) {
  // User tokens expose an owner through /me. Page tokens may not expose the
  // /me object in the same way, so a Graph error 100 here is allowed and the
  // Page-specific request below becomes the authoritative validation.
  try {
    const tokenOwner = await requestGraph("me", config, { fields: "id,name" });
    if (String(tokenOwner.id) !== config.pageId) {
      throw new FacebookServiceError(
        "NOT_PAGE_ACCESS_TOKEN",
        `Token hiện tại thuộc về đối tượng ${tokenOwner.name || tokenOwner.id || "không xác định"}, không phải Page ID ${config.pageId}. Hãy cấp đúng Page Access Token cho Fanpage Shome Luxury.`,
        { statusCode: 502, endpoint: "/me" }
      );
    }
  } catch (error) {
    if (!(error.code === "GRAPH_API_ERROR" && Number(error.graphCode) === 100)) {
      throw error;
    }
  }

  const page = await requestGraph(config.pageId, config, { fields: "id,name" });
  if (String(page.id) !== config.pageId) {
    throw new FacebookServiceError(
      "PAGE_ID_MISMATCH",
      `Meta trả về Page ID ${page.id || "không xác định"}, không khớp Page ID cấu hình ${config.pageId}.`,
      { statusCode: 502, endpoint: `/${config.pageId}` }
    );
  }

  // Keep this metric optional so the feed still works when Meta withholds it
  // because the app/token does not have the required Page access.
  let followersCount = null;
  try {
    const pageMetrics = await requestGraph(config.pageId, config, {
      fields: "followers_count"
    });
    followersCount = normalizeFollowersCount(pageMetrics.followers_count);
  } catch (error) {
    // The Page identity and published posts remain available without it.
  }

  const result = await requestGraph(`${config.pageId}/published_posts`, config, {
    limit: String(MAX_POSTS),
    fields: "id,message,created_time,permalink_url,full_picture,attachments{media_type,media,url}"
  });

  const posts = Array.isArray(result.data)
    ? result.data.map(normalizePost).filter(post => post.permalinkUrl || post.message)
    : [];

  return {
    posts: posts.slice(0, MAX_POSTS),
    page: {
      id: String(page.id),
      name: page.name || "Shome Luxury",
      followersCount
    }
  };
}

async function getPosts() {
  const config = getConfig();
  const now = Date.now();

  if (cache.posts && cache.expiresAt > now) {
    return {
      configured: true,
      posts: cache.posts,
      page: cache.page,
      cachedAt: cache.cachedAt,
      stale: false,
      source: "cache"
    };
  }

  if (!config.accessToken) {
    if (cache.posts) {
      return {
        configured: false,
        posts: cache.posts,
        page: cache.page,
        cachedAt: cache.cachedAt,
        stale: true,
        source: "cache",
        warning: "FACEBOOK_PAGE_ACCESS_TOKEN chưa được cấu hình; đang hiển thị cache gần nhất."
      };
    }
    throw new FacebookServiceError(
      "MISSING_PAGE_ACCESS_TOKEN",
      "Thiếu FACEBOOK_PAGE_ACCESS_TOKEN trong biến môi trường backend; chưa thể gọi Meta Graph API.",
      { statusCode: 503 }
    );
  }

  if (cache.inFlight) return cache.inFlight;

  cache.inFlight = fetchFreshPosts(config)
    .then(result => {
      cache.posts = result.posts;
      cache.page = result.page || null;
      cache.cachedAt = Date.now();
      cache.expiresAt = cache.cachedAt + config.cacheTtlMs;
      return {
        configured: true,
        posts: result.posts,
        page: cache.page,
        cachedAt: cache.cachedAt,
        stale: false,
        source: "graph-api"
      };
    })
    .catch(error => {
      if (cache.posts) {
        return {
          configured: true,
          posts: cache.posts,
          page: cache.page,
          cachedAt: cache.cachedAt,
          stale: true,
          source: "cache",
          warning: error.message,
          error
        };
      }
      throw error;
    })
    .finally(() => {
      cache.inFlight = null;
    });

  return cache.inFlight;
}

function serializeError(error) {
  return {
    code: error.code || "FACEBOOK_FEED_ERROR",
    message: error.message || "Không thể lấy dữ liệu Facebook.",
    endpoint: error.endpoint || null,
    graphCode: error.graphCode || null,
    graphType: error.graphType || null,
    graphSubcode: error.graphSubcode || null
  };
}

module.exports = {
  getPosts,
  serializeError,
  getConfig
};
