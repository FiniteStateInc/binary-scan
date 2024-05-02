# Binary Scan GitHub Action

This JS action for GitHub was created using this repository as template:
[Create a GitHub Action Using TypeScript](https://github.com/actions/typescript-action).

This template includes compilation support, tests, a validation workflow,
publishing, and versioning guidance.

## How to use the action in a GitHub Workflow

If you would like to use the action, go to the action in the marketplace and
follow the documentation:
[Finite state binary scan](https://github.com/marketplace/actions/finite-state-binary-scan)

> [!NOTE]
>
> As it was mentioned you don't need to continue reading this Readme if you
> would like to just use the action.
>
> The following documentation make sense if you are a developer of this action
> and you would like to customize or change the behavior of them.

## Initial Setup

After you've cloned the repository to your local machine or codespace, you'll
need to perform some initial setup steps before you can develop your action.

> [!NOTE]
>
> You'll need to have a reasonably modern version of
> [Node.js](https://nodejs.org) handy (20.x or later should work!). If you are
> using a version manager like [`nodenv`](https://github.com/nodenv/nodenv) or
> [`nvm`](https://github.com/nvm-sh/nvm), this template has a `.node-version`
> file at the root of the repository that will be used to automatically switch
> to the correct version when you `cd` into the repository. Additionally, this
> `.node-version` file is used by GitHub Actions in any `actions/setup-node`
> actions.

1. :hammer_and_wrench: Install the dependencies

   ```bash
   npm install
   ```

1. :building_construction: Package the TypeScript for distribution

   ```bash
   npm run bundle
   ```

1. :white_check_mark: Run the tests

   ```bash
   $ npm test

   PASS  ./index.test.js
     ✓ calls run when imported (3ms)

   ...
   ```

## Update the Action Metadata

The [`action.yml`](action.yml) file defines metadata about your action, such as
input(s) and output(s). For details about this file, see
[Metadata syntax for GitHub Actions](https://docs.github.com/en/actions/creating-actions/metadata-syntax-for-github-actions).

## Update the Action Code

The [`src/`](./src/) directory is the heart of our action.

There are a few things to keep in mind when writing your action code:

- Most GitHub Actions toolkit and CI/CD operations are processed asynchronously.
  In `main.ts`, you will see that the action is run in an `async` function.

1. Format, test, and build the action

   ```bash
   npm run all
   ```

   > This step is important! It will run [`ncc`](https://github.com/vercel/ncc)
   > to build the final JavaScript action code with all dependencies included.
   > If you do not run this step, your action will not work correctly when it is
   > used in a workflow. This step also includes the `--license` option for
   > `ncc`, which will create a license file for all of the production node
   > modules used in your project.

## Validate the Action

You can now validate the action by referencing it in a workflow file. For
example, [`ci.yml`](./.github/workflows/ci.yml) demonstrates how to reference an
action in the same repository.

```yaml
steps:
  - name: Checkout
    id: checkout
    uses: actions/checkout@v4
    with:
      ref: ${{ github.event.pull_request.head.ref }}

  - name: Binary Scan
    id: binary_scan
    uses: ./
    with:
      finite-state-client-id: ${{ secrets.CLIENT_ID }}
      finite-state-secret: ${{ secrets.CLIENT_SECRET }}
      finite-state-organization-context: ${{ secrets.ORGANIZATION_CONTEXT }}
      asset-id: ${{env.ASSET_ID}}
      version: ${{ github.sha }}
      file-path: ./somefile.bin # Put the same path from the "Upload binary generated file" step here
      github-token: ${{ secrets.GITHUB_TOKEN }} # optional if you would like to generate the comment automatically in the PR
      automatic-comment: true # optional if you would like to generate the comment automatically in the PR

  - name: Set response of binary scan
    if: steps.binary_scan.outcome=='success'
    id: set_response
    run: |
      echo Asset version URL: ${{steps.binary_scan.outputs.asset-version-url}}
      echo Response: "${{steps.binary_scan.outputs.response}}"
      echo Error: "${{steps.binary_scan.outputs.error}}"
```

## Usage

After testing, you can create version tag(s) that developers can use to
reference different stable versions of your action. For more information, see
[Versioning](https://github.com/actions/toolkit/blob/master/docs/action-versioning.md)
in the GitHub Actions toolkit.

To include the action in a workflow in another repository, you can use the
`uses` syntax with the `@` symbol to reference a specific branch, tag, or commit
hash.

```yaml
steps:
  - name: Checkout
    id: checkout
    uses: actions/checkout@v4
    with:
      ref: ${{ github.event.pull_request.head.ref }}

  - name: Finite State Binary Scan
    id: binary_scan
    uses: FiniteStateInc/binary-scan@v2.0.1
    with:
      finite-state-client-id: ${{ secrets.CLIENT_ID }}
      finite-state-secret: ${{ secrets.CLIENT_SECRET }}
      finite-state-organization-context: ${{ secrets.ORGANIZATION_CONTEXT }}
      asset-id: ${{env.ASSET_ID}}
      version: ${{ github.sha }}
      file-path: ./somefile.bin # Put the same path from the "Upload binary generated file" step here
      github-token: ${{ secrets.GITHUB_TOKEN }} # optional if you would like to generate the comment automatically in the PR
      automatic-comment: true # optional if you would like to generate the comment automatically in the PR

  - name: Set response of binary scan
    if: steps.binary_scan.outcome=='success'
    id: set_response
    run: |
      echo Asset version URL: ${{steps.binary_scan.outputs.asset-version-url}}
      echo Response: "${{steps.binary_scan.outputs.response}}"
      echo Error: "${{steps.binary_scan.outputs.error}}"
```
