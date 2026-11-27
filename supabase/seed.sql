-- Catalogue seed. Idempotent: safe to run repeatedly.
-- Prices in pence, VAT-inclusive (D-006). Area rates are pence per cm².

insert into public.tax_settings (id) values (true) on conflict (id) do nothing;

-- ─── Divisions (PRD §04) ────────────────────────────────────────────────────
insert into public.divisions (slug, name, tagline, description, sort_order) values
  ('labels-stickers', 'Labels & Stickers', 'Any shape, any run.',
    'Product labels, packaging seals and die-cut stickers on vinyl, kraft and holographic stock.', 1),
  ('race-event-numbers', 'Race & Event Numbers', 'Every runner, numbered.',
    'Tear-proof race bibs and event numbers, merged straight from your entrant list.', 2),
  ('mtb-boards', 'MTB Boards', 'Built for the trail.',
    'Rigid, weatherproof handlebar number boards for mountain-bike and cyclocross events.', 3),
  ('stamps', 'Stamps', 'Sharp marks, every time.',
    'Self-inking and wooden-handle rubber stamps for addresses, logos and approvals.', 4),
  ('trophies', 'Trophies', 'Engraved to last.',
    'Engraved plates and awards in brass, aluminium and acrylic.', 5),
  ('laser-cut', 'Laser-cut Work', 'Cut to the tenth of a millimetre.',
    'Signs, displays and shapes cut from birch ply and acrylic.', 6)
on conflict (slug) do update set
  name = excluded.name, tagline = excluded.tagline, description = excluded.description, sort_order = excluded.sort_order;

-- ─── Materials ──────────────────────────────────────────────────────────────
insert into public.materials (slug, name, description, price_factor_bps) values
  ('white-vinyl', 'White gloss vinyl', 'Waterproof, permanent adhesive.', 10000),
  ('clear-vinyl', 'Clear vinyl', 'Transparent, no-label look.', 11000),
  ('kraft-paper', 'Kraft paper', 'Natural brown, uncoated.', 9500),
  ('holographic', 'Holographic vinyl', 'Rainbow foil effect.', 14000),
  ('tyvek', 'Tyvek', 'Tear-proof, water-resistant race standard.', 10000),
  ('synthetic-paper', 'Waterproof synthetic', 'Heavier, fully waterproof stock.', 12000),
  ('polypropylene-1mm', '1 mm polypropylene', 'Flexible, crack-resistant board.', 10000),
  ('correx-2mm', '2 mm correx', 'Lightweight fluted board.', 9000),
  ('self-inking', 'Self-inking mount', 'Built-in ink pad, 10,000+ impressions.', 10000),
  ('wooden-handle', 'Wooden handle', 'Classic mount, separate ink pad.', 8500),
  ('brushed-brass', 'Brushed brass', 'Warm metallic finish.', 11000),
  ('silver-aluminium', 'Silver aluminium', 'Bright anodised finish.', 10000),
  ('black-acrylic', 'Black acrylic', 'Gloss black, engraves white.', 9500),
  ('birch-ply-3mm', '3 mm birch plywood', 'Natural wood grain.', 10000),
  ('clear-acrylic-3mm', '3 mm clear acrylic', 'Glass-like, polished edges.', 13000),
  ('mirror-acrylic-2mm', '2 mm mirror acrylic', 'Gold or silver mirror.', 16000)
on conflict (slug) do update set
  name = excluded.name, description = excluded.description, price_factor_bps = excluded.price_factor_bps;

-- ─── Products: one parameter-driven product per division ────────────────────
insert into public.products (
  division_id, slug, name, summary, product_type, parameters,
  bleed_mm, safe_margin_mm, dpi, supports_designer, supports_upload, supports_variable_data, sort_order
)
select d.id, p.slug, p.name, p.summary, p.product_type, p.parameters::jsonb,
       p.bleed_mm, p.safe_margin_mm, p.dpi, p.supports_designer, p.supports_upload, p.supports_variable_data, 1
