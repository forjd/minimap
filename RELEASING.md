# Releasing

Minimap uses Release Please for versioning, changelog generation, GitHub releases, and npm publishing.

## Release Flow

1. Merge Conventional Commit changes to `main`.
2. Release Please opens or updates a release PR.
3. Review and merge the release PR.
4. Release Please creates the GitHub release and tag.
5. The release workflow publishes `@forjd/minimap` to npm.

## npm Trusted Publishing

Publishing uses npm trusted publishing with GitHub Actions OIDC. No npm token is required.

Configure the package on npm with these trusted publisher settings:

- Package: `@forjd/minimap`
- Publisher: GitHub Actions
- Organization or user: `forjd`
- Repository: `minimap`
- Workflow filename: `release-please.yml`
- Environment name: blank, unless a GitHub deployment environment is added later

npm trusted publishing requires npm CLI 11.5.1 or later and Node 22.14.0 or later. The release workflow uses Node 24.

Trusted publishing automatically publishes npm provenance for public packages from public GitHub repositories.
