---
pubDate: 2021-12-23T00:00:00.000Z
title: Building a Cross Platform NuGet Package
description: Learning to build a NuGet package by building a .NET SDK for the
  Deepgram API, while ensuring it's compatible with as many versions of the .NET
  Framework and as many platforms as possible.
image: https://res.cloudinary.com/dk3rdh3yo/image/upload/w_526,dpr_auto,w_auto/v1688346175/blog/cross-platform-nuget-dotnet/neon_mac_and_pc_computers_on_a_black_background_jur7jy.png
image_alt: AI generated of different types of neon computers on black background
tags:
  - dotnet
  - nuget
  - sdk
summary: Learning to build a NuGet package by building a .NET SDK for the
  Deepgram API, while ensuring it's compatible with as many versions of the .NET
  Framework and as many platforms as possible.
canonical_url: https://developers.deepgram.com/blog/2021/12/cross-platform-nuget-dotnet/
ograph: https://res.cloudinary.com/dk3rdh3yo/image/upload/v1688749757/blog/cross-platform-nuget-dotnet/ograph.png
---

I love the .NET ecosystem. My career started writing classic ASP applications in
Visual Basic and transitioned to C# with .NET 2.0. I remember building my first
ASP.NET MVC application and feeling like I had just performed some kind of magic.

Once I joined Deepgram, I was very excited about the prospect of building a
.NET SDK from scratch. During the process, I realized that there are certain
things to consider when building a .NET library to make it as accessible as
possible to developers building with different versions of the .NET Framework
and various platforms.

