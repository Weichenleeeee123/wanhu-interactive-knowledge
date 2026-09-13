import {defineConfig} from '@playwright/test';
export default defineConfig({testDir:'./tests/extension',testMatch:'**/*.ext.ts',workers:1,retries:0,timeout:45000,outputDir:`.artifacts/extension-test-${Date.now()}`,reporter:'list'});
