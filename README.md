# [Finite State](https://finitestate.io) `binary-scan` Action

![Finite state logo](./imgs/FS-Logo.png)
[finitestate.io](https://finitestate.io)

<!-- action-docs-description -->

## Description

The Finite State `binary-scan` GitHub Action allows you to easily integrate the Finite State Platform into your CI/CD workflows.

Following the steps below will:

- Upload the file to the Finite State platform
- Create a new version of the configured asset
- Conduct a Quick Scan binary analysis on the uploaded file
- Associate the results to the asset version

By default, the asset version will be assigned the existing values for Business Unit and Created By User. If you need to change these, you can provide the IDs for them.

<!-- action-docs-description -->

<!-- action-docs-inputs -->

## Inputs

| parameter | description | required | default |
| --- | --- | --- | --- |
| finite-state-client-id | Finitestate API client ID. | `true` |  |
| finite-state-secret | Finitestate API secret. | `true` |  |
| finite-state-organization-context | Organization context. This is provided by the Finite State API management. It looks like "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx". | `true` |  |
| asset-id | Asset ID for the asset that the new asset version will belong to. | `true` |  |
| version | The name of the asset version that will be created. | `true` |  |
| file-path | Local path of the file to be uploaded. | `true` |  |
| quick-scan | Boolean that uploads the file for quick scan when true. Defaults to true (Quick Scan). For details about the contents of the Quick Scan vs. the Full Scan, please see the API documentation. | `true` | true |
| business-unit-id | (optional) ID of the business unit that the asset version will belong to. If not provided, the asset version will adopt the existing business unit of the asset. | `false` |  |
| created-by-user-id | (optional) ID of the user to be recorded as the "Created By User" on the asset version. If not provided, the version will adopt the existing value of the asset. | `false` |  |
| product-id | (optional) ID of the product that the asset version will belong to. If not provided, the existing product for the asset will be used, if applicable. | `false` |  |
| artifact-description | (optional) Description of the artifact. If not provided, the default is "Firmware Binary". | `false` |  |
<!-- action-docs-inputs -->

<!-- action-docs-outputs -->

## Outputs

| parameter | description |
| --- | --- |
| response | Response from Finite State servers. |
| error | Error message or details on why the action fails, if applicable. |
| asset-version-url | Finite State binary analysis URL for the file uploaded. |
<!-- action-docs-outputs -->

## Set Up Workflow

To start using this action, you must generate a job within a GitHub Workflow. You can either establish a [new GitHub Workflow](https://docs.github.com/en/actions/learn-github-actions/workflow-syntax-for-github-actions) or use an existing one that aligns with your use case.

After selecting a GitHub Workflow, proceed to [customize the events](https://docs.github.com/en/actions/learn-github-actions/events-that-trigger-workflows) that will activate the workflow, such as pull requests or scheduled events:

**Example**:

```yaml
name: Your workflow
on:
  pull_request:
    branches:
      - main
  schedule:
    - cron: "0 0 * * *"
```

## Usage of this Action

You will also need to add your code into the workflow. The example only includes the required parameters. For more details, including optional parameters, please reference the **Inputs** section.

**Example:**

```yaml
uses: @FiniteStateInc/binary-scan@v1.0.0
with:
  finite-state-client-id: ${{ secrets.CLIENT_ID }}
  finite-state-secret: ${{ secrets.CLIENT_SECRET }}
  finite-state-organization-context:  ${{ secrets.ORGANIZATION_CONTEXT }}
  asset-id:  # The ID of the Asset associated with this scan
  version:   # The name of the new Asset Version that will be created
  file-path: # The path to the file that will be uploaded to the Finite State Platform
```

## Action Debugging

All details pertaining to the execution of the action will be recorded. You can review this information in the workflow execution logs, which is a helpful starting point if you encounter any errors during the action's run.

![logging example](./imgs/debug_info.png)

## Extended Feature Example (Optional)

In this section, we provide a code snippet for integrating this action into your existing workflow. Primarily, it uploads the file to the Finite State Platform for analysis. Once that process is complete, it uses the output of that job to automatically add a comment to the pull request, including a link pointing to the Finite State Binary Analysis URL for the uploaded file. You can customize the comment as desired or utilize the outputs of the action to construct your own.

The job, named `show-link-as-comment`, is responsible for generating the comment using the output provided by the action.

Ensure to replace certain values, as indicated in the example workflow:

```yaml
name: Build

on:
  pull_request:
    branches:
      - main
  schedule:
    - cron: "0 0 * * *" # At 00:00 every day

env:
  CLIENT_ID: ${{ secrets.CLIENT_ID }}
  CLIENT_SECRET: ${{ secrets.CLIENT_SECRET }}
  ORGANIZATION_CONTEXT: ${{ secrets.ORGANIZATION_CONTEXT }}
  ASSET_ID: # Complete with your Asset ID

jobs:
  finitestate-upload-binary:
    runs-on: ubuntu-latest
    steps:
      - name: checkout repo content
        uses: actions/checkout@v3
        with:
          ref: ${{ github.event.pull_request.head.ref }}

      # - name: (Potentially) Build a system / firmware image
      # Uncomment previous line and Put the build steps here (which likely already exist) based on the project

      - name: Upload binary generated file
        uses: actions/upload-artifact@v3
        with:
          name: binary-artifact
          path: # Put the path to your binary file generated in the previous step here

      - name: Get commit hash to use as version # Optional step to auto tag the version
        id: commit_hash
        run: |
          echo "COMMIT_HASH=$(git rev-parse --short HEAD)" >> $GITHUB_ENV

      - name: Binary Scan
        uses: @FiniteStateInc/binary-scan@v1.0.0
        id: binary_scan
        with:
          finite-state-client-id: ${{ secrets.CLIENT_ID }}
          finite-state-secret: ${{ secrets.CLIENT_SECRET }}
          finite-state-organization-context: ${{ secrets.ORGANIZATION_CONTEXT }}
          asset-id: ${{env.ASSET_ID}}
          version: ${{env.COMMIT_HASH}} # You can name this version anything you'd like. Here, we're using the git commit hash associated with the current run.
          file-path: # Put the same path from the "Upload binary generated file" step here

      - name: Set response of binary quick scan
        if: steps.binary_scan.outcome=='success'
        id: set_response
        run: |
          echo Asset version URL: ${{steps.binary_scan.outputs.asset-version-url}}
          echo Response: "${{steps.binary_scan.outputs.response}}"
          echo Error: "${{steps.binary_scan.outputs.error}}"
    outputs:
      ASSET_VERSION_URL: ${{steps.binary_scan.outputs.asset-version-url}}
      ERROR: ${{steps.binary_scan.outputs.error}}
      RESPONSE: ${{steps.binary_scan.outputs.response}}

  show-link-as-comment: # This job generates a comment automatically in the PR in order to link to Finite State
    needs: finitestate-upload-binary
    runs-on: ubuntu-latest
    permissions:
      pull-requests: write
    steps:
      - name: Add link to finitestate
        uses: mshick/add-pr-comment@v2
        with:
          message: |
            **Hello**, Finite State is analyzing your files! :rocket:.
            Please <a href="${{needs.finitestate-upload-binary.outputs.ASSET_VERSION_URL}}">click here</a> to see the progress of the analysis.
            <br />

            <a href="https://platform.finitestate.io/">Finite State</a>
          message-failure: |
            **Hello**, We're sorry, but something went wrong. Please contact Finite State Support.
            <a href="https://platform.finitestate.io/">Finite State</a>
```
