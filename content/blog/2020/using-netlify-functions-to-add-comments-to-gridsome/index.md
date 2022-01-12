---
date: 2020-06-14
title: "Using Netlify Functions to Add Comments to Gridsome"
cover: ./cover-image.png
banner_image_alt: Terminal window with the words Using Netlify functions with Gridsome 
description: Netlify provides serverless functions to process information, while Gridsome provides a Vue.js based static-site generation. In this post we combine the two allowing visitors to leave comments on our posts.
tags: [netlify, gridsome, functions, serverless, vuejs]
---

When I started writing this blog a few years ago, I was overwhelmed by the number of platforms available to me. JavaScript, .NET, Ruby? We got 'em all! While I settled on Jekyll, it was somewhat by accident. I really liked the idea of writing my posts in Markdown with GitHub Pages and, since they were powered by Jekyll, the choice was made for me.This toml will cause the compiled function to be placed in the lambda folder in the root directory of our application.

<!--more-->

Since then many of those platforms have gone the way of the buffalo. But it seems that just as one dies off, another takes its place. Now we have options for nearly every language and framework. You're an Angular developer? You might feel comfortable with [Scully](https://github.com/scullyio/scully). More of a React dev? [Gatsby](https://www.gatsbyjs.org/) is probably more up your alley. I've been developing with Vue.js for a while, so [Gridsome](https://gridsome.org/) seemed like a better fit for me.

No matter the framework & platform you choose, before you get too far you hit the same brick wall we all do... *user comments*.

## Platform? Check. Comments? Uhhhh...

<img alt="Logos of Facebook, Disqus, and Discourse" src="https://res.cloudinary.com/dk3rdh3yo/image/upload/c_scale,w_auto/v1591930862/socials_yakdpk.png" class="right"/>

Write your posts in Markdown they said. It will compile to a static site they said. But no one ever brings up the fact that comments on a blog aren't static. Hopefully, your community is chiming in and providing feedback. So how do we add these dynamic, incoming messages to our page?

Just like the multitude of static-site frameworks, there are a ton of options for managing comments on your site. From integrating platforms like Disqus or Facebook to systems like Discourse. But I wanted more control over my site. I didn't want to integrate with a third-party that may require my visitors to register for an account.

Then it hit me... my site lives in GitHub. If I could store comments in files within my repo, I could add them to the site just like my posts. Plus, I'd gain the ability to use pull requests as my moderation tool.

But how to make that happen...

## Servers? We Don't Need No Stinking Servers

> I'm going to assume you already have a Gridsome site. If you want to stand something up quickly, I used the [Gridsome CLI](https://gridsome.org/docs/gridsome-cli/) to generate the basic framework I needed.

<img alt="Scene from the film The Treasure of the Sierra Madre with the words 'Servers!? We don't need no stinking servers!'" src="https://res.cloudinary.com/dk3rdh3yo/image/upload/c_scale,w_auto/v1591934417/servers_obmhkl.png" class="right"/>

There's an old saying "To a man with a hammer, everything looks like a nail." Lately, no matter the problem I face, serverless functions seem like the answer. So why stop now? Let's make a serverless function that we trigger via an HTTP Post request.  We'll send it information about the comment and let it create a file in my repo with the details.

We'll need a few more npm packages before we can write our function. These will be used to communicate with the GitHub Rest API, manipulate query string information, and convert objects to YAML.

```bash
npm install --save @octokit/rest querystring js-yaml
```

In the root of your project create a folder named `functions` and, within that folder, create a file named `comments.js`. Copy the following into that file.

```js
const { Octokit } = require("@octokit/rest")
const querystring = require('querystring');
const yaml = require("js-yaml")

const { GITHUB_USERNAME, GITHUB_AUTHTOKEN, GITHUB_REPO } = process.env;

const octokit = new Octokit({ auth: GITHUB_AUTHTOKEN });
let baseRef, latestCommitSha, treeSha, newTreeSha, comment, commentId, commitRef;
```

In the snippet above, we're pulling in our external packages, referencing environment variables, and defining variables we'll use as we progress.  The `Octokit` object will be used to communicate with the GitHub Rest API.

I'm not going to discuss the following code block in detail because this isn't a post about how to do things with the GitHub API, but briefly, they:

- Get the default branch of the repo
- Create a branch based on the latest commit on that branch
- Convert the comment data to YAML 
- Commit that YAML to a file in the new branch
- Get a ref to that commit
- Create a pull request from the new branch to the default branch

Whew! Now let's copy the code below into our `comments.js` file.

```js

const saveComment = async () => {
  
  // Validate the incoming comment
  if (comment.message && comment.message.length > 0) {
    await getBaseBranch();
    console.log('getBaseBranch');
    await getLastCommitSha();
    console.log('getLastCommitSha');
    await createTree();
    console.log('createTree');
    await createCommit();
    console.log('createCommit');
    await createRef();
    console.log('createRef');
    await createPullRequest();
    console.log('all good');
  }
}

const getBaseBranch = async () => {
  let response = await octokit.repos.get({
    owner: GITHUB_USERNAME,
    repo: GITHUB_REPO
  });
  baseRef = response.data.default_branch;
}

const getLastCommitSha = async() => {
  let response = await octokit.repos.listCommits({
    owner: GITHUB_USERNAME,
    repo: GITHUB_REPO,
    sha: baseRef,
    per_page: 1
  });
  latestCommitSha = response.data[0].sha;
  treeSha = response.data[0].commit.tree.sha;
}

const createTree = async () => {
  const commentYaml = yaml.safeDump(comment);
  let response = await octokit.git.createTree({
    owner: GITHUB_USERNAME,
    repo: GITHUB_REPO,
    base_tree: treeSha,
    tree: [
      {
        path: `content/comments${comment.postpath}${comment.id}.yml`,
        mode: "100644",
        content: commentYaml
      }
    ]
  });
  newTreeSha = response.data.sha;
}

 const createCommit = async () => {
  let response = await octokit.git.createCommit({
    owner: GITHUB_USERNAME,
    repo: GITHUB_REPO,
    message: `Comment by ${comment.name} on ${comment.postpath}`,
    tree: newTreeSha,
    parents: [latestCommitSha]
  });
  latestCommitSha = response.data.sha;
}

const createRef = async () => {
  let response = await octokit.git.createRef({
    owner: GITHUB_USERNAME,
    repo: GITHUB_REPO,
    ref: `refs/heads/${comment.id}`,
    sha: latestCommitSha
  });
}

const createPullRequest = async () => {
    await octokit.pulls.create({
      owner: GITHUB_USERNAME,
      repo: GITHUB_REPO,
      title: `Comment by ${comment.name} on ${comment.postpath}`,
      body: `avatar: <img src='${comment.avatar}' width='64'  height='64'/>\n\n${comment.message}`,
      head: comment.id.toString(),
      base: baseRef
    });
}

const hash = (str) => {
  let hash = 0;
  let i = 0;
  let chr;
  if (str.length === 0) return hash;
  for (i = 0; i < str.length; i++) {
    chr = str.charCodeAt(i);
    hash = (hash << 5) - hash + chr;
    hash |= 0; // Convert to 32bit integer
  }
  return hash;
}
```

Now we can write the serverless function that will use those methods to save our comment. Add the following to `comments.js` file.

```js
exports.handler = async (event, context) => {
  
  const bodyComment = querystring.decode(event.body);
  comment = {
    postpath   : bodyComment.postpath,
    message    : bodyComment.message,
    name       : bodyComment.name,
    avatar     : bodyComment.avatar,
    redirect   : bodyComment.redirect,
    identity   : bodyComment.identity,
    date       : new Date(),
    id         : Math.abs(
                    hash(
                      `${new Date()}${bodyComment.postpath}${bodyComment.name}`
                    )
                  )
  };
  console.log(comment)
  const redirectUrl = comment.redirect;
  if (comment) {
    try {
      await saveComment();
      return {
          statusCode: 302,
          headers: {
            location: redirectUrl,
            'Cache-Control': 'no-cache',
          },
          body: JSON.stringify({ })
        }
    }
    catch (err) {
      return {
        statusCode: 500,
        body: err
      };
    }
  }
  else {
      return {
          statusCode:400,
          body: "Please pass comment details."
      };
  }
}
```

This method uses various values posted to it to create a `comment` object. This object contains information like the actual message of the comment, an avatar of the user, and the path of the post on our blog.

It then calls the `saveComment()` method we added previously to save the comment to our repo and create a pull request.

## Wiring the HTML Form

With the function in place, let's add the appropriate fields to our comment form. Below is a form you can use, but to summarize it sends:

- `postpath`: relative path to the post
- `redirect`: fully qualified URL to redirect the commenter to
- `avatar`: fully qualified URL of an avatar to use for this commenter
- `message`: the actual comment left
- `name`: name to display for the commenter

Netlify functions can be reached at `/.netlify/functions/{function name}`. Since we named this function `comments.js`, our form will post to `/.netlify/functions/comments`.

> **Note:** This was a "gotcha" for me. The URL for the function is the name of the file without its' extension.  Netlify's documentation states this but I overlooked it for several minutes submitting to /.netlify/functions/comments.js.

```html
<form
    method="post"
    v-on:submit.prevent="postComment"
    action="/.netlify/functions/comments"
    data-netlify="true"
    data-netlify-honeypot="bot-field"
    ref="commentform"
    >
    <p hidden>
    <label>
        Don’t fill this out: <input name="bot-field" />
    </label>
    </p>
    <input type="hidden" name="redirect" id="redirect" value="https://baldbeardedbuilder.com/thanks/"/>
    <input type="hidden" name="avatar" id="avatar" ref="avatar" />
    <input type="hidden" name="postpath" id="postpath" :value="path"/>

    <div class="avatar">
        <img
        src="/images/comments/unknown-avatar.png"
        data-fallbacksrc="/images/comments/unknown-avatar.png"
        data-role="user-avatar"
        alt="avatar"
        id="avatarPreview"
        ref="avatarPreview"
        />
    </div>
    <div id="commentstatus" class="status" ref="commentstatus"></div>

    <ul class="flex-outer">
    <li>
        <label for="message">Comment<br/><span class="required">* required</span></label>
        <textarea rows="6"
            id="message"
            name="message"
            required
            v-model="formData.message"
            placeholder="Your message"></textarea>
    </li>
    <li>
        <label for="name">Your Name<br/><span class="required">* required</span></label>
        <input type="text"
            id="name"
            name="name"
            required
            placeholder="Enter your name here"
            v-model="formData.name">
    </li>
    <li>
        <label for="identity">Email/GitHub<br/><span class="required">* required</span></label>
        <input type="text"
            id="identity"
            name="identity"
            v-on:change="checkAvatar"
            required
            placeholder="Your email address or GitHub username"
            v-model="formData.identity">
    </li>
    <li>
        <button type="submit"
        id="comment"
        ref="commentbutton">Leave Comment</button>
    </li>
    </ul>
</form>
```

## Compiling the Function with Gridsome

We'll want to test our functions locally and to do that we can install the `netlify-lambda` npm package.

```bash
npm install --save-dev netlify-lambda
```

Next, we'll update our `package.json` file to allow us to build and debug. Modify your `package.json` scripts to include the following:

```js
 "scripts": {
    "build": "gridsome build && netlify-lambda build functions",
    "develop": "gridsome develop && netlify-lambda serve functions",
    "explore": "gridsome explore",
    "serve": "netlify-lambda build functions && netlify-lambda serve functions "
  }
```

This will tell netlify-lambda to build the functions located in the `functions` folder. To let netlify-lamba know where to put our compiled functions, we'll add a `netlify.toml` file to the root of our application. Paste the following configuration in it.

```toml
[build]
command = "npm run build"
functions = "lambda"
```

This toml will cause the compiled function to be placed in the `lambda` folder in the root directory of our application.

## Configuring Netlify for our Function

<img src="https://res.cloudinary.com/dk3rdh3yo/image/upload/c_scale,w_auto/v1592013132/84557187-8c0bd100-acee-11ea-90b7-c409186d6c08_o7qt3r.png" alt="Function deploy settings in Netlify" class="right"/>

We can log into our Netlify account to configure our functions. First, go to the `Site Settings` for your site in Netlify and click on `Functions`. Then press `Edit settings` and update the `Functions Directory` to `lambda`. This coincides with the directory you specified in the `netlify.toml` above.

Then click on `Environment` under the `Build & deploy` settings.  Enter the three environment variables we specified in our function above (`GITHUB_USERNAME`, `GITHUB_REPO`, and `GITHUB_AUTHTOKEN`). `GITHUB_AUTHTOKEN` is a GitHub personal access token that has been given write permissions to the repo.

Once you deploy your application you'll see additional billing options for functions, but Netlify has a very generous free tier for functions that include up to 125,000 requests and 100 hours of compute.

## Sit Back, Relax and Merge Pull Requests

That's it! When someone fills out the form on one of your Gridsome pages a new branch and pull request will be created with the comments' details. You can then preview the Netlify build to see the comment on your pages before approving the merge.

I've been using Gridsome with Netlify for months and love how easy they've made deploying and serving my site. The fact that I can use this function to add comments to my site is just icing on the cake.

Was there something I missed? Maybe I didn't explain something well? Let me know in the comments!
