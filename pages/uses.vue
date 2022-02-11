<template>
  <article>
    <header>
      <cld-image
        alt="Michael during a Twitch stream in front of his PC"
        public-id="ograph-gear_dyocrb"
        title="Michael during a Twitch stream in front of his PC"
        quality="auto"
        fetch-format="auto"
        responsive
        ><cld-placeholder type="blur"
      /></cld-image>
    </header>
    <main>
      <aside>
        <TableOfContents
          v-if="toc.length > 0"
          :toc="toc"
          :levels="toc.length > 10 ? [2] : [2, 3]"
        />
      </aside>
      <section class="content">
        <PageTopper title="Current Gear & Setup" />
        <div>
          <p>
            I regularly get questions about the hardware &amp; software I use. I
            actually made
            <a href="/blog/current-twitch-live-coding-stream-setup/"
              >a blog post</a
            >
            about it in early 2019, but I've not really pointed people in that
            direction because it has become so outdated. Of course, if you have
            a question that isn't covered here, feel free to reach out.
          </p>

          <p>
            My goal is to keep this page updated as things change, but if you
            see me using something that's not listed, you can always submit a
            PR.
          </p>

          <blockquote>
            <strong>Full disclosure:</strong> All the links on this page are
            affiliate links. That means if you purchase the item I get a little
            change from Amazon. So you get what you want/need and I get a
            coffee. Win/win.
          </blockquote>

          <h2 id="software">Software</h2>

          <p>
            With podcasting, live-streams, and YouTube, I use a lot more
            software than just an IDE &amp; terminal, but that seems like a good
            place to start.
          </p>

          <h3 id="ide-terminal">IDE &amp; Terminal</h3>

          <p>
            Visual Studio Code is my go-to IDE for 90% of my development, but
            rather than using the stable build, I use the
            <a target="_blank" href="https://code.visualstudio.com/insiders/"
              >insiders</a
            >
            build. I've never experienced any weirdness by using it and it
            allows me to try new features faster.
          </p>

          <p>
            My most commonly used themes are
            <a
              target="_blank"
              href="https://marketplace.visualstudio.com/items?itemName=tinkertrain.theme-panda"
              >Panda Syntax</a
            >
            and
            <a
              target="_blank"
              href="https://marketplace.visualstudio.com/items?itemName=juliettepretot.lucy-vscode"
              >Lucy</a
            >, but that can change during live-streams because my themes are
            controlled by chat. I use the
            <a target="_blank" href="https://github.com/tonsky/FiraCode"
              >Fira Code</a
            >
            font with ligatures enabled.
          </p>

          <p>My must-have extensions include:</p>

          <ul>
            <li>
              <a
                href="https://marketplace.visualstudio.com/items?itemName=ms-vscode-remote.remote-containers"
                >Remote - Containers</a
              >
            </li>
            <li>
              <a
                target="_blank"
                href="https://marketplace.visualstudio.com/items?itemName=ms-azuretools.vscode-docker"
                >Docker</a
              >
            </li>
            <li>
              <a
                target="_blank"
                href="https://marketplace.visualstudio.com/items?itemName=kenhowardpdx.vscode-gist"
                >Gist</a
              >
            </li>
            <li>
              <a
                target="_blank"
                href="https://marketplace.visualstudio.com/items?itemName=GitHub.vscode-pull-request-github"
                >GitHub Pull Requests &amp; Issues</a
              >
            </li>
          </ul>

          <p>
            My everyday terminal is
            <a target="_blank" href="https://github.com/Microsoft/Terminal"
              >Windows Terminal</a
            >. Most of the time I'm using PowerShell 7, but will occasionally
            bounce into bash with WSL 2.
          </p>

          <h3 id="audio-video-editing">Audio/Video Editing</h3>

          <p>
            For audio, I exclusively use
            <a
              target="_blank"
              href="https://www.adobe.com/products/audition.html"
              >Adobe Audition</a
            >. For the most part, I'm mixing podcasts and the occasional sound
            clip for a video or live-stream. My workflows in Audition are fairly
            basic and I could probably do them with other audio software like
            Audacity.
          </p>

          <p>
            All my video editing happens in
            <a href="https://www.adobe.com/products/premiere.html"
              >Adobe Premiere Pro</a
            >. Once edited, I move it to
            <a
              target="_blank"
              href="https://www.adobe.com/products/aftereffects.html"
              >Adobe After Effects</a
            >
            for polishing. All of the transitions and overlays on my live-stream
            came directly from projects in After Effects. When I need graphics,
            I primarily use
            <a
              target="_blank"
              href="https://www.adobe.com/products/illustrator.html"
              >Adobe Illustrator</a
            >, but will occasionally use
            <a
              target="_blank"
              href="https://www.adobe.com/products/photoshop.html"
              >Adobe Photoshop</a
            >
            for image manipulation.
          </p>

          <p>
            So, you're probably thinking "basically you love Adobe", but not
            really. I do have a Creative Cloud subscription but only because
            it's discounted as we homeschool our kids. If I was forced to pay
            full price I would probably find free or cheaper alternatives.
          </p>

          <h3 id="project-planning">Project Planning / Misc</h3>

          <p>
            A lot of my time is spent managing and planning upcoming content.
            For the most part, I use
            <a target="_blank" href="https://airtable.com/invite/r/mh4sfC6g"
              >Airtable</a
            >
            for all of it. That includes:
          </p>

          <ul>
            <li>Planning podcast, video &amp; live-stream content</li>
            <li>Scheduling guests</li>
            <li>Event planning</li>
            <li>Feedback and community management</li>
            <li>Sponsor management</li>
          </ul>

          <h2 id="hardware">Hardware</h2>

          <p>
            The one thing I'm certain of is that I have way too much hardware. I
            have quickly turned into an A/V nerd and seem to gain lighting &amp;
            cameras as quickly as many developers acquire keyboards. But let's
            start with the non-A/V hardware.
          </p>

          <h3 id="computer-specs">Computers / Specs</h3>

          <p>
            My primary computer is a newly built
            <a target="_blank" href="https://www.originpc.com/">Origin</a>
            Windows machine. I chose every piece of it with their technicians
            with my workload &amp; processes in mind. So far I've been super
            happy with it and love the added BBB logo etched on each side. You
            can catch a good view of it in my
            <a href="/blog/building-my-ultimate-rustic-developers-desk/"
              >Building my Ultimate Rustic Developers Desk</a
            >
            post.
          </p>

          <p>As for the internals, they are:</p>

          <ul>
            <li>
              <a target="_blank" href="https://amzn.to/3h1c3ua"
                >Gigabyte X570 AORUS Elite</a
              >
            </li>
            <li>
              <a target="_blank" href="https://amzn.to/3h1ch4u"
                >AMD Ryzen 9 3950X 16-Core</a
              >
            </li>
            <li>
              <a target="_blank" href="https://amzn.to/3h3UAB7"
                >64GB Corsair Vengeance</a
              >
            </li>
            <li>
              <a target="_blank" href="https://amzn.to/37zHicL"
                >NVidia 8GB GeForce RTX 2080 Super</a
              >
            </li>
            <li>Origin RGB FrostByte 240 Sealed Liquid Cooling System</li>
            <li>
              <a target="_blank" href="https://amzn.to/2LP1IG1"
                >Corsair 1TB MP600 Gen4</a
              >
            </li>
            <li>
              <a target="_blank" href="https://amzn.to/3rfIb1G"
                >Corsair 850RM Series Plus Gold PSU</a
              >
            </li>
          </ul>

          <p>
            I also use a Surface Pro 5 when I'm away from the desk and a Surface
            Pro 3 for capturing video via NDI.
          </p>

          <p>
            I upgraded my monitors in the last half of the year to two
            <a target="_blank" href="https://amzn.to/3rfyLTT"
              >Samsung 32" 144Hz curved monitors</a
            >. I had previously used 3 24" monitors that have been with me for
            nearly 10 years. Needless to say, I feel like I'm seeing the world
            in color for the first time.
          </p>

          <p>
            My everyday keyboard is a
            <a target="_blank" href="https://amzn.to/38jMaBU">Drop ALT</a>, and
            for the mouse, I use a
            <a target="_blank" href="https://amzn.to/3r8hfkB"
              >Microsoft Surface Precision</a
            >. My
            <a target="_blank" href="https://amzn.to/2KkR89r"
              >Elgato Stream Deck</a
            >
            has also become an essential part of my workflow. I use the 15 &amp;
            6 button variants for different tasks.
          </p>

          <p>
            I dislike bulky headphones and already had a pair of
            <a target="_blank" href="https://amzn.to/3mDMRLg">Shure SE425-CL</a>
            in-ear monitors. So I use them in my day-to-day.
          </p>

          <h3 id="video-hardware">Video/Stream Hardware</h3>

          <p>
            I started live-streaming in 2018 using a
            <a target="_blank" href="https://amzn.to/38p1SLQ">Logitech C920</a>
            webcam. It served me faithfully and I still have 3 of them that I
            use for certain shots that don't require high definition.
          </p>

          <p>
            Since then, I've moved on to using two
            <a target="_blank" href="https://amzn.to/3h3yChK">Sony A6400</a>
            mirrorless cameras. It provides me with 4K video with a clean
            output. (Hit me up on socials if you want to learn more about clean
            output and why it matters.) Depending on what I'm doing, I'll be
            using a
            <a target="_blank" href="https://amzn.to/3h6fH5K"
              >VILTROX 23mm F1.4</a
            >
            or
            <a target="_blank" href="https://amzn.to/2Ww09yX"
              >Sony 18-135mm f/3.5-5.6</a
            >
            lenses.
          </p>

          <p>
            Lights seem to grow like weeds in my office. Currently, I'm using:
          </p>

          <ul>
            <li>
              2
              <a target="_blank" href="https://amzn.to/3nBYfc2"
                >Elgato Key Lights</a
              >
            </li>
            <li>
              2
              <a target="_blank" href="https://amzn.to/3pckFke"
                >GVM RGB Led Video Lights</a
              >
            </li>
            <li>
              2
              <a target="_blank" href="https://amzn.to/34u6W0C"
                >LE 50W Outdoor RGB Color Changing LED Flood Lights</a
              >
            </li>
            <li>
              2
              <a target="_blank" href="https://amzn.to/37AcecB"
                >Emart 60 LED Lighting Kit</a
              >
            </li>
          </ul>

          <p>I'll admit it. I have a problem. :)</p>

          <h3 id="green-screen">Green Screen</h3>

          <blockquote>
            <strong>Note:</strong> Regardless of the type of green screen you
            use, the most important thing to consider for proper color keying is
            lighting. Without proper lighting, you'll never get super polished
            color keying.
          </blockquote>

          <p>
            If you've watched the live-stream before, you know that I use the
            green screen a lot. I previously used the
            <a target="_blank" href="https://amzn.to/3arkk9s"
              >Fovitec green screen</a
            >
            held up by the
            <a target="_blank" href="https://amzn.to/3rhjhij"
              >Fovitec stand kit</a
            >. It worked great and I used it for well over a year, but I got
            tired of the setup/teardown each day.
          </p>

          <p>
            Because so much of my role is video creation and I have a dedicated
            space for production, I decided to make the green screen a more
            permanent part of the room. I picked up a
            <a target="_blank" href="https://amzn.to/3rjCxMc"
              >Neewer wall mount</a
            >
            and an
            <a target="_blank" href="https://amzn.to/2WGEqEl"
              >Emart 10 X 12ft green screen backdrop</a
            >. The mount is attached to my office ceiling and I can roll/unroll
            within a couple seconds. In my latest streams, I start without the
            green screen and drop it after the intro and raise it just before
            the ending credits.
          </p>

          <h3 id="audio-hardware">Audio Hardware</h3>

          <p>
            This category has changed a lot over the past six months, but
            hopefully, I'll stay with what I have for a while. I use several
            microphones depending on the situation.
          </p>

          <p>
            For most tasks, including podcasts, day-to-day, and live-streams, I
            use a
            <a target="_blank" href="https://amzn.to/3rdeiyZ">Shure SM7B</a>.
            Depending on the segment/shot, I'll use a
            <a target="_blank" href="https://amzn.to/3re2IUn">Rode NTG4+</a>
            shotgun microphone, and in some circumstances, like recording
            several voices at the same time, I'll use an
            <a target="_blank" href="https://amzn.to/3rbyn8Z"
              >Audio-Technica AT2020</a
            >. When using the SM7B or AT2020, I use the
            <a target="_blank" href="https://amzn.to/36gP61M">Rode PSA1</a> as
            my mount.
          </p>

          <p>
            All of these microphones feed into a
            <a target="_blank" href="https://amzn.to/3awVdlx"
              >Rode RODECaster Pro</a
            >
            that I use for mixing. I previously used a
            <a target="_blank" href="https://amzn.to/3myMC4b">GoXLR</a>, and if
            you're focused on live-streaming, I would definitely recommend it.
          </p>

          <p>
            If you're using the SM7B, I would recommend sending it through a
            <a target="_blank" href="https://amzn.to/34vJqjz"
              >Cloudlifter CL-1</a
            >
            to add clean gain.
          </p>

          <h2 id="thanks">Thanks!</h2>

          <p>
            Needless to say, there are a plethora of cables, mounts, tripods,
            etc. in use around the office, but I won't go into detail over
            those.
          </p>

          <p>
            I hope this helps and gives you some ideas for what you'd like in
            your setup. You can always reach out on social media with any
            additional questions.
          </p>
        </div>
      </section>
    </main>
    <footer>
      <RelatedPosts :tags="tags" slug="uses" />
    </footer>
  </article>
