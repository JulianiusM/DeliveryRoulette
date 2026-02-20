// jest.config.ts
import type {Config} from 'jest';

const base: Config = {
    testEnvironment: 'node',
    rootDir: '.',
    moduleFileExtensions: ['ts', 'js', 'json'],
    setupFiles: ['<rootDir>/tests/env.load.ts'],
    transform: {
        '^.+\\.tsx?$': ['ts-jest', {tsconfig: '<rootDir>/tsconfig.test.json'}],
    },
};

const config: Config = {
    projects: [
        {
            ...base,
            displayName: 'unit',
            testMatch: ['<rootDir>/tests/unit/**/*.(test|spec).ts'],
        },
        {
            ...base,
            displayName: 'controller',
            testMatch: ['<rootDir>/tests/controller/**/*.(test|spec).ts'],
        },
        {
            ...base,
            displayName: 'middleware',
            testMatch: ['<rootDir>/tests/middleware/**/*.(test|spec).ts'],
        },
    ],
};

export default config;
