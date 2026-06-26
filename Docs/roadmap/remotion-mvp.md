# Remotion MVP Roadmap

This roadmap defines the minimal first Remotion video workflow for PostPunk.

No implementation is included in this phase.

## MVP Concept

Create a simple video asset pipeline:

```text
Quote Card
-> 15-second video
-> Pinterest Video Pin
```

The first MVP should prove that PostPunk can turn approved content into a lightweight video format without changing the core publishing worker.

## MVP Output

Target output:

- One 15-second vertical video.
- Format suitable for Pinterest Video Pins.
- Reusable visual template.
- One quote or short message per video.
- Optional product or brand end card.

Recommended video specs:

- Aspect ratio: 9:16.
- Duration: 15 seconds.
- Resolution: 1080x1920.
- File format: MP4.
- Visual structure: intro frame, quote motion, optional CTA/end card.

## Required Assets

Content inputs:

- Approved quote, post excerpt, or short hook.
- Product or campaign name.
- Optional CTA.
- Optional destination URL.
- Optional disclosure text if the video promotes an affiliate product.

Visual inputs:

- Brand logo or mark.
- Background image, texture, or solid brand treatment.
- Font choices.
- Color palette.
- Optional product image or cover image.

Metadata inputs:

- Pinterest board.
- Pin title.
- Pin description.
- Alt text or accessibility description.
- Campaign/product tags.
- Source content ID or canonical source.

## Expected Manual Workflow

1. Select an approved quote or excerpt from a post.
2. Confirm it is short enough for a 15-second read.
3. Run the copy through Taste Skill and Stop Slop before creating the video.
4. Select a template style, such as quote-only, product-backed, or seasonal.
5. Render the video with Remotion locally.
6. Review video for readability, pacing, safe margins, and platform fit.
7. Save the rendered MP4 as a media asset.
8. Create or update a Pinterest queue item that uses the video asset.
9. Publish manually or through a future video-aware lane after validation.

## Implementation Complexity

Complexity: medium.

Reasons:

- Remotion setup is straightforward, but asset handling and repeatable templates need care.
- Text fitting matters because quote length can vary.
- Pinterest video upload behavior needs separate validation from static pin uploads.
- Rendering is local compute work and should not block the publishing worker.
- Media metadata must stay connected to the originating content item.

Lowest-risk first implementation:

- Keep Remotion in a separate tool or script directory.
- Render from a local JSON input file.
- Store output videos in a media directory.
- Add videos to queue manually.
- Avoid worker integration until upload behavior is proven.

## Future Expansion Opportunities

- Multiple templates for quote cards, product promos, article teasers, and seasonal pins.
- Automatic quote extraction from approved posts.
- Batch video generation from campaign rows.
- Pinterest-specific title and description generation.
- Animated end cards with product, URL, or brand mark.
- Template preview inside the PostPunk UI.
- Automated media validation for duration, dimensions, and file size.
- Cross-platform variants for reels, shorts, and story-style formats.
- Performance tracking that compares static pins and video pins.

## Risks and Guardrails

- Do not automate video publishing until Pinterest video upload is proven.
- Do not generate videos from unapproved drafts.
- Do not let Remotion rendering run inside the scheduled publishing worker.
- Do not use text that is too long to read comfortably.
- Do not ship videos without checking safe margins on mobile.
- Keep video templates brand-consistent instead of making each render a new visual system.

## MVP Success Criteria

- A human can create one approved 15-second vertical quote video.
- The video can be reviewed before scheduling.
- The rendered file can be attached to a Pinterest queue item.
- The workflow preserves copy quality checks before rendering.
- The MVP identifies the exact production integration points for a later pass.
