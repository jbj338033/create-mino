import { program } from "commander";
import inquirer, { type QuestionCollection } from "inquirer";
import chalk from "chalk";
import fs from "fs-extra";
import path from "path";
import { execSync } from "child_process";
import ora from "ora";
import gradient from "gradient-string";
import figlet from "figlet";

type PackageManager = "npm" | "yarn" | "pnpm" | "bun";
const PACKAGE_MANAGERS: readonly PackageManager[] = [
  "npm",
  "yarn",
  "pnpm",
  "bun",
] as const;

interface Library {
  name: string;
  value: string;
  category: string;
  checked: boolean;
}

interface ProjectChoices {
  projectName: string;
  packageManager: PackageManager;
  libraries: string[];
  [key: string]: string | string[] | PackageManager;
}

interface Dependencies {
  [key: string]: string;
}

interface DevDependencies {
  [key: string]: string;
}

interface CategoryLibraries {
  [key: string]: Library[];
}

interface PackageJson {
  name: string;
  private: boolean;
  version: string;
  type: string;
  scripts: {
    [key: string]: string | undefined;
  };
  dependencies: Dependencies;
  devDependencies: DevDependencies;
}

// Constants
const CATEGORIES = {
  DATA_FETCHING: "Data Fetching & State Management",
  UI: "UI & Components",
  FORMS: "Forms & Validation",
  ROUTING: "Routing & Navigation",
  UTILITIES: "Utilities & Tools",
  STYLING: "Styling & CSS",
  TESTING: "Testing",
  ANIMATIONS: "Animations & Effects",
} as const;

const LIBRARIES: Library[] = [
  // Data Fetching & State Management
  {
    name: "TanStack Query (React Query) - Powerful data fetching",
    value: "@tanstack/react-query",
    category: CATEGORIES.DATA_FETCHING,
    checked: true,
  },
  {
    name: "Axios - HTTP client",
    value: "axios",
    category: CATEGORIES.DATA_FETCHING,
    checked: true,
  },
  {
    name: "Zustand - Simple state management",
    value: "zustand",
    category: CATEGORIES.DATA_FETCHING,
    checked: false,
  },
  {
    name: "Jotai - Atomic state management",
    value: "jotai",
    category: CATEGORIES.DATA_FETCHING,
    checked: false,
  },

  // UI & Components
  {
    name: "Shadcn UI - High-quality components (Radix UI + Tailwind)",
    value: "shadcn-ui",
    category: CATEGORIES.UI,
    checked: true,
  },
  {
    name: "Radix UI - Unstyled accessible components",
    value: "@radix-ui/react-primitives",
    category: CATEGORIES.UI,
    checked: false,
  },
  {
    name: "React Icons - Comprehensive icon library",
    value: "react-icons",
    category: CATEGORIES.UI,
    checked: true,
  },
  {
    name: "Lucide React - Beautiful icons",
    value: "lucide-react",
    category: CATEGORIES.UI,
    checked: false,
  },

  // Forms & Validation
  {
    name: "React Hook Form - Form management",
    value: "react-hook-form",
    category: CATEGORIES.FORMS,
    checked: true,
  },
  {
    name: "Zod - Schema validation",
    value: "zod",
    category: CATEGORIES.FORMS,
    checked: true,
  },
  {
    name: "Yup - Schema validation alternative",
    value: "yup",
    category: CATEGORIES.FORMS,
    checked: false,
  },

  // Routing & Navigation
  {
    name: "React Router - Client-side routing",
    value: "react-router-dom",
    category: CATEGORIES.ROUTING,
    checked: true,
  },
  {
    name: "TanStack Router - Type-safe routing",
    value: "@tanstack/router",
    category: CATEGORIES.ROUTING,
    checked: false,
  },

  // Styling & CSS
  {
    name: "TailwindCSS - Utility-first CSS",
    value: "tailwindcss",
    category: CATEGORIES.STYLING,
    checked: true,
  },
  {
    name: "Class Variance Authority - UI variants",
    value: "class-variance-authority",
    category: CATEGORIES.STYLING,
    checked: false,
  },
  {
    name: "Tailwind Merge - Merge Tailwind classes",
    value: "tailwind-merge",
    category: CATEGORIES.STYLING,
    checked: true,
  },
  {
    name: "SCSS - Enhanced CSS",
    value: "sass",
    category: CATEGORIES.STYLING,
    checked: false,
  },

  // Utilities & Tools
  {
    name: "date-fns - Date manipulation",
    value: "date-fns",
    category: CATEGORIES.UTILITIES,
    checked: true,
  },
  {
    name: "clsx - Class names utility",
    value: "clsx",
    category: CATEGORIES.UTILITIES,
    checked: true,
  },
  {
    name: "React Error Boundary - Error handling",
    value: "react-error-boundary",
    category: CATEGORIES.UTILITIES,
    checked: true,
  },
  {
    name: "React Hot Toast - Toast notifications",
    value: "react-hot-toast",
    category: CATEGORIES.UTILITIES,
    checked: true,
  },

  // Testing
  {
    name: "Vitest - Unit testing",
    value: "vitest",
    category: CATEGORIES.TESTING,
    checked: false,
  },
  {
    name: "Testing Library - React testing",
    value: "@testing-library/react",
    category: CATEGORIES.TESTING,
    checked: false,
  },

  // Animations & Effects
  {
    name: "Framer Motion - Animation library",
    value: "framer-motion",
    category: CATEGORIES.ANIMATIONS,
    checked: false,
  },
  {
    name: "Auto Animate - Simple animations",
    value: "@formkit/auto-animate",
    category: CATEGORIES.ANIMATIONS,
    checked: false,
  },
];

