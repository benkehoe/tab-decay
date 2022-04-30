# Tab decay
## Get rid of old tabs, like you know you should

You've got dozens, maybe hundreds of tabs open.
Your tab bar is so crowded as to be unusable.
You know you should clean it up.
You keep telling yourself you'll go back to those old tabs, they're all open for a purpose.
But deep down, you know the truth.
You know you'll never look at those tabs ever again.

Tab decay lets you set a [half-life](https://en.wikipedia.org/wiki/Half-life) for your tabs.
Everytime you switch away from a tab, it starts to decay.
It's got a 50% chance it'll disappear within the half-life you set.
While the tab is active, it remains fresh.
The browser window being in the background does not count as inactive.
Pinned tabs don't decay.

# Installation

> :warning: This is very much a work in progress and I am not a skilled JavaScript developer, so it's a bit of a mess.

Clone this repo, and then load the folder as an extension in developer mode as described [here](https://www.cnet.com/tech/services-and-software/how-to-install-chrome-extensions-manually/).

# Settings
The main control is the default half-life, which can be set in hours, days, or weeks.

Setting a value of 0 will disable decay.

Extended control is through a JSON object, because I don't have the skills to make a fancy interface.
You control two things: site-specific half-life, and exemptions.
You can either match domains exactly (no wildcards), or a [JavaScript regex](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Regular_Expressions) against the entire URL.

## Exemptions
For exemptions, use the `exempt_domains` or `exempt_url_patterns` fields, which are lists of strings.
These exemptions take place when a tab is about to be closed, so adding a new exemption will apply to existing tabs.

## Site-specific half-life
To set a site-specific half-life, add an object to a list under the `sites` field.
It must have either a `domain` or `url_pattern` field, and must have both a `halflife` and a `units` field.
The `units` field must be one of `hours`, `days`, or `weeks`.

Chaning site-specific settings doesn't affect existing decaying tabs unless they have their decay reset by being made the active tab and then going inactive again.
