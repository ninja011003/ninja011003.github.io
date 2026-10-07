// ---------------------------------------------------------------------------
// All site content lives here. Edit this file to update the portfolio —
// no component changes needed.
// ---------------------------------------------------------------------------

export const profile = {
  name: 'Niranjan S',
  shortName: 'Niranjan',
  role: 'Machine Learning Engineer',
  company: 'Contentstack',
  tagline:
    "I work on Contentstack's multi-tenant AI platform: image analysis, RAG, asset ingestion pipelines, LLM provider integrations, usage metering and rate limiting.",
  // Experience on the About card is counted live from this date (internship start).
  careerStart: '2025-01-01',
  email: 'niranjan011003@gmail.com',
  links: {
    github: 'https://github.com/ninja011003',
    // Codeforces profile URL for the rating card; null shows the card without a link
    codeforces: null,
    linkedin: 'https://www.linkedin.com/in/niranjansuthagar',
  },
  // PDF served from /public; shown as a download in the Contact section. Set to null to hide.
  resumeUrl: '/niranjan_resume.pdf',
  resumeFilename: 'Niranjan_S_Resume.pdf',
}

export const about = {
  paragraphs: [
    'I joined Contentstack as an ML engineering intern in January 2025 and moved to a full-time role in August. Most of my work is backend infrastructure for AI features: Kafka and Celery pipelines, Elasticsearch indexing, a Redis rate limiter, and a billing system that tracks credits per customer, user and product.',
    'My side projects are mostly things I wanted to understand by building them myself: a genetic-algorithm AutoML tool, a rigid-body physics engine, and NEAT.',
  ],
  // The four cards beside the About text. `type` picks the card's animation.
  cards: [
    { type: 'loop', label: 'coffee in, code out, repeat' },
    { type: 'experience', label: 'building ML systems' },
    { type: 'descent', label: 'measure, take a step, repeat until the gradient is zero' },
    { type: 'rating', value: 1261, label: 'Codeforces rating · Pupil' },
  ],
}

export const experience = [
  {
    role: 'Machine Learning Engineer',
    company: 'Contentstack',
    period: 'Aug 2025 – Present',
    current: true,
    points: [
      'Reworked the image ingestion pipeline to use scaled JPEG decoding, drop redundant Base64 conversions and output compressed JPEG. Peak memory fell 63×, processing time 1.9× and per-call payload 25×, with no visible loss in quality.',
      'Built core parts of a multi-tenant AI platform used by 500+ enterprises, including one abstraction layer over OpenAI, Gemini, Azure OpenAI and AWS Bedrock.',
      'Built ingestion pipelines that handle 50K to 10M+ assets per tenant, using async workers, Kafka and Elasticsearch for retrieval and analytics.',
      'Designed the usage metering and billing system, which allocates credits at customer, user and product level and enforces quotas.',
      'Built real-time analytics pipelines on Celery, Kafka and Elasticsearch, and a distributed rate limiter on Redis.',
    ],
    tags: ['Kafka', 'Elasticsearch', 'Redis', 'Celery', 'AWS Bedrock', 'OpenAI', 'Gemini'],
  },
  {
    role: 'Machine Learning Engineer Intern',
    company: 'Contentstack',
    period: 'Jan 2025 – Aug 2025',
    points: [
      'Worked on Brand Kit, one of the core AI products, across NestJS and FastAPI services talking over gRPC and REST. Shipped in several production releases.',
      'Built and compared image metadata pipelines on AWS Bedrock, GCP Vision, Azure Cognitive Services and self-hosted models (SAM, CNNs, vision encoders).',
      'Benchmarked MongoDB against SurrealDB with an external team to compare scalability and performance.',
      'Fixed 50+ security vulnerabilities across Python, JavaScript and Docker, and added audit logging to critical services. Received several internal awards for this work.',
    ],
    tags: ['NestJS', 'FastAPI', 'gRPC', 'SAM', 'GCP Vision', 'MongoDB', 'SurrealDB'],
  },
]

export const projects = [
  {
    title: 'AutoML Platform',
    kicker: 'Python · Streamlit',
    description:
      'A no-code tool that runs the whole ML pipeline: preprocessing, feature engineering, training, evaluation and model selection.',
    highlights: [
      'Feature selection with a genetic algorithm: cross-entropy gain as fitness, information gain to guide crossover, several mutation strategies',
      'A decision tree trained to pick which model to use for a given dataset',
      'Modular pipelines with cross-validation, and a Streamlit UI',
    ],
    tech: ['Python', 'Streamlit', 'Scikit-learn', 'NumPy'],
    link: 'https://github.com/ninja011003',
  },
  {
    title: 'Physics Engine',
    kicker: 'Python · 2D rigid body',
    description:
      'A 2D rigid-body physics engine written from scratch, fast enough to train learning agents in real time.',
    highlights: [
      'Articulated bodies and joint constraints',
      'Collision detection and response, force integration, rotational dynamics',
      'Motors, actuators and constraint solvers for driving the bodies',
    ],
    tech: ['Python', 'NumPy'],
    link: 'https://github.com/ninja011003',
  },
  {
    title: 'Bipedal Locomotion',
    kicker: 'Python · NEAT',
    description:
      'Neural network controllers that learn to walk without supervised data, evolved with NEAT on my custom physics engine.',
    highlights: [
      'NEAT (NeuroEvolution of Augmenting Topologies) implemented from scratch',
      'Reward based on forward progress, stability and energy use',
      'Stable gaits emerge over many generations',
    ],
    tech: ['Python', 'NEAT', 'Neuroevolution'],
    link: 'https://github.com/ninja011003',
  },
]

export const skills = [
  {
    group: 'Languages',
    items: ['Python', 'Go', 'Java', 'JavaScript', 'TypeScript'],
  },
  {
    group: 'Backend',
    items: [
      'FastAPI', 'Flask', 'Node.js', 'Gin', 'NestJS', 'gRPC', 'REST', 'Microservices',
      'Kafka', 'Celery', 'Elasticsearch', 'Redis',
    ],
  },
  {
    group: 'Data & Infra',
    items: ['MongoDB', 'MySQL', 'SQL', 'SurrealDB', 'Docker', 'Kubernetes', 'AWS', 'GCP'],
  },
  {
    group: 'ML',
    items: [
      'PyTorch', 'TensorFlow', 'Keras', 'Scikit-learn', 'NumPy', 'CNNs',
      'Feature Engineering', 'LangChain',
    ],
  },
]

export const education = {
  school: 'Sri Manakula Vinayagar Engineering College',
  degree: 'B.Tech, Artificial Intelligence & Data Science',
  period: 'Oct 2021 – Jul 2025',
  score: '8.2 CGPA',
  coursework: [
    'Data Structures & Algorithms', 'Machine Learning', 'Deep Learning',
    'Computer Vision', 'Distributed Systems', 'Database Systems',
  ],
}

export const nav = [
  { id: 'about', label: 'About' },
  { id: 'experience', label: 'Experience' },
  { id: 'projects', label: 'Projects' },
  { id: 'skills', label: 'Skills' },
  { id: 'contact', label: 'Contact' },
]
