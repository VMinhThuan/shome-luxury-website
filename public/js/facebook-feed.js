(function () {
  function formatDate(value) {
    if (!value) return "";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "";
    return new Intl.DateTimeFormat("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    }).format(date);
  }

  function createText(tagName, className, text) {
    const node = document.createElement(tagName);
    if (className) node.className = className;
    node.textContent = text || "";
    return node;
  }

  function renderPost(post) {
    const article = document.createElement("article");
    article.className = "facebook-feed-post";
    article.setAttribute("role", "article");

    const meta = document.createElement("div");
    meta.className = "facebook-feed-post-meta";
    meta.appendChild(createText("strong", "facebook-feed-post-author", "Shome Luxury"));
    meta.appendChild(createText("time", "facebook-feed-post-date", formatDate(post.createdTime)));
    article.appendChild(meta);

    if (post.message) {
      article.appendChild(createText("p", "facebook-feed-post-message", post.message));
    }

    const media = post.media;
    if (media && media.thumbnailUrl) {
      const mediaLink = document.createElement("a");
      mediaLink.className = "facebook-feed-post-media";
      mediaLink.href = post.permalinkUrl || media.sourceUrl || "#";
      mediaLink.target = "_blank";
      mediaLink.rel = "noopener noreferrer";
      const image = document.createElement("img");
      image.src = media.thumbnailUrl;
      image.alt = "Hình ảnh từ bài đăng Shome Luxury";
      image.loading = "lazy";
      image.decoding = "async";
      mediaLink.appendChild(image);
      if (String(media.type || "").includes("video")) {
        mediaLink.appendChild(createText("span", "facebook-feed-post-play", "▶ Video"));
      }
      article.appendChild(mediaLink);
    }

    if (post.permalinkUrl) {
      const sourceLink = document.createElement("a");
      sourceLink.className = "facebook-feed-post-link";
      sourceLink.href = post.permalinkUrl;
      sourceLink.target = "_blank";
      sourceLink.rel = "noopener noreferrer";
      sourceLink.textContent = "Xem bài gốc →";
      article.appendChild(sourceLink);
    }

    return article;
  }

  async function loadFeed(card) {
    const status = card.querySelector("[data-facebook-feed-status]");
    const postsContainer = card.querySelector("[data-facebook-feed-posts]");
    if (!status || !postsContainer) return;

    try {
      const response = await fetch("/api/facebook/posts", {
        headers: { Accept: "application/json" },
        credentials: "same-origin"
      });
      const payload = await response.json();

      if (!response.ok || !payload.success) {
        throw new Error(payload?.error?.message || "Không thể tải bài đăng Facebook.");
      }

      postsContainer.replaceChildren();
      if (Array.isArray(payload.data) && payload.data.length) {
        payload.data.forEach(post => postsContainer.appendChild(renderPost(post)));
        status.textContent = payload.meta?.stale
          ? "Đang hiển thị bản lưu gần nhất."
          : "Bài đăng mới nhất từ Fanpage";
        card.classList.toggle("has-stale-facebook-feed", Boolean(payload.meta?.stale));
      } else {
        status.textContent = "Fanpage chưa có bài đăng có thể hiển thị.";
        postsContainer.appendChild(createText("p", "facebook-feed-placeholder", "Chưa có dữ liệu bài đăng."));
      }
    } catch (error) {
      console.warn("Facebook feed unavailable:", error.message);
      status.textContent = "Chưa thể tải bài đăng Facebook.";
      postsContainer.replaceChildren();
      postsContainer.appendChild(createText("p", "facebook-feed-placeholder", "Bạn vẫn có thể xem Fanpage và các bài đăng mới nhất trên Facebook."));
      card.classList.add("facebook-feed-unavailable");
    }
  }

  function init() {
    document.querySelectorAll("[data-facebook-feed-card]").forEach(loadFeed);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }
})();
