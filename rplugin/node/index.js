var chokidar = require('chokidar');
var fs = require('fs');
var fspath = require('path');

/**
* Main worker function
* @param {NeoVimPlugin} plugin The NeoVimPlugin instance
*/
module.exports = function(plugin) {
	// FIXME: These should pick up from g:mon_* but I've no idea how to do that - MC 2020-01-11
	var projectRoot; // Project root directory where `monitorFile` may exist
	var projectRootFile = 'package.json';
	var monitorFile = '.error';
	var monitorOpts = '+wincmd\\ J';

	var watchHandle; // Populated with the Chokidar instance

	var monitorFunc = (path, stats) => {
		plugin.nvim.outWrite(`Current size ${stats ? stats.size : 'NO STATS'}\n`)

		if (stats && stats.size > 0) {
			plugin.nvim.command(`pedit ${monitorOpts} ${path}`)
		} else {
			plugin.nvim.command('pclose');
		}
	};

	plugin.registerCommand('MonOn', ()=> Promise.resolve()
		// Determine projectRoot by scanning this dir upwards until we find a projectRootFile {{{
		.then(()=> plugin.nvim.callFunction('expand', '%:p'))
		.then(path => new Promise((resolve, reject) => {
			var scanPath = path;

			var examinePath = ()=>
				fs.promises.stat(fspath.join(scanPath, projectRootFile))
					.then(()=> resolve(scanPath))
					.catch(()=> {
						if (examinePath == '/') return reject(`Cannot determine project root directory. ${projectRootFile} not found in tree`);
						scanPath = fspath.resolve(fspath.join(scanPath, '..'));
						examinePath();
					})

			examinePath();
		}))
		.then(rootDir => projectRoot = rootDir)
		// }}}
		.then(()=> plugin.nvim.outWrite(`Monitoring project directory ${projectRoot}\n`))
		// Setup file watcher which invokes the preview window when we notice the file exists, close when it doesnt {{{
		.then(()=> watchHandle = chokidar.watch(fspath.join(projectRoot, monitorFile), {
			alwaysStat: true,
			awaitWriteFinish: true,
			disableGlobbing: true,
		})
			.on('change', monitorFunc)
		)
		// }}}
		// Call the monitor immediately to show the window if its needed {{{
		.then(()=> fs.promises.stat(fspath.join(projectRoot, monitorFile)))
		.then(stats => monitorFunc(fspath.join(projectRoot, monitorFile), stats))
		// }}}
		.catch(e => {
			debugger;
			console.error(e);
		})
	, { sync: false });
};
