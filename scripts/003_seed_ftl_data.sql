-- Seed FDA Food Traceability List (FTL) Data
-- Based on FDA's official FTL published in November 2022

-- Insert food categories
INSERT INTO public.food_categories (category_name, category_code, description) VALUES
('Leafy Greens', 'FTL-001', 'Fresh and fresh-cut leafy greens'),
('Herbs', 'FTL-002', 'Fresh herbs (excluding whole plants)'),
('Melons', 'FTL-003', 'Whole and fresh-cut melons'),
('Peppers', 'FTL-004', 'Fresh peppers'),
('Sprouts', 'FTL-005', 'All types of sprouts'),
('Tomatoes', 'FTL-006', 'Fresh tomatoes'),
('Tropical Tree Fruits', 'FTL-007', 'Tropical tree fruits'),
('Cucumbers', 'FTL-008', 'Fresh cucumbers'),
('Fresh-Cut Fruits and Vegetables', 'FTL-009', 'Fresh-cut fruits and vegetables'),
('Shell Eggs', 'FTL-010', 'Chicken shell eggs'),
('Nut Butters', 'FTL-011', 'Peanut and tree nut butters'),
('Fresh Soft Cheeses', 'FTL-012', 'Soft and semi-soft fresh cheeses'),
('Fresh Hard Cheeses', 'FTL-013', 'Hard cheeses'),
('RTE Salads', 'FTL-014', 'Refrigerated ready-to-eat salads'),
('Finfish', 'FTL-015', 'Fresh and frozen finfish'),
('Smoked Finfish', 'FTL-016', 'Smoked finfish'),
('Crustaceans', 'FTL-017', 'Fresh and frozen crustaceans'),
('Molluscan Shellfish', 'FTL-018', 'Fresh and frozen molluscan shellfish')
ON CONFLICT (category_code) DO NOTHING;

-- Insert specific foods from FTL
INSERT INTO public.ftl_foods (category_id, food_name, food_code, variety, requires_temperature_control, shelf_life_days) VALUES
-- Leafy Greens
((SELECT id FROM public.food_categories WHERE category_code = 'FTL-001'), 'Arugula', 'LG-001', NULL, true, 7),
((SELECT id FROM public.food_categories WHERE category_code = 'FTL-001'), 'Butter Lettuce', 'LG-002', NULL, true, 7),
((SELECT id FROM public.food_categories WHERE category_code = 'FTL-001'), 'Cabbage', 'LG-003', NULL, true, 14),
((SELECT id FROM public.food_categories WHERE category_code = 'FTL-001'), 'Iceberg Lettuce', 'LG-004', NULL, true, 7),
((SELECT id FROM public.food_categories WHERE category_code = 'FTL-001'), 'Kale', 'LG-005', NULL, true, 7),
((SELECT id FROM public.food_categories WHERE category_code = 'FTL-001'), 'Romaine Lettuce', 'LG-006', NULL, true, 7),
((SELECT id FROM public.food_categories WHERE category_code = 'FTL-001'), 'Spinach', 'LG-007', NULL, true, 5),
((SELECT id FROM public.food_categories WHERE category_code = 'FTL-001'), 'Spring Mix', 'LG-008', NULL, true, 5),

-- Herbs
((SELECT id FROM public.food_categories WHERE category_code = 'FTL-002'), 'Basil', 'HB-001', NULL, true, 5),
((SELECT id FROM public.food_categories WHERE category_code = 'FTL-002'), 'Cilantro', 'HB-002', NULL, true, 5),
((SELECT id FROM public.food_categories WHERE category_code = 'FTL-002'), 'Parsley', 'HB-003', NULL, true, 7),

-- Melons
((SELECT id FROM public.food_categories WHERE category_code = 'FTL-003'), 'Cantaloupe', 'ML-001', NULL, true, 7),
((SELECT id FROM public.food_categories WHERE category_code = 'FTL-003'), 'Honeydew', 'ML-002', NULL, true, 7),
((SELECT id FROM public.food_categories WHERE category_code = 'FTL-003'), 'Watermelon', 'ML-003', NULL, true, 7),

