#!/usr/bin/env node
import 'source-map-support/register';
import { App } from '@aws-cdk/core';
import { ContactsApiStack } from './contacts-api-stack';

const app = new App();
new ContactsApiStack(app, 'ContactsApiCdk');
