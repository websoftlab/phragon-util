# @phragon-util/proof

Functions for validating an expression or variable.
A value is not valid if it is null, undefined, false.
If value is a number it must be finite and not NaN.
An empty string and a zero number is allowed.

> This library is built for the PhragonJS framework and uses the `@phragon-util/global-var` package. 
> If you are not using PhragonJS, you should add a cleaner for `__*__` global variables and functions 
> to your build manager (Webpack, Rollup, etc.)

## ❯ Install

```
$ npm install --save @phragon-util/proof
```

## Usage

All functions always return void.\
The `warning` function and the `warningOnce` function throw an error and catch it, 
you can use this behavior for debugging (only in production mode).

```javascript
import { invariant, warning, warningOnce } from "@phragon-util/proof";

// throw Error("some message")
invariant(false, "some message");

// "some message" warning in console
warning(false, "some mesage");

// "some message" warning in console
// just one repeat for "my-key"
warningOnce("my-key", false, "some message");
```
