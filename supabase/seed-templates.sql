-- Starter templates. Positions are fractions of the print area so each template fits every size (D-049).
-- Text marked with a placeholder is filled from CSV columns in variable-data jobs.
insert into public.templates (product_id, name, scene, is_default, sort_order)
select p.id, t.name, t.scene::jsonb, t.is_default, t.sort_order
from (values
  ('custom-labels', 'Classic product label', true, 1, '{"background":"#ffffff","elements":[
    {"id":"title","type":"text","x":0.05,"y":0.1,"width":0.9,"height":0.4,"text":"Hollow Pine","fontFamily":"playfair-display","fontWeight":700,"color":"#3c3226","align":"center"},
    {"id":"subtitle","type":"text","x":0.1,"y":0.54,"width":0.8,"height":0.22,"text":"wildflower honey","fontFamily":"playfair-display","fontWeight":400,"color":"#8a6a3b","align":"center"},
    {"id":"detail","type":"text","x":0.25,"y":0.8,"width":0.5,"height":0.16,"text":"340 g","fontFamily":"inter","fontWeight":400,"color":"#3c3226","align":"center"}]}'),
  ('custom-labels', 'Bold sticker', false, 2, '{"background":"#ff6b4a","elements":[
    {"id":"title","type":"text","x":0.05,"y":0.15,"width":0.9,"height":0.45,"text":"GOOD COFFEE","fontFamily":"archivo-black","fontWeight":400,"color":"#ffffff","align":"center"},
    {"id":"subtitle","type":"text","x":0.15,"y":0.66,"width":0.7,"height":0.2,"text":"roasted in Lewes","fontFamily":"inter","fontWeight":700,"color":"#ffffff","align":"center"}]}'),
  ('race-bibs', 'Event race number', true, 1, '{"background":"#ffffff","elements":[
    {"id":"band","type":"rect","x":0,"y":0,"width":1,"height":0.2,"fill":"#0d5c75"},
    {"id":"event","type":"text","x":0.05,"y":0.03,"width":0.9,"height":0.14,"text":"RIVERSIDE 10K 2026","fontFamily":"inter","fontWeight":700,"color":"#ffffff","align":"center"},
    {"id":"number","type":"text","x":0.05,"y":0.25,"width":0.9,"height":0.5,"text":"1042","fontFamily":"archivo-black","fontWeight":400,"color":"#13212b","align":"center","placeholder":"number"},
    {"id":"name","type":"text","x":0.1,"y":0.78,"width":0.8,"height":0.18,"text":"PRIYA","fontFamily":"oswald","fontWeight":700,"color":"#0d5c75","align":"center","placeholder":"name"}]}'),
  ('mtb-number-boards', 'Enduro number board', true, 1, '{"background":"#ffffff","elements":[
    {"id":"event","type":"text","x":0.05,"y":0.03,"width":0.9,"height":0.14,"text":"GLEN ENDURO","fontFamily":"oswald","fontWeight":700,"color":"#e63946","align":"center"},
    {"id":"number","type":"text","x":0.05,"y":0.2,"width":0.9,"height":0.6,"text":"88","fontFamily":"archivo-black","fontWeight":400,"color":"#13212b","align":"center","placeholder":"number"},
    {"id":"category","type":"text","x":0.1,"y":0.84,"width":0.8,"height":0.12,"text":"ELITE","fontFamily":"inter","fontWeight":700,"color":"#e63946","align":"center","placeholder":"category"}]}'),
  ('custom-stamps', 'Three-line address', true, 1, '{"background":"#ffffff","elements":[
    {"id":"line1","type":"text","x":0,"y":0.02,"width":1,"height":0.36,"text":"Ashdown Studio","fontFamily":"roboto-slab","fontWeight":700,"color":"#1f3a93","align":"center"},
    {"id":"line2","type":"text","x":0,"y":0.4,"width":1,"height":0.28,"text":"14 Mill Lane, Lewes","fontFamily":"inter","fontWeight":400,"color":"#1f3a93","align":"center"},
    {"id":"line3","type":"text","x":0,"y":0.7,"width":1,"height":0.28,"text":"BN7 2AA","fontFamily":"inter","fontWeight":400,"color":"#1f3a93","align":"center"}]}'),
  ('engraved-plates', 'Award plate', true, 1, '{"background":"#c9a94b","elements":[
    {"id":"title","type":"text","x":0.03,"y":0.05,"width":0.94,"height":0.5,"text":"Player of the Season","fontFamily":"playfair-display","fontWeight":700,"color":"#2b2b2b","align":"center"},
    {"id":"name","type":"text","x":0.08,"y":0.58,"width":0.84,"height":0.36,"text":"Ellie Marsh 2025/26","fontFamily":"playfair-display","fontWeight":400,"color":"#2b2b2b","align":"center","placeholder":"name"}]}'),
  ('laser-cut-signs', 'Shop sign', true, 1, '{"background":"#d9ae80","elements":[
    {"id":"title","type":"text","x":0.05,"y":0.12,"width":0.9,"height":0.52,"text":"Kiln","fontFamily":"playfair-display","fontWeight":700,"color":"#4a2f1b","align":"center"},
    {"id":"subtitle","type":"text","x":0.1,"y":0.7,"width":0.8,"height":0.18,"text":"COFFEE + CERAMICS","fontFamily":"inter","fontWeight":700,"color":"#4a2f1b","align":"center"}]}')
) as t (product_slug, name, is_default, sort_order, scene)
join public.products p on p.slug = t.product_slug
where not exists (select 1 from public.templates x where x.product_id = p.id and x.name = t.name);
