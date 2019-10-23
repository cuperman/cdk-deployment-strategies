#!/usr/bin/env node
import 'source-map-support/register';
import { App } from '@aws-cdk/core';
import { ContactsApiStack } from './contacts_api_stack';

const app = new App();
new ContactsApiStack(app, 'ContactsApiCdk');