> Happy holidays! This post is a contribution to [C# Advent 2021](https://www.csadvent.christmas/). Be
> sure to visit and read all the excellent content focused on C# and the .NET community.

## Use Case

Before we get too deep in the how-to, let's talk about the need I was trying to
address. Today, Deepgram has two fully supported SDKs; Node.js &amp; Python.
Like .NET, both are great languages with solid ecosystems, but I wanted to
provide that first-class citizen experience to my beloved .NET developers. 😁

After a bit of planning, I landed on the following requirements for the SDK:

- Enable access to all the publicly available endpoints of the [Deepgram API](https://developers.deepgram.com/api-reference/)
- Allow users to provide their own logging by using the [LoggerFactory](https://docs.microsoft.com/en-us/dotnet/api/microsoft.extensions.logging.loggerfactory) provided in the `Microsoft.Extensions.Logging` library
- Ensure the library was accessible to as many frameworks &amp; platforms as reasonably practical

## Calling the API

Most of the Deepgram API is accessible via HTTP requests, so the library handles
those as you'd expect with an HTTPClient. Requests to transcribe audio in
real-time are handled via WebSockets. Creating a reusable and well-managed
WebSocket client was more challenging because I couldn't find any real-world
examples in the documentation. In most cases, the documentation would show
connecting to a socket, sending a message, receiving a message, and then
disconnecting. In the real world, I needed a client that would connect, then
send &amp; receive messages on-demand, and disconnect at a later time that I
decide.

## Bring Your Own Logging

Logging, like tests, are one of those features that developers like to bypass.
For years, my projects were scarce on logging and, when included, it was
often added as an afterthought. That said, I was very impressed by one of my
colleagues, [Steve Lorello](https://twitter.com/slorello), at Vonage, who worked
on their .NET SDK. Not only did he do a great job with logging throughout the
SDK, he utilized the `LoggerFactory` to provide the ability for developers to
choose their own logging solution. I contacted him as I was getting started to
warn him that I was blatantly plagiarizing his work. 😂

Luckily, Steve was super gracious and offered to help with any questions.
Seriously, if you aren't following Steve on [Twitter](https://twitter.com/slorello),
you should. He's doing outstanding work at Redis now.

## Microsoft's Cross-Platform Recommendations

Microsoft recommends starting with a `netstandard2.0` target. Since we only plan
on supporting platforms &amp; frameworks that can use .NET Standard 2.0 or later,
I started reviewing any dependencies I had added intending to strip it down
to only those compliant with the .NET Standard 2.0.

I did notice in [Microsoft's recommendations](https://docs.microsoft.com/en-us/dotnet/standard/library-guidance/cross-platform-targeting)
that in some cases, you may have to shield your users depending on their platform
and framework, as in the example below:

```csharp
public static class GpsLocation
{
    // This project uses multi-targeting to expose device-specific APIs to .NET Standard.
    public static async Task<(double latitude, double longitude)> GetCoordinatesAsync()
    {
#if NET461
        return CallDotNetFramworkApi();
#elif WINDOWS_UWP
        return CallUwpApi();
#else
        throw new PlatformNotSupportedException();
#endif
    }

    // Allows callers to check without having to catch PlatformNotSupportedException
    // or replicating the OS check.
    public static bool IsSupported
    {
        get
        {
#if NET461 || WINDOWS_UWP
            return true;
#else
            return false;
#endif
        }
    }
}
```

Fortunately, our SDK didn't require these types of workarounds.

## Publishing to Nuget with GitHub Actions

Because I created the library in Visual Studio 2022 using the new class library
templates, the configuration for building a NuGet package was as painless as
providing details like the name, description, etc. of the package. I had already
created a [GitHub Action](https://github.com/deepgram-devs/deepgram-dotnet-sdk/blob/main/.github/workflows/CI.yml)
to perform CI tasks, so I decided to add another GitHub Action to deploy the
package to NuGet.org when a new version was released.

The Continuous Deployment (CD) action contains two jobs: `build` and `publish`.
The `build` job creates the NuGet package, while the `publish` job
handles uploading the generated package to NuGet.org. The `publish` job will
only run if the `build` job completes successfully. You can review the entire
CD workflow file [here](https://github.com/deepgram-devs/deepgram-dotnet-sdk/blob/main/.github/workflows/CD.yml).

### Triggering a New Release

Once we're ready to release a new version of the SDK, we create a new GitHub
release. The CD action is triggered when that new release is published. Once
it begins, we use the `actions/checkout@v2` to check out the code based on the
sha associated with the release.

### Restoring Dependencies

Once the repository is retrieved, we install .NET 6 and install any
required dependencies from NuGet.

### Identifying Version Number

Once the dependencies are installed, the next step pulls the version number from
the GitHub release and outputs that value so that subsequent steps can access
it.

### Building &amp; Packaging the SDK

Next, the action calls `dotnet pack` and passes various parameters to configure
the build and packing process to ensure we've got the cleanest output
possible.

#### --configuration

The `--configuration` parameter tells the build process to run in `Release`
mode rather than `Debug` mode.

#### --no-restore

Because we previously ran `dotnet restore` in the action, there's no need to
restore packages from Nuget during the build process. The `--no-restore`
parameter tells the build process to skip this step to save time.

#### --output

Once we build the SDK with the various targets, we want that clean output saved
to a specific directory. In our case, the `./dist` directory.

#### -p

The `-p` parameter is used to pass additional parameters to the build process.
In our case, we are sending a parameter called `Version` and set it to the value of
the `get_version` step, which returned our version number based on the GitHub
release.

### Archiving Packing Artifacts

The generated package should live in the ./dist directory when the build and
packing process completes. We use the `actions/upload-artifact@v2` action to
save the contents of that directory as an artifact of the action with the name
`dist`. We'll access this artifact in the next step of the process.

### Publishing to NuGet

With the package archived as an artifact, the `publish` job will send it
to NuGet.

#### Downloading Artifacts

The publish job will first download the artifact named dist that was created in
the build job. These artifacts are downloaded to the `./dist` directory.

#### Pushing the Package

Next, the job calls `dotnet nuget push` to send any .nupkg file in the `./dist`
directory to NuGet.org. This requires an access token that NuGet provides.
For securities sake, we store that token in the repositories secrets and access
it via `${{secrets.NUGET_API_KEY}}`.

With that step complete, the action is finished and stops. NuGet will review
the uploaded package and release it to the marketplace automatically.

## Announcing the Deepgram .NET SDK

Of course, with all this work completed, we can announce the new
[Deepgram .NET SDK](https://www.nuget.org/packages/Deepgram/). Try it out, and
let us know if it helps you get up and running with Deepgram even faster.

Also, the entire project has been
[built in the open on GitHub](https://github.com/deepgram-devs/deepgram-dotnet-sdk),
and we'd love your input, feedback, and contributions to make it even better!
Happy building!
