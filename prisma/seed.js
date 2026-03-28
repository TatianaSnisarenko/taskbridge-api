import { runSeed } from './seed/run-seed.js';

runSeed().catch((error) => {
  console.error('Error seeding database:', error);
  process.exit(1);
});
