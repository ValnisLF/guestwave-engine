-- Drop legacy Home content columns now replaced by pageContent JSON sections.
ALTER TABLE "Property" DROP COLUMN IF EXISTS "homeHeroTitle";
ALTER TABLE "Property" DROP COLUMN IF EXISTS "homeHeroSubtitle";
ALTER TABLE "Property" DROP COLUMN IF EXISTS "homeDescription";
