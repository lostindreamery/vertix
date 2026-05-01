somewhat of a mess

to run: `pnpm i`, `pnpm dev`, http://localhost:5173.

to format & lint: `pnpm biome check --write --reporter=summary`

## How to install and play locally

### Windows

- Go to https://nodejs.org/en/download and follow the install instructions for windows for the current version of nodejs, not the LTS one
- Go to https://pnpm.io/installation and follow the install instructions for windows
- Go to https://git-scm.com/install/windows and download the installer, or use winget to install git, open powershell and run `git clone https://github.com/KrunkerRevivalProject/vertix.git`<br> **OR** download the repo as a zip and extract it somewhere.
- Open powershell in the vertix folder (the one you cloned or extracted), and run `pnpm i`<br>, after that's done you won't need to run it again
- To start the server run `pnpm dev`<br> then go to http://localhost:5173 in your browser.

### Linux

- If your package manager has the current version of nodejs, you can install everything from there, if not go to https://nodejs.org/en/download, https://pnpm.io/installation and follow the install instructions for linux.
- Install git from your package manager if you haven't already, run the following in your terminal

```
git clone https://github.com/KrunkerRevivalProject/vertix.git
cd vertix
pnpm i
```

- To start the server run `pnpm dev`<br> then go to http://localhost:5173 in your browser.