// Group libraries by category
const groupedLibraries: CategoryLibraries = LIBRARIES.reduce(
  (acc: CategoryLibraries, lib) => {
    if (!acc[lib.category]) {
      acc[lib.category] = [];
    }
    acc[lib.category].push(lib);
    return acc;
  },
  {}
);

const DEV_DEPENDENCIES: Record<string, string[]> = {
  tailwindcss: ["postcss", "autoprefixer"],
  vitest: [
    "@testing-library/react",
    "@testing-library/jest-dom",
    "@vitejs/plugin-react",
  ],
  "shadcn-ui": ["@types/node", "tailwindcss-animate"],
};

const PackageManagerCommands: Record<PackageManager, string> = {
  npm: "npm install",
  yarn: "yarn",
  pnpm: "pnpm install",
  bun: "bun install",
};

// Functions
async function displayBanner(): Promise<void> {
  return new Promise((resolve) => {
    figlet("Create Mino", (err: Error | null, data: string | undefined) => {
      if (!err && data) {
        console.log(gradient.passion.multiline(data));
        console.log(
          chalk.cyan(
            "\nCreate a modern React project with best practices and popular libraries\n"
          )
        );
      }
      resolve();
    });
  });
}

async function init(): Promise<void> {
  await displayBanner();

  const questions: QuestionCollection[] = [
    {
      type: "input",
      name: "projectName",
      message: "What is your project name?",
      default: "my-react-app",
      validate: (input: string) => {
        if (/^([A-Za-z\-_\d])+$/.test(input)) return true;
        return "Project name may only contain letters, numbers, dashes and underscores";
      },
    },
    {
      type: "list",
      name: "packageManager",
      message: "Select your preferred package manager:",
      choices: PACKAGE_MANAGERS,
      default: "pnpm",
    },
  ];

  Object.entries(groupedLibraries).forEach(([category, libs]) => {
    questions.push({
      type: "checkbox",
      name: `libraries_${category}`,
      message: `Select ${category}:`,
      choices: libs as any[], // Fix the type mismatch
      pageSize: 15,
    });
  });

  const answers = await inquirer.prompt(questions);

  const libraries = Object.keys(groupedLibraries)
    .map((category) => answers[`libraries_${category}`])
    .flat()
    .filter((lib): lib is string => typeof lib === "string");

  try {
    const projectPath = path.join(process.cwd(), answers.projectName);

    if (await fs.pathExists(projectPath)) {
      console.log(
        chalk.red(`Error: Directory ${answers.projectName} already exists.`)
      );
      process.exit(1);
    }

    const spinner = ora("Creating your React project").start();

    await createProjectStructure(projectPath, {
      ...answers,
      libraries,
    } as ProjectChoices);

    spinner.succeed("Project structure created");

    await installDependencies(
      projectPath,
      answers.packageManager as PackageManager
    );
    await postInstallSetup(projectPath, libraries);

    const runCommand =
      answers.packageManager === "npm" ? "npm run" : answers.packageManager;

    console.log(
      chalk.green(`
✨ Successfully created ${answers.projectName}!

Inside that directory, you can run several commands:

  ${chalk.cyan(`${runCommand} dev`)}
    Starts the development server.

  ${chalk.cyan(`${runCommand} build`)}
    Bundles the app into static files for production.

  ${chalk.cyan(`${runCommand} test`)}
    Starts the test runner.

  ${chalk.cyan(`${runCommand} lint`)}
    Starts the linter.

Get started by typing:

  ${chalk.cyan(`cd ${answers.projectName}`)}
  ${chalk.cyan(`${runCommand} dev`)}

Happy coding! 🚀
`)
    );
  } catch (error) {
    console.error(chalk.red("\nError:"), error);
    process.exit(1);
  }
}

