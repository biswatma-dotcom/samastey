/**
 * Seed all subjects for CBSE and ICSE, Classes 1–12, Academic Year 2026-27.
 * Run with: npx tsx prisma/seed-subjects.ts
 */
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// ---------------------------------------------------------------------------
// Subject definitions
// ---------------------------------------------------------------------------

type SubjectDef = { name: string; code: string; grade: number; board: 'CBSE' | 'ICSE' }

function def(board: 'CBSE' | 'ICSE', grade: number, name: string, shortCode: string): SubjectDef {
  return { name, code: `${board}-${shortCode}-${grade}`, grade, board }
}

const CBSE: SubjectDef[] = [
  // ── Classes 1–5 (Primary) ────────────────────────────────────────────────
  ...([1, 2, 3, 4, 5] as const).flatMap((g) => [
    def('CBSE', g, 'English',                    'ENG'),
    def('CBSE', g, 'Mathematics',                'MATH'),
    def('CBSE', g, 'Hindi',                      'HIN'),
    def('CBSE', g, 'Environmental Studies',      'EVS'),
  ]),

  // ── Classes 6–8 (Middle School) ──────────────────────────────────────────
  ...([6, 7, 8] as const).flatMap((g) => [
    def('CBSE', g, 'English',                    'ENG'),
    def('CBSE', g, 'Mathematics',                'MATH'),
    def('CBSE', g, 'Hindi',                      'HIN'),
    def('CBSE', g, 'Science',                    'SCI'),
    def('CBSE', g, 'Social Science',             'SST'),
    def('CBSE', g, 'Sanskrit',                   'SAN'),
    def('CBSE', g, 'Computer Science',           'CS'),
  ]),

  // ── Classes 9–10 (Secondary) ─────────────────────────────────────────────
  ...([9, 10] as const).flatMap((g) => [
    def('CBSE', g, 'English',                    'ENG'),
    def('CBSE', g, 'Mathematics',                'MATH'),
    def('CBSE', g, 'Hindi',                      'HIN'),
    def('CBSE', g, 'Science',                    'SCI'),
    def('CBSE', g, 'Social Science',             'SST'),
    def('CBSE', g, 'Sanskrit',                   'SAN'),
    def('CBSE', g, 'Information Technology',     'IT'),
    def('CBSE', g, 'Computer Applications',      'CA'),
  ]),

  // ── Classes 11–12 (Senior Secondary) ─────────────────────────────────────
  ...([11, 12] as const).flatMap((g) => [
    // Core / all streams
    def('CBSE', g, 'English',                    'ENG'),
    def('CBSE', g, 'Physical Education',         'PE'),
    // Science stream
    def('CBSE', g, 'Physics',                    'PHY'),
    def('CBSE', g, 'Chemistry',                  'CHEM'),
    def('CBSE', g, 'Mathematics',                'MATH'),
    def('CBSE', g, 'Biology',                    'BIO'),
    def('CBSE', g, 'Computer Science',           'CS'),
    def('CBSE', g, 'Informatics Practices',      'IP'),
    // Commerce stream
    def('CBSE', g, 'Accountancy',                'ACC'),
    def('CBSE', g, 'Business Studies',           'BST'),
    def('CBSE', g, 'Economics',                  'ECO'),
    def('CBSE', g, 'Applied Mathematics',        'AMATH'),
    // Humanities stream
    def('CBSE', g, 'History',                    'HIST'),
    def('CBSE', g, 'Geography',                  'GEO'),
    def('CBSE', g, 'Political Science',          'POL'),
    def('CBSE', g, 'Psychology',                 'PSY'),
    def('CBSE', g, 'Sociology',                  'SOC'),
  ]),
]

const ICSE: SubjectDef[] = [
  // ── Classes 1–5 (Primary) ────────────────────────────────────────────────
  ...([1, 2, 3, 4, 5] as const).flatMap((g) => [
    def('ICSE', g, 'English',                    'ENG'),
    def('ICSE', g, 'Mathematics',                'MATH'),
    def('ICSE', g, 'Environmental Science',      'EVS'),
    def('ICSE', g, 'Hindi',                      'HIN'),
    def('ICSE', g, 'Computer Applications',      'CA'),
  ]),

  // ── Classes 6–8 (Middle School) ──────────────────────────────────────────
  ...([6, 7, 8] as const).flatMap((g) => [
    def('ICSE', g, 'English',                    'ENG'),
    def('ICSE', g, 'Mathematics',                'MATH'),
    def('ICSE', g, 'Science',                    'SCI'),
    def('ICSE', g, 'History & Civics',           'HIST'),
    def('ICSE', g, 'Geography',                  'GEO'),
    def('ICSE', g, 'Hindi',                      'HIN'),
    def('ICSE', g, 'Computer Applications',      'CA'),
  ]),

  // ── Classes 9–10 (ICSE) ──────────────────────────────────────────────────
  ...([9, 10] as const).flatMap((g) => [
    def('ICSE', g, 'English Language',           'ENGL'),
    def('ICSE', g, 'English Literature',         'ENGLIT'),
    def('ICSE', g, 'Mathematics',                'MATH'),
    def('ICSE', g, 'Physics',                    'PHY'),
    def('ICSE', g, 'Chemistry',                  'CHEM'),
    def('ICSE', g, 'Biology',                    'BIO'),
    def('ICSE', g, 'History & Civics',           'HIST'),
    def('ICSE', g, 'Geography',                  'GEO'),
    def('ICSE', g, 'Computer Applications',      'CA'),
    def('ICSE', g, 'Economic Applications',      'ECOAPP'),
    def('ICSE', g, 'Hindi',                      'HIN'),
    def('ICSE', g, 'Environmental Applications', 'ENVAPP'),
  ]),

  // ── Classes 11–12 (ISC) ──────────────────────────────────────────────────
  ...([11, 12] as const).flatMap((g) => [
    // Core
    def('ICSE', g, 'English',                    'ENG'),
    // Science stream
    def('ICSE', g, 'Physics',                    'PHY'),
    def('ICSE', g, 'Chemistry',                  'CHEM'),
    def('ICSE', g, 'Mathematics',                'MATH'),
    def('ICSE', g, 'Biology',                    'BIO'),
    def('ICSE', g, 'Computer Science',           'CS'),
    // Commerce stream
    def('ICSE', g, 'Accounts',                   'ACC'),
    def('ICSE', g, 'Commerce',                   'COM'),
    def('ICSE', g, 'Economics',                  'ECO'),
    def('ICSE', g, 'Commercial Applications',    'COMAPP'),
    // Humanities stream
    def('ICSE', g, 'History',                    'HIST'),
    def('ICSE', g, 'Geography',                  'GEO'),
    def('ICSE', g, 'Political Science',          'POL'),
    def('ICSE', g, 'Psychology',                 'PSY'),
    def('ICSE', g, 'Sociology',                  'SOC'),
    def('ICSE', g, 'Physical Education',         'PE'),
  ]),
]

const ALL_SUBJECTS = [...CBSE, ...ICSE]

// ---------------------------------------------------------------------------
// Seed
// ---------------------------------------------------------------------------

async function main() {
  console.log(`Seeding ${ALL_SUBJECTS.length} subjects (CBSE + ICSE, Classes 1–12)...`)

  const result = await prisma.subject.createMany({
    data: ALL_SUBJECTS,
    skipDuplicates: true,
  })

  console.log(`✓ Done — ${result.count} subjects inserted.`)
  console.log(`  CBSE: ${CBSE.length} defined`)
  console.log(`  ICSE: ${ICSE.length} defined`)
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
