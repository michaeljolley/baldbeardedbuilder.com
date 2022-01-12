---
date: 2019-07-03 
title: "Using SQL Server in Docker containers for basic tasks"
cover: ./60616825-fbb3d500-9d97-11e9-8214-d3b90aecafe9_ebpx8l.jpg
banner_image_alt: Docker, Linux and SQL Server logos on a Powershell background
description: Don't want to install SQL instances on your personal or work machine?  No problem, because you no longer need to.  Let's learn how to spin up a Docker container and access it with SQL Management Studio.
tags: [docker, sql, linux, devops]
---

If you’ve ever used a Windows machine you’ve probably experienced a Winpocalypse.  You know… that moment when you need to completely re-install Windows down to reformatting the drive.  Everything is gone. (Hopefully you did a backup beforehand.)

A few months ago, I experienced Winpocalypse 2019 and I’ve been very protective about what I re-install on my machine since.  Applications that were commonplace have undergone intense scrutiny when deciding whether to re-install.  One big target: SQL Server.  Even express & developer editions are bloated and introduce attack vectors on my local machine.

<!--more-->

First off, let me be clear, I did install SQL Management Studio (SSMS) early on.  I use it frequently to access and monitor various databases.  The question was, do I need a full database engine running locally and the answer is an emphatic NO.
I always learn best when working through a real-world problem so let’s address how to live SQL installation free in 2019.

### Real World Use Case

We have a development SQL database hosted in Azure for one of our clients.  Occasionally they will send us a backup of the production database to restore over our copy to have more recent, clean data.  The normal process would be to load that .BAK file to Azure storage and do a backup restore into SQL Azure.  However, this backup contained a custom SQL login, which will prevent SQL Azure from restoring the backup.

The solution? Restore the backup locally, remove the login, create a new backup and restore again.  But how to restore the backup without the SQL database engine installed?

### Docker, Docker, Docker

Microsoft has released several Docker images for SQL Server, including one that runs on Linux.  Since my Docker for Windows is configured for Linux containers that seemed like a great place to start.  First, I needed to find an image I could pull.  My Google-Fu turned up several options, but I decided on `mcr.microsoft.com/mssql/server:2017-latest`.

#### Docker Run

Let’s go through the command to get everything running and then detail what each parameter is for.

```powershell

docker run -e 'ACCEPT_EULA=Y' `
-e 'SA_PASSWORD=<YourStrong!Passw0rd>' `
-p 1433:1433 `
-v <C:/HostPath>:/var/opts/mssql/data `
--name sql1 `
-d mcr.microsoft.com/mssql/server:2017-latest

```

This command will create and run a Docker container based on the latest SQL Server 2017 Linux container image.  You could connect to the server running in this container via SSMS now.  Just use 127.0.0.1,1433 with SA and your password.  Any databases you create will be saved to the host path specified in the `-v` command.

When you’re done with the container just delete it and clean up any images you don’t want.  Just like that you’ve used SQL Server without installing it on your machine and have no residual muck that lives on post-uninstall.

#### Get to the deets of the command

#### -e 'ACCEPT_EULA=Y'

This flag just accepts the SQL Server EULA.  Nothing to see here.  Move along.

#### -e 'SA_PASSWORD=<YourStrong!Passw0rd>'

Of course, you’ll want to replace `<YourStrong!Passw0rd>` with an actual strong password, but this is just setting that initial password for the sa login.

#### -p 1433:1433

In the format of `<Host port>:<Container port>`, this maps the containers port to a specific port on the host.  In my case, I mapped 1433 (SQL's default port) to the host 1433.  I could have just as easily mapped it to something else (i.e. `-p 5050:1433`).  The important thing here is that whatever port is used on the host side is the port I'll use in SSMS to connect.  To use a port other than the default, enter the server address in SSMS as `127.0.0.1,<port you chose>`.  Yeah, it's a comma.  Don't ask. :)

#### -v <C:/HostPath>:/var/opts/mssql/data

Maps a path on the host to a path in the container in the format of `<HOST PATH>:<CONTAINER PATH>`.  In this instance, any databases created in the container will be accessible as mdf/ldf files on the host in that directory.
You could exclude this parameter and then use `docker cp` to copy files in & out of the container.  However, it’s important to remember that if you have data stored in a container and destroy it, that data is lost.

#### --name sql1

An easy to remember name for the container.  If not specified, you’ll have to reference the container by its id.

#### -d mcr.microsoft.com/mssql/server:2017-latest

Specifies what image to build the container from.

### Down With SQL Server, Long Live SQL Server

Was that easy or what?  Now that you can spin up an instance of SQL Server in a container and destroy it when you're done why would you ever manually install the SQL engine on your development machine?  No really, let me know some use cases that might not be served by running SQL in a container.
