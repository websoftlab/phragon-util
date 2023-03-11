# @phragon-util/global-var

Helper for global variables (used on PhragonJS projects).

## ❯ Install

```
$ npm install --save @phragon-util/global-var
```

## All variables:

```typescript
// Environment Mode - Developer
const __DEV__: boolean;

// Environment Mode - Developer
// Script was run on the client-server side (Webpack)
const __DEV_SERVER__: boolean;

// Environment Mode - Production
const __PROD__: boolean;

// Bundle type
const __BUNDLE__: string;

// Server side rendering is used
const __SSR__: boolean;

// The script was run on the server side (backend)
const __SRV__: boolean;

// The script was run on the client side (front)
const __WEB__: boolean;

// Environment mode
const __ENV__: "production" | "development";
```

## Functions:

```typescript
import { defineGlobal, __isDev__, __isProd__, __isWeb__, __isSrv__, __env__ } from "@phragon-util/global-var";

// Define all global variables if they don't exist. 
// This function is automatically added to the PhragonJS build.
// Works only on the server side (NodeJS), in the client side the functions and the variables 
// will be removed and replaced with static values.
defineGlobal();

// Environment Mode - Developer
__isDev__();

// Environment Mode - Production
__isProd__();

// The script was run on the client side (front)
__isWeb__();

// The script was run on the server side (backend)
__isSrv__();

// Environment mode
__env__();
```
