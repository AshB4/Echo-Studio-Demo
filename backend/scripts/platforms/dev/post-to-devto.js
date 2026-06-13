import axios from 'axios';

const DEFAULT_PUBLIC_ASSET_BASE_URL =
  'https://raw.githubusercontent.com/AshB4/N8tiveFlow/main';
const DEVTO_API_ACCEPT = 'application/vnd.forem.api-v1+json';

export function publicImageUrl(value) {
  const url = String(value || '').trim();
  return /^https?:\/\//i.test(url) ? url : undefined;
}

export function publicAssetUrl(value) {
  const mediaPath = String(value || '').trim().replace(/^\/+/, '');
  if (!mediaPath) return undefined;
  if (/^https?:\/\//i.test(mediaPath)) return mediaPath;

  const assetBaseUrl = String(
    process.env.DEVTO_PUBLIC_ASSET_BASE_URL ||
      process.env.PUBLIC_ASSET_BASE_URL ||
      DEFAULT_PUBLIC_ASSET_BASE_URL,
  ).replace(/\/+$/, '');

  return encodeURI(`${assetBaseUrl}/${mediaPath}`);
}

export function normalizeDevtoTags(tags = []) {
  return tags
    .map((tag) => String(tag || '').trim().replace(/^#+/, ''))
    .map((tag) => tag.replace(/[^a-zA-Z0-9]/g, ''))
    .filter(Boolean)
    .slice(0, 4);
}

async function postToDevto(post, context = {}) {
  const account = context?.account || context;
  const apiKey = account?.credentials?.apiKey || process.env.DEVTO_API_KEY;
  if (!apiKey) {
    throw new Error('Dev.to API key not configured');
  }

  const url = 'https://dev.to/api/articles';
  const article = {
    title: post.title,
    body_markdown: post.body,
    published: true,
    tags: normalizeDevtoTags(post.hashtags || post.tags || []),
  };
  if (post.canonicalUrl) {
    article.canonical_url = post.canonicalUrl;
  }
  const coverImage = publicImageUrl(post.image) || publicAssetUrl(post.mediaPath);
  if (coverImage) {
    article.cover_image = coverImage;
  }
  const payload = {
    article,
  };

  const headers = {
    'Api-Key': apiKey,
    accept: DEVTO_API_ACCEPT,
    'Content-Type': 'application/json',
  };

  try {
    const response = await axios.post(url, payload, { headers });
    return { success: true, articleId: response.data.id, url: response.data.url };
  } catch (error) {
    const detail = error.response?.data || error.message;
    console.error('Dev.to posting error:', detail);
    throw new Error(`Failed to post to Dev.to: ${JSON.stringify(detail)}`);
  }
}

export default postToDevto;
