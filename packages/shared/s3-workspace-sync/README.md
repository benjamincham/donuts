# @fullstack-agentcore/s3-workspace-sync

Bidirectional file sync between **Amazon S3** and a **local workspace directory** with MD5-hash-based diff detection, `.syncignore` support, and configurable concurrent transfers.

## Features

- **`pull()`** — Download from S3 to local (S3 as source of truth). Deletes local-only files.
- **`push()`** — Upload changed/new files to S3 using in-memory MD5 hash snapshot for fast diff.
- **Background pull** — `startBackgroundPull()` + `waitForPull()` for non-blocking initialization.
- **`.syncignore`** — `.gitignore`-style pattern file for excluding paths from sync.
- **Concurrent transfers** — Configurable parallelism via `p-limit` (default: 50 downloads, 10 uploads).
- **Content-Type detection** — Automatic MIME type assignment with `charset=utf-8` for text files.
- **Progress events** — `EventEmitter`-based progress reporting.
- **Pluggable logger** — Inject any logger that implements `{ debug, info, warn, error }`.

## Installation

```bash
npm install @fullstack-agentcore/s3-workspace-sync @aws-sdk/client-s3
```

`@aws-sdk/client-s3` is a peer dependency — you must install it alongside this package.

## Quick Start

```typescript
import { S3WorkspaceSync } from '@fullstack-agentcore/s3-workspace-sync';

const sync = new S3WorkspaceSync({
  bucket: 'my-app-storage',
  prefix: 'users/user123/workspace/',
  workspaceDir: '/tmp/ws',
});

// Download everything from S3
await sync.pull();

// ... your application modifies files ...

// Upload only changed files
const result = await sync.push();
console.log(`Uploaded ${result.uploadedFiles} files in ${result.duration}ms`);
```

## Background Pull (Non-Blocking)

Useful for AI agents that need to start processing while files are still downloading:

```typescript
const sync = new S3WorkspaceSync({ bucket, prefix, workspaceDir });

// Start download in background — does not block
sync.startBackgroundPull();

// ... do other setup work ...

// Wait only when files are actually needed
await sync.waitForPull();
```

## API Reference

### `new S3WorkspaceSync(options)`

| Option | Type | Default | Description |
|---|---|---|---|
| `bucket` | `string` | *required* | S3 bucket name |
| `prefix` | `string` | *required* | S3 key prefix (e.g. `"users/user123/"`) |
| `workspaceDir` | `string` | *required* | Local directory path |
| `region` | `string` | `process.env.AWS_REGION \|\| "us-east-1"` | AWS region |
| `s3Client` | `S3Client` | auto-created | Pre-configured S3Client instance |
| `downloadConcurrency` | `number` | `50` | Max parallel downloads |
| `uploadConcurrency` | `number` | `10` | Max parallel uploads |
| `logger` | `SyncLogger` | console-based | Custom logger |
| `ignorePatterns` | `string[]` | `[]` | Additional ignore patterns |
| `contentTypeResolver` | `(filename: string) => string` | built-in | Custom Content-Type resolver |

### Methods

| Method | Returns | Description |
|---|---|---|
| `pull()` | `Promise<SyncResult>` | Download from S3 to local |
| `push()` | `Promise<SyncResult>` | Upload local changes to S3 |
| `startBackgroundPull()` | `void` | Start pull in background |
| `waitForPull()` | `Promise<void>` | Wait for background pull |
| `isPullComplete()` | `boolean` | Check if pull is done |
| `getWorkspacePath()` | `string` | Get workspace directory |

### Events

```typescript
sync.on('progress', (progress: SyncProgress) => {
  console.log(`${progress.phase}: ${progress.percentage}% (${progress.current}/${progress.total})`);
});
```

### Types

```typescript
interface SyncResult {
  success: boolean;
  downloadedFiles?: number;
  uploadedFiles?: number;
  deletedFiles?: number;
  errors?: string[];
  duration?: number;
}

interface SyncProgress {
  phase: 'download' | 'upload' | 'cleanup';
  current: number;
  total: number;
  percentage: number;
  currentFile?: string;
}
```

## `.syncignore`

Place a `.syncignore` file in your workspace root to exclude files from sync.
Uses `.gitignore` syntax:

```gitignore
# Build artifacts
dist/
node_modules/

# Secrets
*.pem
.env.local
```

Built-in defaults already exclude common patterns (`.DS_Store`, `node_modules/`, `dist/`, `*.log`, etc.).
See [`.syncignore.example`](./.syncignore.example) for a full example.

## Utilities

The package also exports standalone utilities:

```typescript
import {
  guessContentType,
  validateStoragePath,
  SyncIgnoreFilter,
  calculateFileHash,
} from '@fullstack-agentcore/s3-workspace-sync';

guessContentType('photo.png');       // "image/png"
guessContentType('app.ts');          // "application/typescript; charset=utf-8"

validateStoragePath('valid/path');    // OK
validateStoragePath('../etc/passwd'); // throws PathValidationError
```

## Custom Logger

```typescript
import pino from 'pino';

const logger = pino({ level: 'info' });

const sync = new S3WorkspaceSync({
  bucket: 'my-bucket',
  prefix: 'data/',
  workspaceDir: '/tmp/ws',
  logger,
});
```

## Performance Notes

Benchmarked with 2,116 files:

| Concurrency | Download Time |
|---|---|
| 10 | ~21s |
| 30 | ~11s |
| 50 | ~10s |
| 100 | ~7s |

Default concurrency of 50 provides a good balance between speed and resource usage.

## License

MIT
