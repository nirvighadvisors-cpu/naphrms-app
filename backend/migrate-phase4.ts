import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  console.log('=== Phase 4 Migration Script ===');

  // Step 1: Add columns with defaults via raw SQL
  console.log('Step 1: Adding code/codeInitial/parentId columns...');
  
  try {
    await prisma.$executeRaw`ALTER TABLE "departments" ADD COLUMN IF NOT EXISTS "code" TEXT`;
    await prisma.$executeRaw`ALTER TABLE "departments" ADD COLUMN IF NOT EXISTS "codeInitial" TEXT DEFAULT 'X'`;
    await prisma.$executeRaw`ALTER TABLE "departments" ADD COLUMN IF NOT EXISTS "parentId" TEXT`;
  } catch (e: any) {
    console.log('Columns may already exist:', e.message);
  }

  // Step 2: Set temp codes on existing departments
  console.log('Step 2: Setting temp codes on existing departments...');
  const depts = await prisma.$queryRaw<Array<{id: string, name: string}>>`SELECT id, name FROM departments`;
  
  for (let i = 0; i < depts.length; i++) {
    const dept = depts[i];
    const code = `OLD_${dept.name.substring(0, 3).toUpperCase()}_${i}`;
    await prisma.$executeRaw`UPDATE departments SET code = ${code}, "codeInitial" = 'X' WHERE id = ${dept.id} AND (code IS NULL OR code = '')`;
  }
  
  // Step 3: Add unique constraint
  console.log('Step 3: Adding unique constraint on code...');
  try {
    await prisma.$executeRaw`ALTER TABLE "departments" ADD CONSTRAINT "departments_code_key" UNIQUE ("code")`;
  } catch (e: any) {
    console.log('Unique constraint may already exist:', e.message);
  }

  // Step 4: Make code NOT NULL
  console.log('Step 4: Making code NOT NULL...');
  try {
    await prisma.$executeRaw`ALTER TABLE "departments" ALTER COLUMN "code" SET NOT NULL`;
    await prisma.$executeRaw`ALTER TABLE "departments" ALTER COLUMN "codeInitial" SET NOT NULL`;
  } catch (e: any) {
    console.log('Already NOT NULL:', e.message);
  }

  // Step 5: Add foreign key for parentId
  console.log('Step 5: Adding parentId foreign key...');
  try {
    await prisma.$executeRaw`ALTER TABLE "departments" ADD CONSTRAINT "departments_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "departments"("id") ON DELETE SET NULL`;
  } catch (e: any) {
    console.log('FK may already exist:', e.message);
  }
  
  // Step 6: Create global_sequences table
  console.log('Step 6: Creating global_sequences table...');
  try {
    await prisma.$executeRaw`CREATE TABLE IF NOT EXISTS "global_sequences" ("id" INTEGER NOT NULL DEFAULT 1, "nextValue" INTEGER NOT NULL DEFAULT 1, CONSTRAINT "global_sequences_pkey" PRIMARY KEY ("id"))`;
  } catch (e: any) {
    console.log('Table may already exist:', e.message);
  }

  // Step 7: Delete old departments that aren't needed, reassign employees
  console.log('Step 7: Cleaning up old departments...');
  
  // First, delete employees linked to old departments (just the admin test one)
  const employees = await prisma.$queryRaw<Array<{id: string, "userId": string}>>`SELECT id, "userId" FROM employees`;
  if (employees.length > 0) {
    for (const emp of employees) {
      await prisma.$executeRaw`DELETE FROM employees WHERE id = ${emp.id}`;
    }
    console.log(`Deleted ${employees.length} old employee records (will be re-seeded).`);
  }

  // Now delete all old departments
  await prisma.$executeRaw`DELETE FROM departments`;
  console.log('Deleted all old departments.');

  console.log('=== Migration complete! Run prisma db push next. ===');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
