# @phragon-util/plain-object

Utilities for plain javascript object

## ❯ Install

```
$ npm install --save @phragon-util/plain-object
```

## Usage

### Is plain object

> Returns true if an object was created by the Object constructor, or Object.create(null).\
> Function based on https://github.com/jonschlinkert/is-plain-object package, but does not return true if the object is null.

```javascript
import { isPlainObject } from "@phragon-util/plain-object"

isPlainObject(Object.create({}));
// is: true
isPlainObject(Object.create(Object.prototype));
// is: true
isPlainObject({foo: 'bar'});
// is: true
isPlainObject({});
// is: true
isPlainObject(null);
// is: false
```

### Clone plain object

> Function for deep cloning plain objects.

```javascript
import { clonePlainObject } from "@phragon-util/plain-object"

const original = { foo: 'bar', bar: { foo: '' } };
const clone = clonePlainObject(original);

original.bar.foo = "changed";

console.log(original);
// is: { foo: 'bar', bar: { foo: 'changed' } }

console.log(clone);
// is: { foo: 'bar', bar: { foo: '' } }
```
