---
date: 2021-03-29
title: "10 VS Code Extensions You Need Today"
cover: ./cover.png
slug: 10-visual-studio-code-extensions-you-need-today
ograph: https://res.cloudinary.com/dk3rdh3yo/image/upload/b_rgb:000/l_ograph_5,g_south_east,x_0,y_0,e_tint:50:ff00ff:0p:00ffff:100p/e_tint:62:222/e_make_transparent:20/e_ordered_dither:2/l_blog-ograph/l_bbb-logo,g_north_east,x_40,y_40/l_text:Roboto_30_bold_letter_spacing_12:%2523VSCODE%20%23PRODUCTIVITY,g_north_west,x_40,y_40,co_rgb:FFFFFF/l_text:Roboto_30_bold_letter_spacing_12:BBB.DEV%252FVSCODE2021,g_north_west,x_40,y_100,co_rgb:FFFFFF/l_text:Roboto_56_black:The%2010%20Visual%20Studio%20Code%20Extensions%20You%20Need%20Today,g_south_west,x_40,y_40,w_830,c_fit,co_rgb:FFFFFF/ograph-bg.png
banner_image_alt: Visual Studio Code with an overlay of the VS Code logo and the words Top 10 in 2021
description: Building in Visual Studio Code is amazing and it's made even better by extensions. In this post, we talk about the top 10 VS Code extensions you should be using in 2021. 
tags: [vscode, extensions, productivity]
---

It's no secret that I love using Visual Studio Code, but what makes it amazing
is the massive ecosystem of extensions. There are thousands of extensions in the
wild that add linting, code snippets, themes, and more, but what extensions
can provide the most significant impact on your workflow? Let's talk about
ten Visual Studio Code extensions that every developer, regardless of language
or platform, can benefit from using today.

## Rest Client

