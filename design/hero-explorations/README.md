# Handbook hero explorations

Approved direction: terraced inverse (September 20, 2026). These generated mockups are visual references, not page screenshots or production assets.

- `offset-blocks.png`: two offset rounded rectangular masses.
- `descending-steps.png`: three descending horizontal tiers.
- `terraced-inverse.png`: broad top and right edge, with inset steps descending right; selected for the handbook.

Preserve the homepage's pale blue, mint and cream palette, restrained contrast, biological texture, horizontal geometry and consistent corner rounding. Background outside production artwork must be transparent.

User feedback: these are useful references and cute, but still a little boring. Future explorations should introduce more character without returning to wobbly contours or bright, saturated colors. The current implementation uses the selected direction without reopening the approved page design.

Production asset extracted with the built-in image generator from the selected mockup, preserving the illustration and removing the website UI and white canvas. Prompt: extract only the right-hand terraced illustration, preserve pale colors, grain, cells and exact rounded rectilinear silhouette; isolate on transparent alpha with no shadow or glow.

The production `images/handbook-terraced.svg` embeds the optimized generated WebP and uses a precise rounded path to remove extraction fringe. It is self-contained and transparent outside the path; `images/handbook-terraced-texture.webp` is retained as its editable source.

Validation: build, eight tests, syntax checks, desktop visual inspection and 375px mobile inspection (375px document width, no horizontal overflow).
