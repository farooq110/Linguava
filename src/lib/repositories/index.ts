// src/lib/repositories/index.ts
// Re-export so callers can `import { userRepo, historyRepo } from '@/lib/repositories'`.

export { userRepo } from '@/lib/repositories/user.repo';
export { historyRepo } from '@/lib/repositories/history.repo';
export { usageRepo } from '@/lib/repositories/usage.repo';
export { analyticsRepo } from '@/lib/repositories/analytics.repo';
