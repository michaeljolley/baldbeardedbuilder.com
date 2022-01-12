---
date: 2019-02-16 
title: "Communication between containers using docker compose in Windows"
cover: ./52905302-082afd00-31fe-11e9-9f0d-e1e02f2e58e9_uysuaw.jpg
banner_image_alt: Octopus holding containers and a Windows logo over a code editor.
description: Using docker compose to start containers that can communicate with one another in Windows
tags: [docker, vscode, windows, compose]
---

This definitely has to be filed under "remember this in the future."

I've been working on a project lately that includes an ASPNETCore SPA using Angular.  It's being deployed to multiple Raspberry Pi's using a popular deployment tool.   However, as the number of devices used by the client grows the cost of the deployment tool is becoming prohibitive.  While exploring other options we landed on the Azure IoT Hub.

In production, the application on the Pi communicates with a Restful API that lives at the clients main office.  However, while debugging we need to run them side-by-side.  So, docker-compose to the rescue (I think.)

<!--more-->

## Setting up the Dockerfiles

Most of our developers are using VS 2017 or 2019 so we used the built in functionality to add pre-built Dockerfile to the IoT application.

Once we started debugging we found our docker based IoT application couldn't communicate with the localhost:port that the API was loaded to.  This made complete sense because the docker container thinks that it is localhost, not the host machine.  So we decided to load our API into a container.  Same steps, using Visual Studio to add the Dockerfile.

## The fun begins (or doesn't)

With the two Dockerfiles in place we setup a docker-compose that would launch each of them.  After reviewing multiple sites explaining varying ways to allow the two containers to communicate we finally found the correct solution.  So, for our future reminder, and possibly a chance to help others:

## How to setup a docker-compose file to allow communication between two or more containers on Windows

While the wind-up for this post has been huge, actually getting the docker-compose right is fairly straight forward.

Firstly, add your two services in the docker compose like so:

```yaml

version 3.4

services:
  iotapp:
    image: ${DOCKER_REGISTRY-}iotapp
    build:
      context: .
      dockerfile: *path to your app Dockerfile here*
    ports:
      - {external port}:{internal port}
    links:
      - api
  api:
    image: ${DOCKER_REGISTRY-}api
    build:
      context: .
      dockerfile: *path to your api Dockerfile here*
    ports:
       - {external port}:{internal port}

```

Notice the **links** flag in the iotapp service.  This lets Docker know that iotapp will need to be able to communicate with the api project.

Pretty simple right?

The missing piece of the puzzle for us was how to communicate between the two.

For instance, in our iotapp code, it is hardcoded to communicate with `http://localhost:{port}/api`.  However, this won't be okay because the api & iotapp containers each have their own "localhost".  After much experimenting and several incorrect StackOverflow &amp; Google responses, we found you must call the name of the service specified in the docker-compose.  So any call in our iotapp to `http://localhost:{port}/api` needed to be changed to `http://api:{port}/api`.

Seeing what's required and the "how-to", it makes complete sense, but this one stumped me for several hours.  Hopefully if you're reading this Google has sent you and it saves you that time.

Anything I missed or that we could do better?  Leave me a comment below.