async function installDependencies(
  projectPath: string,
  packageManager: PackageManager
): Promise<void> {
  const spinner = ora("Installing dependencies...").start();

  try {
    const installCmd = PackageManagerCommands[packageManager];
    if (!installCmd) {
      throw new Error(`Unknown package manager: ${packageManager}`);
    }

    execSync(installCmd, {
      cwd: projectPath,
      stdio: "ignore",
    });

    spinner.succeed("Dependencies installed successfully");
  } catch (error) {
    spinner.fail("Failed to install dependencies");
    throw error;
  }
}

async function postInstallSetup(
  projectPath: string,
  libraries: string[]
): Promise<void> {
  const spinner = ora("Running post-installation setup...").start();

  try {
    if (libraries.includes("shadcn-ui")) {
      await setupShadcnUI(projectPath);
    }

    if (libraries.includes("tailwindcss")) {
      await setupTailwind(projectPath);
    }

    spinner.succeed("Post-installation setup completed");
  } catch (error) {
    spinner.fail("Post-installation setup failed");
    throw error;
  }
}

async function createProjectStructure(
  projectPath: string,
  options: ProjectChoices
): Promise<void> {
  const { projectName, libraries } = options;

  const directories = [
    "src/components/ui",
    "src/components/common",
    "src/components/layout",
    "src/features",
    "src/hooks",
    "src/lib",
    "src/utils",
    "src/services",
    "src/assets",
    "src/styles",
    "src/types",
    "src/constants",
    "src/context",
    "src/pages",
    "src/__tests__",
  ];

  for (const dir of directories) {
    await fs.ensureDir(path.join(projectPath, dir));
  }

  await createBaseFiles(projectPath, projectName, libraries);
  await createConfigFiles(projectPath, libraries);
}

async function createBaseFiles(
  projectPath: string,
  projectName: string,
  libraries: string[]
): Promise<void> {
  const files = [
    {
      path: "src/main.tsx",
      content: createMainFile(libraries),
    },
    {
      path: "src/App.tsx",
      content: createAppFile(libraries),
    },
    {
      path: "src/vite-env.d.ts",
      content: '/// <reference types="vite/client" />',
    },
    {
      path: "src/styles/globals.css",
      content: createGlobalStyles(libraries),
    },
    {
      path: ".gitignore",
      content: createGitignore(),
    },
    {
      path: ".eslintrc.json",
      content: createEslintConfig(),
    },
    {
      path: ".prettierrc",
      content: createPrettierConfig(),
    },
    {
      path: "README.md",
      content: createReadme(projectName),
    },
  ];

  for (const file of files) {
    await fs.writeFile(path.join(projectPath, file.path), file.content);
  }
}

