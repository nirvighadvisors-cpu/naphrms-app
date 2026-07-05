import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const holidays = [
  { date: '2026-01-26', name: 'Republic Day', isRestricted: false },
  { date: '2026-02-15', name: 'Mahashivratri', isRestricted: false },
  { date: '2026-02-19', name: 'Chhatrapati Shivaji Maharaj Jayanti', isRestricted: false },
  { date: '2026-03-03', name: 'Holi (Second Day)', isRestricted: false },
  { date: '2026-03-19', name: 'Gudhi Padwa', isRestricted: false },
  { date: '2026-03-21', name: 'Ramzan-Id (Id-ul-Fitra)', isRestricted: false },
  { date: '2026-03-26', name: 'Ram Navami', isRestricted: false },
  { date: '2026-03-31', name: 'Mahavir Janmakalyanak', isRestricted: false },
  { date: '2026-04-03', name: 'Good Friday', isRestricted: false },
  { date: '2026-04-14', name: 'Dr. Babasaheb Ambedkar Jayanti', isRestricted: false },
  { date: '2026-05-01', name: 'Maharashtra Din / Buddha Pournima', isRestricted: false },
  { date: '2026-05-28', name: 'Bakri Id (Id-uz-Zuha)', isRestricted: false },
  { date: '2026-06-26', name: 'Moharrum', isRestricted: false },
  { date: '2026-08-15', name: 'Independence Day / Parsi New Year (Shahenshahi)', isRestricted: false },
  { date: '2026-08-26', name: 'Id-e-Milad', isRestricted: false },
  { date: '2026-09-14', name: 'Ganesh Chaturthi', isRestricted: false },
  { date: '2026-10-02', name: 'Mahatma Gandhi Jayanti', isRestricted: false },
  { date: '2026-10-20', name: 'Dasara', isRestricted: false },
  { date: '2026-11-08', name: 'Diwali Amavasya (Laxmi Pujan)', isRestricted: false },
  { date: '2026-11-10', name: 'Diwali (Bali Pratipada)', isRestricted: false },
  { date: '2026-11-24', name: 'Guru Nanak Jayanti', isRestricted: false },
  { date: '2026-12-25', name: 'Christmas', isRestricted: false },
];

async function main() {
  for (const h of holidays) {
    const d = new Date(`${h.date}T00:00:00.000Z`);
    const year = d.getUTCFullYear();
    
    await prisma.holiday.upsert({
      where: { date: d },
      update: {
        name: h.name,
        isRestricted: h.isRestricted,
      },
      create: {
        name: h.name,
        date: d,
        year: year,
        isRestricted: h.isRestricted,
      },
    });
  }
  console.log('Successfully seeded 2026 holidays!');
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
