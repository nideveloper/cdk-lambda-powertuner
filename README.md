# CDK Lambda Power Tuner

This is simply a CDK wrapper for the SAM/SAR application - [aws-lambda-power-tuning](https://github.com/alexcasalboni/aws-lambda-power-tuning)

>Note this is an alpha module, it needs thoroughly tested before being production recommended

All of the lambda logic is cloned on build from that source repo with only the stepfunction definition being defined in this project.

This enables you to now do this:

![snippet](https://raw.githubusercontent.com/nideveloper/cdk-lambda-powertuner/master/img/snippet.png)

## Deploying the state machine
Import it into any CDK stack and then `cdk deploy`


## Running The Tuner
This is the same as [here](https://github.com/alexcasalboni/aws-lambda-power-tuning#how-to-execute-the-state-machine-web-console)

## Differences from [aws-lambda-power-tuning](https://github.com/alexcasalboni/aws-lambda-power-tuning)
Since this uses AWS CDK to build and deploy the step function, we need to play by the rules of CDK.

The method of integrating Lambda functions as a step into your workflow via ARN has been deprecated by the team.
They have chosen to support integrating via function name. For reference see [issue](https://github.com/aws/aws-cdk/issues/7709)

This means that the payloads coming back from the Lambda functions contain an extra abstraction layer of data not present in the SAR application.

To make this work without rewriting the Lambda functions so that I can always pull the latest code on every build I
had to introduce adapters between the step function Lambda tasks to strip out this abstraction layer. This is their only purpose

![stepfunction flow](https://raw.githubusercontent.com/nideveloper/cdk-lambda-powertuner/master/img/stepfunctions_graph.png)