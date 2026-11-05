-- Migration 005: Update legacy category names to Diwali Style Icon and Sparkling Speaker
UPDATE categories
SET name = 'Diwali Style Icon'
WHERE name = 'Best Dressing';

UPDATE categories
SET name = 'Sparkling Speaker'
WHERE name = 'Best Speech';

