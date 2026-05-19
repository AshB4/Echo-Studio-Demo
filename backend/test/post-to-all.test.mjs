import test from "node:test";
import assert from "node:assert/strict";
import {
  normalizeTargets,
  withAffiliateTag,
  normalizeProductLink,
  ensureProductLink,
  ensureAffiliateDisclosure,
  ensureAffiliateFooter,
  normalizeHashtags,
  isConfiguredValue,
  isThreadsConfigured,
  isAmazonAffiliatePost,
  shouldIncludeProductLinkForPlatform,
  shouldApplyAffiliateDisclosureForPlatform,
  shouldSkipTargetForAffiliatePost,
} from "../scripts/platforms/post-to-all.js";

test("normalizeTargets normalizes strings and object targets", () => {
  const result = normalizeTargets([
    "X",
    { platform: "Facebook", accountId: 12 },
    { name: "threads", id: "threads-main" },
  ]);

  assert.deepEqual(result, [
    { platform: "x", accountId: null },
    { platform: "facebook", accountId: "12" },
    { platform: "threads", accountId: "threads-main" },
  ]);
});

test("normalizeTargets preserves null account ids as null", () => {
  const result = normalizeTargets([
    { platform: "devto", accountId: null },
  ]);

  assert.deepEqual(result, [{ platform: "devto", accountId: null }]);
});

test("withAffiliateTag only tags plain Amazon links", () => {
  const result = withAffiliateTag(
    "Read this https://www.amazon.com/example-product and keep this https://example.com/test",
    "ashb4studio0b-20",
  );

  assert.match(result, /amazon\.com\/example-product\?tag=ashb4studio0b-20/);
  assert.match(result, /https:\/\/example\.com\/test/);
});

test("withAffiliateTag preserves vended Amazon links", () => {
  const source =
    "https://www.amazon.com/example-product?ref_=abc123&linkCode=ll1";
  const result = withAffiliateTag(source, "ashb4studio0b-20");
  assert.equal(result, source);
});

test("normalizeProductLink tags amazon product links", () => {
  const result = normalizeProductLink(
    {
      metadata: {
        productLinks: {
          primary: "https://www.amazon.com/example-product",
        },
      },
    },
    "ashb4studio0b-20",
  );

  assert.match(result, /amazon\.com\/example-product\?tag=ashb4studio0b-20/);
});

test("normalizeProductLink accepts legacy metadata productLink", () => {
  const result = normalizeProductLink({
    metadata: {
      productLink: "https://example.com/product",
    },
  });

  assert.equal(result, "https://example.com/product");
});

test("ensureProductLink appends missing product link", () => {
  const result = ensureProductLink("Helpful punch post", "https://example.com/product");
  assert.match(result, /Helpful punch post/);
  assert.match(result, /https:\/\/example\.com\/product/);
});

test("isAmazonAffiliatePost detects Amazon affiliate inventory", () => {
  assert.equal(
    isAmazonAffiliatePost({
      metadata: {
        productLinks: {
          primary: "https://www.amazon.com/example-product",
        },
      },
    }),
    true,
  );
  assert.equal(
    isAmazonAffiliatePost({
      metadata: {
        productLinks: {
          primary: "https://example.com/product",
        },
      },
    }),
    false,
  );
});

test("shouldIncludeProductLinkForPlatform forces affiliate links into Facebook copy", () => {
  const post = {
    metadata: {
      productLinks: {
        primary: "https://www.amazon.com/example-product",
      },
    },
  };
  assert.equal(shouldIncludeProductLinkForPlatform(post, "facebook"), true);
  assert.equal(shouldIncludeProductLinkForPlatform(post, "pinterest"), false);
});

test("ensureAffiliateDisclosure appends the required disclosure text", () => {
  const result = ensureAffiliateDisclosure("Useful backyard find");
  assert.match(result, /Useful backyard find/);
  assert.match(result, /I may earn a small commission if you buy via this link\./);
});

test("ensureAffiliateFooter places body first, affiliate link second, disclosure last", () => {
  const result = ensureAffiliateFooter(
    "Useful backyard find",
    "https://www.amazon.com/example-product?tag=ashb4studio0b-20",
  );
  const bodyIndex = result.indexOf("Useful backyard find");
  const linkIndex = result.indexOf("https://www.amazon.com/example-product?tag=ashb4studio0b-20");
  const disclosureIndex = result.indexOf("I may earn a small commission if you buy via this link.");
  assert.ok(disclosureIndex >= 0);
  assert.ok(linkIndex > bodyIndex);
  assert.ok(disclosureIndex > linkIndex);
});

test("shouldApplyAffiliateDisclosureForPlatform applies disclosure to Facebook Amazon affiliate posts", () => {
  const post = {
    metadata: {
      productLinks: {
        primary: "https://www.amazon.com/example-product",
      },
    },
  };
  assert.equal(shouldApplyAffiliateDisclosureForPlatform(post, "facebook"), true);
  assert.equal(shouldApplyAffiliateDisclosureForPlatform(post, "pinterest"), true);
});

test("shouldSkipTargetForAffiliatePost blocks Amazon affiliate pins by default", () => {
  const post = {
    metadata: {
      productLinks: {
        primary: "https://www.amazon.com/example-product",
      },
    },
  };
  assert.equal(shouldSkipTargetForAffiliatePost(post, "pinterest"), true);
  assert.equal(shouldSkipTargetForAffiliatePost(post, "facebook"), false);
});

test("normalizeHashtags normalizes arrays and strings", () => {
  assert.deepEqual(normalizeHashtags("#one two,three"), ["#one", "#two", "#three"]);
  assert.deepEqual(normalizeHashtags(["one", "#two"]), ["#one", "#two"]);
});

test("isConfiguredValue rejects placeholders", () => {
  assert.equal(isConfiguredValue("TODO_TOKEN"), false);
  assert.equal(isConfiguredValue("replace-me"), false);
  assert.equal(isConfiguredValue("real-token"), true);
});

test("isThreadsConfigured requires token and account id", () => {
  assert.equal(
    isThreadsConfigured({
      credentials: { accessToken: "token" },
      metadata: { accountId: "acct" },
    }),
    true,
  );
  assert.equal(
    isThreadsConfigured({
      credentials: { accessToken: "" },
      metadata: { accountId: "acct" },
    }),
    false,
  );
});