async function createConfigFiles(
  projectPath: string,
  libraries: string[]
): Promise<void> {
  await fs.writeJSON(
    path.join(projectPath, "package.json"),
    createPackageJson(projectPath.split("/").pop() || "react-app", libraries),
    { spaces: 2 }
  );

  await fs.writeJSON(
    path.join(projectPath, "tsconfig.json"),
    createTsConfig(),
    { spaces: 2 }
  );

  await fs.writeFile(
    path.join(projectPath, "vite.config.ts"),
    createViteConfig(libraries)
  );
}

function createMainFile(libraries: string[]): string {
  let imports = `import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './styles/globals.css'
`;

  let providers = `
ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
`;

  let closeProviders = `
  </React.StrictMode>,
)`;

  if (libraries.includes("@tanstack/react-query")) {
    imports += `import { QueryClient, QueryClientProvider } from '@tanstack/react-query'\n`;
    providers += `
    <QueryClientProvider client={new QueryClient()}>`;
    closeProviders = `
    </QueryClientProvider>${closeProviders}`;
  }

  if (libraries.includes("react-router-dom")) {
    imports += `import { BrowserRouter } from 'react-router-dom'\n`;
    providers += `
    <BrowserRouter>`;
    closeProviders = `
    </BrowserRouter>${closeProviders}`;
  }

  if (libraries.includes("react-hot-toast")) {
    imports += `import { Toaster } from 'react-hot-toast'\n`;
    providers += `
    <Toaster position="top-right" />`;
  }

  providers += `
      <App />`;

  return `${imports}${providers}${closeProviders}`;
}

function createAppFile(libraries: string[]): string {
  let imports = `import React from 'react'\n`;
  let content = "";

  if (libraries.includes("react-router-dom")) {
    imports += `import { Routes, Route } from 'react-router-dom'\n`;
    content = `
  return (
    <Routes>
      <Route path="/" element={<div>Welcome to your React App</div>} />
    </Routes>
  )`;
  } else {
    content = `
  return (
    <div className="min-h-screen bg-background text-foreground">
      <main className="container mx-auto px-4 py-8">
        <h1 className="text-4xl font-bold">Welcome to your React App</h1>
      </main>
    </div>
  )`;
  }

  return `${imports}
function App() {${content}
}

export default App`;
}

function createPackageJson(
  projectName: string,
  libraries: string[]
): PackageJson {
  const deps: Dependencies = {
    react: "^18.2.0",
    "react-dom": "^18.2.0",
  };

  const devDeps: DevDependencies = {
    "@types/react": "^18.2.0",
    "@types/react-dom": "^18.2.0",
    "@typescript-eslint/eslint-plugin": "^6.0.0",
    "@typescript-eslint/parser": "^6.0.0",
    "@vitejs/plugin-react-swc": "^3.3.2",
    eslint: "^8.45.0",
    "eslint-plugin-react-hooks": "^4.6.0",
    "eslint-plugin-react-refresh": "^0.4.3",
    typescript: "^5.0.2",
    vite: "^4.4.5",
    "@types/node": "^20.0.0",
  };

  libraries.forEach((lib) => {
    if (lib === "shadcn-ui") {
      deps["@radix-ui/react-slot"] = "^1.0.2";
      deps["class-variance-authority"] = "^0.7.0";
      deps["clsx"] = "^2.0.0";
      deps["tailwind-merge"] = "^1.14.0";
      devDeps["tailwindcss-animate"] = "^1.0.7";
    } else {
      deps[lib] = "latest";
    }

    const libDevDeps = DEV_DEPENDENCIES[lib];
    if (libDevDeps) {
      libDevDeps.forEach((devDep) => {
        devDeps[devDep] = "latest";
      });
    }
  });

  return {
    name: projectName,
    private: true,
    version: "0.0.0",
    type: "module",
    scripts: {
      dev: "vite",
      build: "tsc && vite build",
      lint: "eslint . --ext ts,tsx --report-unused-disable-directives --max-warnings 0",
      preview: "vite preview",
      test: libraries.includes("vitest") ? "vitest" : undefined,
    },
    dependencies: deps,
    devDependencies: devDeps,
  };
}

