<div align="center">

# Anchor

### A modern desktop chat application built with Next.js and Tauri

![Anchor App](image.png)

[![License](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](LICENSE)
[![Tauri](https://img.shields.io/badge/Tauri-2.0-24C8DB?logo=tauri)](https://tauri.app)
[![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=next.js)](https://nextjs.org)

</div>

---

## Prerequisites

Before you begin, ensure you have the following installed:

- [Node.js](https://nodejs.org/) (v18 or higher)
- [Rust](https://www.rust-lang.org/tools/install)
- Xcode Command Line Tools (macOS)

---

## Quick Start

### Install Tauri Prerequisites (macOS)

First, install the required dependencies for Tauri:

```bash
# Install Xcode Command Line Tools
xcode-select --install

# Install Rust (if not already installed)
curl --proto '=https' --tlsv1.2 https://sh.rustup.rs -sSf | sh
```

**Verify the installation:**

```bash
# Check Xcode Command Line Tools
xcode-select -p

# Check Rust and Cargo versions
rustc --version
cargo --version
```

### Install Dependencies

Install the project dependencies:

```bash
npm install
```

### Run the Development Server

Start the Tauri development server:

```bash
npm run tauri dev
```

This will launch the application in development mode with hot-reload enabled. 🔥

### Build the Application

To build the production version of the app:

```bash
npm run tauri build
```

The built application will be available in `src-tauri/target/release/bundle/`. 📦

### Configure API Settings

After opening the app:

1. Press `⌘ + ,` (Command + Comma) to open the Settings modal ⚙️
2. Enter your API endpoint URL
3. Enter your API key
4. Save the settings ✅

---

## Tech Stack

| Category     | Technology                  |
| ------------ | --------------------------- |
| **Frontend** | Next.js 16 + React 19       |
| **Desktop**  | Tauri 2                     |
| **Styling**  | Tailwind CSS                |
| **Icons**    | Lucide React                |
| **Markdown** | react-markdown + remark-gfm |

---

## Features

### Conversation Compacting

Anchor automatically manages long conversations to prevent token limit errors:

- **Auto-compacting**: When conversations exceed 64K tokens, older messages are automatically summarized
- **Progressive condensation**: Summaries build on themselves for ultra-long conversations
- **Full history preserved**: Original messages are never deleted, always visible in chat
- **User-editable**: View and edit the compact summary via the 📝 button
- **Multi-language**: Accurate token counting for English and Chinese text

**How it works:**
- Original messages stay in your local history
- API receives: compact summary + recent 5 messages
- You can view/edit the summary anytime
- Summaries are saved with your chat sessions

---

## Available Scripts

| Command               | Description                            |
| --------------------- | -------------------------------------- |
| `npm run dev`         | Run Next.js development server         |
| `npm run build`       | Build Next.js for production           |
| `npm run tauri dev`   | Run Tauri development server           |
| `npm run tauri build` | Build Tauri application for production |
| `npm run lint`        | Run ESLint                             |

---

## License

Licensed under the Apache License 2.0. See [LICENSE](LICENSE) for details.

---

<div align="center">

Made with ❤️ using Tauri and Next.js

</div>
