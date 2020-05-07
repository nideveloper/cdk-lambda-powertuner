import { expect as expectCDK, haveResourceLike } from '@aws-cdk/assert';
import * as cdk from '@aws-cdk/core';
import { LambdaPowerTuner } from '../lib/cdk-lambda-powertuner/cdk-lambda-powertuner-construct';

test('initializer Lambda Created', () => {
    const app = new cdk.App();
    // WHEN
    const stack = new cdk.Stack(app, 'MyTestStack');

    new LambdaPowerTuner(stack, 'powerTuner', {
      lambdaResource: 'arn:1234:1234:1234:1234:1234'
    })
    // THEN
    expectCDK(stack).to(haveResourceLike("AWS::Lambda::Function", {
      "Handler": "initializer.handler",
      "Runtime": "nodejs12.x",
      "Environment": {
        "Variables": {
          "defaultPowerValues": "128,256,512,1024,1536,3008",
          "minRAM": "128",
          "baseCosts": "{\"ap-east-1\":2.865e-7,\"af-south-1\":2.763e-7,\"me-south-1\":2.583e-7,\"eu-south-1\":2.440e-7,\"default\":2.083e-7}",
          "visualizationURL": "https://lambda-power-tuning.show/"
        }
      },
      "MemorySize": 128,
      "Timeout": 300
    }));
});

test('executor Lambda Created', () => {
  const app = new cdk.App();
  // WHEN
  const stack = new cdk.Stack(app, 'MyTestStack');

  new LambdaPowerTuner(stack, 'powerTuner', {
    lambdaResource: 'arn:1234:1234:1234:1234:1234'
  })
  // THEN
  expectCDK(stack).to(haveResourceLike("AWS::Lambda::Function", {
    "Handler": "executor.handler",
    "Runtime": "nodejs12.x",
    "Environment": {
      "Variables": {
        "defaultPowerValues": "128,256,512,1024,1536,3008",
        "minRAM": "128",
        "baseCosts": "{\"ap-east-1\":2.865e-7,\"af-south-1\":2.763e-7,\"me-south-1\":2.583e-7,\"eu-south-1\":2.440e-7,\"default\":2.083e-7}",
        "visualizationURL": "https://lambda-power-tuning.show/"
      }
    },
    "MemorySize": 128,
    "Timeout": 300
  }));
});

test('cleaner Lambda Created', () => {
  const app = new cdk.App();
  // WHEN
  const stack = new cdk.Stack(app, 'MyTestStack');

  new LambdaPowerTuner(stack, 'powerTuner', {
    lambdaResource: 'arn:1234:1234:1234:1234:1234'
  })
  // THEN
  expectCDK(stack).to(haveResourceLike("AWS::Lambda::Function", {
    "Handler": "cleaner.handler",
    "Runtime": "nodejs12.x",
    "Environment": {
      "Variables": {
        "defaultPowerValues": "128,256,512,1024,1536,3008",
        "minRAM": "128",
        "baseCosts": "{\"ap-east-1\":2.865e-7,\"af-south-1\":2.763e-7,\"me-south-1\":2.583e-7,\"eu-south-1\":2.440e-7,\"default\":2.083e-7}",
        "visualizationURL": "https://lambda-power-tuning.show/"
      }
    },
    "MemorySize": 128,
    "Timeout": 300
  }));
});

test('analyzer Lambda Created', () => {
  const app = new cdk.App();
  // WHEN
  const stack = new cdk.Stack(app, 'MyTestStack');

  new LambdaPowerTuner(stack, 'powerTuner', {
    lambdaResource: 'arn:1234:1234:1234:1234:1234'
  })
  // THEN
  expectCDK(stack).to(haveResourceLike("AWS::Lambda::Function", {
    "Handler": "analyzer.handler",
    "Runtime": "nodejs12.x",
    "Environment": {
      "Variables": {
        "defaultPowerValues": "128,256,512,1024,1536,3008",
        "minRAM": "128",
        "baseCosts": "{\"ap-east-1\":2.865e-7,\"af-south-1\":2.763e-7,\"me-south-1\":2.583e-7,\"eu-south-1\":2.440e-7,\"default\":2.083e-7}",
        "visualizationURL": "https://lambda-power-tuning.show/"
      }
    },
    "MemorySize": 128,
    "Timeout": 10
  }));
});

test('optimizer Lambda Created', () => {
  const app = new cdk.App();
  // WHEN
  const stack = new cdk.Stack(app, 'MyTestStack');

  new LambdaPowerTuner(stack, 'powerTuner', {
    lambdaResource: 'arn:1234:1234:1234:1234:1234'
  })
  // THEN
  expectCDK(stack).to(haveResourceLike("AWS::Lambda::Function", {
    "Handler": "optimizer.handler",
    "Runtime": "nodejs12.x",
    "Environment": {
      "Variables": {
        "defaultPowerValues": "128,256,512,1024,1536,3008",
        "minRAM": "128",
        "baseCosts": "{\"ap-east-1\":2.865e-7,\"af-south-1\":2.763e-7,\"me-south-1\":2.583e-7,\"eu-south-1\":2.440e-7,\"default\":2.083e-7}",
        "visualizationURL": "https://lambda-power-tuning.show/"
      }
    },
    "MemorySize": 128,
    "Timeout": 300
  }));
});
