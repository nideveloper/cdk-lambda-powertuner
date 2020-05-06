const { execSync } = require('child_process');
const fs = require('fs-extra');

export default class ClonePowerTuner {
    readonly directory = "powertuner_clone";

    constructor() {
        // do nothing
    }

    public refresh_cloned_code() {
        fs.emptyDirSync(this.directory)
        execSync('git init', {'cwd': this.directory});
        execSync('git remote add origin -f https://github.com/alexcasalboni/aws-lambda-power-tuning', {'cwd': this.directory});
        execSync('git pull origin master', {'cwd': this.directory});
    }
}

new ClonePowerTuner().refresh_cloned_code();