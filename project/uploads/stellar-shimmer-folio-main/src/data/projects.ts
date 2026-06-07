export interface Project {
  id: string;
  title: string;
  desc: string;
  fullDesc: string;
  tech: string[];
  category: string;
  features: { icon: string; title: string; desc: string }[];
  github: string;
  demo: string;
}

export const projects: Project[] = [
  {
    id: 'cloudsync-dashboard',
    title: 'CloudSync Dashboard',
    desc: 'Real-time analytics dashboard with live data streaming and interactive charts.',
    fullDesc: 'CloudSync Dashboard is a comprehensive real-time analytics platform designed for monitoring cloud infrastructure and application performance. It features live data streaming via WebSockets, interactive D3.js charts with drill-down capabilities, customizable dashboard layouts, and automated alerting. Built to handle millions of data points with sub-second rendering, it provides teams with instant visibility into their system health and performance metrics.',
    tech: ['React', 'TypeScript', 'D3.js', 'WebSocket', 'Redis', 'Docker'],
    category: 'Web App',
    features: [
      { icon: 'BarChart3', title: 'Real-time Charts', desc: 'Interactive D3.js visualizations with live data streaming' },
      { icon: 'Layout', title: 'Custom Dashboards', desc: 'Drag-and-drop layout builder with saved configurations' },
      { icon: 'Bell', title: 'Smart Alerts', desc: 'Automated anomaly detection and notification system' },
      { icon: 'Zap', title: 'Sub-second Rendering', desc: 'Optimized for millions of data points with virtual scrolling' },
    ],
    github: '#',
    demo: '#',
  },
  {
    id: 'taskflow-mobile',
    title: 'TaskFlow Mobile',
    desc: 'Cross-platform task management app with offline sync and team collaboration.',
    fullDesc: 'TaskFlow Mobile is a cross-platform productivity application that keeps teams synchronized whether online or offline. Built with React Native, it features real-time collaboration, offline-first architecture with conflict resolution, push notifications, and rich media attachments. The app supports nested task hierarchies, time tracking, and integrates with popular tools like Slack, Jira, and Google Calendar.',
    tech: ['React Native', 'Firebase', 'TypeScript', 'Redux', 'Cloud Functions'],
    category: 'Mobile',
    features: [
      { icon: 'WifiOff', title: 'Offline First', desc: 'Full functionality without internet, auto-syncs when reconnected' },
      { icon: 'Users', title: 'Team Collaboration', desc: 'Real-time updates, comments, and task assignments' },
      { icon: 'Clock', title: 'Time Tracking', desc: 'Built-in timer with detailed productivity reports' },
      { icon: 'Plug', title: 'Integrations', desc: 'Connects with Slack, Jira, Google Calendar, and more' },
    ],
    github: '#',
    demo: '#',
  },
  {
    id: 'openapi-generator',
    title: 'OpenAPI Generator',
    desc: 'CLI tool to auto-generate typed API clients from OpenAPI specifications.',
    fullDesc: 'OpenAPI Generator is a powerful CLI tool that automatically generates fully-typed API clients from OpenAPI/Swagger specifications. It supports TypeScript, Python, and Go output targets with customizable templates. The tool handles complex schemas including polymorphism, circular references, and discriminated unions. It integrates seamlessly into CI/CD pipelines and includes a watch mode for development.',
    tech: ['Node.js', 'TypeScript', 'Handlebars', 'Jest', 'GitHub Actions'],
    category: 'Open Source',
    features: [
      { icon: 'Code', title: 'Multi-language', desc: 'Generates TypeScript, Python, and Go clients from specs' },
      { icon: 'FileCode', title: 'Custom Templates', desc: 'Handlebars-based templates for full output customization' },
      { icon: 'GitBranch', title: 'CI/CD Ready', desc: 'GitHub Actions integration with automatic client regeneration' },
      { icon: 'Eye', title: 'Watch Mode', desc: 'Auto-regenerates clients when spec files change' },
    ],
    github: '#',
    demo: '#',
  },
  {
    id: 'paymenthub-api',
    title: 'PaymentHub API',
    desc: 'Unified payment gateway integrating Stripe, PayPal, and crypto payments.',
    fullDesc: 'PaymentHub API provides a single, unified interface for processing payments across multiple providers including Stripe, PayPal, and cryptocurrency wallets. It features automatic failover between providers, intelligent routing based on transaction type and geography, comprehensive webhook handling, and PCI-DSS compliant tokenization. The API handles subscriptions, refunds, and disputes with a clean RESTful interface.',
    tech: ['Python', 'FastAPI', 'PostgreSQL', 'Redis', 'Celery', 'Docker'],
    category: 'API',
    features: [
      { icon: 'CreditCard', title: 'Multi-provider', desc: 'Stripe, PayPal, and crypto through a single API' },
      { icon: 'Shield', title: 'PCI Compliant', desc: 'Tokenization and encryption meeting PCI-DSS standards' },
      { icon: 'RefreshCw', title: 'Auto Failover', desc: 'Intelligent routing with automatic provider switching' },
      { icon: 'Receipt', title: 'Subscription Management', desc: 'Full lifecycle management for recurring payments' },
    ],
    github: '#',
    demo: '#',
  },
  {
    id: 'devportal',
    title: 'DevPortal',
    desc: 'Developer documentation platform with interactive code playgrounds and versioning.',
    fullDesc: 'DevPortal is a modern developer documentation platform that transforms how teams create and consume technical documentation. It features interactive code playgrounds with live execution, automatic API reference generation, version management with diff views, and full-text search with AI-powered suggestions. Built with MDX for rich content authoring, it supports multiple programming languages and integrates with Git for collaborative editing.',
    tech: ['Next.js', 'MDX', 'Tailwind', 'Prisma', 'Algolia', 'Vercel'],
    category: 'Web App',
    features: [
      { icon: 'Play', title: 'Code Playgrounds', desc: 'Interactive, executable code examples in the browser' },
      { icon: 'GitCompare', title: 'Version Management', desc: 'Side-by-side diff views for documentation versions' },
      { icon: 'Search', title: 'AI Search', desc: 'Algolia-powered search with AI-generated suggestions' },
      { icon: 'BookOpen', title: 'MDX Authoring', desc: 'Rich content with React components embedded in Markdown' },
    ],
    github: '#',
    demo: '#',
  },
  {
    id: 'metricskit',
    title: 'MetricsKit',
    desc: 'Open-source monitoring library for Node.js applications with zero config.',
    fullDesc: 'MetricsKit is a zero-configuration monitoring library for Node.js applications that automatically captures and reports application metrics. It instruments HTTP requests, database queries, and custom business events with minimal overhead. The library supports multiple export formats including Prometheus, Datadog, and custom webhooks. With just one line of code, teams get comprehensive visibility into application health and performance.',
    tech: ['TypeScript', 'Node.js', 'Prometheus', 'OpenTelemetry', 'Jest'],
    category: 'Open Source',
    features: [
      { icon: 'Gauge', title: 'Zero Config', desc: 'One-line setup with intelligent auto-instrumentation' },
      { icon: 'Activity', title: 'Auto Instrumentation', desc: 'Automatically captures HTTP, DB, and custom metrics' },
      { icon: 'Share2', title: 'Multi-export', desc: 'Prometheus, Datadog, and custom webhook support' },
      { icon: 'Feather', title: 'Lightweight', desc: 'Minimal performance overhead with async batching' },
    ],
    github: '#',
    demo: '#',
  },
];
