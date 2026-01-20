# Anchor

A modern desktop chat application built with Next.js and Tauri.

## Prerequisites

- [Node.js](https://nodejs.org/) (v18 or higher)
- [Rust](https://www.rust-lang.org/tools/install)
- Tauri CLI

## Setup Instructions

### 1. Install Tauri Prerequisites (macOS)

First, install the required dependencies for Tauri:

```bash
# Install Xcode Command Line Tools
xcode-select --install

# Install Rust (if not already installed)
curl --proto '=https' --tlsv1.2 https://sh.rustup.rs -sSf | sh
```

Verify the installation:

```bash
# Check Xcode Command Line Tools
xcode-select -p

# Check Rust and Cargo versions
rustc --version
cargo --version
```

### 2. Install Dependencies

Install the project dependencies:

```bash
npm install
```

### 3. Run the Development Server

Start the Tauri development server:

```bash
npm run tauri dev
```

This will launch the application in development mode with hot-reload enabled.

### 4. Build the Application

To build the production version of the app:

```bash
npm run tauri build
```

The built application will be available in `src-tauri/target/release/bundle/`.

### 5. Configure API Settings

After opening the app:

1. Press `Cmd + ,` (or `Command + Comma`) to open the Settings modal
2. Enter your API endpoint URL
3. Enter your API key
4. Save the settings

## Development

- **Frontend**: Built with Next.js 16 and React 19
- **Desktop**: Powered by Tauri 2
- **Styling**: Tailwind CSS with custom components
- **Icons**: Lucide React

## Scripts

- `npm run dev` - Run Next.js development server
- `npm run build` - Build Next.js for production
- `npm run tauri dev` - Run Tauri development server
- `npm run tauri build` - Build Tauri application for production
- `npm run lint` - Run ESLint

## License

This project is private.
