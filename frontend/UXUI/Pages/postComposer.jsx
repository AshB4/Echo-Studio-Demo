/** @format */

import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useToast } from "@/Components/ui/use-toast";
import usePostComposerState from "../Components/PostComposer/usePostComposerState";
import AppTopNav from "../Components/AppTopNav";
import PlatformSelector from "../Global/PostComposer/PlatformSelector";
import ImageUploader from "../Global/PostComposer/ImageUploader";
import CustomPlatformText from "../Global/PostComposer/CustomPlatformText";
import SeoProductSelector from "../Global/PostComposer/SeoProductSelector";
import { getPlatformProfile } from "../utils/platformProfiles";

const API_BASE = import.meta.env?.VITE_API_BASE || "http://localhost:3001";
const DEFAULT_ROTATION_SETTINGS = {
  cadenceDays: 1,
  defaultTime: "10:00",
};

function addDaysToDateOnly(dateValue, daysToAdd) {
  if (!dateValue) return "";
  const [year, month, day] = dateValue.split("-").map(Number);
  const next = new Date(year, month - 1, day + daysToAdd, 12, 0, 0, 0);
  return next.toISOString().slice(0, 10);
}

export default function PostComposer() {
  const location = useLocation();
  const navigate = useNavigate();
  const incomingDraft = location.state?.draft || null;
  const { toast } = useToast();

  const {
    title,
    setTitle,
    body,
    setBody,
    image,
    setImage,
    mediaPath,
    setMediaPath,
    mediaType,
    setMediaType,
    altText,
    setAltText,
    selectedTargets,
    selectedPlatforms,
    toggleTarget,
    contentTags,
    setContentTags,
    distributionTags,
    setDistributionTags,
    scheduledAt,
    setScheduledAt,
    saveAsDraft,
    setSaveAsDraft,
    approveForSchedule,
    setApproveForSchedule,
    selectedProduct,
    setSelectedProduct,
    postIntent,
    setPostIntent,
    campaignPhase,
    setCampaignPhase,
    campaignAngle,
    setCampaignAngle,
    headline,
    setHeadline,
    headlineVariants,
    setHeadlineVariants,
    primaryEmotion,
    setPrimaryEmotion,
    secondaryEmotion,
    setSecondaryEmotion,
    curiosityType,
    setCuriosityType,
    specificitySignals,
    setSpecificitySignals,
    authoritySignals,
    setAuthoritySignals,
    trustSignals,
    setTrustSignals,
    patternInterruptType,
    setPatternInterruptType,
    hookType,
    setHookType,
    contentIntent,
    setContentIntent,
    searchIntent,
    setSearchIntent,
    saveIntent,
    setSaveIntent,
    shareIntent,
    setShareIntent,
    thumbnailConcept,
    setThumbnailConcept,
    firstLine,
    setFirstLine,
    platformOptimizations,
    setPlatformOptimizations,
    ctrScore,
    setCtrScore,
    clarityScore,
    setClarityScore,
    trustScore,
    setTrustScore,
    curiosityScore,
    setCuriosityScore,
    saveScore,
    setSaveScore,
    shareScore,
    setShareScore,
    intentPrimary,
    setIntentPrimary,
    intentSecondary,
    setIntentSecondary,
    awarenessStage,
    setAwarenessStage,
    painProximity,
    setPainProximity,
    commercialityScore,
    setCommercialityScore,
    emotionTags,
    setEmotionTags,
    identityTags,
    setIdentityTags,
    queryChainDepth,
    setQueryChainDepth,
    evergreenScore,
    setEvergreenScore,
    jtbd,
    setJtbd,
    pinAngle,
    setPinAngle,
    visualHook,
    setVisualHook,
    redditSubreddit,
    setRedditSubreddit,
    redditCommunityReason,
    setRedditCommunityReason,
    redditPostType,
    setRedditPostType,
    redditLinkMode,
    setRedditLinkMode,
    selectedProductProfile,
    useAutoHashtags,
    setUseAutoHashtags,
    manualHashtags,
    setManualHashtags,
    useAutoPlatformText,
    setUseAutoPlatformText,
    customText,
    setCustomText,
    autoAffiliateAmazon,
    setAutoAffiliateAmazon,
    includeProductLink,
    setIncludeProductLink,
    imageStatus,
    setImageStatus,
    imageConcept,
    setImageConcept,
    imagePrompt,
    setImagePrompt,
    aiProductName,
    setAiProductName,
    aiProductType,
    setAiProductType,
    aiAudience,
    setAiAudience,
    aiProvider,
    setAiProvider,
    aiSuggestions,
    isGeneratingSeo,
    generateSeoSuggestions,
    handleSubmit,
    seoVault,
    productProfiles,
    availablePlatforms,
    isEditing,
  } = usePostComposerState(incomingDraft);

  const [statusMessage, setStatusMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isAutoScheduling, setIsAutoScheduling] = useState(false);
  const [accountsByPlatform, setAccountsByPlatform] = useState({});
  const [accountsError, setAccountsError] = useState("");
  const [platformHealth, setPlatformHealth] = useState([]);
  const [platformHealthError, setPlatformHealthError] = useState("");
  const hasAiContext = Boolean(
    selectedProduct ||
    aiProductName?.trim() ||
    title?.trim()
  );
  const displayedAiTitle = aiSuggestions?.headline || aiSuggestions?.product_name || aiProductName || title || "";
  const displayedAiBody = aiSuggestions?.meta_description || "";
  const displayedAiAltText = aiSuggestions?.alt_text_examples?.[0] || "";
  const displayedAiHashtags = Array.isArray(aiSuggestions?.keywords)
    ? aiSuggestions.keywords.map((keyword) => `#${String(keyword).replace(/\s+/g, "")}`).join(" ")
    : "";
  const displayedAiIntent = aiSuggestions?.post_intent || postIntent || "";
  const displayedCampaignPhase = aiSuggestions?.campaign_phase || campaignPhase || "";
  const displayedCampaignAngle = aiSuggestions?.campaign_angle || campaignAngle || "";
  const displayedVisualHook = aiSuggestions?.visual_hook || visualHook || "";
  const displayedCtrHeadline = aiSuggestions?.headline || headline || displayedAiTitle;
  const displayedCtrScore = aiSuggestions?.ctr_score ?? ctrScore ?? "";
  const displayedTrustScore = aiSuggestions?.trust_score ?? trustScore ?? "";
  const displayedClarityScore = aiSuggestions?.clarity_score ?? clarityScore ?? "";
  const displayedAiImageConcept = aiSuggestions?.image_concept || "";
  const displayedAiImagePrompt = aiSuggestions?.image_prompt || "";
  const displayedAiHook = aiSuggestions?.hook_options?.[0] || "";

  useEffect(() => {
    let ignore = false;
    async function loadAccounts() {
      try {
        const res = await fetch(`${API_BASE}/api/accounts`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        if (ignore) return;
        const grouped = data.reduce((acc, account) => {
          const platform = String(account.platform || "").toLowerCase();
          if (!platform) return acc;
          if (!acc[platform]) acc[platform] = [];
          acc[platform].push({
            id: account.id,
            label: account.label,
            metadata: account.metadata || {},
          });
          return acc;
        }, {});
        setAccountsByPlatform(grouped);
      } catch (error) {
        console.error("Failed to load accounts", error);
        if (!ignore) setAccountsError("Could not load linked accounts.");
      }
    }
    loadAccounts();
    return () => {
      ignore = true;
    };
  }, []);

  useEffect(() => {
    let ignore = false;
    async function loadPlatformHealth() {
      try {
        const res = await fetch(`${API_BASE}/api/platform-health`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        if (!ignore) {
          setPlatformHealth(Array.isArray(data.results) ? data.results : []);
        }
      } catch (error) {
        console.error("Failed to load platform health", error);
        if (!ignore) {
          setPlatformHealthError("Could not load live platform health.");
        }
      }
    }
    loadPlatformHealth();
    return () => {
      ignore = true;
    };
  }, []);

  const submitLabel = saveAsDraft
    ? isEditing
      ? "Update Draft"
      : "Save Draft"
    : approveForSchedule
    ? isEditing
      ? "Update + Approve"
      : "Save + Approve"
    : isEditing
    ? "Update Queue Entry"
    : "Save to Queue";

  const onSubmit = async () => {
    setIsSubmitting(true);
    setStatusMessage(isEditing ? "Saving queue changes..." : "Saving to queue...");
    try {
      const result = await handleSubmit();
      if (result.mode === "update") {
        setStatusMessage(
          result.data?.status === "approved"
            ? "Queue entry updated and approved for scheduling."
            : "Draft updated in the queue."
        );
      } else {
        setStatusMessage(
          result.data?.status === "approved"
            ? "Saved and approved. The worker can publish it on schedule."
            : "Saved to the queue as a draft."
        );
      }
    } catch (error) {
      console.error(error);
      setStatusMessage(error.message || "Something glitched during submit.");
      if (error?.violations?.length) {
        toast({
          title: "Content needs a trim",
          description: error.violations[0].message,
        });
      } else {
        toast({
          title: "Submit failed",
          description: error.message || "Unexpected error while posting.",
        });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const onApproveAndScheduleNextOpenDay = async () => {
    setIsAutoScheduling(true);
    setStatusMessage("Finding the next open day and scheduling this post...");
    try {
      const [settingsRes, postsRes] = await Promise.all([
        fetch(`${API_BASE}/api/settings/rotation`),
        fetch(`${API_BASE}/api/posts`),
      ]);

      const settingsData = settingsRes.ok ? await settingsRes.json() : {};
      const postsData = postsRes.ok ? await postsRes.json() : [];
      const rotationSettings = {
        ...DEFAULT_ROTATION_SETTINGS,
        ...(settingsData || {}),
      };
      const cadence = Math.max(1, Number(rotationSettings.cadenceDays || 1));
      const defaultTime = String(rotationSettings.defaultTime || "10:00");
      const latestScheduledAt =
        [...(Array.isArray(postsData) ? postsData : [])]
          .map((post) => post.scheduledAt || post.scheduled_at)
          .filter(Boolean)
          .sort()
          .at(-1) || null;

      let nextScheduledAt;
      if (latestScheduledAt) {
        const latest = new Date(latestScheduledAt);
        const nextDate = addDaysToDateOnly(latest.toISOString().slice(0, 10), cadence);
        nextScheduledAt = new Date(`${nextDate}T${defaultTime}:00`);
      } else {
        const now = new Date();
        const today = now.toISOString().slice(0, 10);
        const candidate = new Date(`${today}T${defaultTime}:00`);
        nextScheduledAt =
          candidate.getTime() > now.getTime()
            ? candidate
            : new Date(`${addDaysToDateOnly(today, cadence)}T${defaultTime}:00`);
      }

      const result = await handleSubmit({
        status: "approved",
        scheduledAt: nextScheduledAt.toISOString(),
      });
      setSaveAsDraft(false);
      setApproveForSchedule(true);
      setScheduledAt(nextScheduledAt.toISOString().slice(0, 16));
      setStatusMessage(
        `Scheduled for ${nextScheduledAt.toLocaleString()}. Added to the calendar-ready queue.`,
      );
      toast({
        title: "Scheduled, darling",
        description:
          result?.data?.title
            ? `${result.data.title} is set for ${nextScheduledAt.toLocaleString()}.`
            : `Post scheduled for ${nextScheduledAt.toLocaleString()}.`,
      });
    } catch (error) {
      console.error(error);
      setStatusMessage(error.message || "Could not auto-schedule this post.");
      toast({
        title: "Auto schedule failed",
        description: error.message || "Unexpected error while scheduling the next open day.",
        variant: "destructive",
      });
    } finally {
      setIsAutoScheduling(false);
    }
  };

  const onGenerateSeo = async (dryRun = false) => {
    setStatusMessage(dryRun ? "Previewing AI prompt..." : "Generating SEO suggestions...");
    try {
      const result = await generateSeoSuggestions({ dryRun });
      if (result.mode === "dry-run") {
        setStatusMessage("Dry-run complete. Prompt preview loaded below.");
      } else {
        setStatusMessage("SEO suggestions generated and applied to the form.");
      }
    } catch (error) {
      setStatusMessage(error.message || "SEO generation failed.");
      toast({
        title: "SEO generation failed",
        description: error.message || "Unexpected error while generating suggestions.",
        variant: "destructive",
      });
    }
  };

  const applyAiTitle = () => {
    if (displayedAiTitle) {
      setTitle(displayedAiTitle);
      setHeadline(displayedAiTitle);
    }
  };

  const applyAiBody = () => {
    const nextBody = displayedAiBody || displayedAiHook;
    if (nextBody) setBody(nextBody);
  };

  const applyAiHashtags = () => {
    if (!displayedAiHashtags) return;
    setUseAutoHashtags(false);
    setManualHashtags(displayedAiHashtags);
  };

  const applyAiAltText = () => {
    if (displayedAiAltText) setAltText(displayedAiAltText);
  };

  const applyAiImagePlan = () => {
    if (displayedAiImageConcept) setImageConcept(displayedAiImageConcept);
    if (displayedAiImagePrompt) setImagePrompt(displayedAiImagePrompt);
  };

  const applyAllAi = () => {
    applyAiTitle();
    applyAiBody();
    applyAiHashtags();
    applyAiAltText();
    applyAiImagePlan();
    if (aiSuggestions?.headline) setHeadline(aiSuggestions.headline);
    if (Array.isArray(aiSuggestions?.headline_variants)) {
      setHeadlineVariants(aiSuggestions.headline_variants.join(", "));
    }
    if (aiSuggestions?.primary_emotion) setPrimaryEmotion(aiSuggestions.primary_emotion);
    if (aiSuggestions?.secondary_emotion) setSecondaryEmotion(aiSuggestions.secondary_emotion);
    if (aiSuggestions?.curiosity_type) setCuriosityType(aiSuggestions.curiosity_type);
    if (aiSuggestions?.specificity_signals) {
      setSpecificitySignals(JSON.stringify(aiSuggestions.specificity_signals, null, 2));
    }
    if (Array.isArray(aiSuggestions?.authority_signals)) {
      setAuthoritySignals(aiSuggestions.authority_signals.join(", "));
    }
    if (Array.isArray(aiSuggestions?.trust_signals)) {
      setTrustSignals(aiSuggestions.trust_signals.join(", "));
    }
    if (aiSuggestions?.pattern_interrupt_type) setPatternInterruptType(aiSuggestions.pattern_interrupt_type);
    if (aiSuggestions?.hook_type) setHookType(aiSuggestions.hook_type);
    if (aiSuggestions?.content_intent) setContentIntent(aiSuggestions.content_intent);
    if (aiSuggestions?.search_intent) setSearchIntent(aiSuggestions.search_intent);
    if (aiSuggestions?.save_intent) setSaveIntent(aiSuggestions.save_intent);
    if (aiSuggestions?.share_intent) setShareIntent(aiSuggestions.share_intent);
    if (aiSuggestions?.thumbnail_concept) setThumbnailConcept(aiSuggestions.thumbnail_concept);
    if (aiSuggestions?.first_line) setFirstLine(aiSuggestions.first_line);
    if (aiSuggestions?.platform_optimizations) {
      setPlatformOptimizations(JSON.stringify(aiSuggestions.platform_optimizations, null, 2));
    }
    if (aiSuggestions?.ctr_score !== undefined && aiSuggestions?.ctr_score !== null) {
      setCtrScore(aiSuggestions.ctr_score);
    }
    if (aiSuggestions?.clarity_score !== undefined && aiSuggestions?.clarity_score !== null) {
      setClarityScore(aiSuggestions.clarity_score);
    }
    if (aiSuggestions?.trust_score !== undefined && aiSuggestions?.trust_score !== null) {
      setTrustScore(aiSuggestions.trust_score);
    }
    if (aiSuggestions?.curiosity_score !== undefined && aiSuggestions?.curiosity_score !== null) {
      setCuriosityScore(aiSuggestions.curiosity_score);
    }
    if (aiSuggestions?.save_score !== undefined && aiSuggestions?.save_score !== null) {
      setSaveScore(aiSuggestions.save_score);
    }
    if (aiSuggestions?.share_score !== undefined && aiSuggestions?.share_score !== null) {
      setShareScore(aiSuggestions.share_score);
    }
    if (displayedAiIntent) setPostIntent(displayedAiIntent);
    if (displayedCampaignPhase) setCampaignPhase(displayedCampaignPhase);
    if (displayedCampaignAngle) setCampaignAngle(displayedCampaignAngle);
    if (displayedVisualHook) setVisualHook(displayedVisualHook);
    if (aiSuggestions?.intent_primary) setIntentPrimary(aiSuggestions.intent_primary);
    if (aiSuggestions?.intent_secondary) setIntentSecondary(aiSuggestions.intent_secondary);
    if (aiSuggestions?.awareness_stage) setAwarenessStage(aiSuggestions.awareness_stage);
    if (aiSuggestions?.pin_angle) setPinAngle(aiSuggestions.pin_angle);
    if (aiSuggestions?.jtbd) setJtbd(aiSuggestions.jtbd);
    if (aiSuggestions?.pain_proximity !== undefined && aiSuggestions?.pain_proximity !== null) {
      setPainProximity(aiSuggestions.pain_proximity);
    }
    if (
      aiSuggestions?.commerciality_score !== undefined &&
      aiSuggestions?.commerciality_score !== null
    ) {
      setCommercialityScore(aiSuggestions.commerciality_score);
    }
    if (Array.isArray(aiSuggestions?.emotion_tags)) {
      setEmotionTags(aiSuggestions.emotion_tags.join(", "));
    }
    if (Array.isArray(aiSuggestions?.identity_tags)) {
      setIdentityTags(aiSuggestions.identity_tags.join(", "));
    }
    if (aiSuggestions?.query_chain_depth !== undefined && aiSuggestions?.query_chain_depth !== null) {
      setQueryChainDepth(aiSuggestions.query_chain_depth);
    }
    if (aiSuggestions?.evergreen_score !== undefined && aiSuggestions?.evergreen_score !== null) {
      setEvergreenScore(aiSuggestions.evergreen_score);
    }
  };

  const handleHealthIssue = (health) => {
    toast({
      title: `${health.label || health.platform} unavailable`,
      description: `${health.summary}${health.errorCode ? ` · code ${health.errorCode}` : ""}${health.errorSubcode ? `/${health.errorSubcode}` : ""} — ${health.detail}`,
      variant: "destructive",
    });
  };

  const activeProfiles = selectedPlatforms
    .map((platform) => getPlatformProfile(platform))
    .filter(Boolean);
  const redditSelected = selectedPlatforms.includes("reddit");

  return (
    <div className="p-4 max-w-4xl mx-auto">
      <AppTopNav />
      <div className="flex items-center justify-between gap-4 mb-6">
        <h1 className="text-2xl font-bold">Post Composer</h1>
        <div className="flex gap-3">
          <Link
            to="/"
            className="px-3 py-2 border border-pink-500 text-pink-400 rounded hover:bg-pink-500 hover:text-black transition-colors"
          >
            ⬅ Home
          </Link>
          {/* <Link
            to="/lab"
            className="px-3 py-2 border border-teal-500 text-teal-300 rounded hover:bg-teal-500 hover:text-black transition-colors"
          >
            ⚗️ Lab
          </Link> */}
        </div>
      </div>

      <SeoProductSelector
        selectedProduct={selectedProduct}
        setSelectedProduct={setSelectedProduct}
        productProfiles={productProfiles}
      />

      {selectedProductProfile && (
        <section className="mb-6 rounded border border-amber-600 bg-black/60 p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-amber-400">
                Product Profile
              </p>
              <h2 className="text-xl text-pink-300 mt-1">{selectedProductProfile.label}</h2>
            </div>
            <span className="rounded-full border border-amber-500 px-3 py-1 text-xs text-amber-200">
              {selectedProductProfile.category}
            </span>
          </div>

          <div className="mt-4 grid gap-4 md:grid-cols-2 text-sm">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-teal-500 mb-1">Audience</p>
              <p className="text-teal-200">{selectedProductProfile.audience}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-teal-500 mb-1">Primary Goal</p>
              <p className="text-teal-200">{selectedProductProfile.primaryGoal}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-teal-500 mb-1">Voice</p>
              <p className="text-teal-200">{selectedProductProfile.brandVoice}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-teal-500 mb-1">Best Channels</p>
              <p className="text-teal-200">{selectedProductProfile.promotionChannels.join(", ")}</p>
            </div>
          </div>

          {selectedProductProfile.notes?.length > 0 && (
            <div className="mt-4">
              <p className="text-xs uppercase tracking-[0.3em] text-teal-500 mb-2">Product Notes</p>
              <ul className="space-y-1 text-teal-300 text-sm">
                {selectedProductProfile.notes.map((note) => (
                  <li key={note}>• {note}</li>
                ))}
              </ul>
            </div>
          )}
        </section>
      )}

      <section className="mb-6 rounded border border-cyan-700 bg-black/60 p-4">
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <h2 className="text-lg font-semibold text-cyan-300">Post Intent</h2>
            <p className="text-sm text-teal-400">
              Choose whether this is a value post, a direct sell, a story, or a softer reminder.
            </p>
            <select
              className="mt-3 min-w-[220px] rounded border border-cyan-500 bg-black p-2 text-cyan-200"
              value={postIntent}
              onChange={(e) => setPostIntent(e.target.value)}
            >
              <option value="jab">Value Post</option>
              <option value="punch">Promotional</option>
              <option value="soft-sell">Soft Sell</option>
              <option value="educational">Educational</option>
              <option value="story">Story</option>
              <option value="launch">Launch</option>
              <option value="reminder">Reminder</option>
            </select>
          </div>
          <div>
            <h2 className="text-lg font-semibold text-cyan-300">Campaign Phase</h2>
            <p className="text-sm text-teal-400">
              Tell the system whether this is a teaser, launch push, follow-up, or evergreen discovery post.
            </p>
            <select
              className="mt-3 min-w-[220px] rounded border border-cyan-500 bg-black p-2 text-cyan-200"
              value={campaignPhase}
              onChange={(e) => setCampaignPhase(e.target.value)}
            >
              <option value="teaser">Teaser</option>
              <option value="launch">Launch</option>
              <option value="follow_up">Follow-up</option>
              <option value="evergreen">Evergreen</option>
            </select>
          </div>
        </div>
             <section className="mb-6 rounded border border-green-700 bg-black/60 p-4">
        <h2 className="mb-3 text-lg font-semibold text-pink-400">Draft</h2>
        <input
          type="text"
          placeholder="Title"
          className="w-full p-2 bg-black text-green-400 border border-gray-600 mb-2 focus:border-green-400 focus:shadow-lg focus:shadow-green-500/50"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />

        <textarea
          placeholder="Write your post here..."
          className="w-full p-2 bg-black text-green-400 border border-gray-600 min-h-[100px] focus:border-green-400 focus:shadow-lg focus:shadow-green-500/50"
          value={body}
          onChange={(e) => setBody(e.target.value)}
        />
      </section>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <label className="block">
            <span className="text-sm font-medium text-cyan-300">Campaign Angle</span>
            <input
              className="mt-2 w-full rounded border border-cyan-500 bg-black p-2 text-cyan-100"
              value={campaignAngle}
              onChange={(e) => setCampaignAngle(e.target.value)}
              placeholder="Specific framing for this phase"
            />
          </label>
          <label className="block">
            <span className="text-sm font-medium text-cyan-300">Visual Hook</span>
            <input
              className="mt-2 w-full rounded border border-cyan-500 bg-black p-2 text-cyan-100"
              value={visualHook}
              onChange={(e) => setVisualHook(e.target.value)}
              placeholder="Short visual sentence for thumbnails or pins"
            />
          </label>
        </div>
      </section>

      {redditSelected && (
        <section className="mb-6 rounded border border-amber-700 bg-black/70 p-4">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold text-amber-300">Reddit Safeguards</h2>
              <p className="mt-1 max-w-2xl text-sm text-amber-100/80">
                Reddit is treated as a manual, trust-sensitive lane. This system should slow you
                down on purpose.
              </p>
            </div>
            <div className="rounded border border-amber-500/60 bg-amber-950/30 px-3 py-2 text-xs text-amber-200">
              Manual review only. No hard-sell behavior.
            </div>
          </div>

          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <label className="block">
              <span className="text-sm font-medium text-amber-300">Subreddit</span>
              <input
                className="mt-2 w-full rounded border border-amber-500 bg-black p-2 text-amber-100"
                value={redditSubreddit}
                onChange={(e) => setRedditSubreddit(e.target.value)}
                placeholder="r/goblincore or another specific community"
              />
            </label>
            <label className="block">
              <span className="text-sm font-medium text-amber-300">Post Type</span>
              <select
                className="mt-2 w-full rounded border border-amber-500 bg-black p-2 text-amber-100"
                value={redditPostType}
                onChange={(e) => setRedditPostType(e.target.value)}
              >
                <option value="discussion">Discussion</option>
                <option value="useful-content">Useful Content</option>
                <option value="humor">Humor</option>
                <option value="community">Community</option>
                <option value="product-adjacent">Product Adjacent</option>
                <option value="hard-sell">Hard Sell</option>
              </select>
            </label>
          </div>

          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <label className="block md:col-span-2">
              <span className="text-sm font-medium text-amber-300">Why Would This Subreddit Care?</span>
              <textarea
                className="mt-2 min-h-[90px] w-full rounded border border-amber-500 bg-black p-2 text-amber-100"
                value={redditCommunityReason}
                onChange={(e) => setRedditCommunityReason(e.target.value)}
                placeholder="What is the native reason this community would care even if there were no product link?"
              />
            </label>
            <label className="block">
              <span className="text-sm font-medium text-amber-300">Link Mode</span>
              <select
                className="mt-2 w-full rounded border border-amber-500 bg-black p-2 text-amber-100"
                value={redditLinkMode}
                onChange={(e) => setRedditLinkMode(e.target.value)}
              >
                <option value="no-link">No Link</option>
                <option value="soft-redirect">Soft Redirect</option>
                <option value="direct-link">Direct Link</option>
              </select>
            </label>
            <div className="rounded border border-zinc-700 bg-zinc-950/50 p-3 text-sm text-zinc-300">
              Goblin-specific note: humor-first, identity-first, product-adjacent is safer than
              overt product pressure. Treat Reddit like a trust lane, not a funnel lane.
            </div>
          </div>
        </section>
      )}

      <section className="mb-6 rounded border border-teal-700 bg-black/60 p-4">
        <h2 className="mb-3 text-lg font-semibold text-pink-400">AI Assistant</h2>
        <div className="grid gap-3 md:grid-cols-2">
          <input
            type="text"
            placeholder="Product or post name"
            className="w-full p-2 bg-black text-green-400 border border-gray-600"
            value={aiProductName}
            onChange={(e) => setAiProductName(e.target.value)}
          />
          <input
            type="text"
            placeholder="Product type"
            className="w-full p-2 bg-black text-green-400 border border-gray-600"
            value={aiProductType}
            onChange={(e) => setAiProductType(e.target.value)}
          />
          <input
            type="text"
            placeholder="Audience"
            className="w-full p-2 bg-black text-green-400 border border-gray-600 md:col-span-2"
            value={aiAudience}
            onChange={(e) => setAiAudience(e.target.value)}
          />
          <label className="block">
            <span className="mb-2 block text-xs uppercase tracking-[0.3em] text-teal-400">
              AI Provider
            </span>
            <select
              className="w-full rounded border border-teal-500 bg-black p-2 text-green-300"
              value={aiProvider}
              onChange={(e) => setAiProvider(e.target.value)}
            >
              <option value="ollama">Ollama</option>
              <option value="openai">OpenAI</option>
            </select>
          </label>
          <div className="flex gap-3">
            <button
              type="button"
              className="bg-black text-green-400 border border-green-400 px-4 py-2 rounded hover:bg-green-400 hover:text-black transition-colors disabled:opacity-50"
              onClick={() => onGenerateSeo(false)}
              disabled={isGeneratingSeo || !hasAiContext}
            >
              {isGeneratingSeo ? "Generating..." : "Generate Suggestions"}
            </button>
            <button
              type="button"
              className="bg-black text-teal-300 border border-teal-500 px-4 py-2 rounded hover:bg-teal-500 hover:text-black transition-colors disabled:opacity-50"
              onClick={() => onGenerateSeo(true)}
              disabled={isGeneratingSeo || !hasAiContext}
            >
              Dry Run
            </button>
          </div>
        </div>

        <div className="mt-3 text-xs text-teal-400">
          Current provider: <span className="text-pink-300">{aiProvider}</span>. Generate Suggestions fills the response tray below. Dry Run only shows the prompt preview.
        </div>
        {!hasAiContext && (
          <div className="mt-3 rounded border border-dashed border-teal-700 bg-black/40 p-4 text-sm text-teal-300">
            Pick a product profile or type a title idea first. Once you give the AI something to work from,
            suggestions and prompt previews will show up here.
          </div>
        )}

        {aiSuggestions && (
          <div className="mt-4 rounded border border-pink-700 bg-zinc-950/80 p-4 text-sm text-teal-200">
            {"mode" in aiSuggestions ? (
              <div className="space-y-3">
                <p className="text-pink-300 text-xs uppercase tracking-[0.3em]">Prompt Preview</p>
                <pre className="overflow-auto whitespace-pre-wrap">{aiSuggestions.prompt}</pre>
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <p className="text-pink-300 text-xs uppercase tracking-[0.3em]">AI Results</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={applyAllAi}
                      className="rounded border border-lime-500 px-3 py-2 text-xs text-lime-200 hover:bg-lime-500 hover:text-black"
                    >
                      Use All
                    </button>
                    <button
                      type="button"
                      onClick={applyAiTitle}
                      className="rounded border border-teal-500 px-3 py-2 text-xs text-teal-200 hover:bg-teal-500 hover:text-black"
                    >
                      Use Title
                    </button>
                    <button
                      type="button"
                      onClick={applyAiBody}
                      className="rounded border border-teal-500 px-3 py-2 text-xs text-teal-200 hover:bg-teal-500 hover:text-black"
                    >
                      Use Body
                    </button>
                    <button
                      type="button"
                      onClick={applyAiHashtags}
                      className="rounded border border-teal-500 px-3 py-2 text-xs text-teal-200 hover:bg-teal-500 hover:text-black"
                    >
                      Use Hashtags
                    </button>
                    <button
                      type="button"
                      onClick={applyAiAltText}
                      className="rounded border border-teal-500 px-3 py-2 text-xs text-teal-200 hover:bg-teal-500 hover:text-black"
                    >
                      Use Alt Text
                    </button>
                    <button
                      type="button"
                      onClick={applyAiImagePlan}
                      className="rounded border border-teal-500 px-3 py-2 text-xs text-teal-200 hover:bg-teal-500 hover:text-black"
                    >
                      Use Image Plan
                    </button>
                  </div>
                  <p className="mt-2"><span className="text-pink-300">Suggested intent:</span> {displayedAiIntent || "—"}</p>
                  <p className="mt-2"><span className="text-pink-300">Campaign phase:</span> {displayedCampaignPhase || "—"}</p>
                  <p className="mt-2"><span className="text-pink-300">Campaign angle:</span> {displayedCampaignAngle || "—"}</p>
                  <p className="mt-2"><span className="text-pink-300">Visual hook:</span> {displayedVisualHook || "—"}</p>
                  <p className="mt-2"><span className="text-pink-300">Suggested title:</span> {displayedAiTitle || "—"}</p>
                  <p className="mt-2"><span className="text-pink-300">Suggested body:</span></p>
                  <div className="mt-1 whitespace-pre-wrap rounded border border-teal-800 bg-black/40 p-3">
                    {displayedAiBody || "—"}
                  </div>
                  <p className="mt-2"><span className="text-pink-300">Suggested hashtags:</span> {displayedAiHashtags || "—"}</p>
                  <p className="mt-2"><span className="text-pink-300">Suggested alt text:</span> {displayedAiAltText || "—"}</p>
                  <p className="mt-2"><span className="text-pink-300">Image concept:</span> {displayedAiImageConcept || "—"}</p>
                  <p className="mt-2"><span className="text-pink-300">Image prompt:</span> {displayedAiImagePrompt || "—"}</p>
                </div>

                <div className="rounded border border-amber-700 bg-black/40 p-3">
                  <p className="text-amber-300 text-xs uppercase tracking-[0.3em]">Applied To Form</p>
                  <p className="mt-2 text-teal-200">
                    Use the buttons above to pull pieces into the draft. This keeps single-post AI visible on `/compose` instead of feeling like it disappeared.
                  </p>
                </div>
                

                <div className="space-y-2">
                  <p><span className="text-pink-300">Keywords:</span> {aiSuggestions.keywords?.join(", ") || "—"}</p>
                  <p><span className="text-pink-300">Meta:</span> {aiSuggestions.meta_description || "—"}</p>
                  <p><span className="text-pink-300">Pitch:</span> {aiSuggestions.seo_human_pitch || "—"}</p>
                  <p><span className="text-pink-300">Search queries:</span> {aiSuggestions.desperate_search_queries?.join(" | ") || "—"}</p>
                </div>
              </div>
            )}
          </div>
        )}
      </section>

      <ImageUploader
        image={image}
        setImage={setImage}
        mediaPath={mediaPath}
        setMediaPath={setMediaPath}
        mediaType={mediaType}
        setMediaType={setMediaType}
        altText={altText}
        setAltText={setAltText}
        selectedPlatforms={selectedPlatforms}
      />

      <section className="mb-6 rounded border border-amber-600 bg-black/60 p-4">
        <h2 className="text-lg font-semibold text-pink-400 mb-3">Image Plan</h2>
        <div className="grid gap-4 md:grid-cols-3">
          <label className="block">
            <span className="text-sm text-teal-300">Image status</span>
            <select
              value={imageStatus}
              onChange={(e) => setImageStatus(e.target.value)}
              className="mt-2 w-full p-2 bg-black text-green-400 border border-gray-600"
            >
              <option value="attached">Attached</option>
              <option value="prompt-needed">Prompt Needed</option>
              <option value="optional">Optional</option>
            </select>
          </label>
          <label className="block md:col-span-2">
            <span className="text-sm text-teal-300">Image concept</span>
            <input
              type="text"
              value={imageConcept}
              onChange={(e) => setImageConcept(e.target.value)}
              placeholder="Glitchy dashboard, cozy spooky coloring page, bee-themed playful cover..."
              className="mt-2 w-full p-2 bg-black text-green-400 border border-gray-600"
            />
          </label>
        </div>
        <label className="block mt-4">
          <span className="text-sm text-teal-300">Image prompt</span>
          <textarea
            value={imagePrompt}
            onChange={(e) => setImagePrompt(e.target.value)}
            placeholder="Generator-ready prompt for the image you want to make on posting day"
            className="mt-2 w-full p-2 bg-black text-green-400 border border-gray-600 min-h-[110px]"
          />
        </label>
        <p className="mt-2 text-xs text-teal-500">
          Use this when nothing is auto yet: save the concept or prompt now, then generate or attach the image on posting day.
        </p>
      </section>

      <PlatformSelector
        selectedTargets={selectedTargets}
        toggleTarget={toggleTarget}
        accountsByPlatform={accountsByPlatform}
        platforms={availablePlatforms}
        healthResults={platformHealth}
        onHealthIssue={handleHealthIssue}
      />
      {accountsError && (
        <p className="text-xs text-red-400 mb-3">{accountsError}</p>
      )}
      {platformHealthError && (
        <p className="text-xs text-red-400 mb-3">{platformHealthError}</p>
      )}

      <section className="mb-6 rounded border border-pink-700 bg-black/60 p-4">
        <div className="flex items-center justify-between gap-3 mb-4">
          <div>
            <h2 className="text-lg font-semibold text-pink-400">Platform Writing Guidance</h2>
            <p className="text-sm text-teal-400">
              Use this to match platform expectations before posting or generating AI variants.
            </p>
          </div>
        </div>

        {activeProfiles.length === 0 ? (
          <p className="text-sm text-teal-300">
            Select one or more platforms to load tone, structure, CTA, and audience guidance here.
          </p>
        ) : (
          <div className="space-y-4">
            {activeProfiles.map((profile) => (
              <div
                key={profile.id}
                className="rounded border border-teal-700 bg-zinc-950/80 p-4"
              >
                <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
                  <h3 className="text-lg text-pink-300">{profile.label}</h3>
                  <div className="flex flex-wrap gap-2 text-xs">
                    <span className="rounded-full border border-teal-700 px-2 py-1 text-teal-300">
                      links: {profile.linkTolerance}
                    </span>
                    <span className="rounded-full border border-teal-700 px-2 py-1 text-teal-300">
                      humor: {profile.humorTolerance}
                    </span>
                    <span className="rounded-full border border-teal-700 px-2 py-1 text-teal-300">
                      emoji: {profile.emojiTolerance}
                    </span>
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2 text-sm">
                  <div className="space-y-3">
                    <div>
                      <p className="text-xs uppercase tracking-[0.3em] text-teal-500 mb-1">Audience</p>
                      <p className="text-teal-200">{profile.audienceExpectation}</p>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-[0.3em] text-teal-500 mb-1">Voice</p>
                      <p className="text-teal-200">{profile.voice}</p>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-[0.3em] text-teal-500 mb-1">CTA Style</p>
                      <p className="text-teal-200">{profile.ctaStyle}</p>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div>
                      <p className="text-xs uppercase tracking-[0.3em] text-teal-500 mb-1">Best Formats</p>
                      <p className="text-teal-200">{profile.bestFormats.join(", ")}</p>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-[0.3em] text-teal-500 mb-1">Avoid</p>
                      <p className="text-red-300">{profile.avoid.join(", ")}</p>
                    </div>
                  </div>
                </div>

                <div className="mt-4 grid gap-4 md:grid-cols-2 text-sm">
                  <div>
                    <p className="text-xs uppercase tracking-[0.3em] text-teal-500 mb-2">Structure Rules</p>
                    <ul className="space-y-1 text-teal-200">
                      {profile.structureRules.map((rule) => (
                        <li key={rule}>• {rule}</li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-[0.3em] text-teal-500 mb-2">Good Openers</p>
                    <ul className="space-y-1 text-teal-200">
                      {profile.openerPatterns.map((pattern) => (
                        <li key={pattern}>• {pattern}</li>
                      ))}
                    </ul>
                  </div>
                </div>

                {profile.notes?.length > 0 && (
                  <div className="mt-4">
                    <p className="text-xs uppercase tracking-[0.3em] text-teal-500 mb-2">Notes</p>
                    <ul className="space-y-1 text-teal-300 text-sm">
                      {profile.notes.map((note) => (
                        <li key={note}>• {note}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      <div className="mb-4">
        <label className="text-green-400">
          <input
            type="checkbox"
            checked={useAutoHashtags}
            onChange={() => setUseAutoHashtags(!useAutoHashtags)}
            className="mr-2"
          />
          Auto-generate hashtags
        </label>
        {!useAutoHashtags && (
          <textarea
            placeholder="#hashtag1 #hashtag2"
            className="w-full p-2 bg-black text-green-400 border border-gray-600 mt-2 focus:border-green-400 focus:shadow-lg focus:shadow-green-500/50"
            value={manualHashtags}
            onChange={(e) => setManualHashtags(e.target.value)}
          />
        )}
      </div>

      <CustomPlatformText
        useAutoPlatformText={useAutoPlatformText}
        setUseAutoPlatformText={setUseAutoPlatformText}
        selectedPlatforms={selectedPlatforms}
        customText={customText}
        setCustomText={setCustomText}
      />

      <details className="mb-6 rounded border border-purple-700 bg-black/60" open={false}>
  <summary className="cursor-pointer select-none px-4 py-3 text-lg font-semibold text-purple-300 hover:bg-purple-900/30">
    🚀 Advanced Marketing Optimization
    <span className="ml-2 text-sm font-normal text-teal-400">
      CTR, SEO, audience targeting & campaign intelligence
    </span>
  </summary>

  <div className="p-4 space-y-6">
        <section className="mb-6 rounded border border-fuchsia-500 bg-fuchsia-950/30 p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-fuchsia-300">Campaign Summary</p>
            <h2 className="mt-1 text-lg font-semibold text-fuchsia-100">
              Visible summary before you scroll into the full metadata block
            </h2>
          </div>
          <a
            href="#intent-discoverability"
            className="rounded border border-fuchsia-400 px-3 py-2 text-xs text-fuchsia-100 hover:bg-fuchsia-400 hover:text-black transition-colors"
          >
            Jump to edit
          </a>
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          <div className="rounded border border-fuchsia-700 bg-black/40 p-3">
            <p className="text-xs uppercase tracking-[0.25em] text-fuchsia-300">Primary</p>
            <p className="mt-2 text-fuchsia-100">{intentPrimary || "—"}</p>
          </div>
          <div className="rounded border border-fuchsia-700 bg-black/40 p-3">
            <p className="text-xs uppercase tracking-[0.25em] text-fuchsia-300">Stage</p>
            <p className="mt-2 text-fuchsia-100">{awarenessStage || "—"}</p>
          </div>
          <div className="rounded border border-fuchsia-700 bg-black/40 p-3">
            <p className="text-xs uppercase tracking-[0.25em] text-fuchsia-300">JTBD</p>
            <p className="mt-2 text-fuchsia-100">{jtbd || "—"}</p>
          </div>
        </div>
      </section>

      <section className="mb-6 rounded border border-amber-500 bg-amber-950/20 p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-amber-300">Performance Summary</p>
            <h2 className="mt-1 text-lg font-semibold text-amber-100">
              Headline and trust cues for click-through
            </h2>
          </div>
          <a
            href="#ctr-headline"
            className="rounded border border-amber-400 px-3 py-2 text-xs text-amber-100 hover:bg-amber-400 hover:text-black transition-colors"
          >
            Jump to edit
          </a>
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-2 lg:grid-cols-4">
          <div className="rounded border border-amber-700 bg-black/40 p-3">
            <p className="text-xs uppercase tracking-[0.25em] text-amber-300">Headline</p>
            <p className="mt-2 text-amber-100">{displayedCtrHeadline || "—"}</p>
          </div>
          <div className="rounded border border-amber-700 bg-black/40 p-3">
            <p className="text-xs uppercase tracking-[0.25em] text-amber-300">CTR Score</p>
            <p className="mt-2 text-amber-100">{displayedCtrScore || "—"}</p>
          </div>
          <div className="rounded border border-amber-700 bg-black/40 p-3">
            <p className="text-xs uppercase tracking-[0.25em] text-amber-300">Trust Score</p>
            <p className="mt-2 text-amber-100">{displayedTrustScore || "—"}</p>
          </div>
          <div className="rounded border border-amber-700 bg-black/40 p-3">
            <p className="text-xs uppercase tracking-[0.25em] text-amber-300">Clarity Score</p>
            <p className="mt-2 text-amber-100">{displayedClarityScore || "—"}</p>
          </div>
        </div>
      </section>

       <section id="ctr-headline" className="mb-6 scroll-mt-6 rounded border border-amber-600 bg-black/60 p-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-amber-300">CTR / Headline</h2>
            <p className="text-sm text-teal-400">
              Shape the hook, trust cues, and platform-specific click-through framing here.
            </p>
          </div>
          <span className="rounded-full border border-amber-500 px-3 py-1 text-xs text-amber-200">
            CTR-aware copy
          </span>
        </div>

        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <label className="block md:col-span-2">
            <span className="text-sm font-medium text-amber-300">Headline</span>
            <input
              className="mt-2 w-full rounded border border-amber-500 bg-black p-2 text-amber-100"
              value={headline}
              onChange={(e) => setHeadline(e.target.value)}
              placeholder="The main headline or post title"
            />
          </label>
          <label className="block md:col-span-2">
            <span className="text-sm font-medium text-amber-300">Headline Variants</span>
            <textarea
              className="mt-2 w-full rounded border border-amber-500 bg-black p-2 text-amber-100 min-h-[84px]"
              value={headlineVariants}
              onChange={(e) => setHeadlineVariants(e.target.value)}
              placeholder="Comma-separated alternates"
            />
          </label>
          <label className="block">
            <span className="text-sm font-medium text-amber-300">Primary Emotion</span>
            <input
              className="mt-2 w-full rounded border border-amber-500 bg-black p-2 text-amber-100"
              value={primaryEmotion}
              onChange={(e) => setPrimaryEmotion(e.target.value)}
              placeholder="clarity, frustration, relief..."
            />
          </label>
          <label className="block">
            <span className="text-sm font-medium text-amber-300">Secondary Emotion</span>
            <input
              className="mt-2 w-full rounded border border-amber-500 bg-black p-2 text-amber-100"
              value={secondaryEmotion}
              onChange={(e) => setSecondaryEmotion(e.target.value)}
              placeholder="supporting emotional layer"
            />
          </label>
          <label className="block">
            <span className="text-sm font-medium text-amber-300">Curiosity Type</span>
            <input
              className="mt-2 w-full rounded border border-amber-500 bg-black p-2 text-amber-100"
              value={curiosityType}
              onChange={(e) => setCuriosityType(e.target.value)}
              placeholder="process, outcome, comparison..."
            />
          </label>
          <label className="block">
            <span className="text-sm font-medium text-amber-300">Pattern Interrupt</span>
            <input
              className="mt-2 w-full rounded border border-amber-500 bg-black p-2 text-amber-100"
              value={patternInterruptType}
              onChange={(e) => setPatternInterruptType(e.target.value)}
              placeholder="contrarian, direct, story..."
            />
          </label>
          <label className="block">
            <span className="text-sm font-medium text-amber-300">Hook Type</span>
            <input
              className="mt-2 w-full rounded border border-amber-500 bg-black p-2 text-amber-100"
              value={hookType}
              onChange={(e) => setHookType(e.target.value)}
              placeholder="problem-aware, beginner, platform-specific..."
            />
          </label>
          <label className="block">
            <span className="text-sm font-medium text-amber-300">Content Intent</span>
            <input
              className="mt-2 w-full rounded border border-amber-500 bg-black p-2 text-amber-100"
              value={contentIntent}
              onChange={(e) => setContentIntent(e.target.value)}
              placeholder="educate, sell, inspire..."
            />
          </label>
          <label className="block">
            <span className="text-sm font-medium text-amber-300">Search Intent</span>
            <input
              className="mt-2 w-full rounded border border-amber-500 bg-black p-2 text-amber-100"
              value={searchIntent}
              onChange={(e) => setSearchIntent(e.target.value)}
              placeholder="what someone would search for"
            />
          </label>
          <label className="block">
            <span className="text-sm font-medium text-amber-300">Save Intent</span>
            <input
              className="mt-2 w-full rounded border border-amber-500 bg-black p-2 text-amber-100"
              value={saveIntent}
              onChange={(e) => setSaveIntent(e.target.value)}
              placeholder="template, checklist, reference..."
            />
          </label>
          <label className="block">
            <span className="text-sm font-medium text-amber-300">Share Intent</span>
            <input
              className="mt-2 w-full rounded border border-amber-500 bg-black p-2 text-amber-100"
              value={shareIntent}
              onChange={(e) => setShareIntent(e.target.value)}
              placeholder="why someone would share this"
            />
          </label>
          <label className="block md:col-span-2">
            <span className="text-sm font-medium text-amber-300">First Line</span>
            <textarea
              className="mt-2 w-full rounded border border-amber-500 bg-black p-2 text-amber-100 min-h-[84px]"
              value={firstLine}
              onChange={(e) => setFirstLine(e.target.value)}
              placeholder="The opening line or first hook sentence"
            />
          </label>
          <label className="block md:col-span-2">
            <span className="text-sm font-medium text-amber-300">Thumbnail Concept</span>
            <input
              className="mt-2 w-full rounded border border-amber-500 bg-black p-2 text-amber-100"
              value={thumbnailConcept}
              onChange={(e) => setThumbnailConcept(e.target.value)}
              placeholder="what the thumbnail should visually communicate"
            />
          </label>
          <label className="block md:col-span-2">
            <span className="text-sm font-medium text-amber-300">Specificity Signals</span>
            <textarea
              className="mt-2 w-full rounded border border-amber-500 bg-black p-2 text-amber-100 min-h-[96px] font-mono text-sm"
              value={specificitySignals}
              onChange={(e) => setSpecificitySignals(e.target.value)}
              placeholder='{\n  "number": true,\n  "platform": true,\n  "outcome": true\n}'
            />
          </label>
          <label className="block">
            <span className="text-sm font-medium text-amber-300">Authority Signals</span>
            <textarea
              className="mt-2 w-full rounded border border-amber-500 bg-black p-2 text-amber-100 min-h-[84px]"
              value={authoritySignals}
              onChange={(e) => setAuthoritySignals(e.target.value)}
              placeholder="metrics, process, screenshots"
            />
          </label>
          <label className="block">
            <span className="text-sm font-medium text-amber-300">Trust Signals</span>
            <textarea
              className="mt-2 w-full rounded border border-amber-500 bg-black p-2 text-amber-100 min-h-[84px]"
              value={trustSignals}
              onChange={(e) => setTrustSignals(e.target.value)}
              placeholder="proof, constraints, honesty"
            />
          </label>
          <label className="block md:col-span-2">
            <span className="text-sm font-medium text-amber-300">Platform Guidelines</span>
            <textarea
              className="mt-2 w-full rounded border border-amber-500 bg-black p-2 text-amber-100 min-h-[120px] font-mono text-sm"
              value={platformOptimizations}
              onChange={(e) => setPlatformOptimizations(e.target.value)}
              placeholder='{\n  "Pinterest": { "hook": "", "body": "", "cta": "" }\n}'
            />
          </label>
          <label className="block">
            <span className="text-sm font-medium text-amber-300">CTR Score</span>
            <input
              className="mt-2 w-full rounded border border-amber-500 bg-black p-2 text-amber-100"
              type="number"
              min="0"
              max="100"
              step="1"
              value={ctrScore}
              onChange={(e) => setCtrScore(e.target.value)}
              placeholder="0-100"
            />
          </label>
          <label className="block">
            <span className="text-sm font-medium text-amber-300">Clarity Score</span>
            <input
              className="mt-2 w-full rounded border border-amber-500 bg-black p-2 text-amber-100"
              type="number"
              min="0"
              max="100"
              step="1"
              value={clarityScore}
              onChange={(e) => setClarityScore(e.target.value)}
              placeholder="0-100"
            />
          </label>
          <label className="block">
            <span className="text-sm font-medium text-amber-300">Trust Score</span>
            <input
              className="mt-2 w-full rounded border border-amber-500 bg-black p-2 text-amber-100"
              type="number"
              min="0"
              max="100"
              step="1"
              value={trustScore}
              onChange={(e) => setTrustScore(e.target.value)}
              placeholder="0-100"
            />
          </label>
          <label className="block">
            <span className="text-sm font-medium text-amber-300">Curiosity Score</span>
            <input
              className="mt-2 w-full rounded border border-amber-500 bg-black p-2 text-amber-100"
              type="number"
              min="0"
              max="100"
              step="1"
              value={curiosityScore}
              onChange={(e) => setCuriosityScore(e.target.value)}
              placeholder="0-100"
            />
          </label>
          <label className="block">
            <span className="text-sm font-medium text-amber-300">Save Score</span>
            <input
              className="mt-2 w-full rounded border border-amber-500 bg-black p-2 text-amber-100"
              type="number"
              min="0"
              max="100"
              step="1"
              value={saveScore}
              onChange={(e) => setSaveScore(e.target.value)}
              placeholder="0-100"
            />
          </label>
          <label className="block">
            <span className="text-sm font-medium text-amber-300">Share Score</span>
            <input
              className="mt-2 w-full rounded border border-amber-500 bg-black p-2 text-amber-100"
              type="number"
              min="0"
              max="100"
              step="1"
              value={shareScore}
              onChange={(e) => setShareScore(e.target.value)}
              placeholder="0-100"
            />
          </label>
        </div>
      </section>

 <section id="intent-discoverability" className="mb-6 scroll-mt-6 rounded border border-fuchsia-700 bg-black/60 p-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-fuchsia-300">Search & Audience</h2>
            <p className="text-sm text-teal-400">
              Classify the post by intent and search behavior instead of only by keyword.
            </p>
          </div>
          <span className="rounded-full border border-fuchsia-500 px-3 py-1 text-xs text-fuchsia-200">
            Pinterest-first metadata
          </span>
        </div>

        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <label className="block">
            <span className="text-sm font-medium text-fuchsia-300">Intent Primary</span>
            <input
              className="mt-2 w-full rounded border border-fuchsia-500 bg-black p-2 text-fuchsia-100"
              value={intentPrimary}
              onChange={(e) => setIntentPrimary(e.target.value)}
              placeholder="problem, aesthetic, comparison, beginner..."
            />
          </label>
          <label className="block">
            <span className="text-sm font-medium text-fuchsia-300">Intent Secondary</span>
            <input
              className="mt-2 w-full rounded border border-fuchsia-500 bg-black p-2 text-fuchsia-100"
              value={intentSecondary}
              onChange={(e) => setIntentSecondary(e.target.value)}
              placeholder="latent intent or fallback state"
            />
          </label>
          <label className="block">
            <span className="text-sm font-medium text-fuchsia-300">Awareness Stage</span>
            <select
              className="mt-2 w-full rounded border border-fuchsia-500 bg-black p-2 text-fuchsia-100"
              value={awarenessStage}
              onChange={(e) => setAwarenessStage(e.target.value)}
            >
              <option value="problem-aware">Problem-aware</option>
              <option value="solution-aware">Solution-aware</option>
              <option value="evaluation">Evaluation</option>
              <option value="purchase">Purchase</option>
              <option value="post-purchase">Post-purchase</option>
            </select>
          </label>
          <label className="block">
            <span className="text-sm font-medium text-fuchsia-300">Pin Angle</span>
            <input
              className="mt-2 w-full rounded border border-fuchsia-500 bg-black p-2 text-fuchsia-100"
              value={pinAngle}
              onChange={(e) => setPinAngle(e.target.value)}
              placeholder="problem, aesthetic, beginner, seasonal..."
            />
          </label>
          <label className="block">
            <span className="text-sm font-medium text-fuchsia-300">JTBD</span>
            <input
              className="mt-2 w-full rounded border border-fuchsia-500 bg-black p-2 text-fuchsia-100"
              value={jtbd}
              onChange={(e) => setJtbd(e.target.value)}
              placeholder="What job is the audience trying to get done?"
            />
          </label>
          <label className="block">
            <span className="text-sm font-medium text-fuchsia-300">Pain Proximity</span>
            <input
              className="mt-2 w-full rounded border border-fuchsia-500 bg-black p-2 text-fuchsia-100"
              type="number"
              min="0"
              max="10"
              step="1"
              value={painProximity}
              onChange={(e) => setPainProximity(e.target.value)}
              placeholder="0-10"
            />
          </label>
          <label className="block">
            <span className="text-sm font-medium text-fuchsia-300">Commerciality Score</span>
            <input
              className="mt-2 w-full rounded border border-fuchsia-500 bg-black p-2 text-fuchsia-100"
              type="number"
              min="0"
              max="10"
              step="1"
              value={commercialityScore}
              onChange={(e) => setCommercialityScore(e.target.value)}
              placeholder="0-10"
            />
          </label>
          <label className="block">
            <span className="text-sm font-medium text-fuchsia-300">Emotion Tags</span>
            <input
              className="mt-2 w-full rounded border border-fuchsia-500 bg-black p-2 text-fuchsia-100"
              value={emotionTags}
              onChange={(e) => setEmotionTags(e.target.value)}
              placeholder="frustrated, hopeful, curious"
            />
          </label>
          <label className="block">
            <span className="text-sm font-medium text-fuchsia-300">Identity Tags</span>
            <input
              className="mt-2 w-full rounded border border-fuchsia-500 bg-black p-2 text-fuchsia-100"
              value={identityTags}
              onChange={(e) => setIdentityTags(e.target.value)}
              placeholder="developer, indie hacker, home gardener"
            />
          </label>
          <label className="block">
            <span className="text-sm font-medium text-fuchsia-300">Query Chain Depth</span>
            <input
              className="mt-2 w-full rounded border border-fuchsia-500 bg-black p-2 text-fuchsia-100"
              type="number"
              min="0"
              max="10"
              step="1"
              value={queryChainDepth}
              onChange={(e) => setQueryChainDepth(e.target.value)}
              placeholder="0-10"
            />
          </label>
          <label className="block">
            <span className="text-sm font-medium text-fuchsia-300">Evergreen Score</span>
            <input
              className="mt-2 w-full rounded border border-fuchsia-500 bg-black p-2 text-fuchsia-100"
              type="number"
              min="0"
              max="10"
              step="1"
              value={evergreenScore}
              onChange={(e) => setEvergreenScore(e.target.value)}
              placeholder="0-10"
            />
          </label>
        </div>
      </section>

  </div>
    </details>

      <section className="mb-6 rounded border border-teal-700 bg-black/60 p-4">
        <h2 className="text-lg font-semibold text-pink-400 mb-3">Tags</h2>
        <div className="grid gap-4 md:grid-cols-2">
          <label className="block">
            <span className="text-sm text-teal-300">Content tags</span>
            <textarea
              value={contentTags}
              onChange={(e) => setContentTags(e.target.value)}
              placeholder="goblin, burnout, self-care, kawaii, founders"
              className="mt-2 w-full p-2 bg-black text-green-400 border border-gray-600 min-h-[90px]"
            />
            <p className="mt-1 text-xs text-teal-500">
              Topic and campaign meaning. These help organize and describe the post.
            </p>
          </label>

          <label className="block">
            <span className="text-sm text-teal-300">Distribution tags</span>
            <textarea
              value={distributionTags}
              onChange={(e) => setDistributionTags(e.target.value)}
              placeholder="post:facebook, post:pinterest, post:instagram"
              className="mt-2 w-full p-2 bg-black text-green-400 border border-gray-600 min-h-[90px]"
            />
            <p className="mt-1 text-xs text-teal-500">
              Use tags like <code>post:facebook</code>. These auto-fill routing targets.
            </p>
          </label>
        </div>
      </section>

        <label className="block mb-4 text-green-400">
          Schedule Post:
          <input
            type="datetime-local"
            value={scheduledAt || ""}
            onChange={(e) => setScheduledAt(e.target.value)}
            className="block p-2 bg-gray-800 text-green-400 border border-lime-400 focus:border-lime-400 focus:shadow-lg focus:shadow-lime-500/50"
          />
      </label>

      <label className="block mb-4 text-green-400">
        <input
          type="checkbox"
          checked={saveAsDraft}
          onChange={() => {
            const nextValue = !saveAsDraft;
            setSaveAsDraft(nextValue);
            if (nextValue) {
              setApproveForSchedule(false);
            }
          }}
          className="mr-2"
        />
        Keep as draft
      </label>

      <label className="block mb-4 text-green-400">
        <input
          type="checkbox"
          checked={approveForSchedule}
          disabled={saveAsDraft}
          onChange={() => setApproveForSchedule(!approveForSchedule)}
          className="mr-2"
        />
        Approve for scheduled posting
      </label>
      <p className="mb-4 text-xs text-teal-400">
        If you wrote it yourself, leave approval on. AI-generated copy defaults back to draft until you approve it.
      </p>

      <label className="block mb-4 text-green-400">
        <input
          type="checkbox"
          checked={includeProductLink}
          onChange={() => setIncludeProductLink(!includeProductLink)}
          className="mr-2"
        />
        Include product link in outgoing copy
      </label>

      <label className="block mb-4 text-green-400">
        <input
          type="checkbox"
          checked={autoAffiliateAmazon}
          onChange={() => setAutoAffiliateAmazon(!autoAffiliateAmazon)}
          className="mr-2"
        />
        Auto-tag Amazon links with my partner tag
      </label>

      <button
        className="bg-black text-green-400 border border-green-400 px-4 py-2 rounded hover:bg-green-400 hover:text-black transition-colors disabled:opacity-50 disabled:cursor-not-allowed focus:shadow-lg focus:shadow-green-500/50"
        onClick={onSubmit}
        disabled={isSubmitting || isAutoScheduling}
      >
        {isSubmitting ? "Working..." : submitLabel}
      </button>
      <button
        className="ml-3 bg-black text-cyan-200 border border-cyan-500 px-4 py-2 rounded hover:bg-cyan-500 hover:text-black transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        onClick={onApproveAndScheduleNextOpenDay}
        disabled={isSubmitting || isAutoScheduling}
      >
        {isAutoScheduling ? "Scheduling..." : "Approve + Schedule Next Open Day"}
      </button>

      {statusMessage && (
        <p className="mt-3 text-sm text-gray-200 bg-gray-900 p-2 rounded">
          {statusMessage}
        </p>
      )}
    </div>
    
  );
}
