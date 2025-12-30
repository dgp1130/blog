---
tags:
    - posts
    - series/game-design
layout: pages/post
title: The Phase Two Problem
date: 2025-12-29T12:00:00-07:00
excerpt: TODO
---

# The Phase Two Problem

```timestamp
```

TODO:
* Date
* Social image

2025 was a great year for video gaming and as the year came to a close I started
to get FOMO of all these great games I hadn't experienced yet such as
[Hollow Knight: Silksong](https://hollowknightsilksong.com/). Just one problem,
I never played the original [Hollow Knight](https://www.hollowknight.com/).

I'm not huge on Metroidvanias, but have been known to dabble occasionally and
Hollow Knight's reputation certainly preceded it. And that reputation is 100%
deserved. Seriously, this is potentially my personal Game of the Year (only
eight years late), though I'm still quite underwater in my backlog with Silksong
itself and [Clair Obscur](https://www.expedition33.com/) notably still in the
backlog.

However, as I reached the endgame of Hollow Knight, I found myself frustrated
with a recurring issue from Souls-like games, one I haven't seen discussed too
much. Typically, I try to "stay in my lane" and blog about topics I'm pretty
knowledgeable in, primarily web development. With that, I feel the need to
disclaim that I'm not a game designer and have minimal formal training in this
area. But I am a lifelong gamer with a long-time interest in game design, and
lack of experience never stopped anyone else on the internet, so why not
criticize one of the best games of our generation? What could possibly go wrong?

SPOILER NOTE: This post discusses content from the following games:

*   Hollow Knight - Endgame bosses and some story vibes (not really lore).
*   [Elden Ring](https://www.bandainamcoent.com/games/elden-ring) - Endgame
    bosses.
*   [Cuphead](https://cupheadgame.com/) - Bosses.
*   [Demon's Souls](https://www.fromsoftware.jp/ww/detail.html?csm=070) -
    Endgame vibes.

TODO: Styling?

## Learning vs Mastering

I want to start by defining what it means to defeat a boss. Typically in
Souls-like games, this involves a lot of dying, as the games themselves are
designed to be difficult enough to require the player to explicitly _learn_ the
unique patterns and weaknesses of each boss.

The player starts off knowing nothing about a given boss and plays purely by
reacting to boss behavior. Over time, and likely a few deaths, the player learns
its various moves, how to deal with each one, where the punish windows are, and
what strategies work best. Eventually, the player defeats the boss and moves on
to the next area.

This is often the end of the story for most casual players who only ever defeat
a particular boss once on their one play-through of the game. However if the
player were to attempt the boss a second time, there is often no guarantee they
would defeat it again. Their one victory was likely at least partially informed
by luck, whether that is the boss not using that one BS attack, landing a really
big attack for huge damage, or just getting a clutch roll at the right time. If
the player dies to a boss 10 times, and happens to kill on the 11th, there is
potentially a low chance that a 12th attempt won't still end in defeat.

I call this out to draw a distinction between learning a boss and mastering it.
We can think of the player as "learning" a boss up until their first victory,
and then any subsequent attempts are better described as "mastering" it.

"Mastering" a boss often involves finding synergies to maximize equipment
utility, such as the right combination of passive buffs. It can also mean
maximizing damage by finding the right poke to sneak in mid-dodge of an enemy
combo, or more consistent ways to dodge attacks. This can even including
learning or manipulating the enemy AI to avoid certain hard-to-dodge attacks or
create a completely scripted fight. This process can, in many ways, be just as
engaging as learning the boss was originally.

Here, I'm using "first victory against the boss" as a somewhat arbitrary
distinction between the "learning" and "mastering" phases of a boss. Certainly,
I've defeated some bosses on a first attempt by sheer luck or sight-reading and
have little confidence I would be to replicate that success. But I think the
first victory is a useful boundary to consider how much learning the game
demands of the player before allowing them to progress.

TODO: Image

## The Phase Two Problem

With those definitions out of the way, we can actually define the phase two
problem: When _learning_ phase two of a boss requires _mastering_ phase one.

Imagine a two-phase boss with each phase using a completely distinct set of
attacks. You need to be able to defeat the first phase before you can even _see_
the second phase and all of its new attacks.

A great example of this is Radagon / Elden Beast from Elden Ring. They are two
"phases" of the same boss fight in that there is no checkpoint between them, but
the two characters are so drastically different that it is very easy to die to
Elden Beast attacks you haven't learned yet and then be forced into another
fight with Radagon before you can attempt Elden Beast again.

As mentioned earlier, once you've defeated Radagon once, you've "learned" him,
but have no where near "mastered" him. The next attempt is very likely to fail,
and however many attempts to takes to defeat Elden Beast leads to that many
_successful_ attempts on Radagon.

Learning phase two is also just generally harder than phase one, as the player
is likely significantly stressed out from pushing through the first phase to be
in the right head space for learning a second phase. Beyond that, it is very
rare to win a fight in phase one, but it is absolutely possible to _lose_ a
fight in phase one. Spending all your resources on phase one makes it quite
difficult to know how to use them effectively on phase two or even live long
enough to learn anything useful for subsequent attempts.

This further leads to complicated trade-offs between the two phases. You can
spend all your resources on the first phase and more consistently reach the
second phase, but then you can't rely on those resources when you need them in
phase two. Alternatively you can hold some or all of your resources for phase
two, but this makes phase one artificially more difficult and means you fail to
even reach phase two much more frequently. You're trading off mastery of phase
one against learning phase two.

A slightly less extreme example from Elden Ring is Promised Consort Radahn, in
the Shadow of the Erdtree DLC. Phases one and two do share a decent number of
attacks, and mastering them in phase one does set up the player to more
successfully learn phase two. However each attack gains columns of light with
additional hitboxes, meaning many dodging strategies which were valid in phase
one aren't in phase two. He still gets completely new attacks as well, often
with complicated patterns to dodge, tight timing, or requiring unintuitive
solutions (seriously, you're supposed to run _into_ him when he charges directly
at you?).

My personal experience with Consort was one of frustration and anger as it would
take two to four attempts of phase one to even make it to phase two, and then I
would immediately die to an attack I hadn't seen before or didn't know how to
dodge. Sometimes I'd try something new and fail, now learning one thing which
didn't work, but having to spend the next 15 minutes before I could try again to
discover another thing which didn't work, until eventually I figured out the one
thing which actually _does_ work.

Both RadaBeast and Consort are some of the most controversial bosses in Elden
Ring, and I think it is partially because of the phase two problem. If Elden
Beast was split into its own fight, or Consort started in phase two, I suspect
we would see significantly less complaints over the difficulty of each fight.

But of course, multi-phase bosses exist for a reason. Taking away phase one of
Consort would dramatically reduce the narrative build up of the encounter and
completely change the tension and emotion of the fight. His overall quality
would be significantly _worse_ without phase one, even if he would be less
frustrating as a result.

### Severity

How bad the phase two problem is for a boss depends on a lot of factors.

1.  How hard is it to reach phase two? If most players don't die on phase one,
    then it doesn't have much negative impact as a barrier to phase two.
    *   Note that runbacks to a boss encounter can also act as a kind of phase
        one.
2.  How many phases are there? Three-phase and more-phase bosses have the same
    problem but worse.
3.  How much is there to learn? One new attack or mechanic requires much less
    learning and can often be easy enough to pick up even in the phase two
    situation.
    *   If the game reuses content and uses patterns or mechanics which were
        already learned previously, this barrier can be lowered significantly.
4.  How much overlap is there between phases? Does practice in phase one make
    the player more successful in phase two?
    *   This is tricky because phase one can be an opportunity for the player to
        develop "bad habits" which need to be unlearned in phase two, such as a
        particular attack being vulnerable to a punish in only the first phase.
5.  How much mastery is demanded of the player to begin with? Tolerating more
    overall mistakes from the player gives more opportunity to learn a difficult
    boss.
6.  Where is the boss placed in the player's journey? Optional or late-game
    bosses with a difficult phase two may be more tolerated by players who
    specifically _want_ that extra challenge.

## Hollow Knight

Sorry, I got a bit distracted ranting about Elden Ring, I thought we were
talking about Hollow Knight. Overall, I actually think Hollow Knight generally
avoids the phase two problem by nature of simply not having multi-phase bosses.

False Knight, Hive Knight, Nosk, Broken Vessel, Dung Defender, Troupe Master
Grimm, and Grey Prince Zote are all effectively one-phase bosses. That's not
_strictly_ true, though. As one example, Dung Defender goes into a rage at ~50%
health and repeats his dive-into-the-ground attack several times, but that
attack is a recurring staple of his kit in phase one, so it's not particularly
difficult to deal with it in phase two.

Note that dream variants of bosses (Lost Kin, White Defender,
Nightmare King Grimm, etc.) are not considered second phases because they are
distinct bosses with a separate checkpoint.

As a general rule, Hollow Knight second-phases typically only involve transition
attacks or make fairly minimal changes to a boss' moveset. Hollow Knight also
has the benefit of capping the amount of damage you can take at any given time
(generally one mask, two for bigger bosses), meaning you can't really get
one-shot in an Elden Ring sense. Occasionally you can get trapped in a bad
pattern and take multiple hits, but there's usually multiple mistakes involved
to get into that situation.

Two small exceptions to this rule are Mantis Lords and Soul Master. The former
has the Knight fighting a single mantis and after defeating it transition into
fighting two mantises with very similar attack patterns at a faster pace.
Maintaining so much of the moveset means practicing phase one helps dramatically
with phase two. The correct answer to each attack is also consistent across both
phases, with the only real exception being the projectile attack which now has
two hitboxes and changes safe spaces on the screen.

Soul Master does include a fairly distinct second phase, however it limits its
attacks to only two, the downward dive and homing projectile. Each of which is
sped up and repeated multiple times, lowering the complexity of what needs to be
learned in phase two. Phase two has low health, coming after a "fake death", and
the homing projectile attack is particularly vulnerable to repeated strikes,
meaning he drops in one-to-two cycles. Combine this with the fact that Hollow
Knight doesn't ever really one-shot the player and it is quite straightforward
to pick up phase two of Soul Master.

The fact that Hollow Knight limits its use of multi-phase bosses and manages the
complexity of the ones which do exist is a strong testament to just how
well-designed this game is.

And that's what makes it so frustrating when the game suddenly forgets about all
this.

### Radiance

There are three specific situations I want to call out where Hollow Knight
particularly suffers from the phase two problem. The first the final fight with
the titular Hollow Knight and subsequent Radiance.

Much like RadaBeast, Hollow Knight / Radiance is another paired
fight with many of the same problems. The two bosses have no overlap in design
or attacks meaning the player is forced to learn two completely distinct bosses
at the same time. Being the optional "true final boss" of the game, Radiance
does two masks of damage per-attack, has a huge variety of attacks to learn, and
at least five distinct phases in its own right, even ignoring the preceding
Hollow Knight fight.

Radiance on its own is actually one of my favorite bosses in the game. It
combines many attack patterns from previous bosses in a way which is
simultaneously easy to learn (you already dealt with all of her individual
attacks) while also being challenging to manage altogether. The music is
incredibly hype and the final ascent with the voids supporting the Knight is so
satisfying as an ending.

However, putting Radiance, far and away the hardest base game boss, after Hollow
Knight ultimately works against both bosses. It makes Radiance artificially
harder because its five phases now follow multiple phases of Hollow Knight and
it makes it Hollow Knight worse by forcing the developers to make it easier in
comparison. This is representative of all issues with multi-phase bosses I've
described above, but Radiance gets the unique award of ruining the Hollow Knight
boss as well.

Hollow Knight itself is actually a pretty easy fight. It doesn't have many
attacks which strike above it, meaning repeated pogo attacks are quite effective
and a comfortable strategy for the player this late in the game. The boss
literally stops to impale itself multiple times fighting against its own
infection, giving clear heal and damage opportunities.

This design makes sense in the broader context of the game for two reasons.
First, narratively, Hollow Knight is not meant to be a particularly imposing
character. It has been slowly dying from the infection and its weakness has
allowed the infection to spread throughout the crossroads. It would probably die
on its own if the Knight just walked away and let it sit for long enough. As a
player, you're _supposed_ to feel empty and unsatisfied when defeating it.
You're not killing a god so much as putting a dying bug out of its misery.

Second, Hollow Knight precedes the much more complicated Radiance, making it
effectively phase one of the hardest phase two in the game. If Hollow Knight
were more mechanically complex, it would detract from the player's ability to
learn Radiance and potentially have a negative effect on both fights.

The problem here is that Hollow Knight is _also_ the final boss of the game,
just not the "true boss". If you don't acquire the Void Heart, you don't fight
Radiance and the game ends immediately after defeating Hollow Knight. Without
Radiance, Hollow Knight feels strangely easy and straightforward compared to the
other, more complicated bosses the player after defeated to get to this point.

This makes a lot of narrative sense given the tone of the "Hollow Knight" or
"Sealed Siblings" ending you earn as a result, but it robs the player of the
satisfaction of demonstrating mastery of the games overall mechanics from a
difficult final boss.

This is the ending a decent chunk of players observed. Steam achievements show
that ~24% defeated Hollow Knight while only ~20% defeated Radiance. So of
players who beat the game, ~1/5 of them did not complete a "final test" of the
game's mechanics and received an unsatisfying ending as a result. Even more may
have gotten the "Hollow Knight" ending before later returning and defeating
Radiance for the "Dream No More" ending, meaning they started with that
unsatisfying ending before coming back for the "true ending" later 🙋.

TODO: Emoji

I can see an argument that Radiance _is_ that final test of the game's mechanics
and the "Hollow Knight" ending is practically speaking a "bad" ending of the
game which fits skipping that final mechanical test. However, I personally see
it as more of a "default" ending given the amount of work which needs to go into
unlocking Radiance at all for the "true ending". I still want that "default"
ending to be compelling in its own right, and I personally found it unfulfilling
as a result of Hollow Knight being too easy due to its placement before
Radiance.

Note: I want to be really clear about the distinction between a uncompelling
ending and an unsatisfying one. As I mentioned earlier, the "Hollow Knight"
ending is _supposed_ to be unsatisfying and it remains compelling precisely
because it is unsatisfying. My concern here is with the lack of a mechanical
test for this ending, not the emotion its narrative landed on.

While I haven't played it myself, I suspect Demon's Souls would be a good
example of a better way to handle this kind of ending. False King Allant serves
as the mechanical final test of the game while the subsequent True King Allant
is a husk of its former self and intentionally non-threatening to hit many of
the same emotional beats as the "Hollow Knight" ending.

You can imagine an alternative design where the player _begins_ the fight by
dream nailing the Hollow Knight and fighting Pure Knight (yes I know that was
added later in the DLC), treating Hollow Knight as the phase two of Pure Knight
to even further reinforce the decay of the infection and its failure to contain
it. Make Hollow Knight even easier and more self-destructive and this could hit
an even stronger emotional beat for the player while still using Pure Knight as
a satisfying mechanical test of skill at the end of the game.

TODO: Move this to solutions?

### God Tamer

God Tamer is a relatively straightforward boss. It is a duo boss, but the Tamer
itself is pretty passive onscreen, only occasionally jumping at the Knight and
swinging. The Beast is the focus of the fight, demanding effectively dodging of
its roll-and-bounce attack as well as correct spacing of its spit. On its own,
it's a perfectly reasonable encounter.

But God Tamer isn't on its own. This boss exists at the end of the Trial of the
Fool, the third and final enemy gauntlet featuring 17 waves of enemies. It can
take 5+ minutes of stressful combat before even reaching God Tamer for the first
time.

God Tamer itself is really a one-phase boss fight, but coming at the end of such
a long encounter with no checkpoint effectively makes it phase 2 of the broader
Trial of the Fool, or phase _18_ if you count each wave.

This is further exacerbated by unique enemies thrown into the Colosseum which
might be completely novel to the player depending on where they have explored.
In my playthrough, I reached the Colosseum before Queen's Gardens, meaning I
struggled a lot against the mantis enemies which I hadn't yet seen outside of
the Colosseum. This was practically its own phase 2, frequently killing me
before I ever reached God Tamer at all.

While most of my ire is directed at God Tamer, I do need to give a
(dis)honorable mention to the Oblobbles, in the Trial of the Conquerer, which is
also a unique boss at the end of a long gauntlet of difficult enemies. This one
is slightly less bad since it is really just a suped-up version of the basic
Obble enemy, but it suffers from many of the same complaints I have about God
Tamer.

### Godmaster



TODO: Outline

* Intro
* Learning vs mastering
* The phase-two problem
* The phase-two experience
  * Radahn / RadaBeast example?
  * Severity
    * How hard to get to phase 2?
      * Runbacks count too
    * How many phases are there?
    * How much is there to learn?
    * How much overlap?
    * How much mastery is demanded of the player?
    * Optional?
* Hollow Knight
  * Mostly one-phase bosses
  * God Tamer
  * Hollow Knight + Radiance
  * Godhome
* Solutions
  * Cuphead
  * Demon's Souls
  * Godhome
