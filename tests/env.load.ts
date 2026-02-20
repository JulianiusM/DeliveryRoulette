import path from 'path';
import fs from 'fs';
import dotenv from 'dotenv';

const rootEnv = path.resolve(process.cwd(), '.env');
if (fs.existsSync(rootEnv)) dotenv.config({path: rootEnv});

const jestEnv = path.resolve(__dirname, '.env.test');
if (fs.existsSync(jestEnv)) dotenv.config({path: jestEnv});

process.env.NODE_ENV = 'test';
