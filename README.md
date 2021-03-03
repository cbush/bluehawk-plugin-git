# bluehawk-plugin-git

_A [Bluehawk](https://github.com/mongodb-university/Bluehawk) x git plugin_

## Installation

```sh
npm install -g bluehawk bluehawk-plugin-git
```

## Usage

The `bluehawk-plugin-git` executable returns its installation path, so you can
use it easily with `bluehawk --plugin`.

### Copy

Run `bluehawk copy` to a remote git repo, commit, and push.

```sh
bluehawk \
  --plugin "`bluehawk-plugin-git`" \
  git copy \
    --to-repo git@github.com:your/targetRepo.git \
    --state start \
    --delete-everything \
    --commit-message "Update with start state" \
    --branch start \
    /path/to/project
```