// Execute the CLI
init().catch((error) => {
  console.error(chalk.red("Unexpected error:"), error);
  process.exit(1);
});

async function setupShadcnUI(projectPath: string): Promise<void> {
  const componentsConfig = {
    $schema: "https://ui.shadcn.com/schema.json",
    style: "default",
    rsc: false,
    tailwind: {
      config: "tailwind.config.js",
      css: "src/styles/globals.css",
      baseColor: "slate",
      cssVariables: true,
    },
    aliases: {
      components: "@/components",
      utils: "@/lib/utils",
    },
  };

  await fs.writeJSON(
    path.join(projectPath, "components.json"),
    componentsConfig,
    { spaces: 2 }
  );

  const utilsContent = `
import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
`;

  await fs.ensureDir(path.join(projectPath, "src/lib"));
  await fs.writeFile(path.join(projectPath, "src/lib/utils.ts"), utilsContent);
}

async function setupTailwind(projectPath: string): Promise<void> {
  const tailwindConfig = `
/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ["class"],
  content: [
    './pages/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './app/**/*.{ts,tsx}',
    './src/**/*.{ts,tsx}',
  ],
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
}`;

  await fs.writeFile(
    path.join(projectPath, "tailwind.config.js"),
    tailwindConfig
  );

  const postcssConfig = `
module.exports = {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
}`;

  await fs.writeFile(
    path.join(projectPath, "postcss.config.js"),
    postcssConfig
  );
}

function createTsConfig(): object {
  return {
    compilerOptions: {
      target: "ES2020",
      useDefineForClassFields: true,
      lib: ["ES2020", "DOM", "DOM.Iterable"],
      module: "ESNext",
      skipLibCheck: true,
      moduleResolution: "bundler",
      allowImportingTsExtensions: true,
      resolveJsonModule: true,
      isolatedModules: true,
      noEmit: true,
      jsx: "react-jsx",
      strict: true,
      noUnusedLocals: true,
      noUnusedParameters: true,
      noFallthroughCasesInSwitch: true,
      baseUrl: ".",
      paths: {
        "@/*": ["./src/*"],
      },
    },
    include: ["src"],
    references: [{ path: "./tsconfig.node.json" }],
  };
}

function createViteConfig(libraries: string[]): string {
  let plugins = `react()`;
  let imports = `import { defineConfig } from 'vite'\nimport react from '@vitejs/plugin-react-swc'\nimport path from 'path'`;

  if (libraries.includes("vitest")) {
    imports += `\nimport { configDefaults } from 'vitest/config'`;
    plugins += `,\n    // Add test configuration\n    `;
  }

  return `${imports}

export default defineConfig({
  plugins: [${plugins}],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },${
    libraries.includes("vitest")
      ? `
  test: {
    environment: 'jsdom',
    exclude: [...configDefaults.exclude, 'e2e/*'],
    globals: true,
    setupFiles: './src/setup.ts',
  },`
      : ""
  }
})`;
}

