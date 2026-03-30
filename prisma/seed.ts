import { PrismaClient, AvailabilityType, ProficiencyLevel } from '@prisma/client';
import { faker } from '@faker-js/faker';

const prisma = new PrismaClient();

// Helper: pick N random items from an array
function pickRandom<T>(arr: T[], count: number): T[] {
  return [...arr].sort(() => 0.5 - Math.random()).slice(0, count);
}

async function main() {
  const dbHackathons = await Promise.all([
    prisma.hackathon.upsert({
      where: { name: 'HackMIT 2025' },
      update: {},
      create: {
        name: 'HackMIT 2025',
        startDate: new Date('2025-10-01'),
        endDate: new Date('2025-10-03'),
        website: 'https://hackmit.org',
      },
    }),
    prisma.hackathon.upsert({
      where: { name: 'ETHGlobal 2025' },
      update: {},
      create: {
        name: 'ETHGlobal 2025',
        startDate: new Date('2025-11-15'),
        endDate: new Date('2025-11-17'),
        website: 'https://ethglobal.com',
      },
    }),
    prisma.hackathon.upsert({
      where: { name: 'HackIndia 2025' },
      update: {},
      create: {
        name: 'HackIndia 2025',
        startDate: new Date('2025-12-01'),
        endDate: new Date('2025-12-03'),
        website: 'https://hackindia.xyz',
      },
    }),
    prisma.hackathon.upsert({
      where: { name: 'MLH Local Hack Day' },
      update: {},
      create: {
        name: 'MLH Local Hack Day',
        startDate: new Date('2025-09-20'),
        endDate: new Date('2025-09-21'),
        website: 'https://mlh.io',
      },
    }),
  ]);

  console.log(`Created ${dbHackathons.length} hackathons`);
  console.log('Starting database seeding...');

  // 1. SKILLS - canonical dictionary
  const coreSkills = [
    'Node.js', 'React', 'TypeScript', 'PostgreSQL',
    'Python', 'Figma', 'UI/UX', 'MongoDB',
    'Docker', 'AWS', 'GraphQL', 'Next.js',
  ];

  const dbSkills = [];
  for (const skillName of coreSkills) {
    const skill = await prisma.skill.upsert({
      where: { name: skillName },
      update: {},
      create: { name: skillName },
    });
    dbSkills.push(skill);
  }
  console.log(`Created ${dbSkills.length} core skills.`);

  // 2. USERS - 20 candidates with full algorithm metadata
  const proficiencyLevels: ProficiencyLevel[] = [
    ProficiencyLevel.BEGINNER,
    ProficiencyLevel.INTERMEDIATE,
    ProficiencyLevel.EXPERT,
  ];

  const availabilityTypes: AvailabilityType[] = [
    AvailabilityType.FULL_TIME,
    AvailabilityType.PART_TIME,
    AvailabilityType.WEEKENDS_ONLY,
  ];

  const dbUsers = [];

  for (let i = 0; i < 20; i++) {
    const userSkills = pickRandom(dbSkills, Math.floor(Math.random() * 3) + 2).map(skill => ({
      skillId: skill.id,
      proficiency: proficiencyLevels[Math.floor(Math.random() * proficiencyLevels.length)],
    }));

    const user = await prisma.user.create({
      data: {
        name: faker.person.fullName(),
        email: faker.internet.email(),
        password: 'dummy_hashed_password',
        timezoneOffset: faker.number.int({ min: -12, max: 14 }),
        reliabilityScore: faker.number.int({ min: 30, max: 100 }),
        availability: availabilityTypes[Math.floor(Math.random() * availabilityTypes.length)],
        skills: {
          create: userSkills,
        },
      },
    });

    dbUsers.push(user);
  }
  console.log(`Created ${dbUsers.length} candidates with skills, proficiency, and metrics.`);

  // 3. TEAMS
  const teamLeaders = dbUsers.slice(0, 4);
  const dbTeams = [];

  for (let i = 0; i < 4; i++) {
    const neededSkills = pickRandom(dbSkills, Math.floor(Math.random() * 2) + 2);

    const team = await prisma.team.create({
      data: {
        name: `Team ${faker.word.adjective()} ${faker.word.noun()}`,
        hackathonId: dbHackathons[i].id,
        description: faker.lorem.sentence(),
        leaderId: teamLeaders[i].id,
        maxSize: 4,
        status: 'FORMING',
        requiredSkills: {
          create: neededSkills.map(skill => ({
            skillId: skill.id,
          })),
        },
      },
    });

    dbTeams.push(team);
  }
  console.log(`Created ${dbTeams.length} teams with required skills.`);

  // 4. MATCHES
  const candidates = dbUsers.slice(4);

  for (const team of dbTeams) {
    const invitedCandidates = pickRandom(candidates, 3);

    for (const candidate of invitedCandidates) {
      await prisma.match.create({
        data: {
          teamId: team.id,
          senderId: team.leaderId,
          receiverId: candidate.id,
          score: faker.number.int({ min: 40, max: 99 }),
          status: 'PENDING',
        },
      });
    }
  }
  console.log('Created match invites for all teams.');

  // 5. TEAM MEMBERS
  for (const team of dbTeams) {
    const member = candidates[dbTeams.indexOf(team)];

    await prisma.teamMember.create({
      data: {
        teamId: team.id,
        userId: member.id,
      },
    });
  }
  console.log('Created accepted team members.');

  console.log('Seeding complete!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
