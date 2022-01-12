---
date: 2019-05-20 
title: "Using a CONTRIBUTING & CODE_OF_CONDUCT to assist others in contributing to public repositories"
cover: ./58047500-f400df80-7b0d-11e9-917c-b4b1cd4a8d2b_b3iim4.jpg
banner_image_alt: Woman working on laptop leaned against a brick wall.
description: Helping other contribute to public repositories on GitHub by providing contributing and code of conduct guidelines.
tags: [github, contributions, code-of-conduct]
---

It seems that lately I've been creating a new public repo every other day. A few
have even received pull requests from other contributors. As that list of contributors
began to grow I realized there were a few things that I, and probably other repository
maintainers, want to provide.  So, as always, when I learn something new, I write a
blog post.

My goal is to explain the benefits of acknowledging contributors and providing them
with contributing and code of conduct guidelines.

<!--more-->

## Contributing Guidelines

For the most part, contributors have seen my repositories on our [Twitch][twitch] stream
and wanted to help.  The benefit to the stream is that viewers can see the process we use
to submit pull requests, our branching strategies, etc. However, for those that want to
join in on the fun later, it's likely that their pull requests will be directed to the
wrong branch or perhaps for an issue that is already in progress by another contributor.

To help, I went on a search for example `CONTRIBUTING.md` files across GitHub.  There
were several great examples. A few are:

* [PurpleBooth](https://gist.github.com/PurpleBooth/b24679402957c63ec426)
* [Puppet](https://github.com/puppetlabs/puppet/blob/master/CONTRIBUTING.md)
* [Factory Bot Rails](https://github.com/thoughtbot/factory_bot_rails/blob/master/CONTRIBUTING.md)

I modified thoughtbot's Factory Bot Rails version to meet my needs and added it to all my
active public repositories.  You can see an example in our
[Aviary](https://github.com/MichaelJolley/aviary/blob/master/CONTRIBUTING.md) repo.

At a minimum, your CONTRIBUTING.md should include details about:

* What type of contributions are permitted? (documentation/code/ideas/tests/examples/etc.)
* Instructions for adding issues
* Instructions for forking & submitting pull requests

This basic information gives potential contributors a little more confidence about
submitting that pull request by alleviating the fear they'll be blasted for using the
wrong base branch.

## Code of Conduct

I'll admit I'm a little knew to this one. I'm not sure I've ever read a repositories Code of
Conduct before this week. It's easy to overlook when you expect the best from people and/or
haven't experienced the effects of poor conduct when participating in public repo communities.
But the fact that I've never personally experienced something doesn't mean I should overlook
that bad behavior in the development community does exist. In fact, regardless of
my personal experiences, I want everyone to feel included and safe to share ideas and collaborate.

Having a CODE_OF_CONDUCT.md in your public repository lets potential contributors know in
advance how they can expect to be treated by the community and maintainers.
[Contributor Covenant](https://www.contributor-covenant.org/) is a great resource for a Code
of Conduct for your repository.

## Acknowledging Contributions

I love new contributors! It makes my day when I get a notification that someone created an
issue, submitted a pull request or even just forked the repository. There are several ways to
show love for your contributors but one I've recently implemented (and love) is the
[All Contributors](https://allcontributors.org/) specification.

When someone contributes I simply comment on an issue or pull request and the
All Contributors bot creates a pull request that gives that person an acknowledgement
on our README.md.

An example from our VS Code extension is:

<v-image
  alt="Example of the bottom of our README's with contributors."
 src="./58047645-3cb89880-7b0e-11e9-8270-7fd116460102_ve78fr.jpg"></v-image>

Not all contributions are code.  Using All Contributors, I can recognize contributors for everything from ideas, questions, documentation, tests, examples and more.  A full listing of options is available on their [emoji key](https://allcontributors.org/docs/en/emoji-key).

It's a fun way to give credit where it's due and encourage others to participate.

## Wrap it up Mike

That's my TED Talk for today.  Do you have ideas on how to help new contributors join in? Let me hear them!

[twitch]: https://twitch.tv/BaldBeardedBuilder
