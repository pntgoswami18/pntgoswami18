# Product

## Register

brand

## Users

Recruiters, hiring managers, and engineering peers landing on github.com/pntgoswami18 — usually via a job application, a LinkedIn click-through, or a PR/repo they're evaluating. They skim in seconds: role, seniority, stack, credibility signals (activity, streak, real projects). Secondary audience: fellow engineers/OSS collaborators looking for shared interests or project pins.

## Product Purpose

A GitHub profile README that functions as a live, self-updating resume snapshot. It should establish credibility (senior test-automation engineer, active contributor) faster than a static bio, and make the visitor's next action obvious (LinkedIn, blog, pinned projects).

## Brand Personality

Terminal/hacker-fetch aesthetic — monospace type, dark-first with light fallback, macOS traffic-light window chrome, a neofetch-style stat readout ("punitfetch"). Confident, technical, a little playful (EDM producer, bug hunter line), never corporate-generic. Three words: **precise, technical, unpretentious.**

## Anti-references

- Generic "awesome-readme" template look: emoji-wall headers, giant animated GIF banners, wall of unrelated tech-stack badges with no hierarchy.
- Glassmorphism, gradient text, or SaaS-marketing flourishes — clashes with the terminal register.
- Redundant/broken stat widgets (e.g. a second, less-informative GitHub-stats badge duplicating what punitfetch already shows) — every card must earn its space.

## Design Principles

- The terminal card is the hero — every other section should support it, not compete with it visually.
- Data must always resolve (fallback text, not broken images) — a recruiter bouncing off a 502 image is a lost signal.
- One accent color (#7c3aed purple), used deliberately, not scattered across unrelated badge colors.
- Self-hosted over third-party shared demo services wherever the choice exists — reliability beats convenience for something this visible.
- Dark/light parity — every custom asset ships both variants via `prefers-color-scheme`.

## Accessibility & Inclusion

- All `<img>`s need meaningful `alt` text (several current badges/icons are missing or generic).
- Text inside generated SVGs must hit ≥4.5:1 contrast in both themes.
- No motion-dependent information (no relying on animated GIFs to convey stats).