[<v-image
  alt="Rest Client in the VS Code Marketplace"
 src="./rest-client.png"></v-image>](https://marketplace.visualstudio.com/items?itemName=humao.rest-client)

It's not hyperbole to say the Rest Client extension is a game-changer. If you
regularly use REST APIs, you've undoubtedly used tools like Postman, Insomnia, or
others. Rest Client can replace all those by allowing you to make RESTful API
requests from within VS Code. One of the best parts is saving your requests
as `.http` files with your code. Sending data, headers, and parameterized
requests are all possible. Check out the Extension Highlight I recently
released on [YouTube](https://youtu.be/CLfz_CDnSV4) to see it in action.

## Remote - Containers

[<v-image
  alt="Remote - Containers in the VS Code Marketplace"
 src="./remote-containers.png"></v-image>](https://marketplace.visualstudio.com/items?itemName=ms-vscode-remote.remote-containers)

Even though it's been around for over a year, Remote - Containers is another
extension that seems stuck in that "Preview" state. It allows you to use a
Docker container as a full-featured development environment. Once your repository
has it configured, developers won't need to install 3rd-party SDKs or CLIs
locally to work with your codebase. I've given talks about
[developing inside containers](/talks/vscode-remote/) and recently released an
[Extension Highlight](https://youtu.be/Yo4wKXlnLMc) video on YouTube you can
check out to learn more.

## GitLens

[<v-image
  alt="GitLens in the VS Code Marketplace"
 src="./gitlens.png"></v-image>](https://marketplace.visualstudio.com/items?itemName=eamodio.gitlens)

GitLens is a perfect name for our next extension. It provides a "lens" into data
you'd typically find in the Git CLI or GitHub website. Information like git
blames, author data, and recent changes show within the code editor to give
you a short history of that piece of code. It also provides a powerful
repository view that gives you access to details that would cause you
to leave the code editor to check out.

## GitHub Pull Requests & Issues

[<v-image
  alt="GitHub Pull Requests and Issues in the VS Code Marketplace"
 src="./github-pr.png"></v-image>](https://marketplace.visualstudio.com/items?itemName=GitHub.vscode-pull-request-github)

Speaking of GitHub-related extensions, GitHub Pull Requests & Issues makes
managing pull requests and issues much easier. Anything you can do with pull
requests in the browser can be done directly within VS Code. There's also
a great capability for checking out the pull requests code to run
it locally. Imagine commenting on an issue or reviewing a pull request
without leaving your development environment. That's just the tip of the
iceberg as far as this extensions' features. Check out the
[Extension Highlight](https://youtu.be/VWbHiXN3mno) to see features.

## Docker

[<v-image
  alt="Docker in the VS Code Marketplace"
 src="./docker.png"></v-image>](https://marketplace.visualstudio.com/items?itemName=ms-azuretools.vscode-docker)

If you're using Docker containers, even if it's just with the Remote -
Containers extension above, this extension is a must. It provides a great
UI experience that is usually managed via the terminal. The Docker extension
shows all containers, images, volumes, networks, and registries within the
activity bar then gives you the ability to fully manage them. Even
right-clicking to enter a containers' shell.

## YAML

[<v-image
  alt="YAML in the VS Code Marketplace"
 src="./yaml.png"></v-image>](https://marketplace.visualstudio.com/items?itemName=redhat.vscode-yaml)

I wasn't at the meeting where everyone decided we would use YAML for DevOps,
but if you're looking to build continuous integration or deployment processes
today, you're stuck with it. That being said, the YAML extension by Red Hat
makes dealing with YAML much easier. Like other extensions in this list, it's
still in "Preview," but it works well enough that you should have this
installed if you use YAML. I find myself using it to make sure my GitHub
Actions aren't ruined by simple spacing issues.

## ESLint

[<v-image
  alt="ESLint in the VS Code Marketplace"
 src="./eslint.png"></v-image>](https://marketplace.visualstudio.com/items?itemName=dbaeumer.vscode-eslint)

If you've ever built a project with a team, you know the experience of trying
to manage style rules across team members. Many projects use ESLint to set
expectations and audit code in a project, but the ESLint extension brings
that capability all the way to the code editor. It displays linting errors
in real-time as you're writing code, allowing you to make adjustments before
commits or pull requests.

## Live Share

[<v-image
  alt="Live Share in the VS Code Marketplace"
 src="./live-share.png"></v-image>](https://marketplace.visualstudio.com/items?itemName=MS-vsliveshare.vsliveshare)

With more teams working remotely, it's becoming increasingly important to
communicate well. Live Share helps you quickly share your code, debug
sessions, and more with others. You can allow them to join your development
session as a viewer or contributor and they experience the code base as
if they were running it locally. In fact, they can debug remotely to help
you solve problems faster. Check out the
[Extension Highlight](https://youtu.be/x53lUlTml5k) for more features.

## Code Spell Checker

[<v-image
  alt="Code Spell Checker in the VS Code Marketplace"
 src="./code-spell-checker.png"></v-image>](https://marketplace.visualstudio.com/items?itemName=streetsidesoftware.code-spell-checker)

There's no secret to the problem Code Spell Checker solves. Whether it's
variable names or comments, this extension looks over your shoulder to make
sure you're spelling things correctly. Sure it helps with my code, but I see
the biggest benefit when writing documentation or blog posts like this one. I
write all my posts &amp; most of my documentation in Markdown and inside VS
Code. Code Spell Checker just makes sure I don't distract people from the
point I'm conveying with spelling mistakes.

## Bracket Pair Colorizer 2

[<v-image
  alt="Bracket Pair Colorizer 2 in the VS Code Marketplace"
 src="./bracket-pair-colorizer-2.png"></v-image>](https://marketplace.visualstudio.com/items?itemName=CoenraadS.bracket-pair-colorizer-2)

Bracket Pair Colorizer 2 is the most straightforward extension of the
pack. Still, it solves an inconvenience that I've lived with for 20 years of
development. When writing code that requires multiple pieces of code with
nested parenthesis, square brackets, or curly brackets, it's easy to lose
the context of where you are in your code's logic.
Bracket Pair Colorizer 2 solves this by color-coding your parenthesis and
brackets to help you identify the context you're working in faster. There
are several points of customization that I covered in an
[Extension Highlight](https://youtu.be/p24vnBYWSQQ) that you can check out.

## Wrap Up

Are there VS Code extensions you can't live without? Would you like to see an
[Extension Highlight](https://youtube.com/baldbeardedbuilder) about an extension
you've been using or thinking about? Look me up on
[Twitter](https://twitter.com/baldbeardbuild),
[LinkedIn](https://www.linkedin.com/in/michaelwjolley/),
or [Discord](https://discord.gg/XSG7HJm) and let me know!
