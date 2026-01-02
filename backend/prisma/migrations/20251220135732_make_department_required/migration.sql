-- RedefineTables
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Product" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "department" TEXT NOT NULL DEFAULT 'Geral',
    "subCategory" TEXT NOT NULL DEFAULT 'Outros',
    "category" TEXT,
    "animalType" TEXT,
    "price" REAL NOT NULL,
    "cost" REAL,
    "unit" TEXT NOT NULL,
    "stock" REAL DEFAULT 0,
    "trackStock" BOOLEAN NOT NULL DEFAULT false
);
INSERT INTO "new_Product" ("animalType", "category", "cost", "department", "id", "name", "price", "stock", "subCategory", "trackStock", "unit") SELECT "animalType", "category", "cost", coalesce("department", 'Geral') AS "department", "id", "name", "price", "stock", coalesce("subCategory", 'Outros') AS "subCategory", "trackStock", "unit" FROM "Product";
DROP TABLE "Product";
ALTER TABLE "new_Product" RENAME TO "Product";
PRAGMA foreign_key_check;
PRAGMA foreign_keys=ON;
