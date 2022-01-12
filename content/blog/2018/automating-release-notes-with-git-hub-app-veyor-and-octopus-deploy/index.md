---
date: 2018-11-10 
title: "Automating release notes with GitHub, AppVeyor and Octopus Deploy"
cover: ./48307028-d709a500-e509-11e8-9bd6-b7cd12cbce90_qlqkfx.jpg
banner_image_alt: Burger labeled "DevOps Burger" with layers for PowerShell, AppVeyor, Octopus Deploy and GitHub.
description: Utilizing a custom PowerShell script to generate deployment release notes with GitHub, AppVeyor & Octopus Deploy
tags: [devops, appveyor, octopus-deploy]
---

With multiple clients, projects, deadlines, release schedules running at once, it's hard to keep up with what features are being released in a build.  To help manage building release notes our team built a PowerShell script that accesses the GitHub &amp; Octopus Deploy API's to determine what commits have occurred between the latest deployed release and the current build.

<!--more-->

## The Background

In most cases, we use the same CI process for our clients.

- Each commit is built in [AppVeyor](https://www.appveyor.com)
- Depending on the branch/tag, the artifacts of the build are loaded to [Octopus Deploy](https://octopus.com/)
- Octopus sends it all out to the appropriate environments

## The Setup

To get everything working together, we have to setup each system to work together.

### Octopus Deploy

I'll assume you've already setup environments in Octopus Deploy so I won't go into that.  The only thing you really need from Octopus is a few bits of data that we'll use in the PowerShell script later.  You'll need:

- The url of your Octopus server
- A username &amp; password
- An API key
- The name of the project we'll be using for deployments
- The name of the environment used for production

### GitHub

Like Octopus, we only need a few bits of info so we can access the GitHub API via the PowerShell script.  You'll need:

- The name of the owner of the repository
- The name of the repository
- A personal access token ([How-to from GitHub](https://blog.github.com/2013-05-16-personal-api-tokens/))

### The Repository

Our repositories will normally have a *build* folder with a release-gen.ps1 file.  Then, in our appveyor.yml, we'll add the following to each build process:

```yml

install:
  - ps: Invoke-Expression ./build/release-gen.ps1;

```

At the top of the release-gen.ps1 file are the variables that you'll need to set based on the items we mentioned above.

```powershell

$global:github_owner = "GitHub Owner Name Here"
$global:github_repo = "GitHub Repo Name Here"
$global:github_token = "GitHub Personal Access Token"

$global:octopus_url = 'Url to Octopus Deploy'
$global:octopus_username = "Octopus Deploy Username"
$global:octopus_password = ConvertTo-SecureString "Octopus Deploy Password" -AsPlainText -Force
$global:octopus_apikey = "Octopus Deploy API Key"
$global:octopus_projectName = "Octopus Deploy Project Name"
$global:octopus_productionEnvironment = "Name of Production Environment in Octopus Deploy"

```

## Bringing it all together

Now that everything is setup let's talk about the script and what it does.  It's actually a simple process that saves us a lot of time.

At the beginning of a build in AppVeyor, the script calls to your Octopus Deploy API and identifies what version (which should correspond to a tag in GitHub) is deployed to the production environment.  It then calls the GitHub API and gets a list of all commits between the current commit or tag and the current version in the production environment.

Then, with that list of commits we build both HTML &amp; markdown versions of the release notes.  The HTML version is passed to Octopus with the build artifacts.  The markdown version is sent to GitHub with the build artifacts.

<v-image
  alt="Sample Markdown look at generated release notes"
 src="./48307475-14befb80-e513-11e8-85fb-b50ec28751b2_nndjdm.jpg"></v-image>
 
<v-image
  alt="Sample HTML look at generated release notes"
 src="./48307489-69fb0d00-e513-11e8-8f8c-a86359d90494_snm6ke.jpg"></v-image>

## Important Notes

### Skipping commit messages

There are certain commit messages that the script looks for and doesn't add to your release notes.  Any commit that starts with "merge", "merging" or "private" aren't included.  This allows our developers to prefix any commits that don't complete an issue with "Private:" to ensure they won't get included in the release notes.

When the final commit is made the developer will enter a quality commit message that describes exactly what their work has accomplished.

### Issue numbers

Our team is committed to adding close messages to our final commits when they close an issue.  (i.e. Did some kind of fix.  Closes #430)

The script identifies the pattern of Closes #{issue number} or Fixes #{issue number} and modifies it to make the issue number a link to that issue in GitHub.  So that line on the release notes will have both a link to the commit and links to any issues denoted in the commit message.

## Download the full script

You can check out the full script at [https://github.com/MichaelJolley/release-notes-script](https://github.com/MichaelJolley/release-notes-script).  Feel free to PR any improvements you see that could help others.
