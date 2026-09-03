# Blog-drafter editorial skill: RED–GREEN test record

## Seam and scenario

The public seam is the article produced by `blog-drafter` from a product-launch
brief plus verified research. The pressure scenario asks for a 900–1,300 word
Context Blog launch post, requires two evidence sets and product boundaries,
and gives one governing idea: publishing is a feedback loop, not a finish line.

The behavioral target is not factual compliance alone. A passing draft must
reveal the product quickly, sustain one narrative spine, use one concrete
through-line, subordinate evidence to that story, and end with an operational
next step.

## RED: five no-guidance controls

Five fresh-context writers received the same brief without repository skills.
All five were factually competent and all five failed the intended editorial
shape in the same ways:

| Control | Representative output | Observed failure |
| --- | --- | --- |
| 1 | “Start with questions, not a content calendar” / “Separate creation from verification” / “Publish for readers, search engines, and answer engines” | The article became a feature-by-feature workflow tour. No single article or reader carried the narrative. |
| 2 | “Agents do the legwork. Humans keep editorial authority.” / “One article, built for every discovery surface” / “Evidence helps, but there are no universal GEO tricks” | Research became its own destination and the product story stopped while the paper was explained. |
| 3 | “The hard part is not producing another draft” / “From an audience question to an approved article” / “One visibility score cannot explain a fragmented market” | The loop was repeated in the opening, transition, summary, and close instead of deepened. |
| 4 | “Useful content has to be easy to verify” / “There is no single AI search result” / “Measurement should change the next brief” | Two statistics generated two large methodology sections; the launch read like a research memo. |
| 5 | “Built for search, answers, and citations” / “Visibility is not one number” / “Every post should make the next one smarter” | The draft named capabilities accurately but supplied no memorable worked example of the product in use. |

Common pattern across 5/5 controls:

- generic market preamble before the product;
- product stages promoted into separate feature buckets;
- no end-to-end through-line;
- both research inputs expanded into prominent sections because they were in
  the brief;
- repeated thesis language;
- generic “start your publishing loop” CTA.

The controls also exposed a naming drift: several drafts introduced the
product as “Context” rather than “Context Blog.”

## GREEN hypothesis

The minimal guidance should define the positive shape of a launch article,
not add a longer prohibition list:

1. Write one spine and one through-line before prose.
2. Use a six-beat launch arc: change → constraint → example → mechanism →
   proof/limit → next action.
3. Default to one anchor finding and at most one supporting finding; never let
   the research inventory dictate the article outline.
4. Make headings progress through the argument and paragraphs perform one job.
5. Cut repeated thesis statements, feature lists already shown by the example,
   and methodology that does not change interpretation.

## Acceptance rubric for guided samples

Each guided sample passes only if:

- first 70 words identify Context Blog, the audience or job, and the outcome;
- one example travels through the relevant loop stages;
- H2s form a progression rather than a feature inventory;
- evidence is adjacent to the claim and occupies no more space than the
  product explanation;
- the two required studies do not become two standalone research sections;
- the governing idea is stated without repetitive restatement;
- the close names current access and one concrete action.

Five fresh-context guided samples are required before deployment. Results are
recorded below after the skill edit.

## GREEN results

Five fresh-context writers received the same pressure scenario after reading
`blog-drafter` version 3. All five passed the seven-part acceptance rubric.

| Guided sample | Through-line | Result | Material improvement over RED |
| --- | --- | --- | --- |
| 1 | A fictional product marketer takes one customer-control question through the full loop | 7/7 | The question, not the feature list, determines every section; both studies sit inside one compact discovery argument. |
| 2 | Maya turns an AI data-control question into an approved, measured article and a narrower follow-up | 7/7 | The worked example carries the system; evidence qualifies product choices without becoming a research chapter. |
| 3 | Northstar's audit-history article is narrowed at approval and produces a retention-policy brief | 7/7 | The checker and human gate become visible events in one story; measurement changes a concrete editorial decision. |
| 4 | Acme's export-retention claim is corrected, published and measured by surface | 7/7 | Headings advance from broken handoff to next article; the proof remains subordinate to the product journey. |
| 5 | LumenFleet's empty-miles question moves from audience signal to the next brief | 7/7 | The product appears immediately, the thesis is not repeatedly summarized, and the close gives one operational action. |

Across 5/5 guided samples:

- Context Blog, its audience and its outcome appeared within the first 70
  words;
- one clearly labeled example survived research, drafting, independent
  checking, human approval, publication, measurement and the next brief;
- H2s formed an argument rather than mirroring the system's components;
- the two mandatory studies appeared beside the claims they supported and
  occupied less space than the product walkthrough;
- the close stated access and one specific next action.

