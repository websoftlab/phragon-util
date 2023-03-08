# @phragon-util/script

Workspace project builder.
Uses babel to build and prettier to reformat source code.

> The project is under construction, the full description will be later.

## ❯ Install

```
$ npm install --save @phragon-util/script
```

## Commands

Warning!\
Config files: `.prettierrc.json`, `babel.config.js`, `phragon-build.conf.json` is required

```shell
# create boilerplate workspace package
phragon-script boilerplate

# prettier reformat code
phragon-script prettier

# increment new package version
phragon-script increment

# build workspace package(s)
phragon-script build

# npm publish
phragon-script release
```

## Builder config file

The file name is `phragon-build.conf.json`

```json
{
	"semver": {
		"version": "0.0.1"
	},
	"workspace": {
		"name": "@your-package-name",
		"path": "packages"
	},
	"bundle": {
		"out": "build",
		"tmp": "build-tmp",
		"author": "your@email.com",
		"repository": {
			"type": "git",
			"url": "https://github.com/your_git_user/your_git_package.git"
		},
		"license": "MIT",
		"licenseText": "Text for LICENSE file"
	},
	"release": {
		"global": {
			"user": "your_npm_login"
		}
	}
}
```