</template>
<script>
import generateOgraph from '@/middleware/generateOgraph'
export default {
  data() {
    return {
      tags: [
        'twitch',
        'hardware',
        'software',
        'tools',
        'stream',
        'youtube',
        'video',
        'blog',
      ],
      toc: [
        {
          id: 'software',
          depth: 2,
          text: 'Software',
        },
        {
          id: 'ide-terminal',
          depth: 3,
          text: 'IDE & Terminal',
        },
        {
          id: 'audio-video-editing',
          depth: 3,
          text: 'Audio/Video Editing',
        },
        {
          id: 'project-planning',
          depth: 3,
          text: 'Project Planning / Misc',
        },
        {
          id: 'hardware',
          depth: 2,
          text: 'Hardware',
        },
        {
          id: 'computer-specs',
          depth: 3,
          text: 'Computers / Specs',
        },
        {
          id: 'video-hardware',
          depth: 3,
          text: 'Video/Stream Hardware',
        },
        {
          id: 'green-screen',
          depth: 3,
          text: 'Green Screen',
        },
        {
          id: 'audio-hardware',
          depth: 3,
          text: 'Audio Hardware',
        },
        {
          id: 'thanks',
          depth: 2,
          text: 'Thanks',
        },
      ],
      info: {
        title: 'Current Setup & Gear',
        path: '/uses',
        description: 'My current setup & gear used everyday.',
        tags: ['gear', 'hardware', 'setup'],
      },
    }
  },
  head() {
    const metaTitle = `Hardware & Software I Use`
    const metaDescription =
      'What gear & software am I currently use to work and generate content?'
    const metaOgraph = generateOgraph(
      'Current Hardware & Software\nMichael is Using',
      ['gear', 'what-i-use']
    )
    const metaUrl = 'https://baldbeardedbuilder.com/uses/'
    const meta = [
      { hid: 'og:url', property: 'og:url', content: metaUrl },
      { hid: 'twitter:url', name: 'twitter:url', content: metaUrl },
      {
        hid: 'twitter:title',
        name: 'twitter:title',
        content: metaTitle,
      },
      {
        hid: 'twitter:description',
        name: 'twitter:description',
        content: metaDescription,
      },
      {
        hid: 'twitter:image',
        name: 'twitter:image',
        content: metaOgraph,
      },
      {
        hid: 'twitter:image:alt',
        name: 'twitter:image:alt',
        content: metaTitle,
      },
      {
        hid: 'og:title',
        property: 'og:title',
        content: metaTitle,
      },
      {
        hid: 'og:description',
        property: 'og:description',
        content: metaDescription,
      },
      {
        hid: 'og:image',
        property: 'og:image',
        content: metaOgraph,
      },
      {
        hid: 'og:image:alt',
        name: 'og:image:alt',
        content: metaTitle,
      },
    ]
    return {
      title: metaTitle,
      meta,
    }
  },
}
</script>
<style lang="scss" scoped>
article {
  header {
    @apply w-full;
    @apply lg:max-w-4xl xl:max-w-6xl;
    @apply mx-auto;
    @apply rounded-md;
    @apply mb-8;
  }

  main {
    @apply flex flex-row lg:gap-8;
    @apply mb-12;
    @apply px-5 sm:px-3 md:px-0;

    @apply lg:max-w-4xl xl:max-w-6xl;
    @apply md:mx-auto;
    @apply items-start;

    aside {
      @apply flex-col;
      @apply w-1/12;
      @apply z-0;
      @apply sticky;
      top: 105px;
      @apply flex;
      @apply lg:w-1/5;

      @apply text-darkPurple dark:text-gray-100;
    }
  }
}
</style>
