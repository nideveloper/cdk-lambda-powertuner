import cdk = require('@aws-cdk/core');
import lambda = require('@aws-cdk/aws-lambda');
import iam = require('@aws-cdk/aws-iam');
import sfn = require('@aws-cdk/aws-stepfunctions');
import tasks = require('@aws-cdk/aws-stepfunctions-tasks');

export interface LambdaPowerTunerConfig {
    readonly lambdaResource:string;
    readonly powerValues?: number[]
    readonly visualizationURL?: string;
}

export class LambdaPowerTuner extends cdk.Construct {

    constructor(scope: cdk.Construct, id:string, config:LambdaPowerTunerConfig){
        super(scope, id);

        let powerValues = config.powerValues ?? [128,256,512,1024,1536,3008]
        const REGION = process.env.CDK_DEFAULT_REGION ?? 'us-east-1';
        
        let shared_env = {
            defaultPowerValues: powerValues.join(','),
            minRAM: '128',
            baseCosts: '{"ap-east-1":2.865e-7,"af-south-1":2.763e-7,"me-south-1":2.583e-7,"eu-south-1":2.440e-7,"default":2.083e-7}',
            visualizationURL: config.visualizationURL ?? 'https://lambda-power-tuning.show/'
        }

        let AWSLambdaExecuteRole = new iam.Role(scope, 'DefaultLambdaHanderRole', {
            assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com'),
            managedPolicies: [
                iam.ManagedPolicy.fromAwsManagedPolicyName('service-role/AWSLambdaExecute'),
            ],
        })

        // Initializer
        let initializer = new lambda.Function(scope, 'initializer', {
            runtime: lambda.Runtime.NODEJS_12_X,
            role: AWSLambdaExecuteRole,
            memorySize: 128,
            code: lambda.Code.asset('../../powertuner_clone/lambda'),
            handler: 'initializer.handler',
            environment: shared_env
        });

        let lambdaConfigPermissions = new iam.PolicyStatement({
            effect: iam.Effect.ALLOW,
            resources: [config.lambdaResource],
            actions: ['lambda:GetAlias',
                        'lambda:GetFunctionConfiguration',
                        'lambda:PublishVersion',
                        'lambda:UpdateFunctionConfiguration',
                        'lambda:CreateAlias',
                        'lambda:UpdateAlias']
          });
          initializer.addToRolePolicy(lambdaConfigPermissions)


        // Executor
        let executor = new lambda.Function(scope, 'executor', {
            runtime: lambda.Runtime.NODEJS_12_X,
            role: AWSLambdaExecuteRole,
            memorySize: 128,
            code: lambda.Code.asset('../../powertuner_clone/lambda'),
            handler: 'executor.handler',
            environment: shared_env
        });
        executor.addToRolePolicy(new iam.PolicyStatement({
            effect: iam.Effect.ALLOW,
            resources: [config.lambdaResource],
            actions: ['lambda:InvokeFunction']
        }));

        // Cleaner
        let cleaner = new lambda.Function(scope, 'cleaner', {
            runtime: lambda.Runtime.NODEJS_12_X,
            role: AWSLambdaExecuteRole,
            timeout: cdk.Duration.seconds(10),
            memorySize: 128,
            code: lambda.Code.asset('../../powertuner_clone/lambda'),
            handler: 'cleaner.handler',
            environment: shared_env
        });

        cleaner.addToRolePolicy(new iam.PolicyStatement({
            effect: iam.Effect.ALLOW,
            resources: [config.lambdaResource],
            actions: ['lambda:GetAlias',
                        'lambda:DeleteAlias',
                        'lambda:DeleteFunction']
        }));

        // Analyzer
        let analyzer = new lambda.Function(scope, 'cleaner', {
            runtime: lambda.Runtime.NODEJS_12_X,
            role: AWSLambdaExecuteRole,
            timeout: cdk.Duration.seconds(10),
            memorySize: 128,
            code: lambda.Code.asset('../../powertuner_clone/lambda'),
            handler: 'analyzer.handler',
            environment: shared_env
        });

        // Optimizer
        let optimizer = new lambda.Function(scope, 'optimizer', {
            runtime: lambda.Runtime.NODEJS_12_X,
            role: AWSLambdaExecuteRole,
            timeout: cdk.Duration.seconds(10),
            memorySize: 128,
            code: lambda.Code.asset('../../powertuner_clone/lambda'),
            handler: 'optimizer.handler',
            environment: shared_env
        });

        optimizer.addToRolePolicy(new iam.PolicyStatement({
            effect: iam.Effect.ALLOW,
            resources: [config.lambdaResource],
            actions: ['lambda:GetAlias',
                        'lambda:PublishVersion',
                        'lambda:UpdateFunctionConfiguration',
                        'lambda:CreateAlias',
                        'lambda:UpdateAlias'
                    ]
        }));

        let statemachineRole = new iam.Role(scope, 'statemachineRole', {
            assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com'),
            managedPolicies: [
                iam.ManagedPolicy.fromAwsManagedPolicyName('service-role/AWSLambdaRole'),
            ],
            inlinePolicies: {
                "AssumeRolePolicyDocument" : new iam.PolicyDocument({
                    statements: [
                        new iam.PolicyStatement({
                            effect: iam.Effect.ALLOW,
                            principals: [new iam.ServicePrincipal(`states.${REGION}.amazonaws.com`)],
                            actions: ['sts:AssumeRole']
                        })
                    ]
                })
            }
        });

        const CleanUpOnError = new sfn.Task(scope, 'CleanUpOnError', {
            task: new tasks.RunLambdaTask(cleaner)
        });

        const branching = new sfn.Map(scope, 'Branching', {
            itemsPath: "$.powerValues",
            resultPath: "$.stats", 
            parameters: {
                "value.$": "$$.Map.Item.Value",
                "lambdaARN.$": "$.lambdaARN",
                "num.$": "$.num",
                "payload.$": "$.payload",
                "parallelInvocation.$": "$.parallelInvocation"
            },
            maxConcurrency: 0,
            
        }).addCatch(CleanUpOnError, {
            resultPath: "$.error"
        });

        branching.iterator(new sfn.Task(scope, 'Iterator', {
                task: new tasks.RunLambdaTask(executor)
            }).addRetry({
                maxAttempts: 2,
                interval: cdk.Duration.seconds(3)
            })
        );

        const initializerTask = new sfn.Task(scope, 'Initializer', {
            task: new tasks.RunLambdaTask(initializer),
            resultPath: "$.powerValues",
          }).addCatch(CleanUpOnError, {
            resultPath: "$.error"
        });

        const cleanerTask = new sfn.Task(scope, 'Cleaner', {
            task: new tasks.RunLambdaTask(cleaner)
        });

        const analyzerTask = new sfn.Task(scope, 'Analyzer', {
            task: new tasks.RunLambdaTask(analyzer),
            resultPath: "$.analysis"
        });

        const optimizerTask = new sfn.Task(scope, 'Optimizer', {
            task: new tasks.RunLambdaTask(optimizer),
            outputPath: "$.analysis"
        });

        //Step function definition
        const definition = sfn.Chain
        .start(initializerTask)
        .next(branching)
        .next(cleanerTask)
        .next(analyzerTask)
        .next(optimizerTask)

        const stateMachine = new sfn.StateMachine(scope, 'BookingSaga', {
            definition,
            role: statemachineRole
        });
        
        new cdk.CfnOutput(scope, 'StateMachineARN', {
            value: stateMachine.stateMachineArn
        })
    }
}