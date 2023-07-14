---
pubDate: 2020-12-24T00:00:00.000Z
title: Choosing Between Blazor Server or WebAssembly
image: https://res.cloudinary.com/dk3rdh3yo/image/upload/w_526,dpr_auto,f_auto/v1688346051/blog/choosing-between-blazor-server-or-web-assembly/neon_server_and_pc_on_a_black_background_ompvv6.png
image_alt: AI generated image of neon computers and servers on black background
description: What are the differences between Blazor Server and WebAssembly
  (WASM)? When should you use each and why?
tags:
  - blazor
  - csharp
  - wasm
  - server
  - dotnet
  - aspnet
summary: Building for the web using a language you're already comfortable with?
  Sounds like a great idea as long as it's easy to use and performs well for
  clients.
ograph: https://res.cloudinary.com/dk3rdh3yo/image/upload/v1688749763/blog/choosing-between-blazor-server-or-web-assembly/ograph.png
---

Building for the web using a language you're already comfortable with? Sounds
like a great idea as long as it's easy to use and performs well for
clients. That's the promise of
[Blazor](https://dotnet.microsoft.com/apps/aspnet/web-apps/blazor), and the
team at Microsoft is working feverishly to deliver.

But one question that keeps popping up is "which flavor of Blazor should I
use: Server or WebAssembly (WASM)?" Let's dive in and learn the differences
and use cases for both.

<!--more-->

> **Before we move on:** I'm stoked to be taking part in
> [C# Advent](https://www.csadvent.christmas/)
> again this year. Honestly, I don't understand how I was allowed back.
> I guess mistakes were made.
>
> Regardless, I'm grateful to all the folks that made C# Advent possible
> this year. If you haven't read the other articles, be sure to check out
> the link and enjoy!

## What the Blazor!?

C# developers have been dabbling or building with Blazor for a while
now, but, for the uninitiated, what is it? In simplest terms, Blazor allows
you to build web applications using C# instead of, or in tandem with,
JavaScript _(sorry for using the "J"-word.)_ With Blazor, you can build
feature-complete apps with reusable web components that make it easy to
isolate UI design, functionality, and testing.

Because you're writing C#, you can use any .NET libraries that conform to the
[.NET Standard](https://dotnet.microsoft.com/platform/dotnet-standard). That
means most of the packages you would pull from [Nuget](https://www.nuget.org/)
can be included in your application. But the first choice you have to make
is what flavor of Blazor you want to use.

Blazor can run your C# application in the browser, using WebAssembly, or on
the Server. Both have pros/cons that should be considered depending on the
use-case of your application.

## Blazor Server

All Blazor Server code, including Razor pages, are compiled into libraries
that run, as the name implies, on the server. When clients visit the
application, they receive a page with a little JavaScript that initiates
a connection to the server via
[SignalR](https://docs.microsoft.com/en-us/aspnet/signalr/overview/getting-started/introduction-to-signalr).

The server then uses that websocket connection to send small payloads to
the client that updates the page. This allows users to experience fast
load &amp; render times, but also means that every visitor has a
persistent bi-directional connection to the server. You'll definitely want
to take that into consideration when thinking about scaling your application.

### Server Pros

**Render &amp; Load Times**

One of the biggest positives of Blazor Server is load &amp; render times.
Since users aren't downloading the runtime or application libraries, they
can start using the application faster.

**Ease of On-Boarding**

Getting started with Blazor Server is much faster because you're writing
the same C# code you would regardless. As long as your code conforms to
.NET Standard 2.0, your existing classes, data-access, business logic,
etc. will just work. Because all the code runs on the server, it also
means you don't have to build a separate front-end and back-end.

**Browser Support**

Unlike WASM, Blazor Server is supported in all major browsers because it
doesn't require the browser to support WebAssembly. This is a major
consideration if you still need to support users with IE 11 or other older
browsers.

### Server Cons

**No Offline Support**

Blazor Server is not going to be the right fit for you if you're looking
to add offline support for your users. Since each page &amp; component
are served from the server, no code is maintained on the client.

**Page Load/Change Latency**

When changes need to be made to the UI, Blazor Server recognizes and sends
the diff down to the client to update the presented UI. This is much faster
than full page reloads, but can cause latency on the round-trip. You'll want
to be mindful of the datasets you're passing around to minimize the size of
the diff being sent.

**Scalability**

Scalability isn't necessarily a "con" for Server Blazor, but it is something to
consider. Since every visitor has a separate websocket connection to the
server, the amount of memory consumed by the application per user may require
scaling hardware more quickly than Blazor WASM.

**Servers Not Included**

Because your site will be running server-side, you will need something to serve
your application and handle requests. Serverless options are available, but
processing is handled server-side and not client-side, so all logic, etc. must
be handled there.

## Blazor WebAssembly

> [Mozilla](https://developer.mozilla.org/en-US/docs/WebAssembly) defines
> WebAssembly, or WASM, as a "low-level assembly-like language that provides
> near-native performance that allows other languages to run on the web."

Blazor WebAssembly is a single-page app (SPA) framework for building
client-side web applications with .NET. Developers can write C# and utilize
code that already exists in their back-end applications like models, business
logic, and more. When a Blazor WASM app is built, all your C# code and Razor
files are compiled into .NET assemblies that are downloaded to and run in
the client's browser.

If you've had experience with the popular JavaScript frameworks, Blazor WASM
will feel very familiar.

### WASM Pros

**Fast User Experience**

Once loaded, the user experience is blazing fast (pun intended.) With your
code running in the browser, the UI will feel nearly instantaneous for users
other than calls to external APIs.

**Offline Support**

Blazor WASM allows you to build applications that users can still use when
their internet connection isn't available. Your apps can also take a hybrid
approach to allow certain parts of your site to be accessible offline but not
others.

**Servers Not Needed**

Because your Blazor WASM code can run offline, your app can be delivered via
a CDN. This effectively removes the need for a server to host your application.
If your application requires a back-end API, those would still need to live on
a server.

**.NET Standard 2.0 Is Ready To Go**

Any .NET Standard 2.0 code can run in a Blazor WASM application. That means,
in most cases, the internal &amp; external libraries your app depends on will
work as they do today.

### WASM Cons

**Initial Load Time**

The most often mentioned downside is the initial payload size. All Blazor
WASM apps bootstrap the .NET runtime. While Microsoft has made gains in
trimming this down, it can still result in a large initial download for
clients. One way the compiler tries to help is by tree-shaking unused code
with the Intermediate Language Trimmer.

**API**

When dealing with data or things that need to be secured, you'll need to
make calls to an API. This is a paradigm that's popular with exiting
JavaScript frameworks and is likely familiar to C# developers who have
built with ASP.NET MVC.

## Other Observations

If you're used to existing JavaScript frameworks like Vue.js, React, or
Angular, then you'll understand the paradigm that Blazor WASM uses. It
just sprinkles in the magic of C# for .NET developers.

Blazor Server will be an easier entry point for WinForm &amp; XAML
developers. I hesitate to compare it to WebForms because it is **NOT**
WebForms, but it seems like an evolution from that world. It's all
C# developers wanted WebForms to be.

The choice of which to use will be dependent on several factors, but
an important one will be: _"where will my code &amp; user state live?"_

If you choose Blazor Server, you will want to be mindful of what kind
of state you're maintaining for each user. Blazor Server handles state
well, but the size and scope of that state are controlled by you. The
larger state, the fewer users per server you'll be able to support.

With Blazor WASM, that state remains on the client-side but requires
you to use back-end APIs for data access and sensitive processes.

Luckily, both use components that work in both flavors. This means that
switching between the two isn't a daunting task and can be very simple
with the right architecture.

Hopefully, you now have a better understanding of the features &amp;
limitations of Blazor Server and Blazor WebAssembly. I'd love to
hear about what you're building. Reach out on socials or join our
[Builders Club](https://discord.gg/XSG7HJm) community Discord to
share with an amazing group of developers who are focused on improving
as developers and humans. We'd love to have you as part of our tribe.
