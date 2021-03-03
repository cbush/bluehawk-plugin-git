# bluehawk-plugin-git

_A [Bluehawk](https://github.com/mongodb-university/Bluehawk) x git plugin_

## Installation

```sh
npm install -g bluehawk bluehawk-plugin-git
```

## Usage

### Copy

Run `bluehawk copy` to a remote git repo, commit, and push.

```sh
bluehawk \
  --plugin /path/to/bluehawk-plugin-git \
  git copy \
    --to-repo git@github.com:your/targetRepo.git \
    --state start \
    --delete-everything \
    --commit-message "Update with start state" \
    --branch start \
    /path/to/project
```
