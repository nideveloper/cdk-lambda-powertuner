# CDK Lambda Power Tuner

This is simply a CDK wrapper for the SAM/SAR application - [aws-lambda-power-tuning](https://github.com/alexcasalboni/aws-lambda-power-tuning)

>Note this is an alpha module, it needs thoroughly tested before being production recommended

All of the lambda logic is cloned on build from that source repo with only the stepfunction definition being defined in this project.

This enables you to now do this:

```typescript
// Create our lambda
const testLambda = new lambda.Function(this, 'lambdaHandler', {
    runtime: lambda.Runtime.NODEJS_12_X,
    code: lambda.Code.asset('lambda'),
    handler: 'lambda.handler'
});

// All permissions on this tuner will be scoped to the above lambda function
new LambdaPowerTuner(this, 'powerTuner', {
    lambdaResource: testLambda.functionArn
})
```

## Deploying the state machine
Import it into any CDK stack and then `cdk deploy`


## Running The Tuner
This is the same as [here](https://github.com/alexcasalboni/aws-lambda-power-tuning#how-to-execute-the-state-machine-web-console)

