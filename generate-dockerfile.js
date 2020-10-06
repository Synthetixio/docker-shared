const fs = require('fs');
const axios = require('axios');
const _ = require('underscore');
const dft = require('dockerfile-template');
const dockerfileTemplate = fs.readFileSync('../Dockerfile.template', 'utf8');
const args = require('minimist')(process.argv.slice(2))._;
const tags = typeof args[0] === 'string' ? args[0].split(',') : args;
const distributions = args[1];
const arch = args[2];
const versionsFilePath = '../versions.json';

if (!fs.existsSync(versionsFilePath)) {
	return console.error('versions.json file is missing!');
}
const versions = require(versionsFilePath);

async function run() {
	if (distributions) {
		const distros = distributions.split(',');
		for (const distro of distros) {
			await generateWithTag(distro);
		}
	} else {
		await generateWithTag();
	}

	async function generateWithTag(distro) {
		for (const tag of tags) {
			if (arch) {
				try {
					const response = await axios.get(`https://hub.docker.com/v2/repositories/${versions.IMG}/tags/${tag}/`);
					setSHA(response);
					prepareAndSaveDockerfile(tag);
				} catch (error) {
					try {
						if (error.response.status === 404) {
							const response = await axios.get(
								`https://hub.docker.com/v2/repositories/library/${versions.IMG}/tags/${tag}-${distro}/`,
							);
							setSHA(response);
							prepareAndSaveDockerfile(tag);
						}
					} catch (error) {
						return console.error('Image not found on DockerHub.', error);
					}
				}
			} else {
				prepareAndSaveDockerfile(tag);
			}
		}

		function prepareAndSaveDockerfile(tag) {
			versions.TAG = tag;
			if (distro) {
				versions.DISTRO = distro;
			}
			const updatedDockerfile = dft.process(dockerfileTemplate, versions);
			const dockerfilePath = distro ? `../${distro}/${tag}` : `../${tag}`;

			if (!fs.existsSync(dockerfilePath)) {
				if (!fs.existsSync(`../${distro}`)) {
					fs.mkdirSync(`../${distro}`);
				}
				fs.mkdirSync(dockerfilePath);
				fs.writeFileSync(`${dockerfilePath}/Dockerfile`, updatedDockerfile);
			} else {
				fs.writeFileSync(`${dockerfilePath}/Dockerfile`, updatedDockerfile);
			}

			if (distro) {
				console.log(`Dockerfile for ${tag}-${distro} generated with success.`);
			} else {
				console.log(`Dockerfile for ${tag} generated with success.`);
			}
		}

		function setSHA(response) {
			const latestImageWithProvidedArch = _.find(response.data.images, obj => {
				return obj.architecture === arch ? obj : null;
			});
			versions.SHA = latestImageWithProvidedArch.digest;
		}
	}
}

run();
