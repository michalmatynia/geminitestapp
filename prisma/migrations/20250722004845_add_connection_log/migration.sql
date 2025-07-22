-- CreateTable
CREATE TABLE "ConnectionLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "ip" TEXT,
    "userAgent" TEXT,
    "language" TEXT,
    "connectedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
