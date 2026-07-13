import { cp, mkdir, rm } from 'node:fs/promises';
import { resolve } from 'node:path';

const repositoryRoot = resolve(import.meta.dirname, '../..');
const publicDirectory = resolve(repositoryRoot, 'public');
const outputDirectory = resolve(repositoryRoot, 'dist');

await rm(outputDirectory, { force: true, recursive: true });
await mkdir(outputDirectory, { recursive: true });
await cp(publicDirectory, outputDirectory, { recursive: true });
