<template>
  <article>
    <header>
      <cld-image
        alt="Hands of various people joined"
        public-id="cover_knfirw"
        title="Hands of various people joined"
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
        <PageTopper title="Code of Conduct" />
        <div>
          <p>
            The Bald Bearded Builder community is filled with amazing, clever
            and creative people, and we're excited for you to join us. Our goal
            is to create spaces where people can gather and discuss important
            themes and feelings that many of us will experience during our
            technical career.
          </p>

          <h2 id="being-a-good-community-member">
            Being a Good Community Member
          </h2>
          <p>
            Yes, there are things we don’t want you to do in our community — and
            we’ll get to those. But first we’d like to talk about things we do
            want folks to do. These are ways you can be a positive member of the
            Bald Bearded Builder community.
          </p>
          <p>
            Please begin by thinking carefully about and agreeing with the
            following statements:
          </p>

          <ul>
            <li>
              I will be welcoming to everyone at the table, and patient with
              newcomers
            </li>
            <li>I will treat everyone with respect, because they deserve it</li>
            <li>I will be mindful of the needs and boundaries of others</li>
          </ul>

          <p>
            Here are a few other key things you can do to make the community
            great:
          </p>

          <h3 id="be-humble">BE HUMBLE</h3>
          <p>
            People come from all different places, and it’s best not to make
            assumptions about what they think or feel. Approach others with
            curiosity. We all have a lot to learn from each other.
          </p>

          <h3 id="be-helpful-when-asked">BE HELPFUL WHEN ASKED</h3>
          <p>
            If someone asks for help, consider jumping in to point them in the
            right direction.
          </p>

          <h3 id="encourage-others">ENCOURAGE OTHERS</h3>
          <p>
            There’s no one path to have a career in technology. Instead of
            shooting down other people’s ideas, try to engage them in ways that
            create opportunities for learning and fun.
          </p>

          <h2 id="code-of-conduct">Code of Conduct</h2>
          <p>
            We ask everyone who participates in our community upholds their
            ideals. By vowing to follow these guidelines, you will help create a
            welcoming and friendly community based on respect and trust.
          </p>
          <p>
            We are committed to creating a harassment-free community. These
            rules will be strictly enforced in any and all of our official
            spaces, like our Discord server, Twitch chat and physical events,
            and everyone who participates in these spaces is required to agree
            to this community code. We have zero-tolerance for harassment, and
            anybody who engages in the following behaviors may be banned without
            warning. We also ask and expect community members to observe these
            rules anywhere the community is meeting (for example, online chats
            in unofficial platforms or event after-parties).
          </p>

          <h3 id="be-respectful">BE RESPECTFUL</h3>
          <p>
            Don’t make offensive comments related to gender, gender identity and
            expression, sexual orientation, disability, mental illness,
            neuro(a)typicality, physical appearance, body size, race,
            immigration status, religion, or other identity markers.
          </p>
          <p>
            Additionally, don’t insult or demean others. This includes making
            unwelcome comments about a person’s lifestyle choices and practices,
            including things related to diet, health, parenting, drugs, or
            employment. It’s not okay to insult or demean others if it’s "just a
            joke."
          </p>

          <h3 id="be-welcoming-and-open">BE WELCOMING AND OPEN</h3>
          <p>
            Don’t engage in gatekeeping behaviors, like questioning the
            intelligence or knowledge of others as a way to prove their
            credentials. And don’t exclude people for prejudicial reasons.
          </p>

          <h3 id="respect-privacy">RESPECT PRIVACY</h3>
          <p>
            Do not publish private communications without consent. Additionally,
            never "out" private aspects of a person’s personal identity without
            consent, except as necessary to protect them from intentional abuse.
          </p>

          <h3 id="respect-personal-boundries">RESPECT PERSONAL BOUNDARIES</h3>
          <p>
            Do not introduce gratuitous or off-topic sexual images, languages,
            or behavior in spaces where they are not appropriate. Never make
            physical contact or simulated physical contact without consent or
            after a request to stop. Additionally, do not continue to message
            others about anything if they ask you to stop or leave them alone.
          </p>

          <h3 id="be-a-good-neighbor">BE A GOOD NEIGHBOR</h3>
          <p>
            Do not make threats of violence, intimidate others, incite violence
            or intimidation against others, incite self-harm, stalk, follow, or
            otherwise harass others.
          </p>

          <h2 id="rules-for-online-spaces">Rules for online spaces</h2>
          <p>
            For Bald Bearded Builder' official online spaces, like our Twitch
            chat and community Discord channel, we have some additional rules.
            Any of the following behaviors can result in a ban without warning.
          </p>

          <h3 id="dont-spam">DON'T SPAM</h3>
          <p>Don't spam. We'll ban you.</p>

          <h3 id="keep-it-legal">KEEP IT LEGAL</h3>
          <p>
            If it’s illegal, it’s not allowed on our websites or in our online
            spaces. Please don’t share links to pirated material or other
            nefarious things.
          </p>

          <h3 id="no-trolling">NO TROLLING</h3>
          <p>
            Please be earnest. Don’t use excessive sarcasm to annoy or undermine
            other people. And don’t bait them with bad faith comments or abuse.
          </p>

          <h3 id="pornography-and-other-nsfw-stuff">
            PORNOGRAPHY AND OTHER NSFW STUFF
          </h3>
          <p>
            Please don’t post it or link to it. It doesn’t belong in our online
            spaces.
          </p>

          <h3 id="foul-and-graphic-language">FOUL AND GRAPHIC LANGUAGE</h3>
          <p>
            Please do not use excessive curse words. Additionally, do not use
            graphic sexual or violent language — again, think of our spaces as
            places for people of all ages.
          </p>

          <h2 id="reporting">Reporting</h2>
          <p>
            If you are being harassed by a member of the Bald Bearded Builder
            community, or if you observe someone else being harassed, please
            report the behaviour using our
            <a href="/report/">Code of Conduct Report Form</a>.
          </p>

          <h3 id="thanks">THANKS</h3>
          <p>
            This code of conduct is hugely inspired by You Got This Conference.
          </p>
        </div>
      </section>
    </main>
  </article>