function createGlobalStyles(libraries: string[]): string {
  let styles = "";

  if (libraries.includes("tailwindcss")) {
    styles += `@tailwind base;
@tailwind components;
@tailwind utilities;
 
`;
  }

  styles += `
@layer base {
  :root {
    --background: 0 0% 100%;
    --foreground: 222.2 84% 4.9%;

    --card: 0 0% 100%;
    --card-foreground: 222.2 84% 4.9%;
 
    --popover: 0 0% 100%;
    --popover-foreground: 222.2 84% 4.9%;
 
    --primary: 222.2 47.4% 11.2%;
    --primary-foreground: 210 40% 98%;
 
    --secondary: 210 40% 96.1%;
    --secondary-foreground: 222.2 47.4% 11.2%;
 
    --muted: 210 40% 96.1%;
    --muted-foreground: 215.4 16.3% 46.9%;
 
    --accent: 210 40% 96.1%;
    --accent-foreground: 222.2 47.4% 11.2%;
 
    --destructive: 0 84.2% 60.2%;
    --destructive-foreground: 210 40% 98%;

    --border: 214.3 31.8% 91.4%;
    --input: 214.3 31.8% 91.4%;
    --ring: 222.2 84% 4.9%;
 
    --radius: 0.5rem;
  }
 
  .dark {
    --background: 222.2 84% 4.9%;
    --foreground: 210 40% 98%;
 
    --card: 222.2 84% 4.9%;
    --card-foreground: 210 40% 98%;
 
    --popover: 222.2 84% 4.9%;
    --popover-foreground: 210 40% 98%;
 
    --primary: 210 40% 98%;
    --primary-foreground: 222.2 47.4% 11.2%;
 
    --secondary: 217.2 32.6% 17.5%;
    --secondary-foreground: 210 40% 98%;
 
    --muted: 217.2 32.6% 17.5%;
    --muted-foreground: 215 20.2% 65.1%;
 
    --accent: 217.2 32.6% 17.5%;
    --accent-foreground: 210 40% 98%;
 
    --destructive: 0 62.8% 30.6%;
    --destructive-foreground: 210 40% 98%;
 
    --border: 217.2 32.6% 17.5%;
    --input: 217.2 32.6% 17.5%;
    --ring: 212.7 26.8% 83.9%;
  }
}
 
@layer base {
  * {
    @apply border-border;
  }
  body {
    @apply bg-background text-foreground;
  }
}`;

  return styles;
}

function createGitignore(): string {
  return `# Dependencies
node_modules
.pnp
.pnp.js

# Testing
coverage

# Production
dist
build

# Misc
.DS_Store
*.pem
.env
.env.local
.env.development.local
.env.test.local
.env.production.local

# Debug
npm-debug.log*
yarn-debug.log*
yarn-error.log*
pnpm-debug.log*

# Editor
.vscode/*
!.vscode/extensions.json
.idea
*.suo
*.ntvs*
*.njsproj
*.sln
*.sw?

# TypeScript
*.tsbuildinfo
`;
}

function createReadme(projectName: string): string {
  return `# ${projectName}

This project was bootstrapped with Create Mino.

## Getting Started

First, run the development server:

\`\`\`bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
\`\`\`

Open [http://localhost:5173](http://localhost:5173) with your browser to see the result.

## Features

- ⚡️ Vite - Lightning fast development
- 🎯 TypeScript - Type safety
- 📦 Modern React Features
- 🎨 TailwindCSS - Utility-first CSS
- 🚀 ShadcnUI - High-quality components
- 📱 Responsive Design
- 🌓 Dark Mode Support
- 🧩 Component Library Ready
- 📊 State Management
- 🔄 Data Fetching
- ✨ Best Practices

## Available Scripts

In the project directory, you can run:

### \`dev\`

Runs the app in development mode.

### \`build\`

Builds the app for production to the \`dist\` folder.

### \`preview\`

Locally preview the production build.

### \`lint\`

Runs the linter to check code style issues.

## Learn More

To learn more, check out these resources:

- [Vite Documentation](https://vitejs.dev/)
- [React Documentation](https://reactjs.org/)
- [TypeScript Documentation](https://www.typescriptlang.org/)
- [TailwindCSS Documentation](https://tailwindcss.com/)
- [ShadcnUI Documentation](https://ui.shadcn.com/)

## License

MIT
`;
}

function createEslintConfig(): string {
  return JSON.stringify(
    {
      root: true,
      env: { browser: true, es2020: true },
      extends: [
        "eslint:recommended",
        "plugin:@typescript-eslint/recommended",
        "plugin:react-hooks/recommended",
      ],
      ignorePatterns: ["dist", ".eslintrc.json"],
      parser: "@typescript-eslint/parser",
      plugins: ["react-refresh"],
      rules: {
        "react-refresh/only-export-components": [
          "warn",
          { allowConstantExport: true },
        ],
      },
    },
    null,
    2
  );
}

function createPrettierConfig(): string {
  return JSON.stringify(
    {
      semi: true,
      tabWidth: 2,
      printWidth: 100,
      singleQuote: true,
      trailingComma: "all",
      jsxSingleQuote: true,
      bracketSpacing: true,
    },
    null,
    2
  );
}
