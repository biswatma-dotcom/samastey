export const CBSE_CLASS10_MATH = {
  subject: {
    name: 'Mathematics',
    code: 'CBSE-MATH-10',
    grade: 10,
    board: 'CBSE' as const,
  },
  concepts: [
    {
      title: 'Real Numbers',
      description:
        'Understanding the properties of real numbers including Euclid\'s division algorithm, the Fundamental Theorem of Arithmetic, irrational numbers, and decimal expansions of rational numbers.',
      orderIndex: 1,
      estimatedMinutes: 90,
      prerequisites: [],
      objectives: [
        'Apply Euclid\'s division algorithm to find the HCF of two numbers',
        'State and apply the Fundamental Theorem of Arithmetic',
        'Prove that √2, √3, √5 are irrational numbers',
        'Determine whether a rational number\'s decimal expansion terminates or repeats',
      ],
    },
    {
      title: 'Polynomials',
      description:
        'Understanding zeros of polynomials, relationship between zeros and coefficients of quadratic and cubic polynomials, and division algorithm for polynomials.',
      orderIndex: 2,
      estimatedMinutes: 75,
      prerequisites: ['Real Numbers'],
      objectives: [
        'Find zeros of a quadratic polynomial graphically',
        'Establish the relationship between zeros and coefficients of a quadratic polynomial',
        'Verify the relationship between zeros and coefficients of a cubic polynomial',
        'Apply the division algorithm for polynomials',
      ],
    },
    {
      title: 'Pair of Linear Equations in Two Variables',
      description:
        'Solving pairs of linear equations using graphical method, substitution, elimination, and cross-multiplication methods.',
      orderIndex: 3,
      estimatedMinutes: 100,
      prerequisites: ['Polynomials'],
      objectives: [
        'Represent a pair of linear equations graphically',
        'Classify systems as consistent, inconsistent, or dependent',
        'Solve using substitution method',
        'Solve using elimination method',
        'Solve using cross-multiplication method',
        'Solve word problems involving pairs of linear equations',
      ],
    },
    {
      title: 'Quadratic Equations',
      description:
        'Understanding quadratic equations and solving them using factorization, completing the square, and the quadratic formula. Analyzing the nature of roots.',
      orderIndex: 4,
      estimatedMinutes: 90,
      prerequisites: ['Polynomials'],
      objectives: [
        'Identify whether an equation is quadratic',
        'Solve quadratic equations by factorization',
        'Solve quadratic equations by completing the square',
        'Apply the quadratic formula',
        'Determine the nature of roots using the discriminant',
        'Solve real-world problems using quadratic equations',
      ],
    },
    {
      title: 'Arithmetic Progressions',
      description:
        'Understanding arithmetic progressions, finding the nth term, and calculating the sum of first n terms. Applications to real-world problems.',
      orderIndex: 5,
      estimatedMinutes: 80,
      prerequisites: ['Real Numbers'],
      objectives: [
        'Identify an arithmetic progression and find the common difference',
        'Find the nth term of an AP using the formula',
        'Determine if a given value is a term of an AP',
        'Calculate the sum of first n terms of an AP',
        'Solve problems involving APs in real life',
      ],
    },
    {
      title: 'Triangles',
      description:
        'Understanding similarity of triangles, Pythagoras theorem, and basic proportionality theorem with their converses and applications.',
      orderIndex: 6,
      estimatedMinutes: 110,
      prerequisites: ['Real Numbers'],
      objectives: [
        'State and apply the Basic Proportionality Theorem (Thales\' theorem)',
        'Define similar triangles and state criteria for similarity (AA, SAS, SSS)',
        'Prove the Pythagoras theorem',
        'Apply the converse of Pythagoras theorem',
        'Solve problems using similarity and Pythagoras theorem',
      ],
    },
    {
      title: 'Coordinate Geometry',
      description:
        'Finding distances between points, section formula, and area of triangles using coordinate geometry.',
      orderIndex: 7,
      estimatedMinutes: 70,
      prerequisites: ['Real Numbers'],
      objectives: [
        'Apply the distance formula to find distance between two points',
        'Use the section formula to find point dividing a segment in a given ratio',
        'Find the midpoint of a line segment',
        'Calculate the area of a triangle using coordinates',
        'Solve problems involving collinear points',
      ],
    },
    {
      title: 'Introduction to Trigonometry',
      description:
        'Defining trigonometric ratios, trigonometric identities, and values of trigonometric ratios for specific angles.',
      orderIndex: 8,
      estimatedMinutes: 85,
      prerequisites: ['Triangles'],
      objectives: [
        'Define trigonometric ratios of an acute angle in a right triangle',
        'Calculate trigonometric ratios for 0°, 30°, 45°, 60°, 90°',
        'Apply trigonometric ratios to find unknown sides and angles',
        'Prove and apply the identity sin²A + cos²A = 1',
        'Prove other trigonometric identities',
      ],
    },
    {
      title: 'Some Applications of Trigonometry',
      description:
        'Using trigonometry to find heights and distances in real-world scenarios involving angles of elevation and depression.',
      orderIndex: 9,
      estimatedMinutes: 60,
      prerequisites: ['Introduction to Trigonometry'],
      objectives: [
        'Understand angle of elevation and angle of depression',
        'Solve problems involving height and distance using trigonometry',
        'Set up and solve multi-step height and distance problems',
      ],
    },
    {
      title: 'Circles',
      description:
        'Understanding tangents to a circle, properties of tangents, and theorems related to tangents from an external point.',
      orderIndex: 10,
      estimatedMinutes: 65,
      prerequisites: ['Triangles'],
      objectives: [
        'Define tangent to a circle',
        'Prove that tangent is perpendicular to the radius at the point of contact',
        'Prove that tangents from an external point are equal',
        'Apply circle theorems to solve problems',
      ],
    },
    {
      title: 'Areas Related to Circles',
      description:
        'Calculating perimeter and area of circle sectors and segments, and areas of combinations of plane figures.',
      orderIndex: 11,
      estimatedMinutes: 70,
      prerequisites: ['Circles'],
      objectives: [
        'Calculate the area and perimeter of a sector of a circle',
        'Find the area of a segment of a circle',
        'Calculate areas of combinations of plane figures involving circles',
        'Solve real-world problems involving circular areas',
      ],
    },
    {
      title: 'Surface Areas and Volumes',
      description:
        'Finding surface areas and volumes of combinations of solids including spheres, cones, cylinders, and their conversions.',
      orderIndex: 12,
      estimatedMinutes: 95,
      prerequisites: ['Real Numbers'],
      objectives: [
        'Calculate surface area of combinations of solids',
        'Find the volume of combinations of solids',
        'Solve problems involving conversion of one solid into another',
        'Apply these concepts to real-world contexts',
      ],
    },
    {
      title: 'Statistics',
      description:
        'Calculating mean, median, and mode for grouped data, and understanding cumulative frequency distributions.',
      orderIndex: 13,
      estimatedMinutes: 85,
      prerequisites: ['Real Numbers'],
      objectives: [
        'Calculate the mean of grouped data using direct, assumed mean, and step-deviation methods',
        'Find the median of grouped data using the formula',
        'Determine the mode of grouped data',
        'Draw and interpret cumulative frequency curves (ogives)',
      ],
    },
    {
      title: 'Probability',
      description:
        'Understanding theoretical probability, computing probability of simple and compound events, and distinguishing from experimental probability.',
      orderIndex: 14,
      estimatedMinutes: 60,
      prerequisites: ['Real Numbers'],
      objectives: [
        'Define probability and distinguish theoretical from experimental',
        'Calculate probability of simple events',
        'Apply the complement rule',
        'Solve problems involving mutually exclusive events',
        'Solve real-world probability problems',
      ],
    },
  ],
}
