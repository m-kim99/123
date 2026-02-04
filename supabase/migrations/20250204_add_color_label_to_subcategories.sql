-- Add color_label column to subcategories table
-- This column stores the hex color code (without #) for the color label
-- Example values: 'ffffff', 'e80000', 'ff7f00', 'ffff00', '26af00', '009eff', '8800a0', '7f4800', 'a5a5a5', '000000'

ALTER TABLE subcategories
ADD COLUMN IF NOT EXISTS color_label VARCHAR(6) DEFAULT NULL;

COMMENT ON COLUMN subcategories.color_label IS 'Hex color code (without #) for visual color label on subcategory cards';
