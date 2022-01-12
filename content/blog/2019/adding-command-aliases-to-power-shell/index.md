---
date: 2019-05-13
title: "Adding command aliases to PowerShell"
cover: ./57646611-96591a00-7586-11e9-8b7a-68f7736e2c28_vc6upr.jpg
banner_image_alt: Powershell code
description: How to make your life easier by adding aliases for commands you run frequently in PowerShell.
tags: [powershell, alias]
---

If you're like me, there are certain commands that get run repeatedly throughout your day. Between `git checkout`, `docker {whatever}` and navigating to frequent paths with `cd`, I've been wondering how much time I could save by shortening these commands and parameters.

I was actually a little jealous of my friends using bash with their nice aliases, so I went hunting for a way to alias in PowerShell.  Turns out, it's really simple!

<!--more-->

### This seat's taken

PowerShell has built in commands that we don't want to step on.  I won't list them all (there are MANY), but if you get something wildly unexpected from your aliases then you can Google them.

## So show me already

Okay, okay. So first, let's create a function in a `.ps1` file.

```powershell

function goGoGadgetGitStatus {
  git status
}

```

The function above simply calls `git status`.  You can then setup an alias to call that function.

```powershell

Set-Alias gs goGoGadgetGitStatus

```

Then from your PowerShell console you can type `gs` and it will run `git status`.

That's a very simplistic example but gives you an idea of what's possible.

### What about parameters

Great question!  We can define parameters in the function and then pass them in.

```powershell

function goGoGadgetGit {
  Param(
    [Parameter(Mandatory = $true, Position = 0)]
    [String]
    $Cmd,

    [Parameter(Mandatory = $false, ValueFromRemainingArguments = $true)]
    [String[]]
    $Params
  )

  Switch ($Cmd)
  {
    # status
    's' { git status $Params }
    # branch
    'c' { git checkout $Params }
  }
}
Set-Alias g goGoGadgetGit

```

Now in our console we can call `g s` to get `git status` or `g c master` to execute `git checkout master`.

I'm not going to go into detail on how to write PowerShell functions or options for parameters.  There are plenty of resources out there for the two.  But hopefully this showed you a rudimentary way to set up command aliases for PowerShell.  Just add the code to your PowerShell profile.ps1 and you're off to the races.

### PowerShell Alias

I've actually created a repository at [https://github.com/MichaelJolley/ps-alias](https://github.com/MichaelJolley/ps-alias) that has the PowerShell script that I include in my profile that gives many aliases for things like Docker, Git, etc. Feel free to fork &amp; PR any aliases that you think might help others.

Got any other suggestions/corrections?  Leave a comment below.
