-- CreateTable
CREATE TABLE "Student" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "enrollmentNo" TEXT NOT NULL,
    "qrCode" TEXT NOT NULL,
    "qrCodeGenerated" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "Student_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Student_qrCode_key" ON "Student"("qrCode");
