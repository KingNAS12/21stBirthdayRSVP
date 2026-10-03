# Nathan's 21st: setup

GitHub Pages can only serve static files, so a tiny free Cloudflare Worker does the writing to `rsvps.txt`.

1. Create a GitHub repo, upload `index.html`, `rsvps.txt`, `worker/worker.js`.
2. Repo Settings > Pages > deploy from `main` branch, root.
3. GitHub > Settings > Developer settings > Fine-grained tokens: new token, only this repo, permission "Contents: Read and write".
4. cloudflare.com > Workers > Create Worker, paste `worker/worker.js`. Under Settings > Variables add `REPO` = `username/reponame` and a secret `GH_TOKEN` = your token.
5. Put the Worker's URL into `WORKER_URL` in `index.html`, commit.

Each RSVP is one line in `rsvps.txt`: `name|status|salt|hash|updated`. Passwords are stored salted + hashed, never in plain text.
If the repo is public, anyone can read the guest list, so make it private (Pages on private repos needs a paid plan) or keep the site's repo public and accept that.
