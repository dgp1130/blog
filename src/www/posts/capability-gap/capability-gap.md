---
tags: posts
layout: pages/post
title: The AI Capability Gap
date: 2025-11-01T12:00:00-07:00
excerpt: |
  Some musings about AI as a new user type, API surfaces which support it, the
  core capabilities we need, and the gap which exists today.
languages: [ html, css ]
---

# The AI Capability Gap

_Disclaimer: AI played no part in authoring this blog post, however I did ask
Gemini for a review and incorporated some of its feedback._

Ever since the launch of ChatGPT, the software industry has, like it or not,
been obsessed with AI and invested millions of dollars into building tools and
infrastructure to support it.

I've been endlessly fascinated by this for a few reasons beyond the AI features
themselves. It feels like we're in the middle of a very unique time in our
industry's history, one in which we're quite literally building out an entirely
new ecosystem, largely from scratch, at an incredible velocity and scale.

I'm still not very good with AI myself. Frankly, delegating problems to an agent
makes me mentally disengage so heavily that literally I start falling asleep at
my desk. However, I've definitely seen the power of LLMs. Being so heavily
involved in web tooling myself, I've been trying to keep up with this space for
a while now and that's only been accelerated as my day job on
[Angular](https://angular.dev/) has been pivoting more and more to focus on AI
integrations. I've been forced to ask myself what kind of AI tooling is
necessary to support web frameworks in this new age, which has led me to
identify a few key takeaways I want to share here which can help guide our
thinking about building AI-enabled tooling.

This post itself is a slightly more generic version of a section from our
[AngularConnect](https://angularconnect.com/) 2025 keynote (which I don't think
has been posted publicly yet?). If you're not familiar with Angular, don't
worry, this post doesn't _really_ have anything to do with it, beyond some loose
examples you don't really need any background to understand.

## User Types

We have historically had two major types of users for any kind of software:
humans and automation.

* Humans are those squishy water-filled flesh bags which like rich UI
  interfaces, well-integrated services, and smooth animations.
  * Examples:
    * You (no really).
    * That one user who can't find their phone's power button.
* Automation covers the wide range of code that calls other code. It loves
  determinism, well-defined data schemas, and strong API contracts.
  * Examples:
    * A CI (continuous integration) runner.
    * A cronjob running a task every X hours.

> Now we have a third type of user: the AI agent.

This one is a little strange in that it doesn't follow strict rules like
traditional automation and can even reason much like a human, but doesn't care
for UI applications. It is also weirdly non-deterministic and totally ok with
unstructured data, but has a limited and unreliable memory in the form of a
constrained context window.

Which user type you're targeting to solve a particular problem heavily
influences the kinds of architectural decisions you make and the kind of
software you ultimately build. This is because each user type works best with
different _API surfaces_.

## API Surfaces

A developer, a CI runner, and an AI agent walk into a bar. They each order "One
build please!"
* The bartender hands the developer two red squiggly lines and a hundred orange
  ones. They sigh and go next door for a coffee.
* The bartender gives the CI runner a big red X and a wooden log with errors
  etched all over. It neatly organizes the log next to a thousand others.
* The bartender tells the AI agent, "Your build failed" and goes on to state
  each error verbally. The AI replies "You're absolutely right!"

The human and automation user types have been around for a long time and, as an
industry, we understand pretty well how to build software for them. For humans,
this is typically limited to graphical interfaces and some unique accessibility
devices, but also developers are comfortable with CLI tools in the right
circumstances. Automation works best with CLI tools, libraries in your preferred
programming language, or REST services accessible over a network, among other
options.

Each of these is a distinct "API surface" which can be easier or harder to
consume for the different user types. Picking the right surface for your
solution is critical to meeting your users where they need it.

For example, when the Angular team wanted to provide a tool to build Angular
applications, we _could_ have built a graphical interface where you click a
button each time you want to build your app, but that would have been difficult
to script and run in CI environments, among a host of other issues. So we didn't
do that, and instead developed [Angular CLI](https://angular.dev/tools/cli),
understanding that running `ng build` as a CLI command would work better for
automated use cases while still supporting human users in a context where a CLI
tool would be a fairly reasonable compromise.

But now, we have to consider AI as its own user type.

Continuing the Angular CLI example, `ng serve` runs a devserver in the
foreground and blocks the terminal until you press <kbd>Ctrl</kbd> +
<kbd>C</kbd>. Developers understand this convention and automation can run this
as a subprocess and send the kill signal when done. Defining our solution's API
surface as a CLI tool has historically been perfectly fine and is how the vast
majority of devservers operate.

With AI now in the picture, a new constraint arises. AI agents can generally run
CLI tools just fine. However, they will typically execute a command in a
blocking context, waiting for it to complete before finishing. For `ng serve`,
the command technically runs forever, and will cause the AI agent to just hang.
The agent doesn't know to kill the process, and the use case breaks.
Sometimes agents are smart enough to run `ng serve &` to execute it in the
background, which avoids hanging the prompt, but then they struggle to see the
output of the command which indicates any compile errors which need to be fixed,
meaning they lose a critical piece of information normally available to either
humans or automation using the same command.

To generalize this example, our existing design uses an API surface which works
fine for human users and traditional automation, but breaks for AI agents.
Fixing this requires an entirely new API surface for agents to interact with
which is more friendly to their limitations.

> AI users demand new API surfaces.

So what kind of API surface makes sense for AI agents?

[Model Context Protocol (MCP)](https://en.wikipedia.org/wiki/Model_Context_Protocol)
is the most obvious API surface tailored to AI use cases.
[Angular's MCP server](https://angular.dev/ai/mcp) exists for this exact reason.

MCP is a great starting point, but as an industry, we have only just begun the
process of building the AI ecosystem and are still figuring out the patterns and
abstractions which work well for AI agents.

MCP is one of our most foundational tools and yet is still not even a year old
as of time of writing and many other major problems still remain unsolved. Even
today, I don't believe we've really addressed _composability_, as libraries and
dependencies cannot define prompts or MCP tools in a way which is consumed
automatically without application developers manually enabling them
individually. Code inside browser contexts cannot easily communicate with AI
agents outside of them, siloing a huge part of the web ecosystem off from its AI
tooling. I'm still not convinced we've really figured out how to make MCP
services accessible to non-technical users in a generic AI prompt interface.

At a higher-level, we need to rethink the kinds of products and services we are
building in the first place. Applications are figuring out how best to serve
users through chat interfaces. Products need to make their experiences available
within a foreign chat application. [OpenAI's Atlas](https://chatgpt.com/atlas)
is trying to redefine what it means to be a browser in an LLM world. Everyone
needs to figure out how to monetize users trapped within a big tech chat UI.

The progress we've made in such a short time is quite amazing, but we must
recognize that we are still _very_ early in this process and potentially still
lack the mechanisms which will be considered foundational when we look back on
AI in 10+ years.

We didn't figure out UX for humans overnight and many unsolved problems still
exist. We're only just now trying to figure out what API surfaces best serve AI
users and our journey has just begun.

So if we have and will need additional API surfaces to support AI agents, what
kind of solutions will we need to provide in the first place? Can we dig deeper
to understand the core _needs_ of AI agents?

## AI Needs

Exactly what functionality your AI agent needs and how it should interact with
that functionality is heavily dependent on the precise workflow you're trying to
use AI for. However, any AI workflow likely emulates all or part of existing
human or automation workflows. Based on the context of an existing system, we
can look to these human and automated use cases we already support for
inspiration.

> Humans and AI have similar needs.

While AI agents are far from human, I've found that they can be surprisingly
"human" in the way they operate. Both human developers and AI agents want
detailed documentation, well-lit paths for common problems, and clean APIs. We
both hallucinate from time to time, get frustrated when technology doesn't work,
and sometimes make irrational decisions.

My current favorite AI interaction:

> Me: Hey, this increment button ain't incrementing, can you fix it?
>
> AI: Hmm, looks like an Angular component but I'm not sure why it wouldn't
> work. Must be
> [change detection](https://angular.dev/guide/components/advanced-configuration#changedetectionstrategy),
> I'll call
> [<code>markForCheck</code>](https://angular.dev/api/core/ChangeDetectorRef#markForCheck)
> and see if that fixes it.

Never have I felt more seen by a piece of technology.

Using existing human needs as a baseline for AI needs is a great starting point.
However, it potentially limits our imagination of what we can build in the
future based on what's been possible in the past. How can we take this a step
further to support not just the AI use cases we can envision today, but also set
up our products for success with the unimaginable workflows we'll be using
tomorrow?

## Capabilities

This next part requires us to actually narrow our focus down. To stop thinking
about these higher-level workflows and instead ask ourselves what humans,
automation, and AI agents actually want to _do_ down to the smallest scope we
can define. Things like, "pull some code", "run a build", "brew some coffee".
What might we call these "things that users want to do"?

We could call them "use cases", but that's a bit higher-level abstraction than
I'm thinking here. A use case has a goal, a purpose which we compose multiple
"things" to achieve.

We could call it "context", in that all three of these user types want to know
certain aspects about the system, such as current build errors or the currently
checked out commit. In some sense, those are both relevant context about the
application. There's an aspect of
["context engineering"](https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents)
at play here no doubt. However, I think the term "context" is a bit broader than
"things you can do." It tends to be a little more readonly than I'm envisioning
and also covers aspects like historical information about the system's
development, the tech stack in use, the team's style guide, the architecture,
and more.

Instead, the word I'm landing on is "capability".

> A "capability" is a discrete task which a user, (whether human, automation, or
> AI), can perform.

This often requires some input data and outputs relevant information about the
system and can be composed to create higher-level capabilities. These range
from:

* Read a file from disk.
* Make a network request.
* Perform a build and receive any errors.
* Run tests and receive the results.
* Set a breakpoint.
* Inspect the current state of a variable.

These capabilities define the core actions available to a user and are the
fundamental primitives which can be composed to achieve larger capabilities and
eventually a higher-level workflow. For example, as a human you can fix a bug
using a workflow from the standard software development lifecycle:

1. Read the Jira ticket.
1. Pull the latest copy of the code.
1. Start the application.
1. Fail to reproduce the issue.
1. Close the bug as not reproducible.
1. Get notified when your boss reopens the issue.
1. Actually reproduce it.
1. Debug the problem.
1. Wonder how it ever worked in the first place.
1. Write some new code.
1. Test it.
1. Merge it.

This workflow is a combination of smaller capabilities you, as a human, are able
to perform. Each of them is a capability an AI agent will benefit from to create
its own workflows, whether identical to this one, a subset of it, or something
completely different.

As a tooling engineer focused on integrating disparate systems into a cohesive
experience, the features I actually build are often these capabilities, core
primitive functions and connections. Capabilities support higher-level workflows
and use cases, both ones I can imagine and am building for today, as well as
those I can't and which can surface organically from the same implementations.

Therefore I believe most products should focus on designing and building these
core capabilities while allowing AI agents to compose them into more
comprehensive workflows. There's a broader discussion around what designing
these workflows actually looks like and the experiences you can create with
them, but here I'm focused on the lower-level tooling integrations, so I'll
leave that out of scope for now.

## Capability Parity

This leads to the next point I want to make: All user types (humans, automation,
and AI agents) should have parity across their raw capabilities. Or put another
way:

> Anything a human can do, an AI should be able to do too.

Aligning capabilities between the different user types enables AI agents to be
just as powerful as humans or traditional automation. When we lose this parity,
we end up asking AI to solve problems it is fundamentally unprepared to solve,
much like bringing in a contractor to fix a bug without giving them access to
the source code containing it.

What often looks like an AI just not being intelligent enough to solve a problem
can often be attributed to the AI doing the best it can with the limited
capabilities provided to it. You can open your browser and see that a button is
clearly not centered and look at DevTools to understand which style might be
causing that. But if your AI does not have that same capability, it is left
guessing as to what might be causing a behavior it can't even observe in the
first place. You would probably struggle the same way if you were forced to
debug such an issue from looking only at source code. In this way, providing an
AI the right capabilities directly impacts its ability to intelligently reason
about a problem and find the right solution.

I think this idea of capability parity has actually been pretty well-known for a
while, just without the AI agent part. If you build a UI to do something,
eventually some power user is going to ask for a script or API so they can
automate the same process. There's already a desire to align these capabilities
across humans and automation, AI is just adding one more user type.

Now I feel compelled to add a few qualifiers here:

First, AI agents should still be subject to the same constraints a human would.
For example, most mature organizations do not allow developers to merge a PR or
push to prod unrestricted. You first need tests to pass and a bribe for your
tech lead to approve it. So notably, those are both capabilities which humans
generally _do not_ have and therefore do not need to be given to AI without
comparable constraints.

Second, we don't necessarily need the _a single_ AI to have access to all of
these capabilities. The AI helping you write code and the AI triaging bugs don't
need equivalent capabilities. In fact, providing too many capabilities may have
the opposite effect of distracting it into the wrong workflow for the problem at
hand. The point here is that _some_ AI has the capability you need in a context
you can leverage effectively.

Third, don't take this too seriously. All absolute statements are false and I'm
talking mainly in the context of software engineering here. Trust and safety is
a thing for a reason. Please don't give your AI the capability to launch a nuke,
use some common sense.

The main argument here is that we can use existing capabilities provided to
humans and traditional automation as inspiration for capabilities we want to
provide to AI agents while still supporting novel workflows which compose them
in unique and interesting ways.

## The Capability Gap

The language of "capabilities" also allows us to define the scope of all "human
capabilities" and currently feasible "AI capabilities" being the full set of
actions either user type can perform. Comparing these two allows us to define...

> The "capability gap" is the set of actions a human can perform but an AI
> cannot.

Since the goal is overall parity, this gap should be eliminated entirely, or at
least close to eliminated.

I suspect over the next decade, a main focus of our industry will be closing
this capability gap, finding all those little features and filling in the bells
and whistles to make AI agents as powerful as individual developers.

Capabilities within this gap aren't just a superiority complex for developers;
they represent a human tax placed on any workflow that exercises them. Any time
an AI workflow requires a capability it doesn't have, it is forced to use a
less-effective alternative (breakpoints vs. `printf` debugging), or I as the
human driver need to step in and perform that work for it.

As an overly-simplified example, if an  AI can't see error messages, then it is
my responsibility to find and copy-paste those messages into the prompt. There's
no intelligence, engineering, or meaningful knowledge work here; there is only
toil to serve the needs of my personal AI overlord. I have become a
[mechanical turk](https://en.wikipedia.org/wiki/Mechanical_Turk), a function
implemented not of ones and zeros but of clicks and key presses, invoked by an
autonomous being from a higher plane. My only salvation is to empower that being
so it no longer demands physical labor from me such that I may think for myself
when it chooses to spare me by placing its attention elsewhere.

Sorry, I was spacing out there for a second...

The point is, there is a huge opportunity space for developers and startups to
identify missing capabilities and build out the tooling and integrations
necessary to support them. Don't limit yourself by thinking "eh, someone's
already solving these problems". I guarantee you there are gaps no one is
thinking about yet where you can find your niche.

Ultimately, I don't think anything in this post is all that innovative. Gemini
summarizes it, quite correctly, as: "For AI to be truly useful, we need to build
new tools and APIs to give it the same 'capabilities' as a human developer,
otherwise we're just stuck being glorified assistants for our new robot
overlords." That probably isn't a discovery that's going to win me a Nobel
prize.

But as [Jeremy Elbourn](https://bsky.app/profile/jelbourn.bsky.social) would put
it, "Naming something gives you power over it." This is true in a
[mystical sense](https://en.wikipedia.org/wiki/True_name) as well as an
engineering one. Being able to concretely define a concept enables you to reason
rationally about it.

To that end, I hope that better defining our three user types, their API
surfaces, capabilities, and the capability gap can help change the way you think
about AI and how you move forward in this new era.