The trials also confirmed a deliberate boundary: this skill controls
editorial shape, not factual truth. One otherwise well-shaped sample selected
an unsuitable source URL. The existing independent `blog-checker` and its
source-verification gate remain mandatory before review or publication.

## REFACTOR check

No further behavioral rules were added after GREEN. The version 3 change is
the smallest observed intervention that consistently corrected the RED
failure: it specifies a positive story shape, evidence budget and cut pass,
while leaving factual checking and publication authority in their existing
skills.

## Version 4: No AI Slop without loss of product detail

### RED

A later edit of the launch post applied the No AI Slop heuristics successfully
at sentence level: it removed filler, inflated transitions, recap language,
binary slogans and decorative em dashes. Machine lint passed with no warnings.
The result still failed editorially. It had compressed away enough of the
workflow, publication outputs, guardrails and measurement states that the
reader could no longer explain what Context Blog did or how it worked.

This exposed a missing constraint in version 3: the cut pass protected the
narrative spine, but did not define a minimum level of product specificity.
A generic anti-slop pass could therefore mistake useful mechanism detail for a
feature list and replace it with broad category language.

### GREEN hypothesis

Version 4 keeps the existing narrative controls and adds two small rules:

1. Apply No AI Slop as a restrained final copy edit using a portability test.
2. Enforce a specificity floor after the edit: the article must still expose
   the input-to-outcome path, automated/checker/human roles, published outputs,
   stopping guardrail, measurement states and next action.

The acceptance test is behavioral. A draft fails even when every sentence is
clean if the product can only be described with abstractions such as
“visibility system” or “content infrastructure.”

### Guided-sample rubric

In addition to the version 3 rubric, each fresh-context sample must:

- retain one subject → action → visible result sentence for each important
  capability;
- name the independent check and human approval boundary;
- name at least three concrete discovery outputs on the published page;
- preserve distinct measurement states instead of collapsing them into one
  score;
- state what stops the workflow when a source or check fails;
- pass the No AI Slop portability test without replacing mechanisms with
  category language.

Five fresh-context guided samples are required before version 4 is deployed.
Their results are recorded after the implementation trial.

### GREEN results

Five fresh-context guided samples received the same launch brief after reading
`blog-drafter` version 4. All five passed both the version 3 narrative rubric
and the version 4 specificity rubric.

| Guided sample | Through-line | v3 | v4 | Detail that survived the No AI Slop pass |
| --- | --- | --- | --- | --- |
| 1 | LumenFleet's empty-mile question | 7/7 | 6/6 | Source stop, separate checker, human approval, hosted URL, sitemap, canonical metadata, structured data and distinct measurement inputs |
| 2 | Acorn Cloud's audit-history question | 7/7 | 6/6 | Exact claim failure, checker bounce, approval boundary, canonical URL, JSON-LD, sitemap, RSS, social image and five citation states |
| 3 | LumenFleet's idle-time methodology | 7/7 | 6/6 | Unreachable benchmark stop, rendered preview, owner approval, readable HTML, metadata, structured data and per-engine results |
| 4 | The real Context Blog issue path | 7/7 | 6/6 | Issue artifacts, no-source stop, pass/bounce/escalate, blocking review, canonical page, feeds, IndexNow and separate analytics inputs |
| 5 | Ledgerly's pricing comparison | 7/7 | 6/6 | Source fields, failed-comparison stop, independent verification, founder approval, crawlable outputs and search/referral/citation states |

Across 5/5 samples, the portability edit removed generic launch language
without removing the product's actors, transitions, stop conditions, emitted
artifacts or measurement states. Each sample remained shorter than a full
feature inventory while a reader could still reconstruct the input-to-outcome
workflow. This is the desired balance: narrative controls determine the order;
the specificity floor protects the mechanisms that make the narrative true.

### REFACTOR check

No separate runtime dependency on the third-party skill was added. Version 4
adapts the small set of editorial principles needed by this workflow and adds
the product-specific safeguard the generic pass lacked. The independent
checker and human approval gate remain unchanged.

## Version 5: correct the product frame

### RED

The first version 4 article satisfied both rubrics but used “one audience
question stays attached to the work” as its governing idea. The workflow was
concrete, yet the framing changed the product: Context Blog is AEO/GEO-first
blog automation, not an audience-question product. The draft also elevated
“answer first,” an article-level optimization technique, into the launch
narrative.

### GREEN rule

For Context Blog's own launch post, the skill now fixes the product frame in
one sentence: an agent writes, an independent checker reviews, a person
approves, the platform publishes the discovery layer, and visibility evidence
improves the next article. Topics and direct answers remain valid inputs and
editorial techniques, but neither may become the product thesis.

The regression passes when the opening identifies AEO/GEO-first blog
automation, the article explains the concrete loop, and no heading or repeated
claim frames Context Blog as an “audience question” or “answer first” product.
