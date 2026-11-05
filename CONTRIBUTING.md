# Contributing

Discuss substantial changes in an issue first. Keep pull requests focused and explain the user-visible behavior, validation and limitations. Work on `src/`, `templates/` and direct assets; regenerate pages using `python build.py --local-only`. Do not edit generated HTML independently.

Test affected tools with synthetic files served over localhost. Check desktop-width and narrow layouts, keyboard controls, loading/error states, and the actual downloaded output when export behavior changes. A successful build is not full-suite certification. Parsing, calculation, encryption, persistence and destructive editing need focused behavioral checks. Never upload user files or credentials in issues or test fixtures.

Include licences and provenance for new dependencies. Do not silently add network calls, analytics or models; explain actual network use. Do not change compatibility-sensitive storage keys or file formats without a migration plan.

By intentionally submitting a contribution for inclusion, you offer it under Apache License 2.0 as described in its contribution clause. Submit only material you have permission to contribute; identify third-party content and its terms. Decorative artwork is omitted; trademark rights remain separate. Community code contributions may be reused under Apache terms, including in commercial products; copyright and notice obligations still apply.
