---
tags: posts
layout: pages/post
title: How a Cat Debugged Stable Diffusion
date: 2023-12-17T12:00:00-07:00
excerpt: The story of how Stable Diffusion caused my computer to emit an awful
    squealing sound, and how my cat solved it.
socialImage: https://blog.dwac.dev/posts/cat-debugging/ollie.webp
socialImageAlt: |
    A long-haired, brown tabby cat lays in an office chair. He is twisted around
    on his back and looking at the viewer upside down. His front paws are held
    out in the air as he seems to be saying "You can't possibly kick someone
    THIS cute out of a chair YOU gave up by leaving for more than 5 seconds."
---

# How a Cat Debugged Stable Diffusion

```timestamp
```

This is the story of how I needed help to solve a tricky bug. Now, that happens
all the time. I rely on coworkers and the web community to help me with bugs
quite frequently. But this one was unique because it wasn't just any colleague,
it was my cat Ollie, specifically this asshole stealing my chair:

![A long-haired, brown tabby cat lays in an office chair. He is twisted around
on his back and looking at the viewer upside down. His front paws are held out
in the air as he seems to be saying "You can't possibly kick someone THIS cute
out of a chair YOU gave up by leaving for more than 5 seconds."
](./ollie.avif)(./ollie.webp)

I was interested in experimenting with AI image generation. Not for any
particular use case, just doing it for fun. I could use any number of existing
web sites to do this, but pretty much all of them require some form of login or
payment and as I have
[previously established on this blog](/posts/html-fragments-routing/#service-worker-server),
I am too cheap to do that. So instead I went with the pro hacker move of trying
to run [Stable Diffusion](https://github.com/Stability-AI/stablediffusion/) on
my computer locally.

This took most of the day and required multiple approaches and many failed
attempts, but I did eventually get it installed via the _very cool_
[<code>stable-diffusion-webui</code>](https://github.com/AUTOMATIC1111/stable-diffusion-webui/) project. Excited, I immediately start generating a picture of a litter of
kittens cuddling and sleeping together, because what else could I possibly
generate?

Suddenly the microwave timer goes off. Food is done I guess. I didn't realize my
partner was heating up dinner already, it is a little early for that.
Microwave's tone sounds a bit off too, I hope it isn't broken or something.

But more importantly, I now have a cute (if a little creepy) picture of kittens!

![Four kittens fill the entire image, uncomfortably close to one another. Each
cat looks almost like they were copy-pasted from the same base. They are mostly
white on the paws and chest, dark on the back, with some streaks of orange on
the head. The eyes are off in an inexplicable, uncanny way.
](./kittens.avif)(./kittens.webp)

I immediately bump up the batch size to make a handful of them and restart.

Then the microwave goes off again. That's weird, it's only been maybe 30
seconds since the last time. I guess the food wasn't quite warm enough?

This generation takes maybe a minute due to the larger batch size. Except, the
microwave doesn't stop. It just keeps going. A long, loud BEEEEEEEEEP.

Oh crap, the microwave's broken. Wait, not the microwave, but the computer? This
long and horrendously loud beep was coming from my workstation?! Generating an
image was apparently so stressful on my computer that it was forced to let out a
strained squeal of frustration—a cry for help.

I hastily apologize to the computer before our future AI overloads hear about
this war crime I just committed. But now the hunt is on: how is Stable Diffusion
causing my computer to beep like this?

I immediately run to Google and even post to a few forums for suggestions about
what to look for. I'm more of a software guy and was never that in to hardware.
What do I even search for here: "stable diffusion computer beep loud"?

A few potential causes quickly come to my attention:

**Could this sound be "coil whine"?** Almost everything I read immediately
suggests
["coil whine"](https://en.wikipedia.org/wiki/Electromagnetically_induced_acoustic_noise)
as a likely culprit. This can happen due to vibrations of components caused by
an electric current. I look up a few videos of that, but they don't sound
anything like what I'm hearing. Those videos sound like a standard electrical
hum—just loud enough to be annoying. My computer sounds like a pig fleeing its
own slaughter. Seriously, listen to this video and tell me with a straight face
that it sounds anything like coil whine:

```video
{
    "type": "demo",
    "urls": ["./demo.mp4"],
    "size": [1920, 1080],
    "audible": true
}
```

**Is my machine not powerful enough for Stable Diffusion?** This computer is
rocking an RTX 3080, with 32 GB of RAM, is that really not good enough? I have
run big code compilations before. [Bazel](https://bazel.build/) can be fairly
resource hungry and I even
[built V8 (really d8) from source](https://techhub.social/@develwithoutacause/111513699508070036)
the other day. I have run modern video games on max settings and done a touch of
video editing. This machine isn't winning any awards, but it's a beefy box, and
I have never heard more than a gentle hum from it before. These image generation
jobs take seconds to complete, not minutes. Resources don't seem like the issue.

**Is the GPU overheating?** The sound emits immediately when generating an
image, there is no time for the computer to heat up. I double check the
temperature and it is running at a pretty reasonable 60°C. The CPU is in a
similar state.

**Is the fan messed up? Maybe a bearing came loose?** Well, the machine is
mostly liquid cooled, but does have a couple fans for air flow. They look fine
on inspection and again, the sound is immediate, no time for them to spin up to
a bad frequency or for the machine to get overheated.

**Is there a speaker in the box?** This was a pre-built machine, but I picked
the parts for it myself. Unless the builder snuck in a speaker, or one was
included on the motherboard, I can't imagine there is any audio device in there.

**Is the [terminal bell](https://en.wikipedia.org/wiki/Bell_character) being forced on at max volume?**
I have never heard a terminal bell for longer than a single beep, but maybe that
is possible? I am pretty sure I disabled it, because seriously, who _actually_
wants an audible beep from their terminal? Testing it now I cannot even get it
to ring once intentionally.

What component is actually beeping anyways? I pull the side panel off my
computer and generate 100 images just to hear the sound and try to trace where
it is coming from.

Is the power supply overloaded? Could the sound be coming from there? I don't
think so, but the sound is so loud it feels like it is coming from the whole
computer. Maybe the motherboard? Could that have a speaker built into it? That
must be terrible for acoustics, but maybe useful for a little beep when
something is wrong?

While I'm on the floor asking my nonverbal computer to point to where it hurts,
Ollie suddenly rushes into the room seemingly attracted by the noise. He hurries
over to my computer, confused and annoyed, wondering what woke him up. I gently
push him away from the computer to avoid getting even _more_ of his fur inside
the box. Seriously, how does a single cat shed so much?

But Ollie ignores the computer altogether. He goes around the machine and peeks
behind my desk, sniffing around. What does he hear, I wonder?

Then, without hesitation, Ollie lifts his paw and starts aggressively whacking
my surge protector, as if shouting **"SHUT THE F--- UP!"**

I quickly pull Ollie away before he electrocutes himself and banish him from the
office. I hurry back and push the computer out of the way to listen. He's right,
it's not the computer, it's the surge protector!

But this isn't just any surge protector. I have an
[uninterruptible power supply (UPS)](https://en.wikipedia.org/wiki/Uninterruptible_power_supply).
It is basically a surge protector with a big battery in it. So if the power goes
out, it automatically falls back to the battery and you can still squeeze
another X hours of juice out of it until the main power comes back on.

![An uninterruptible power supply. It looks like a standard surge protector, but
is shaped like a brick and significantly larger.](./ups.avif)(./ups.webp)

I'm not running an always-online server on it or anything like that. I just get
a surprising number of power fluctuations my area (shout out to PG&E). Those
fluctuations make my office lamp flicker which can give me a headache and
sometimes the power is out just long enough that the computer shuts down. The
UPS is supposed to keep the computer alive through that couple-second outage.

So if the power supply is complaining, does that mean Stable Diffusion is
pulling too much energy? I quickly check my system specs. My computer's power
supply is a Seasonic FOCUS GM-750W Gold. Just like it says in the name, it maxes
out at 750 watts. Meanwhile the UPS was only rated for up to _360 watts_.
Looking at the manual, the UPS emits a loud beep whenever it's running out of
battery—or in this case, _being overdrawn_.

$200 later and after swapping a massive battery for an even more massive
battery, I'm now able to run Stable Diffusion without my workstation screaming
in utter horror.

**Public Service Announcement: Check your power usage before you buy a UPS.**

So that answers it: Stable Diffusion was forcing my machine to pull so much
power that it tripped my UPS. Since it was right behind my computer, I couldn't
pinpoint where the sound was coming from and it took Ollie's keen ears to find
the true culprit. Who knew cats could be so good at debugging? I swear Ollie is
way too smart for his own good and is now apparently better at debugging than I
am. Perhaps software developers should be less worried about AI stealing our
jobs and more worried about felines swiping them away.

Unfortunately I didn't capture Ollie going to battle with my surge protector on
camera and I'm not skilled enough to draw it. But I _do_ now have an AI which
can visualize what this looked like:

![A black cat (?) jumps on top of a green box with its paws in the air about to
swipe, drawn in an animated cartoon style. The cat's face is deformed with odd
lines for eyes and the box doesn't seem to clearly identify as anything in
particular, just a strange off-green color with some arbitrary switches and
plugs in it.](./battle.avif)(./battle.webp)

Maybe it's the AI who should be afraid.
