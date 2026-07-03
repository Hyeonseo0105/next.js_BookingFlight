-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Flight" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "airline" TEXT NOT NULL,
    "from" TEXT NOT NULL,
    "fromCode" TEXT NOT NULL,
    "to" TEXT NOT NULL,
    "toCode" TEXT NOT NULL,
    "toKr" TEXT NOT NULL DEFAULT '',
    "departureTime" TEXT NOT NULL,
    "arrivalTime" TEXT NOT NULL,
    "duration" TEXT NOT NULL,
    "price" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO "new_Flight" ("airline", "arrivalTime", "createdAt", "departureTime", "duration", "from", "fromCode", "id", "price", "to", "toCode") SELECT "airline", "arrivalTime", "createdAt", "departureTime", "duration", "from", "fromCode", "id", "price", "to", "toCode" FROM "Flight";
DROP TABLE "Flight";
ALTER TABLE "new_Flight" RENAME TO "Flight";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
