// Compatibility entrypoint for existing automation. The TypeScript generator is authoritative.
import { runCli } from './generate.ts';

process.exitCode = await runCli();
