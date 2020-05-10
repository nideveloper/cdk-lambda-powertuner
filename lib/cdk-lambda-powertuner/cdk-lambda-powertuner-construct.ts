import cdk = require('@aws-cdk/core');
import lambda = require('@aws-cdk/aws-lambda');
import iam = require('@aws-cdk/aws-iam');
import sfn = require('@aws-cdk/aws-stepfunctions');
import tasks = require('@aws-cdk/aws-stepfunctions-tasks');
import path = require('path');

export interface LambdaPowerTunerConfig {
    readonly lambdaResource: string;
    readonly powerValues?: number[],
    readonly stepFunctionName?: string,
    readonly exportStepFunction?: boolean,
    readonly exportedStepFunctionName?: string,
    readonly visualizationURL?: string;
}

export class LambdaPowerTuner extends cdk.Construct {

    stateMachineArn?: string;

    constructor(scope: cdk.Construct, id: string, config: LambdaPowerTunerConfig) {
        super(scope, id);

        let powerValues = config.powerValues ?? [128, 256, 512, 1024, 1536, 3008]
        const REGION = process.env.CDK_DEFAULT_REGION ?? 'us-east-1';

        let shared_env = {
            defaultPowerValues: powerValues.join(','),
            minRAM: '128',
            baseCosts: '{"ap-east-1":2.865e-7,"af-south-1":2.763e-7,"me-south-1":2.583e-7,"eu-south-1":2.440e-7,"default":2.083e-7}',
            visualizationURL: config.visualizationURL ?? 'https://lambda-power-tuning.show/'
        }

        // Initializer
        let initializer = this.createLambda(this, 'initializer', 'initializer.handler', shared_env);

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
        let executor = this.createLambda(this, 'executor', 'executor.handler', shared_env);

        executor.addToRolePolicy(new iam.PolicyStatement({
            effect: iam.Effect.ALLOW,
            resources: [config.lambdaResource],
            actions: ['lambda:InvokeFunction']
        }));

        // Cleaner
        let cleaner = this.createLambda(this, 'cleaner', 'cleaner.handler', shared_env);

        cleaner.addToRolePolicy(new iam.PolicyStatement({
            effect: iam.Effect.ALLOW,
            resources: [config.lambdaResource],
            actions: ['lambda:GetAlias',
                'lambda:DeleteAlias',
                'lambda:DeleteFunction']
        }));

        // Analyzer
        let analyzer = this.createLambda(this, 'analyzer', 'analyzer.handler', shared_env, 10);

        // Optimizer
        let optimizer = this.createLambda(this, 'optimizer', 'optimizer.handler', shared_env);

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

        /**
         * State Machine
         */

        let statemachineRole = new iam.Role(this, 'statemachineRole', {
            assumedBy: new iam.ServicePrincipal(`states.${REGION}.amazonaws.com`),
            managedPolicies: [
                iam.ManagedPolicy.fromAwsManagedPolicyName('service-role/AWSLambdaRole'),
            ]
        });

        const CleanUpOnError = new sfn.Task(this, 'CleanUpOnError', {
            task: new tasks.RunLambdaTask(cleaner)
        });

        const branching = new sfn.Map(this, 'Branching', {
            itemsPath: sfn.Data.stringAt("$.powerValues"),
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
            resultPath: "$.error",
        });

        branching.iterator(new sfn.Task(this, 'Iterator', {
            task: new tasks.RunLambdaTask(executor)
        }).addRetry({
            maxAttempts: 2,
            interval: cdk.Duration.seconds(3)
        })
        );

        const initializerTask = new sfn.Task(this, 'Initializer', {
            task: new tasks.RunLambdaTask(initializer),
            resultPath: "$.powerValues"
        }).addCatch(CleanUpOnError, {
            resultPath: "$.error"
        });

        const cleanupPowerValues = new sfn.Pass(this, 'cleanup $.powerValues', {
            inputPath: '$.powerValues.Payload',
            resultPath: '$.powerValues',
        });

        const cleanupStats = new sfn.Pass(this, 'cleanup $.stats array', {
            inputPath: '$.stats[*].Payload',
            resultPath: '$.stats',
        });

        const cleanerTask = new sfn.Task(this, 'Cleaner', {
            task: new tasks.RunLambdaTask(cleaner),
            resultPath: "$.cleaner"
        });

        const analyzerTask = new sfn.Task(this, 'Analyzer', {
            task: new tasks.RunLambdaTask(analyzer),
            resultPath: "$.analysis"
        });

        const cleanupAnalyzer = new sfn.Pass(this, 'cleanup $.analysis', {
            inputPath: '$.analysis.Payload',
            resultPath: '$.analysis',
        });

        const optimizerTask = new sfn.Task(this, 'Optimizer', {
            task: new tasks.RunLambdaTask(optimizer),
            resultPath: '$.optimizer',
            outputPath: "$.analysis"
        });

        //Step function definition
        const definition = sfn.Chain
            .start(initializerTask)
            .next(cleanupPowerValues)
            .next(branching)
            .next(cleanupStats)
            .next(cleanerTask)
            .next(analyzerTask)
            .next(cleanupAnalyzer)
            .next(optimizerTask)

        const stateMachine = new sfn.StateMachine(this, 'LambdaPowerTuner', {
            definition,
            role: statemachineRole
        });

        this.stateMachineArn = stateMachine.stateMachineArn;

        let cfnOutputConfig: any = {
            description: 'Arn of Tuner State Machine',
            value: stateMachine.stateMachineArn
        };

        if (config.exportStepFunction === true && config.exportedStepFunctionName) {
            cfnOutputConfig.exportName = config.exportedStepFunctionName;
        }

        new cdk.CfnOutput(this, 'StateMachineARN', cfnOutputConfig);
    }

    /**
     * All the lambdas have the same config, so this method saves typing
     * @param scope 
     * @param id 
     * @param handler 
     * @param env 
     * @param timeout 
     */
    createLambda(scope: cdk.Construct, id: string, handler: string, env: any, timeout?: number) {

        let role = new iam.Role(scope, `${id}LambdaExecuteRole`, {
            assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com'),
            managedPolicies: [
                iam.ManagedPolicy.fromAwsManagedPolicyName('AWSLambdaExecute'),
            ],
        })

        return new lambda.Function(scope, id, {
            runtime: lambda.Runtime.NODEJS_12_X,
            role: role,
            timeout: cdk.Duration.seconds(timeout ?? 300),
            memorySize: 128,
            code: lambda.Code.asset(path.join(__dirname, '../../powertuner_clone/lambda')),
            handler: handler,
            environment: env
        });

    }
}