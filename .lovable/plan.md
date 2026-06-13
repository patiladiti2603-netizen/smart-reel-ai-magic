Implement a production-stability refactor of Smart Reel around a validated, actual MP4 preview/export pipeline instead of a plan-first mock flow.

1. Mobile UI hardening
- Add global overflow protection so the editor never creates horizontal scroll or a white right-side gap.
- Refactor the editor shell/header/cards/action rows with `min-w-0`, responsive grids, safe widths, and wrapping buttons.
- Keep the preview player centered with fixed responsive aspect constraints.
- Make the validated Download/Export action visible and usable on mobile after preview generation.

2. Uploaded media validation and repair gate
- Expand clip metadata to include validation state, file size, duration, resolution, codec/support label, thumbnail, repair attempts, and failure reason.
- Validate each uploaded image/video before planning/rendering.
- For videos: load metadata, decode a real frame, capture thumbnail, detect likely unsupported MOV/HEVC/WebM cases, and automatically re-encode to H.264 MP4 with FFmpeg.wasm when decode/thumbnail validation fails.
- For images: decode and generate a thumbnail; fallback to reprocessing via canvas before marking ready.
- Block generation until every uploaded media item is ready; do not continue with broken media.

3. Real render engine with progress, timeout, and recovery
- Replace the fake `startRender` progress timer with actual preview rendering.
- Render cuts one-by-one into a canvas-backed video stream, with per-cut progress like `Rendering cut 3/12` plus a percentage.
- Add watchdog timeout protection per cut and per full render.
- If a cut fails, rebuild only that cut using its thumbnail/repaired source instead of freezing.
- If a render run stalls, stop the recorder/audio graph cleanly and restart from the last successful cut with one automatic retry.

4. Preview player stability
- Use one stable native HTML5 `<video controls playsInline preload="metadata">` element for the rendered reel.
- Verify the blob URL exists, file size is valid, duration is valid, and dimensions are non-zero before assigning it to the player.
- On player error, show `Preview failed. Rebuilding video automatically.` and trigger a rebuild instead of leaving a grey/sad-face/black player.
- Remove the old sequential fallback as the primary experience; fallback visuals are only used inside the renderer to keep frames visible.

5. Audio system fix
- Keep exactly one selected song for the entire reel: either uploaded custom song or one selected suggested AI song.
- Improve suggested song selection UI with clear selected state and preview controls.
- Validate uploaded song metadata/duration before rendering.
- During MP4 muxing, always map a single audio stream for the full reel; for AI-suggested songs without a real audio file, generate one consistent audible beat bed for preview/export.
- Before enabling download, require audio track expected, audio duration > 0, and non-zero playback/mux validation.

6. Reference reel/photo matching and trend engine
- Add `Instagram Trending Reel` to categories and expand the category set: Wedding, Haldi, Engagement, Birthday, Couple, Travel, Party, Festival, College, Business.
- Add a local trend-style preset engine for current reel patterns: velocity hooks, zoom punches, whip transitions, glow, flash cuts, cinematic slow-motion, and beat-drop pacing.
- Feed selected trend/category/reference data into the AI edit plan prompt so generated timelines use the right pacing, transitions, captions, grade, and camera motion.
- Surface reference-match notes in the plan and renderer so style decisions affect actual preview effects.

7. Cinematic effects and captions in actual render
- Apply visible per-cut effects in the renderer: motion zoom, dynamic crop, Ken Burns for photos, speed-ramp-like timing, glow/flash overlays, color-grade filters, vignette/film grain, and beat-synced cut timing.
- Keep captions optional with a direct `[ Paste Caption Here ]` style textarea.
- If caption input is empty, force no captions/text overlays.
- If filled, render animated captions into the actual generated preview/export, not just the plan UI.

8. Preview → edit → preview loop
- After a successful preview, show `Are you satisfied?` with quick tweak buttons: More cinematic, More transitions, Faster pace, More emotional, More glow, More Instagram style, More slow motion, and Custom request.
- Applying a tweak regenerates the AI plan and immediately rebuilds the preview.
- Add a `DONE` action that locks the current validated preview and exposes final download/export actions.

9. Export validation and QA gate
- Replace the export dialog’s plan-package behavior with validated MP4 download behavior.
- Add export formats: Instagram Reel, Story, YouTube Shorts, 16:9 YouTube, with aspect ratio/resolution reflected in render settings.
- Enable Download only after checks pass: file exists, size valid, video track exists, audio track exists/expected, duration valid, preview playable, no detected blank-frame failure.
- Add auto-QA during/after rendering: count visible frames, detect all-black/all-grey canvas frames, ensure each cut contributed frames, verify transitions/effects were drawn, and auto-rebuild once if any QA check fails.

Technical details
- Main changes are in `src/routes/editor.tsx`: split validation/render/export helpers into clearer units, replace timer-based render state, simplify preview state, and make mobile layout safe.
- Update `src/routes/api/edit-plan.ts` prompts/defaults for `Instagram Trending Reel`, expanded categories, optional captions, trend presets, single-song enforcement, and reference matching.
- Keep all rendering browser-side with existing FFmpeg.wasm dependencies; no native server rendering or long-running backend process will be introduced in this pass.
- Do not edit generated route files.