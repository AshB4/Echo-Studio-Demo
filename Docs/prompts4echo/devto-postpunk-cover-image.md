# DEV Cover Image Prompt: PostPunk Series

Use this as the locked visual identity prompt for Dev.to article cover images. Only rewrite the fields in the article-specific section.

```text
Create a DEV.to article illustration in a consistent PostPunk style.

Style:
Retro 64-bit pixel art with cozy late-night hacker vibes, subtle CRT glow, rich lighting, and dense environmental storytelling. Include the recurring raccoon mascot: clever, determined, slightly sleep-deprived, and surrounded by tiny humorous details. Aspect ratio 16:9. Pixel art only.

Article:
Title: [TITLE]

Summary: [1-2 sentence summary]

Lesson: [What should readers learn?]

Visual Metaphor: [The scene that represents the article]

Required Text: [Optional short status messages or labels]

The scene should instantly communicate the article topic, spark curiosity, and make developers think: "I need to know the story behind this." Maintain the exact same visual identity across all future PostPunk article illustrations.
```

Rewriteable fields:

- `articleTitle`
- `articleSummary`
- `primaryLesson`
- `visualMetaphor`
- `requiredText`

Suggested PostPunk metadata:

```json
{
  "coverImagePrompt": "",
  "coverImagePromptFields": {
    "articleTitle": "",
    "articleSummary": "",
    "primaryLesson": "",
    "visualMetaphor": "",
    "requiredText": ""
  },
  "coverImageUrl": "",
  "coverImageAlt": "",
  "coverImageStatus": "prompt_ready"
}
```