-- Peppers
((SELECT id FROM public.food_categories WHERE category_code = 'FTL-004'), 'Bell Pepper', 'PP-001', NULL, true, 7),
((SELECT id FROM public.food_categories WHERE category_code = 'FTL-004'), 'Jalapeño', 'PP-002', NULL, true, 7),

-- Sprouts
((SELECT id FROM public.food_categories WHERE category_code = 'FTL-005'), 'Alfalfa Sprouts', 'SP-001', NULL, true, 3),
((SELECT id FROM public.food_categories WHERE category_code = 'FTL-005'), 'Bean Sprouts', 'SP-002', NULL, true, 3),

-- Tomatoes
((SELECT id FROM public.food_categories WHERE category_code = 'FTL-006'), 'Cherry Tomatoes', 'TM-001', NULL, true, 7),
((SELECT id FROM public.food_categories WHERE category_code = 'FTL-006'), 'Roma Tomatoes', 'TM-002', NULL, true, 7),
((SELECT id FROM public.food_categories WHERE category_code = 'FTL-006'), 'Vine-Ripened Tomatoes', 'TM-003', NULL, true, 7),

-- Tropical Tree Fruits
((SELECT id FROM public.food_categories WHERE category_code = 'FTL-007'), 'Mango', 'TF-001', NULL, true, 7),
((SELECT id FROM public.food_categories WHERE category_code = 'FTL-007'), 'Papaya', 'TF-002', NULL, true, 5),

-- Cucumbers
((SELECT id FROM public.food_categories WHERE category_code = 'FTL-008'), 'Cucumber', 'CU-001', NULL, true, 7),

-- Shell Eggs
((SELECT id FROM public.food_categories WHERE category_code = 'FTL-010'), 'Shell Eggs', 'EG-001', 'Grade A', true, 30),

-- Nut Butters
((SELECT id FROM public.food_categories WHERE category_code = 'FTL-011'), 'Peanut Butter', 'NB-001', NULL, false, 365),
((SELECT id FROM public.food_categories WHERE category_code = 'FTL-011'), 'Almond Butter', 'NB-002', NULL, false, 365),

-- Soft Cheeses
((SELECT id FROM public.food_categories WHERE category_code = 'FTL-012'), 'Brie', 'CH-001', NULL, true, 30),
((SELECT id FROM public.food_categories WHERE category_code = 'FTL-012'), 'Queso Fresco', 'CH-002', NULL, true, 21),
((SELECT id FROM public.food_categories WHERE category_code = 'FTL-012'), 'Ricotta', 'CH-003', NULL, true, 14),

-- Finfish
((SELECT id FROM public.food_categories WHERE category_code = 'FTL-015'), 'Salmon', 'FF-001', 'Atlantic', true, 3),
((SELECT id FROM public.food_categories WHERE category_code = 'FTL-015'), 'Tuna', 'FF-002', NULL, true, 3),
((SELECT id FROM public.food_categories WHERE category_code = 'FTL-015'), 'Cod', 'FF-003', NULL, true, 3),

-- Crustaceans
((SELECT id FROM public.food_categories WHERE category_code = 'FTL-017'), 'Shrimp', 'CR-001', NULL, true, 2),
((SELECT id FROM public.food_categories WHERE category_code = 'FTL-017'), 'Lobster', 'CR-002', NULL, true, 2),
((SELECT id FROM public.food_categories WHERE category_code = 'FTL-017'), 'Crab', 'CR-003', NULL, true, 2),

-- Molluscan Shellfish
((SELECT id FROM public.food_categories WHERE category_code = 'FTL-018'), 'Oysters', 'MS-001', NULL, true, 7),
((SELECT id FROM public.food_categories WHERE category_code = 'FTL-018'), 'Clams', 'MS-002', NULL, true, 7),
((SELECT id FROM public.food_categories WHERE category_code = 'FTL-018'), 'Mussels', 'MS-003', NULL, true, 7)
ON CONFLICT (food_code) DO NOTHING;
