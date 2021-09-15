import { promises as fs } from 'fs';
import fse from 'fs-extra';
import nunjucks from 'nunjucks';
import { default as rimrafCallback } from 'rimraf';
import { promisify } from 'util';
import { dirname } from 'path';

const configFile = '../config.json';
const templateFile = '../templates/base.Dockerfile.njk';
const outputDirectory = '../output';

const rimraf = promisify(rimrafCallback);

async function getVersions(file) {
	const config = await fse.readJson(file);
	const versions = [];

	for (const distroVersion of config.distro) {
		for (const nodeVersion of config.nodeVersion) {
			versions.push({
				distro: distroVersion,
				nodeVersion: nodeVersion,
				alpineVersion: config.alpineVersion,
				alpineSha256: config.alpineSha256,
				ubuntuVersion: config.ubuntuVersion,
				ubuntuSha256: config.ubuntuSha256,
				debianVersion: config.debianVersion,
				debianSha256: config.debianSha256,
				yarnVersion: config.yarnVersion,
				npmVersion: config.npmVersion,
				vercelVersion: config.vercelVersion,
				// docker-sec-tools
				lockfilelintVersion: config.lockfilelintVersion,
				auditCiVersion: config.auditCiVersion,
				auditJsVersion: config.auditJsVersion,
				containerDiffVersion: config.containerDiffVersion,
				codecovVersion: config.codecovVersion,
				codechecksVersion: config.codechecksVersion,
				// docker-e2e
				chromeVersion: config.chromeVersion,
				firefoxVersion: config.firefoxVersion,
				lhciVersion: config.lhciVersion,
				lhVersion: config.lhVersion,
				sitespeedioVersion: config.sitespeedioVersion,
				webdriverManagerVersion: config.webdriverManagerVersion,
				seleniumStandaloneVersion: config.seleniumStandaloneVersion,
				chromedriverVersion: config.chromedriverVersion,
				geckodriverVersion: config.geckodriverVersion,
			});
		}
	}

	return versions;
}

async function compileTemplate(file) {
	const templateContents = await fs.readFile(file, 'utf-8');
	return nunjucks.compile(templateContents);
}

async function render(template, context) {
	return new Promise((resolve, reject) => {
		nunjucks.render(template, context, function (error, result) {
			if (error) {
				reject(error);
			}

			resolve(result);
		});
	});
}

async function createDockerfile(template, file, versions) {
	const dockerfile = await render(template, versions);
	const directory = dirname(file);
	await fs.mkdir(directory, { recursive: true });
	await fs.writeFile(file, dockerfile, 'utf-8');

	return {
		...versions,
		file,
	};
}

async function createDockerfiles(template, versions) {
	return Promise.all(
		versions.map(version => {
			const nodeVersionParts = version.nodeVersion.split('.');
			const nodeFolderName = `${nodeVersionParts[0]}.${nodeVersionParts[1]}`;
			return createDockerfile(template, `${outputDirectory}/${version.distro}/${nodeFolderName}/Dockerfile`, version);
		}),
	);
}

async function bootstrap() {
	await rimraf(outputDirectory);

	const versions = await getVersions(configFile);
	const template = await compileTemplate(templateFile);

	await fs.mkdir(outputDirectory);

	const files = await createDockerfiles(template, versions);
	await fs.writeFile(`${outputDirectory}/data.json`, JSON.stringify(files, null, 2));
}

bootstrap().then(() => console.log('Dockerfiles generated'));
