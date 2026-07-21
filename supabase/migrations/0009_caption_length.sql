-- Tighten the caption length cap from 150 to 105 characters so a caption can
-- never exceed three lines on the polaroid card (fixed 111px caption block,
-- Figma 191:3783). Keep in sync with CAPTION_MAX_LENGTH in src/lib/config.ts.
--
-- Existing longer captions are truncated rather than dropped so the constraint
-- can be applied without deleting anyone's content.
update captions
  set body = left(body, 105)
  where char_length(body) > 105;

alter table captions drop constraint if exists captions_body_check;
alter table captions add constraint captions_body_check
  check (char_length(body) <= 105);