from (values
  ('labels-stickers', 'custom-labels', 'Custom Labels & Stickers',
    'Any size from 20 mm to 300 mm, on four stocks.', 'Labels',
    '{"size":{"mode":"custom","widthMm":{"min":20,"max":300,"step":1,"default":75},"heightMm":{"min":20,"max":300,"step":1,"default":50},"presets":[{"label":"50 × 50 mm","widthMm":50,"heightMm":50},{"label":"75 × 50 mm","widthMm":75,"heightMm":50},{"label":"100 × 100 mm","widthMm":100,"heightMm":100}]},"orientations":["landscape","portrait"],"quantity":{"min":10,"max":50000,"step":1,"default":100}}',
    2, 2, 300, true, true, false),
  ('race-event-numbers', 'race-bibs', 'Race Numbers',
    'Tear-proof bibs with names and numbers merged from a CSV.', 'RaceNumbers',
    '{"size":{"mode":"custom","widthMm":{"min":100,"max":300,"step":1,"default":210},"heightMm":{"min":100,"max":300,"step":1,"default":148},"presets":[{"label":"A5 (210 × 148 mm)","widthMm":210,"heightMm":148},{"label":"200 × 150 mm","widthMm":200,"heightMm":150},{"label":"180 × 140 mm","widthMm":180,"heightMm":140}]},"orientations":["landscape","portrait"],"quantity":{"min":10,"max":20000,"step":1,"default":200}}',
    3, 5, 300, true, true, true),
  ('mtb-boards', 'mtb-number-boards', 'MTB Number Boards',
    'Rigid handlebar boards with rider numbers merged from a CSV.', 'MTBBoards',
    '{"size":{"mode":"preset","presets":[{"label":"180 × 220 mm","widthMm":180,"heightMm":220},{"label":"200 × 240 mm","widthMm":200,"heightMm":240}]},"orientations":["portrait"],"quantity":{"min":1,"max":5000,"step":1,"default":50}}',
    3, 8, 300, true, true, true),
  ('stamps', 'custom-stamps', 'Custom Stamps',
    'Address, logo and approval stamps in four impression sizes.', 'Stamps',
    '{"size":{"mode":"preset","presets":[{"label":"38 × 14 mm","widthMm":38,"heightMm":14},{"label":"47 × 18 mm","widthMm":47,"heightMm":18},{"label":"58 × 22 mm","widthMm":58,"heightMm":22},{"label":"60 × 40 mm","widthMm":60,"heightMm":40}]},"orientations":["landscape"],"quantity":{"min":1,"max":500,"step":1,"default":1}}',
    0, 1, 600, true, true, false),
  ('trophies', 'engraved-plates', 'Engraved Trophy Plates',
    'Engraved plates priced by size and lettering.', 'Trophies',
    '{"size":{"mode":"preset","presets":[{"label":"70 × 20 mm","widthMm":70,"heightMm":20},{"label":"90 × 30 mm","widthMm":90,"heightMm":30},{"label":"120 × 40 mm","widthMm":120,"heightMm":40}]},"orientations":["landscape"],"quantity":{"min":1,"max":1000,"step":1,"default":10}}',
    0, 2, 600, true, false, true),
  ('laser-cut', 'laser-cut-signs', 'Laser-cut Signs',
    'Custom signs and shapes cut from ply or acrylic, 50–600 mm.', 'LaserCut',
    '{"size":{"mode":"custom","widthMm":{"min":50,"max":600,"step":1,"default":300},"heightMm":{"min":50,"max":600,"step":1,"default":200},"presets":[{"label":"200 × 200 mm","widthMm":200,"heightMm":200},{"label":"300 × 200 mm","widthMm":300,"heightMm":200},{"label":"450 × 300 mm","widthMm":450,"heightMm":300}]},"orientations":["landscape","portrait"],"quantity":{"min":1,"max":1000,"step":1,"default":5}}',
    0, 5, 600, true, true, false)
) as p (division_slug, slug, name, summary, product_type, parameters,
        bleed_mm, safe_margin_mm, dpi, supports_designer, supports_upload, supports_variable_data)
join public.divisions d on d.slug = p.division_slug
on conflict (division_id, slug) do update set
  name = excluded.name, summary = excluded.summary, product_type = excluded.product_type,
  parameters = excluded.parameters, bleed_mm = excluded.bleed_mm, safe_margin_mm = excluded.safe_margin_mm,
  dpi = excluded.dpi, supports_designer = excluded.supports_designer, supports_upload = excluded.supports_upload,
  supports_variable_data = excluded.supports_variable_data;

-- ─── Product ↔ material ─────────────────────────────────────────────────────
insert into public.product_materials (product_id, material_id, is_default)
select pr.id, m.id, x.is_default
from (values
  ('custom-labels', 'white-vinyl', true), ('custom-labels', 'clear-vinyl', false),
  ('custom-labels', 'kraft-paper', false), ('custom-labels', 'holographic', false),
  ('race-bibs', 'tyvek', true), ('race-bibs', 'synthetic-paper', false),
  ('mtb-number-boards', 'polypropylene-1mm', true), ('mtb-number-boards', 'correx-2mm', false),
  ('custom-stamps', 'self-inking', true), ('custom-stamps', 'wooden-handle', false),
  ('engraved-plates', 'brushed-brass', true), ('engraved-plates', 'silver-aluminium', false),
  ('engraved-plates', 'black-acrylic', false),
  ('laser-cut-signs', 'birch-ply-3mm', true), ('laser-cut-signs', 'clear-acrylic-3mm', false),
  ('laser-cut-signs', 'mirror-acrylic-2mm', false)
) as x (product_slug, material_slug, is_default)
join public.products pr on pr.slug = x.product_slug
join public.materials m on m.slug = x.material_slug
on conflict (product_id, material_id) do update set is_default = excluded.is_default;

