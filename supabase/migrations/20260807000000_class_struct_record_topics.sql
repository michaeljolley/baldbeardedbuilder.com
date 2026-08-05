/*
  Curated transcript topics for the class, struct, and record comparison.

  The video has no YouTube chapters. These markers give its transcript the conceptual outline
  a reader needs without changing the timed caption segments. Do not replace chapters that
  were authored before this migration reaches an environment.
*/

update public.video_transcripts
set chapters = '[
  {"start": 0, "title": "Overview"},
  {"start": 52, "title": "Reference and value semantics"},
  {"start": 77, "title": "Structs and classes in code"},
  {"start": 172, "title": "A real-world analogy"},
  {"start": 275, "title": "Equality"},
  {"start": 318, "title": "When to choose a struct"},
  {"start": 346, "title": "Records"},
  {"start": 408, "title": "When to choose a record"},
  {"start": 427, "title": "Record structs"}
]'::jsonb,
    chapters_updated_at = now()
where video_id = 'HAybBV-A1Gg'
  and coalesce(jsonb_array_length(chapters), 0) = 0;
