import cdk = require('@aws-cdk/core');
import ClonePowerTuner from '../../utils/clone_powertuner';

export class LambdaPowerTuner extends cdk.Construct {

    constructor(scope: cdk.Construct, id:string){
        super(scope, id);

        let clonePowerTuner = new ClonePowerTuner();
        clonePowerTuner.refresh_cloned_code();
    }
}