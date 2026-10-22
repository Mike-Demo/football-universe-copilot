# Media hosting hand-off — friendly-tour video on Azure Blob Storage

**Why this exists:** the demo site embeds the plain-English "friendly tour" video
(`<video>` in the Start Here dialog). The MP4s are far too heavy for the GitHub
Pages repo, so they are hosted on the project's own Azure storage account —
`fucstpv4pnqx2o2t4y` (the same account the Function App uses), in a public-read
container named `media`. The site already points at these URLs:

- Streaming (1080p): `https://fucstpv4pnqx2o2t4y.blob.core.windows.net/media/football-universe-friendly-1080p.mp4`
- Full quality (4K): `https://fucstpv4pnqx2o2t4y.blob.core.windows.net/media/football-universe-friendly-4k.mp4`

**One step remains, and it needs your Azure sign-in** (the agent VM has no Azure
CLI and no Azure credentials, by design). Run this in **Azure Cloud Shell**
(portal.azure.com → Cloud Shell icon → Bash), signed in as the subscription owner.
Takes ~5 minutes. Cost: the two files total ~91 MB; storage + judging-scale
egress is well under $1, inside the existing $10 budget.

## 1. Turn on public blob access + create the container

(Also declared in `infra/main.bicep`, so the next full deploy keeps it.)

```bash
az storage account update -g football-universe-rg -n fucstpv4pnqx2o2t4y --allow-blob-public-access true
az storage container create --account-name fucstpv4pnqx2o2t4y -n media --public-access blob
```

## 2. Get the two video files into Cloud Shell

The files live on the agent VM at:

- `~/workspace/pexo-fuc-video/recut/web/football-universe-friendly-1080p.mp4` (22 MB, web derivative)
- `~/workspace/pexo-fuc-video/recut/Football_Universe_Copilot_Friendly_4K_v2.mp4` (69 MB, 4K master)

Easiest: in Cloud Shell use **Manage files → Upload** and upload both, renaming the
4K one to `football-universe-friendly-4k.mp4` when uploading below (the `--name`
flag controls the blob name, so the local filename does not matter).
(Regenerate the 1080p any time: `ffmpeg -i <4K.mp4> -vf scale=1920:1080:flags=lanczos -c:v libx264 -preset medium -crf 23 -c:a aac -b:a 128k -movflags +faststart <out.mp4>`.)

## 3. Upload the blobs

```bash
az storage blob upload --account-name fucstpv4pnqx2o2t4y --container-name media \
  --name football-universe-friendly-1080p.mp4 --file football-universe-friendly-1080p.mp4 \
  --content-type video/mp4 --content-cache-control "public, max-age=86400" --overwrite

az storage blob upload --account-name fucstpv4pnqx2o2t4y --container-name media \
  --name football-universe-friendly-4k.mp4 --file Football_Universe_Copilot_Friendly_4K_v2.mp4 \
  --content-type video/mp4 --content-cache-control "public, max-age=86400" --overwrite
```

## 4. Verify (anonymous read — this is what the site does)

```bash
curl -I https://fucstpv4pnqx2o2t4y.blob.core.windows.net/media/football-universe-friendly-1080p.mp4
curl -I https://fucstpv4pnqx2o2t4y.blob.core.windows.net/media/football-universe-friendly-4k.mp4
```

Both should return `200 OK` with `Content-Type: video/mp4`. Then open
https://mike-demo.github.io/football-universe-copilot/ → **Start here** → the
video plays in step 1. Until these uploads run, that step shows the poster and a
note linking to the same video on YouTube.
