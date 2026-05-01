somewhat of a mess

### Todo

- input validation
  - is there a way to make this bearable with socket.io or do we find an alternative that has built-in standard schema integration
  - and things beyond (no boss class selection in e.g. ffa)
- room stuff
  - clearer side effects
  - way to cleanly open and close custom rooms
- finish moving all ui logic to svelte components, remove jsx-dom
  - the largest part remaining is the leaderboard/game over menu
- simplify `setupSocket` logic (can we keep the same `io` instance and the same event handlers when reconnecting/switching rooms?)

## How to install and play locally

### Windows

- Go to https://nodejs.org/en/download and follow the install instructions for windows for the current version of nodejs, not the LTS one
- Go to https://pnpm.io/installation and follow the install instructions for windows
- Go to https://git-scm.com/install/windows and download the installer, or use winget to install git, open powershell and run `git clone https://github.com/KrunkerRevivalProject/vertix.git` **OR** download the repo as a zip and extract it somewhere.
- Open powershell in the vertix folder (the one you cloned or extracted), and run `pnpm i`, after that's done you won't need to run it again
- To start the server run `pnpm dev` then go to http://localhost:5173 in your browser.

### Linux

- If your package manager has the current version of nodejs, you can install everything from there, if not go to https://nodejs.org/en/download, https://pnpm.io/installation and follow the install instructions for linux.
- Install git from your package manager if you haven't already, run the following in your terminal

```
git clone https://github.com/KrunkerRevivalProject/vertix.git
cd vertix
pnpm i
```

- To start the server run `pnpm dev` then go to http://localhost:5173 in your browser.
