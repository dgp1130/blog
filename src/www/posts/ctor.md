---
tags: posts
layout: pages/post
title: Construct Better
date: 2022-02-13T12:00:00-07:00
excerpt: |
  Can programming languages design better constructors? Let us explore modern
  constructor design, its flaws, and some potential improvements.
languages: [ typescript ]
---

# Construct Better

{{ date | postDate | safe }}

Constructors are weird. No, seriously, have you ever taken a moment to
*really* think about them? Why they work the way they do? You probably learned
about constructors in school or on some online course and just accepted that is
the way objects are created. At some point you probably heard about the
[factory pattern](https://en.wikipedia.org/wiki/Factory_method_pattern) and use
that from time to time. For the most part, the development community has largely
accepted what a constructor looks like and how it works. But are constructors
really a solved problem? Or have we just plastered over the issues that come
with them via unnecessary workarounds?

## Limitations of Constructors

Constructors, by design, have a number of restrictions and constraints which are
applied to them. While this varies across languages, consider the number of
things constructors generally *cannot* do:

* Return `null`.
* Be asynchronous.
* Return a subclass.
* Return an already existing object.

Many languages also use the `new` keyword as an operator to invoke a
constructor, however the act of constructing a new object is entirely an
implementation detail. Whether a function returns a new instance of an object or
an existing one is mostly irrelevant to callers. However, if that function is
implemented as a public constructor, then it leaks the implementation detail of
constructing a new object. It means the function is now forced into the above
restrictions and cannot opt-out of them without breaking its API contract.

Factories solve a lot of these problems, and countless engineers have written
"best practices" docs and books espousing the factory pattern. However factories
have their own limitations. They do not play well with subclassing and
inheritance in general, because subclasses cannot extend an object returned by
another factory. Consider the following example:

```typescript
class Foo {
  protected constructor(public name: string) { }

  // Factory to hide the implementation detail of finding a
  // user's name.
  public static fromId(id: number): Foo {
    const name = getNameFromId(id);
    return new Foo(name);
  }
}

class Bar extends Foo {
  private constructor(name: string, public age: number) {
    super(name);
  }

  public static fromId(id: number): Bar {
    // Need to repeat `getNameFromId()` here, can't compose
    // `Foo.fromId()` like I want to without getting hacky.
    const name = getNameFromId(id);
    const age = getAgeFromId(id);
    return new Bar(name, age);
  }
}
```

Factories simply cannot compose each other in a useful fashion and superclasses
leak implementation details into subclasses, with no easy or consistent
workaround.

Factories also do not work well with frameworks which often need hooks into
constructors or need to own them entirely and have to implement their own
lifecycle methods instead (looking at you,
[`ngOnInit()`](https://angular.io/api/core/OnInit)).

These limitations introduce awkward constraints on code which limit options
available to developers when they inevitably need to change that code. Beyond
these feature limitations, the general awkwardness of using constructors can be
best shown by looking closely at the syntax and the exceptions that are required
to support constructors.

## Syntactical Exceptions

Consider this trivial [TypeScript](https://www.typescriptlang.org/) class
modeling everyone's
[favorite dysfunctional family](https://en.wikipedia.org/wiki/The_Simpsons).
Note that while I am picking on TypeScript here and languages do vary, many of
these points apply to *most* general purpose object-oriented languages:

```typescript
class Simpson extends Person {
  private readonly firstName: string;

  public constructor(firstName: string) {
    super(`${firstName} Simpson`);
    this.firstName = firstName;
  }
}
```

Let me list out of the exceptions developers need to keep in mind when writing
constructors in TypeScript:

First, **constructors do *not* have a declared return type**, it is implied to
be the same class. When else do you not specify a return type to what is clearly
intended to look like a function?

Second, **constructors are declared with the special name `constructor()`**.
Other languages commonly use the same name as their class.  When else does the
name of something affect its behavior?

Third, **`super()` *must* be executed before `this` can be used**. You also
cannot use `this` in the `super()` expression itself. When else does a
particular variable come into scope part way through a block?

Fourth, **code which does not reference `this` *can* come before `super()`** in
TypeScript (unlike many other languages), **but doing so means you [cannot use
field initializers, parameter properties, or native private fields](https://github.com/microsoft/TypeScript/issues/945#issuecomment-60419937)**.
If you want those features, `super()` **must** be the first statement of your
constructor. This means that the following is not ok, despite the fact that the
only meaningful change is introducing a temporary variable, it is effectively
the same thing!

```typescript
class Simpson extends Person {
  private readonly firstName: string;
  // Any field initializer means `super()` must come first!
  private readonly age: number|null = null;

  public constructor(firstName: string) {
    const fullName = firstName + ' Simpson';
    super(fullName); // ERR: `super()` must be the first statement.
    this.firstName = firstName;
  }
}
```

How often have you made a `static` function just to perform some arbitrary
computation in order to inline it into a `super()` call?

Fifth, **you normally cannot assign to a `readonly` variable, but in
constructors you can**! However this can only be done if the compiler is sure
that the variable is only assigned once. How often have you turned an `if`
statement into a ternary expression or a `static` function call in order to get
things to compile?

Finally, **constructors do not require a `return;` statement**, because a
`return this;` is implied. However, if you wish to return early, you should use
`return;` without `this`, as if it were a `void` function, but it is not a
`void` function because it implicitly returns a new class instance. Wat?

JavaScript throws another wrench into this because `return 'foo';` will actually
use `'foo'` instead of the constructed class. Except `return undefined;` is the
same as `return;`, so the constructed class will be used instead. It also means
that calling `new Simpson()` may not *actually* create a new `Simpson` object,
so that keyword can just lie sometimes.

Most of these restrictions have valid reasons for existing. It makes logical
sense that `this` cannot be used before `super()` is called, or else it would
not represent anything meaningful. However the language has to bend over
backwards for a syntax that kinda-sorta makes sense with these restrictions.

Most developers just get used to these restrictions and do not really think
about them, but recall when you first learned constructors, or if you have ever
had to teach them to someone else. There is so much unnecessary complexity for
something that should be as simple as "make an object and return it".

Many languages fix specific parts of these issues:

* Dart has named constructors.
* C# uses a `: base()` syntax to pull the `super()` call out of the body of the
  function, which avoids the scope problems of `this`.
* C++ uses initializer lists to set `const` fields, so `this->constField = ...`
  is never valid as would be expected.
* Kotlin omits the `new` operator entirely, making object construction a private
  implementation detail.
* Python also omits the `new` operator and has `__new__`, which allows a class
  to return an unrelated value instead of constructing a new object every time.

These languages show that many of these individual issues can be addressed with
better syntax, but a lot of them are also integral to the way constructors are
conceptualized. So what is wrong with the core concept that leads to all this
weirdness?

## Constructor Flaws

I see three root mistakes that lead to this strange syntax and behavior:

### Constructors are a user-level construct

In most OO languages, constructors are hand-written by developers for classes
they own. Some languages provide default constructors or auto-generate them, but
almost universally developers have hooks to create their own constructors when
necessary.

Contrast this with Rust or Go, both of which have no explicit concept of a
user-authored "constructor". Instead, both languages have built-in functionality
to create a new object with some initial data. A "constructor" is simply a
standard function that happens to call this built-in. Developers merely wrap
this built-in functionality as necessary using the existing features of the
language.

### Constructors couple data allocation with initialization

Constructors generally serve the dual purpose of allocating memory for an object
and initializing it with some input, often with additional validation. However,
*allocating* an object and *initializing* an object are two very different
operations with distinct requirements. The former merely needs to know the size
of the object to allocate, while the latter needs to know the actual inputs and
their semantics to set the object to a valid state.

Contrast this with standard C, where allocation is a completely separate step
from initialization. In C, declaring a `struct` or calling
[`malloc()`](https://en.cppreference.com/w/c/memory/malloc) allocates the memory
for it, while developers use the existing features of the language to
set the object to a valid state. Often a static function will take the required
inputs, validate them, allocate the `struct`, set the data on it, and return the
result in a simplistic form of a constructor.

### A superclass and a subclass are constructed at the same time

Calling `new` on a subclass which extends a separate superclass will invoke both
constructors immediately after each other, with no opportunity to do anything
else in between. For example, it is generally impossible to write something
like:

```typescript
var homerPerson = Person.constructor('Homer Simpson');
print('Successfully invoked Person part of constructor.');
var homerSimpson = Simpson.constructor(homerPerson, 'Homer');
print('Successfully invoked Simpson part of constructor.');
```

Because the executions of the two constructors are inherently coupled, it
fundamentally limits the flexibility of constructors as a concept. It also makes
factories hard to compose and often have to bend over backwards in order to work
around this limitation, trying to present a nice API built on awkward
constructor behaviors.

Contrast this with JavaScript, which can use its prototypical inheritance to
decouple the creation of prototype objects. Note: I am not advocating for
writing code this way, just using it to illustrate a different way of thinking.

```typescript
const homer = new Person('Homer Simpson');
console.log('Successfully invoked Person part of constructor.');
Simpson.apply(homer, [ 'Homer' ]); // Manually invoke Simpson constructor.
Object.setPrototypeOf(homer, Simpson.prototype); // Manually assign prototype.
console.log('Successfully invoked Simpson part of constructor.');
```

Based on these limitations, I believe **the modern concept of constructors is
fundamentally flawed**. I believe we can design languages which provide more
flexibility and in a much simpler conceptual model than what we currently have
today.

## A Better Constructor

So if modern constructors are so bad and have such awkward limitations attached
to them, then what might be a better system for serving the same purpose? Since
constructors are so painful, the simple answer is: "Don't use them", or at
least: "Use them as little as possible".

I call this philosophy: **minimal constructors**.

This is by no means a new idea, plenty of individuals before me have discussed
the challenges with constructors and suggested best practices for working with
and around them, however I'd like to more directly call out this methodology and
explore how it can inform programming language design.

So what is a "minimal constructor"? While they serve many purposes, there is one
thing constructors can do which (generally) nothing else can: allocate memory.
As a result, we can define the term "minimal constructor":

> A minimal constructor allocates memory and does nothing more.

Instead of seeing constructors as a feature of classes to be implemented and
leveraged, constructors should be thought of as a core primitive of a
programming language, much like built-in data types and operations. Since
constructors only allocate memory, it makes sense that developers should not
*implement* constructors, but merely *invoke* them.

From this core concept, we can build up to a equivalent feature set of modern
constructors. For demonstration purposes, imagine a language identical to
TypeScript but without any concept of constructors. How might we design this
language to support the same use cases?

By not having constructors this language already saves developers from authoring
them and immediately removes 90% of the syntax problems from earlier. If
developers do not write constructors, then there is no need for a coherent or
consistent constructor syntax. However, this means that the compiler must
generate constructors under the hood, so how might a developer use such a
constructor? Consider the following TypeScript-like snippet for how this could
work:

```typescript
class Person {
  public static create(): Person {
    return new Person();
  }
}
```

In this example, there are no user-defined constructors and no `constructor`
keyword. `new Person()` works just like default constructors in TypeScript,
except you *cannot* define your own implementation. The `new` keyword is still
used to invoke this auto-generated constructor, but it is actually closer to a
C-style `malloc()` call. It really just allocates the memory necessary for
`Person` and type casts it to the relevant type. We can also restrict the `new`
keyword to **only** be callable within its own class. Hence the following would
**not** compile:

```typescript
class Person { /* ... */ }

// COMPILE ERR: `new Person` cannot be used outside the
// `Person` class.
console.log(new Person());
```

This prevents the `new` keyword from leaking outside the class itself. It also
means we must lean into the factory concept as a `static` method is **required**
to ever instantiate a class. Of course, you probably should **not** name the
factory `new()` or `create()` or else you will leak that implementation detail
anyways. I generally recommend `of()` or `from()` to avoid implying that a new
object is created, however
[both of those are reserved keywords in TypeScript](https://github.com/microsoft/TypeScript/issues/2536#issuecomment-87194347-permalink:~:text=type-,from,of,-%F0%9F%91%8D).
For the purposes of readability and simplicity in this blog post I will use
`create()`, even though you probably should not use that in real use cases.

All the logic that traditionally goes inside constructors can be handled by this
factory instead. The constructor is only responsible for allocating memory and
assigning field members. This nicely separates concerns, as factories are
responsible for validating and initializing the object's data, simply passing
the data as inputs to the constructor which get directly assigned to class
fields.

```typescript
class Person {
  public readonly myFirstName: string;
  public readonly myLastName: string;

  public static create(firstName: string, lastName: string): Person {
    return new Person({
      myFirstName: firstName,
      myLastName: lastName,
    });
  }
}

const homer = Person.create('Homer', 'Simpson');
console.log(homer.myFirstName); // 'Homer'
console.log(homer.myLastName); // 'Simpson'
```

At this point we are somewhat stretching the definition of "minimal", as we are
allocating memory, type casting the result, and arguably initializing the class
all at once. However these simply follow from the conventions of modern
memory-managed languages. In such languages, typically all values must have a
type and data cannot be uninitialized. These two minor additions allow
constructors to fit into the existing semantics of strongly-typed,
memory-managed programming languages.

The main takeaway here is that the constructor merely assigns its inputs to
class fields, with no application logic applied. This means all initialization
work is done in a factory, pulling out these operations to a higher level which
avoids many of the syntactic problems identified earlier. Consider `readonly`
variables, which "just work" with `if` statements, `for` loops, or any other
construct:

```typescript
const homes: Address[] = [ /* ... */ ];

class Person {
  private readonly myHome?: Address;

  public static create(streetAddress: string): Person {
    for (const home of homes) {
      if (home.streetAddress === streetAddress) {
        return new Person({ myHome: home });
      }
    }

    return new Person({ myHome: undefined });
  }
}

const homer = Person.create(homes, '742 Evergreen Terrace');
```

This is much cleaner because `readonly` variables are initialized at the instant
the object is constructed. There is no special case where
`this.myHome = ...` will work. Instead, `readonly` variables can *never* be
assigned to with no exceptions. No more need for ternary operators or separate
`static` functions just to work with `readonly`. There is also no need for
complex static analysis in the compiler in order to assert that a `readonly`
assignment happens exactly once.

At this point, we have a system for creating objects without carrying the burden
of an overcomplicated constructor mechanism. This is fairly equivalent to what
Go and Rust have out of the box, and they are great models for this concept.
However, both languages sacrifice one of the more significant features of
object-oriented programming: inheritance. Is there any way this kind of
constructor system could support inheritance?

### Inheritance

The immediate problem with using minimal constructors for
[inheritance](https://en.wikipedia.org/wiki/Inheritance_(object-oriented_programming))
is that invoking a constructor is considered a private implementation detail and
is `private` to the class being constructed. This is great for creating an
abstraction but makes inheritance impossible because a subclass does not know
the parameters to provide to its superclass' constructor. Factories provide a
public API for creating an object, however they do not work well with
inheritance because they return an already constructed object! What we need is a
factory which returns an *extendable* object.

Since factories perform the actual business logic associated with creating an
object, factories themselves must be *composable*. In other words, a subclass
factory should be able to wrap a superclass factory. Since a superclass factory
cannot return an instance of the superclass (or else it would already be
constructed), it must return some other type. We can call this type `ctor<T>`.

`ctor<T>` (short for "constructor of T") is a self-contained, primitive type
which represents an object that can create an instance of type `T`. This has two
core uses: it can defer the construction of an object to a later time, or it can
be extended by a subclass.

The first use case is the simplest, as `ctor<T>` has a `.construct()` method to
create an actual instance of `T`.

```typescript
class Person {
  private myName: string;

  // Return a `ctor<Person>`, rather than a `Person` directly.
  public static createCtor(name: string): ctor<Person> {
    return new ctor<Person>({ myName: name });
  }

  public print(): void {
    console.log(this.myName);
  }
}

const homerCtor: ctor<Person> =
    Person.createCtor('Homer Simpson');
homerCtor.print(); // COMPILE ERR: print() does not exist on ctor<Person>

const homer: Person = homerCtor.construct();
homer.print(); // 'Homer Simpson'
```

`ctor<T>` is a distinct type, so it does not have access to the methods of `T`.
Since a `T` has not been constructed yet, it does not make sense to call any
methods on it. `ctor<T>` has only one method, `.construct()`, which creates and
returns the instance of `T` from its existing data.

While deferred construction is nice, `ctor<T>` has one other key feature: it can
be extended. Consider a `from` keyword that can be used in combination with
`new`. This will allow a subclass to extend a particular instance of a
superclass' `ctor<T>`.

```typescript
class Person {
  public myLastName: string;

  // Return a `ctor<Person>` so it can be extended.
  public static createCtor(lastName: string): ctor<Person> {
    return new ctor<Person>({ myLastName: lastName });
  }
}

class Simpson extends Person {
  public myFirstName: string;

  public static create(firstName: string): Simpson {
    const personCtor: ctor<Person> =
        Person.createCtor('Simpson');

    // Construct a new `Simpson` using the data from `personCtor`.
    return new Simpson({ myFirstName: firstName })
        from personCtor;
  }
}

const homer = Simpson.create('Homer');
console.log(homer.myFirstName); // 'Homer'
console.log(homer.myLastName); // 'Simpson'
```

In the above example, the `Person` class is not constructed directly, but rather
made into a `ctor<Person>` which simply holds the `myLastName` field as it was
provided. `Simpson.create()` wraps the existing `Person.createCtor()`. Once it
has the `ctor<Person>` it constructs a `Simpson` based on it using the `from`
keyword. `from` in this language simply links a constructor invocation with a
`ctor<SuperClass>` object, and uses the data that was previously given in the
`new ctor<SuperClass>()` invocation.

This structure decouples superclass construction from subclass construction.
Constructor parameters are nicely abstracted behind a factory and do not leak
into the subclass. Any number of operations or function calls could be made
between the `new` invocations. The `ctor<Person>` could be passed in and out of
functions, saved to a `Map`, retrieved at later time, and then finally
instantiated into a `Simpson`, or maybe even a
[`Flanders`](https://simpsons.fandom.com/wiki/Flanders_family).

This also provides simple implementations of class modifiers. Using `new` on an
`abstract` class can *only* create a `ctor<T>` which does not support a direct
`.construct()` call. By contrast, using `new` on a closed (`final`) class
creates a `ctor<T>` which can *never* be used in a `from` expression. These
could be more accurately modeled with `abstractCtor<T>` or `closedCtor<T>`
types, though for simplicity I will just use `ctor<T>` in this post.

This decoupling also removes confusion around `this`. In TypeScript, `super()`
must be executed before `this` comes into scope, because the object has not been
created until `super()` is invoked. This awkward foot gun is now impossible
because a reference to `this` refers to the factory context, which is either a
`static` method, a loose function, or an independent class instance. `this` in a
factory will never refer to the constructed object, and it is syntactically
impossible to get a reference to the constructed object until after it is fully
constructed and in a consistent state.

```typescript
class Simpson extends Person {
  public myFirstName: string;

  public static create(firstName: string): Simpson {
    // `this` is invalid because we're in a static context.

    const simpson = new Simpson({ myFirstName: firstName })
        from Person.create('Simpson');

    // `this` is still invalid, just use `simpson` to refer
    // to the constructed object!
    doSomethingInteresting(simpson);

    return simpson;
  }
}
```

Now at this point we have a system which is roughly equivalent to most
object-oriented type systems like Java or C#. We can construct objects and
inherit from other classes using `ctor<T>`. With a few tweaks in how developers
design their code using `ctor<T>`, it can be used as a mostly drop-in
replacement of modern constructors. However, there are a few interesting
"features" this system can provide which are worth discussing. These certainly
are not required to gain the benefits of `ctor<T>` and minimal constructors. I
am also not totally convinced these are good ideas to begin with. However, I do
believe they are at least *interesting*, and it would be a disservice not to
talk about them. With that disclaimer out of the way...

### Extending interfaces

It was long ago decided in the computer science hive mind that
[multiple inheritance](https://en.wikipedia.org/wiki/Multiple_inheritance) is a
bad idea. There are many reasons for this which I will not go into here, however
most modern object-oriented languages choose to use a single-inheritance model
as an alternative. This is much simpler, but provides less flexibility, so
[interfaces](https://en.wikipedia.org/wiki/Interface_(computing)#In_object-oriented_languages:~:text=In%20object%2Doriented%20languages,-%5B)
are often touted as the single-inheritance answer to most multiple-inheritance
use cases.

However, many developers (myself included) feel that interfaces do not fully
satisfy all the use cases for multiple-inheritance. Interfaces provide
[polymorphism](https://en.wikipedia.org/wiki/Polymorphism_(computer_science)),
enabling one class to "masquerade" as another, but interfaces generally do *not*
enable multiple implementations of an interface to share code, nor do they allow
defining fields on an implementation. An interface is an API contract, not a
feature or piece of functionality which is shared between many classes. Some
languages fill in this gap via a trait (ex. Rust) or mixin (ex. Dart) system.

However, `ctor<T>` has some interesting implications regarding interfaces. A
core property of using `ctor<T>`, is that a subclass is no longer responsible
for invoking its superclass' constructor via `super()`. The `ctor<T>` object is
responsible for holding class fields and setting them on the final constructed
object. One interesting side effect of not relying on a subclass to invoke its
superclass' constructor, is that the subclass does *not* require a direct
reference to its superclass. This has some unique implications regarding
interfaces, most notably that **extending a class only requires knowledge of a
its supported interface, not its actual implementation.**

Take for example, the following TypeScript-like code modeling Simpsons who also
happen to be students:

```typescript
interface Person {
  think(): string;
}

// Make an implementation of `Person`.
class Student implements Person {
  // Satisfies the `Person` interface.
  public think(): string {
    return 'What time is recess?';
  }

  public static create(): ctor<Student> {
    return new ctor<Student>();
  }
}

// `Simpson` "extends" the `Person` interface. This can be
// thought of as `Simpson` extending an *unknown
// implementation* of `Person`. `Simpson` has no knowledge
// of what superclass it actually has, it only knows that
// the superclass implements `Person`.
class Simpson extends Person {
  private myCatchphrase: string;

  public say(): string {
    // `Simpson` can invoke `think()` because it knows its
    // superclass implements it. Simpsons are known for
    // blurting out whatever they are thinking.
    return this.think() + ' ' + this.myCatchphrase;
  }

  // Constructs off some `ctor<Person>`. Any implementation
  // of `Person` can be provided here and it will be
  // extended to make a `Simpson`.
  public static create<TParent extends Person>(
      parentCtor: ctor<TParent>, catchphrase: string): Simpson {
    return new Simpson({
      myCatchphrase: catchphrase,
    }) from parentCtor;
  }
}

// `Simpson` can now extend from `Student`, without having
// knowledge of it. Bart is one particular Simpson who also
// happens to be a student.
const studentCtor: ctor<Student> = Student.create();
const bart: Simpson =
    Simpson.create(studentCtor, 'Eat my shorts!');

// `Student` satisfies the `Person` interface.
console.log(bart.think()); // 'What time is recess?'

// `Simpson` can also call its superclass.
console.log(bart.say()); // 'What time is recess? Eat my shorts!'
```

The idea of "extending an unknown implementation of a known interface" provides
much more power and flexibility to the traditional concept of interfaces. It
still provides polymorphism, as `Student` and `Simpson` can both be cast to
`Person`. It also allows `Simpson` to rely on its superclass to provide the
`Person` interface, meaning the implementation of `think()` can be shared across
multiple subclasses who extend the `Person` interface but may not be Simpsons,
like [Milhouse](https://simpsons.fandom.com/wiki/Milhouse_Van_Houten) or
[Ralph](https://simpsons.fandom.com/wiki/Ralph_Wiggum). Both `Simpson` and
`Student` also own their own factories, meaning they can both declare their own
fields and encapsulate their own relevant state. This is far more powerful than
a traditional single-inheritance interface.

### Dynamic inheritance hierarchy

There is an interesting consequence of allowing a class to extend an unknown
implementation of an interface: a class can actually extend from a set of
multiple superclasses, chosen dynamically at runtime. This has a few,
far-reaching effects.

On the one hand, it means that a class can dynamically choose its superclass at
runtime, via its own condition or having that superclass provided as an input to
a factory. Take for example a simple `Student` use case. Here, we want two
implementations, one for good students and another for bad students. Then, we
want to have a `FourthGrader` class that applies specifically to 4th graders
like Bart. How can we design the `FourthGrader` class to reuse our good/bad
distinction?

```typescript
interface Student { /* ... */ }

// Two implementations of `Student`, one with good grades
// who studies hard, and another for Bart.
class GoodStudent implements Student { /* ... */ }
class BadStudent implements Student { /* ... */ }

// A simple function to choose the ideal implementation of a
// `Student` based on their grades.
function createStudent(grade: string): ctor<Student> {
  if (grade === 'A' || grade === 'B') {
    return GoodStudent.create();
  } else {
    return BadStudent.create();
  }
}

// Extend any implementation of `Student`.
class FourthGrader extends Student {
  // Springfield Elementary seems to have only one 4th grade teacher.
  private teacher: string = 'Krabappel';

  public static create(grade: string): FourthGrader {
    // Dynamically choose the appropriate `Student`
    // implementation as a superclass.
    return new FourthGrader() from createStudent(grade);
  }

  // ...
}

const bart = FourthGrader.create('D'); // is `BadStudent`
console.log(bart instanceof BadStudent); // `true`
console.log(bart instanceof GoodStudent); // `false`

const martin = FourthGrader.create('A'); // is `GoodStudent`
console.log(bart instanceof BadStudent); // `false`
console.log(bart instanceof GoodStudent); // `true`
```

Here, `FourthGrader` is dynamically choosing at runtime whether to extend a
`GoodStudent` or a `BadStudent`, reusing any functionality they may provide.
Since `FourthGrader` extends an unknown implementation of `Student`, it is not
intrinsically bound to any particular superclass. This reduces overall coupling
between the classes and nicely reuses the existing code. Lisa could be an
instance of a `SecondGrader` class which shares functionality with `GoodStudent`
and `BadStudent`.

This is a really useful feature, as this same design would be quite difficult to
achieve with traditional class hierarchies. You would either need a
`GoodFourthGrader` and a `BadFourthGrader` as distinct subclasses with
duplicated functionality or you would need to refactor the whole thing to use a
mixin or trait system, if you are lucky enough to use a language which supports
them.

On the other hand, this means that class hierarchies are not statically known at
compile-time. Any open implementation of a particular interface could
potentially be used as a superclass which extends that interface. While
everything is still reasonably typed and can be checked at compile-time, the
precise class hierarchy may vary at runtime, and could even differ between
different instances of the same class. A `FourthGrader` with an A grade will
extend `GoodStudent`, while a different `FourthGrader` with a D grade will
extend `BadStudent` and could exist in the same program and even interact with
each other. This makes reasoning about `FourthGrader` a bit harder, as any
`super.study()` call could refer to any implementation of `Student` rather than
a fixed superclass.

### Mixins

The idea of "extending an unknown implementation" is basically the definition of
a [mixin](https://en.wikipedia.org/wiki/Mixin). Languages vary widely in their
support of a mixin mechanism, and those that do often have their own problems
with constructors. Take a TypeScript example, where mixins are often implemented
as a function which converts a class definition into an anonymous class with the
mixin behavior included.

```typescript
type Constructor = new (...args: any[]) => {};
function Simpson<TBase extends Constructor>(Base: TBase) {
  // Return a new class which extends the one provided.
  return class extends Base {
    // Add mixin functionality.
    public say(): string {
      return `D'oh!`;
    }
  };
}
```

While this works great for simple cases, it starts to break down with
constructors. Consider changing this so the `D'oh!` string literal was provided
as a constructor parameter.

```typescript
type Constructor = new (...args: any[]) => {};
function Simpson<TBase extends Constructor>(Base: TBase) {
  // Return a new class which extends the one provided.
  return class extends Base {
    public myCatchphrase: string;

    // COMPILE ERR: A mixin class must have a constructor
    // with a single rest parameter of type 'any[]'
    public constructor(catchphrase: string, ...args: any[]) {
      super(...args);
      this.myCatchphrase = catchphrase;
    }

    // Add mixin functionality.
    public say(): string {
      return this.myCatchphrase;
    }
  };
}
```

We run into a problem with constructor arguments. This is because a mixin, by
definition, does not have knowledge of its superclass and has no way of knowing
what to provide. TypeScript actually requires that mixins like this declare
their constructors with `...args: any[]` specifically for this reason (though
IMHO this is overly strict and I do not understand why it is necessary). Other
limitations of constructors from the `super()` syntax further complicate this to
make it very difficult to extract the first argument as the mixin string and
pass through the rest to the superclass. The end result here, is that it is
near-impossible to pass in a value to a mixin through its constructor in
TypeScript.

With `ctor<T>`, a mixin pattern works just like extending an interface which we
can use to model the
[many cats of the Simpsons](https://simpsons.fandom.com/wiki/I,_(Annoyed_Grunt)-Bot):

```typescript
// A mixin simply extends an unknown type parameter. We do
// not need to know what `TParent` is at compile-time,
// because we do not need a value reference to its
// implementation. This is only used to type-check the
// `from` clause.
//
// Simpsons say their catchphrase.
class Simpson<TParent> extends TParent {
  private readonly myCatchphrase: string;

  public say(): string {
    return this.myCatchphrase;
  }

  // Construct from any given `ctor<T>`. Must use a
  // function-specific generic because as a static function,
  // `TParent` is not in scope or known at this time.
  public static create<TSuper>(parentCtor: ctor<TSuper>, catchphrase: string):
      ctor<Simpson<TSuper>> {
    return new ctor<Simpson<TSuper>>({
      myCatchphrase: catchphrase,
    }) from parentCtor;
  }
}

// Define a simple parent class, with no knowledge of
// `Simpson`. Cats simply have a color provided as a factory
// parameter.
class Cat {
  public myColor: string;

  public static create(color: string): ctor<Cat> {
    return new ctor<Cat>({ myColor: color });
  }
}

// `Snowball` extends `Cat` mixed with `Simpson`.
class Snowball extends Simpson<Cat> {
  private myIteration: number;

  public act(): string {
    // `Snowball` can reference both `Simpson` and `Cat` members.
    // It has color and catchphrase functionality from each.
    return 'The ' + this.myColor + ' Snowball '
        + this.myIteration + ' says ' + this.say();
  }

  public static create(iteration: number, color: string): Cat {
    // Call `Simpson` factory with a `ctor<Cat>`.
    const catCtor: ctor<Cat> = Cat.create(color);
    const simpsonCtor: ctor<Simpson<Cat>> =
        Simpson.create(catCtor, 'Meow...');
    return new Snowball({
      myIteration: iteration,
    }) from catCtor;
  }
}

Snowball.create(1, 'white').act(); // 'The white Snowball 1 says Meow...'
Snowball.create(2, 'black').act(); // 'The black Snowball 2 says Meow...'
Snowball.create(3, 'brown').act(); // 'The brown Snowball 3 says Meow...'
Snowball.create(4, 'gray').act();  // 'The gray Snowball 4 says Meow...'
Snowball.create(5, 'black').act(); // 'The black Snowball 5 says Meow...'
```

With `ctor<T>`, we are able to define a mixin as a class that will extend any
given superclass. This is done by simply allowing a class to extend its own type
parameter, since all "extending" does is simply type check the `from`
clause of a `new` expression.

Using mixins with `ctor<T>` composes factories smoothly and allows each mixin to
own its own constructor parameters. You can even introduce type constraints on
the classes that can be used with a given mixin simply by adding those
constraints to the generic:

```typescript
// Standard base class representing a person.
class Person { /* ... */ }

// `Simpson` is a mixin that extends a class of any type.
// Makes no assumptions about what that superclass is.
class Simpson<T> extends T { /* ... */ }

// All students are people, so we constrain `Student` to
// extend only a `Person`.
class Student<T extends Person> extends T { /* ... */ }

// `Simpson<Person>` satisfies the `Student` type constraint.
class SimpsonChild extends Student<Simpson<Person>> { /* ... */ }

class Cat { /* ... */ }

// COMPILE ERR: Type parameter of `Student` must extend
// `Person`.
class SimpsonPet extends Student<Simpson<Cat>> { /* ... */ }
```

Note that not much needs to change to support mixins, as they mostly "just
work"ᵗᵐ. This shows the power and flexibility of `ctor<T>` which comes from
decoupling a superclass from its subclasses, which is all enabled with the use
of minimal constructors.

## Experimental implementation

While authoring this post, I wanted to actually play around with these ideas and
make sure they worked as well as I hoped. A proper implementation would require
a custom compiler, or at least a compiler plugin, however a library could be
"good enough" for small experiments. As a result, I published
[`ctor-exp`](https://github.com/dgp1130/ctor-exp), a simple TypeScript library
which implements many of the ideas here.

TypeScript has an ~~abusable~~ powerful enough type system to emulate a lot of
the core concepts without strictly requiring a compiler plugin. This library is
able to implement most of the critical features, just with less-than-ideal
syntax and only a 3-star safety rating. The repository explains how to use it in
detail, but here is a rough translation with the idealized system described
above:

```typescript
import { ctor, from, Implementation } from 'ctor-exp';

class Person {
  private readonly myName: string;

  // Constructors must be hand-written in this format.
  // Must be `public`, but should not be called outside the
  // class.
  public constructor({ myName }: { myName: string }) {
    this.myName = myName;
  }

  public static create(name: string): Person {
    // Equivalent to: `new Person({ myName: name })`.
    return ctor.new(Person, { myName: name }).construct();
  }

  public static extend(name: string): ctor<Person> {
    // Equivalent to: `new ctor<Person>({ myName: name })`.
    return ctor.new(Person, { myName: name });
  }
}

// Extend `Implementation<SuperClass>()` rather than
// `SuperClass` directly.
class Simpson extends Implementation<Person>() {
  private readonly myFirstName: string;

  // Subclass constructors are the same, but with an empty
  // `super()` call.
  public constructor({ myFirstName }: { myFirstName: string }) {
    super();
    this.myFirstName = myFirstName;
  }

  public static create(firstName: string): Simpson {
    // Equivalent to:
    // new Simpson({ myFirstName: firstName })
    //     from Person.extend(firstName + ' Simpson')
    return from(Person.extend(firstName + ' Simpson'))
        .new(Simpson, { myFirstName: firstName })
        .construct();
  }
}
```

Hopefully this provides a close-enough approximation to a real implementation
for devs to experiment with. There are also a number of
[examples of real world use cases](https://github.com/dgp1130/ctor-exp#examples)
to compare a `ctor<T>` approach with traditional constructors, including some of
the more out-there features like dynamically choosing a superclass at runtime.
Check it out and let me know how well some real world examples hold up!

## What about builders?

An astute reader may pose the question: "Isn't this just the
[builder pattern](https://en.wikipedia.org/wiki/Builder_pattern)? `ctor<T>` is
just a `Builder<T>` type." To which my response is: *Why yes it is Mr. and/or
Ms. Smarty Pants, way to steal my thunder here.* More seriously, while a
`ctor<T>` type (or something very similar to it) can be implemented with a
traditional builder class, there are a few core differences with builders:

* `ctor<T>` and "minimal constructors" is more about re-conceptualizing the
  *concept* of a constructor, forcing developers to think more in terms of
  factories. It decouples memory allocation (constructors) from initialization
  and validation (factories). While this can be done with builders, it is not
  inherent in the builder design pattern.
* Composing builders throughout an inheritance hierarchy can be quite complex
  (though not impossible) and requires coordination between different classes in
  the hierarchy as well as adherence to custom API contracts. `ctor<T>` provides
  a much cleaner and more uniform interface to this concept.
* With `ctor<T>`, the compiler **requires** developers to always use this
  pattern, preventing devs from cornering themselves into a bad design which is
  difficult to get out of without breaking API contracts.
* The compiler automatically generates all the required builder code, as this is
  far too much boilerplate to be practical in most languages without direct
  compiler support.

So while the `ctor<T>` implementation of minimal constructors is *technically* a
special case of the builder design pattern, "minimal constructors" refers to a
more general paradigm of thinking and interacting with constructors which is
much more clearly expressed via `ctor<T>`.

## Drawbacks

While I definitely see this new concept of constructors as an improvement over
existing methodologies, there are a few caveats to consider. Not all of these
apply to the minimal implementation of `ctor<T>` and inheritance, so the extent
to which a language uses the concepts described in this post will vary the kind
and extent of these drawbacks it encounters.

### Extending a sibling

Consider the following class hierarchy:

```typescript
interface Person { /* ... */ }

class Simpson extends Person {
  public static create(parentCtor: ctor<Person>): ctor<Simpson> {
    return new ctor<Simpson>() from parentCtor;
  }

  // ...
}

class VanHouten extends Person {
  public static create(parentCtor: ctor<Person>): VanHouten {
    return new VanHouten() from parentCtor;
  }

  // ...
}
```

Because `Person` is an interface, both `Simpson` and `VanHouten` are capable of
extending any class which satisfies the `Person` interface. While this provides
a lot of flexibility, it also means the following is possible:

```typescript
// `Simpson` extends some `Person` implementation.
const personCtor: ctor<Person> = // ...
const simpsonCtor: ctor<Simpson> = Simpson.create(personCtor);

// `VanHouten` extends `Simpson`, which satisfies the
// `Person` interface?!?!
const zia: VanHouten = VanHouten.create(simpsonCtor);
```

Since `Simpson` satisfies the `Person` interface and `VanHouten` only needs a
`ctor<Person>`, this is satisfied by `ctor<Simpson>` and will compile
successfully. We have now created a `VanHouten` which extends a `Simpson` in a
way the programmer definitely did not intend when they first authored those
classes. This was clearly intended to be a sibling relationship but has turned
into a parent-child relationship, resulting in
[Zia Simpson-Van Houten](https://simpsons.fandom.com/wiki/Zia_Simpson-Van_Houten)
which is non-canon and definitely should be disallowed by the compiler.

While this does speak to the flexibility and power of the concept of extending
interfaces, it also shows a way it can be misused. Ultimately there is really no
way for the language to know whether two classes are intended to be siblings or
not. If `Simpson` were declared as closed/`final`, then this would be
compile-time error. However if there are other, legitimate uses of extending
`Simpson`, then there is no way to prevent `VanHouten` from incorrectly
extending it. You could even make a `Simpson` extend *another* `Simpson` and
destroy the space-time continuum!

This is a significant foot-gun which developers would need to be aware of and
watch out for. It also highlights the advantage of simply extending a known
superclass, rather than an unknown implementation of a known interface. For this
reason, it is likely better to extend a known superclass whenever the features
of extending an interface are not required. This would restrict the class
hierarchy and reduce the possibility of bugs. Devs should only extend an
interface when there is an actual design need and benefit to doing so.

### Construction-time execution

One possible concern with `ctor<T>` that superclasses do not have any hook which
executes at construction-time (when the final concrete subclass invokes `new`).
This means that superclasses cannot perform any initialization or validation at
construction-time, only at factory-invocation-time.

This has one positive side effect in that it is impossible for a superclass to
call an abstract method implemented by a subclass during construction.
[This is possible in TypeScript and Java](https://tinyurl.com/mtn8rddh), but
heavily discouraged because it means the subclass' implementation of that
abstract method will be invoked before its constructor has a chance to
initialize it. That benefit makes me believe that the lack of construction-time
execution in a superclass is actually a feature rather than a bug.

However, if the lack of construction-time computations really became an issue,
some kind of `onConstruct()` method could be called which would enable the class
to do whatever it needed to. I would try to avoid this if possible as I think
many classes would be better designed without this feature, but it may be
impractical to avoid in some use cases.

### Memory fragmentation

In many natively compiled languages like C++, member fields of a subclass are
collocated alongside member fields of a superclass, with a reference to the
[virtual method table (vtable)](https://en.wikipedia.org/wiki/Virtual_method_table).
In such languages, `new` can only be invoked on the concrete subclass being
constructed, and because the inheritance hierarchy is statically known, the
total size of the subclass is also known and the entire object can be allocated
all at once.

A `ctor<T>`-based system would likely be impossible to implement this way due to
the lack of a direct reference to a known, constant superclass. The total size
of a given subclass simply is not known at compile-time because we do not know
the specific superclass implementation which will be used. Even for uses that
actually do extend a known, constant superclass, it would not be enough. A
particular `new ctor<T>()` call for the superclass could eventually be
instantiated into any one of many different subclasses of `T`, with no way of
knowing which it will become, or how much memory to allocate. Even the vtable
could encounter implementation hurdles due to the dynamic nature of the
inheritance hierarchy.

There are certainly ways around this issue. The compiler could separate the
superclass' memory from the subclass, simply leaving pointers to get from one to
the other, this means the size of the entire hierarchy is not needed, but would
have negative runtime impact due to additional pointer indirections and may
require runtime type reflection to know when an indirection is needed.
Alternatively, the compiler could use this indirection strategy for `ctor<T>`
types and then copy them into a single contiguous space when `.construct()` is
called. This means accessing fields of a parent class do not require pointer
indirection or runtime type reflection, but additional copying would be
necessary in the implementation of `.construct()`. There are also other means of
method dispatch than vtables, though they come with their own costs.

The real point here is that using `ctor<T>` as a drop-in replacement for a
natively-compiled language like C++ would probably encounter a lot of
implementation challenges. An interpreted language would likely have a much
easier time implementing this model.

### Symbol conflicts

Mixing two unrelated classes together in an inheritance hierarchy also comes
with the possibility of symbol conflicts. Take the following example:

```typescript
class Person { /* ... */ }

class Simpson<T> extends T {
  public say(): string {
    return `D'oh!`;
  }

  // ...
}

class Student<T> extends T {
  public say(): string {
    return 'What time is recess?';
  }

  // ...
}

const bart: Simpson<Student<Person>> = // ...
bart.say(); // Returns what?
```

Since `ctor<T>`'s implementation of mixins does not actually break
single-inheritance, there is a clear winner. The type `Simpson<Student<Person>>`
means that `Simpson` extends `Student` which extends `Person`, and thus method
dispatch would occur in that order, returning `D'oh!`.

If the user wanted to call the implementation on `Student`, there would need to
be a special syntax to allow it. Something like `bart.<Student<Person>>say()`
could qualify the method invocation to use a specific type in the inheritance
hierarchy.

This also means that *order of inheritance matters*, as
`Simpson<Student<Person>>` is a distinct type from `Student<Simpson<Person>>`
because calling `.say()` returns `D'oh!` and `What time is recess?`
respectively. Of course, if your usage of mixins depends on their ordering, it
is quite likely your inheritance hierarchy has larger design problems.

Public symbols can at least be resolved unambiguously due to single-inheritance,
but there is still additional complexity and the possibility of bugs as a
result. Fortunately, if the language is
[nominally typed](https://en.wikipedia.org/wiki/Nominal_type_system), `private`
symbols can always be resolved unambiguously, so this only really applies to
`public` and `protected` symbols.

### Re-using a `ctor<T>`

There is also the question of whether or not it is possible to reuse a `ctor<T>`
to construct multiple subclasses. Conceptually this seems reasonable as there is
nothing semantically wrong with that idea, but it might take extra work in the
compiler to support that depending on how it is implemented under the hood. You
probably would not want to hurt construction performance to support multiple
`.construct()` calls when that would almost never happen in practice.

Being able to reuse a `ctor<T>` would mean the compiler could not construct the
object in-place which may impact optimizations. It could also be possible to
have a distinct `reusableCtor<T>` type, though that comes with additional
cognitive overhead.

Relatedly, some users might reasonably ask to read or mutate the fields on a
`ctor<T>` after it is created. I do not see any major concerns with reading the
data, though immutability can be desirable. Again, a distinct `mutableCtor<T>`
could be made, though composing it with `reusableCtor<T>`, `closedCtor<T>`, and
`abstractCtor<T>` starts to scale somewhat poorly. Clearly the solution is to
model all these features as mixins to a base `ctor<T>` object! I'm joking here,
but I'm also kind of not...

## Conclusion

Looking at constructors in modern object-oriented languages, I see quite a few
inconsistencies and unnecessary complexities which can be improved upon. What is
presented here is a different paradigm for thinking of and interacting with
constructors with one possible alternative implementation to consider. There are
likely other means of implementing minimal constructors without using `ctor<T>`,
and a language designer should think of its constructor mechanisms within the
context of the language as a whole rather than forcing a particular
implementation or ideology onto a language which has other incompatibilities.

It is actually possible to follow the minimal constructor concept in existing OO
languages. All that is really necessary is to limit constructor definitions to
merely assign local data and defer all other logic to a factory. Some languages
make this easier or harder than others, particularly when inheritance comes into
play. If you are using Go or Rust, you are already following this pattern, just
sacrificing some traditional object-oriented features in the trade off.

I mainly wanted to explore what the concept of "minimal constructors" means to a
programming language and present a model for how it could be leveraged to
enforce best practices without dropping existing object-oriented features. In
the process I found a few other "interesting" consequences of the design which I
wanted to share. Try out the [`ctor-exp`](https://github.com/dgp1130/ctor-exp)
package yourself and see what crazy patterns you can come up with.

I believe we can `.construct()` something better.