-- ─── Pricing rules ──────────────────────────────────────────────────────────
insert into public.pricing_rules (
  product_id, strategy, setup_fee_minor, unit_base_minor, area_rate_minor_per_cm2, per_character_minor, min_unit_minor
)
select pr.id, x.strategy::public.pricing_strategy, x.setup_fee, x.unit_base, x.area_rate, x.per_char, x.min_unit
from (values
  ('custom-labels', 'area', 500, 5, 0.9000, 0, 8),
  ('race-bibs', 'per_unit', 1000, 40, 0.2500, 0, 60),
  ('mtb-number-boards', 'per_unit', 1000, 150, 0.6000, 0, 250),
  ('custom-stamps', 'per_unit', 0, 1200, 8.0000, 0, 1200),
  ('engraved-plates', 'per_character', 0, 900, 5.0000, 8, 900),
  ('laser-cut-signs', 'area', 500, 200, 3.0000, 0, 400)
) as x (product_slug, strategy, setup_fee, unit_base, area_rate, per_char, min_unit)
join public.products pr on pr.slug = x.product_slug
on conflict (product_id) do update set
  strategy = excluded.strategy, setup_fee_minor = excluded.setup_fee_minor, unit_base_minor = excluded.unit_base_minor,
  area_rate_minor_per_cm2 = excluded.area_rate_minor_per_cm2, per_character_minor = excluded.per_character_minor,
  min_unit_minor = excluded.min_unit_minor;

-- ─── Gallery: illustrated sample jobs (D-039); admins replace them with real photos ──
insert into public.gallery_items (division_id, title, description, image_path, sort_order)
select d.id, g.title, g.description, g.image_path, g.sort_order
from (values
  ('labels-stickers', 'Jar labels for a honey producer', '75 × 50 mm on white gloss vinyl, 500 per flavour.', '/gallery/honey-jar-labels.svg', 1),
  ('labels-stickers', 'Die-cut brand stickers', 'Mixed shapes on white vinyl for a coffee roaster and a plant shop.', '/gallery/die-cut-stickers.svg', 2),
  ('race-event-numbers', 'Riverside 10K race numbers', 'A5 Tyvek, 1,200 bibs merged from the entry list with first names.', '/gallery/riverside-10k-bibs.svg', 1),
  ('race-event-numbers', 'Trail relay team bibs', 'Waterproof synthetic, team and leg printed per runner.', '/gallery/trail-relay-bibs.svg', 2),
  ('mtb-boards', 'Enduro number boards', '180 × 220 mm polypropylene, numbered 1–150.', '/gallery/enduro-number-boards.svg', 1),
  ('stamps', 'Studio address stamp', '58 × 22 mm self-inking, three lines of text.', '/gallery/address-stamp.svg', 1),
  ('trophies', 'Club end-of-season plates', '90 × 30 mm brushed brass, 24 engraved names.', '/gallery/club-trophy-plates.svg', 1),
  ('laser-cut', 'Café wall sign', '450 × 300 mm birch ply, cut and engraved.', '/gallery/cafe-sign-laser-cut.svg', 1)
) as g (division_slug, title, description, image_path, sort_order)
join public.divisions d on d.slug = g.division_slug
where not exists (select 1 from public.gallery_items gi where gi.image_path = g.image_path);

-- ─── Volume tiers: defaults from 100 units (PRD §05), stamps override ──────
insert into public.volume_tiers (product_id, min_quantity, discount_bps) values
  (null, 100, 1000), (null, 250, 1500), (null, 500, 2000), (null, 1000, 2500)
on conflict (min_quantity) where product_id is null do update set discount_bps = excluded.discount_bps;

insert into public.volume_tiers (product_id, min_quantity, discount_bps)
select pr.id, x.min_qty, x.bps
from (values (10, 500), (25, 1000), (50, 1500)) as x (min_qty, bps)
cross join public.products pr
where pr.slug = 'custom-stamps'
on conflict (product_id, min_quantity) where product_id is not null do update set discount_bps = excluded.discount_bps;
