const fs = require('fs');
const dft = require('dockerfile-template');
const dockerfileTemplate = fs.readFileSync('../Dockerfile.template', 'utf8');
const args = require('minimist')(process.argv.slice(2))._;
const tags = typeof args[0] === 'string' ? args[0].split(',') : args;
const versionsFilePath = '../versions.json';

if (!fs.existsSync(versionsFilePath)) {
	return console.error('versions.json file is missing!');
}

for (const tag of tags) {
	const versions = require(versionsFilePath);
	versions.TAG = tag;

	const updatedDockerfile = dft.process(dockerfileTemplate, versions);
	const dockerfilePath = `../${tag}`;

	if (!fs.existsSync(dockerfilePath)) {
		fs.mkdirSync(dockerfilePath);
		fs.writeFileSync(`${dockerfilePath}/Dockerfile`, updatedDockerfile);
	} else {
		fs.writeFileSync(`${dockerfilePath}/Dockerfile`, updatedDockerfile);
	}

	console.log(`Dockerfile for ${tag} generated with success.`);
}
