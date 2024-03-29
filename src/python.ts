import * as path from "path";
import * as cp from "child_process";
import * as core from "@actions/core";

export async function getInputs(): Promise<object> {
  return {
    INPUT_FINITE_STATE_CLIENT_ID: core.getInput("FINITE-STATE-CLIENT-ID"),
    INPUT_FINITE_STATE_SECRET: core.getInput("FINITE-STATE-SECRET"),
    INPUT_FINITE_STATE_ORGANIZATION_CONTEXT: core.getInput(
      "FINITE-STATE-ORGANIZATION-CONTEXT",
    ),
    INPUT_ASSET_ID: core.getInput("ASSET-ID"),
    INPUT_VERSION: core.getInput("VERSION"),
    INPUT_FILE_PATH: core.getInput("FILE-PATH"),
    INPUT_QUICK_SCAN: core.getInput("QUICK-SCAN"),

    // non required parameters:
    INPUT_BUSINESS_UNIT_ID: core.getInput("BUSINESS-UNIT-ID"),
    INPUT_CREATED_BY_USER_ID: core.getInput("CREATED-BY-USER-ID"),
    INPUT_PRODUCT_ID: core.getInput("PRODUCT-ID"),
    INPUT_ARTIFACT_DESCRIPTION: core.getInput("ARTIFACT-DESCRIPTION"),
    INPUT_AUTOMATIC_COMMENT: core.getInput("AUTOMATIC-COMMENT"),
    INPUT_GITHUB_TOKEN: core.getInput("GITHUB-TOKEN"),
  };
}

export async function runPython(): Promise<string[]> {
  const envVariables = await getInputs();

  // Execute the predefined Python script
  const pythonPath = `${__dirname}/python`;
  cp.execSync(`pip install -r ${path.join(pythonPath, "requirements.txt")}`);
  const scriptPath = path.join(pythonPath, "upload_binary.py");

  // Execute the predefined Python script
  const pythonProcess = cp.spawn("python", [scriptPath], {
    shell: true,
    env: { ...process.env, ...envVariables },
  });
  const response: string[] = [];
  pythonProcess.stdout.on("data", (data) => {
    response.push(data.toString());
    core.notice(data.toString());
  });

  pythonProcess.stderr.on("data", (data) => {
    core.notice(data.toString());
    response.push(data.toString());
  });

  return response;
}