</template>
<script>
import generateOgraph from '@/middleware/generateOgraph'
export default {
  data() {
    return {
      toc: [
        {
          id: 'being-a-good-community-member',
          depth: 2,
          text: 'Being a Good Community Member',
        },
        {
          id: 'be-humble',
          depth: 3,
          text: 'Be Humble',
        },
        {
          id: 'be-helpful-when-asked',
          depth: 3,
          text: 'Be Helpful When Asked',
        },
        {
          id: 'encourage-others',
          depth: 3,
          text: 'Encourage Others',
        },
        {
          id: 'code-of-conduct',
          depth: 2,
          text: 'Code of Conduct',
        },
        {
          id: 'be-respectful',
          depth: 3,
          text: 'Be Respectful',
        },
        {
          id: 'respect-personal-boundries',
          depth: 3,
          text: 'Respect Personal Boundries',
        },
        {
          id: 'be-welcoming-and-open',
          depth: 3,
          text: 'Be Welcoming and Open',
        },
        {
          id: 'respect-privacy',
          depth: 3,
          text: 'Respect Privacy',
        },
        {
          id: 'respect-personal-boundries',
          depth: 3,
          text: 'Respect Personal Boundries',
        },
        {
          id: 'be-a-good-neighbor',
          depth: 3,
          text: 'Be a Good Neighbor',
        },
        {
          id: 'rules-for-online-spaces',
          depth: 3,
          text: 'Rules for Online Spaces',
        },
        {
          id: 'dont-spam',
          depth: 3,
          text: "Don't Spam",
        },
        {
          id: 'keep-it-legal',
          depth: 3,
          text: 'Keep It Legal',
        },
        {
          id: 'no-trolling',
          depth: 3,
          text: 'No Trolling',
        },
        {
          id: 'pornography-and-other-nsfw-stuff',
          depth: 3,
          text: 'Pornography and Other NSFW Stuff',
        },
        {
          id: 'foul-and-graphic-language',
          depth: 3,
          text: 'Foul and Graphic Language',
        },
        {
          id: 'reporting',
          depth: 2,
          text: 'Reporting',
        },
        {
          id: 'thanks',
          depth: 3,
          text: 'Thanks',
        },
      ],
    }
  },
  head() {
    const metaTitle = `Bald Bearded Builder\nCommunity Code of Conduct`
    const metaDescription =
      'Community Code of Conduct that addresses how we expect community members to behave.'
    const metaOgraph = generateOgraph('Code of Conduct', [
      'inclusion',
      'community',
    ])
    const metaUrl = 'https://baldbeardedbuilder.com/code-of-conduct/'
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
